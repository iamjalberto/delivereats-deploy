import { useState, useEffect } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import {
  validateRequired,
  validatePrice,
  runValidations,
} from "../utils/validators";
import FieldError from "../components/FieldError";

const RestaurantDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [menuForm, setMenuForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    available: true,
  });
  const [menuErrors, setMenuErrors] = useState({});
  const [editingItem, setEditingItem] = useState(null);
  const [showCreateRestaurant, setShowCreateRestaurant] = useState(false);
  const [restaurantForm, setRestaurantForm] = useState({
    name: "",
    address: "",
    phone: "",
    schedule: "",
    food_type: "",
  });
  const [restaurantErrors, setRestaurantErrors] = useState({});

  // Promotions
  const [promos, setPromos] = useState([]);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [promoForm, setPromoForm] = useState({
    title: "",
    description: "",
    discount_type: "PORCENTAJE",
    discount_value: "",
    starts_at: "",
    ends_at: "",
  });

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchOrders();
      fetchMenu();
      fetchPromos();
    }
  }, [selectedRestaurant]);

  const fetchRestaurants = async () => {
    try {
      const res = await api.get("/restaurants");
      const myRestaurants = (res.data.restaurants || []).filter(
        (r) => r.owner_id === user.id,
      );
      setRestaurants(myRestaurants);
      if (myRestaurants.length > 0) setSelectedRestaurant(myRestaurants[0]);
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        "Error al cargar restaurantes. Verifica tu conexión.";
      toast.error(msg);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await api.get(`/orders/restaurant/${selectedRestaurant.id}`);
      setOrders(res.data.orders || []);
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        "Error al cargar órdenes del restaurante.";
      toast.error(msg);
    }
  };

  const fetchMenu = async () => {
    try {
      const res = await api.get(`/restaurants/${selectedRestaurant.id}/menu`);
      setMenuItems(res.data.items || []);
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        "Error al cargar el menú del restaurante.";
      toast.error(msg);
    }
  };

  const handleStatusUpdate = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      toast.success(`Orden actualizada a ${status}`);
      fetchOrders();
    } catch (error) {
      const msg = error.response?.data?.message || "Error al actualizar orden.";
      toast.error(msg);
    }
  };

  const handleReject = async (orderId) => {
    const reason = prompt("Razón del rechazo:");
    if (!reason) return;
    try {
      await api.put(`/orders/${orderId}/reject`, { reason });
      toast.success("Orden rechazada");
      fetchOrders();
    } catch (error) {
      const msg = error.response?.data?.message || "Error al rechazar orden.";
      toast.error(msg);
    }
  };

  const handleCancelOrder = async (orderId) => {
    const reason = prompt("Razón de la cancelación:");
    if (!reason) return;
    try {
      await api.put(`/orders/${orderId}/cancel`, { reason });
      toast.success("Orden cancelada");
      fetchOrders();
    } catch (error) {
      const msg = error.response?.data?.message || "Error al cancelar orden.";
      toast.error(msg);
    }
  };

  const handleMenuSubmit = async (e) => {
    e.preventDefault();
    const result = runValidations({
      name: validateRequired(menuForm.name, "El nombre del producto"),
      price: validatePrice(menuForm.price),
      category: validateRequired(menuForm.category, "La categoría"),
    });
    setMenuErrors(result.errors);
    if (!result.valid) return;

    try {
      if (editingItem) {
        await api.put(`/restaurants/menu/${editingItem.id}`, {
          ...menuForm,
          price: parseFloat(menuForm.price),
        });
        toast.success("Producto actualizado");
      } else {
        await api.post(`/restaurants/${selectedRestaurant.id}/menu`, {
          ...menuForm,
          price: parseFloat(menuForm.price),
        });
        toast.success("Producto creado");
      }
      setShowMenuForm(false);
      setEditingItem(null);
      setMenuForm({
        name: "",
        description: "",
        price: "",
        category: "",
        available: true,
      });
      setMenuErrors({});
      fetchMenu();
    } catch (error) {
      const msg = error.response?.data?.message || "Error al guardar producto.";
      toast.error(msg);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm("¿Eliminar este producto?")) return;
    try {
      await api.delete(`/restaurants/menu/${itemId}`);
      toast.success("Producto eliminado");
      fetchMenu();
    } catch (error) {
      const msg =
        error.response?.data?.message || "Error al eliminar producto.";
      toast.error(msg);
    }
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setMenuForm({
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      available: item.available,
    });
    setShowMenuForm(true);
  };

  const fetchPromos = async () => {
    try {
      const res = await api.get(
        `/restaurants/${selectedRestaurant.id}/promotions`,
      );
      setPromos(res.data.promotions || []);
    } catch {
      setPromos([]);
    }
  };

  const handlePromoSubmit = async (e) => {
    e.preventDefault();
    if (!promoForm.title || !promoForm.discount_value) {
      toast.error("Título y valor de descuento son requeridos");
      return;
    }
    try {
      await api.post(`/restaurants/${selectedRestaurant.id}/promotions`, {
        title: promoForm.title,
        description: promoForm.description,
        discount_type: promoForm.discount_type,
        discount_value: parseFloat(promoForm.discount_value),
        starts_at: promoForm.starts_at,
        ends_at: promoForm.ends_at,
      });
      toast.success("Promoción creada");
      setShowPromoForm(false);
      setPromoForm({
        title: "",
        description: "",
        discount_type: "PORCENTAJE",
        discount_value: "",
        starts_at: "",
        ends_at: "",
      });
      fetchPromos();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error al crear promoción");
    }
  };

  const handleDeletePromo = async (promoId) => {
    if (!confirm("¿Eliminar esta promoción?")) return;
    try {
      await api.delete(`/restaurants/promotions/${promoId}`);
      toast.success("Promoción eliminada");
      fetchPromos();
    } catch {
      toast.error("Error al eliminar promoción");
    }
  };

  const handleCreateRestaurant = async (e) => {
    e.preventDefault();
    const result = runValidations({
      name: validateRequired(restaurantForm.name, "El nombre"),
      address: validateRequired(restaurantForm.address, "La dirección"),
    });
    setRestaurantErrors(result.errors);
    if (!result.valid) return;

    try {
      await api.post("/restaurants", restaurantForm);
      toast.success("Restaurante creado exitosamente");
      setShowCreateRestaurant(false);
      setRestaurantForm({
        name: "",
        address: "",
        phone: "",
        schedule: "",
        food_type: "",
      });
      setRestaurantErrors({});
      fetchRestaurants();
    } catch (error) {
      const msg =
        error.response?.data?.message || "Error al crear restaurante.";
      toast.error(msg);
    }
  };

  if (!selectedRestaurant) {
    return (
      <div className="empty-state">
        <span>🏪</span>
        <p>No tienes restaurantes asignados.</p>
        <button
          className="btn btn-primary"
          style={{ marginTop: "1rem" }}
          onClick={() => setShowCreateRestaurant(!showCreateRestaurant)}
        >
          {showCreateRestaurant ? "Cerrar" : "+ Crear Mi Restaurante"}
        </button>
        {showCreateRestaurant && (
          <form
            onSubmit={handleCreateRestaurant}
            className="card"
            style={{ maxWidth: "500px", marginTop: "1rem", textAlign: "left" }}
            noValidate
          >
            <div className="form-group">
              <label>Nombre *</label>
              <input
                value={restaurantForm.name}
                onChange={(e) => {
                  setRestaurantForm({
                    ...restaurantForm,
                    name: e.target.value,
                  });
                  setRestaurantErrors({ ...restaurantErrors, name: null });
                }}
                className={restaurantErrors.name ? "input-error" : ""}
              />
              <FieldError error={restaurantErrors.name} />
            </div>
            <div className="form-group">
              <label>Dirección *</label>
              <input
                value={restaurantForm.address}
                onChange={(e) => {
                  setRestaurantForm({
                    ...restaurantForm,
                    address: e.target.value,
                  });
                  setRestaurantErrors({ ...restaurantErrors, address: null });
                }}
                className={restaurantErrors.address ? "input-error" : ""}
              />
              <FieldError error={restaurantErrors.address} />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input
                value={restaurantForm.phone}
                onChange={(e) =>
                  setRestaurantForm({
                    ...restaurantForm,
                    phone: e.target.value,
                  })
                }
              />
            </div>
            <div className="form-group">
              <label>Horario</label>
              <input
                value={restaurantForm.schedule}
                onChange={(e) =>
                  setRestaurantForm({
                    ...restaurantForm,
                    schedule: e.target.value,
                  })
                }
                placeholder="8:00 - 20:00"
              />
            </div>
            <div className="form-group">
              <label>Tipo de Comida</label>
              <input
                value={restaurantForm.food_type}
                onChange={(e) =>
                  setRestaurantForm({
                    ...restaurantForm,
                    food_type: e.target.value,
                  })
                }
                placeholder="Mexicana, Italiana..."
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Crear Restaurante
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2>🏪 Panel de Restaurante: {selectedRestaurant.name}</h2>

      {/* ÓRDENES */}
      <h3 style={{ marginTop: "1.5rem", marginBottom: "0.5rem" }}>
        📋 Órdenes Recibidas
      </h3>
      {orders.length === 0 ? (
        <p style={{ color: "#999" }}>No hay órdenes.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{o.client_name}</td>
                <td>Q{parseFloat(o.total).toFixed(2)}</td>
                <td>
                  <span className={`badge badge-${o.status.toLowerCase()}`}>
                    {o.status}
                  </span>
                </td>
                <td>
                  <div className="btn-group">
                    {o.status === "CREADA" && (
                      <>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleStatusUpdate(o.id, "EN_PROCESO")}
                        >
                          Aceptar
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleReject(o.id)}
                        >
                          Rechazar
                        </button>
                      </>
                    )}
                    {o.status === "EN_PROCESO" && (
                      <button
                        className="btn btn-info btn-sm"
                        onClick={() => handleStatusUpdate(o.id, "LISTA")}
                      >
                        Marcar Lista
                      </button>
                    )}
                    {!["CANCELADA", "RECHAZADA", "ENTREGADA"].includes(
                      o.status,
                    ) && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleCancelOrder(o.id)}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* MENÚ */}
      <h3 style={{ marginTop: "2rem", marginBottom: "0.5rem" }}>
        🍽️ Menú
        <button
          className="btn btn-primary btn-sm"
          style={{ marginLeft: "1rem" }}
          onClick={() => {
            setShowMenuForm(!showMenuForm);
            setEditingItem(null);
            setMenuForm({
              name: "",
              description: "",
              price: "",
              category: "",
              available: true,
            });
          }}
        >
          {showMenuForm ? "Cerrar" : "+ Nuevo Producto"}
        </button>
      </h3>

      {showMenuForm && (
        <form
          onSubmit={handleMenuSubmit}
          className="card"
          style={{ maxWidth: "500px" }}
          noValidate
        >
          <div className="form-group">
            <label>Nombre *</label>
            <input
              value={menuForm.name}
              onChange={(e) => {
                setMenuForm({ ...menuForm, name: e.target.value });
                setMenuErrors({ ...menuErrors, name: null });
              }}
              className={menuErrors.name ? "input-error" : ""}
            />
            <FieldError error={menuErrors.name} />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <textarea
              value={menuForm.description}
              onChange={(e) =>
                setMenuForm({ ...menuForm, description: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>Precio (Q) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={menuForm.price}
              onChange={(e) => {
                setMenuForm({ ...menuForm, price: e.target.value });
                setMenuErrors({ ...menuErrors, price: null });
              }}
              className={menuErrors.price ? "input-error" : ""}
            />
            <FieldError error={menuErrors.price} />
          </div>
          <div className="form-group">
            <label>Categoría *</label>
            <input
              value={menuForm.category}
              onChange={(e) => {
                setMenuForm({ ...menuForm, category: e.target.value });
                setMenuErrors({ ...menuErrors, category: null });
              }}
              className={menuErrors.category ? "input-error" : ""}
              placeholder="Bebidas, Entradas, Platos fuertes..."
            />
            <FieldError error={menuErrors.category} />
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={menuForm.available}
                onChange={(e) =>
                  setMenuForm({ ...menuForm, available: e.target.checked })
                }
              />{" "}
              Disponible
            </label>
          </div>
          <button type="submit" className="btn btn-primary">
            {editingItem ? "Actualizar" : "Crear"} Producto
          </button>
        </form>
      )}

      <div className="card-grid" style={{ marginTop: "1rem" }}>
        {menuItems.map((item) => (
          <div key={item.id} className="card">
            <h3>{item.name}</h3>
            <p>{item.description}</p>
            <p>
              <strong>Q{parseFloat(item.price).toFixed(2)}</strong> |{" "}
              {item.category || "Sin categoría"}
            </p>
            <p>{item.available ? "✅ Disponible" : "❌ No disponible"}</p>
            <div className="btn-group">
              <button
                className="btn btn-warning btn-sm"
                onClick={() => startEdit(item)}
              >
                Editar
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleDeleteItem(item.id)}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* PROMOCIONES */}
      <h3 style={{ marginTop: "2rem", marginBottom: "0.5rem" }}>
        🏷️ Promociones
        <button
          className="btn btn-primary btn-sm"
          style={{ marginLeft: "1rem" }}
          onClick={() => setShowPromoForm(!showPromoForm)}
        >
          {showPromoForm ? "Cerrar" : "+ Nueva Promoción"}
        </button>
      </h3>

      {showPromoForm && (
        <form
          onSubmit={handlePromoSubmit}
          className="card"
          style={{ maxWidth: "500px" }}
        >
          <div className="form-group">
            <label>Título *</label>
            <input
              value={promoForm.title}
              onChange={(e) =>
                setPromoForm({ ...promoForm, title: e.target.value })
              }
              placeholder="Ej: 2x1 en pizzas"
            />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <input
              value={promoForm.description}
              onChange={(e) =>
                setPromoForm({ ...promoForm, description: e.target.value })
              }
            />
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Tipo</label>
              <select
                value={promoForm.discount_type}
                onChange={(e) =>
                  setPromoForm({ ...promoForm, discount_type: e.target.value })
                }
              >
                <option value="PORCENTAJE">Porcentaje (%)</option>
                <option value="FIJO">Monto Fijo (Q)</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Valor *</label>
              <input
                type="number"
                value={promoForm.discount_value}
                onChange={(e) =>
                  setPromoForm({ ...promoForm, discount_value: e.target.value })
                }
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Inicio</label>
              <input
                type="date"
                value={promoForm.starts_at}
                onChange={(e) =>
                  setPromoForm({ ...promoForm, starts_at: e.target.value })
                }
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Fin</label>
              <input
                type="date"
                value={promoForm.ends_at}
                onChange={(e) =>
                  setPromoForm({ ...promoForm, ends_at: e.target.value })
                }
              />
            </div>
          </div>
          <button type="submit" className="btn btn-success">
            Crear Promoción
          </button>
        </form>
      )}

      {promos.length === 0 ? (
        <p style={{ color: "#999" }}>No hay promociones activas.</p>
      ) : (
        <div className="card-grid" style={{ marginTop: "0.5rem" }}>
          {promos.map((p) => (
            <div key={p.id} className="card">
              <h3>🏷️ {p.title}</h3>
              <p>{p.description}</p>
              <p>
                <strong>
                  {p.discount_type === "PORCENTAJE"
                    ? `${p.discount_value}%`
                    : `Q${p.discount_value}`}{" "}
                  de descuento
                </strong>
              </p>
              {p.starts_at && (
                <p>Inicio: {new Date(p.starts_at).toLocaleDateString()}</p>
              )}
              {p.ends_at && (
                <p>Fin: {new Date(p.ends_at).toLocaleDateString()}</p>
              )}
              <p>{p.active ? "✅ Activa" : "❌ Inactiva"}</p>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleDeletePromo(p.id)}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RestaurantDashboard;
