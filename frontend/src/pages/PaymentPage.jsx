import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";

const PaymentPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order_id");

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentType, setPaymentType] = useState("TARJETA_CREDITO");
  const [currency, setCurrency] = useState("GTQ");
  const [fxRate, setFxRate] = useState(null);
  const [fxLoading, setFxLoading] = useState(false);

  // Card form
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  // Coupon
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const currencies = ["GTQ", "USD", "EUR", "MXN", "GBP", "JPY"];

  useEffect(() => {
    if (!orderId) {
      toast.error("No se especificó una orden");
      navigate("/my-orders");
      return;
    }
    fetchOrder();
  }, [orderId]);

  useEffect(() => {
    if (currency && currency !== "GTQ" && order) {
      fetchExchangeRate();
    } else {
      setFxRate(null);
    }
  }, [currency, order, couponApplied]);

  const fetchOrder = async () => {
    try {
      const res = await api.get(`/orders/${orderId}`);
      if (res.data.success) {
        setOrder(res.data.order);
      } else {
        toast.error("Orden no encontrada");
        navigate("/my-orders");
      }
    } catch (error) {
      toast.error("Error al cargar la orden");
      navigate("/my-orders");
    } finally {
      setLoading(false);
    }
  };

  const getEffectiveTotal = () => {
    if (!order) return 0;
    let total = parseFloat(order.total);
    if (couponApplied) {
      total = Math.max(0, total - couponApplied.discount_amount);
    }
    return total;
  };

  const fetchExchangeRate = async () => {
    setFxLoading(true);
    try {
      const effectiveTotal = getEffectiveTotal();
      const res = await api.get(
        `/fx/rate?from=GTQ&to=${currency}&amount=${effectiveTotal}`,
      );
      if (res.data.success) {
        setFxRate({
          rate: res.data.rate,
          convertedAmount: res.data.converted_amount,
          fromCurrency: res.data.from_currency,
          toCurrency: res.data.to_currency,
        });
      }
    } catch (error) {
      toast.error("Error al obtener tipo de cambio");
      setCurrency("GTQ");
    } finally {
      setFxLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Ingresa un código de cupón");
      return;
    }
    setCouponLoading(true);
    try {
      const res = await api.post("/payments/coupons/validate", {
        code: couponCode.trim().toUpperCase(),
        order_amount: parseFloat(order.total),
      });
      if (res.data.valid) {
        setCouponApplied({
          code: couponCode.trim().toUpperCase(),
          discount_type: res.data.discount_type,
          discount_value: res.data.discount_value,
          discount_amount: res.data.discount_amount,
        });
        toast.success(
          `¡Cupón aplicado! Descuento: Q${parseFloat(res.data.discount_amount).toFixed(2)}`,
        );
      } else {
        toast.error(res.data.message || "Cupón inválido o expirado");
        setCouponApplied(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error al validar cupón");
      setCouponApplied(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponApplied(null);
    setCouponCode("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (paymentType !== "CARTERA_DIGITAL") {
      if (!cardNumber || !cardHolder || !cardExpiry || !cardCvv) {
        toast.error("Completa todos los campos de la tarjeta");
        return;
      }
    }

    setProcessing(true);
    try {
      const effectiveTotal = getEffectiveTotal();
      const payload = {
        order_id: parseInt(orderId),
        payment_type: paymentType,
        amount: effectiveTotal,
        currency: currency,
      };

      if (couponApplied) {
        payload.coupon_code = couponApplied.code;
      }

      if (paymentType !== "CARTERA_DIGITAL") {
        payload.card_number = cardNumber.replace(/\s/g, "");
        payload.card_holder = cardHolder;
        payload.card_expiry = cardExpiry;
        payload.card_cvv = cardCvv;
      }

      const res = await api.post("/payments", payload);

      if (res.data.success) {
        toast.success("¡Pago procesado exitosamente!");
        navigate("/my-orders");
      } else if (res.data.message) {
        toast.error(res.data.message);
      } else {
        toast.error(res.data.message || "Error al procesar pago");
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Error al procesar el pago";
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="loading">Cargando orden...</div>;
  if (!order) return null;

  const effectiveTotal = getEffectiveTotal();
  const displayAmount = fxRate ? fxRate.convertedAmount : effectiveTotal;
  const displayCurrency = currency;

  return (
    <div>
      <h2>💳 Procesar Pago</h2>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3>
          Orden #{order.id} - {order.restaurant_name}
        </h3>
        <p>
          <strong>Productos:</strong>
        </p>
        <ul>
          {(order.items || []).map((item, idx) => (
            <li key={idx}>
              {item.name} x{item.quantity} - Q
              {(parseFloat(item.price) * item.quantity).toFixed(2)}
            </li>
          ))}
        </ul>
        <p
          style={{
            marginTop: "0.5rem",
            fontSize: "1.2rem",
            fontWeight: "bold",
          }}
        >
          Subtotal: Q{parseFloat(order.total).toFixed(2)}
        </p>
        {couponApplied && (
          <p style={{ color: "#28a745", fontWeight: "bold" }}>
            🏷️ Descuento ({couponApplied.code}): -Q
            {parseFloat(couponApplied.discount_amount).toFixed(2)}
          </p>
        )}
        {couponApplied && (
          <p
            style={{ fontSize: "1.3rem", fontWeight: "bold", color: "#ff6b35" }}
          >
            Total: Q{effectiveTotal.toFixed(2)}
          </p>
        )}
      </div>

      <div className="form-container" style={{ maxWidth: "600px" }}>
        <h2>Datos de Pago</h2>
        <form onSubmit={handleSubmit}>
          {/* Cupón */}
          <div className="form-group">
            <label>🏷️ Código de Cupón (opcional)</label>
            {couponApplied ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.7rem",
                  background: "#e8f5e9",
                  borderRadius: "8px",
                  border: "2px solid #28a745",
                }}
              >
                <span style={{ flex: 1 }}>
                  ✅ <strong>{couponApplied.code}</strong> — Descuento: Q
                  {parseFloat(couponApplied.discount_amount).toFixed(2)}
                  {couponApplied.discount_type === "PORCENTAJE"
                    ? ` (${couponApplied.discount_value}%)`
                    : ""}
                </span>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={handleRemoveCoupon}
                >
                  ✕ Quitar
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  placeholder="Ej: DESCUENTO20"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-info btn-sm"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {couponLoading ? "..." : "Aplicar"}
                </button>
              </div>
            )}
          </div>

          {/* Tipo de Pago */}
          <div className="form-group">
            <label>Tipo de Pago</label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
            >
              <option value="TARJETA_CREDITO">💳 Tarjeta de Crédito</option>
              <option value="TARJETA_DEBITO">💳 Tarjeta de Débito</option>
              <option value="CARTERA_DIGITAL">📱 Cartera Digital</option>
            </select>
          </div>

          {/* Moneda */}
          <div className="form-group">
            <label>Moneda</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de Cambio */}
          {fxRate && (
            <div
              className="card"
              style={{
                background: "#f0f9ff",
                marginBottom: "1rem",
                padding: "1rem",
              }}
            >
              <p>
                📊 <strong>Tipo de cambio:</strong> 1 GTQ ={" "}
                {fxRate.rate.toFixed(4)} {fxRate.toCurrency}
              </p>
              <p>
                💰 <strong>Monto a pagar:</strong> {displayAmount.toFixed(2)}{" "}
                {displayCurrency}
              </p>
              {fxLoading && <p style={{ color: "#999" }}>Actualizando...</p>}
            </div>
          )}

          {/* Datos de Tarjeta */}
          {paymentType !== "CARTERA_DIGITAL" && (
            <>
              <div className="form-group">
                <label>Número de Tarjeta</label>
                <input
                  type="text"
                  placeholder="4111 1111 1111 1111"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  maxLength={19}
                />
              </div>
              <div className="form-group">
                <label>Nombre del Titular</label>
                <input
                  type="text"
                  placeholder="JUAN PEREZ"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", gap: "1rem" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Vencimiento</label>
                  <input
                    type="text"
                    placeholder="MM/AA"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    maxLength={5}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>CVV</label>
                  <input
                    type="text"
                    placeholder="123"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    maxLength={4}
                  />
                </div>
              </div>
            </>
          )}

          {paymentType === "CARTERA_DIGITAL" && (
            <div
              className="card"
              style={{
                background: "#f0fff4",
                marginBottom: "1rem",
                padding: "1rem",
              }}
            >
              <p>
                📱 <strong>Cartera Digital</strong>
              </p>
              <p>
                El monto será debitado de tu cartera digital. Saldo máximo
                permitido: Q5,000.00
              </p>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={processing}
            style={{ marginTop: "1rem" }}
          >
            {processing
              ? "Procesando..."
              : `Pagar ${displayAmount.toFixed(2)} ${displayCurrency}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PaymentPage;
