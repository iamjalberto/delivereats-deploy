/**
 * Order Service - Productor de mensajes RabbitMQ
 *
 * PoC Práctica 4: Al crear una orden, publica un mensaje
 * en la cola "new_orders" para que el Restaurant-Service lo consuma.
 */

require("dotenv").config();

const express = require("express");
const { Pool } = require("pg");
const amqp = require("amqplib");

const PORT = process.env.PORT || 3001;
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const QUEUE_NAME = "new_orders";

// Configuración de base de datos
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "delivereats_orders",
  user: process.env.DB_USER || "delivereats",
  password: process.env.DB_PASSWORD || "delivereats123",
});

const app = express();
app.use(express.json());

let channel = null;

/**
 * Conectar a RabbitMQ con reintentos
 */
async function connectRabbitMQ() {
  const maxRetries = 10;
  for (let i = 1; i <= maxRetries; i++) {
    try {
      console.log(
        `🐇 [Order-Service] Conectando a RabbitMQ (intento ${i}/${maxRetries})...`,
      );
      const connection = await amqp.connect(RABBITMQ_URL);
      channel = await connection.createChannel();
      await channel.assertQueue(QUEUE_NAME, { durable: true });
      console.log(
        `✅ [Order-Service] Conectado a RabbitMQ. Cola "${QUEUE_NAME}" lista.`,
      );

      connection.on("error", (err) => {
        console.error(
          "❌ [Order-Service] RabbitMQ connection error:",
          err.message,
        );
      });
      connection.on("close", () => {
        console.log(
          "⚠️  [Order-Service] RabbitMQ connection closed. Reintentando...",
        );
        channel = null;
        setTimeout(connectRabbitMQ, 5000);
      });

      return;
    } catch (error) {
      console.error(`❌ [Order-Service] Intento ${i} fallido:`, error.message);
      if (i < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }
  console.error(
    "❌ [Order-Service] No se pudo conectar a RabbitMQ después de todos los intentos",
  );
}

/**
 * Publicar mensaje en la cola
 */
async function publishToQueue(orderData) {
  if (!channel) {
    throw new Error("No hay conexión con RabbitMQ");
  }

  const message = JSON.stringify(orderData);
  channel.sendToQueue(QUEUE_NAME, Buffer.from(message), {
    persistent: true,
    contentType: "application/json",
  });

  console.log(`📤 [Order-Service] Mensaje publicado en cola "${QUEUE_NAME}":`);
  console.log(`   Order ID:     ${orderData.order_id}`);
  console.log(`   Restaurante:  ${orderData.restaurant_id}`);
  console.log(`   Cliente:      ${orderData.customer_id}`);
  console.log(`   Items:        ${orderData.items.length}`);
  console.log(`   Total:        Q${orderData.total}`);
}

// =====================================================
// RUTAS REST
// =====================================================

/**
 * Health check
 */
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "order-service",
    rabbitmq: channel ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /orders - Crear una orden y publicar mensaje en cola
 *
 * Este es el PRODUCTOR del PoC:
 * 1. Recibe datos de la orden
 * 2. Persiste en la base de datos
 * 3. Publica un mensaje en la cola "new_orders" de RabbitMQ
 */
app.post("/orders", async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      customer_id,
      customer_name,
      customer_email,
      restaurant_id,
      restaurant_name,
      items,
      delivery_address,
    } = req.body;

    // Validar datos mínimos
    if (!customer_id || !restaurant_id || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Datos incompletos: se requiere customer_id, restaurant_id y al menos un item",
      });
    }

    await client.query("BEGIN");

    // Calcular totales
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const deliveryFee = 15.0;
    const tax = Math.round(subtotal * 0.12 * 100) / 100;
    const total = Math.round((subtotal + deliveryFee + tax) * 100) / 100;

    // Insertar orden en DB
    const orderResult = await client.query(
      `INSERT INTO orders (customer_id, restaurant_id, address_id, subtotal, delivery_fee, tax, total, payment_method, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'EFECTIVO', $8) RETURNING *`,
      [
        customer_id,
        restaurant_id,
        1,
        subtotal,
        deliveryFee,
        tax,
        total,
        delivery_address || "",
      ],
    );

    const order = orderResult.rows[0];

    // Insertar items
    for (const item of items) {
      const itemSubtotal = item.price * item.quantity;
      await client.query(
        "INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal) VALUES ($1, $2, $3, $4, $5)",
        [order.id, item.menu_item_id, item.quantity, item.price, itemSubtotal],
      );
    }

    await client.query("COMMIT");

    console.log(`\n${"=".repeat(60)}`);
    console.log(`✅ [Order-Service] Orden #${order.id} creada en DB`);
    console.log(`${"=".repeat(60)}`);

    // =====================================================
    // PUBLICAR MENSAJE EN RABBITMQ (PRODUCTOR)
    // =====================================================
    const orderMessage = {
      order_id: order.id,
      customer_id,
      customer_name: customer_name || "Cliente",
      customer_email: customer_email || "",
      restaurant_id,
      restaurant_name: restaurant_name || "Restaurante",
      items,
      total,
      delivery_address: delivery_address || "",
      status: "CREADA",
      created_at: order.created_at,
    };

    try {
      await publishToQueue(orderMessage);
      console.log(
        `📨 [Order-Service] Mensaje enviado a Restaurant-Service vía RabbitMQ\n`,
      );
    } catch (mqError) {
      console.error(
        `⚠️  [Order-Service] Error al publicar en cola (orden ya guardada):`,
        mqError.message,
      );
    }

    res.status(201).json({
      success: true,
      message: `Orden #${order.id} creada y notificada al restaurante`,
      data: {
        order: {
          id: order.id,
          customer_id,
          restaurant_id,
          total,
          status: "CREADA",
          items,
        },
        queue_status: channel ? "message_sent" : "queue_unavailable",
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`❌ [Order-Service] Error al crear orden:`, error.message);
    res.status(500).json({
      success: false,
      message: `Error al crear orden: ${error.message}`,
    });
  } finally {
    client.release();
  }
});

/**
 * GET /orders - Listar todas las órdenes
 */
app.get("/orders", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM orders ORDER BY created_at DESC",
    );
    res.json({ success: true, orders: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =====================================================
// INICIAR SERVIDOR
// =====================================================
async function startServer() {
  try {
    await pool.query("SELECT 1");
    console.log("✅ [Order-Service] Conectado a PostgreSQL");

    await connectRabbitMQ();

    app.listen(PORT, () => {
      console.log(`\n🚀 [Order-Service] Servidor REST en puerto ${PORT}`);
      console.log(`   POST /orders  → Crear orden y publicar en cola`);
      console.log(`   GET  /orders  → Listar órdenes`);
      console.log(`   GET  /health  → Health check\n`);
    });
  } catch (error) {
    console.error("❌ [Order-Service] Error al iniciar:", error.message);
    process.exit(1);
  }
}

startServer();
