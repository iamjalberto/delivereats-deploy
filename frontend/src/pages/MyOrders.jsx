import { useState, useEffect } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get("/orders/my");
      setOrders(res.data.orders || []);
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        "Error al cargar órdenes. Verifica tu conexión.";
      toast.error(msg);
    } finally {
      setLoading(false);
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
              <button
                className="btn btn-danger btn-sm"
                style={{ marginTop: "0.5rem" }}
                onClick={() => handleCancel(o.id)}
              >
                Cancelar Orden
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default MyOrders;
