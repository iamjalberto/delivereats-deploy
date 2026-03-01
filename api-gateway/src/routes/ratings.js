const express = require("express");
const { ratingClient, grpcCall } = require("../grpcClients");
const { authenticateToken, authorizeRoles } = require("../middleware");

const router = express.Router();

// POST /api/ratings - Crear calificación (CLIENTE)
router.post(
  "/",
  authenticateToken,
  authorizeRoles("CLIENTE"),
  async (req, res) => {
    try {
      const {
        order_id,
        entity_type,
        entity_id,
        entity_name,
        stars,
        comment,
        recommended,
      } = req.body;

      if (!order_id || !entity_type || !entity_id) {
        return res.status(400).json({
          success: false,
          message: "order_id, entity_type y entity_id son requeridos",
        });
      }

      const response = await grpcCall(ratingClient, "CreateRating", {
        order_id: parseInt(order_id),
        user_id: req.user.id,
        user_name: req.user.name,
        entity_type,
        entity_id: parseInt(entity_id),
        entity_name: entity_name || "",
        stars: parseInt(stars) || 0,
        comment: comment || "",
        recommended: recommended || false,
      });

      res.status(201).json(response);
    } catch (error) {
      console.error("[API-Gateway] Create rating error:", error);
      res
        .status(500)
        .json({ success: false, message: "Error al crear calificación" });
    }
  },
);

// GET /api/ratings/restaurant/:id - Calificaciones de restaurante
router.get("/restaurant/:id", authenticateToken, async (req, res) => {
  try {
    const response = await grpcCall(ratingClient, "GetRatingsByRestaurant", {
      entity_id: parseInt(req.params.id),
    });
    res.json(response);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error al obtener calificaciones" });
  }
});

// GET /api/ratings/delivery/:id - Calificaciones de repartidor
router.get("/delivery/:id", authenticateToken, async (req, res) => {
  try {
    const response = await grpcCall(ratingClient, "GetRatingsByDelivery", {
      entity_id: parseInt(req.params.id),
    });
    res.json(response);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error al obtener calificaciones" });
  }
});

// GET /api/ratings/product/:id - Calificaciones de producto
router.get("/product/:id", authenticateToken, async (req, res) => {
  try {
    const response = await grpcCall(ratingClient, "GetRatingsByProduct", {
      entity_id: parseInt(req.params.id),
    });
    res.json(response);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error al obtener calificaciones" });
  }
});

// GET /api/ratings/average/:id - Promedio de calificación
router.get("/average/:id", authenticateToken, async (req, res) => {
  try {
    const response = await grpcCall(ratingClient, "GetAverageRating", {
      entity_id: parseInt(req.params.id),
    });
    res.json(response);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error al obtener promedio" });
  }
});

module.exports = router;
