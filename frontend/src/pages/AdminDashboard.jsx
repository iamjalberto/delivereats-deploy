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

  // Coupons state
  const [coupons, setCoupons] = useState([]);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: "",
    description: "",
    discount_type: "PORCENTAJE",
    discount_value: "",
    min_order_amount: "",
    max_discount: "",
    max_uses: "",
    expires_at: "",
  });

  useEffect(() => {
    fetchRestaurants();
    fetchUsers();
    fetchOrders();
    fetchCoupons();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const res = await api.get("/restaurants");
      setRestaurants(res.data.restaurants || []);
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        "Error al cargar restaurantes. Verifica tu conexión.";
      toast.error(msg);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/auth/users");
      setUsers(res.data.users || []);
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        "Error al cargar usuarios. Verifica tu conexión.";
      toast.error(msg);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await api.get("/orders/all");
      setOrders(res.data.orders || []);
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        "Error al cargar órdenes. Verifica tu conexión.";
      toast.error(msg);
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
      setForm({
        name: "",
        address: "",
        phone: "",
        schedule: "",
        food_type: "",
        owner_id: "",
      });
      setErrors({});
      fetchRestaurants();
    } catch (error) {
      const msg =
        error.response?.data?.message || "Error al guardar restaurante.";
      toast.error(msg);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Eliminar este restaurante?")) return;
    try {
      await api.delete(`/restaurants/${id}`);
      toast.success("Restaurante eliminado");
      fetchRestaurants();
    } catch (error) {
      const msg =
        error.response?.data?.message || "Error al eliminar restaurante.";
      toast.error(msg);
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

  const fetchCoupons = async () => {
    try {
      const res = await api.get("/payments/coupons/list");
      setCoupons(res.data.coupons || []);
    } catch (error) {
      // coupons endpoint might not be available yet
    }
  };

  const handleCouponSubmit = async (e) => {
    e.preventDefault();
    if (!couponForm.code || !couponForm.discount_value) {
      toast.error("Código y valor de descuento son requeridos");
      return;
    }
    try {
      await api.post("/payments/coupons", {
        code: couponForm.code.toUpperCase(),
        description: couponForm.description,
        discount_type: couponForm.discount_type,
        discount_value: parseFloat(couponForm.discount_value),
        min_order_amount: couponForm.min_order_amount
          ? parseFloat(couponForm.min_order_amount)
          : 0,
        max_discount: couponForm.max_discount
          ? parseFloat(couponForm.max_discount)
          : 0,
        max_uses: couponForm.max_uses ? parseInt(couponForm.max_uses) : 0,
        expires_at: couponForm.expires_at || "",
      });
      toast.success("Cupón creado exitosamente");
      setCouponForm({
        code: "",
        description: "",
        discount_type: "PORCENTAJE",
        discount_value: "",
        min_order_amount: "",
        max_discount: "",
        max_uses: "",
        expires_at: "",
      });
      setShowCouponForm(false);
      fetchCoupons();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error al crear cupón");
    }
  };

  const handleDeleteCoupon = async (id) => {
    if (!confirm("¿Eliminar este cupón?")) return;
    try {
      await api.delete(`/payments/coupons/${id}`);
      toast.success("Cupón eliminado");
      fetchCoupons();
    } catch (error) {
      toast.error("Error al eliminar cupón");
    }
  };

  return (
    <div>
      <h2>Panel de Administrador</h2>

      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginTop: "1rem",
          marginBottom: "1rem",
        }}
      >
        <button
          className={
            "btn " +
            (activeTab === "restaurants" ? "btn-primary" : "btn-secondary")
          }
          onClick={() => setActiveTab("restaurants")}
        >
          Restaurantes ({restaurants.length})
        </button>
        <button
          className={
            "btn " + (activeTab === "users" ? "btn-primary" : "btn-secondary")
          }
          onClick={() => setActiveTab("users")}
        >
          Usuarios ({users.length})
        </button>
        <button
          className={
            "btn " + (activeTab === "orders" ? "btn-primary" : "btn-secondary")
          }
          onClick={() => setActiveTab("orders")}
        >
          Ordenes ({orders.length})
        </button>
        <button
          className={
            "btn " + (activeTab === "coupons" ? "btn-primary" : "btn-secondary")
          }
          onClick={() => setActiveTab("coupons")}
        >
          🏷️ Cupones ({coupons.length})
        </button>
      </div>

      {activeTab === "restaurants" && (
        <div>
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowForm(!showForm);
              setEditing(null);
              setForm({
                name: "",
                address: "",
                phone: "",
                schedule: "",
                food_type: "",
                owner_id: "",
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
              noValidate
            >
              <div className="form-group">
                <label>Propietario (usuario RESTAURANTE)</label>
                <select
                  value={form.owner_id}
                  onChange={(e) =>
                    setForm({ ...form, owner_id: e.target.value })
                  }
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
                  onChange={(e) =>
                    setForm({ ...form, schedule: e.target.value })
                  }
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
      )}

      {activeTab === "users" && (
        <div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={fetchUsers}
            style={{ marginBottom: "0.5rem" }}
          >
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
                    <span className={"badge badge-" + u.role.toLowerCase()}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    {u.created_at
                      ? new Date(u.created_at).toLocaleDateString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p style={{ color: "#999" }}>No hay usuarios registrados.</p>
          )}
        </div>
      )}

      {activeTab === "orders" && (
        <div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={fetchOrders}
            style={{ marginBottom: "0.5rem" }}
          >
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
                    <span className={"badge badge-" + o.status.toLowerCase()}>
                      {o.status}
                    </span>
                  </td>
                  <td>{o.delivery_address || "-"}</td>
                  <td>
                    {o.created_at
                      ? new Date(o.created_at).toLocaleDateString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && (
            <p style={{ color: "#999" }}>No hay ordenes.</p>
          )}
        </div>
      )}

      {activeTab === "coupons" && (
        <div>
          <button
            className="btn btn-primary"
            onClick={() => setShowCouponForm(!showCouponForm)}
            style={{ marginBottom: "1rem" }}
          >
            {showCouponForm ? "Cerrar" : "+ Nuevo Cupón"}
          </button>

          {showCouponForm && (
            <form
              onSubmit={handleCouponSubmit}
              className="card"
              style={{ maxWidth: "500px", marginBottom: "1rem" }}
            >
              <div className="form-group">
                <label>Código *</label>
                <input
                  value={couponForm.code}
                  onChange={(e) =>
                    setCouponForm({ ...couponForm, code: e.target.value })
                  }
                  placeholder="Ej: DESCUENTO20"
                  style={{ textTransform: "uppercase" }}
                />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <input
                  value={couponForm.description}
                  onChange={(e) =>
                    setCouponForm({
                      ...couponForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="20% de descuento en tu primera orden"
                />
              </div>
              <div style={{ display: "flex", gap: "1rem" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Tipo de Descuento</label>
                  <select
                    value={couponForm.discount_type}
                    onChange={(e) =>
                      setCouponForm({
                        ...couponForm,
                        discount_type: e.target.value,
                      })
                    }
                  >
                    <option value="PORCENTAJE">Porcentaje (%)</option>
                    <option value="FIJO">Monto Fijo (Q)</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Valor del Descuento *</label>
                  <input
                    type="number"
                    value={couponForm.discount_value}
                    onChange={(e) =>
                      setCouponForm({
                        ...couponForm,
                        discount_value: e.target.value,
                      })
                    }
                    placeholder={
                      couponForm.discount_type === "PORCENTAJE" ? "20" : "50.00"
                    }
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: "1rem" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Orden Mínima (Q)</label>
                  <input
                    type="number"
                    value={couponForm.min_order_amount}
                    onChange={(e) =>
                      setCouponForm({
                        ...couponForm,
                        min_order_amount: e.target.value,
                      })
                    }
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Descuento Máximo (Q)</label>
                  <input
                    type="number"
                    value={couponForm.max_discount}
                    onChange={(e) =>
                      setCouponForm({
                        ...couponForm,
                        max_discount: e.target.value,
                      })
                    }
                    placeholder="0 = sin límite"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: "1rem" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Usos Máximos</label>
                  <input
                    type="number"
                    value={couponForm.max_uses}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, max_uses: e.target.value })
                    }
                    placeholder="0 = ilimitado"
                    min="0"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Fecha de Expiración</label>
                  <input
                    type="date"
                    value={couponForm.expires_at}
                    onChange={(e) =>
                      setCouponForm({
                        ...couponForm,
                        expires_at: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-success">
                Crear Cupón
              </button>
            </form>
          )}

          {coupons.length === 0 ? (
            <p style={{ color: "#999" }}>No hay cupones creados.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                  <th>Orden Mín.</th>
                  <th>Usos</th>
                  <th>Expira</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.code}</strong>
                    </td>
                    <td>{c.description || "-"}</td>
                    <td>{c.discount_type === "PORCENTAJE" ? "%" : "Q"}</td>
                    <td>
                      {c.discount_type === "PORCENTAJE"
                        ? `${c.discount_value}%`
                        : `Q${parseFloat(c.discount_value).toFixed(2)}`}
                    </td>
                    <td>
                      {c.min_order_amount
                        ? `Q${parseFloat(c.min_order_amount).toFixed(2)}`
                        : "-"}
                    </td>
                    <td>
                      {c.current_uses || 0}
                      {c.max_uses ? ` / ${c.max_uses}` : " / ∞"}
                    </td>
                    <td>
                      {c.expires_at
                        ? new Date(c.expires_at).toLocaleDateString()
                        : "Sin exp."}
                    </td>
                    <td>
                      <span
                        className={`badge ${c.active ? "badge-entregada" : "badge-cancelada"}`}
                      >
                        {c.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteCoupon(c.id)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
