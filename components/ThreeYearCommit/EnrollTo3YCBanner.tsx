import React from 'react';
import { ActionButton } from '@react-spectrum/s2';
import Confetti from '@react-spectrum/s2/illustrations/gradient/generic1/Confetti';
import styles from '../../styles/customerdetails/ProductsPanel.module.css';

interface EnrollTo3YCBannerProps {
  onEnrollClick: () => void;
}

const EnrollTo3YCBanner: React.FC<EnrollTo3YCBannerProps> = ({ onEnrollClick }) => {
  return (
    <div className={styles.enrollmentSection}>
      {/* Message */}
      <div className={styles.enrollmentContent}>
        <div className={styles.enrollmentMessage}>
          <div className={styles.enrollmentIllustrationWrapper}>
            <Confetti />
          </div>
          <span>
            Offer deeper discounts and streamlined licenses management. Enroll in 3-year commit!
          </span>
        </div>
      </div>

      {/* Enroll Button */}
      <div className={styles.enrollButtonWrapper}>
        <ActionButton onPress={onEnrollClick}>Enroll</ActionButton>
      </div>
    </div>
  );
};

export default EnrollTo3YCBanner;
