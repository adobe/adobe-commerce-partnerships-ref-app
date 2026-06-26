import React from 'react';
import { Heading, Text } from '@react-spectrum/s2';
import { formatPrice } from '../../utils/commonUtils';
import styles from '../../styles/renewal/Renewal.module.css';

interface EstimatedTotalProps {
  total: number;
  currency: string;
  leftText?: string;
  showTax?: boolean;
}

export const EstimatedTotal: React.FC<EstimatedTotalProps> = ({
  total,
  currency,
  leftText = 'Reflecting Partner pricing.',
  showTax = true,
}) => {
  const formattedPrice =
    total > 0 && currency ? formatPrice(total, currency) : total > 0 ? `${total.toFixed(2)}` : '--';

  return (
    <div className={styles.estimatedTotalSection}>
      <span style={{ fontSize: 14 }}>{leftText}</span>
      <div className={styles.estimatedTotalRight}>
        <Text>Estimated total</Text>
        <Heading level={3}>{formattedPrice}</Heading>
        {showTax && <span style={{ fontSize: 13, fontWeight: 400 }}>+tax</span>}
      </div>
    </div>
  );
};
