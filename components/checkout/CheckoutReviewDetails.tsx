import React from 'react';
import { Text } from '@react-spectrum/s2';
import Preview from '@react-spectrum/s2/icons/Preview';
import CheckmarkCircle from '@react-spectrum/s2/icons/CheckmarkCircle';
import styles from './Checkout.module.css';

interface CheckoutReviewDetailsProps {
  customerName: string;
  resellerName: string;
}

const CheckoutReviewDetails: React.FC<CheckoutReviewDetailsProps> = ({
  customerName,
  resellerName,
}) => (
  <section className={styles.reviewCard}>
    <div className={styles.reviewHeaderRowJustified}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          className={styles.reviewHeaderIcon}
          style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}
        >
          <Preview />
        </span>
        <h2 className={styles.reviewTitle}>Review details</h2>
      </div>
    </div>
    <ul className={styles.reviewList}>
      <li className={styles.reviewListItem}>
        <span className={styles.reviewIcon}>
          <CheckmarkCircle />
        </span>
        <Text>
          This purchase is for <strong>{customerName}</strong> on behalf of{' '}
          <strong>{resellerName}</strong>.
        </Text>
      </li>
      <li className={styles.reviewListItem}>
        <span className={styles.reviewIcon}>
          <CheckmarkCircle />
        </span>
        <Text>Licenses will be immediately available</Text>
      </li>
      <li className={styles.reviewListItem}>
        <span className={styles.reviewIcon}>
          <CheckmarkCircle />
        </span>
        <Text>
          Adobe is not responsible billing these licenses to the customer or collecting payments.
        </Text>
      </li>
      <li className={styles.reviewListItem}>
        <span className={styles.reviewIcon}>
          <CheckmarkCircle />
        </span>
        <Text>The amount is pro-rated to the next anniversary date.</Text>
      </li>
    </ul>
  </section>
);

export default CheckoutReviewDetails;
