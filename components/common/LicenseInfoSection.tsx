import React from 'react';
import { Text } from '@react-spectrum/s2';
import { UpdatePriceButton } from './UpdatePriceButton';
import type { DiscountLevelsMap } from '../../types/discountLevel';
import styles from '../../styles/renewal/Renewal.module.css';

interface LicenseInfoSectionProps {
  totalLicenses?: number;
  discountLevelsMap?: DiscountLevelsMap;
  showDiscount?: boolean;
  onUpdatePrice?: () => void;
  isUpdatingPrices?: boolean;
  pricesCleared?: boolean;
}

export const LicenseInfoSection: React.FC<LicenseInfoSectionProps> = ({
  totalLicenses,
  discountLevelsMap,
  showDiscount = true,
  onUpdatePrice,
  isUpdatingPrices = false,
  pricesCleared = false,
}) => {
  // Calculate total licenses from discountLevelsMap if available
  const calculatedTotalLicenses =
    (discountLevelsMap?.LICENSE?.quantity || 0) + (discountLevelsMap?.TRANSACTION?.quantity || 0);

  // Use calculated total if discountLevelsMap is available, otherwise use provided totalLicenses
  const displayTotalLicenses =
    discountLevelsMap?.LICENSE || discountLevelsMap?.TRANSACTION
      ? calculatedTotalLicenses
      : totalLicenses || 0;

  return (
    <div className={styles.licenseInfoRow}>
      <div className={styles.licenseInfo}>
        {discountLevelsMap?.LICENSE || discountLevelsMap?.TRANSACTION ? (
          <>
            {discountLevelsMap.LICENSE && (
              <span style={{ fontWeight: 'bold' }}>
                {discountLevelsMap.LICENSE.quantity} Licenses
                {showDiscount && discountLevelsMap.LICENSE.discountLevel && (
                  <Text> ({discountLevelsMap.LICENSE.discountLevel})</Text>
                )}
              </span>
            )}
            {discountLevelsMap.LICENSE && discountLevelsMap.TRANSACTION && <br />}
            {discountLevelsMap.TRANSACTION && (
              <span style={{ fontWeight: 'bold' }}>
                {discountLevelsMap.TRANSACTION.quantity} Transactions
                {showDiscount && discountLevelsMap.TRANSACTION.discountLevel && (
                  <Text> ({discountLevelsMap.TRANSACTION.discountLevel})</Text>
                )}
              </span>
            )}
          </>
        ) : (
          displayTotalLicenses > 0 && (
            <span style={{ fontWeight: 'bold' }}>{displayTotalLicenses} Licenses</span>
          )
        )}
      </div>
      {onUpdatePrice && (
        <UpdatePriceButton
          onPress={onUpdatePrice}
          isDisabled={isUpdatingPrices}
          isUpdating={isUpdatingPrices}
          pricesCleared={pricesCleared}
        />
      )}
    </div>
  );
};
