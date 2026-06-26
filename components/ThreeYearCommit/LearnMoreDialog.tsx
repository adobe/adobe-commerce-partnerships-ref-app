import React from 'react';
import { Button } from '@react-spectrum/s2';
import CheckmarkCircle from '@react-spectrum/s2/icons/CheckmarkCircle';
import User from '@react-spectrum/s2/icons/User';
import Email from '@react-spectrum/s2/icons/Email';
import ShoppingCart from '@react-spectrum/s2/icons/ShoppingCart';
import styles from '../../styles/threeYearCommit/LearnMoreDialog.module.css';

interface LearnMoreDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const LearnMoreDialog: React.FC<LearnMoreDialogProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Unlock predictable revenue and customer savings</h2>
          <Button variant="secondary" fillStyle={'outline'} onPress={onClose}>
            Go back
          </Button>
        </div>

        <div className={styles.modalContent}>
          {/* Card 1: Long-term value */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>
              A 3-year commit subscription delivers long-term value
            </h3>
            <div className={styles.cardContent}>
              <div className={styles.cardItem}>
                <span className={styles.checkmark}>
                  <CheckmarkCircle />
                </span>
                <div className={styles.cardItemText}>
                  <span className={styles.benefitLabel}>For you:</span>{' '}
                  <span className={styles.cardItemSpan}>Repeat business secured for 3 years</span>
                </div>
              </div>
              <div className={styles.cardItem}>
                <span className={styles.checkmark}>
                  <CheckmarkCircle />
                </span>
                <div className={styles.cardItemText}>
                  <span className={styles.benefitLabel}>For them:</span>{' '}
                  <span className={styles.cardItemSpan}>
                    Cost savings and protection from price increases
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: How it works */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>How it works</h3>
            <div className={styles.cardContent}>
              <div className={styles.cardItem}>
                <span className={styles.userIcon}>
                  <User />
                </span>
                <div className={styles.howItWorksText}>
                  The Customer and Reseller establish a license commitment for up to 3 years.
                </div>
              </div>
              <div className={styles.cardItem}>
                <span className={styles.emailIcon}>
                  <Email />
                </span>
                <div className={styles.howItWorksText}>
                  After receiving the invitation, the customer accepts the terms in their Adobe
                  Admin Console.
                </div>
              </div>
              <div className={styles.cardItem}>
                <span className={styles.cartIcon}>
                  <ShoppingCart />
                </span>
                <div className={styles.howItWorksText}>
                  Partner Bridge offers deeper discounts for the Customer.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearnMoreDialog;
