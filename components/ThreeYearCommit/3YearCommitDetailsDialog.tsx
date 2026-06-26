import React from 'react';
import { Button } from '@react-spectrum/s2';
import InfoCircle from '@react-spectrum/s2/icons/InfoCircle';
import styles from '../../styles/threeYearCommit/3YearCommitDetailsDialog.module.css';

interface ThreeYearCommitDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customerName?: string;
  commitmentDetails?: {
    licenses: number;
    transactions: number;
  };
}

const ThreeYearCommitDetailsDialog: React.FC<ThreeYearCommitDetailsDialogProps> = ({
  isOpen,
  onClose,
  commitmentDetails = { licenses: 0, transactions: 0 },
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>3-year commit details</h2>
          <Button variant="accent" onPress={onClose}>
            Done
          </Button>
        </div>

        <div className={styles.modalContent}>
          {/* Inline Alert */}
          <div className={styles.inlineAlert}>
            <div className={styles.alertContent}>
              <div className={styles.alertHeader}>
                <h3 className={styles.alertTitle}>3-year commit pending</h3>
                <div className={styles.alertInfoIcon}>
                  <InfoCircle />
                </div>
              </div>

              <p className={styles.alertDescription}>
                Until the customer accepts the terms, deeper discounts will not apply.
              </p>
            </div>
          </div>

          {/* Commitment details section */}
          <div className={styles.commitmentDetailsSection}>
            <h3 className={styles.commitmentDetailsTitle}>Commitment details</h3>

            <div className={styles.commitmentDetailsGrid}>
              <div className={styles.commitmentDetailItem}>
                <div className={styles.commitmentDetailLabelContainer}>
                  <p className={styles.commitmentDetailLabel}>Minimum commitment per year</p>
                </div>
                <div className={styles.commitmentDetailValuesContainer}>
                  <p className={styles.commitmentDetailValue}>
                    {commitmentDetails.licenses} Licenses
                    <br />
                    {commitmentDetails.transactions} Transactions
                  </p>
                </div>
              </div>

              <div className={styles.commitmentDetailItemRight}>
                <div className={styles.commitmentDetailLabelContainer}>
                  <p className={styles.commitmentDetailLabel}>Commitment period</p>
                </div>
                <div className={styles.commitmentDetailValuesContainerRight}>
                  <p className={styles.commitmentDetailValue}>-customer must accept terms-</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreeYearCommitDetailsDialog;
