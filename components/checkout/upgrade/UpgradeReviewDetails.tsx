import React from 'react';
import { Text } from '@react-spectrum/s2';
import CheckmarkCircle from '@react-spectrum/s2/icons/CheckmarkCircle';
import Preview from '@react-spectrum/s2/icons/Preview';
import { getIconWithFallback } from '../../../utils/iconUtils';
import checkoutStyles from '../Checkout.module.css';
import styles from './UpgradeReviewDetails.module.css';

interface UpgradeReviewDetailsProps {
  customerName: string;
  resellerName: string;
  sourceProductName: string;
  targetProductName: string;
}

const UpgradeReviewDetails: React.FC<UpgradeReviewDetailsProps> = ({
  customerName,
  resellerName,
  sourceProductName,
  targetProductName,
}) => {
  return (
    <section className={checkoutStyles.reviewCard}>
      <div className={checkoutStyles.reviewHeaderRowJustified}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={checkoutStyles.reviewHeaderIcon}>
            <Preview />
          </span>
          <h2 className={checkoutStyles.reviewTitle}>Review upgrade details</h2>
        </div>
      </div>

      <ul className={checkoutStyles.reviewList}>
        <li className={checkoutStyles.reviewListItem}>
          <span className={checkoutStyles.reviewIcon}>
            <CheckmarkCircle />
          </span>
          <Text>
            This purchase is for <strong>{customerName}</strong> on behalf of{' '}
            <strong>{resellerName}</strong>.
          </Text>
        </li>
        <li className={checkoutStyles.reviewListItem}>
          <span className={checkoutStyles.reviewIcon}>
            <CheckmarkCircle />
          </span>
          <Text>Upgraded licenses will be immediately available and automatically assigned.</Text>
        </li>
      </ul>

      <div className={styles.productTransition}>
        <div className={styles.productBadge}>
          <img
            src={getIconWithFallback(sourceProductName, '48x48')}
            alt={sourceProductName}
            className={styles.transitionIcon}
            onError={e => {
              (e.currentTarget as HTMLImageElement).src = getIconWithFallback(null, '48x48');
            }}
          />
          <span className={styles.transitionLabel}>Licenses</span>
        </div>
        <div className={styles.arrow}>→</div>
        <div className={styles.productBadge}>
          <img
            src={getIconWithFallback(targetProductName, '48x48')}
            alt={targetProductName}
            className={styles.transitionIcon}
            onError={e => {
              (e.currentTarget as HTMLImageElement).src = getIconWithFallback(null, '48x48');
            }}
          />
          <span className={styles.transitionLabel}>Licenses</span>
        </div>
      </div>

      <ul className={checkoutStyles.reviewList}>
        <li className={checkoutStyles.reviewListItem}>
          <span className={checkoutStyles.reviewIcon}>
            <CheckmarkCircle />
          </span>
          <Text>
            Adobe is not responsible for billing these licenses to the customer or collecting
            payments.
          </Text>
        </li>
        <li className={checkoutStyles.reviewListItem}>
          <span className={checkoutStyles.reviewIcon}>
            <CheckmarkCircle />
          </span>
          <Text>
            The amount is the partner price difference between <strong>{sourceProductName}</strong>{' '}
            and <strong>{targetProductName}</strong> and pro-rated to the next anniversary date.
          </Text>
        </li>
      </ul>
    </section>
  );
};

export default UpgradeReviewDetails;
