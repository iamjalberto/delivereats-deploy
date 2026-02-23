import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";

const RestaurantMenu = () => {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

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
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        "Error al cargar menú. Verifica tu conexión.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
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
