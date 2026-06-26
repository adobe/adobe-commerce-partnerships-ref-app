import React, { useState } from 'react';
import { Button, Content, Dialog, Heading, Radio, RadioGroup, Text } from '@react-spectrum/s2';
import { useProductNamesFromPricelist } from '../../hooks/useProductPricing';
import { usePartnerDetails } from '../../contexts/PartnerContext';
import { getIconWithFallback } from '../../utils/iconUtils';
import { ProductToDisplay } from '../../utils/productsPanelUtils';
import styles from '../../styles/customerdetails/UpgradePathsDialog.module.css';

interface SwitchPathDetail {
  targetBaseOfferId: string;
  switchType: string;
}

interface UpgradePathsDialogProps {
  product: ProductToDisplay;
  upgradePaths: SwitchPathDetail[];
  onSelectUpgrade: (targetOfferId: string, switchType: string) => void;
}

export const UpgradePathsDialog: React.FC<UpgradePathsDialogProps> = ({
  product,
  upgradePaths,
  onSelectUpgrade,
}) => {
  const [selectedOfferId, setSelectedOfferId] = useState('');
  const { region } = usePartnerDetails();

  const { getProductName, isLoading } = useProductNamesFromPricelist(
    upgradePaths.map(({ targetBaseOfferId }) => ({
      offerId: targetBaseOfferId,
      currencyCode: product.currencyCode,
      region,
    }))
  );

  const items = upgradePaths.map(({ targetBaseOfferId, switchType }) => ({
    id: targetBaseOfferId,
    name: getProductName(targetBaseOfferId) || targetBaseOfferId,
    offerId: targetBaseOfferId,
    switchType,
  }));

  return (
    <Dialog size={'L'}>
      {({ close }) => (
        <>
          <Heading slot="title">Available upgrades</Heading>
          <Content>
            <p className={styles.description}>
              Select a product to upgrade to. Pricing details will be available when you proceed.
            </p>
            <p className={styles.subtitle}>
              Current product: <strong>{product.name}</strong>
            </p>

            {isLoading ? (
              <div className={styles.loading}>Loading upgrade options...</div>
            ) : (
              <>
                <p className={styles.subtitle}>
                  Upgrade to:
                  {selectedOfferId && (
                    <>
                      {' '}
                      <strong>{items.find(i => i.id === selectedOfferId)?.name}</strong>
                    </>
                  )}
                </p>
                <RadioGroup
                  aria-label="Select upgrade target"
                  value={selectedOfferId}
                  onChange={setSelectedOfferId}
                >
                  <div className={styles.list}>
                    {items.map(item => (
                      <label
                        key={item.id}
                        className={`${styles.listItem} ${selectedOfferId === item.id ? styles.listItemSelected : ''}`}
                      >
                        <Radio value={item.id} aria-label={item.name} />
                        <img
                          src={getIconWithFallback(item.name, '48x48')}
                          alt={item.name}
                          className={styles.itemIcon}
                          onError={e => {
                            (e.currentTarget as HTMLImageElement).src = getIconWithFallback(
                              null,
                              '48x48'
                            );
                          }}
                        />
                        <div className={styles.itemDetails}>
                          <div className={styles.itemName}>{item.name}</div>
                          <div className={styles.itemOfferId}>{item.offerId}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </RadioGroup>
              </>
            )}

            <div className={styles.actions}>
              <Button variant="secondary" onPress={close}>
                <Text>Cancel</Text>
              </Button>
              <Button
                variant="accent"
                isDisabled={!selectedOfferId}
                onPress={() => {
                  const selected = items.find(i => i.id === selectedOfferId);
                  onSelectUpgrade(selectedOfferId, selected?.switchType ?? '');
                  close();
                }}
              >
                <Text>Proceed</Text>
              </Button>
            </div>
          </Content>
        </>
      )}
    </Dialog>
  );
};
