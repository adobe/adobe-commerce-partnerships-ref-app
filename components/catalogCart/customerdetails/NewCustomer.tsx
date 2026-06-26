import React, { useState, useEffect, useCallback } from 'react';
import { TextField, Checkbox, ProgressCircle, Form } from '@react-spectrum/s2';
import { useCart } from '../../../contexts/CartContext';
import { ErrorToast } from '../../../utils/ToastMessageUtils';
import { CUSTOMER_API_TYPE } from '../../../utils/constants';
import { generateExternalReferenceId } from '../../../utils/commonUtils';
import {
  validateCompanyName,
  validateAddress,
  validateCity,
  validatePostalCode,
  validateAdminEmail,
  validateAdminFirstName,
  validateAdminLastName,
  validateResellerId,
  validateCountry,
  validateRegion,
  validateRequiredFields,
  type ValidationErrors,
} from '../../../utils/customerFormValidation';
import ResellerSelector from '../../common/ResellerSelector';
import styles from './NewCustomer.module.css';

// TypeScript interfaces for better type safety
interface CreateCustomerFormData {
  companyName: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  resellerId: string;
  country: string;
  region: string;
  city: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  globalSales: boolean;
}

// Initial empty customer data
const INITIAL_CUSTOMER_DATA: CreateCustomerFormData = {
  companyName: '',
  adminEmail: '',
  adminFirstName: '',
  adminLastName: '',
  resellerId: '',
  country: '',
  region: '',
  city: '',
  addressLine1: '',
  addressLine2: '',
  postalCode: '',
  globalSales: false,
};

interface CreatedCustomer {
  customerId: string;
  resellerId: string;
  companyProfile: {
    companyName: string;
  };
  resellerName?: string;
}

interface NewCustomerProps {
  onCustomerCreate?: (customerData: CreatedCustomer) => void;
  onContinue?: () => void;
  onCreateCustomerRef?: (createFn: () => void) => void;
  onLoadingChange?: (isLoading: boolean) => void;
}

const NewCustomer: React.FC<NewCustomerProps> = ({
  onCustomerCreate,
  onContinue,
  onCreateCustomerRef,
  onLoadingChange,
}) => {
  const { setCustomerInfoInCart, cartItemIdToCartItemDetailsMap } = useCart();
  const [customerData, setCustomerData] = useState<CreateCustomerFormData>(INITIAL_CUSTOMER_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const handleInputChange = (field: keyof CreateCustomerFormData, value: string | boolean) => {
    setCustomerData(prev => {
      const newData = {
        ...prev,
        [field]: value,
      };

      // Clear region when country changes
      if (field === 'country') {
        newData.region = '';
      }

      return newData;
    });

    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: false,
      }));
    }
  };

  const createCustomer = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setShowErrorToast(false);
    setValidationErrors({});

    const validationErrors = validateRequiredFields(customerData);

    if (Object.keys(validationErrors).length > 0) {
      setValidationErrors(validationErrors);
      setIsLoading(false);
      return;
    }

    try {
      const cartItemIds = Object.keys(cartItemIdToCartItemDetailsMap);
      const marketSegmentCode =
        cartItemIds.length > 0
          ? cartItemIdToCartItemDetailsMap[cartItemIds[0]]?.marketSegment
          : undefined;

      // Prepare the customer data according to the API schema
      const customerPayload = {
        externalReferenceId: generateExternalReferenceId(),
        resellerId: customerData.resellerId,
        companyProfile: {
          companyName: customerData.companyName,
          preferredLanguage: 'en-US',
          ...(marketSegmentCode && { marketSegment: marketSegmentCode }),
          address: {
            country: customerData.country,
            region: customerData.region,
            city: customerData.city,
            addressLine1: customerData.addressLine1,
            addressLine2: customerData.addressLine2 || '',
            postalCode: customerData.postalCode,
          },
          contacts: [
            {
              firstName: customerData.adminFirstName,
              lastName: customerData.adminLastName,
              email: customerData.adminEmail,
            },
          ],
        },
        globalSalesEnabled: customerData.globalSales,
      };

      const url = `/api/customers?type=${CUSTOMER_API_TYPE.CREATE_CUSTOMER}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData?.message || errorData?.error || 'Failed to create customer';
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Store customer information in cart context
      setCustomerInfoInCart({
        customerId: result.customerId,
        customerName: result.companyProfile.companyName,
        resellerId: result.resellerId,
      });

      // Call the callback if provided
      if (onCustomerCreate) {
        onCustomerCreate(result);
      }

      // Call onContinue to proceed to next step
      if (onContinue) {
        onContinue();
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred while creating the customer';
      setError(errorMessage);
      setShowErrorToast(true);
    } finally {
      setIsLoading(false);
    }
  }, [
    customerData,
    onCustomerCreate,
    onContinue,
    cartItemIdToCartItemDetailsMap,
    setCustomerInfoInCart,
  ]);

  // Expose the createCustomer function to parent component
  useEffect(() => {
    if (onCreateCustomerRef) {
      onCreateCustomerRef(createCustomer);
    }
  }, [onCreateCustomerRef, createCustomer]);

  // Notify parent component of loading state changes
  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(isLoading);
    }
  }, [isLoading, onLoadingChange]);

  return (
    <div className={styles.newCustomerContainer}>
      {/* Loading Overlay */}
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingContent}>
            <ProgressCircle aria-label="Creating customer" isIndeterminate size="L" />
            <div className={styles.loadingText}>Creating customer...</div>
          </div>
        </div>
      )}

      {/* Customer Form */}
      <Form
        onSubmit={e => {
          e.preventDefault();
          createCustomer();
        }}
      >
        <div className={styles.formFields}>
          <div className={styles.formRow}>
            {/* Row 1: Company Name + Global Sales */}
            <div className={styles.textFieldWrapper}>
              <TextField
                label="Customer name"
                value={customerData.companyName}
                onChange={value => handleInputChange('companyName', value)}
                isInvalid={validationErrors.companyName}
                errorMessage={
                  validationErrors.companyName
                    ? validateCompanyName(customerData.companyName)
                    : undefined
                }
                isRequired
              />
            </div>

            <div className={styles.checkboxGroup}>
              <label className={styles.fieldLabel}>&nbsp;</label>
              <div className={styles.checkboxWrapper}>
                <Checkbox
                  isSelected={customerData.globalSales}
                  onChange={isSelected => handleInputChange('globalSales', isSelected)}
                >
                  <span className={styles.checkboxLabel}>Global sales</span>
                </Checkbox>
              </div>
            </div>
          </div>

          {/* Row 2: Address + City */}
          <div className={styles.formRow}>
            <div className={styles.textFieldWrapper}>
              <TextField
                label="Address"
                value={customerData.addressLine1}
                onChange={value => handleInputChange('addressLine1', value)}
                isInvalid={validationErrors.addressLine1}
                errorMessage={
                  validationErrors.addressLine1
                    ? validateAddress(customerData.addressLine1)
                    : undefined
                }
                isRequired
              />
            </div>

            <div className={styles.textFieldWrapperSmall}>
              <TextField
                label="City"
                value={customerData.city}
                onChange={value => handleInputChange('city', value)}
                isInvalid={validationErrors.city}
                errorMessage={validationErrors.city ? validateCity(customerData.city) : undefined}
                isRequired
              />
            </div>
          </div>

          {/* Row 3: Country + State/Province + Postal Code */}
          <div className={styles.formRow}>
            <div className={styles.countryStateGroup}>
              <div style={{ width: '220px' }}>
                <TextField
                  label="Country"
                  value={customerData.country}
                  onChange={value => handleInputChange('country', value)}
                  isInvalid={validationErrors.country}
                  errorMessage={
                    validationErrors.country ? validateCountry(customerData.country) : undefined
                  }
                  isRequired
                />
              </div>

              <div style={{ width: '220px' }}>
                <TextField
                  label="State/Province"
                  value={customerData.region}
                  onChange={value => handleInputChange('region', value)}
                  isInvalid={validationErrors.region}
                  errorMessage={
                    validationErrors.region ? validateRegion(customerData.region) : undefined
                  }
                  isRequired
                />
              </div>
            </div>

            <div className={styles.postalCodeField}>
              <TextField
                label="Postal code"
                value={customerData.postalCode}
                onChange={value => handleInputChange('postalCode', value)}
                isInvalid={validationErrors.postalCode}
                errorMessage={
                  validationErrors.postalCode
                    ? validatePostalCode(customerData.postalCode)
                    : undefined
                }
                isRequired
              />
            </div>
          </div>

          {/* Row 4: Admin Email + Admin First Name + Admin Last Name */}
          <div className={styles.formRow}>
            <div className={styles.adminLeftGroup}>
              <div className={styles.textFieldWrapperSmall}>
                <TextField
                  label="Admin email"
                  value={customerData.adminEmail}
                  onChange={value => handleInputChange('adminEmail', value)}
                  isInvalid={validationErrors.adminEmail}
                  errorMessage={
                    validationErrors.adminEmail
                      ? validateAdminEmail(customerData.adminEmail)
                      : undefined
                  }
                  isRequired
                />
              </div>

              <div className={styles.textFieldWrapperSmall}>
                <TextField
                  label="Admin first name"
                  value={customerData.adminFirstName}
                  onChange={value => handleInputChange('adminFirstName', value)}
                  isInvalid={validationErrors.adminFirstName}
                  errorMessage={
                    validationErrors.adminFirstName
                      ? validateAdminFirstName(customerData.adminFirstName)
                      : undefined
                  }
                  isRequired
                />
              </div>
            </div>

            <div className={styles.textFieldWrapperSmall}>
              <TextField
                label="Admin last name"
                value={customerData.adminLastName}
                onChange={value => handleInputChange('adminLastName', value)}
                isInvalid={validationErrors.adminLastName}
                errorMessage={
                  validationErrors.adminLastName
                    ? validateAdminLastName(customerData.adminLastName)
                    : undefined
                }
                isRequired
              />
            </div>
          </div>

          {/* Reseller ID */}
          <div className={styles.resellerIdWrapper}>
            <ResellerSelector
              value={customerData.resellerId}
              onChange={resellerId => handleInputChange('resellerId', resellerId)}
              label="Search reseller by name or ID"
              isRequired
              isInvalid={validationErrors.resellerId}
              errorMessage={
                validationErrors.resellerId
                  ? (validateResellerId(customerData.resellerId) ?? undefined)
                  : undefined
              }
              placement="top"
            />
          </div>
        </div>
      </Form>

      {/* Error Toast */}
      <ErrorToast
        show={showErrorToast}
        message={error || 'An error occurred'}
        onClose={() => setShowErrorToast(false)}
      />
    </div>
  );
};

export default NewCustomer;
