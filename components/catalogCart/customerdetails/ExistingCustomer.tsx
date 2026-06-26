import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RadioGroup, Radio } from '@react-spectrum/s2';
import { ErrorToast } from '../../../utils/ToastMessageUtils';
import { formatDateToUS, isAtRenewalDisabled } from '../../../utils/commonUtils';
import { LICENSE_AVAILABILITY, type LicenseAvailability } from '../../../utils/constants';
import { CustomerMinimal } from '../../../models/Customer';
import { fetchCustomerDetails } from '../../../utils/AccountApis';
import ResellerSelector from '../../common/ResellerSelector';
import CustomerSelector from '../../common/CustomerSelector';
import { ResellerMinimal } from '../../../models/Reseller';
import styles from './ExistingCustomer.module.css';

export interface CustomerFullDetails {
  customerId: string;
  customerName: string;
  resellerId: string;
  makeAvailable: LicenseAvailability;
  anniversaryDate?: string;
}

interface ExistingCustomerProps {
  onCustomerFullDetailsUpdate?: (details: CustomerFullDetails | null) => void;
}

const ExistingCustomer: React.FC<ExistingCustomerProps> = ({ onCustomerFullDetailsUpdate }) => {
  const [selectedReseller, setSelectedReseller] = useState<ResellerMinimal | null>(null);
  const [showErrorToast, setShowErrorToast] = useState<boolean>(false);
  const [isResellerValidated, setIsResellerValidated] = useState<boolean>(false);

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerMinimal | null>(null);
  const [licenseAvailability, setLicenseAvailability] = useState<LicenseAvailability>(
    LICENSE_AVAILABILITY.NOW
  );

  const resellerId = selectedReseller?.resellerId || '';

  const { data: customerDetails, error: detailsError } = useQuery({
    queryKey: ['customerDetails', selectedCustomer?.customerId],
    queryFn: () => fetchCustomerDetails(selectedCustomer!.customerId),
    enabled: selectedCustomer !== null,
    retry: 1,
    staleTime: 5 * 1000,
  });

  const anniversaryDate = customerDetails?.cotermDate
    ? formatDateToUS(customerDetails.cotermDate)
    : '';
  const fetchedResellerId = customerDetails?.resellerId ?? '';

  // Handle customer details query and update parent
  useEffect(() => {
    if (customerDetails && selectedCustomer) {
      // Pass full customer details up to parent (for use when Continue is clicked)
      onCustomerFullDetailsUpdate?.({
        customerId: customerDetails.customerId,
        customerName: customerDetails.companyProfile.companyName,
        resellerId: customerDetails.resellerId,
        makeAvailable: licenseAvailability,
        anniversaryDate: customerDetails.cotermDate
          ? formatDateToUS(customerDetails.cotermDate)
          : undefined,
      });
    }
  }, [customerDetails, licenseAvailability, selectedCustomer, onCustomerFullDetailsUpdate]);

  // Handle customer details query error
  useEffect(() => {
    if (detailsError && selectedCustomer) {
      setShowErrorToast(true);
    }
  }, [detailsError, selectedCustomer]);

  // Auto-switch to "Now" if "At Renewal" is disabled and currently selected
  useEffect(() => {
    if (
      isAtRenewalDisabled(anniversaryDate) &&
      licenseAvailability === LICENSE_AVAILABILITY.AT_RENEWAL
    ) {
      setLicenseAvailability(LICENSE_AVAILABILITY.NOW);
    }
  }, [anniversaryDate, licenseAvailability]);

  const handleResellerSelect = (selectedResellerId: string, reseller?: ResellerMinimal) => {
    setSelectedReseller(reseller || null);

    // Reset all previously selected customer data
    setSelectedCustomer(null);
    setShowErrorToast(false);

    // Enable search mode when a reseller is selected
    if (selectedResellerId.trim()) {
      setIsResellerValidated(true);
    } else {
      setIsResellerValidated(false);
    }
  };

  const handleCustomerSelect = (customerId: string, customer?: CustomerMinimal) => {
    setSelectedCustomer(customer || null);
  };

  return (
    <div className={styles.existingCustomerContainer}>
      {/* Reseller ID Section */}
      <div className={styles.resellerSection}>
        <ResellerSelector
          value={resellerId}
          onChange={handleResellerSelect}
          label="Search Reseller by name or ID"
          isRequired={true}
        />
      </div>

      {/* Search Section */}
      <div className={styles.searchSection}>
        <CustomerSelector
          resellerId={resellerId}
          value={selectedCustomer?.customerId || ''}
          onChange={handleCustomerSelect}
          label="Search customer by name or ID"
          isRequired={false}
          isDisabled={!isResellerValidated}
          placement="bottom"
        />
      </div>

      {/* Customer Details Section */}
      <div className={styles.customerDetailsSection}>
        <div className={styles.detailsGrid}>
          <div className={styles.detailColumn}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Customer name:</span>
              <span className={styles.detailValue}>
                {selectedCustomer?.companyProfile.companyName || ''}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Anniversary date:</span>
              <span className={styles.detailValue}>{anniversaryDate || ''}</span>
            </div>
          </div>
          <div className={styles.detailColumn}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Customer ID:</span>
              <span className={styles.detailValue}>{selectedCustomer?.customerId || ''}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Reseller ID:</span>
              <span className={styles.detailValue}>{fetchedResellerId || resellerId || ''}</span>
            </div>
          </div>
        </div>

        {/* License Availability Radio Buttons */}
        <div className={styles.licenseAvailabilitySection}>
          <RadioGroup
            label="Make licenses available:"
            value={licenseAvailability}
            onChange={value => setLicenseAvailability(value as LicenseAvailability)}
          >
            <Radio value={LICENSE_AVAILABILITY.NOW}>Now</Radio>
            <Radio
              value={LICENSE_AVAILABILITY.AT_RENEWAL}
              isDisabled={isAtRenewalDisabled(anniversaryDate)}
            >
              At renewal
            </Radio>
          </RadioGroup>
        </div>
      </div>

      {/* Error Toast */}
      <ErrorToast
        show={showErrorToast}
        message={
          (detailsError instanceof Error ? detailsError.message : null) || 'An error occurred'
        }
        onClose={() => setShowErrorToast(false)}
      />
    </div>
  );
};
export default ExistingCustomer;
