/**
 * API Gateway - Middleware Unit Tests
 * Tests para autenticación JWT y autorización por roles
 */

const jwt = require("jsonwebtoken");

// Mock de jsonwebtoken
jest.mock("jsonwebtoken");

const { authenticateToken, authorizeRoles } = require("../src/middleware");

describe("API Gateway Middleware", () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = { headers: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  // ========== AUTHENTICATE TOKEN ==========
  describe("authenticateToken", () => {
    it("debe rechazar si no hay token", () => {
      authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Token de acceso requerido" }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("debe rechazar si solo dice 'Bearer' sin token", () => {
      mockReq.headers["authorization"] = "Bearer ";
      authenticateToken(mockReq, mockRes, mockNext);

      // "Bearer ".split(" ")[1] = "" que es falsy
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("debe aceptar un token válido y setear req.user", () => {
      const decodedUser = {
        id: 1,
        email: "test@test.com",
        role: "CLIENTE",
        name: "Test",
      };
      jwt.verify.mockReturnValueOnce(decodedUser);
      mockReq.headers["authorization"] = "Bearer valid.token.here";

      authenticateToken(mockReq, mockRes, mockNext);

      expect(jwt.verify).toHaveBeenCalledWith(
        "valid.token.here",
        expect.any(String),
      );
      expect(mockReq.user).toEqual(decodedUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it("debe rechazar token expirado/inválido", () => {
      jwt.verify.mockImplementationOnce(() => {
        throw new Error("jwt expired");
      });
      mockReq.headers["authorization"] = "Bearer expired.token";

      authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Token inválido o expirado" }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // ========== AUTHORIZE ROLES ==========
  describe("authorizeRoles", () => {
    it("debe permitir acceso al rol correcto", () => {
      mockReq.user = { id: 1, role: "ADMINISTRADOR" };
      const middleware = authorizeRoles("ADMINISTRADOR");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("debe permitir acceso con múltiples roles permitidos", () => {
      mockReq.user = { id: 1, role: "CLIENTE" };
      const middleware = authorizeRoles("CLIENTE", "ADMINISTRADOR");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("debe denegar acceso a rol no autorizado", () => {
      mockReq.user = { id: 1, role: "CLIENTE" };
      const middleware = authorizeRoles("ADMINISTRADOR");

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "No tienes permisos para esta acción",
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("debe denegar acceso si no hay user en req", () => {
      mockReq.user = null;
      const middleware = authorizeRoles("CLIENTE");

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("debe manejar todos los roles del sistema", () => {
      const roles = ["CLIENTE", "RESTAURANTE", "REPARTIDOR", "ADMINISTRADOR"];
      roles.forEach((role) => {
        const req = { user: { id: 1, role } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();
        const middleware = authorizeRoles(role);

        middleware(req, res, next);
        expect(next).toHaveBeenCalled();
      });
    });
  });
});
