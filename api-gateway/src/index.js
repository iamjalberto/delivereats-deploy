require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const restaurantRoutes = require("./routes/restaurants");
const orderRoutes = require("./routes/orders");
const deliveryRoutes = require("./routes/delivery");

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", service: "API Gateway - Delivereats" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/delivery", deliveryRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[API-Gateway] REST server running on port ${PORT}`);
});
