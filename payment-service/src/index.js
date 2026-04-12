/**
 * Payment Service - Procesamiento de pagos simulados
 * Soporta: Tarjeta Crédito, Tarjeta Débito, Cartera Digital
 */
require("dotenv").config();

const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const { pool, initDB } = require("./db");

const GRPC_PORT = process.env.PORT || "50057";

// =====================================================
// LÓGICA DE PAGOS SIMULADOS
// =====================================================

/**
 * Simula la validación de una tarjeta.
 * - Números que terminan en 0000: RECHAZADO
 * - Montos > Q10,000: RECHAZADO
 */
function simulateCardPayment(cardNumber, amount) {
  const last4 = cardNumber.slice(-4);
  if (last4 === "0000") {
    return { approved: false, reason: "Tarjeta rechazada por el banco emisor" };
  }
  if (amount > 10000) {
    return {
      approved: false,
      reason: "Monto excede el límite permitido (Q10,000)",
    };
  }
  return { approved: true, reason: null };
}

/**
 * Simula el pago con cartera digital.
 * Usa saldo real de la tabla wallets.
 */
async function simulateWalletPayment(customerId, amount) {
  const result = await pool.query(
    "SELECT * FROM wallets WHERE customer_id = $1",
    [customerId],
  );
  if (result.rows.length === 0) {
    return {
      approved: false,
      reason: "No tienes una cartera digital. Recarga primero.",
    };
  }
  const wallet = result.rows[0];
  if (parseFloat(wallet.balance) < amount) {
    return {
      approved: false,
      reason: `Saldo insuficiente en cartera digital (Q${parseFloat(wallet.balance).toFixed(2)} disponible)`,
    };
  }
  // Debit wallet
  await pool.query(
    "UPDATE wallets SET balance = balance - $1 WHERE customer_id = $2",
    [amount, customerId],
  );
  await pool.query(
    "INSERT INTO wallet_transactions (wallet_id, type, amount, description) VALUES ($1, 'PAGO', $2, $3)",
    [wallet.id, amount, `Pago de orden`],
  );
  return { approved: true, reason: null };
}

const PAYMENT_TYPE_MAP = {
  0: "TARJETA_CREDITO",
  1: "TARJETA_DEBITO",
  2: "CARTERA_DIGITAL",
  TARJETA_CREDITO: "TARJETA_CREDITO",
  TARJETA_DEBITO: "TARJETA_DEBITO",
  CARTERA_DIGITAL: "CARTERA_DIGITAL",
};

const STATUS_MAP = {
  PENDIENTE: 0,
  PAGADO: 1,
  RECHAZADO: 2,
  REEMBOLSADO: 3,
};

// =====================================================
// IMPLEMENTACIÓN gRPC
// =====================================================

async function processPayment(call, callback) {
  const req = call.request;
  console.log(
    `\n💳 [Payment] Procesando pago - Orden #${req.order_id}, Monto: Q${req.amount}`,
  );

  try {
    if (!req.order_id || !req.amount) {
      return callback(null, {
        success: false,
        message: "Datos de pago incompletos",
        status: STATUS_MAP.PENDIENTE,
      });
    }

    // Verificar si ya existe pago para esta orden
    const existing = await pool.query(
      "SELECT id, status FROM payments WHERE order_id = $1",
      [req.order_id],
    );
    if (existing.rows.length > 0) {
      return callback(null, {
        success: false,
        message: `Ya existe un pago para la orden #${req.order_id} (estado: ${existing.rows[0].status})`,
        payment_id: existing.rows[0].id,
        status: STATUS_MAP[existing.rows[0].status] || 0,
      });
    }

    const paymentType = PAYMENT_TYPE_MAP[req.payment_type] || "TARJETA_CREDITO";
    let simulation;
    let last4 = "";

    if (paymentType === "CARTERA_DIGITAL") {
      // Pago con cartera digital - usa saldo real
      simulation = await simulateWalletPayment(req.customer_id, req.amount);
      last4 = "WLLT";
    } else {
      // Pago con tarjeta - requiere número de tarjeta
      if (!req.card_number) {
        return callback(null, {
          success: false,
          message: "Número de tarjeta requerido para pago con tarjeta",
          status: STATUS_MAP.PENDIENTE,
        });
      }
      simulation = simulateCardPayment(req.card_number, req.amount);
      last4 = req.card_number.slice(-4);
    }

    const transactionId = `TXN-${uuidv4().substring(0, 8).toUpperCase()}`;
    const status = simulation.approved ? "PAGADO" : "RECHAZADO";

    const result = await pool.query(
      `INSERT INTO payments (order_id, customer_id, amount, currency, converted_amount, converted_currency, exchange_rate, payment_type, card_last_four, card_holder_name, status, transaction_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::payment_type, $9, $10, $11::payment_status, $12) RETURNING *`,
      [
        req.order_id,
        req.customer_id,
        req.amount,
        req.currency || "GTQ",
        req.converted_amount || null,
        req.converted_currency || null,
        req.exchange_rate || null,
        paymentType,
        last4,
        req.card_holder_name ||
          (paymentType === "CARTERA_DIGITAL" ? "Cartera Digital" : "Titular"),
        status,
        transactionId,
      ],
    );

    const payment = result.rows[0];
    console.log(
      `${simulation.approved ? "✅" : "❌"} [Payment] Pago ${status} - TXN: ${transactionId}`,
    );

    callback(null, {
      success: simulation.approved,
      message: simulation.approved
        ? "Pago procesado exitosamente"
        : `Pago rechazado: ${simulation.reason}`,
      payment_id: payment.id,
      transaction_id: transactionId,
      status: STATUS_MAP[status],
    });
  } catch (error) {
    console.error("❌ [Payment] Error:", error.message);
    callback(null, {
      success: false,
      message: `Error procesando pago: ${error.message}`,
      status: STATUS_MAP.PENDIENTE,
    });
  }
}

async function getPaymentStatus(call, callback) {
  const { order_id } = call.request;
  console.log(`🔍 [Payment] Consultando pago de orden #${order_id}`);

  try {
    const result = await pool.query(
      "SELECT * FROM payments WHERE order_id = $1",
      [order_id],
    );
    if (result.rows.length === 0) {
      return callback(null, {
        success: false,
        message: `No se encontró pago para la orden #${order_id}`,
      });
    }

    const p = result.rows[0];
    callback(null, {
      success: true,
      message: "Pago encontrado",
      payment: {
        id: p.id,
        order_id: p.order_id,
        customer_id: p.customer_id,
        amount: parseFloat(p.amount),
        currency: p.currency,
        payment_type: p.payment_type,
        card_last_four: p.card_last_four,
        card_holder_name: p.card_holder_name,
        status: p.status,
        transaction_id: p.transaction_id,
        created_at: p.created_at?.toISOString() || "",
        updated_at: p.updated_at?.toISOString() || "",
        refund_approved_by: p.refund_approved_by || 0,
        refund_reason: p.refund_reason || "",
      },
    });
  } catch (error) {
    console.error("❌ [Payment] Error:", error.message);
    callback(null, { success: false, message: `Error: ${error.message}` });
  }
}

async function approveRefund(call, callback) {
  const { order_id, admin_id, reason } = call.request;
  console.log(
    `💰 [Payment] Solicitud de reembolso - Orden #${order_id} por Admin #${admin_id}`,
  );

  try {
    const existing = await pool.query(
      "SELECT * FROM payments WHERE order_id = $1",
      [order_id],
    );

    if (existing.rows.length === 0) {
      return callback(null, {
        success: false,
        message: `No se encontró pago para la orden #${order_id}`,
      });
    }

    const payment = existing.rows[0];
    if (payment.status === "REEMBOLSADO") {
      return callback(null, {
        success: false,
        message: "Este pago ya fue reembolsado",
        new_status: STATUS_MAP.REEMBOLSADO,
      });
    }
    if (payment.status !== "PAGADO") {
      return callback(null, {
        success: false,
        message: `No se puede reembolsar un pago con estado: ${payment.status}`,
      });
    }

    await pool.query(
      `UPDATE payments SET status = 'REEMBOLSADO', refund_approved_by = $1, refund_approved_at = NOW(), refund_reason = $2 WHERE order_id = $3`,
      [admin_id, reason || "Aprobado por administrador", order_id],
    );

    console.log(`✅ [Payment] Reembolso aprobado para orden #${order_id}`);
    callback(null, {
      success: true,
      message: `Reembolso aprobado para orden #${order_id}`,
      new_status: STATUS_MAP.REEMBOLSADO,
    });
  } catch (error) {
    console.error("❌ [Payment] Error:", error.message);
    callback(null, { success: false, message: `Error: ${error.message}` });
  }
}

async function listPayments(call, callback) {
  const { status_filter, limit, offset } = call.request;
  console.log(
    `📋 [Payment] Listando pagos (filtro: ${status_filter || "todos"})`,
  );

  try {
    let query = "SELECT * FROM payments";
    const params = [];
    let paramIdx = 1;

    if (status_filter && status_filter !== "" && status_filter !== "TODOS") {
      query += ` WHERE status = $${paramIdx}::payment_status`;
      params.push(status_filter);
      paramIdx++;
    }

    const countResult = await pool.query(
      query.replace("SELECT *", "SELECT COUNT(*)"),
      params,
    );
    const total = parseInt(countResult.rows[0].count);

    query += " ORDER BY created_at DESC";
    if (limit && limit > 0) {
      query += ` LIMIT $${paramIdx}`;
      params.push(limit);
      paramIdx++;
    }
    if (offset && offset > 0) {
      query += ` OFFSET $${paramIdx}`;
      params.push(offset);
    }

    const result = await pool.query(query, params);
    const payments = result.rows.map((p) => ({
      id: p.id,
      order_id: p.order_id,
      customer_id: p.customer_id,
      amount: parseFloat(p.amount),
      currency: p.currency,
      payment_type: p.payment_type,
      card_last_four: p.card_last_four,
      card_holder_name: p.card_holder_name,
      status: p.status,
      transaction_id: p.transaction_id,
      created_at: p.created_at?.toISOString() || "",
      updated_at: p.updated_at?.toISOString() || "",
      refund_approved_by: p.refund_approved_by || 0,
      refund_reason: p.refund_reason || "",
    }));

    callback(null, { success: true, payments, total });
  } catch (error) {
    console.error("❌ [Payment] Error:", error.message);
    callback(null, { success: false, payments: [], total: 0 });
  }
}

// =====================================================
// CUPONES
// =====================================================

async function createCoupon(call, callback) {
  const req = call.request;
  console.log(`🎟️ [Payment] Creando cupón: ${req.code}`);
  try {
    const result = await pool.query(
      `INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount, max_uses, expires_at)
       VALUES (UPPER($1), $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        req.code,
        req.description || "",
        req.discount_type || "PORCENTAJE",
        req.discount_value,
        req.min_order_amount || 0,
        req.max_discount || null,
        req.max_uses || 1,
        req.expires_at || null,
      ],
    );
    const c = result.rows[0];
    callback(null, {
      success: true,
      message: "Cupón creado exitosamente",
      coupon: mapCoupon(c),
    });
  } catch (error) {
    console.error("❌ [Payment] Error creando cupón:", error.message);
    callback(null, {
      success: false,
      message: error.message.includes("duplicate")
        ? "El código de cupón ya existe"
        : `Error: ${error.message}`,
    });
  }
}

async function validateCoupon(call, callback) {
  const { code, order_amount } = call.request;
  console.log(
    `🔍 [Payment] Validando cupón: ${code} para monto Q${order_amount}`,
  );
  try {
    const result = await pool.query(
      "SELECT * FROM coupons WHERE code = UPPER($1)",
      [code],
    );
    if (result.rows.length === 0) {
      return callback(null, {
        valid: false,
        message: "Cupón no encontrado",
        discount_amount: 0,
        final_amount: order_amount,
      });
    }
    const c = result.rows[0];
    if (!c.active) {
      return callback(null, {
        valid: false,
        message: "Cupón inactivo",
        discount_amount: 0,
        final_amount: order_amount,
      });
    }
    if (c.expires_at && new Date(c.expires_at) < new Date()) {
      return callback(null, {
        valid: false,
        message: "Cupón expirado",
        discount_amount: 0,
        final_amount: order_amount,
      });
    }
    if (c.current_uses >= c.max_uses) {
      return callback(null, {
        valid: false,
        message: "Cupón agotado",
        discount_amount: 0,
        final_amount: order_amount,
      });
    }
    if (order_amount < parseFloat(c.min_order_amount)) {
      return callback(null, {
        valid: false,
        message: `El monto mínimo para este cupón es Q${c.min_order_amount}`,
        discount_amount: 0,
        final_amount: order_amount,
      });
    }

    let discount = 0;
    if (c.discount_type === "PORCENTAJE") {
      discount = (order_amount * parseFloat(c.discount_value)) / 100;
      if (c.max_discount && discount > parseFloat(c.max_discount)) {
        discount = parseFloat(c.max_discount);
      }
    } else {
      discount = parseFloat(c.discount_value);
    }
    const finalAmount = Math.max(0, order_amount - discount);

    // Incrementar uso
    await pool.query(
      "UPDATE coupons SET current_uses = current_uses + 1 WHERE id = $1",
      [c.id],
    );

    callback(null, {
      valid: true,
      message: `Cupón aplicado: -Q${discount.toFixed(2)}`,
      discount_amount: discount,
      final_amount: finalAmount,
      coupon: mapCoupon(c),
    });
  } catch (error) {
    console.error("❌ [Payment] Error validando cupón:", error.message);
    callback(null, {
      valid: false,
      message: `Error: ${error.message}`,
      discount_amount: 0,
      final_amount: order_amount,
    });
  }
}

async function listCoupons(call, callback) {
  try {
    const result = await pool.query(
      "SELECT * FROM coupons ORDER BY created_at DESC",
    );
    callback(null, { success: true, coupons: result.rows.map(mapCoupon) });
  } catch (error) {
    callback(null, { success: false, coupons: [] });
  }
}

async function deleteCoupon(call, callback) {
  try {
    const { id } = call.request;
    await pool.query("DELETE FROM coupons WHERE id = $1", [id]);
    callback(null, { success: true, message: "Cupón eliminado" });
  } catch (error) {
    callback(null, { success: false, message: `Error: ${error.message}` });
  }
}

function mapCoupon(c) {
  return {
    id: c.id,
    code: c.code,
    description: c.description || "",
    discount_type: c.discount_type,
    discount_value: parseFloat(c.discount_value),
    min_order_amount: parseFloat(c.min_order_amount || 0),
    max_discount: c.max_discount ? parseFloat(c.max_discount) : 0,
    max_uses: c.max_uses,
    current_uses: c.current_uses,
    active: c.active,
    expires_at: c.expires_at ? c.expires_at.toISOString() : "",
    created_at: c.created_at ? c.created_at.toISOString() : "",
  };
}

// =====================================================
// CARTERA DIGITAL (WALLET RECARGABLE)
// =====================================================

async function getWalletBalance(call, callback) {
  const { customer_id } = call.request;
  try {
    let result = await pool.query(
      "SELECT * FROM wallets WHERE customer_id = $1",
      [customer_id],
    );
    if (result.rows.length === 0) {
      // Auto-create wallet with 0 balance
      result = await pool.query(
        "INSERT INTO wallets (customer_id, balance) VALUES ($1, 0) RETURNING *",
        [customer_id],
      );
    }
    const w = result.rows[0];
    callback(null, {
      success: true,
      message: "OK",
      wallet_id: w.id,
      balance: parseFloat(w.balance),
    });
  } catch (error) {
    console.error("❌ [Payment] Wallet balance error:", error.message);
    callback(null, { success: false, message: error.message, balance: 0 });
  }
}

async function rechargeWallet(call, callback) {
  const { customer_id, amount, description } = call.request;
  console.log(
    `💰 [Payment] Recarga de cartera - Cliente #${customer_id}, Q${amount}`,
  );
  try {
    if (!amount || amount <= 0) {
      return callback(null, {
        success: false,
        message: "Monto debe ser mayor a 0",
        balance: 0,
      });
    }

    // Upsert wallet
    let result = await pool.query(
      "SELECT * FROM wallets WHERE customer_id = $1",
      [customer_id],
    );
    let wallet;
    if (result.rows.length === 0) {
      const ins = await pool.query(
        "INSERT INTO wallets (customer_id, balance) VALUES ($1, $2) RETURNING *",
        [customer_id, amount],
      );
      wallet = ins.rows[0];
    } else {
      const upd = await pool.query(
        "UPDATE wallets SET balance = balance + $1 WHERE customer_id = $2 RETURNING *",
        [amount, customer_id],
      );
      wallet = upd.rows[0];
    }

    await pool.query(
      "INSERT INTO wallet_transactions (wallet_id, type, amount, description) VALUES ($1, 'RECARGA', $2, $3)",
      [wallet.id, amount, description || "Recarga de cartera"],
    );

    console.log(
      `✅ [Payment] Cartera recargada - Nuevo saldo: Q${parseFloat(wallet.balance).toFixed(2)}`,
    );
    callback(null, {
      success: true,
      message: `Cartera recargada exitosamente. Nuevo saldo: Q${parseFloat(wallet.balance).toFixed(2)}`,
      wallet_id: wallet.id,
      balance: parseFloat(wallet.balance),
    });
  } catch (error) {
    console.error("❌ [Payment] Recharge error:", error.message);
    callback(null, { success: false, message: error.message, balance: 0 });
  }
}

async function getWalletTransactions(call, callback) {
  const { customer_id } = call.request;
  try {
    const walletRes = await pool.query(
      "SELECT * FROM wallets WHERE customer_id = $1",
      [customer_id],
    );
    if (walletRes.rows.length === 0) {
      return callback(null, { success: true, transactions: [], balance: 0 });
    }
    const wallet = walletRes.rows[0];
    const txRes = await pool.query(
      "SELECT * FROM wallet_transactions WHERE wallet_id = $1 ORDER BY created_at DESC LIMIT 50",
      [wallet.id],
    );
    const transactions = txRes.rows.map((t) => ({
      id: t.id,
      type: t.type,
      amount: parseFloat(t.amount),
      description: t.description || "",
      created_at: t.created_at?.toISOString() || "",
    }));
    callback(null, {
      success: true,
      transactions,
      balance: parseFloat(wallet.balance),
    });
  } catch (error) {
    callback(null, { success: false, transactions: [], balance: 0 });
  }
}

// =====================================================
// INICIAR SERVIDOR
// =====================================================

async function startServer() {
  await initDB();

  const PROTO_PATH = path.join(__dirname, "proto/payment.proto");
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const paymentProto = grpc.loadPackageDefinition(packageDefinition).payment;

  const server = new grpc.Server();
  server.addService(paymentProto.PaymentService.service, {
    ProcessPayment: processPayment,
    GetPaymentStatus: getPaymentStatus,
    ApproveRefund: approveRefund,
    ListPayments: listPayments,
    CreateCoupon: createCoupon,
    ValidateCoupon: validateCoupon,
    ListCoupons: listCoupons,
    DeleteCoupon: deleteCoupon,
    GetWalletBalance: getWalletBalance,
    RechargeWallet: rechargeWallet,
    GetWalletTransactions: getWalletTransactions,
  });

  server.bindAsync(
    `0.0.0.0:${GRPC_PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error("❌ gRPC bind error:", err);
        process.exit(1);
      }
      console.log(`🚀 [Payment-Service] gRPC server on port ${port}`);
    },
  );
}

startServer();
