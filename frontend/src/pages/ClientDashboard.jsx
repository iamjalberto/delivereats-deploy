import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";

const ClientDashboard = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const res = await api.get("/restaurants");
      const list = res.data.restaurants || [];
      setRestaurants(list);

      // Fetch average ratings for each restaurant
      const ratingsMap = {};
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
          } catch {
            // no ratings yet
          }
        }),
      );
      setRatings(ratingsMap);
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        "Error al cargar restaurantes. Verifica tu conexión.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
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
