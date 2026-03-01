require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const authRoutes = require("./routes/auth");
const restaurantRoutes = require("./routes/restaurants");
const orderRoutes = require("./routes/orders");
const deliveryRoutes = require("./routes/delivery");
const paymentRoutes = require("./routes/payments");
const fxRoutes = require("./routes/fx");

const app = express();

app.use(cors());
app.use(express.json());

// Servir archivos estáticos de uploads (evidencia de entrega)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", service: "API Gateway - Delivereats" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/fx", fxRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[API-Gateway] REST server running on port ${PORT}`);
});
