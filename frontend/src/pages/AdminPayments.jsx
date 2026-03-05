import { useState, useEffect } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("payments");
  const [evidenceModal, setEvidenceModal] = useState(null);
  const [refunding, setRefunding] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [paymentsRes, deliveriesRes] = await Promise.all([
        api.get("/payments/all"),
        api.get("/delivery/all"),
      ]);
      setPayments(paymentsRes.data.payments || []);
      setDeliveries(deliveriesRes.data.deliveries || []);
    } catch (error) {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const viewEvidence = async (orderId) => {
    try {
      const res = await api.get(`/delivery/evidence/${orderId}`);
      if (res.data.success && res.data.evidence) {
        setEvidenceModal(res.data.evidence);
      } else {
        toast.error("No hay evidencia para esta orden");
      }
    } catch (error) {
      toast.error("Error al obtener evidencia");
    }
  };

  const handleRefund = async (orderId, paymentId) => {
    if (!confirm("¿Estás seguro de aprobar esta devolución?")) return;
    setRefunding(paymentId);
    try {
      const reason =
        prompt("Razón de la devolución:") ||
        "Devolución aprobada por administrador";
      const res = await api.post("/payments/refund", {
        payment_id: orderId,
        reason,
      });
      if (res.data.success) {
        toast.success("Devolución aprobada exitosamente");
        fetchData();
      } else {
        toast.error(res.data.message || "Error al procesar devolución");
      }
    } catch (error) {
      toast.error("Error al procesar devolución");
    } finally {
      setRefunding(null);
    }
  };

  const getPaymentStatusBadge = (status) => {
    const map = {
      PAGADO: "badge-entregada",
      PENDIENTE: "badge-creada",
      RECHAZADO: "badge-cancelada",
      REEMBOLSADO: "badge-rechazada",
    };
    return map[status] || "badge-creada";
  };

  const getPaymentTypeLabel = (type) => {
    const map = {
      TARJETA_CREDITO: "💳 Tarjeta Crédito",
      TARJETA_DEBITO: "💳 Tarjeta Débito",
      CARTERA_DIGITAL: "📱 Cartera Digital",
    };
    return map[type] || type;
  };

  if (loading) return <div className="loading">Cargando datos...</div>;

  return (
    <div>
      <h2>💰 Gestión de Pagos y Entregas</h2>

      <div className="btn-group" style={{ marginBottom: "1.5rem" }}>
        <button
          className={`btn ${activeTab === "payments" ? "btn-primary" : "btn-info"}`}
          onClick={() => setActiveTab("payments")}
          style={{ width: "auto" }}
        >
          💳 Pagos ({payments.length})
        </button>
        <button
          className={`btn ${activeTab === "deliveries" ? "btn-primary" : "btn-info"}`}
          onClick={() => setActiveTab("deliveries")}
          style={{ width: "auto" }}
        >
          🚗 Entregas ({deliveries.length})
        </button>
      </div>

      {/* Payments Tab */}
      {activeTab === "payments" && (
        <>
          <h3>💳 Todos los Pagos</h3>
          {payments.length === 0 ? (
            <p style={{ color: "#999" }}>No hay pagos registrados.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Orden</th>
                  <th>Tipo</th>
                  <th>Monto Original</th>
                  <th>Monto Convertido</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>#{p.id}</td>
                    <td>#{p.order_id}</td>
                    <td>{getPaymentTypeLabel(p.payment_type)}</td>
                    <td>Q{parseFloat(p.amount).toFixed(2)}</td>
                    <td>
                      {p.converted_amount && p.converted_currency !== "GTQ"
                        ? `${parseFloat(p.converted_amount).toFixed(2)} ${p.converted_currency}`
                        : "-"}
                    </td>
                    <td>
                      <span
                        className={`badge ${getPaymentStatusBadge(p.status)}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td>
                      {p.created_at
                        ? new Date(p.created_at).toLocaleString()
                        : "-"}
                    </td>
                    <td>
                      <div className="btn-group">
                        <button
                          className="btn btn-info btn-sm"
                          onClick={() => viewEvidence(p.order_id)}
                        >
                          📸 Evidencia
                        </button>
                        {p.status === "PAGADO" && (
                          <button
                            className="btn btn-warning btn-sm"
                            onClick={() => handleRefund(p.order_id, p.id)}
                            disabled={refunding === p.id}
                          >
                            {refunding === p.id ? "..." : "💸 Reembolsar"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* Deliveries Tab */}
      {activeTab === "deliveries" && (
        <>
          <h3>🚗 Todas las Entregas</h3>
          {deliveries.length === 0 ? (
            <p style={{ color: "#999" }}>No hay entregas registradas.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Orden</th>
                  <th>Repartidor</th>
                  <th>Estado</th>
                  <th>Aceptado</th>
                  <th>Entregado</th>
                  <th>Evidencia</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id}>
                    <td>#{d.id}</td>
                    <td>#{d.order_id}</td>
                    <td>{d.delivery_person_name}</td>
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
                      {d.delivered_at
                        ? new Date(d.delivered_at).toLocaleString()
                        : "-"}
                    </td>
                    <td>
                      <button
                        className="btn btn-info btn-sm"
                        onClick={() => viewEvidence(d.order_id)}
                      >
                        📸 Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* Evidence Modal */}
      {evidenceModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={() => setEvidenceModal(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: "600px",
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>📸 Evidencia de Entrega - Orden #{evidenceModal.order_id}</h3>
            <img
              src={evidenceModal.photo_path}
              alt="Evidencia de entrega"
              style={{
                width: "100%",
                maxHeight: "400px",
                objectFit: "contain",
                borderRadius: "8px",
                marginTop: "1rem",
              }}
            />
            <p style={{ marginTop: "0.5rem" }}>
              <strong>Archivo:</strong> {evidenceModal.photo_original_name}
            </p>
            {evidenceModal.notes && (
              <p>
                <strong>Notas:</strong> {evidenceModal.notes}
              </p>
            )}
            <p>
              <strong>Fecha:</strong>{" "}
              {evidenceModal.uploaded_at
                ? new Date(evidenceModal.uploaded_at).toLocaleString()
                : "-"}
            </p>
            <button
              className="btn btn-danger"
              style={{ marginTop: "1rem", width: "100%" }}
              onClick={() => setEvidenceModal(null)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayments;
