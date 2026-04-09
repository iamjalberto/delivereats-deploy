/**
 * RabbitMQ Publisher - Order Service
 * Publica nuevos pedidos en la cola para que Restaurant-Service los consuma
 */
const amqp = require("amqplib");

const RABBITMQ_URL =
  process.env.RABBITMQ_URL ||
  "amqp://delivereats:delivereats2026@localhost:5672";
const QUEUE_NAME = "new_orders";
const EXCHANGE_NAME = "orders_exchange";

let channel = null;
let connection = null;

const connectWithRetry = async (maxRetries = 10, delay = 3000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      connection = await amqp.connect(RABBITMQ_URL);
      channel = await connection.createChannel();

      // Declarar exchange y cola durables
      await channel.assertExchange(EXCHANGE_NAME, "direct", { durable: true });
      await channel.assertQueue(QUEUE_NAME, { durable: true });
      await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, "new_order");

      console.log("[Order-Service] ✅ Conectado a RabbitMQ");

      // Reconexión automática
      connection.on("error", (err) => {
        console.error("[Order-Service] RabbitMQ connection error:", err);
        channel = null;
      });
      connection.on("close", () => {
        console.log(
          "[Order-Service] RabbitMQ connection closed, reconnecting...",
        );
        channel = null;
        setTimeout(() => connectWithRetry(maxRetries, delay), delay);
      });

      return;
    } catch (error) {
      console.log(
        `[Order-Service] RabbitMQ connection attempt ${i + 1}/${maxRetries} failed, retrying in ${delay / 1000}s...`,
      );
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  console.error(
    "[Order-Service] ⚠️ Could not connect to RabbitMQ after max retries",
  );
};

/**
 * Publica un pedido nuevo en la cola
 */
const publishNewOrder = async (order) => {
  try {
    if (!channel) {
      console.warn(
        "[Order-Service] RabbitMQ channel not available, order not published to queue",
      );
      return false;
    }

    const message = JSON.stringify({
      event: "ORDER_CREATED",
      order_id: order.id,
      client_id: order.client_id,
      client_name: order.client_name,
      client_email: order.client_email,
      restaurant_id: order.restaurant_id,
      restaurant_name: order.restaurant_name,
      items: order.items,
      total: order.total,
      status: order.status,
      delivery_address: order.delivery_address,
      created_at: order.created_at,
      timestamp: new Date().toISOString(),
    });

    channel.publish(EXCHANGE_NAME, "new_order", Buffer.from(message), {
      persistent: true,
      contentType: "application/json",
    });

    console.log(
      `[Order-Service] 📤 Orden #${order.id} publicada en cola RabbitMQ`,
    );
    return true;
  } catch (error) {
    console.error("[Order-Service] Error publishing to queue:", error);
    return false;
  }
};

/**
 * Publica evento de cancelación de orden
 */
const publishOrderCancelled = async (order, cancelledByRole, reason) => {
  try {
    if (!channel) return false;

    const message = JSON.stringify({
      event: "ORDER_CANCELLED",
      order_id: order.id,
      restaurant_id: order.restaurant_id,
      cancelled_by_role: cancelledByRole,
      reason: reason,
      status: order.status,
      timestamp: new Date().toISOString(),
    });

    channel.publish(EXCHANGE_NAME, "new_order", Buffer.from(message), {
      persistent: true,
      contentType: "application/json",
    });

    console.log(
      `[Order-Service] 📤 Cancelación de orden #${order.id} publicada en cola`,
    );
    return true;
  } catch (error) {
    console.error("[Order-Service] Error publishing cancellation:", error);
    return false;
  }
};

const closeConnection = async () => {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
  } catch (err) {
    console.error("[Order-Service] Error closing RabbitMQ:", err);
  }
};

module.exports = {
  connectWithRetry,
  publishNewOrder,
  publishOrderCancelled,
  closeConnection,
};
