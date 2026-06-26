import React from 'react';
import { ActionButton } from '@react-spectrum/s2';
import styles from '../../../styles/lateRenewal/RenewalWindowClosesBanner.module.css';

interface RenewalWindowClosesBannerProps {
  customerName?: string;
  daysUntilClose: number;
  onRenewNow?: () => void;
}

const RenewalWindowClosesBanner: React.FC<RenewalWindowClosesBannerProps> = ({
  customerName,
  daysUntilClose,
  onRenewNow,
}) => {
  return (
    <div className={styles.anniversarySection}>
      <div className={styles.anniversaryContent}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div className={styles.renewalWindowTitle}>
            Limited time to keep {customerName || 'Customer'}
          </div>
          <div className={styles.renewalWindowDescription}>
            Your renewal window closes in {daysUntilClose} days — act before it's gone.
          </div>
        </div>
      </div>
      <div className={styles.renewNowButtonWrapper}>
        <ActionButton onPress={onRenewNow}>Renew now</ActionButton>
      </div>
    </div>
  );
};

export default RenewalWindowClosesBanner;
