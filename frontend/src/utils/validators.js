/**
 * Utilidades de validación para formularios de Delivereats.
 * Cada función retorna un string de error o null si es válido.
 */

export const validateEmail = (email) => {
  if (!email || !email.trim()) return "El correo electrónico es obligatorio";
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email.trim())) return "El formato del correo no es válido";
  return null;
};

export const validatePassword = (password) => {
  if (!password) return "La contraseña es obligatoria";
  if (password.length < 6)
    return "La contraseña debe tener al menos 6 caracteres";
  if (!/[A-Z]/.test(password))
    return "La contraseña debe incluir al menos una letra mayúscula";
  if (!/[0-9]/.test(password))
    return "La contraseña debe incluir al menos un número";
  return null;
};

export const validateName = (name) => {
  if (!name || !name.trim()) return "El nombre es obligatorio";
  if (name.trim().length < 3)
    return "El nombre debe tener al menos 3 caracteres";
  return null;
};

export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === "string" && !value.trim()))
    return `${fieldName} es obligatorio`;
  return null;
};

export const validatePrice = (price) => {
  if (price === "" || price === null || price === undefined)
    return "El precio es obligatorio";
  const num = parseFloat(price);
  if (isNaN(num)) return "El precio debe ser un número válido";
  if (num <= 0) return "El precio debe ser mayor a 0";
  return null;
};

export const validatePhone = (phone) => {
  if (!phone || !phone.trim()) return null; // teléfono es opcional
  const cleaned = phone.replace(/[\s\-().+]/g, "");
  if (!/^\d{7,15}$/.test(cleaned))
    return "El teléfono debe tener entre 7 y 15 dígitos";
  return null;
};

export const validateAddress = (address) => {
  if (!address || !address.trim())
    return "La dirección de entrega es obligatoria";
  if (address.trim().length < 10)
    return "La dirección debe tener al menos 10 caracteres para ser precisa";
  return null;
};

/**
 * Ejecuta un objeto de validaciones { campo: fn() }.
 * Retorna { valid: boolean, errors: { campo: 'mensaje' } }
 */
export const runValidations = (validations) => {
  const errors = {};
  for (const [field, errorMsg] of Object.entries(validations)) {
    if (errorMsg) errors[field] = errorMsg;
  }
  return { valid: Object.keys(errors).length === 0, errors };
};
