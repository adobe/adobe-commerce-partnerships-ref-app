import React from 'react';
import { Button } from '@react-spectrum/s2';
import Refresh from '@react-spectrum/s2/icons/Refresh';
import styles from '../../styles/renewal/Renewal.module.css';

interface UpdatePriceButtonProps {
  onPress: () => void;
  isDisabled: boolean;
  isUpdating?: boolean;
  pricesCleared?: boolean;
}

export const UpdatePriceButton: React.FC<UpdatePriceButtonProps> = ({
  onPress,
  isDisabled,
  pricesCleared = false,
}) => {
  return (
    <Button
      variant={pricesCleared ? 'accent' : 'secondary'}
      onPress={onPress}
      isDisabled={isDisabled}
      UNSAFE_className={`${styles.updatePriceButton} ${
        isDisabled ? styles.updatePriceButtonDisabled : ''
      }`}
    >
      <Refresh />
      Update price
    </Button>
  );
};
