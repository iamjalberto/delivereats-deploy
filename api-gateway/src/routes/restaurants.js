const express = require("express");
const { restaurantClient, grpcCall } = require("../grpcClients");
const { authenticateToken, authorizeRoles } = require("../middleware");

const router = express.Router();

// GET /api/restaurants - Listar restaurantes (CLIENTE, ADMIN)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const response = await grpcCall(restaurantClient, "ListRestaurants", {});
    res.json(response);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error al obtener restaurantes" });
  }
});

// GET /api/restaurants/search - Buscar restaurantes con filtros (MUST be before /:id)
router.get("/search", authenticateToken, async (req, res) => {
  try {
    const { query, food_type, filter, has_promotions } = req.query;
    const response = await grpcCall(restaurantClient, "SearchRestaurants", {
      query: query || "",
      food_type: food_type || "",
      filter: filter || "",
      has_promotions: has_promotions === "true",
    });
    res.json(response);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error al buscar restaurantes" });
  }
});

// GET /api/restaurants/promotions/all - Listar todas las promociones (MUST be before /:id)
router.get("/promotions/all", authenticateToken, async (req, res) => {
  try {
    const response = await grpcCall(restaurantClient, "ListPromotions", {
      restaurant_id: 0,
    });
    res.json(response);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error al obtener promociones" });
  }
});

// GET /api/restaurants/:id
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const response = await grpcCall(restaurantClient, "GetRestaurant", {
      id: parseInt(req.params.id),
    });
    res.json(response);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error al obtener restaurante" });
  }
});

// POST /api/restaurants - Crear restaurante (ADMINISTRADOR o RESTAURANTE)
router.post(
  "/",
  authenticateToken,
  authorizeRoles("ADMINISTRADOR", "RESTAURANTE"),
  async (req, res) => {
    try {
      const { name, address, phone, schedule, food_type, owner_id } = req.body;
      const response = await grpcCall(restaurantClient, "CreateRestaurant", {
        name,
        address,
        phone,
        schedule,
        food_type,
        owner_id:
          req.user.role === "ADMINISTRADOR" && owner_id
            ? parseInt(owner_id)
            : req.user.id,
      });
      res.status(201).json(response);
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Error al crear restaurante" });
    }
  },
);

// PUT /api/restaurants/:id - Actualizar restaurante (ADMINISTRADOR)
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("ADMINISTRADOR"),
  async (req, res) => {
    try {
      const { name, address, phone, schedule, food_type } = req.body;
      const response = await grpcCall(restaurantClient, "UpdateRestaurant", {
        id: parseInt(req.params.id),
        name,
        address,
        phone,
        schedule,
        food_type,
      });
      res.json(response);
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Error al actualizar restaurante" });
    }
  },
);

// DELETE /api/restaurants/:id (ADMINISTRADOR)
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("ADMINISTRADOR"),
  async (req, res) => {
    try {
      const response = await grpcCall(restaurantClient, "DeleteRestaurant", {
        id: parseInt(req.params.id),
      });
      res.json(response);
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Error al eliminar restaurante" });
    }
  },
);

// ========== MENU ITEMS ==========

// GET /api/restaurants/:id/menu - Listar menú de un restaurante
router.get("/:id/menu", authenticateToken, async (req, res) => {
  try {
    const response = await grpcCall(restaurantClient, "ListMenuItems", {
      restaurant_id: parseInt(req.params.id),
    });
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener menú" });
  }
});

// POST /api/restaurants/:id/menu - Crear item de menú (RESTAURANTE)
router.post(
  "/:id/menu",
  authenticateToken,
  authorizeRoles("RESTAURANTE"),
  async (req, res) => {
    try {
      const { name, description, price, available, category } = req.body;
      const response = await grpcCall(restaurantClient, "CreateMenuItem", {
        restaurant_id: parseInt(req.params.id),
        name,
        description,
        price: parseFloat(price),
        available,
        category,
      });
      res.status(201).json(response);
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Error al crear producto" });
    }
  },
);

// PUT /api/menu/:itemId - Actualizar item de menú (RESTAURANTE)
router.put(
  "/menu/:itemId",
  authenticateToken,
  authorizeRoles("RESTAURANTE"),
  async (req, res) => {
    try {
      const { name, description, price, available, category } = req.body;
      const response = await grpcCall(restaurantClient, "UpdateMenuItem", {
        id: parseInt(req.params.itemId),
        name,
        description,
        price: parseFloat(price),
        available,
        category,
      });
      res.json(response);
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Error al actualizar producto" });
    }
  },
);

// DELETE /api/menu/:itemId (RESTAURANTE)
router.delete(
  "/menu/:itemId",
  authenticateToken,
  authorizeRoles("RESTAURANTE"),
  async (req, res) => {
    try {
      const response = await grpcCall(restaurantClient, "DeleteMenuItem", {
        id: parseInt(req.params.itemId),
      });
      res.json(response);
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Error al eliminar producto" });
    }
  },
);

// ========== PROMOTIONS ==========

// GET /api/restaurants/:id/promotions - Listar promociones de un restaurante
router.get("/:id/promotions", authenticateToken, async (req, res) => {
  try {
    const response = await grpcCall(restaurantClient, "ListPromotions", {
      restaurant_id: parseInt(req.params.id),
    });
    res.json(response);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error al obtener promociones" });
  }
});

// POST /api/restaurants/:id/promotions - Crear promoción (RESTAURANTE, ADMINISTRADOR)
router.post(
  "/:id/promotions",
  authenticateToken,
  authorizeRoles("RESTAURANTE", "ADMINISTRADOR"),
  async (req, res) => {
    try {
      const {
        title,
        description,
        discount_type,
        discount_value,
        starts_at,
        ends_at,
      } = req.body;
      const response = await grpcCall(restaurantClient, "CreatePromotion", {
        restaurant_id: parseInt(req.params.id),
        title,
        description: description || "",
        discount_type: discount_type || "PORCENTAJE",
        discount_value: parseFloat(discount_value),
        starts_at: starts_at || "",
        ends_at: ends_at || "",
      });
      res.status(201).json(response);
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Error al crear promoción" });
    }
  },
);

// DELETE /api/restaurants/promotions/:promoId - Eliminar promoción (RESTAURANTE, ADMINISTRADOR)
router.delete(
  "/promotions/:promoId",
  authenticateToken,
  authorizeRoles("RESTAURANTE", "ADMINISTRADOR"),
  async (req, res) => {
    try {
      const response = await grpcCall(restaurantClient, "DeletePromotion", {
        id: parseInt(req.params.promoId),
      });
      res.json(response);
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Error al eliminar promoción" });
    }
  },
);

module.exports = router;
