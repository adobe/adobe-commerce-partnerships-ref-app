import React from 'react';
import { Button, Heading, Text } from '@react-spectrum/s2';
import styles from '../../styles/renewal/Renewal.module.css';

interface RenewalDialogHeaderProps {
  title: string;
  onCancel: () => void;
  onSave: () => void;
  isSaving: boolean;
  isSaveDisabled?: boolean;
  saveButtonLabel?: string;
  anniversaryDate?: string;
  formatDate?: (date: string) => string;
}

export const RenewalDialogHeader: React.FC<RenewalDialogHeaderProps> = ({
  title,
  onCancel,
  onSave,
  isSaving,
  isSaveDisabled = false,
  saveButtonLabel = 'Save changes',
  anniversaryDate,
  formatDate,
}) => {
  const formatAnniversaryDate = (date: string) => {
    if (formatDate) {
      return formatDate(date);
    }
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className={styles.dialogHeader}>
      <div className={styles.headerTitleWrapper}>
        <Heading level={2}>{title}</Heading>
        {anniversaryDate && (
          <Text>
            <strong>Anniversary:</strong> {formatAnniversaryDate(anniversaryDate)}
          </Text>
        )}
      </div>
      <div className={styles.headerButtons}>
        <Button variant="secondary" onPress={onCancel} isDisabled={isSaving}>
          Close
        </Button>
        <Button variant="accent" onPress={onSave} isDisabled={isSaving || isSaveDisabled}>
          {saveButtonLabel}
        </Button>
      </div>
    </div>
  );
};
