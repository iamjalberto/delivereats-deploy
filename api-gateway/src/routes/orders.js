const express = require("express");
const { orderClient, notificationClient, grpcCall } = require("./grpcClients");
const { authenticateToken, authorizeRoles } = require("./middleware");

const router = express.Router();

// POST /api/orders - Crear orden (CLIENTE)
router.post(
  "/",
  authenticateToken,
  authorizeRoles("CLIENTE"),
  async (req, res) => {
    try {
      const { restaurant_id, restaurant_name, items, delivery_address } =
        req.body;
      const response = await grpcCall(orderClient, "CreateOrder", {
        client_id: req.user.id,
        client_name: req.user.name,
        client_email: req.user.email,
        restaurant_id,
        restaurant_name,
        items,
        delivery_address,
      });

      // Enviar notificación de orden creada
      if (response.success && response.order) {
        const products = response.order.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price,
        }));
        grpcCall(notificationClient, "SendOrderCreated", {
          client_name: req.user.name,
          client_email: req.user.email,
          order_id: response.order.id,
          products,
          total: response.order.total,
          created_at: response.order.created_at,
          status: "CREADA",
        }).catch((err) =>
          console.error("[API-Gateway] Notification error:", err),
        );
      }

      res.status(201).json(response);
    } catch (error) {
      console.error("[API-Gateway] Create order error:", error);
      res.status(500).json({ success: false, message: "Error al crear orden" });
    }
  },
);

// GET /api/orders/my - Mis órdenes (CLIENTE)
router.get(
  "/my",
  authenticateToken,
  authorizeRoles("CLIENTE"),
  async (req, res) => {
    try {
      const response = await grpcCall(orderClient, "ListOrdersByClient", {
        client_id: req.user.id,
      });
      res.json(response);
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Error al obtener órdenes" });
    }
  },
);

// GET /api/orders/restaurant/:id - Órdenes por restaurante (RESTAURANTE)
router.get(
  "/restaurant/:id",
  authenticateToken,
  authorizeRoles("RESTAURANTE"),
  async (req, res) => {
    try {
      const response = await grpcCall(orderClient, "ListOrdersByRestaurant", {
        restaurant_id: parseInt(req.params.id),
      });
      res.json(response);
    } catch (error) {
      res
        .status(500)
        .json({
          success: false,
          message: "Error al obtener órdenes del restaurante",
        });
    }
  },
);

// GET /api/orders/ready - Órdenes listas para repartidores (REPARTIDOR)
router.get(
  "/ready",
  authenticateToken,
  authorizeRoles("REPARTIDOR"),
  async (req, res) => {
    try {
      const response = await grpcCall(orderClient, "ListReadyOrders", {});
      res.json(response);
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Error al obtener órdenes listas" });
    }
  },
);

// GET /api/orders/:id
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const response = await grpcCall(orderClient, "GetOrder", {
      id: parseInt(req.params.id),
    });
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener orden" });
  }
});

// PUT /api/orders/:id/status - Actualizar estado (RESTAURANTE)
router.put(
  "/:id/status",
  authenticateToken,
  authorizeRoles("RESTAURANTE"),
  async (req, res) => {
    try {
      const { status } = req.body;
      const response = await grpcCall(orderClient, "UpdateOrderStatus", {
        id: parseInt(req.params.id),
        status,
        updated_by: req.user.id,
        updated_by_role: req.user.role,
        updated_by_name: req.user.name,
      });
      res.json(response);
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Error al actualizar estado" });
    }
  },
);

// PUT /api/orders/:id/cancel - Cancelar orden (CLIENTE, RESTAURANTE, REPARTIDOR)
router.put("/:id/cancel", authenticateToken, async (req, res) => {
  try {
    const { reason } = req.body;
    const response = await grpcCall(orderClient, "CancelOrder", {
      id: parseInt(req.params.id),
      cancelled_by_role: req.user.role,
      cancelled_by_name: req.user.name,
      reason: reason || "",
    });

    // Enviar notificaciones de cancelación
    if (response.success && response.order) {
      const products = response.order.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
      }));

      if (req.user.role === "CLIENTE") {
        grpcCall(notificationClient, "SendOrderCancelledByClient", {
          client_name: response.order.client_name,
          client_email: response.order.client_email,
          order_id: response.order.id,
          products,
          cancelled_at: new Date().toISOString(),
          status: "CANCELADA",
        }).catch((err) =>
          console.error("[API-Gateway] Notification error:", err),
        );
      } else if (req.user.role === "RESTAURANTE") {
        grpcCall(notificationClient, "SendOrderCancelledByRestaurant", {
          client_email: response.order.client_email,
          cancelled_by_name: req.user.name,
          cancelled_by_role: "RESTAURANTE",
          reason: reason || "Sin razón especificada",
          order_id: response.order.id,
          products,
          status: "CANCELADA",
        }).catch((err) =>
          console.error("[API-Gateway] Notification error:", err),
        );
      } else if (req.user.role === "REPARTIDOR") {
        grpcCall(notificationClient, "SendOrderCancelledByDelivery", {
          client_email: response.order.client_email,
          cancelled_by_name: req.user.name,
          cancelled_by_role: "REPARTIDOR",
          reason: reason || "Sin razón especificada",
          order_id: response.order.id,
          products,
          status: "CANCELADA",
        }).catch((err) =>
          console.error("[API-Gateway] Notification error:", err),
        );
      }
    }

    res.json(response);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error al cancelar orden" });
  }
});

// PUT /api/orders/:id/reject - Rechazar orden (RESTAURANTE)
router.put(
  "/:id/reject",
  authenticateToken,
  authorizeRoles("RESTAURANTE"),
  async (req, res) => {
    try {
      const { reason } = req.body;
      const response = await grpcCall(orderClient, "CancelOrder", {
        id: parseInt(req.params.id),
        cancelled_by_role: "RESTAURANTE",
        cancelled_by_name: req.user.name,
        reason: reason || "Orden rechazada por el restaurante",
      });

      // Notificación de rechazo
      if (response.success && response.order) {
        const products = response.order.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price,
        }));
        grpcCall(notificationClient, "SendOrderRejected", {
          client_email: response.order.client_email,
          restaurant_name: req.user.name,
          order_id: response.order.id,
          products,
          status: "RECHAZADA",
        }).catch((err) =>
          console.error("[API-Gateway] Notification error:", err),
        );
      }

      res.json(response);
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Error al rechazar orden" });
    }
  },
);

module.exports = router;
