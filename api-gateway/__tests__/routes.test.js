/**
 * API Gateway - Route Integration Tests
 * Tests para rutas REST del API Gateway con gRPC mocking
 */

const jwt = require("jsonwebtoken");

// Mock grpcClients BEFORE requiring anything
const mockGrpcCall = jest.fn();
jest.mock("../src/grpcClients", () => ({
  authClient: {},
  restaurantClient: {},
  orderClient: {},
  deliveryClient: {},
  notificationClient: {},
  fxClient: {},
  paymentClient: {},
  ratingClient: {},
  grpcCall: mockGrpcCall,
}));

// Mock multer for delivery routes
jest.mock("multer", () => {
  const multer = () => ({
    single: () => (req, res, next) => {
      req.file = req._mockFile || null;
      next();
    },
  });
  multer.diskStorage = jest.fn(() => ({}));
  return multer;
});

const express = require("express");
const request = require("supertest");

const JWT_SECRET = "delivereats_secret_key_sa_2026";

// Helper to create a valid token
const makeToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

const clientToken = makeToken({
  id: 1,
  email: "client@test.com",
  role: "CLIENTE",
  name: "Cliente Test",
});
const adminToken = makeToken({
  id: 2,
  email: "admin@test.com",
  role: "ADMINISTRADOR",
  name: "Admin Test",
});
const restaurantToken = makeToken({
  id: 3,
  email: "rest@test.com",
  role: "RESTAURANTE",
  name: "Restaurant Test",
});
const deliveryToken = makeToken({
  id: 4,
  email: "rep@test.com",
  role: "REPARTIDOR",
  name: "Delivery Test",
});

// Build Express app with routes
function buildApp() {
  const app = express();
  app.use(express.json());
  app.get("/api/health", (req, res) =>
    res.json({ status: "OK", service: "API Gateway - Delivereats" }),
  );
  app.use("/api/auth", require("../src/routes/auth"));
  app.use("/api/restaurants", require("../src/routes/restaurants"));
  app.use("/api/orders", require("../src/routes/orders"));
  app.use("/api/payments", require("../src/routes/payments"));
  app.use("/api/fx", require("../src/routes/fx"));
  app.use("/api/ratings", require("../src/routes/ratings"));
  return app;
}

let app;

beforeAll(() => {
  app = buildApp();
});

beforeEach(() => {
  jest.resetAllMocks();
});

// ========== HEALTH CHECK ==========
describe("Health Check", () => {
  it("GET /api/health should return OK", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OK");
    expect(res.body.service).toContain("API Gateway");
  });
});

// ========== AUTH ROUTES ==========
describe("Auth Routes", () => {
  it("POST /api/auth/register should register a user", async () => {
    mockGrpcCall.mockResolvedValueOnce({
      success: true,
      message: "Usuario registrado",
      user: { id: 1, name: "Test", email: "t@t.com", role: "CLIENTE" },
    });
    const res = await request(app).post("/api/auth/register").send({
      name: "Test",
      email: "t@t.com",
      password: "123456",
      role: "CLIENTE",
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it("POST /api/auth/login should return token", async () => {
    mockGrpcCall.mockResolvedValueOnce({
      success: true,
      token: "jwt.token.here",
      user: { id: 1, name: "Test", role: "CLIENTE" },
    });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "t@t.com", password: "123456" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("POST /api/auth/register should fail with missing fields", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ========== RESTAURANT ROUTES ==========
describe("Restaurant Routes", () => {
  it("GET /api/restaurants should list restaurants", async () => {
    mockGrpcCall.mockResolvedValueOnce({
      restaurants: [{ id: 1, name: "Pizza Place" }],
    });
    const res = await request(app)
      .get("/api/restaurants")
      .set("Authorization", `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.restaurants).toHaveLength(1);
  });

  it("GET /api/restaurants should reject without token", async () => {
    const res = await request(app).get("/api/restaurants");
    expect(res.status).toBe(401);
  });

  it("GET /api/restaurants/:id should get single restaurant", async () => {
    mockGrpcCall.mockResolvedValueOnce({
      success: true,
      restaurant: { id: 1, name: "Pizza Place" },
    });
    const res = await request(app)
      .get("/api/restaurants/1")
      .set("Authorization", `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.restaurant.name).toBe("Pizza Place");
  });

  it("POST /api/restaurants should create restaurant (ADMIN)", async () => {
    mockGrpcCall.mockResolvedValueOnce({
      success: true,
      restaurant: { id: 1, name: "New Rest" },
    });
    const res = await request(app)
      .post("/api/restaurants")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "New Rest", address: "123 St", food_type: "Italiana" });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it("POST /api/restaurants should be denied for CLIENTE", async () => {
    const res = await request(app)
      .post("/api/restaurants")
      .set("Authorization", `Bearer ${clientToken}`)
      .send({ name: "Fail" });
    expect(res.status).toBe(403);
  });

  it("GET /api/restaurants/search should search restaurants", async () => {
    mockGrpcCall.mockResolvedValueOnce({
      restaurants: [{ id: 1, name: "Pizza" }],
    });
    const res = await request(app)
      .get("/api/restaurants/search?query=pizza&filter=nuevos")
      .set("Authorization", `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(mockGrpcCall).toHaveBeenCalledWith(
      expect.anything(),
      "SearchRestaurants",
      expect.objectContaining({ query: "pizza", filter: "nuevos" }),
    );
  });

  it("GET /api/restaurants/:id/menu should list menu items", async () => {
    mockGrpcCall.mockResolvedValueOnce({
      items: [{ id: 1, name: "Margherita", price: 45.0 }],
    });
    const res = await request(app)
      .get("/api/restaurants/1/menu")
      .set("Authorization", `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  it("GET /api/restaurants/:id/promotions should list promotions", async () => {
    mockGrpcCall.mockResolvedValueOnce({
      promotions: [{ id: 1, title: "2x1" }],
    });
    const res = await request(app)
      .get("/api/restaurants/1/promotions")
      .set("Authorization", `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.promotions).toHaveLength(1);
  });

  it("POST /api/restaurants/:id/promotions should create promotion (RESTAURANTE)", async () => {
    mockGrpcCall.mockResolvedValueOnce({
      success: true,
      promotion: { id: 1, title: "Descuento" },
    });
    const res = await request(app)
      .post("/api/restaurants/1/promotions")
      .set("Authorization", `Bearer ${restaurantToken}`)
      .send({
        title: "Descuento",
        discount_type: "PORCENTAJE",
        discount_value: 20,
      });
    expect(res.status).toBe(201);
  });
});

// ========== ORDER ROUTES ==========
describe("Order Routes", () => {
  it("POST /api/orders should create order (CLIENTE)", async () => {
    mockGrpcCall.mockResolvedValueOnce({
      success: true,
      order: {
        id: 1,
        status: "CREADA",
        items: [{ name: "Item", quantity: 2, price: 30 }],
        total: 60,
        created_at: "2026-01-01",
      },
    });
    // Mock for fire-and-forget SendOrderCreated notification
    mockGrpcCall.mockResolvedValueOnce({ success: true });
    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${clientToken}`)
      .send({
        restaurant_id: 1,
        items: [{ menu_item_id: 1, quantity: 2, price: 30 }],
        delivery_address: "Zone 1",
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/orders/my should get client orders", async () => {
    mockGrpcCall.mockResolvedValueOnce({
      orders: [{ id: 1, status: "CREADA" }],
    });
    const res = await request(app)
      .get("/api/orders/my")
      .set("Authorization", `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.orders).toBeDefined();
  });

  it("PUT /api/orders/:id/status should update order status", async () => {
    mockGrpcCall.mockResolvedValueOnce({
      success: true,
      message: "Actualizado",
    });
    const res = await request(app)
      .put("/api/orders/1/status")
      .set("Authorization", `Bearer ${restaurantToken}`)
      .send({ status: "EN_PROCESO" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ========== PAYMENT ROUTES ==========
describe("Payment Routes", () => {
  it("POST /api/payments should process payment (CLIENTE)", async () => {
    mockGrpcCall.mockResolvedValueOnce({
      success: true,
      payment_id: 1,
      transaction_id: "TXN-1234",
      status: 1,
    });
    // Mock for fire-and-forget UpdateOrderStatus
    mockGrpcCall.mockResolvedValueOnce({ success: true });
    const res = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${clientToken}`)
      .send({
        order_id: 1,
        payment_type: "TARJETA_CREDITO",
        card_number: "4111111111111111",
        card_holder: "TEST",
        card_expiry: "12/26",
        card_cvv: "123",
        amount: 100,
        currency: "GTQ",
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("POST /api/payments should reject missing fields", async () => {
    const res = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${clientToken}`)
      .send({ order_id: 1 });
    expect(res.status).toBe(400);
  });

  it("POST /api/payments should reject invalid payment type", async () => {
    const res = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${clientToken}`)
      .send({ order_id: 1, payment_type: "BITCOIN", amount: 100 });
    expect(res.status).toBe(400);
  });

  it("POST /api/payments should convert currency via FX", async () => {
    // FX call
    mockGrpcCall.mockResolvedValueOnce({
      rate: 7.65,
      converted_amount: 765,
    });
    // Payment call
    mockGrpcCall.mockResolvedValueOnce({
      success: true,
      payment_id: 1,
      transaction_id: "TXN-5678",
    });
    // Mock for fire-and-forget UpdateOrderStatus
    mockGrpcCall.mockResolvedValueOnce({ success: true });
    const res = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${clientToken}`)
      .send({
        order_id: 2,
        payment_type: "TARJETA_CREDITO",
        card_number: "4111111111111111",
        card_holder: "TEST",
        card_expiry: "12/26",
        card_cvv: "123",
        amount: 100,
        currency: "USD",
      });
    expect(res.status).toBe(200);
    expect(mockGrpcCall).toHaveBeenCalledWith(
      expect.anything(),
      "GetExchangeRate",
      expect.objectContaining({ from_currency: "USD", to_currency: "GTQ" }),
    );
  });

  it("GET /api/payments/wallet should get wallet balance (CLIENTE)", async () => {
    mockGrpcCall.mockResolvedValueOnce({
      success: true,
      balance: 500.0,
      wallet_id: 1,
    });
    const res = await request(app)
      .get("/api/payments/wallet")
      .set("Authorization", `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.balance).toBe(500);
  });

  it("POST /api/payments/wallet/recharge should recharge wallet", async () => {
    mockGrpcCall.mockResolvedValueOnce({
      success: true,
      message: "Recargada",
      balance: 600,
    });
    const res = await request(app)
      .post("/api/payments/wallet/recharge")
      .set("Authorization", `Bearer ${clientToken}`)
      .send({ amount: 100 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("POST /api/payments/wallet/recharge should reject invalid amount", async () => {
    const res = await request(app)
      .post("/api/payments/wallet/recharge")
      .set("Authorization", `Bearer ${clientToken}`)
      .send({ amount: -10 });
    expect(res.status).toBe(400);
  });

  it("GET /api/payments/all should list payments (ADMIN only)", async () => {
    mockGrpcCall.mockResolvedValueOnce({
      success: true,
      payments: [],
      total: 0,
    });
    const res = await request(app)
      .get("/api/payments/all")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it("GET /api/payments/all should deny CLIENTE", async () => {
    const res = await request(app)
      .get("/api/payments/all")
      .set("Authorization", `Bearer ${clientToken}`);
    expect(res.status).toBe(403);
  });

  it("POST /api/payments/coupons should create coupon (ADMIN)", async () => {
    mockGrpcCall.mockResolvedValueOnce({
      success: true,
      coupon: { id: 1, code: "TEST20" },
    });
    const res = await request(app)
      .post("/api/payments/coupons")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        code: "TEST20",
        discount_type: "PORCENTAJE",
        discount_value: 20,
      });
    expect(res.status).toBe(201);
  });

  it("POST /api/payments/coupons/validate should validate coupon (CLIENTE)", async () => {
    mockGrpcCall.mockResolvedValueOnce({
      valid: true,
      discount_amount: 20,
      final_amount: 80,
    });
    const res = await request(app)
      .post("/api/payments/coupons/validate")
      .set("Authorization", `Bearer ${clientToken}`)
      .send({ code: "TEST20", order_amount: 100 });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
  });
});

// ========== FX ROUTES ==========
describe("FX Routes", () => {
  it("GET /api/fx/rate should return exchange rate", async () => {
    mockGrpcCall.mockResolvedValueOnce({
      success: true,
      rate: 7.65,
      converted_amount: 765,
      from_currency: "USD",
      to_currency: "GTQ",
    });
    const res = await request(app)
      .get("/api/fx/rate?from=USD&to=GTQ&amount=100")
      .set("Authorization", `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.rate).toBe(7.65);
  });

  it("GET /api/fx/rates should return multiple rates", async () => {
    mockGrpcCall.mockResolvedValueOnce({
      success: true,
      rates: [{ currency: "USD", rate: 0.13 }],
    });
    const res = await request(app)
      .get("/api/fx/rates?base=GTQ&currencies=USD,EUR")
      .set("Authorization", `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
  });
});

// ========== RATING ROUTES ==========
describe("Rating Routes", () => {
  it("POST /api/ratings should create rating (CLIENTE)", async () => {
    mockGrpcCall.mockResolvedValueOnce({
      success: true,
      message: "Calificación creada",
    });
    const res = await request(app)
      .post("/api/ratings")
      .set("Authorization", `Bearer ${clientToken}`)
      .send({
        order_id: 1,
        entity_type: "RESTAURANTE",
        entity_id: 1,
        stars: 5,
        comment: "Excelente",
      });
    expect(res.status).toBe(201);
  });

  it("GET /api/ratings/average/:entityId should return average", async () => {
    mockGrpcCall.mockResolvedValueOnce({
      average_stars: 4.5,
      total_ratings: 10,
    });
    const res = await request(app)
      .get("/api/ratings/average/1")
      .set("Authorization", `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.average_stars).toBe(4.5);
  });
});

// ========== ERROR HANDLING ==========
describe("Error Handling", () => {
  it("should handle gRPC errors gracefully", async () => {
    mockGrpcCall.mockRejectedValueOnce(new Error("gRPC unavailable"));
    const res = await request(app)
      .get("/api/restaurants")
      .set("Authorization", `Bearer ${clientToken}`);
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it("should return 401 for expired tokens", async () => {
    const expiredToken = jwt.sign({ id: 1, role: "CLIENTE" }, JWT_SECRET, {
      expiresIn: "-1h",
    });
    const res = await request(app)
      .get("/api/restaurants")
      .set("Authorization", `Bearer ${expiredToken}`);
    expect(res.status).toBe(403);
  });
});
