import { useState, useEffect } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  validateRequired,
  validatePhone,
  runValidations,
} from "../utils/validators";
import FieldError from "../components/FieldError";

const AdminDashboard = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("restaurants");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    schedule: "",
    food_type: "",
    owner_id: "",
  });
  const [errors, setErrors] = useState({});
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    fetchRestaurants();
    fetchUsers();
    fetchOrders();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const res = await api.get("/restaurants");
      setRestaurants(res.data.restaurants || []);
    } catch (error) {
      toast.error("Error al cargar restaurantes");
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/auth/users");
      setUsers(res.data.users || []);
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await api.get("/orders/all");
      setOrders(res.data.orders || []);
    } catch (error) {
      console.error("Error al cargar ordenes:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = runValidations({
      name: validateRequired(form.name, "El nombre"),
      address: validateRequired(form.address, "La direccion"),
      phone: validatePhone(form.phone),
      food_type: validateRequired(form.food_type, "El tipo de comida"),
    });
    setErrors(result.errors);
    if (!result.valid) return;

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
      setForm({ name: "", address: "", phone: "", schedule: "", food_type: "", owner_id: "" });
      setErrors({});
      fetchRestaurants();
    } catch (error) {
      toast.error("Error al guardar restaurante");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Eliminar este restaurante?")) return;
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
      owner_id: r.owner_id || "",
    });
    setShowForm(true);
  };

  const restaurantOwners = users.filter((u) => u.role === "RESTAURANTE");

  const getOwnerName = (ownerId) => {
    const u = users.find((u) => u.id === ownerId);
    return u ? u.name : "ID: " + ownerId;
  };

  return (
    <div>
      <h2>Panel de Administrador</h2>

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", marginBottom: "1rem" }}>
        <button
          className={"btn " + (activeTab === "restaurants" ? "btn-primary" : "btn-secondary")}
          onClick={() => setActiveTab("restaurants")}
        >
          Restaurantes ({restaurants.length})
        </button>
        <button
          className={"btn " + (activeTab === "users" ? "btn-primary" : "btn-secondary")}
          onClick={() => setActiveTab("users")}
        >
          Usuarios ({users.length})
        </button>
        <button
          className={"btn " + (activeTab === "orders" ? "btn-primary" : "btn-secondary")}
          onClick={() => setActiveTab("orders")}
        >
          Ordenes ({orders.length})
        </button>
      </div>

      {activeTab === "restaurants" && (
        <div>
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowForm(!showForm);
              setEditing(null);
              setForm({ name: "", address: "", phone: "", schedule: "", food_type: "", owner_id: "" });
            }}
          >
            {showForm ? "Cerrar" : "+ Nuevo Restaurante"}
          </button>

          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="card"
              style={{ maxWidth: "500px", marginTop: "1rem" }}
              noValidate
            >
              <div className="form-group">
                <label>Propietario (usuario RESTAURANTE)</label>
                <select
                  value={form.owner_id}
                  onChange={(e) => setForm({ ...form, owner_id: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem" }}
                >
                  <option value="">-- Seleccionar propietario --</option>
                  {restaurantOwners.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Nombre *</label>
                <input
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    setErrors({ ...errors, name: null });
                  }}
                  className={errors.name ? "input-error" : ""}
                />
                <FieldError error={errors.name} />
              </div>
              <div className="form-group">
                <label>Direccion *</label>
                <input
                  value={form.address}
                  onChange={(e) => {
                    setForm({ ...form, address: e.target.value });
                    setErrors({ ...errors, address: null });
                  }}
                  className={errors.address ? "input-error" : ""}
                />
                <FieldError error={errors.address} />
              </div>
              <div className="form-group">
                <label>Telefono</label>
                <input
                  value={form.phone}
                  onChange={(e) => {
                    setForm({ ...form, phone: e.target.value });
                    setErrors({ ...errors, phone: null });
                  }}
                  className={errors.phone ? "input-error" : ""}
                />
                <FieldError error={errors.phone} />
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
                <label>Tipo de Comida *</label>
                <input
                  value={form.food_type}
                  onChange={(e) => {
                    setForm({ ...form, food_type: e.target.value });
                    setErrors({ ...errors, food_type: null });
                  }}
                  placeholder="Mexicana, Italiana, etc."
                  className={errors.food_type ? "input-error" : ""}
                />
                <FieldError error={errors.food_type} />
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
                <p>Direccion: {r.address || "-"}</p>
                <p>Telefono: {r.phone || "-"}</p>
                <p>Horario: {r.schedule || "-"}</p>
                <p>Tipo: {r.food_type || "-"}</p>
                <p>Propietario: {getOwnerName(r.owner_id)}</p>
                <div className="btn-group">
                  <button className="btn btn-warning btn-sm" onClick={() => startEdit(r)}>
                    Editar
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div>
          <button className="btn btn-secondary btn-sm" onClick={fetchUsers} style={{ marginBottom: "0.5rem" }}>
            Actualizar
          </button>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Registrado</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={"badge badge-" + u.role.toLowerCase()}>{u.role}</span>
                  </td>
                  <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p style={{ color: "#999" }}>No hay usuarios registrados.</p>}
        </div>
      )}

      {activeTab === "orders" && (
        <div>
          <button className="btn btn-secondary btn-sm" onClick={fetchOrders} style={{ marginBottom: "0.5rem" }}>
            Actualizar
          </button>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Restaurante</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Direccion</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.client_name}</td>
                  <td>{o.restaurant_name}</td>
                  <td>Q{parseFloat(o.total).toFixed(2)}</td>
                  <td>
                    <span className={"badge badge-" + o.status.toLowerCase()}>{o.status}</span>
                  </td>
                  <td>{o.delivery_address || "-"}</td>
                  <td>{o.created_at ? new Date(o.created_at).toLocaleDateString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <p style={{ color: "#999" }}>No hay ordenes.</p>}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
