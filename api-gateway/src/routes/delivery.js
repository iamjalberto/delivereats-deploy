const express = require("express");
const {
  deliveryClient,
  notificationClient,
  orderClient,
  grpcCall,
} = require("../grpcClients");
const { authenticateToken, authorizeRoles } = require("../middleware");

const router = express.Router();

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

module.exports = router;
