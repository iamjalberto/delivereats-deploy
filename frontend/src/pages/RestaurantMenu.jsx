import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";

const RestaurantMenu = () => {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [avgRating, setAvgRating] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [showReviews, setShowReviews] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [resR, resM] = await Promise.all([
        api.get(`/restaurants/${id}`),
        api.get(`/restaurants/${id}/menu`),
      ]);
      setRestaurant(resR.data.restaurant);
      setMenuItems(resM.data.items || []);

      // Fetch ratings
      try {
        const [avgRes, rRes] = await Promise.all([
          api.get(`/ratings/average/${id}`),
          api.get(`/ratings/restaurant/${id}`),
        ]);
        if (avgRes.data) setAvgRating(avgRes.data);
        setReviews(rRes.data.ratings || []);
      } catch {
        // no ratings yet
      }
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        "Error al cargar menú. Verifica tu conexión.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (n) => {
    let s = "";
    for (let i = 1; i <= 5; i++) s += i <= n ? "★" : "☆";
    return s;
  };

  if (loading) return <div className="loading">Cargando menú...</div>;

  return (
    <div>
      <h2>🍽️ Menú de {restaurant?.name || "Restaurante"}</h2>
      {restaurant && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <p>
            📍 {restaurant.address || "-"} | 📞 {restaurant.phone || "-"} | 🕐{" "}
            {restaurant.schedule || "-"}
          </p>
          {avgRating && avgRating.total_ratings > 0 && (
            <div style={{ marginTop: "0.5rem" }}>
              <span style={{ color: "#ffc107", fontSize: "1.2rem" }}>
                {renderStars(Math.round(avgRating.average_stars))}
              </span>{" "}
              <span style={{ color: "#666" }}>
                {parseFloat(avgRating.average_stars).toFixed(1)} (
                {avgRating.total_ratings} reseñas)
              </span>
              <button
                className="btn btn-info btn-sm"
                style={{ marginLeft: "1rem" }}
                onClick={() => setShowReviews(!showReviews)}
              >
                {showReviews ? "Ocultar Reseñas" : "Ver Reseñas"}
              </button>
            </div>
          )}
        </div>
      )}

      {showReviews && reviews.length > 0 && (
        <div
          className="card"
          style={{ marginBottom: "1rem", background: "#fffde7" }}
        >
          <h3 style={{ marginBottom: "0.5rem" }}>📝 Reseñas</h3>
          {reviews.map((r, idx) => (
            <div
              key={idx}
              style={{
                padding: "0.5rem 0",
                borderBottom:
                  idx < reviews.length - 1 ? "1px solid #eee" : "none",
              }}
            >
              <p>
                <strong>{r.user_name || "Usuario"}</strong>{" "}
                <span style={{ color: "#ffc107" }}>{renderStars(r.stars)}</span>
              </p>
              {r.comment && <p style={{ color: "#555" }}>{r.comment}</p>}
              <p style={{ fontSize: "0.75rem", color: "#999" }}>
                {r.created_at
                  ? new Date(r.created_at).toLocaleDateString()
                  : ""}
              </p>
            </div>
          ))}
        </div>
      )}

      {menuItems.length === 0 ? (
        <div className="empty-state">
          <span>📋</span>
          <p>Este restaurante no tiene productos en el menú aún.</p>
        </div>
      ) : (
        <div className="card-grid">
          {menuItems
            .filter((i) => i.available)
            .map((item) => (
              <div key={item.id} className="card">
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <p>
                  <strong>Q{parseFloat(item.price).toFixed(2)}</strong>
                </p>
                <p style={{ color: "#999", fontSize: "0.85rem" }}>
                  {item.category || "General"}
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default RestaurantMenu;
