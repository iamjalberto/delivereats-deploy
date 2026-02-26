/**
 * Restaurant Service - Consumidor de mensajes RabbitMQ
 *
 * PoC Práctica 4: Consume mensajes de la cola "new_orders"
 * publicados por el Order-Service y los registra/imprime en consola.
 */

require("dotenv").config();

const express = require("express");
const amqp = require("amqplib");

const PORT = process.env.PORT || 3002;
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const QUEUE_NAME = "new_orders";

const app = express();
app.use(express.json());

// Almacenar órdenes recibidas en memoria (para el PoC)
const receivedOrders = [];
let channel = null;

/**
 * Conectar a RabbitMQ y comenzar a consumir mensajes
 */
async function connectAndConsume() {
  const maxRetries = 10;
  for (let i = 1; i <= maxRetries; i++) {
    try {
      console.log(
        `🐇 [Restaurant-Service] Conectando a RabbitMQ (intento ${i}/${maxRetries})...`,
      );
      const connection = await amqp.connect(RABBITMQ_URL);
      channel = await connection.createChannel();
      await channel.assertQueue(QUEUE_NAME, { durable: true });
      channel.prefetch(1);

      console.log(
        `✅ [Restaurant-Service] Conectado a RabbitMQ. Esperando mensajes en cola "${QUEUE_NAME}"...\n`,
      );

      // =====================================================
      // CONSUMIDOR: Escuchar mensajes de la cola
      // =====================================================
      channel.consume(QUEUE_NAME, (msg) => {
        if (msg !== null) {
          try {
            const orderData = JSON.parse(msg.content.toString());

            console.log(`\n${"=".repeat(60)}`);
            console.log(
              `📥 [Restaurant-Service] NUEVA ORDEN RECIBIDA DE LA COLA`,
            );
            console.log(`${"=".repeat(60)}`);
            console.log(`   🆔 Order ID:      ${orderData.order_id}`);
            console.log(
              `   👤 Cliente:        ${orderData.customer_name} (ID: ${orderData.customer_id})`,
            );
            console.log(`   📧 Email:          ${orderData.customer_email}`);
            console.log(
              `   🏪 Restaurante:    ${orderData.restaurant_name} (ID: ${orderData.restaurant_id})`,
            );
            console.log(`   📍 Dirección:      ${orderData.delivery_address}`);
            console.log(`   💰 Total:          Q${orderData.total}`);
            console.log(`   📦 Estado:         ${orderData.status}`);
            console.log(`   🕐 Creada:         ${orderData.created_at}`);
            console.log(`   📋 Items:`);
            if (orderData.items && orderData.items.length > 0) {
              orderData.items.forEach((item, index) => {
                console.log(
                  `      ${index + 1}. ${item.name} x${item.quantity} - Q${item.price}`,
                );
              });
            }
            console.log(`${"=".repeat(60)}\n`);

            // Guardar en memoria para consulta vía REST
            receivedOrders.push({
              ...orderData,
              received_at: new Date().toISOString(),
            });

            // ACK: confirmar que el mensaje fue procesado
            channel.ack(msg);
            console.log(
              `✅ [Restaurant-Service] Orden #${orderData.order_id} procesada y confirmada (ACK)\n`,
            );
          } catch (parseError) {
            console.error(
              `❌ [Restaurant-Service] Error al parsear mensaje:`,
              parseError.message,
            );
            channel.nack(msg, false, false);
          }
        }
      });

      connection.on("error", (err) => {
        console.error(
          "❌ [Restaurant-Service] RabbitMQ connection error:",
          err.message,
        );
      });
      connection.on("close", () => {
        console.log(
          "⚠️  [Restaurant-Service] RabbitMQ connection closed. Reintentando...",
        );
        channel = null;
        setTimeout(connectAndConsume, 5000);
      });

      return;
    } catch (error) {
      console.error(
        `❌ [Restaurant-Service] Intento ${i} fallido:`,
        error.message,
      );
      if (i < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }
  console.error("❌ [Restaurant-Service] No se pudo conectar a RabbitMQ");
}

// =====================================================
// RUTAS REST (para verificación del PoC)
// =====================================================

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "restaurant-service",
    rabbitmq: channel ? "connected" : "disconnected",
    orders_received: receivedOrders.length,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /orders/received - Ver órdenes recibidas de la cola
 */
app.get("/orders/received", (req, res) => {
  res.json({
    success: true,
    total: receivedOrders.length,
    orders: receivedOrders,
  });
});

// =====================================================
// INICIAR SERVIDOR
// =====================================================
async function startServer() {
  try {
    await connectAndConsume();

    app.listen(PORT, () => {
      console.log(`🚀 [Restaurant-Service] Servidor en puerto ${PORT}`);
      console.log(`   GET /health           → Health check`);
      console.log(`   GET /orders/received   → Órdenes recibidas de la cola\n`);
    });
  } catch (error) {
    console.error("❌ [Restaurant-Service] Error al iniciar:", error.message);
    process.exit(1);
  }
}

startServer();
