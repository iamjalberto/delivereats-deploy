const nodemailer = require("nodemailer");

// Configurar transporter - usar Gmail o servicio SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `"Delivereats" <${process.env.SMTP_USER || "noreply@delivereats.com"}>`,
      to,
      subject,
      html,
    });
    console.log(`[Notification-Service] Email sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error("[Notification-Service] Email error:", error.message);
    // No fallar si no se puede enviar email, solo loguear
    return false;
  }
};

const formatProducts = (products) => {
  if (!products || products.length === 0) return "<li>Sin productos</li>";
  return products
    .map(
      (p) =>
        `<li>${p.name} x${p.quantity} - Q${(p.price * p.quantity).toFixed(2)}</li>`,
    )
    .join("");
};

// 1. Notificación de orden creada
const sendOrderCreated = async (call, callback) => {
  const {
    client_name,
    client_email,
    order_id,
    products,
    total,
    created_at,
    status,
  } = call.request;

  const html = `
    <h2>🍔 ¡Tu pedido ha sido creado!</h2>
    <p><strong>Nombre del cliente:</strong> ${client_name}</p>
    <p><strong>Número de Orden:</strong> #${order_id}</p>
    <p><strong>Productos ordenados:</strong></p>
    <ul>${formatProducts(products)}</ul>
    <p><strong>Monto total:</strong> Q${parseFloat(total).toFixed(2)}</p>
    <p><strong>Fecha de creación:</strong> ${created_at}</p>
    <p><strong>Estado actual:</strong> ${status}</p>
    <hr>
    <p>Gracias por tu pedido en <strong>Delivereats</strong>.</p>
  `;

  await sendEmail(
    client_email,
    `Pedido #${order_id} Creado - Delivereats`,
    html,
  );
  callback(null, {
    success: true,
    message: "Notificación de orden creada enviada",
  });
};

// 2. Notificación de orden cancelada por cliente
const sendOrderCancelledByClient = async (call, callback) => {
  const {
    client_name,
    client_email,
    order_id,
    products,
    cancelled_at,
    status,
  } = call.request;

  const html = `
    <h2>❌ Tu pedido ha sido cancelado</h2>
    <p><strong>Nombre del cliente:</strong> ${client_name}</p>
    <p><strong>Productos ordenados:</strong></p>
    <ul>${formatProducts(products)}</ul>
    <p><strong>Fecha de cancelación:</strong> ${cancelled_at}</p>
    <p><strong>Estado actual:</strong> ${status}</p>
    <hr>
    <p>Si fue un error, puedes crear un nuevo pedido en <strong>Delivereats</strong>.</p>
  `;

  await sendEmail(
    client_email,
    `Pedido #${order_id} Cancelado - Delivereats`,
    html,
  );
  callback(null, {
    success: true,
    message: "Notificación de cancelación enviada",
  });
};

// 3. Notificación de orden en camino
const sendOrderInRoute = async (call, callback) => {
  const { client_email, order_id, delivery_person_name, products, status } =
    call.request;

  const html = `
    <h2>🚗 ¡Tu pedido va en camino!</h2>
    <p><strong>Número de orden:</strong> #${order_id}</p>
    <p><strong>Repartidor a cargo:</strong> ${delivery_person_name}</p>
    <p><strong>Productos ordenados:</strong></p>
    <ul>${formatProducts(products)}</ul>
    <p><strong>Estado actual:</strong> ${status}</p>
    <hr>
    <p>Tu repartidor ya está en camino. <strong>Delivereats</strong></p>
  `;

  await sendEmail(
    client_email,
    `Pedido #${order_id} En Camino - Delivereats`,
    html,
  );
  callback(null, { success: true, message: "Notificación de envío enviada" });
};

// 4. Notificación de orden cancelada por restaurante
const sendOrderCancelledByRestaurant = async (call, callback) => {
  const {
    client_email,
    cancelled_by_name,
    cancelled_by_role,
    reason,
    order_id,
    products,
    status,
  } = call.request;

  const html = `
    <h2>⚠️ Tu pedido ha sido cancelado</h2>
    <p><strong>Cancelado por:</strong> ${cancelled_by_name} (${cancelled_by_role})</p>
    <p><strong>Razón de la cancelación:</strong> ${reason || "No especificada"}</p>
    <p><strong>Productos ordenados:</strong></p>
    <ul>${formatProducts(products)}</ul>
    <p><strong>Estado actual:</strong> ${status}</p>
    <hr>
    <p>Lamentamos los inconvenientes. <strong>Delivereats</strong></p>
  `;

  await sendEmail(
    client_email,
    `Pedido #${order_id} Cancelado por Restaurante - Delivereats`,
    html,
  );
  callback(null, {
    success: true,
    message: "Notificación de cancelación por restaurante enviada",
  });
};

// 5. Notificación de orden cancelada por repartidor
const sendOrderCancelledByDelivery = async (call, callback) => {
  const {
    client_email,
    cancelled_by_name,
    cancelled_by_role,
    reason,
    order_id,
    products,
    status,
  } = call.request;

  const html = `
    <h2>⚠️ Tu pedido ha sido cancelado</h2>
    <p><strong>Cancelado por:</strong> ${cancelled_by_name} (${cancelled_by_role})</p>
    <p><strong>Razón de la cancelación:</strong> ${reason || "No especificada"}</p>
    <p><strong>Productos ordenados:</strong></p>
    <ul>${formatProducts(products)}</ul>
    <p><strong>Estado actual:</strong> ${status}</p>
    <hr>
    <p>Lamentamos los inconvenientes. <strong>Delivereats</strong></p>
  `;

  await sendEmail(
    client_email,
    `Pedido #${order_id} Cancelado por Repartidor - Delivereats`,
    html,
  );
  callback(null, {
    success: true,
    message: "Notificación de cancelación por repartidor enviada",
  });
};

// 6. Notificación de orden rechazada
const sendOrderRejected = async (call, callback) => {
  const { client_email, restaurant_name, order_id, products, status } =
    call.request;

  const html = `
    <h2>🚫 Tu pedido ha sido rechazado</h2>
    <p><strong>Restaurante:</strong> ${restaurant_name}</p>
    <p><strong>Número de orden:</strong> #${order_id}</p>
    <p><strong>Productos de la orden:</strong></p>
    <ul>${formatProducts(products)}</ul>
    <p><strong>Estado de la orden:</strong> ${status}</p>
    <hr>
    <p>Puedes intentar con otro restaurante. <strong>Delivereats</strong></p>
  `;

  await sendEmail(
    client_email,
    `Pedido #${order_id} Rechazado - Delivereats`,
    html,
  );
  callback(null, { success: true, message: "Notificación de rechazo enviada" });
};

module.exports = {
  sendOrderCreated,
  sendOrderCancelledByClient,
  sendOrderInRoute,
  sendOrderCancelledByRestaurant,
  sendOrderCancelledByDelivery,
  sendOrderRejected,
};
