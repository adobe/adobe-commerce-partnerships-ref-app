import React, { useState } from 'react';
import { ActionButton } from '@react-spectrum/s2';
import ActiveProducts from './ActiveProducts';
import PersonalizedRecommendations from './PersonalizedRecommendations';
import ThreeYearCommitDetailsDialog from '../ThreeYearCommit/3YearCommitDetailsDialog';
import ViewTermsFor3YCBanner from '../ThreeYearCommit/ViewTermsFor3YCBanner';
import EnrollTo3YCBanner from '../ThreeYearCommit/EnrollTo3YCBanner';
import RenewalWindowClosesBanner from '../renewal/lateRenewal/RenewalWindowClosesBanner';
import LateRenewalOrderDialog from '../renewal/lateRenewal/LateRenewalOrderDialog';
import EditRenewalDialog from '../renewal/EditRenewalDialog';
import { useProductNamesFromPricelist } from '../../hooks/useProductPricing';
import { getPriceListType } from '../../utils/customerDetailsUtils';
import {
  ProductToDisplay,
  isValidAnniversaryDate,
  modifyOfferIdForDiscountLevel,
  transformSubscriptionToProductDisplay,
} from '../../utils/productsPanelUtils';
import { calculateDaysUntilClose } from '../../utils/renewalOrderUtils';
import type { SubscriptionToRenew } from '../../types/lateRenewal';
import { ErrorToast, SuccessToast } from '../../utils/ToastMessageUtils';
import {
  shouldShow3YCEnrollmentBanner,
  has3YCCommitmentPending,
  formatAnniversaryDate,
} from '../../utils/customerDetailsUtils';
import { OfferType } from '../../utils/constants';
import styles from '../../styles/customerdetails/ProductsPanel.module.css';
import { usePartnerDetails } from '../../contexts/PartnerContext';
import type { CustomerDetails } from '../../models/CustomerDetails';

interface ProductsPanelProps {
  subscriptions: SubscriptionToRenew[];
  customer?: CustomerDetails | null;
  isLoading?: boolean;
  onEnrollClick?: () => void;
}

const CustomerProductsOverviewPanel: React.FC<ProductsPanelProps> = ({
  subscriptions,
  customer,
  isLoading = false,
  onEnrollClick,
}) => {
  const [isCommitDetailsDialogOpen, setIsCommitDetailsDialogOpen] = useState(false);
  const [isEditRenewalDialogOpen, setIsEditRenewalDialogOpen] = useState(false);
  const [isLateRenewalDialogOpen, setIsLateRenewalDialogOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [renewalOrderSubmitted, setRenewalOrderSubmitted] = useState(false);
  // Extract customer properties
  const customerId = customer?.customerId;
  const resellerId = customer?.resellerId;
  const anniversaryDate = customer?.cotermDate;
  const customerBenefits = customer?.benefits as
    | Array<{
        type: string;
        status: string;
        commitmentRequest?: { status: string; minimumQuantities?: any[] };
      }>
    | undefined;
  const customerDiscounts = customer?.discounts;
  const customerName = customer?.companyProfile?.companyName;
  const marketSegment = customer?.companyProfile?.marketSegment;

  const { region } = usePartnerDetails();

  // Create subscription contexts with modified offer IDs and keep the modified IDs
  const subscriptionsWithModifiedIds = subscriptions.map(sub => ({
    ...sub,
    modifiedOfferId: sub.offerId
      ? modifyOfferIdForDiscountLevel(sub.offerId, customerDiscounts)
      : sub.offerId,
  }));

  const priceListType = getPriceListType(customerBenefits);
  const priceListRequest = subscriptionsWithModifiedIds.map(sub => ({
    offerId: sub.modifiedOfferId!,
    currencyCode: sub.currencyCode!,
    region,
    priceListType,
  }));

  const { getProductName, getPartnerPrice } = useProductNamesFromPricelist(priceListRequest);

  const activeSubscriptionsForProducts = subscriptionsWithModifiedIds.filter(
    sub => sub.status !== '1004'
  );

  const products: ProductToDisplay[] = activeSubscriptionsForProducts.map(sub =>
    transformSubscriptionToProductDisplay(sub, getProductName, getPartnerPrice)
  );

  const hasManualRenewal = subscriptions.some(
    sub => sub.allowedActions && sub.allowedActions.includes('MANUAL_RENEWAL')
  );

  const handleRenewalSuccess = (orderId: string) => {
    setSuccessMessage(`Renewal order submitted successfully! Order ID: ${orderId}`);
    setShowSuccessToast(true);
    setRenewalOrderSubmitted(true);
  };

  const handleRenewalError = (errorMessage: string) => {
    setErrorMessage(errorMessage);
    setShowErrorToast(true);
  };

  return (
    <div className={styles.container}>
      {/* Conditional rendering: Show Renewal Window Banner OR Anniversary Date Section */}
      {hasManualRenewal && !renewalOrderSubmitted ? (
        <RenewalWindowClosesBanner
          customerName={customerName}
          daysUntilClose={calculateDaysUntilClose(subscriptions)}
          onRenewNow={() => setIsLateRenewalDialogOpen(true)}
        />
      ) : (
        isValidAnniversaryDate(anniversaryDate) && (
          <div className={styles.anniversarySection}>
            <div className={styles.anniversaryContent}>
              <div className={styles.anniversaryLabel}>Anniversary date:</div>
              <div className={styles.anniversaryValue}>
                {formatAnniversaryDate(anniversaryDate!)}
              </div>
            </div>
            <div className={styles.editRenewalButtonWrapper}>
              <ActionButton onPress={() => setIsEditRenewalDialogOpen(true)}>
                Edit renewal order
              </ActionButton>
            </div>
          </div>
        )
      )}

      {(() => {
        // Don't show anything while loading
        if (isLoading) {
          return null;
        }

        if (has3YCCommitmentPending(customerBenefits)) {
          return (
            <ViewTermsFor3YCBanner
              customerName={customerName}
              onViewTermsClick={() => setIsCommitDetailsDialogOpen(true)}
            />
          );
        }
        if (shouldShow3YCEnrollmentBanner(customer)) {
          return (
            <EnrollTo3YCBanner
              onEnrollClick={() => {
                if (onEnrollClick) {
                  onEnrollClick();
                }
              }}
            />
          );
        }
        return null;
      })()}

      {/* Active Products Section */}
      <ActiveProducts
        products={products}
        customerId={customerId}
        customerName={customerName}
        resellerId={resellerId}
        marketSegment={marketSegment}
      />

      {/* Personalized Recommendations Section */}
      <PersonalizedRecommendations
        customerId={customerId}
        customerName={customerName}
        resellerId={resellerId}
        anniversaryDate={anniversaryDate}
        customerDiscounts={customerDiscounts}
        marketSegment={marketSegment}
        customerBenefits={customerBenefits}
      />

      {/* 3-Year Commit Details Dialog */}
      <ThreeYearCommitDetailsDialog
        isOpen={isCommitDetailsDialogOpen}
        onClose={() => setIsCommitDetailsDialogOpen(false)}
        customerName={customerName}
        commitmentDetails={(() => {
          // Extract actual quantities from customer benefits
          const threeYearCommit = customerBenefits?.find(
            benefit => benefit.type === 'THREE_YEAR_COMMIT'
          );

          const minimumQuantities = threeYearCommit?.commitmentRequest?.minimumQuantities || [];

          const licensesData = minimumQuantities.find(
            (item: any) => item.offerType === OfferType.LICENSE
          );
          const consumablesData = minimumQuantities.find(
            (item: any) => item.offerType === OfferType.CONSUMABLES
          );

          return {
            licenses: licensesData?.quantity || 0,
            transactions: consumablesData?.quantity || 0,
          };
        })()}
      />

      {/* Edit Renewal Order Dialog */}
      <EditRenewalDialog
        isOpen={isEditRenewalDialogOpen}
        onClose={() => setIsEditRenewalDialogOpen(false)}
        subscriptions={subscriptions}
        customerId={customerId}
        anniversaryDate={anniversaryDate}
      />

      {/* Late Renewal Order Dialog */}
      <LateRenewalOrderDialog
        isOpen={isLateRenewalDialogOpen}
        onClose={() => setIsLateRenewalDialogOpen(false)}
        onSuccess={handleRenewalSuccess}
        onError={handleRenewalError}
        subscriptions={subscriptions}
        customerId={customerId}
      />

      {/* Success Toast */}
      <SuccessToast
        show={showSuccessToast}
        message={successMessage}
        onClose={() => setShowSuccessToast(false)}
      />

      {/* Error Toast */}
      <ErrorToast
        show={showErrorToast}
        message={errorMessage}
        onClose={() => setShowErrorToast(false)}
      />
    </div>
  );
};

export default CustomerProductsOverviewPanel;
