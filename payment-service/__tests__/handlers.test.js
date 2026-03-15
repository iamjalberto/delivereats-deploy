/**
 * Payment Service - Unit Tests
 * Tests para procesamiento de pagos simulados y cupones
 */

describe("Payment Service - Simulated Logic", () => {
  // Extraemos la lógica de simulación para testearla directamente
  function simulateCardPayment(cardNumber, amount) {
    const last4 = cardNumber.slice(-4);
    if (last4 === "0000") {
      return {
        approved: false,
        reason: "Tarjeta rechazada por el banco emisor",
      };
    }
    if (amount > 10000) {
      return {
        approved: false,
        reason: "Monto excede el límite permitido (Q10,000)",
      };
    }
    return { approved: true, reason: null };
  }

  function simulateWalletPayment(amount) {
    if (amount > 5000) {
      return {
        approved: false,
        reason: "Saldo insuficiente en cartera digital",
      };
    }
    return { approved: true, reason: null };
  }

  // ========== CARD PAYMENT ==========
  describe("simulateCardPayment", () => {
    it("debe aprobar tarjeta válida con monto razonable", () => {
      const result = simulateCardPayment("4111111111111111", 500);
      expect(result.approved).toBe(true);
      expect(result.reason).toBeNull();
    });

    it("debe rechazar tarjeta terminada en 0000", () => {
      const result = simulateCardPayment("4111111111110000", 100);
      expect(result.approved).toBe(false);
      expect(result.reason).toContain("rechazada");
    });

    it("debe rechazar monto mayor a Q10,000", () => {
      const result = simulateCardPayment("4111111111111111", 15000);
      expect(result.approved).toBe(false);
      expect(result.reason).toContain("excede");
    });

    it("debe aprobar monto exacto de Q10,000", () => {
      const result = simulateCardPayment("4111111111111111", 10000);
      expect(result.approved).toBe(true);
    });

    it("debe rechazar tarjeta en 0000 incluso con monto bajo", () => {
      const result = simulateCardPayment("1234567890120000", 1);
      expect(result.approved).toBe(false);
    });

    it("debe aprobar diferentes números de tarjeta válidos", () => {
      expect(simulateCardPayment("5555555555554444", 200).approved).toBe(true);
      expect(simulateCardPayment("378282246310005", 500).approved).toBe(true);
      expect(simulateCardPayment("6011111111111117", 1000).approved).toBe(true);
    });
  });

  // ========== WALLET PAYMENT ==========
  describe("simulateWalletPayment", () => {
    it("debe aprobar monto menor a Q5,000", () => {
      const result = simulateWalletPayment(2000);
      expect(result.approved).toBe(true);
    });

    it("debe rechazar monto mayor a Q5,000", () => {
      const result = simulateWalletPayment(7000);
      expect(result.approved).toBe(false);
      expect(result.reason).toContain("insuficiente");
    });

    it("debe aprobar monto exacto de Q5,000", () => {
      const result = simulateWalletPayment(5000);
      expect(result.approved).toBe(true);
    });

    it("debe aprobar monto mínimo", () => {
      const result = simulateWalletPayment(0.01);
      expect(result.approved).toBe(true);
    });
  });
});

describe("Payment Service - Coupon Logic", () => {
  function calculateDiscount(coupon, orderAmount) {
    if (!coupon.active) return { valid: false, discount: 0 };
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date())
      return { valid: false, discount: 0 };
    if (coupon.current_uses >= coupon.max_uses)
      return { valid: false, discount: 0 };
    if (orderAmount < coupon.min_order_amount)
      return { valid: false, discount: 0 };

    let discount = 0;
    if (coupon.discount_type === "PORCENTAJE") {
      discount = (orderAmount * coupon.discount_value) / 100;
      if (coupon.max_discount && discount > coupon.max_discount) {
        discount = coupon.max_discount;
      }
    } else {
      discount = coupon.discount_value;
    }
    return {
      valid: true,
      discount,
      finalAmount: Math.max(0, orderAmount - discount),
    };
  }

  it("debe aplicar descuento porcentual correctamente", () => {
    const coupon = {
      active: true,
      discount_type: "PORCENTAJE",
      discount_value: 10,
      min_order_amount: 0,
      max_discount: null,
      max_uses: 100,
      current_uses: 0,
    };
    const result = calculateDiscount(coupon, 200);
    expect(result.valid).toBe(true);
    expect(result.discount).toBe(20);
    expect(result.finalAmount).toBe(180);
  });

  it("debe respetar max_discount en porcentaje", () => {
    const coupon = {
      active: true,
      discount_type: "PORCENTAJE",
      discount_value: 50,
      min_order_amount: 0,
      max_discount: 100,
      max_uses: 100,
      current_uses: 0,
    };
    const result = calculateDiscount(coupon, 500);
    expect(result.discount).toBe(100); // 50% de 500 = 250, pero max es 100
    expect(result.finalAmount).toBe(400);
  });

  it("debe aplicar descuento de monto fijo", () => {
    const coupon = {
      active: true,
      discount_type: "MONTO_FIJO",
      discount_value: 50,
      min_order_amount: 0,
      max_discount: null,
      max_uses: 100,
      current_uses: 0,
    };
    const result = calculateDiscount(coupon, 200);
    expect(result.discount).toBe(50);
    expect(result.finalAmount).toBe(150);
  });

  it("debe rechazar cupón inactivo", () => {
    const coupon = {
      active: false,
      discount_type: "PORCENTAJE",
      discount_value: 10,
      min_order_amount: 0,
      max_uses: 100,
      current_uses: 0,
    };
    expect(calculateDiscount(coupon, 200).valid).toBe(false);
  });

  it("debe rechazar cupón agotado", () => {
    const coupon = {
      active: true,
      discount_type: "PORCENTAJE",
      discount_value: 10,
      min_order_amount: 0,
      max_uses: 5,
      current_uses: 5,
    };
    expect(calculateDiscount(coupon, 200).valid).toBe(false);
  });

  it("debe rechazar si monto no alcanza el mínimo", () => {
    const coupon = {
      active: true,
      discount_type: "PORCENTAJE",
      discount_value: 10,
      min_order_amount: 100,
      max_uses: 100,
      current_uses: 0,
    };
    expect(calculateDiscount(coupon, 50).valid).toBe(false);
  });

  it("debe rechazar cupón expirado", () => {
    const coupon = {
      active: true,
      discount_type: "PORCENTAJE",
      discount_value: 10,
      min_order_amount: 0,
      max_uses: 100,
      current_uses: 0,
      expires_at: "2020-01-01T00:00:00Z",
    };
    expect(calculateDiscount(coupon, 200).valid).toBe(false);
  });

  it("no debe dar descuento negativo", () => {
    const coupon = {
      active: true,
      discount_type: "MONTO_FIJO",
      discount_value: 500,
      min_order_amount: 0,
      max_uses: 100,
      current_uses: 0,
    };
    const result = calculateDiscount(coupon, 100);
    expect(result.finalAmount).toBe(0); // no negativo
  });
});

describe("Payment Type Mapping", () => {
  const PAYMENT_TYPE_MAP = {
    0: "TARJETA_CREDITO",
    1: "TARJETA_DEBITO",
    2: "CARTERA_DIGITAL",
    TARJETA_CREDITO: "TARJETA_CREDITO",
    TARJETA_DEBITO: "TARJETA_DEBITO",
    CARTERA_DIGITAL: "CARTERA_DIGITAL",
  };

  it("debe mapear enum numérico a string", () => {
    expect(PAYMENT_TYPE_MAP[0]).toBe("TARJETA_CREDITO");
    expect(PAYMENT_TYPE_MAP[1]).toBe("TARJETA_DEBITO");
    expect(PAYMENT_TYPE_MAP[2]).toBe("CARTERA_DIGITAL");
  });

  it("debe mapear string a string", () => {
    expect(PAYMENT_TYPE_MAP["TARJETA_CREDITO"]).toBe("TARJETA_CREDITO");
    expect(PAYMENT_TYPE_MAP["TARJETA_DEBITO"]).toBe("TARJETA_DEBITO");
    expect(PAYMENT_TYPE_MAP["CARTERA_DIGITAL"]).toBe("CARTERA_DIGITAL");
  });
});
