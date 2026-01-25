const { pool } = require("./db");

const buildOrderFromRow = (row, items) => ({
  id: row.id,
  client_id: row.client_id,
  client_name: row.client_name,
  client_email: row.client_email,
  restaurant_id: row.restaurant_id,
  restaurant_name: row.restaurant_name,
  items: items || [],
  total: parseFloat(row.total),
  status: row.status,
  delivery_address: row.delivery_address,
  created_at: row.created_at ? row.created_at.toISOString() : "",
  updated_at: row.updated_at ? row.updated_at.toISOString() : "",
  delivery_person_id: row.delivery_person_id || 0,
  delivery_person_name: row.delivery_person_name || "",
});

const getOrderItems = async (orderId) => {
  const result = await pool.query(
    "SELECT * FROM order_items WHERE order_id = $1",
    [orderId],
  );
  return result.rows.map((i) => ({
    menu_item_id: i.menu_item_id,
    name: i.name,
    quantity: i.quantity,
    price: parseFloat(i.price),
  }));
};

const createOrder = async (call, callback) => {
  const client = await pool.connect();
  try {
    const {
      client_id,
      client_name,
      client_email,
      restaurant_id,
      restaurant_name,
      items,
      delivery_address,
    } = call.request;

    await client.query("BEGIN");

    // Calcular total
    const total = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    // Crear orden
    const orderResult = await client.query(
      `INSERT INTO orders (client_id, client_name, client_email, restaurant_id, restaurant_name, total, status, delivery_address)
       VALUES ($1,$2,$3,$4,$5,$6,'CREADA',$7) RETURNING *`,
      [
        client_id,
        client_name,
        client_email,
        restaurant_id,
        restaurant_name,
        total,
        delivery_address,
      ],
    );

    const order = orderResult.rows[0];

    // Insertar items
    for (const item of items) {
      await client.query(
        "INSERT INTO order_items (order_id, menu_item_id, name, quantity, price) VALUES ($1,$2,$3,$4,$5)",
        [order.id, item.menu_item_id, item.name, item.quantity, item.price],
      );
    }

    await client.query("COMMIT");

    const orderItems = await getOrderItems(order.id);
    callback(null, {
      success: true,
      message: "Orden creada exitosamente",
      order: buildOrderFromRow(order, orderItems),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[Order-Service] createOrder error:", error);
    callback(null, {
      success: false,
      message: "Error al crear orden",
      order: null,
    });
  } finally {
    client.release();
  }
};

const getOrder = async (call, callback) => {
  try {
    const { id } = call.request;
    const result = await pool.query("SELECT * FROM orders WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return callback(null, {
        success: false,
        message: "Orden no encontrada",
        order: null,
      });
    }
    const items = await getOrderItems(id);
    callback(null, {
      success: true,
      message: "OK",
      order: buildOrderFromRow(result.rows[0], items),
    });
  } catch (error) {
    callback(null, { success: false, message: "Error interno", order: null });
  }
};

const listOrdersByClient = async (call, callback) => {
  try {
    const { client_id } = call.request;
    const result = await pool.query(
      "SELECT * FROM orders WHERE client_id = $1 ORDER BY created_at DESC",
      [client_id],
    );
    const orders = [];
    for (const row of result.rows) {
      const items = await getOrderItems(row.id);
      orders.push(buildOrderFromRow(row, items));
    }
    callback(null, { orders });
  } catch (error) {
    callback(null, { orders: [] });
  }
};

const listOrdersByRestaurant = async (call, callback) => {
  try {
    const { restaurant_id } = call.request;
    const result = await pool.query(
      "SELECT * FROM orders WHERE restaurant_id = $1 ORDER BY created_at DESC",
      [restaurant_id],
    );
    const orders = [];
    for (const row of result.rows) {
      const items = await getOrderItems(row.id);
      orders.push(buildOrderFromRow(row, items));
    }
    callback(null, { orders });
  } catch (error) {
    callback(null, { orders: [] });
  }
};

const listReadyOrders = async (call, callback) => {
  try {
    const result = await pool.query(
      "SELECT * FROM orders WHERE status = 'LISTA' ORDER BY created_at DESC",
    );
    const orders = [];
    for (const row of result.rows) {
      const items = await getOrderItems(row.id);
      orders.push(buildOrderFromRow(row, items));
    }
    callback(null, { orders });
  } catch (error) {
    callback(null, { orders: [] });
  }
};

const updateOrderStatus = async (call, callback) => {
  try {
    const { id, status, updated_by, updated_by_role, updated_by_name } =
      call.request;

    const updateFields = ["status = $1", "updated_at = NOW()"];
    const values = [status, id];

    if (updated_by_role === "REPARTIDOR") {
      updateFields.push(`delivery_person_id = $${values.length + 1}`);
      values.push(updated_by);
      updateFields.push(`delivery_person_name = $${values.length + 1}`);
      values.push(updated_by_name);
    }

    const result = await pool.query(
      `UPDATE orders SET ${updateFields.join(", ")} WHERE id = $2 RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return callback(null, {
        success: false,
        message: "Orden no encontrada",
        order: null,
      });
    }

    const items = await getOrderItems(id);
    callback(null, {
      success: true,
      message: `Orden actualizada a ${status}`,
      order: buildOrderFromRow(result.rows[0], items),
    });
  } catch (error) {
    console.error("[Order-Service] updateOrderStatus error:", error);
    callback(null, {
      success: false,
      message: "Error al actualizar orden",
      order: null,
    });
  }
};

const cancelOrder = async (call, callback) => {
  try {
    const { id, cancelled_by_role, cancelled_by_name, reason } = call.request;

    const status =
      cancelled_by_role === "RESTAURANTE" ? "RECHAZADA" : "CANCELADA";

    const result = await pool.query(
      "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [status, id],
    );

    if (result.rows.length === 0) {
      return callback(null, {
        success: false,
        message: "Orden no encontrada",
        order: null,
      });
    }

    const items = await getOrderItems(id);
    callback(null, {
      success: true,
      message: `Orden ${status.toLowerCase()} por ${cancelled_by_role}`,
      order: buildOrderFromRow(result.rows[0], items),
    });
  } catch (error) {
    callback(null, {
      success: false,
      message: "Error al cancelar orden",
      order: null,
    });
  }
};

module.exports = {
  createOrder,
  getOrder,
  listOrdersByClient,
  listOrdersByRestaurant,
  listReadyOrders,
  updateOrderStatus,
  cancelOrder,
};
