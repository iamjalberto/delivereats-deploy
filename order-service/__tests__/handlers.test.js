/**
 * Order Service - Unit Tests
 * Tests para máquina de estados, creación de órdenes y validaciones
 */

// Mock de pg
const mockQuery = jest.fn();
const mockConnect = jest.fn();
const mockRelease = jest.fn();
const mockClientQuery = jest.fn();
jest.mock("pg", () => ({
  Pool: jest.fn(() => ({
    query: mockQuery,
    connect: mockConnect.mockResolvedValue({
      query: mockClientQuery,
      release: mockRelease,
    }),
  })),
}));

// Mock de queue
jest.mock("../src/queue", () => ({
  publishNewOrder: jest.fn().mockResolvedValue(true),
  publishOrderCancelled: jest.fn().mockResolvedValue(true),
}));

const { publishNewOrder, publishOrderCancelled } = require("../src/queue");
const handlers = require("../src/handlers");

describe("Order Service Handlers", () => {
  let mockCallback;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCallback = jest.fn();
  });

  // ========== CREATE ORDER ==========
  describe("createOrder", () => {
    it("debe crear una orden exitosamente", async () => {
      const orderRow = {
        id: 1,
        client_id: 10,
        client_name: "Juan",
        client_email: "juan@test.com",
        restaurant_id: 5,
        restaurant_name: "Pollo Campero",
        total: "150.00",
        status: "CREADA",
        delivery_address: "Zona 1",
        delivery_person_id: null,
        delivery_person_name: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockClientQuery
        .mockResolvedValueOnce(null) // BEGIN
        .mockResolvedValueOnce({ rows: [orderRow] }) // INSERT order
        .mockResolvedValueOnce(null) // INSERT item 1
        .mockResolvedValueOnce(null); // COMMIT

      mockQuery.mockResolvedValueOnce({
        rows: [
          { menu_item_id: 1, name: "Pollo Frito", quantity: 2, price: "75.00" },
        ],
      });

      await handlers.createOrder(
        {
          request: {
            client_id: 10,
            client_name: "Juan",
            client_email: "juan@test.com",
            restaurant_id: 5,
            restaurant_name: "Pollo Campero",
            items: [
              { menu_item_id: 1, name: "Pollo Frito", quantity: 2, price: 75 },
            ],
            delivery_address: "Zona 1",
          },
        },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: true,
          message: "Orden creada exitosamente",
        }),
      );
      expect(publishNewOrder).toHaveBeenCalled();
    });

    it("debe hacer rollback si falla la inserción", async () => {
      mockClientQuery
        .mockResolvedValueOnce(null) // BEGIN
        .mockRejectedValueOnce(new Error("Insert failed")); // INSERT fails

      await handlers.createOrder(
        {
          request: {
            client_id: 10,
            client_name: "Juan",
            client_email: "juan@test.com",
            restaurant_id: 5,
            restaurant_name: "Resto",
            items: [{ menu_item_id: 1, name: "X", quantity: 1, price: 10 }],
            delivery_address: "Zona 1",
          },
        },
        mockCallback,
      );

      expect(mockClientQuery).toHaveBeenCalledWith("ROLLBACK");
      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: false,
        }),
      );
    });
  });

  // ========== GET ORDER ==========
  describe("getOrder", () => {
    it("debe obtener una orden existente", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              client_id: 10,
              client_name: "Juan",
              client_email: "j@t.com",
              restaurant_id: 5,
              restaurant_name: "Resto",
              total: "100.00",
              status: "CREADA",
              delivery_address: "Z1",
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }); // items

      await handlers.getOrder({ request: { id: 1 } }, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: true,
          order: expect.objectContaining({ id: 1 }),
        }),
      );
    });

    it("debe retornar error si la orden no existe", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await handlers.getOrder({ request: { id: 999 } }, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: false,
          message: "Orden no encontrada",
        }),
      );
    });
  });

  // ========== STATE MACHINE ==========
  describe("updateOrderStatus - State Machine", () => {
    const setupStatusTest = (currentStatus) => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ status: currentStatus }] }) // SELECT current
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              client_id: 10,
              client_name: "J",
              client_email: "j@t.com",
              restaurant_id: 5,
              restaurant_name: "R",
              total: "100.00",
              status: "",
              delivery_address: "Z1",
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        }) // UPDATE
        .mockResolvedValueOnce({ rows: [] }); // items
    };

    it("CREADA → EN_PROCESO debe ser válido", async () => {
      setupStatusTest("CREADA");
      await handlers.updateOrderStatus(
        {
          request: {
            id: 1,
            status: "EN_PROCESO",
            updated_by: 1,
            updated_by_role: "RESTAURANTE",
            updated_by_name: "R",
          },
        },
        mockCallback,
      );
      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({ success: true }),
      );
    });

    it("CREADA → PAGADA debe ser válido", async () => {
      setupStatusTest("CREADA");
      await handlers.updateOrderStatus(
        {
          request: {
            id: 1,
            status: "PAGADA",
            updated_by: 1,
            updated_by_role: "CLIENTE",
            updated_by_name: "C",
          },
        },
        mockCallback,
      );
      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({ success: true }),
      );
    });

    it("PAGADA → EN_PROCESO debe ser válido", async () => {
      setupStatusTest("PAGADA");
      await handlers.updateOrderStatus(
        {
          request: {
            id: 1,
            status: "EN_PROCESO",
            updated_by: 1,
            updated_by_role: "RESTAURANTE",
            updated_by_name: "R",
          },
        },
        mockCallback,
      );
      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({ success: true }),
      );
    });

    it("EN_PROCESO → LISTA debe ser válido", async () => {
      setupStatusTest("EN_PROCESO");
      await handlers.updateOrderStatus(
        {
          request: {
            id: 1,
            status: "LISTA",
            updated_by: 1,
            updated_by_role: "RESTAURANTE",
            updated_by_name: "R",
          },
        },
        mockCallback,
      );
      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({ success: true }),
      );
    });

    it("LISTA → EN_CAMINO debe ser válido", async () => {
      setupStatusTest("LISTA");
      await handlers.updateOrderStatus(
        {
          request: {
            id: 1,
            status: "EN_CAMINO",
            updated_by: 1,
            updated_by_role: "REPARTIDOR",
            updated_by_name: "D",
          },
        },
        mockCallback,
      );
      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({ success: true }),
      );
    });

    it("EN_CAMINO → ENTREGADA debe ser válido", async () => {
      setupStatusTest("EN_CAMINO");
      await handlers.updateOrderStatus(
        {
          request: {
            id: 1,
            status: "ENTREGADA",
            updated_by: 1,
            updated_by_role: "REPARTIDOR",
            updated_by_name: "D",
          },
        },
        mockCallback,
      );
      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({ success: true }),
      );
    });

    it("ENTREGADA → EN_PROCESO NO debe ser válido", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ status: "ENTREGADA" }] });

      await handlers.updateOrderStatus(
        {
          request: {
            id: 1,
            status: "EN_PROCESO",
            updated_by: 1,
            updated_by_role: "RESTAURANTE",
            updated_by_name: "R",
          },
        },
        mockCallback,
      );
      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: false,
          message: expect.stringContaining("No se puede cambiar"),
        }),
      );
    });

    it("CREADA → ENTREGADA NO debe ser válido (salto de estados)", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ status: "CREADA" }] });

      await handlers.updateOrderStatus(
        {
          request: {
            id: 1,
            status: "ENTREGADA",
            updated_by: 1,
            updated_by_role: "REPARTIDOR",
            updated_by_name: "D",
          },
        },
        mockCallback,
      );
      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({ success: false }),
      );
    });
  });

  // ========== CANCEL ORDER ==========
  describe("cancelOrder", () => {
    it("debe cancelar orden por CLIENTE", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              client_id: 10,
              client_name: "J",
              client_email: "j@t.com",
              restaurant_id: 5,
              restaurant_name: "R",
              total: "100.00",
              status: "CANCELADA",
              delivery_address: "Z1",
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }); // items

      await handlers.cancelOrder(
        {
          request: {
            id: 1,
            cancelled_by_role: "CLIENTE",
            cancelled_by_name: "Juan",
            reason: "Ya no quiero",
          },
        },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({ success: true }),
      );
      expect(publishOrderCancelled).toHaveBeenCalled();
    });

    it("debe rechazar orden por RESTAURANTE (estado RECHAZADA)", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              client_id: 10,
              client_name: "J",
              client_email: "j@t.com",
              restaurant_id: 5,
              restaurant_name: "R",
              total: "100.00",
              status: "RECHAZADA",
              delivery_address: "Z1",
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] });

      await handlers.cancelOrder(
        {
          request: {
            id: 1,
            cancelled_by_role: "RESTAURANTE",
            cancelled_by_name: "Resto",
            reason: "Sin stock",
          },
        },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: true,
          message: expect.stringContaining("rechazada"),
        }),
      );
    });
  });

  // ========== LIST ORDERS ==========
  describe("listOrdersByClient", () => {
    it("debe listar órdenes del cliente", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await handlers.listOrdersByClient(
        { request: { client_id: 10 } },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(null, { orders: [] });
    });
  });
});
