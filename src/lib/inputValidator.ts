/**
 * Input Validation & Sanitization Utility
 * Prevents SQL injection, XSS, and other security vulnerabilities
 */

export interface ValidationResult {
  isValid: boolean;
  sanitized: string;
  errors: string[];
}

export interface ValidationRules {
  maxLength?: number;
  minLength?: number;
  pattern?: RegExp;
  allowedCharacters?: RegExp;
  customValidators?: ((value: string) => { valid: boolean; error?: string })[];
}

/**
 * SQL Injection Prevention - Escapes dangerous characters
 */
export const escapeSQLString = (str: string): string => {
  if (!str) return "";
  return str
    .replace(/\\/g, "\\\\") // Escape backslashes first
    .replace(/'/g, "''") // Escape single quotes
    .replace(/"/g, '\\"') // Escape double quotes
    .replace(/\0/g, "\\0") // Escape null bytes
    .replace(/\n/g, "\\n") // Escape newlines
    .replace(/\r/g, "\\r") // Escape carriage returns
    // eslint-disable-next-line no-control-regex
    .replace(/\x1a/g, "\\Z"); // Escape Ctrl+Z
};

/**
 * XSS Prevention - Removes/encodes dangerous HTML characters
 */
export const sanitizeHTML = (str: string): string => {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
};

/**
 * Remove potentially dangerous scripts
 */
export const removeScriptTags = (str: string): string => {
  if (!str) return "";
  return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
};

/**
 * Validate and sanitize user input based on rules
 */
export const validateInput = (
  value: string,
  rules: ValidationRules = {},
): ValidationResult => {
  const errors: string[] = [];
  let sanitized = value.trim();

  // Check length constraints
  if (rules.minLength && sanitized.length < rules.minLength) {
    errors.push(`Minimum length is ${rules.minLength} characters`);
  }

  if (rules.maxLength && sanitized.length > rules.maxLength) {
    errors.push(`Maximum length is ${rules.maxLength} characters`);
    sanitized = sanitized.substring(0, rules.maxLength);
  }

  // Check pattern
  if (rules.pattern && !rules.pattern.test(sanitized)) {
    errors.push("Invalid format");
  }

  // Check allowed characters
  if (rules.allowedCharacters) {
    const invalidChars = sanitized.replace(rules.allowedCharacters, "");
    if (invalidChars.length > 0) {
      errors.push(`Contains invalid characters: ${invalidChars}`);
      sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_]/g, "");
    }
  }

  // Run custom validators
  if (rules.customValidators) {
    for (const validator of rules.customValidators) {
      const result = validator(sanitized);
      if (!result.valid && result.error) {
        errors.push(result.error);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    sanitized,
    errors,
  };
};

/**
 * Validate email addresses
 */
export const validateEmail = (email: string): ValidationResult => {
  const rules: ValidationRules = {
    maxLength: 254,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  };
  return validateInput(email, rules);
};

/**
 * Validate URLs
 */
export const validateURL = (url: string): ValidationResult => {
  const errors: string[] = [];
  const sanitized = url.trim();

  try {
    new URL(sanitized);
    return { isValid: true, sanitized, errors: [] };
  } catch {
    errors.push("Invalid URL format");
  }

  return { isValid: false, sanitized, errors };
};

/**
 * Validate phone numbers (basic international format)
 */
export const validatePhone = (phone: string): ValidationResult => {
  const rules: ValidationRules = {
    maxLength: 20,
    pattern: /^[\d\s+\-()]{7,20}$/,
  };
  return validateInput(phone, rules);
};

/**
 * Validate usernames/handles
 */
export const validateHandle = (handle: string): ValidationResult => {
  const rules: ValidationRules = {
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_-]+$/,
    allowedCharacters: /[a-zA-Z0-9_-]/g,
  };
  return validateInput(handle, rules);
};

/**
 * Validate event titles and names
 */
export const validateTitle = (title: string): ValidationResult => {
  const rules: ValidationRules = {
    minLength: 3,
    maxLength: 200,
  };
  return validateInput(title, rules);
};

/**
 * Validate descriptions/text areas (allow more characters but prevent scripts)
 */
export const validateDescription = (description: string): ValidationResult => {
  const rules: ValidationRules = {
    minLength: 1,
    maxLength: 5000,
    customValidators: [
      (value: string) => {
        const cleaned = removeScriptTags(value);
        return {
          valid: cleaned === value,
          error: "HTML script tags are not allowed",
        };
      },
    ],
  };
  return validateInput(description, rules);
};

/**
 * Validate slugs (URL-friendly)
 */
export const validateSlug = (slug: string): ValidationResult => {
  const rules: ValidationRules = {
    minLength: 3,
    maxLength: 100,
    pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/i,
  };
  return validateInput(slug, rules);
};

/**
 * Validate dates (ISO format)
 */
export const validateDate = (date: string): ValidationResult => {
  const errors: string[] = [];
  const sanitized = date.trim();

  try {
    const dateObj = new Date(sanitized);
    if (isNaN(dateObj.getTime())) {
      errors.push("Invalid date format");
    }
  } catch {
    errors.push("Invalid date format");
  }

  return {
    isValid: errors.length === 0,
    sanitized,
    errors,
  };
};

/**
 * Validate time (HH:mm format)
 */
export const validateTime = (time: string): ValidationResult => {
  const rules: ValidationRules = {
    pattern: /^([0-1]\d|2[0-3]):[0-5]\d$/,
  };
  return validateInput(time, rules);
};

/**
 * Sanitize form data object
 */
export const sanitizeFormData = <T extends Record<string, unknown>>(data: T): T => {
  const sanitized = { ...data };

  for (const key in sanitized) {
    const value = sanitized[key];

    if (typeof value === "string") {
      // Apply basic sanitization to all strings
      (sanitized[key] as any) = removeScriptTags(value.trim());
    } else if (Array.isArray(value)) {
      (sanitized[key] as any) = value.map((item) =>
        typeof item === "string" ? removeScriptTags(item.trim()) : item,
      );
    }
  }

  return sanitized;
};

/**
 * Validate user input for common fields
 */
export const validateUserInput = (
  field: "name" | "email" | "phone" | "handle" | "bio" | "url" | "slug",
  value: string,
): ValidationResult => {
  switch (field) {
    case "email":
      return validateEmail(value);
    case "phone":
      return validatePhone(value);
    case "handle":
      return validateHandle(value);
    case "bio":
      return validateDescription(value);
    case "url":
      return validateURL(value);
    case "slug":
      return validateSlug(value);
    case "name":
      return validateTitle(value);
    default:
      return { isValid: true, sanitized: value, errors: [] };
  }
};

/**
 * Check for SQL injection patterns
 */
export const detectSQLInjection = (input: string): boolean => {
  const sqlKeywords =
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bALTER\b|\bEXEC\b|\bEXECUTE\b|--|;|\/\*|\*\/|\bOR\b|\bAND\b)/gi;
  return sqlKeywords.test(input);
};

/**
 * Check for XSS patterns
 */
export const detectXSS = (input: string): boolean => {
  const xssPatterns =
    /<script|javascript:|on\w+\s*=|<iframe|<embed|<object|<img|<svg/gi;
  return xssPatterns.test(input);
};

/**
 * Comprehensive security check
 */
export const performSecurityCheck = (
  input: string,
  fieldType:
    | "name"
    | "email"
    | "phone"
    | "handle"
    | "bio"
    | "url"
    | "slug" = "name",
): {
  safe: boolean;
  threats: string[];
  sanitized: string;
} => {
  const threats: string[] = [];

  if (detectSQLInjection(input)) {
    threats.push("Potential SQL injection detected");
  }

  if (detectXSS(input)) {
    threats.push("Potential XSS attack detected");
  }

  const validation = validateUserInput(fieldType, input);
  if (!validation.isValid) {
    threats.push(...validation.errors);
  }

  return {
    safe: threats.length === 0,
    threats,
    sanitized: validation.sanitized,
  };
};

export default {
  escapeSQLString,
  sanitizeHTML,
  removeScriptTags,
  validateInput,
  validateEmail,
  validateURL,
  validatePhone,
  validateHandle,
  validateTitle,
  validateDescription,
  validateSlug,
  validateDate,
  validateTime,
  sanitizeFormData,
  validateUserInput,
  detectSQLInjection,
  detectXSS,
  performSecurityCheck,
};
