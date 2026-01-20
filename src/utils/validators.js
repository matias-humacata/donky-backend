/**
 * Utilidades de validación y sanitización
 */

/**
 * Valida formato de email
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  
  // Regex robusto para validación de email
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email.trim());
}

/**
 * Sanitiza string removiendo caracteres peligrosos
 */
function sanitizeString(str) {
  if (!str || typeof str !== 'string') return '';
  
  return str
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remover scripts
    .replace(/javascript:/gi, '') // Remover javascript:
    .replace(/on\w+\s*=/gi, ''); // Remover event handlers (onclick, onerror, etc.)
}

/**
 * Sanitiza objeto recursivamente
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === 'string') {
        sanitized[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object') {
        sanitized[key] = sanitizeObject(obj[key]);
      } else {
        sanitized[key] = obj[key];
      }
    }
  }
  return sanitized;
}

/**
 * Valida y sanitiza entrada de string
 */
function validateAndSanitizeString(str, minLength = 0, maxLength = 1000) {
  if (!str || typeof str !== 'string') return null;
  
  const sanitized = sanitizeString(str);
  
  if (sanitized.length < minLength || sanitized.length > maxLength) {
    return null;
  }
  
  return sanitized;
}

module.exports = {
  isValidEmail,
  sanitizeString,
  sanitizeObject,
  validateAndSanitizeString
};


