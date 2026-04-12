import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";

const ClientDashboard = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState({});
  const [promotions, setPromotions] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [foodTypeFilter, setFoodTypeFilter] = useState("");
  const [promoFilter, setPromoFilter] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery || activeFilter || foodTypeFilter || promoFilter) {
        searchRestaurants();
      } else {
        fetchRestaurants();
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, activeFilter, foodTypeFilter, promoFilter]);

  const fetchRestaurants = async () => {
    try {
      const res = await api.get("/restaurants");
      const list = res.data.restaurants || [];
      setRestaurants(list);
      fetchExtras(list);
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        "Error al cargar restaurantes. Verifica tu conexión.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const searchRestaurants = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("query", searchQuery);
      if (foodTypeFilter) params.append("food_type", foodTypeFilter);
      if (activeFilter) params.append("filter", activeFilter);
      if (promoFilter) params.append("has_promotions", "true");
      const res = await api.get(`/restaurants/search?${params.toString()}`);
      const list = res.data.restaurants || [];
      setRestaurants(list);
      fetchExtras(list);
    } catch {
      // fallback to full list
    }
  };

  const fetchExtras = async (list) => {
    const ratingsMap = {};
    const promosMap = {};
    await Promise.all(
      list.map(async (r) => {
        try {
          const avgRes = await api.get(`/ratings/average/${r.id}`);
          if (avgRes.data) {
            ratingsMap[r.id] = {
              average: avgRes.data.average_stars || 0,
              total: avgRes.data.total_ratings || 0,
            };
          }
        } catch {}
        try {
          const promoRes = await api.get(`/restaurants/${r.id}/promotions`);
          const active = (promoRes.data.promotions || []).filter(
            (p) => p.active && (!p.ends_at || new Date(p.ends_at) > new Date()),
          );
          if (active.length > 0) promosMap[r.id] = active;
        } catch {}
      }),
    );
    setRatings(ratingsMap);
    setPromotions(promosMap);
  };

  const renderStars = (avg) => {
    const full = Math.floor(avg);
    const half = avg - full >= 0.5;
    let stars = "";
    for (let i = 0; i < full; i++) stars += "★";
    if (half) stars += "½";
    const empty = 5 - full - (half ? 1 : 0);
    for (let i = 0; i < empty; i++) stars += "☆";
    return stars;
  };

  if (loading) return <div className="loading">Cargando restaurantes...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: "1rem" }}>🍽️ Restaurantes Disponibles</h2>

      {/* Search & Filters */}
      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="🔍 Buscar restaurante o tipo de comida..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "0.6rem",
            marginBottom: "0.5rem",
            borderRadius: "6px",
            border: "1px solid #ddd",
          }}
        />
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {["nuevos", "destacados", "mejor_puntuados"].map((f) => (
            <button
              key={f}
              className={`btn btn-sm ${activeFilter === f ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveFilter(activeFilter === f ? "" : f)}
            >
              {f === "nuevos"
                ? "🆕 Nuevos"
                : f === "destacados"
                  ? "⭐ Destacados"
                  : "🏆 Mejor Puntuados"}
            </button>
          ))}
          <button
            className={`btn btn-sm ${promoFilter ? "btn-success" : "btn-secondary"}`}
            onClick={() => setPromoFilter(!promoFilter)}
          >
            🏷️ Con Promociones
          </button>
          <select
            value={foodTypeFilter}
            onChange={(e) => setFoodTypeFilter(e.target.value)}
            style={{
              padding: "0.3rem 0.6rem",
              borderRadius: "6px",
              border: "1px solid #ddd",
            }}
          >
            <option value="">Todos los tipos</option>
            {[
              ...new Set(restaurants.map((r) => r.food_type).filter(Boolean)),
            ].map((ft) => (
              <option key={ft} value={ft}>
                {ft}
              </option>
            ))}
          </select>
          {(searchQuery || activeFilter || foodTypeFilter || promoFilter) && (
            <button
              className="btn btn-sm btn-danger"
              onClick={() => {
                setSearchQuery("");
                setActiveFilter("");
                setFoodTypeFilter("");
                setPromoFilter(false);
              }}
            >
              ✕ Limpiar
            </button>
          )}
        </div>
      </div>

      {restaurants.length === 0 ? (
        <div className="empty-state">
          <span>🏪</span>
          <p>No hay restaurantes disponibles aún</p>
        </div>
      ) : (
        <div className="card-grid">
          {restaurants.map((r) => (
            <div key={r.id} className="card">
              <h3>{r.name}</h3>
              {ratings[r.id] && ratings[r.id].total > 0 && (
                <p style={{ color: "#ffc107", marginBottom: "0.3rem" }}>
                  {renderStars(ratings[r.id].average)}{" "}
                  <span style={{ color: "#666", fontSize: "0.85rem" }}>
                    ({ratings[r.id].average.toFixed(1)} - {ratings[r.id].total}{" "}
                    reseñas)
                  </span>
                </p>
              )}
              {promotions[r.id] && (
                <div style={{ marginBottom: "0.4rem" }}>
                  {promotions[r.id].map((promo) => (
                    <span
                      key={promo.id}
                      style={{
                        display: "inline-block",
                        background: "#e8f5e9",
                        color: "#2e7d32",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "12px",
                        fontSize: "0.8rem",
                        marginRight: "0.3rem",
                        marginBottom: "0.2rem",
                      }}
                    >
                      🏷️ {promo.title} (
                      {promo.discount_type === "PORCENTAJE"
                        ? `${promo.discount_value}%`
                        : `Q${promo.discount_value}`}
                      )
                    </span>
                  ))}
                </div>
              )}
              <p>📍 {r.address || "Sin dirección"}</p>
              <p>📞 {r.phone || "Sin teléfono"}</p>
              <p>🕐 {r.schedule || "Sin horario"}</p>
              <p>🍕 {r.food_type || "General"}</p>
              <div className="btn-group">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate(`/restaurant/${r.id}/menu`)}
                >
                  Ver Menú
                </button>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => navigate(`/order/${r.id}`)}
                >
                  Ordenar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientDashboard;
