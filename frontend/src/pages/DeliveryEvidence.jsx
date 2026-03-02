import { useState, useEffect } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const DeliveryEvidence = () => {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      const res = await api.get("/delivery/my");
      setDeliveries(res.data.deliveries || []);
    } catch (error) {
      toast.error("Error al cargar entregas");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("La imagen no puede superar 5MB");
        return;
      }
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async (delivery) => {
    if (!selectedFile) {
      toast.error("Selecciona una foto de evidencia");
      return;
    }

    setUploading(delivery.id);
    try {
      const formData = new FormData();
      formData.append("photo", selectedFile);
      formData.append("order_id", delivery.order_id);
      formData.append("delivery_id", delivery.id);
      formData.append("notes", notes);

      const res = await api.post("/delivery/evidence", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        toast.success("¡Evidencia subida exitosamente! Entrega completada.");
        setSelectedFile(null);
        setPreview(null);
        setNotes("");
        fetchDeliveries();
      } else {
        toast.error(res.data.message || "Error al subir evidencia");
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Error al subir evidencia";
      toast.error(msg);
    } finally {
      setUploading(null);
    }
  };

  const enCaminoDeliveries = deliveries.filter((d) => d.status === "EN_CAMINO");
  const completedDeliveries = deliveries.filter(
    (d) => d.status === "ENTREGADA",
  );

  if (loading) return <div className="loading">Cargando entregas...</div>;

  return (
    <div>
      <h2>📸 Evidencia de Entrega</h2>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>
        Sube una foto como evidencia de entrega para completar el pedido.
      </p>

      <h3 style={{ marginBottom: "0.5rem" }}>🚗 Entregas en Camino</h3>
      {enCaminoDeliveries.length === 0 ? (
        <p style={{ color: "#999", marginBottom: "2rem" }}>
          No tienes entregas en camino.
        </p>
      ) : (
        <div className="card-grid" style={{ marginBottom: "2rem" }}>
          {enCaminoDeliveries.map((d) => (
            <div key={d.id} className="card">
              <h3>Orden #{d.order_id}</h3>
              <p>
                <strong>Estado:</strong>{" "}
                <span className="badge badge-en_camino">{d.status}</span>
              </p>
              <p>
                <strong>Aceptado:</strong>{" "}
                {d.accepted_at ? new Date(d.accepted_at).toLocaleString() : "-"}
              </p>

              <div
                style={{
                  marginTop: "1rem",
                  padding: "1rem",
                  background: "#f9f9f9",
                  borderRadius: "8px",
                }}
              >
                <div className="form-group">
                  <label>📷 Foto de Evidencia</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ marginTop: "0.3rem" }}
                  />
                </div>

                {preview && (
                  <div style={{ marginBottom: "0.5rem" }}>
                    <img
                      src={preview}
                      alt="Preview"
                      style={{
                        maxWidth: "100%",
                        maxHeight: "200px",
                        borderRadius: "8px",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>📝 Notas (opcional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Dejado en la puerta, entregado al portero, etc."
                    rows={2}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "2px solid #ddd",
                      borderRadius: "8px",
                      fontSize: "0.9rem",
                    }}
                  />
                </div>

                <button
                  className="btn btn-success"
                  onClick={() => handleUpload(d)}
                  disabled={uploading === d.id}
                  style={{ width: "100%" }}
                >
                  {uploading === d.id
                    ? "Subiendo..."
                    : "📸 Subir Evidencia y Completar Entrega"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ marginBottom: "0.5rem" }}>✅ Entregas Completadas</h3>
      {completedDeliveries.length === 0 ? (
        <p style={{ color: "#999" }}>No tienes entregas completadas.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Orden</th>
              <th>Estado</th>
              <th>Aceptado</th>
              <th>Entregado</th>
            </tr>
          </thead>
          <tbody>
            {completedDeliveries.map((d) => (
              <tr key={d.id}>
                <td>#{d.order_id}</td>
                <td>
                  <span className="badge badge-entregada">{d.status}</span>
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
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default DeliveryEvidence;
