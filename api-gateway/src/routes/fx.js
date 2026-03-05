const express = require("express");
const { fxClient, grpcCall } = require("../grpcClients");
const { authenticateToken } = require("../middleware");

const router = express.Router();

// GET /api/fx/rate?from=USD&to=GTQ&amount=100 - Obtener tipo de cambio
router.get("/rate", authenticateToken, async (req, res) => {
  try {
    const { from, to, amount } = req.query;
    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: "Parámetros from y to son requeridos",
      });
    }
    const response = await grpcCall(fxClient, "GetExchangeRate", {
      from_currency: from.toUpperCase(),
      to_currency: to.toUpperCase(),
    });
    const parsedAmount = parseFloat(amount) || 1.0;
    const rate = response.rate || 0;
    res.json({
      success: true,
      from_currency: response.from_currency,
      to_currency: response.to_currency,
      rate: rate,
      converted_amount: parsedAmount * rate,
      timestamp: response.timestamp,
      from_cache: response.from_cache,
      is_fallback: response.is_fallback,
    });
  } catch (error) {
    console.error("[API-Gateway] FX rate error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error al consultar tipo de cambio" });
  }
});

// GET /api/fx/rates?base=GTQ&currencies=USD,EUR,MXN - Múltiples tasas
router.get("/rates", authenticateToken, async (req, res) => {
  try {
    const { base, currencies } = req.query;
    if (!base || !currencies) {
      return res.status(400).json({
        success: false,
        message: "Parámetros base y currencies son requeridos",
      });
    }
    const currencyList = currencies
      .split(",")
      .map((c) => c.trim().toUpperCase());
    const response = await grpcCall(fxClient, "GetMultipleRates", {
      base_currency: base.toUpperCase(),
      target_currencies: currencyList,
    });
    res.json({
      success: true,
      ...response,
    });
  } catch (error) {
    console.error("[API-Gateway] FX multiple rates error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error al consultar tipos de cambio" });
  }
});

module.exports = router;
