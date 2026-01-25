import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";

const ClientDashboard = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const res = await api.get("/restaurants");
      setRestaurants(res.data.restaurants || []);
    } catch (error) {
      toast.error("Error al cargar restaurantes");
    } finally {
      setLoading(false);
    }
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
