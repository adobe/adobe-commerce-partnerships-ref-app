import React from 'react';
import { ActionButton } from '@react-spectrum/s2';
import Information from '@react-spectrum/s2/illustrations/gradient/generic1/Information';
import styles from '../../styles/customerdetails/ProductsPanel.module.css';

interface ViewTermsFor3YCBannerProps {
  customerName?: string;
  onViewTermsClick: () => void;
}

const ViewTermsFor3YCBanner: React.FC<ViewTermsFor3YCBannerProps> = ({
  customerName,
  onViewTermsClick,
}) => {
  return (
    <div className={styles.enrollmentSection}>
      {/* Message */}
      <div className={styles.commitTermsContent}>
        <div className={styles.commitTermsIllustration}>
          <Information />
        </div>
        <div className={styles.commitTermsMessage}>
          {customerName || 'Customer'} is close to unlocking great benefits. Remind them to{' '}
          <strong>accept their 3-year commit terms.</strong>
        </div>
      </div>

      {/* View Terms Button */}
      <div className={styles.enrollButtonWrapper}>
        <ActionButton onPress={onViewTermsClick}>View terms</ActionButton>
      </div>
    </div>
  );
};
export default ViewTermsFor3YCBanner;
