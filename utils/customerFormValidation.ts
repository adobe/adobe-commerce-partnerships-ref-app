// Customer form validation utilities for Spectrum 2 TextField
import { REQUIRED_CUSTOMER_FIELDS } from './constants';

// Validation errors object type
export interface ValidationErrors {
  [key: string]: boolean;
}

/**
 * Validates company name field
 * @param value - The company name value to validate
 * @returns Error message string or null if valid
 */
export const validateCompanyName = (value: string): string | null => {
  if (!value || value.trim() === '') {
    return 'Enter the customer name';
  }
  return null;
};

/**
 * Validates address field
 * @param value - The address value to validate
 * @returns Error message string or null if valid
 */
export const validateAddress = (value: string): string | null => {
  if (!value || value.trim() === '') {
    return 'Enter customer address';
  }
  return null;
};

/**
 * Validates city field
 * @param value - The city value to validate
 * @returns Error message string or null if valid
 */
export const validateCity = (value: string): string | null => {
  if (!value || value.trim() === '') {
    return 'Enter city';
  }
  return null;
};

/**
 * Validates postal code field
 * @param value - The postal code value to validate
 * @returns Error message string or null if valid
 */
export const validatePostalCode = (value: string): string | null => {
  if (!value || value.trim() === '') {
    return 'Enter a postal code';
  }
  return null;
};

/**
 * Validates admin email field
 * @param value - The admin email value to validate
 * @returns Error message string or null if valid
 */
export const validateAdminEmail = (value: string): string | null => {
  if (!value || value.trim() === '') {
    return 'Enter the admin email address';
  }
  return null;
};

/**
 * Validates admin first name field
 * @param value - The admin first name value to validate
 * @returns Error message string or null if valid
 */
export const validateAdminFirstName = (value: string): string | null => {
  if (!value || value.trim() === '') {
    return 'Enter the admin first name';
  }
  return null;
};

/**
 * Validates admin last name field
 * @param value - The admin last name value to validate
 * @returns Error message string or null if valid
 */
export const validateAdminLastName = (value: string): string | null => {
  if (!value || value.trim() === '') {
    return 'Enter the admin last name';
  }
  return null;
};

/**
 * Validates reseller ID field
 * @param value - The reseller ID value to validate
 * @returns Error message string or null if valid
 */
export const validateResellerId = (value: string): string | null => {
  if (!value || value.trim() === '') {
    return 'Enter a Reseller ID';
  }
  return null;
};

/**
 * Validates country field
 * @param value - The country value to validate
 * @returns Error message string or null if valid
 */
export const validateCountry = (value: string): string | null => {
  if (!value || value.trim() === '') {
    return 'Select a country';
  }
  return null;
};

/**
 * Validates region/state field
 * @param value - The region/state value to validate
 * @returns Error message string or null if valid
 */
export const validateRegion = (value: string): string | null => {
  if (!value || value.trim() === '') {
    return 'Select a state/province';
  }
  return null;
};

/**
 * Validates all required customer fields
 * @param data - The customer data object to validate
 * @returns Object with validation errors (field name as key, true if error exists)
 */
export const validateRequiredFields = (data: Record<string, any>): ValidationErrors => {
  const errors: ValidationErrors = {};

  REQUIRED_CUSTOMER_FIELDS.forEach(field => {
    const value = data[field];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      errors[field] = true;
    }
  });

  return errors;
};
