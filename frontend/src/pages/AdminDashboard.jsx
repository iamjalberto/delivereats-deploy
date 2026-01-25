import { useState, useEffect } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

const AdminDashboard = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    schedule: "",
    food_type: "",
  });
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const res = await api.get("/restaurants");
      setRestaurants(res.data.restaurants || []);
    } catch (error) {
      toast.error("Error al cargar restaurantes");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/restaurants/${editing.id}`, form);
        toast.success("Restaurante actualizado");
      } else {
        await api.post("/restaurants", form);
        toast.success("Restaurante creado");
      }
      setShowForm(false);
      setEditing(null);
      setForm({
        name: "",
        address: "",
        phone: "",
        schedule: "",
        food_type: "",
      });
      fetchRestaurants();
    } catch (error) {
      toast.error("Error al guardar restaurante");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este restaurante?")) return;
    try {
      await api.delete(`/restaurants/${id}`);
      toast.success("Restaurante eliminado");
      fetchRestaurants();
    } catch (error) {
      toast.error("Error al eliminar");
    }
  };

  const startEdit = (r) => {
    setEditing(r);
    setForm({
      name: r.name,
      address: r.address,
      phone: r.phone,
      schedule: r.schedule,
      food_type: r.food_type,
    });
    setShowForm(true);
  };

  return (
    <div>
      <h2>⚙️ Panel de Administrador</h2>
      <button
        className="btn btn-primary"
        style={{ marginTop: "1rem" }}
        onClick={() => {
          setShowForm(!showForm);
          setEditing(null);
          setForm({
            name: "",
            address: "",
            phone: "",
            schedule: "",
            food_type: "",
          });
        }}
      >
        {showForm ? "Cerrar" : "+ Nuevo Restaurante"}
      </button>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="card"
          style={{ maxWidth: "500px", marginTop: "1rem" }}
        >
          <div className="form-group">
            <label>Nombre</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Dirección</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Teléfono</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Horario</label>
            <input
              value={form.schedule}
              onChange={(e) => setForm({ ...form, schedule: e.target.value })}
              placeholder="8:00 - 20:00"
            />
          </div>
          <div className="form-group">
            <label>Tipo de Comida</label>
            <input
              value={form.food_type}
              onChange={(e) => setForm({ ...form, food_type: e.target.value })}
              placeholder="Mexicana, Italiana, etc."
            />
          </div>
          <button type="submit" className="btn btn-primary">
            {editing ? "Actualizar" : "Crear"} Restaurante
          </button>
        </form>
      )}

      <div className="card-grid" style={{ marginTop: "1rem" }}>
        {restaurants.map((r) => (
          <div key={r.id} className="card">
            <h3>{r.name}</h3>
            <p>📍 {r.address || "-"}</p>
            <p>📞 {r.phone || "-"}</p>
            <p>🕐 {r.schedule || "-"}</p>
            <p>🍕 {r.food_type || "-"}</p>
            <div className="btn-group">
              <button
                className="btn btn-warning btn-sm"
                onClick={() => startEdit(r)}
              >
                Editar
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleDelete(r.id)}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
