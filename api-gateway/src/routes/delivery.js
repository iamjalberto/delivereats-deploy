const express = require("express");
const multer = require("multer");







































































































































































module.exports = router;);  }    }      res.status(500).json({ success: false, message: "Error al procesar devolución" });      console.error("[API-Gateway] Refund error:", error);    } catch (error) {      res.json(response);      });        reason: reason || "Devolución aprobada por administrador",        admin_id: req.user.id,        payment_id: parseInt(payment_id),      const response = await grpcCall(paymentClient, "ApproveRefund", {      }        return res.status(400).json({ success: false, message: "payment_id es requerido" });      if (!payment_id) {      const { payment_id, reason } = req.body;    try {  async (req, res) => {  authorizeRoles("ADMINISTRADOR"),  authenticateToken,  "/refund",router.post(// POST /api/payments/refund - Aprobar devolución (ADMINISTRADOR));  }    }      res.status(500).json({ success: false, message: "Error al listar pagos" });    } catch (error) {      res.json(response);      const response = await grpcCall(paymentClient, "ListPayments", {});    try {  async (req, res) => {  authorizeRoles("ADMINISTRADOR"),  authenticateToken,  "/",router.get(// GET /api/payments - Listar todos los pagos (ADMINISTRADOR));  }    }      res.status(500).json({ success: false, message: "Error al consultar pago" });    } catch (error) {      res.json(response);      });        order_id: parseInt(req.params.orderId),      const response = await grpcCall(paymentClient, "GetPaymentStatus", {    try {  async (req, res) => {  authenticateToken,  "/:orderId",router.get(// GET /api/payments/:orderId - Obtener estado del pago (CLIENTE, ADMINISTRADOR));  }    }      res.status(500).json({ success: false, message: "Error al procesar pago" });      console.error("[API-Gateway] Process payment error:", error);    } catch (error) {      res.json(response);      }        );          console.error("[API-Gateway] Order update after payment error:", err)        }).catch((err) =>          updated_by_name: req.user.name,          updated_by_role: "CLIENTE",          updated_by: req.user.id,          status: "PAGADA",          id: parseInt(order_id),        grpcCall(orderClient, "UpdateOrderStatus", {      if (response.success && response.payment && response.payment.status === "COMPLETADO") {      // Si el pago fue exitoso, actualizar estado de la orden      });        exchange_rate: parseFloat(exchange_rate),        converted_currency,        converted_amount: parseFloat(converted_amount),        currency: currency || "GTQ",        amount: parseFloat(amount),        card_cvv: card_cvv || "",        card_expiry: card_expiry || "",        card_holder: card_holder || "",        card_number: card_number || "",        payment_type: paymentTypeEnum,        client_id: req.user.id,        order_id: parseInt(order_id),      const response = await grpcCall(paymentClient, "ProcessPayment", {      }          });            message: "Tipo de pago inválido",            success: false,          return res.status(400).json({        default:          break;          paymentTypeEnum = 2;        case "CARTERA_DIGITAL":          break;          paymentTypeEnum = 1;        case "TARJETA_DEBITO":          break;          paymentTypeEnum = 0;        case "TARJETA_CREDITO":      switch (payment_type) {      let paymentTypeEnum;      // Mapear tipo de pago al enum del proto      }        }          });            message: "Error al convertir moneda. Intente con GTQ.",            success: false,          return res.status(500).json({          console.error("[API-Gateway] FX conversion error:", fxError);        } catch (fxError) {          }            exchange_rate = fxResponse.rate;            converted_currency = "GTQ";            converted_amount = fxResponse.converted_amount;          if (fxResponse.success) {          });            amount: amount,            to_currency: "GTQ",            from_currency: currency,          const fxResponse = await grpcCall(fxClient, "GetExchangeRate", {        try {      if (currency && currency !== "GTQ") {      // Si la moneda no es GTQ, consultar tipo de cambio      let exchange_rate = 1.0;      let converted_currency = "GTQ";      let converted_amount = amount;      }        });          message: "order_id, payment_type y amount son requeridos",          success: false,        return res.status(400).json({      if (!order_id || !payment_type || !amount) {      } = req.body;        currency,        amount,        card_cvv,        card_expiry,        card_holder,        card_number,        payment_type,        order_id,      const {    try {  async (req, res) => {  authorizeRoles("CLIENTE"),  authenticateToken,  "/",router.post(// POST /api/payments - Procesar pago (CLIENTE)const router = express.Router();const { authenticateToken, authorizeRoles } = require("../middleware");const path = require("path");
const fs = require("fs");
const {
  deliveryClient,
  notificationClient,
  orderClient,
  grpcCall,
} = require("../grpcClients");
const { authenticateToken, authorizeRoles } = require("../middleware");

const router = express.Router();

// Configuración de multer para subir fotos de evidencia
const uploadsDir = path.join(__dirname, "../../uploads/evidence");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype.split("/")[1]);
    if (ext && mime) return cb(null, true);
    cb(new Error("Solo se permiten imágenes (jpeg, png, gif, webp)"));
  },
});

// POST /api/delivery/accept - Aceptar pedido (REPARTIDOR)
router.post(
  "/accept",
  authenticateToken,
  authorizeRoles("REPARTIDOR"),
  async (req, res) => {
    try {
      const { order_id } = req.body;
      const response = await grpcCall(deliveryClient, "AcceptOrder", {
        order_id,
        delivery_person_id: req.user.id,
        delivery_person_name: req.user.name,
      });

      // Enviar notificación de que la orden va en camino
      if (response.success) {
        // Obtener datos de la orden para la notificación
        const orderResponse = await grpcCall(orderClient, "GetOrder", {
          id: order_id,
        });
        if (orderResponse.success && orderResponse.order) {
          const products = orderResponse.order.items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            price: i.price,
          }));
          grpcCall(notificationClient, "SendOrderInRoute", {
            client_email: orderResponse.order.client_email,
            order_id: orderResponse.order.id,
            delivery_person_name: req.user.name,
            products,
            status: "EN_CAMINO",
          }).catch((err) =>
            console.error("[API-Gateway] Notification error:", err),
          );
        }
      }

      res.json(response);
    } catch (error) {
      console.error("[API-Gateway] Accept delivery error:", error);
      res
        .status(500)
        .json({ success: false, message: "Error al aceptar pedido" });
    }
  },
);

// PUT /api/delivery/status - Actualizar estado de entrega (REPARTIDOR)
router.put(
  "/status",
  authenticateToken,
  authorizeRoles("REPARTIDOR"),
  async (req, res) => {
    try {
      const { order_id, status, reason } = req.body;
      const response = await grpcCall(deliveryClient, "UpdateDeliveryStatus", {
        order_id,
        status,
        delivery_person_id: req.user.id,
        delivery_person_name: req.user.name,
        reason: reason || "",
      });

      // Si se cancela, enviar notificación
      if (response.success && status === "CANCELADA") {
        const orderResponse = await grpcCall(orderClient, "GetOrder", {
          id: order_id,
        });
        if (orderResponse.success && orderResponse.order) {
          const products = orderResponse.order.items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            price: i.price,
          }));
          grpcCall(notificationClient, "SendOrderCancelledByDelivery", {
            client_email: orderResponse.order.client_email,
            cancelled_by_name: req.user.name,
            cancelled_by_role: "REPARTIDOR",
            reason: reason || "Cancelado por repartidor",
            order_id: orderResponse.order.id,
            products,
            status: "CANCELADA",
          }).catch((err) =>
            console.error("[API-Gateway] Notification error:", err),
          );
        }
      }

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al actualizar estado de entrega",
      });
    }
  },
);

// GET /api/delivery/available - Órdenes disponibles (REPARTIDOR)
router.get(
  "/available",
  authenticateToken,
  authorizeRoles("REPARTIDOR"),
  async (req, res) => {
    try {
      const response = await grpcCall(orderClient, "ListReadyOrders", {});
      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al obtener órdenes disponibles",
      });
    }
  },
);

// GET /api/delivery/my - Mis entregas (REPARTIDOR)
router.get(
  "/my",
  authenticateToken,
  authorizeRoles("REPARTIDOR"),
  async (req, res) => {
    try {
      const response = await grpcCall(deliveryClient, "ListMyDeliveries", {
        delivery_person_id: req.user.id,
      });
      res.json(response);
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Error al obtener mis entregas" });
    }
  },
);

// POST /api/delivery/evidence - Subir evidencia de entrega (REPARTIDOR)
router.post(
  "/evidence",
  authenticateToken,
  authorizeRoles("REPARTIDOR"),
  upload.single("photo"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "Se requiere una foto" });
      }
      const { order_id, delivery_id, notes } = req.body;
      if (!order_id || !delivery_id) {
        return res.status(400).json({ success: false, message: "order_id y delivery_id son requeridos" });
      }

      const photoPath = `/uploads/evidence/${req.file.filename}`;
      const response = await grpcCall(deliveryClient, "UploadEvidence", {
        order_id: parseInt(order_id),
        delivery_id: parseInt(delivery_id),
        driver_id: req.user.id,
        photo_path: photoPath,
        photo_original_name: req.file.originalname,
        photo_mime_type: req.file.mimetype,
        photo_size_bytes: req.file.size,
        notes: notes || "",
      });

      res.json(response);
    } catch (error) {
      console.error("[API-Gateway] Upload evidence error:", error);
      res.status(500).json({ success: false, message: "Error al subir evidencia" });
    }
  },
);

// GET /api/delivery/evidence/:orderId - Obtener evidencia (CLIENTE, REPARTIDOR, ADMINISTRADOR)
router.get(
  "/evidence/:orderId",
  authenticateToken,
  async (req, res) => {
    try {
      const response = await grpcCall(deliveryClient, "GetEvidence", {
        order_id: parseInt(req.params.orderId),
      });
      res.json(response);
    } catch (error) {
      res.status(500).json({ success: false, message: "Error al obtener evidencia" });
    }
  },
);

// GET /api/delivery/all - Listar todas las entregas (ADMINISTRADOR)
router.get(
  "/all",
  authenticateToken,
  authorizeRoles("ADMINISTRADOR"),
  async (req, res) => {
    try {
      const response = await grpcCall(deliveryClient, "ListDeliveredOrders", {});
      res.json(response);
    } catch (error) {
      res.status(500).json({ success: false, message: "Error al listar entregas" });
    }
  },
);

module.exports = router;
