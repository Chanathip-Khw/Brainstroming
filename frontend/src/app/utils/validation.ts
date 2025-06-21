/**
 * Validates email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates if string is not empty after trimming
 */
export const isNotEmpty = (value: string): boolean => {
  return value.trim().length > 0;
};

/**
 * Validates string length within bounds
 */
export const isValidLength = (
  value: string,
  min: number = 0,
  max: number = Infinity
): boolean => {
  const length = value.trim().length;
  return length >= min && length <= max;
};

/**
 * Validates if value is a valid URL
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validates if value is a valid number within range
 */
export const isValidNumber = (
  value: any,
  min: number = -Infinity,
  max: number = Infinity
): boolean => {
  const num = Number(value);
  return !isNaN(num) && num >= min && num <= max;
};

/**
 * Validates hex color format
 */
export const isValidHexColor = (color: string): boolean => {
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexColorRegex.test(color);
};

/**
 * Validates element position values
 */
export const isValidPosition = (x: any, y: any): boolean => {
  return isValidNumber(x) && isValidNumber(y);
};

/**
 * Validates element size values
 */
export const isValidSize = (width: any, height: any): boolean => {
  return isValidNumber(width, 1) && isValidNumber(height, 1);
};

/**
 * Generic validation function
 */
export interface ValidationRule<T> {
  validator: (value: T) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validate = <T>(
  value: T,
  rules: ValidationRule<T>[]
): ValidationResult => {
  const errors: string[] = [];

  for (const rule of rules) {
    if (!rule.validator(value)) {
      errors.push(rule.message);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates canvas element data
 */
export const validateCanvasElement = (element: any): ValidationResult => {
  const rules: ValidationRule<any>[] = [
    {
      validator: el => isNotEmpty(el.type),
      message: 'Element type is required',
    },
    {
      validator: el => isValidPosition(el.positionX, el.positionY),
      message: 'Invalid element position',
    },
    {
      validator: el => isValidSize(el.width, el.height),
      message: 'Invalid element size',
    },
    {
      validator: el =>
        !el.styleData?.color || isValidHexColor(el.styleData.color),
      message: 'Invalid color format',
    },
  ];

  return validate(element, rules);
};
