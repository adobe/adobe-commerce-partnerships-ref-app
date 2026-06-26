import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@react-spectrum/s2';
import styles from './FindOrCreateCustomer.module.css';
import ExistingCustomer, { type CustomerFullDetails } from './customerdetails/ExistingCustomer';
import NewCustomer from './customerdetails/NewCustomer';
import { ErrorToast } from '../../utils/ToastMessageUtils';
import { useCart } from '../../contexts/CartContext';
import { LICENSE_AVAILABILITY, CUSTOMER_TAB, type CustomerTab } from '../../utils/constants';
import AddAndEditCustomerRenewalOrderDialog from '../renewal/AddAndEditCustomerRenewalOrderDialog';

interface FindOrCreateCustomerProps {
  onBack?: () => void;
  onClose?: () => void;
}

const FindOrCreateCustomer: React.FC<FindOrCreateCustomerProps> = ({ onBack, onClose }) => {
  const router = useRouter();
  const { setCustomerInfoInCart, clearCustomerInfoInCart } = useCart();
  const [activeTab, setActiveTab] = useState<CustomerTab>(CUSTOMER_TAB.EXISTING);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [customerData, setCustomerData] = useState<CustomerFullDetails | null>(null);
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const createCustomerRef = useRef<(() => void) | null>(null);

  const clearCustomerSelection = () => {
    setCustomerData(null);
  };

  const handleBack = () => {
    clearCustomerSelection();
    clearCustomerInfoInCart();
    if (onBack) {
      onBack();
    }
  };

  const handleClose = () => {
    clearCustomerSelection();
    clearCustomerInfoInCart();
    if (onClose) {
      onClose();
    }
  };

  const handleContinue = () => {
    if (activeTab === CUSTOMER_TAB.NEW) {
      if (createCustomerRef.current) {
        createCustomerRef.current();
      }
      return;
    }

    if (activeTab === CUSTOMER_TAB.EXISTING) {
      if (!customerData) {
        setErrorMessage('Please select a customer to continue');
        setShowErrorToast(true);
        return;
      }

      setCustomerInfoInCart({
        customerId: customerData.customerId,
        customerName: customerData.customerName,
        resellerId: customerData.resellerId,
        makeAvailable: customerData.makeAvailable || LICENSE_AVAILABILITY.NOW,
      });

      if (customerData.makeAvailable === LICENSE_AVAILABILITY.AT_RENEWAL) {
        setShowRenewalDialog(true);
        return;
      }

      if (onClose) {
        onClose();
      }
      router.push('/checkout');
    }
  };
  const handleRenewalDialogClose = () => {
    setShowRenewalDialog(false);
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {!showRenewalDialog && (
        <div className={styles.customerDetailsOverlay} onClick={handleClose}>
          <div className={styles.customerDetailsContainer} onClick={e => e.stopPropagation()}>
            {/* Header with Title and Buttons */}
            <div className={styles.header}>
              <h1 className={styles.title}>Add customer details</h1>
              <div className={styles.buttonGroup}>
                <Button variant="secondary" onPress={handleBack} fillStyle={'outline'}>
                  Back
                </Button>
                <Button variant="accent" isDisabled={isCreatingCustomer} onPress={handleContinue}>
                  Continue
                </Button>
              </div>
            </div>

            {/* Main Content */}
            <div className={styles.mainContent}>
              {/* Customer Type Tabs */}
              <div className={styles.tabsContainer}>
                <button
                  className={`${styles.tab} ${activeTab === CUSTOMER_TAB.EXISTING ? styles.activeTab : ''}`}
                  onClick={() => {
                    setActiveTab(CUSTOMER_TAB.EXISTING);
                    clearCustomerSelection(); // Reset customer selection when switching tabs
                  }}
                  role="tab"
                  aria-selected={activeTab === CUSTOMER_TAB.EXISTING}
                  aria-controls="existing-customer-panel"
                  id="existing-customer-tab"
                >
                  Find an existing customer
                </button>
                <button
                  className={`${styles.tab} ${activeTab === CUSTOMER_TAB.NEW ? styles.activeTab : ''}`}
                  onClick={() => {
                    setActiveTab(CUSTOMER_TAB.NEW);
                    clearCustomerSelection(); // Reset customer selection when switching tabs
                  }}
                  role="tab"
                  aria-selected={activeTab === CUSTOMER_TAB.NEW}
                  aria-controls="new-customer-panel"
                  id="new-customer-tab"
                >
                  Create a new customer
                </button>
              </div>

              {/* Customer Type Content */}
              <div
                role="tabpanel"
                aria-labelledby={
                  activeTab === CUSTOMER_TAB.EXISTING ? 'existing-customer-tab' : 'new-customer-tab'
                }
              >
                {activeTab === CUSTOMER_TAB.EXISTING ? (
                  <ExistingCustomer
                    onCustomerFullDetailsUpdate={details => {
                      setCustomerData(details);
                    }}
                  />
                ) : (
                  <NewCustomer
                    onCustomerCreate={rawCustomerData => {
                      setCustomerData({
                        customerId: rawCustomerData.customerId,
                        customerName: rawCustomerData.companyProfile?.companyName,
                        resellerId: rawCustomerData.resellerId,
                        makeAvailable: LICENSE_AVAILABILITY.NOW, // New customers always use "Now"
                      });

                      // Store customer info in cart context
                      setCustomerInfoInCart({
                        customerId: rawCustomerData.customerId,
                        customerName: rawCustomerData.companyProfile?.companyName,
                        resellerId: rawCustomerData.resellerId,
                        makeAvailable: LICENSE_AVAILABILITY.NOW, // New customers always use "Now"
                      });
                      router.push('/checkout');
                    }}
                    onCreateCustomerRef={createFn => {
                      createCustomerRef.current = createFn;
                    }}
                    onLoadingChange={loading => {
                      setIsCreatingCustomer(loading);
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* At Renewal Dialog */}
      <AddAndEditCustomerRenewalOrderDialog
        isOpen={showRenewalDialog}
        onClose={handleRenewalDialogClose}
        customerId={customerData?.customerId}
        anniversaryDate={customerData?.anniversaryDate || ''}
      />

      {/* Error Toast */}
      <ErrorToast
        show={showErrorToast}
        message={errorMessage}
        onClose={() => setShowErrorToast(false)}
      />
    </>
  );
};

export default FindOrCreateCustomer;
