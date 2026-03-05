const express = require("express");
const {
  paymentClient,
  fxClient,
  orderClient,
  grpcCall,
} = require("../grpcClients");
const { authenticateToken, authorizeRoles } = require("../middleware");

const router = express.Router();

// POST /api/payments - Procesar pago (CLIENTE)
router.post(
  "/",
  authenticateToken,
  authorizeRoles("CLIENTE"),
  async (req, res) => {
    try {
      const {
        order_id,
        payment_type,
        card_number,
        card_holder,
        card_expiry,
        card_cvv,
        amount,
        currency,
      } = req.body;

      if (!order_id || !payment_type || !amount) {
        return res.status(400).json({
          success: false,
          message: "order_id, payment_type y amount son requeridos",
        });
      }

      // Si la moneda no es GTQ, consultar tipo de cambio
      let converted_amount = amount;
      let converted_currency = "GTQ";
      let exchange_rate = 1.0;

      if (currency && currency !== "GTQ") {
        try {
          const fxResponse = await grpcCall(fxClient, "GetExchangeRate", {
            from_currency: currency,
            to_currency: "GTQ",
            amount: amount,
          });
          if (fxResponse.rate) {
            converted_amount = amount * fxResponse.rate;
            converted_currency = "GTQ";
            exchange_rate = fxResponse.rate;
          }
        } catch (fxError) {
          console.error("[API-Gateway] FX conversion error:", fxError);
          return res.status(500).json({
            success: false,
            message: "Error al convertir moneda. Intente con GTQ.",
          });
        }
      }

      // Mapear tipo de pago al enum del proto
      let paymentTypeEnum;
      switch (payment_type) {
        case "TARJETA_CREDITO":
          paymentTypeEnum = 0;
          break;
        case "TARJETA_DEBITO":
          paymentTypeEnum = 1;
          break;
        case "CARTERA_DIGITAL":
          paymentTypeEnum = 2;
          break;
        default:
          return res.status(400).json({
            success: false,
            message: "Tipo de pago inválido",
          });
      }

      const response = await grpcCall(paymentClient, "ProcessPayment", {
        order_id: parseInt(order_id),
        customer_id: req.user.id,
        amount: parseFloat(amount),
        currency: currency || "GTQ",
        payment_type: paymentTypeEnum,
        card_number: card_number || "",
        card_holder_name: card_holder || "",
        card_expiry: card_expiry || "",
        card_cvv: card_cvv || "",
        converted_amount: parseFloat(converted_amount),
        converted_currency,
        exchange_rate: parseFloat(exchange_rate),
      });

      // Si el pago fue exitoso, actualizar estado de la orden
      if (response.success) {
        grpcCall(orderClient, "UpdateOrderStatus", {
          id: parseInt(order_id),
          status: "PAGADA",
          updated_by: req.user.id,
          updated_by_role: "CLIENTE",
          updated_by_name: req.user.name,
        }).catch((err) =>
          console.error("[API-Gateway] Order update after payment error:", err),
        );
      }

      res.json(response);
    } catch (error) {
      console.error("[API-Gateway] Process payment error:", error);
      res
        .status(500)
        .json({ success: false, message: "Error al procesar pago" });
    }
  },
);

// GET /api/payments/all - Listar todos los pagos (ADMINISTRADOR)
router.get(
  "/all",
  authenticateToken,
  authorizeRoles("ADMINISTRADOR"),
  async (req, res) => {
    try {
      const response = await grpcCall(paymentClient, "ListPayments", {});
      res.json(response);
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Error al listar pagos" });
    }
  },
);

// POST /api/payments/refund - Aprobar devolución (ADMINISTRADOR)
router.post(
  "/refund",
  authenticateToken,
  authorizeRoles("ADMINISTRADOR"),
  async (req, res) => {
    try {
      const { payment_id, reason } = req.body;
      if (!payment_id) {
        return res
          .status(400)
          .json({ success: false, message: "payment_id es requerido" });
      }

      const response = await grpcCall(paymentClient, "ApproveRefund", {
        order_id: parseInt(payment_id),
        admin_id: req.user.id,
        reason: reason || "Devolución aprobada por administrador",
      });
      res.json(response);
    } catch (error) {
      console.error("[API-Gateway] Refund error:", error);
      res
        .status(500)
        .json({ success: false, message: "Error al procesar devolución" });
    }
  },
);

// GET /api/payments/:orderId - Obtener estado del pago (CLIENTE, ADMINISTRADOR)
router.get("/:orderId", authenticateToken, async (req, res) => {
  try {
    const response = await grpcCall(paymentClient, "GetPaymentStatus", {
      order_id: parseInt(req.params.orderId),
    });
    res.json(response);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error al consultar pago" });
  }
});

module.exports = router;
