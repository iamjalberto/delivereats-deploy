import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";

const StarSelector = ({ value, onChange }) => {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: "0.25rem" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          style={{
            cursor: "pointer",
            fontSize: "1.8rem",
            color: star <= (hover || value) ? "#ffc107" : "#ddd",
            transition: "color 0.15s",
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
};

const MyOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Rating modal state
  const [ratingModal, setRatingModal] = useState(null);
  const [restaurantStars, setRestaurantStars] = useState(0);
  const [restaurantComment, setRestaurantComment] = useState("");
  const [driverStars, setDriverStars] = useState(0);
  const [driverComment, setDriverComment] = useState("");
  const [productRatings, setProductRatings] = useState({});
  const [submittingRating, setSubmittingRating] = useState(false);
  const [orderRatings, setOrderRatings] = useState({});

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get("/orders/my");
      const fetchedOrders = res.data.orders || [];
      setOrders(fetchedOrders);

      // Check which delivered orders already have ratings
      const ratedMap = {};
      for (const o of fetchedOrders) {
        if (o.status === "ENTREGADA") {
          try {
            const ratingsRes = await api.get(
              `/ratings/restaurant/${o.restaurant_id}`,
            );
            const ratings = ratingsRes.data.ratings || [];
            const hasMyRating = ratings.some(
              (r) => r.order_id === o.id || String(r.order_id) === String(o.id),
            );
            if (hasMyRating) ratedMap[o.id] = true;
          } catch {
            // ignore - just means we can't check
          }
        }
      }
      setOrderRatings(ratedMap);
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        "Error al cargar órdenes. Verifica tu conexión.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const openRatingModal = (order) => {
    setRatingModal(order);
    setRestaurantStars(0);
    setRestaurantComment("");
    setDriverStars(0);
    setDriverComment("");
    const prods = {};
    (order.items || []).forEach((item) => {
      prods[item.menu_item_id || item.id || item.name] = { recommended: null };
    });
    setProductRatings(prods);
  };

  const closeRatingModal = () => {
    setRatingModal(null);
  };

  const handleSubmitRatings = async () => {
    if (restaurantStars === 0) {
      toast.error("Califica al restaurante (1-5 estrellas)");
      return;
    }

    setSubmittingRating(true);
    try {
      // 1. Rate restaurant
      await api.post("/ratings", {
        order_id: ratingModal.id,
        entity_type: "RESTAURANTE",
        entity_id: ratingModal.restaurant_id,
        entity_name: ratingModal.restaurant_name,
        stars: restaurantStars,
        comment: restaurantComment,
      });

      // 2. Rate driver (if present)
      if (ratingModal.delivery_person_id && driverStars > 0) {
        await api.post("/ratings", {
          order_id: ratingModal.id,
          entity_type: "REPARTIDOR",
          entity_id: ratingModal.delivery_person_id,
          entity_name: ratingModal.delivery_person_name || "Repartidor",
          stars: driverStars,
          comment: driverComment,
        });
      }

      // 3. Rate products
      for (const item of ratingModal.items || []) {
        const key = item.menu_item_id || item.id || item.name;
        const pr = productRatings[key];
        if (pr && pr.recommended !== null) {
          await api.post("/ratings", {
            order_id: ratingModal.id,
            entity_type: "PRODUCTO",
            entity_id: item.menu_item_id || item.id,
            entity_name: item.name,
            stars: 0,
            recommended: pr.recommended,
          });
        }
      }

      toast.success("¡Gracias por tu calificación!");
      setOrderRatings((prev) => ({ ...prev, [ratingModal.id]: true }));
      closeRatingModal();
    } catch (error) {
      const msg =
        error.response?.data?.message || "Error al enviar calificación";
      toast.error(msg);
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleCancel = async (orderId) => {
    if (!confirm("¿Estás seguro de cancelar esta orden?")) return;
    try {
      const res = await api.put(`/orders/${orderId}/cancel`, {
        reason: "Cancelado por el cliente",
      });
      if (res.data.success) {
        toast.success("Orden cancelada");
        fetchOrders();
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Error al cancelar orden.";
      toast.error(msg);
    }
  };

  if (loading) return <div className="loading">Cargando órdenes...</div>;

  return (
    <div>
      <h2>📋 Mis Órdenes</h2>
      {orders.length === 0 ? (
        <div className="empty-state">
          <span>📦</span>
          <p>No tienes órdenes aún.</p>
        </div>
      ) : (
        orders.map((o) => (
          <div key={o.id} className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3>
                Orden #{o.id} - {o.restaurant_name}
              </h3>
              <span className={`badge badge-${o.status.toLowerCase()}`}>
                {o.status}
              </span>
            </div>
            <p>
              <strong>Productos:</strong>
            </p>
            <ul>
              {(o.items || []).map((item, idx) => (
                <li key={idx}>
                  {item.name} x{item.quantity} - Q
                  {(parseFloat(item.price) * item.quantity).toFixed(2)}
                </li>
              ))}
            </ul>
            <p>
              <strong>Total:</strong> Q{parseFloat(o.total).toFixed(2)}
            </p>
            <p>
              <strong>Dirección:</strong> {o.delivery_address}
            </p>
            <p>
              <strong>Fecha:</strong> {new Date(o.created_at).toLocaleString()}
            </p>
            {o.delivery_person_name && (
              <p>
                <strong>Repartidor:</strong> {o.delivery_person_name}
              </p>
            )}
            {["CREADA", "EN_PROCESO"].includes(o.status) && (
              <div className="btn-group">
                <button
                  className="btn btn-primary btn-sm"
                  style={{ width: "auto" }}
                  onClick={() => navigate(`/payment?order_id=${o.id}`)}
                >
                  💳 Pagar
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleCancel(o.id)}
                >
                  Cancelar Orden
                </button>
              </div>
            )}
            {o.status === "ENTREGADA" && !orderRatings[o.id] && (
              <div className="btn-group">
                <button
                  className="btn btn-warning btn-sm"
                  style={{ width: "auto" }}
                  onClick={() => openRatingModal(o)}
                >
                  ⭐ Calificar Orden
                </button>
              </div>
            )}
            {o.status === "ENTREGADA" && orderRatings[o.id] && (
              <p
                style={{
                  color: "#28a745",
                  fontWeight: "600",
                  marginTop: "0.5rem",
                }}
              >
                ✅ Ya calificaste esta orden
              </p>
            )}
          </div>
        ))
      )}

      {/* Rating Modal */}
      {ratingModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={closeRatingModal}
        >
          <div
            className="card"
            style={{
              maxWidth: "550px",
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              margin: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: "1rem" }}>
              ⭐ Calificar Orden #{ratingModal.id}
            </h3>

            {/* Restaurant Rating */}
            <div
              style={{
                padding: "1rem",
                background: "#fff8e1",
                borderRadius: "8px",
                marginBottom: "1rem",
              }}
            >
              <p style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>
                🍽️ Restaurante: {ratingModal.restaurant_name}
              </p>
              <StarSelector
                value={restaurantStars}
                onChange={setRestaurantStars}
              />
              <div
                className="form-group"
                style={{ marginTop: "0.5rem", marginBottom: 0 }}
              >
                <textarea
                  placeholder="Comentario sobre el restaurante (opcional)"
                  value={restaurantComment}
                  onChange={(e) => setRestaurantComment(e.target.value)}
                  rows={2}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "6px",
                    border: "1px solid #ddd",
                  }}
                />
              </div>
            </div>

            {/* Driver Rating */}
            {ratingModal.delivery_person_id && (
              <div
                style={{
                  padding: "1rem",
                  background: "#e8f5e9",
                  borderRadius: "8px",
                  marginBottom: "1rem",
                }}
              >
                <p style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>
                  🛵 Repartidor:{" "}
                  {ratingModal.delivery_person_name || "Repartidor"}
                </p>
                <StarSelector value={driverStars} onChange={setDriverStars} />
                <div
                  className="form-group"
                  style={{ marginTop: "0.5rem", marginBottom: 0 }}
                >
                  <textarea
                    placeholder="Comentario sobre el repartidor (opcional)"
                    value={driverComment}
                    onChange={(e) => setDriverComment(e.target.value)}
                    rows={2}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "6px",
                      border: "1px solid #ddd",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Product Ratings */}
            <div
              style={{
                padding: "1rem",
                background: "#e3f2fd",
                borderRadius: "8px",
                marginBottom: "1rem",
              }}
            >
              <p style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>
                📦 Productos: ¿Recomendados?
              </p>
              {(ratingModal.items || []).map((item, idx) => {
                const key = item.menu_item_id || item.id || item.name;
                const pr = productRatings[key] || {};
                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.5rem 0",
                      borderBottom:
                        idx < (ratingModal.items || []).length - 1
                          ? "1px solid #ccc"
                          : "none",
                    }}
                  >
                    <span>{item.name}</span>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${pr.recommended === true ? "btn-success" : "btn-info"}`}
                        style={{ minWidth: "40px" }}
                        onClick={() =>
                          setProductRatings((prev) => ({
                            ...prev,
                            [key]: { recommended: true },
                          }))
                        }
                      >
                        👍
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${pr.recommended === false ? "btn-danger" : "btn-info"}`}
                        style={{ minWidth: "40px" }}
                        onClick={() =>
                          setProductRatings((prev) => ({
                            ...prev,
                            [key]: { recommended: false },
                          }))
                        }
                      >
                        👎
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="btn-group">
              <button
                className="btn btn-success"
                onClick={handleSubmitRatings}
                disabled={submittingRating}
                style={{ flex: 1 }}
              >
                {submittingRating ? "Enviando..." : "✅ Enviar Calificación"}
              </button>
              <button
                className="btn btn-danger"
                onClick={closeRatingModal}
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOrders;
