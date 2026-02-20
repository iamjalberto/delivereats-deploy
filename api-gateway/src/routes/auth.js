const express = require("express");
const { authClient, grpcCall } = require("../grpcClients");
const { authenticateToken, authorizeRoles } = require("../middleware");

const router = express.Router();

// GET /api/auth/users - Listar usuarios (ADMINISTRADOR)
router.get(
  "/users",
  authenticateToken,
  authorizeRoles("ADMINISTRADOR"),
  async (req, res) => {
    try {
      const response = await grpcCall(authClient, "ListUsers", {});
      res.json(response);
    } catch (error) {
      console.error("[API-Gateway] ListUsers error:", error);
      res
        .status(500)
        .json({ success: false, message: "Error al obtener usuarios" });
    }
  },
);

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, role, name } = req.body;
    if (!email || !password || !role || !name) {
      return res
        .status(400)
        .json({ success: false, message: "Todos los campos son requeridos" });
    }
    const response = await grpcCall(authClient, "Register", {
      email,
      password,
      role,
      name,
    });
    const status = response.success ? 201 : 400;
    res.status(status).json(response);
  } catch (error) {
    console.error("[API-Gateway] Auth register error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error interno del servidor" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email y contraseña son requeridos" });
    }
    const response = await grpcCall(authClient, "Login", { email, password });
    const status = response.success ? 200 : 401;
    res.status(status).json(response);
  } catch (error) {
    console.error("[API-Gateway] Auth login error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error interno del servidor" });
  }
});

module.exports = router;
