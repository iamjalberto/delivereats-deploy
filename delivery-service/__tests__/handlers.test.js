/**
 * Delivery Service - Unit Tests
 * Tests para aceptar pedidos, actualizar estado, evidencia y consultas
 */

// Mock de pg
const mockQuery = jest.fn();
jest.mock("../src/db", () => ({
  pool: { query: mockQuery },
}));

// Mock de gRPC y proto-loader para evitar conexión real
const mockUpdateOrderStatus = jest.fn();
const mockCancelOrder = jest.fn();
jest.mock("@grpc/grpc-js", () => ({
  credentials: { createInsecure: jest.fn() },
  loadPackageDefinition: jest.fn(() => ({
    order: {
      OrderService: jest.fn(() => ({
        UpdateOrderStatus: mockUpdateOrderStatus,
        CancelOrder: mockCancelOrder,
        ListReadyOrders: jest.fn(),
      })),
    },
  })),
}));
jest.mock("@grpc/proto-loader", () => ({
  loadSync: jest.fn(() => ({})),
}));

const handlers = require("../src/handlers");

describe("Delivery Service Handlers", () => {
  let mockCallback;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCallback = jest.fn();
  });

  // ========== ACCEPT ORDER ==========
  describe("acceptOrder", () => {
    it("debe aceptar un pedido exitosamente", async () => {
      const delivery = {
        id: 1,
        order_id: 10,
        delivery_person_id: 5,
        delivery_person_name: "Carlos",
        status: "EN_CAMINO",
        accepted_at: new Date(),
        delivered_at: null,
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // no existe entrega previa
        .mockResolvedValueOnce({ rows: [delivery] }); // INSERT

      mockUpdateOrderStatus.mockImplementation((req, cb) => cb(null, {}));

      await handlers.acceptOrder(
        {
          request: {
            order_id: 10,
            delivery_person_id: 5,
            delivery_person_name: "Carlos",
          },
        },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: true,
          message: "Pedido aceptado, en camino",
        }),
      );
    });

    it("debe rechazar si la orden ya fue aceptada", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // ya existe

      await handlers.acceptOrder(
        {
          request: {
            order_id: 10,
            delivery_person_id: 5,
            delivery_person_name: "Carlos",
          },
        },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: false,
          message: "Esta orden ya fue aceptada por otro repartidor",
        }),
      );
    });

    it("debe manejar errores de base de datos", async () => {
      mockQuery.mockRejectedValueOnce(new Error("DB error"));

      await handlers.acceptOrder(
        {
          request: {
            order_id: 10,
            delivery_person_id: 5,
            delivery_person_name: "Carlos",
          },
        },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: false,
          message: "Error al aceptar pedido",
        }),
      );
    });
  });

  // ========== UPDATE DELIVERY STATUS ==========
  describe("updateDeliveryStatus", () => {
    it("debe actualizar estado a ENTREGADA", async () => {
      const delivery = {
        id: 1,
        order_id: 10,
        delivery_person_id: 5,
        delivery_person_name: "Carlos",
        status: "ENTREGADA",
        accepted_at: new Date(),
        delivered_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [delivery] });
      mockUpdateOrderStatus.mockImplementation((req, cb) => cb(null, {}));

      await handlers.updateDeliveryStatus(
        {
          request: {
            order_id: 10,
            status: "ENTREGADA",
            delivery_person_id: 5,
            delivery_person_name: "Carlos",
          },
        },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: true,
          message: "Estado actualizado a ENTREGADA",
        }),
      );
    });

    it("debe manejar cancelación por repartidor", async () => {
      const delivery = {
        id: 1,
        order_id: 10,
        delivery_person_id: 5,
        delivery_person_name: "Carlos",
        status: "CANCELADA",
        accepted_at: new Date(),
        delivered_at: null,
      };

      mockQuery.mockResolvedValueOnce({ rows: [delivery] });
      mockCancelOrder.mockImplementation((req, cb) => cb(null, {}));

      await handlers.updateDeliveryStatus(
        {
          request: {
            order_id: 10,
            status: "CANCELADA",
            delivery_person_id: 5,
            delivery_person_name: "Carlos",
            reason: "No puedo llegar",
          },
        },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: true,
          message: "Estado actualizado a CANCELADA",
        }),
      );
    });

    it("debe retornar error si no se encuentra la entrega", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await handlers.updateDeliveryStatus(
        {
          request: {
            order_id: 999,
            status: "ENTREGADA",
            delivery_person_id: 5,
            delivery_person_name: "Carlos",
          },
        },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: false,
          message: "Entrega no encontrada",
        }),
      );
    });

    it("debe manejar errores de base de datos", async () => {
      mockQuery.mockRejectedValueOnce(new Error("DB error"));

      await handlers.updateDeliveryStatus(
        {
          request: {
            order_id: 10,
            status: "ENTREGADA",
            delivery_person_id: 5,
            delivery_person_name: "Carlos",
          },
        },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: false,
          message: "Error al actualizar estado",
        }),
      );
    });
  });

  // ========== GET DELIVERY BY ORDER ==========
  describe("getDeliveryByOrder", () => {
    it("debe obtener entrega existente", async () => {
      const delivery = {
        id: 1,
        order_id: 10,
        delivery_person_id: 5,
        delivery_person_name: "Carlos",
        status: "EN_CAMINO",
        accepted_at: new Date(),
        delivered_at: null,
      };

      mockQuery.mockResolvedValueOnce({ rows: [delivery] });

      await handlers.getDeliveryByOrder(
        { request: { order_id: 10 } },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: true,
          message: "OK",
          delivery: expect.objectContaining({ order_id: 10 }),
        }),
      );
    });

    it("debe retornar error si no hay entrega", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await handlers.getDeliveryByOrder(
        { request: { order_id: 999 } },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: false,
          message: "No hay entrega para esta orden",
        }),
      );
    });

    it("debe manejar errores internos", async () => {
      mockQuery.mockRejectedValueOnce(new Error("DB error"));

      await handlers.getDeliveryByOrder(
        { request: { order_id: 10 } },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: false,
          message: "Error interno",
        }),
      );
    });
  });

  // ========== LIST MY DELIVERIES ==========
  describe("listMyDeliveries", () => {
    it("debe listar entregas del repartidor", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            order_id: 10,
            delivery_person_id: 5,
            delivery_person_name: "Carlos",
            status: "ENTREGADA",
            accepted_at: new Date(),
            delivered_at: new Date(),
          },
        ],
      });

      await handlers.listMyDeliveries(
        { request: { delivery_person_id: 5 } },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(null, {
        deliveries: expect.arrayContaining([
          expect.objectContaining({ order_id: 10, status: "ENTREGADA" }),
        ]),
      });
    });

    it("debe retornar lista vacía si no hay entregas", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await handlers.listMyDeliveries(
        { request: { delivery_person_id: 99 } },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(null, { deliveries: [] });
    });
  });

  // ========== UPLOAD EVIDENCE ==========
  describe("uploadEvidence", () => {
    it("debe registrar evidencia exitosamente", async () => {
      const evidence = {
        id: 1,
        delivery_id: 1,
        order_id: 10,
        driver_id: 5,
        photo_path: "/uploads/foto.jpg",
        photo_original_name: "foto.jpg",
        photo_mime_type: "image/jpeg",
        photo_size_bytes: 1024,
        notes: "Entregado en puerta",
        uploaded_at: new Date(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // delivery exists
        .mockResolvedValueOnce({ rows: [] }) // no existing evidence
        .mockResolvedValueOnce({ rows: [evidence] }) // INSERT evidence
        .mockResolvedValueOnce(null); // UPDATE delivery status

      mockUpdateOrderStatus.mockImplementation((req, cb) => cb(null, {}));

      await handlers.uploadEvidence(
        {
          request: {
            order_id: 10,
            delivery_id: 1,
            driver_id: 5,
            photo_path: "/uploads/foto.jpg",
            photo_original_name: "foto.jpg",
            photo_mime_type: "image/jpeg",
            photo_size_bytes: 1024,
            notes: "Entregado en puerta",
          },
        },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: true,
          message: "Evidencia registrada exitosamente",
        }),
      );
    });

    it("debe rechazar si la entrega no existe", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // delivery not found

      await handlers.uploadEvidence(
        {
          request: {
            order_id: 10,
            delivery_id: 999,
            driver_id: 5,
            photo_path: "/uploads/foto.jpg",
            photo_original_name: "foto.jpg",
            photo_mime_type: "image/jpeg",
            photo_size_bytes: 1024,
            notes: "",
          },
        },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: false,
          message: "Entrega no encontrada",
        }),
      );
    });

    it("debe rechazar si ya existe evidencia", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // delivery exists
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // evidence already exists

      await handlers.uploadEvidence(
        {
          request: {
            order_id: 10,
            delivery_id: 1,
            driver_id: 5,
            photo_path: "/uploads/foto.jpg",
            photo_original_name: "foto.jpg",
            photo_mime_type: "image/jpeg",
            photo_size_bytes: 1024,
            notes: "",
          },
        },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: false,
          message: "Ya existe evidencia para esta entrega",
        }),
      );
    });
  });

  // ========== GET EVIDENCE ==========
  describe("getEvidence", () => {
    it("debe obtener evidencia existente", async () => {
      const evidence = {
        id: 1,
        delivery_id: 1,
        order_id: 10,
        driver_id: 5,
        photo_path: "/uploads/foto.jpg",
        photo_original_name: "foto.jpg",
        photo_mime_type: "image/jpeg",
        photo_size_bytes: 1024,
        notes: "Puerta",
        uploaded_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [evidence] });

      await handlers.getEvidence({ request: { order_id: 10 } }, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: true,
          message: "Evidencia encontrada",
        }),
      );
    });

    it("debe retornar error si no hay evidencia", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await handlers.getEvidence({ request: { order_id: 999 } }, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: false,
          message: "No hay evidencia para esta orden",
        }),
      );
    });
  });

  // ========== LIST DELIVERED ORDERS ==========
  describe("listDeliveredOrders", () => {
    it("debe listar todas las entregas", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            order_id: 10,
            delivery_person_id: 5,
            delivery_person_name: "Carlos",
            status: "ENTREGADA",
            accepted_at: new Date(),
            delivered_at: new Date(),
            evidence_id: 1,
          },
        ],
      });

      await handlers.listDeliveredOrders({ request: {} }, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        deliveries: expect.arrayContaining([
          expect.objectContaining({ order_id: 10, status: "ENTREGADA" }),
        ]),
      });
    });

    it("debe retornar lista vacía si no hay entregas", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await handlers.listDeliveredOrders({ request: {} }, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, { deliveries: [] });
    });
  });
});
