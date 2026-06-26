import React, { useState } from 'react';
import { Button, TextField, ProgressCircle } from '@react-spectrum/s2';
import CheckmarkCircle from '@react-spectrum/s2/icons/CheckmarkCircle';
import User from '@react-spectrum/s2/icons/User';
import Email from '@react-spectrum/s2/icons/Email';
import ShoppingCart from '@react-spectrum/s2/icons/ShoppingCart';
import { useRouter } from 'next/router';
import ErrorToast from '../../utils/ToastMessageUtils';
import { CustomerDetails, UpdateCustomer } from '../../models/CustomerDetails';
import {
  MIN_LICENSES,
  MIN_CONSUMABLES,
  parseNumber,
  extractErrorMessage,
  buildApiUrl,
  validateFormFields,
  validateLicensesField,
  validateConsumablesField,
} from '../../utils/threeYearCommitUtils';
import { buildCustomerDetailsUrl, ROUTES } from '../../utils/constants';
import styles from '../../styles/threeYearCommit/ThreeYearCommit.module.css';

interface ThreeYearCommitProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  customerData?: CustomerDetails;
  onEnrollSuccess?: () => void; // Callback for successful enrollment
}

const ThreeYearCommit: React.FC<ThreeYearCommitProps> = ({
  isOpen,
  onClose,
  onBack,
  customerData,
  onEnrollSuccess,
}) => {
  const router = useRouter();
  const [licenses, setLicenses] = useState('');
  const [consumables, setConsumables] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  // Handle field changes
  const handleLicensesChange = (value: string) => {
    setLicenses(value);
  };

  const handleConsumablesChange = (value: string) => {
    setConsumables(value);
  };

  const handleInviteToEnroll = async () => {
    const { errors, isValid } = validateFormFields(licenses, consumables);
    if (!isValid) {
      return;
    }

    if (!customerData) {
      alert('Customer data is not available. Please try again.');
      return;
    }

    setIsEnrolling(true);

    try {
      const licensesNum = parseNumber(licenses);
      const consumablesNum = parseNumber(consumables);

      const requestBody: UpdateCustomer = {
        benefits: [
          {
            type: 'THREE_YEAR_COMMIT',
            commitmentRequest: {
              minimumQuantities: [],
            },
          },
        ],
        companyProfile: customerData.companyProfile,
        globalSalesEnabled: customerData.globalSalesEnabled,
      };

      if (licensesNum >= MIN_LICENSES) {
        requestBody.benefits[0].commitmentRequest.minimumQuantities.push({
          offerType: 'LICENSE',
          quantity: licensesNum,
        });
      }

      if (consumablesNum >= MIN_CONSUMABLES) {
        requestBody.benefits[0].commitmentRequest.minimumQuantities.push({
          offerType: 'CONSUMABLES',
          quantity: consumablesNum,
        });
      }

      const apiUrl = buildApiUrl(customerData.customerId);
      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorCode = errorData.code || response.status;
        const errorMessage =
          errorData.message || errorData.error || `API call failed with status ${response.status}`;
        throw new Error(`Error ${errorCode}: ${errorMessage}`);
      }
      // Check if we're already on customer details page
      if (router.pathname === ROUTES.CUSTOMER_DETAILS) {
        // Flow 2: Already on customer details page - use callback
        onClose();
        if (onEnrollSuccess) {
          onEnrollSuccess();
        }
      } else {
        // Flow 1: From checkout/catalog flow - navigate to customer details page
        // Don't call onClose() to keep loader visible during navigation
        const customerDetailsUrl = buildCustomerDetailsUrl(
          customerData.customerId,
          customerData.resellerId
        );
        router.push(customerDetailsUrl);
      }
    } catch (error) {
      const errorMsg = extractErrorMessage(error);
      setErrorMessage(errorMsg);
      setShowErrorToast(true);
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      {/* Loading Overlay */}
      {isEnrolling && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingContent}>
            <ProgressCircle aria-label="Enrolling customer to 3YC" isIndeterminate size="L" />
            <div className={styles.loadingText}>Enrolling customer to 3YC...</div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      <ErrorToast
        show={showErrorToast}
        message={errorMessage}
        onClose={() => setShowErrorToast(false)}
      />

      <div className={styles.container} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Unlock predictable revenue and customer savings</h1>
          <div className={styles.headerButtons}>
            <Button
              variant="secondary"
              fillStyle={'outline'}
              onPress={onBack}
              aria-label="Go back to previous step"
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className={styles.mainContent}>
          {/* Left Section */}
          <div className={styles.leftSection}>
            <p className={styles.inviteText}>
              Invite {customerData?.companyProfile.companyName} to enroll in a 3-year commit
              subscription.
            </p>

            <div className={styles.subscriptionSection}>
              <h2 className={styles.sectionTitle}>Enter subscription details</h2>

              {/* Input Fields */}
              <div className={styles.inputRow}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Licenses</label>
                  <TextField
                    value={licenses}
                    onChange={handleLicensesChange}
                    validate={validateLicensesField}
                    aria-label="Number of licenses"
                    description={`Minimum ${MIN_LICENSES} licenses required`}
                  />
                </div>

                <span className={styles.andOr}>and/or</span>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Consumables</label>
                  <TextField
                    value={consumables}
                    onChange={handleConsumablesChange}
                    validate={validateConsumablesField}
                    aria-label="Number of consumables"
                    description={`Minimum ${MIN_CONSUMABLES.toLocaleString()} usage consumables`}
                  />
                </div>
              </div>

              {/* Invite Button */}
              <Button
                variant="primary"
                onPress={handleInviteToEnroll}
                aria-label="Send invitation to enroll in 3-year subscription"
                isDisabled={!customerData || isEnrolling}
              >
                Invite to enroll
              </Button>

              {/* Note */}
              <p className={styles.note}>
                <strong>Note:</strong> The 3-year commit and discounts start only after the customer
                accepts the terms in the Admin Console.
              </p>
            </div>
          </div>

          {/* Right Section - Info Cards */}
          <div className={styles.rightSection}>
            {/* Value Card */}
            <div className={styles.infoCard}>
              <h3 className={styles.valueCardTitle}>
                A 3-year commit subscription delivers long-term value
              </h3>
              <div className={styles.cardContent}>
                <div className={styles.cardItem}>
                  <span className={styles.checkmark}>
                    <CheckmarkCircle />
                  </span>
                  <div className={styles.cardItemText}>
                    For you:{' '}
                    <span className={styles.cardItemSpan}>Repeat business secured for 3 years</span>
                  </div>
                </div>
                <div className={styles.cardItem}>
                  <span className={styles.checkmark}>
                    <CheckmarkCircle />
                  </span>
                  <div className={styles.cardItemText}>
                    For them:{' '}
                    <span className={styles.cardItemSpan}>
                      Cost savings and protection from price increases
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className={`${styles.infoCard} ${styles.infoCardTaller}`}>
              <h3 className={styles.cardTitle}>How it works</h3>
              <div className={styles.cardContent}>
                <div className={styles.cardItem}>
                  <span className={styles.userIcon}>
                    <User />
                  </span>
                  <div className={styles.howItWorksText}>
                    Enter the number of licenses or consumables needed.
                  </div>
                </div>
                <div className={styles.cardItem}>
                  <span className={styles.emailIcon}>
                    <Email />
                  </span>
                  <div className={styles.howItWorksText2}>
                    Select <span className={styles.howItWorksBold}>"Invite to enroll"</span> to
                    email the customer. They'll need to accept the terms in their Adobe Admin
                    Console.
                  </div>
                </div>
                <div className={styles.cardItem}>
                  <span className={styles.cartIcon}>
                    <ShoppingCart />
                  </span>
                  <div className={styles.howItWorksText}>Purchase items with deep discounts.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreeYearCommit;
