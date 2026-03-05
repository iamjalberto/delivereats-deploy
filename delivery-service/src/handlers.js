const { pool } = require("./db");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

// Cliente gRPC para Order-Service
const ORDER_PROTO_PATH = path.join(__dirname, "proto/order.proto");
const orderPkgDef = protoLoader.loadSync(ORDER_PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const orderProto = grpc.loadPackageDefinition(orderPkgDef).order;
const orderClient = new orderProto.OrderService(
  process.env.ORDER_SERVICE_HOST || "order-service:50053",
  grpc.credentials.createInsecure(),
);

const acceptOrder = async (call, callback) => {
  try {
    const { order_id, delivery_person_id, delivery_person_name } = call.request;

    // Verificar que no exista ya una entrega para esta orden
    const existing = await pool.query(
      "SELECT id FROM deliveries WHERE order_id = $1",
      [order_id],
    );
    if (existing.rows.length > 0) {
      return callback(null, {
        success: false,
        message: "Esta orden ya fue aceptada por otro repartidor",
        delivery: null,
      });
    }

    // Crear registro de entrega
    const result = await pool.query(
      "INSERT INTO deliveries (order_id, delivery_person_id, delivery_person_name, status) VALUES ($1,$2,$3,$4) RETURNING *",
      [order_id, delivery_person_id, delivery_person_name, "EN_CAMINO"],
    );

    // Actualizar estado en Order-Service
    orderClient.UpdateOrderStatus(
      {
        id: order_id,
        status: "EN_CAMINO",
        updated_by: delivery_person_id,
        updated_by_role: "REPARTIDOR",
        updated_by_name: delivery_person_name,
      },
      (err, res) => {
        if (err)
          console.error("[Delivery-Service] Error updating order status:", err);
      },
    );

    const d = result.rows[0];
    callback(null, {
      success: true,
      message: "Pedido aceptado, en camino",
      delivery: {
        id: d.id,
        order_id: d.order_id,
        delivery_person_id: d.delivery_person_id,
        delivery_person_name: d.delivery_person_name,
        status: d.status,
        accepted_at: d.accepted_at ? d.accepted_at.toISOString() : "",
        delivered_at: "",
      },
    });
  } catch (error) {
    console.error("[Delivery-Service] acceptOrder error:", error);
    callback(null, {
      success: false,
      message: "Error al aceptar pedido",
      delivery: null,
    });
  }
};

const updateDeliveryStatus = async (call, callback) => {
  try {
    const {
      order_id,
      status,
      delivery_person_id,
      delivery_person_name,
      reason,
    } = call.request;

    const deliveredAt = status === "ENTREGADA" ? "NOW()" : "NULL";
    const result = await pool.query(
      `UPDATE deliveries SET status = $1, delivered_at = ${status === "ENTREGADA" ? "NOW()" : "delivered_at"} WHERE order_id = $2 AND delivery_person_id = $3 RETURNING *`,
      [status, order_id, delivery_person_id],
    );

    if (result.rows.length === 0) {
      return callback(null, {
        success: false,
        message: "Entrega no encontrada",
        delivery: null,
      });
    }

    // Actualizar en Order-Service
    if (status === "CANCELADA") {
      orderClient.CancelOrder(
        {
          id: order_id,
          cancelled_by_role: "REPARTIDOR",
          cancelled_by_name: delivery_person_name,
          reason: reason || "Cancelado por repartidor",
        },
        (err, res) => {
          if (err)
            console.error("[Delivery-Service] Error cancelling order:", err);
        },
      );
    } else {
      orderClient.UpdateOrderStatus(
        {
          id: order_id,
          status: status,
          updated_by: delivery_person_id,
          updated_by_role: "REPARTIDOR",
          updated_by_name: delivery_person_name,
        },
        (err, res) => {
          if (err)
            console.error("[Delivery-Service] Error updating order:", err);
        },
      );
    }

    const d = result.rows[0];
    callback(null, {
      success: true,
      message: `Estado actualizado a ${status}`,
      delivery: {
        id: d.id,
        order_id: d.order_id,
        delivery_person_id: d.delivery_person_id,
        delivery_person_name: d.delivery_person_name,
        status: d.status,
        accepted_at: d.accepted_at ? d.accepted_at.toISOString() : "",
        delivered_at: d.delivered_at ? d.delivered_at.toISOString() : "",
      },
    });
  } catch (error) {
    console.error("[Delivery-Service] updateDeliveryStatus error:", error);
    callback(null, {
      success: false,
      message: "Error al actualizar estado",
      delivery: null,
    });
  }
};

const getDeliveryByOrder = async (call, callback) => {
  try {
    const { order_id } = call.request;
    const result = await pool.query(
      "SELECT * FROM deliveries WHERE order_id = $1",
      [order_id],
    );
    if (result.rows.length === 0) {
      return callback(null, {
        success: false,
        message: "No hay entrega para esta orden",
        delivery: null,
      });
    }
    const d = result.rows[0];
    callback(null, {
      success: true,
      message: "OK",
      delivery: {
        id: d.id,
        order_id: d.order_id,
        delivery_person_id: d.delivery_person_id,
        delivery_person_name: d.delivery_person_name,
        status: d.status,
        accepted_at: d.accepted_at ? d.accepted_at.toISOString() : "",
        delivered_at: d.delivered_at ? d.delivered_at.toISOString() : "",
      },
    });
  } catch (error) {
    callback(null, {
      success: false,
      message: "Error interno",
      delivery: null,
    });
  }
};

const listAvailableOrders = async (call, callback) => {
  try {
    // Obtener órdenes listas desde Order-Service
    orderClient.ListReadyOrders({}, (err, response) => {
      if (err) {
        return callback(null, { deliveries: [] });
      }
      // Mapear a formato delivery
      const deliveries = (response.orders || []).map((o) => ({
        id: 0,
        order_id: o.id,
        delivery_person_id: 0,
        delivery_person_name: "",
        status: o.status,
        accepted_at: "",
        delivered_at: "",
      }));
      callback(null, { deliveries });
    });
  } catch (error) {
    callback(null, { deliveries: [] });
  }
};

const listMyDeliveries = async (call, callback) => {
  try {
    const { delivery_person_id } = call.request;
    const result = await pool.query(
      "SELECT * FROM deliveries WHERE delivery_person_id = $1 ORDER BY accepted_at DESC",
      [delivery_person_id],
    );
    const deliveries = result.rows.map((d) => ({
      id: d.id,
      order_id: d.order_id,
      delivery_person_id: d.delivery_person_id,
      delivery_person_name: d.delivery_person_name,
      status: d.status,
      accepted_at: d.accepted_at ? d.accepted_at.toISOString() : "",
      delivered_at: d.delivered_at ? d.delivered_at.toISOString() : "",
    }));
    callback(null, { deliveries });
  } catch (error) {
    callback(null, { deliveries: [] });
  }
};

// ======== Evidence Handlers (P5) ========

async function uploadEvidence(call, callback) {
  try {
    const {
      order_id,
      delivery_id,
      driver_id,
      photo_path,
      photo_original_name,
      photo_mime_type,
      photo_size_bytes,
      notes,
    } = call.request;

    // Verificar que la entrega existe
    const delivery = await pool.query(
      "SELECT * FROM deliveries WHERE id = $1",
      [delivery_id],
    );
    if (delivery.rows.length === 0) {
      return callback(null, {
        success: false,
        message: "Entrega no encontrada",
        evidence: null,
      });
    }

    // Verificar que no exista evidencia previa
    const existing = await pool.query(
      "SELECT id FROM delivery_evidence WHERE delivery_id = $1",
      [delivery_id],
    );
    if (existing.rows.length > 0) {
      return callback(null, {
        success: false,
        message: "Ya existe evidencia para esta entrega",
        evidence: null,
      });
    }

    const result = await pool.query(
      `INSERT INTO delivery_evidence (delivery_id, order_id, driver_id, photo_path, photo_original_name, photo_mime_type, photo_size_bytes, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        delivery_id,
        order_id,
        driver_id,
        photo_path,
        photo_original_name,
        photo_mime_type,
        photo_size_bytes,
        notes,
      ],
    );

    // Marcar entrega como ENTREGADA
    await pool.query(
      "UPDATE deliveries SET status = 'ENTREGADA', delivered_at = NOW() WHERE id = $1",
      [delivery_id],
    );

    // Actualizar en Order-Service
    orderClient.UpdateOrderStatus(
      {
        id: order_id,
        status: "ENTREGADA",
        updated_by: driver_id,
        updated_by_role: "REPARTIDOR",
        updated_by_name: "",
      },
      () => {},
    );

    const e = result.rows[0];
    callback(null, {
      success: true,
      message: "Evidencia registrada exitosamente",
      evidence: {
        id: e.id,
        delivery_id: e.delivery_id,
        order_id: e.order_id,
        driver_id: e.driver_id,
        photo_path: e.photo_path,
        photo_original_name: e.photo_original_name,
        photo_mime_type: e.photo_mime_type,
        photo_size_bytes: e.photo_size_bytes,
        notes: e.notes || "",
        uploaded_at: e.uploaded_at?.toISOString() || "",
      },
    });
  } catch (error) {
    console.error("[Delivery-Service] uploadEvidence error:", error);
    callback(null, {
      success: false,
      message: "Error al registrar evidencia",
      evidence: null,
    });
  }
}

async function getEvidence(call, callback) {
  try {
    const { order_id } = call.request;
    const result = await pool.query(
      "SELECT * FROM delivery_evidence WHERE order_id = $1",
      [order_id],
    );
    if (result.rows.length === 0) {
      return callback(null, {
        success: false,
        message: "No hay evidencia para esta orden",
        evidence: null,
      });
    }
    const e = result.rows[0];
    callback(null, {
      success: true,
      message: "Evidencia encontrada",
      evidence: {
        id: e.id,
        delivery_id: e.delivery_id,
        order_id: e.order_id,
        driver_id: e.driver_id,
        photo_path: e.photo_path,
        photo_original_name: e.photo_original_name,
        photo_mime_type: e.photo_mime_type,
        photo_size_bytes: e.photo_size_bytes,
        notes: e.notes || "",
        uploaded_at: e.uploaded_at?.toISOString() || "",
      },
    });
  } catch (error) {
    callback(null, {
      success: false,
      message: "Error interno",
      evidence: null,
    });
  }
}

async function listDeliveredOrders(call, callback) {
  try {
    const result = await pool.query(
      "SELECT d.*, de.id as evidence_id FROM deliveries d LEFT JOIN delivery_evidence de ON d.id = de.delivery_id ORDER BY d.accepted_at DESC",
    );
    const deliveries = result.rows.map((d) => ({
      id: d.id,
      order_id: d.order_id,
      delivery_person_id: d.delivery_person_id,
      delivery_person_name: d.delivery_person_name,
      status: d.status,
      accepted_at: d.accepted_at ? d.accepted_at.toISOString() : "",
      delivered_at: d.delivered_at ? d.delivered_at.toISOString() : "",
    }));
    callback(null, { deliveries });
  } catch (error) {
    callback(null, { deliveries: [] });
  }
}

module.exports = {
  acceptOrder,
  updateDeliveryStatus,
  getDeliveryByOrder,
  listAvailableOrders,
  listMyDeliveries,
  uploadEvidence,
  getEvidence,
  listDeliveredOrders,
};
