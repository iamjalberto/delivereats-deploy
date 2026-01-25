const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "delivereats_secret_key_sa_2026";

// Middleware para validar JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Token de acceso requerido" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res
      .status(403)
      .json({ success: false, message: "Token inválido o expirado" });
  }
};

// Middleware para autorización por rol
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({
          success: false,
          message: "No tienes permisos para esta acción",
        });
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRoles };
