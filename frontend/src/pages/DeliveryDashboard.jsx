import { useState, useEffect } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const DeliveryDashboard = () => {
  const { user } = useAuth();
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myDeliveries, setMyDeliveries] = useState([]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [available, mine] = await Promise.all([
        api.get("/delivery/available"),
        api.get("/delivery/my"),
      ]);
      setAvailableOrders(available.data.orders || []);
      setMyDeliveries(mine.data.deliveries || []);
    } catch (error) {
      console.error("Error fetching delivery data");
    }
  };

  const handleAccept = async (orderId) => {
    try {
      const res = await api.post("/delivery/accept", { order_id: orderId });
      if (res.data.success) {
        toast.success("¡Pedido aceptado! En camino.");
        fetchData();
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      toast.error("Error al aceptar pedido");
    }
  };

  const handleUpdateStatus = async (orderId, status, reason = "") => {
    try {
      if (status === "CANCELADA") {
        reason =
          prompt("Razón de la cancelación:") || "Cancelado por repartidor";
      }
      const res = await api.put("/delivery/status", {
        order_id: orderId,
        status,
        reason,
      });
      if (res.data.success) {
        toast.success(`Estado actualizado a ${status}`);
        fetchData();
      }
    } catch (error) {
      toast.error("Error al actualizar estado");
    }
  };

  return (
    <div>
      <h2>🛵 Panel de Repartidor</h2>

      <h3 style={{ marginTop: "1.5rem", marginBottom: "0.5rem" }}>
        📦 Órdenes Disponibles para Entregar
      </h3>
      {availableOrders.length === 0 ? (
        <p style={{ color: "#999" }}>No hay órdenes listas para entregar.</p>
      ) : (
        <div className="card-grid">
          {availableOrders.map((o) => (
            <div key={o.id} className="card">
              <h3>Orden #{o.id}</h3>
              <p>
                <strong>Restaurante:</strong> {o.restaurant_name}
              </p>
              <p>
                <strong>Cliente:</strong> {o.client_name}
              </p>
              <p>
                <strong>Dirección:</strong> {o.delivery_address}
              </p>
              <p>
                <strong>Total:</strong> Q{parseFloat(o.total).toFixed(2)}
              </p>
              <p>
                <strong>Productos:</strong>
              </p>
              <ul>
                {(o.items || []).map((i, idx) => (
                  <li key={idx}>
                    {i.name} x{i.quantity}
                  </li>
                ))}
              </ul>
              <button
                className="btn btn-success"
                style={{ marginTop: "0.5rem" }}
                onClick={() => handleAccept(o.id)}
              >
                🛵 Aceptar Pedido
              </button>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ marginTop: "2rem", marginBottom: "0.5rem" }}>
        🚗 Mis Entregas
      </h3>
      {myDeliveries.length === 0 ? (
        <p style={{ color: "#999" }}>No tienes entregas activas.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Orden</th>
              <th>Estado</th>
              <th>Aceptado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {myDeliveries.map((d) => (
              <tr key={d.id}>
                <td>#{d.order_id}</td>
                <td>
                  <span className={`badge badge-${d.status.toLowerCase()}`}>
                    {d.status}
                  </span>
                </td>
                <td>
                  {d.accepted_at
                    ? new Date(d.accepted_at).toLocaleString()
                    : "-"}
                </td>
                <td>
                  <div className="btn-group">
                    {d.status === "EN_CAMINO" && (
                      <>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() =>
                            handleUpdateStatus(d.order_id, "ENTREGADA")
                          }
                        >
                          ✅ Entregado
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() =>
                            handleUpdateStatus(d.order_id, "CANCELADA")
                          }
                        >
                          ❌ Cancelar
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default DeliveryDashboard;
