import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { validateAddress } from "../utils/validators";
import FieldError from "../components/FieldError";

const CreateOrder = () => {
  const { restaurantId } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [restaurantId]);

  const fetchData = async () => {
    try {
      const [resR, resM] = await Promise.all([
        api.get(`/restaurants/${restaurantId}`),
        api.get(`/restaurants/${restaurantId}/menu`),
      ]);
      setRestaurant(resR.data.restaurant);
      setMenuItems((resM.data.items || []).filter((i) => i.available));
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        "Error al cargar datos del restaurante. Verifica tu conexión.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item) => {
    const existing = cart.find((c) => c.menu_item_id === item.id);
    if (existing) {
      setCart(
        cart.map((c) =>
          c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c,
        ),
      );
    } else {
      setCart([
        ...cart,
        {
          menu_item_id: item.id,
          name: item.name,
          price: parseFloat(item.price),
          quantity: 1,
        },
      ]);
    }
  };

  const removeFromCart = (itemId) => {
    const existing = cart.find((c) => c.menu_item_id === itemId);
    if (existing && existing.quantity > 1) {
      setCart(
        cart.map((c) =>
          c.menu_item_id === itemId ? { ...c, quantity: c.quantity - 1 } : c,
        ),
      );
    } else {
      setCart(cart.filter((c) => c.menu_item_id !== itemId));
    }
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSubmit = async () => {
    const newErrors = {};
    if (cart.length === 0)
      newErrors.cart = "Agrega al menos un producto al carrito";
    const addrErr = validateAddress(deliveryAddress);
    if (addrErr) newErrors.address = addrErr;
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      if (newErrors.cart) toast.error(newErrors.cart);
      return;
    }

    try {
      const res = await api.post("/orders", {
        restaurant_id: parseInt(restaurantId),
        restaurant_name: restaurant?.name || "",
        items: cart,
        delivery_address: deliveryAddress,
      });

      if (res.data.success) {
        toast.success("¡Orden creada exitosamente!");
        navigate("/my-orders");
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        "Error al crear orden. Verifica tu conexión.";
      toast.error(msg);
    }
  };

  if (loading) return <div className="loading">Cargando...</div>;

  return (
    <div>
      <h2>🛒 Ordenar de {restaurant?.name}</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "2rem",
          marginTop: "1rem",
        }}
      >
        {/* MENÚ */}
        <div>
          <h3>Menú Disponible</h3>
          {menuItems.map((item) => (
            <div key={item.id} className="card">
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              <p>
                <strong>Q{parseFloat(item.price).toFixed(2)}</strong>
              </p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => addToCart(item)}
              >
                + Agregar
              </button>
            </div>
          ))}
        </div>

        {/* CARRITO */}
        <div>
          <div className="card" style={{ position: "sticky", top: "1rem" }}>
            <h3>🛒 Tu Carrito</h3>
            {cart.length === 0 ? (
              <p style={{ color: "#999" }}>Carrito vacío</p>
            ) : (
              <>
                {cart.map((item) => (
                  <div key={item.menu_item_id} className="cart-item">
                    <div>
                      <strong>{item.name}</strong>
                      <br />Q{item.price.toFixed(2)} x {item.quantity} = Q
                      {(item.price * item.quantity).toFixed(2)}
                    </div>
                    <div className="quantity-controls">
                      <button onClick={() => removeFromCart(item.menu_item_id)}>
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() =>
                          addToCart({
                            id: item.menu_item_id,
                            name: item.name,
                            price: item.price,
                          })
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
                <hr style={{ margin: "1rem 0" }} />
                <p>
                  <strong>Total: Q{total.toFixed(2)}</strong>
                </p>
                <div className="form-group" style={{ marginTop: "1rem" }}>
                  <label>Dirección de Entrega</label>
                  <textarea
                    value={deliveryAddress}
                    onChange={(e) => {
                      setDeliveryAddress(e.target.value);
                      setErrors((prev) => ({ ...prev, address: null }));
                    }}
                    placeholder="Ingresa tu dirección completa (mín. 10 caracteres)"
                    className={errors.address ? "input-error" : ""}
                  />
                  <FieldError error={errors.address} />
                </div>
                <button
                  className="btn btn-success"
                  onClick={handleSubmit}
                  style={{ width: "100%" }}
                >
                  🍔 Realizar Pedido
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateOrder;
