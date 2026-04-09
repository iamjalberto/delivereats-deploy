/**
 * Notification Service - Unit Tests
 * Tests para envío de notificaciones por email (orden creada, cancelada, en camino, etc.)
 */

// Mock de nodemailer
const mockSendMail = jest.fn().mockResolvedValue({ messageId: "mock-id" });
jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

const handlers = require("../src/handlers");

describe("Notification Service Handlers", () => {
  let mockCallback;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCallback = jest.fn();
  });

  // ========== SEND ORDER CREATED ==========
  describe("sendOrderCreated", () => {
    it("debe enviar notificación de orden creada", async () => {
      await handlers.sendOrderCreated(
        {
          request: {
            client_name: "Juan",
            client_email: "juan@test.com",
            order_id: 1,
            products: [{ name: "Pollo Frito", quantity: 2, price: 75 }],
            total: 150,
            created_at: "2026-01-01 12:00:00",
            status: "CREADA",
          },
        },
        mockCallback,
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "juan@test.com",
          subject: expect.stringContaining("Creado"),
        }),
      );
      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: true,
          message: "Notificación de orden creada enviada",
        }),
      );
    });

    it("debe incluir productos en el email", async () => {
      await handlers.sendOrderCreated(
        {
          request: {
            client_name: "Ana",
            client_email: "ana@test.com",
            order_id: 5,
            products: [
              { name: "Hamburguesa", quantity: 1, price: 50 },
              { name: "Papas", quantity: 2, price: 20 },
            ],
            total: 90,
            created_at: "2026-01-01",
            status: "CREADA",
          },
        },
        mockCallback,
      );

      const htmlArg = mockSendMail.mock.calls[0][0].html;
      expect(htmlArg).toContain("Hamburguesa");
      expect(htmlArg).toContain("Papas");
    });

    it("debe manejar fallo de envío sin error", async () => {
      mockSendMail.mockRejectedValueOnce(new Error("SMTP error"));

      await handlers.sendOrderCreated(
        {
          request: {
            client_name: "Test",
            client_email: "test@test.com",
            order_id: 1,
            products: [],
            total: 0,
            created_at: "",
            status: "CREADA",
          },
        },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({ success: true }),
      );
    });
  });

  // ========== SEND ORDER CANCELLED BY CLIENT ==========
  describe("sendOrderCancelledByClient", () => {
    it("debe enviar notificación de cancelación por cliente", async () => {
      await handlers.sendOrderCancelledByClient(
        {
          request: {
            client_name: "Juan",
            client_email: "juan@test.com",
            order_id: 1,
            products: [{ name: "Pizza", quantity: 1, price: 80 }],
            cancelled_at: "2026-01-01 13:00:00",
            status: "CANCELADA",
          },
        },
        mockCallback,
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "juan@test.com",
          subject: expect.stringContaining("Cancelado"),
        }),
      );
      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: true,
          message: "Notificación de cancelación enviada",
        }),
      );
    });
  });

  // ========== SEND ORDER IN ROUTE ==========
  describe("sendOrderInRoute", () => {
    it("debe enviar notificación de pedido en camino", async () => {
      await handlers.sendOrderInRoute(
        {
          request: {
            client_email: "juan@test.com",
            order_id: 1,
            delivery_person_name: "Carlos",
            products: [{ name: "Sushi", quantity: 3, price: 60 }],
            status: "EN_CAMINO",
          },
        },
        mockCallback,
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "juan@test.com",
          subject: expect.stringContaining("En Camino"),
        }),
      );
      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: true,
          message: "Notificación de envío enviada",
        }),
      );
    });

    it("debe incluir nombre del repartidor en el email", async () => {
      await handlers.sendOrderInRoute(
        {
          request: {
            client_email: "test@test.com",
            order_id: 1,
            delivery_person_name: "Pedro Repartidor",
            products: [],
            status: "EN_CAMINO",
          },
        },
        mockCallback,
      );

      const htmlArg = mockSendMail.mock.calls[0][0].html;
      expect(htmlArg).toContain("Pedro Repartidor");
    });
  });

  // ========== SEND ORDER CANCELLED BY RESTAURANT ==========
  describe("sendOrderCancelledByRestaurant", () => {
    it("debe enviar notificación de cancelación por restaurante", async () => {
      await handlers.sendOrderCancelledByRestaurant(
        {
          request: {
            client_email: "juan@test.com",
            cancelled_by_name: "Pollo Campero",
            cancelled_by_role: "RESTAURANTE",
            reason: "Sin stock",
            order_id: 1,
            products: [{ name: "Pollo", quantity: 1, price: 75 }],
            status: "CANCELADA",
          },
        },
        mockCallback,
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "juan@test.com",
          subject: expect.stringContaining("Restaurante"),
        }),
      );
      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: true,
          message: "Notificación de cancelación por restaurante enviada",
        }),
      );
    });

    it("debe incluir razón de cancelación en el email", async () => {
      await handlers.sendOrderCancelledByRestaurant(
        {
          request: {
            client_email: "test@test.com",
            cancelled_by_name: "Resto",
            cancelled_by_role: "RESTAURANTE",
            reason: "Cerrado por mantenimiento",
            order_id: 1,
            products: [],
            status: "CANCELADA",
          },
        },
        mockCallback,
      );

      const htmlArg = mockSendMail.mock.calls[0][0].html;
      expect(htmlArg).toContain("Cerrado por mantenimiento");
    });
  });

  // ========== SEND ORDER CANCELLED BY DELIVERY ==========
  describe("sendOrderCancelledByDelivery", () => {
    it("debe enviar notificación de cancelación por repartidor", async () => {
      await handlers.sendOrderCancelledByDelivery(
        {
          request: {
            client_email: "juan@test.com",
            cancelled_by_name: "Carlos",
            cancelled_by_role: "REPARTIDOR",
            reason: "Accidente en ruta",
            order_id: 1,
            products: [{ name: "Tacos", quantity: 4, price: 15 }],
            status: "CANCELADA",
          },
        },
        mockCallback,
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "juan@test.com",
          subject: expect.stringContaining("Repartidor"),
        }),
      );
      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: true,
          message: "Notificación de cancelación por repartidor enviada",
        }),
      );
    });
  });

  // ========== SEND ORDER REJECTED ==========
  describe("sendOrderRejected", () => {
    it("debe enviar notificación de rechazo", async () => {
      await handlers.sendOrderRejected(
        {
          request: {
            client_email: "juan@test.com",
            restaurant_name: "Burger King",
            order_id: 1,
            products: [{ name: "Whopper", quantity: 1, price: 55 }],
            status: "RECHAZADA",
          },
        },
        mockCallback,
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "juan@test.com",
          subject: expect.stringContaining("Rechazado"),
        }),
      );
      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: true,
          message: "Notificación de rechazo enviada",
        }),
      );
    });

    it("debe incluir nombre del restaurante en el email", async () => {
      await handlers.sendOrderRejected(
        {
          request: {
            client_email: "test@test.com",
            restaurant_name: "Taco Bell",
            order_id: 5,
            products: [],
            status: "RECHAZADA",
          },
        },
        mockCallback,
      );

      const htmlArg = mockSendMail.mock.calls[0][0].html;
      expect(htmlArg).toContain("Taco Bell");
    });
  });
});
