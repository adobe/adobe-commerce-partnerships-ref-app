/**
 * Utility functions for ThreeYearCommit component
 */

// Constants
export const MIN_LICENSES = 10;
export const MIN_CONSUMABLES = 1000;
export const ERROR_TOAST_DELAY = 10000;

/**
 * Safely parse a string to number
 * @param value - String value to parse
 * @returns Parsed number or 0 if invalid/empty
 */
export const parseNumber = (value: string): number => {
  const trimmed = value.trim();
  if (trimmed === '') return 0;
  const parsed = parseInt(trimmed, 10);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Extract error message from unknown error type
 * @param error - Error object or string
 * @returns Error message string
 */
export const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Failed to invite customer to 3YC. Please try again.';
};

/**
 * Build API URL for customer update
 * @param customerId - Customer ID
 * @returns Formatted API URL
 */
export const buildApiUrl = (customerId: string): string => {
  const params = new URLSearchParams({
    type: 'updateCustomer',
    customerId,
  });

  return `/api/customers?${params.toString()}`;
};

/**
 * Validation errors interface
 */
export interface ValidationErrors {
  licenses: string; // Empty string = no error, non-empty = error message
  consumables: string; // Empty string = no error, non-empty = error message
}

/**
 * Validate form fields and return validation state
 * @param licenses - Licenses input value
 * @param consumables - Consumables input value
 * @returns Object with validation errors and overall validity
 */
export const validateFormFields = (
  licenses: string,
  consumables: string
): { errors: ValidationErrors; isValid: boolean } => {
  const licensesNum = parseNumber(licenses);
  const consumablesNum = parseNumber(consumables);

  const licensesProvided = licenses.trim() !== '';
  const consumablesProvided = consumables.trim() !== '';

  // Validate based on what fields are provided
  let licensesValid = true;
  let consumablesValid = true;
  let isValid = false;

  if (licensesProvided && consumablesProvided) {
    // Both provided: both must meet their minimums
    licensesValid = licensesNum >= MIN_LICENSES;
    consumablesValid = consumablesNum >= MIN_CONSUMABLES;
    isValid = licensesValid && consumablesValid;
  } else if (licensesProvided) {
    // Only licenses provided: must meet minimum
    licensesValid = licensesNum >= MIN_LICENSES;
    isValid = licensesValid;
  } else if (consumablesProvided) {
    // Only consumables provided: must meet minimum
    consumablesValid = consumablesNum >= MIN_CONSUMABLES;
    isValid = consumablesValid;
  } else {
    // Neither provided: invalid
    isValid = false;
  }

  // Show errors only for fields that are provided and don't meet requirements
  const errors: ValidationErrors = {
    licenses: licensesProvided && !licensesValid ? `Minimum ${MIN_LICENSES} licenses required` : '',
    consumables:
      consumablesProvided && !consumablesValid
        ? `Minimum ${MIN_CONSUMABLES} consumables required`
        : '',
  };

  return { errors, isValid };
};

/**
 * Validate licenses field for Spectrum 2 TextField
 * @param value - Licenses input value
 * @returns Error message or undefined if valid
 */
export const validateLicensesField = (value: string): string | undefined => {
  const trimmed = value.trim();
  const num = parseNumber(value);

  // Only validate if licenses field has a value
  if (trimmed !== '') {
    if (num < MIN_LICENSES) {
      return `Minimum ${MIN_LICENSES} licenses required`;
    }
  }

  return undefined; // No error
};

/**
 * Validate consumables field for Spectrum 2 TextField
 * @param value - Consumables input value
 * @returns Error message or undefined if valid
 */
export const validateConsumablesField = (value: string): string | undefined => {
  const trimmed = value.trim();
  const num = parseNumber(value);

  // Only validate if consumables field has a value
  if (trimmed !== '') {
    if (num < MIN_CONSUMABLES) {
      return `Minimum ${MIN_CONSUMABLES} consumables required`;
    }
  }

  return undefined; // No error
};
