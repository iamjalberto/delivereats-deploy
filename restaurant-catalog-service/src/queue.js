/**
 * RabbitMQ Consumer - Restaurant Catalog Service
 * Consume mensajes de pedidos nuevos de la cola
 */
const amqp = require("amqplib");

const RABBITMQ_URL =
  process.env.RABBITMQ_URL ||
  "amqp://delivereats:delivereats2026@localhost:5672";
const QUEUE_NAME = "new_orders";
const EXCHANGE_NAME = "orders_exchange";

let channel = null;
let connection = null;

// Almacena las órdenes recibidas en memoria para consulta
const receivedOrders = [];

const connectWithRetry = async (maxRetries = 10, delay = 3000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      connection = await amqp.connect(RABBITMQ_URL);
      channel = await connection.createChannel();

      await channel.assertExchange(EXCHANGE_NAME, "direct", { durable: true });
      await channel.assertQueue(QUEUE_NAME, { durable: true });
      await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, "new_order");

      // Procesar un mensaje a la vez
      channel.prefetch(1);

      // Consumir mensajes
      channel.consume(QUEUE_NAME, (msg) => {
        if (msg) {
          try {
            const order = JSON.parse(msg.content.toString());
            console.log(
              `[Restaurant-Service] 📥 Mensaje recibido de cola: ${order.event} - Orden #${order.order_id}`,
            );

            if (order.event === "ORDER_CREATED") {
              console.log(
                `[Restaurant-Service] 🍽️ Nueva orden #${order.order_id} de "${order.client_name}" ` +
                  `para restaurante "${order.restaurant_name}" - Total: Q${order.total}`,
              );
              receivedOrders.push({
                ...order,
                received_at: new Date().toISOString(),
                processed: false,
              });
            } else if (order.event === "ORDER_CANCELLED") {
              console.log(
                `[Restaurant-Service] ❌ Orden #${order.order_id} cancelada por ${order.cancelled_by_role}`,
              );
              // Marcar como cancelada en memoria
              const existing = receivedOrders.find(
                (o) => o.order_id === order.order_id,
              );
              if (existing) {
                existing.status = "CANCELADA";
                existing.cancelled_by = order.cancelled_by_role;
              }
            }

            channel.ack(msg);
          } catch (error) {
            console.error(
              "[Restaurant-Service] Error processing message:",
              error,
            );
            channel.nack(msg, false, true); // Requeue
          }
        }
      });

      console.log(
        "[Restaurant-Service] ✅ Conectado a RabbitMQ - Consumiendo cola:",
        QUEUE_NAME,
      );

      connection.on("error", (err) => {
        console.error("[Restaurant-Service] RabbitMQ connection error:", err);
        channel = null;
      });
      connection.on("close", () => {
        console.log(
          "[Restaurant-Service] RabbitMQ connection closed, reconnecting...",
        );
        channel = null;
        setTimeout(() => connectWithRetry(maxRetries, delay), delay);
      });

      return;
    } catch (error) {
      console.log(
        `[Restaurant-Service] RabbitMQ connection attempt ${i + 1}/${maxRetries} failed, retrying in ${delay / 1000}s...`,
      );
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  console.error(
    "[Restaurant-Service] ⚠️ Could not connect to RabbitMQ after max retries",
  );
};

const getReceivedOrders = () => receivedOrders;

const closeConnection = async () => {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
  } catch (err) {
    console.error("[Restaurant-Service] Error closing RabbitMQ:", err);
  }
};

module.exports = {
  connectWithRetry,
  getReceivedOrders,
  closeConnection,
};
