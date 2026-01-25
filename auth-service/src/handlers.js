const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("./db");

const JWT_SECRET = process.env.JWT_SECRET || "delivereats_secret_key_sa_2026";

const register = async (call, callback) => {
  try {
    const { email, password, role, name } = call.request;

    // Verificar si el email ya existe
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);
    if (existing.rows.length > 0) {
      return callback(null, {
        success: false,
        message: "El email ya está registrado",
        user_id: 0,
      });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar usuario
    const result = await pool.query(
      "INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id",
      [email, hashedPassword, name, role],
    );

    callback(null, {
      success: true,
      message: "Usuario registrado exitosamente",
      user_id: result.rows[0].id,
    });
  } catch (error) {
    console.error("[Auth-Service] Register error:", error);
    callback(null, {
      success: false,
      message: "Error interno del servidor",
      user_id: 0,
    });
  }
};

const login = async (call, callback) => {
  try {
    const { email, password } = call.request;

    // Buscar usuario
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (result.rows.length === 0) {
      return callback(null, {
        success: false,
        token: "",
        message: "Credenciales inválidas",
        user: null,
      });
    }

    const user = result.rows[0];

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return callback(null, {
        success: false,
        token: "",
        message: "Credenciales inválidas",
        user: null,
      });
    }

    // Generar JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    callback(null, {
      success: true,
      token,
      message: "Login exitoso",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("[Auth-Service] Login error:", error);
    callback(null, {
      success: false,
      token: "",
      message: "Error interno del servidor",
      user: null,
    });
  }
};

const validateToken = async (call, callback) => {
  try {
    const { token } = call.request;
    const decoded = jwt.verify(token, JWT_SECRET);

    callback(null, {
      valid: true,
      user_id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
    });
  } catch (error) {
    callback(null, { valid: false, user_id: 0, email: "", role: "", name: "" });
  }
};

module.exports = { register, login, validateToken };
