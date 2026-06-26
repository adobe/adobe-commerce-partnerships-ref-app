import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Button, Card, DialogTrigger, Heading } from '@react-spectrum/s2';
import ChevronDown from '@react-spectrum/s2/icons/ChevronDown';
import ChevronUp from '@react-spectrum/s2/icons/ChevronUp';
import { formatPrice, getSubscriptionStatusLabel } from '../../utils/commonUtils';
import { usePartnerDetails } from '../../contexts/PartnerContext';
import { useCart } from '../../contexts/CartContext';
import { ProductToDisplay } from '../../utils/productsPanelUtils';
import { getIconWithFallback } from '../../utils/iconUtils';
import { UpgradePathsDialog } from './UpgradePathsDialog';
import { useOfferSwitchPaths } from '../../hooks/useOfferSwitchPaths';
import styles from '../../styles/customerdetails/ActiveProducts.module.css';

interface ActiveProductsProps {
  products: ProductToDisplay[];
  customerId?: string;
  customerName?: string;
  resellerId?: string;
  marketSegment?: string;
}

export default function ActiveProducts({
  products,
  customerId,
  customerName,
  resellerId,
  marketSegment,
}: ActiveProductsProps) {
  const router = useRouter();
  const [isProductsExpanded, setIsProductsExpanded] = useState(true);
  const { regionCurrencies } = usePartnerDetails();
  const { addToCart, setShowCartModal, setCustomerInfoInCart } = useCart();

  const { hasUpgradePath, getUpgradePathDetails } = useOfferSwitchPaths(
    customerId,
    products.map(p => p.id)
  );

  function isDisabled(product: ProductToDisplay): boolean {
    if (!product.offerId) {
      return true;
    }
    if (
      !product.currencyCode ||
      !regionCurrencies.some(rc => rc.currency === product.currencyCode)
    ) {
      return true;
    }
    return false;
  }

  return (
    <div className={styles.container}>
      {/* Active Products Header */}
      <div className={styles.header} onClick={() => setIsProductsExpanded(!isProductsExpanded)}>
        {isProductsExpanded ? <ChevronUp /> : <ChevronDown />}
        <Heading level={2}>Active products</Heading>
      </div>

      {/* Products Grid - Collapsible */}
      {isProductsExpanded && (
        <div className={styles.grid}>
          {products.length === 0 ? (
            <div className={styles.emptyState}>No active products</div>
          ) : (
            products.map(product => {
              return (
                <div key={product.id}>
                  <Card size={'L'}>
                    <div className={styles.productHeader}>
                      <div
                        className={
                          product.icon ? styles.iconContainerWithImage : styles.iconContainer
                        }
                      >
                        <img
                          src={product.icon || getIconWithFallback(null, '48x48')}
                          alt={product.name || product.offerId}
                          className={styles.productIcon}
                          onError={e => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.src = getIconWithFallback(null, '48x48');
                          }}
                        />
                      </div>
                      <div className={styles.productName} title={product.name || ''}>
                        {product.name || ''}
                      </div>
                    </div>

                    {/* Content Area */}
                    <div className={styles.contentArea}>
                      {/* Auto renewal and Status */}
                      <div className={styles.renewalStatusGroup}>
                        <div className={styles.autoRenewal}>
                          Auto-renewal: {product.autoRenewal?.enabled ? 'On' : 'Off'}
                        </div>
                        <div className={styles.status}>
                          Status: {getSubscriptionStatusLabel(product.status)}
                        </div>
                      </div>

                      {/* Partner Price */}
                      {product.partnerPrice && (
                        <div className={styles.partnerPriceSection}>
                          <div className={styles.partnerPriceLabel}>
                            Partner price, {product.discountLevelText}
                          </div>
                          <div className={styles.partnerPriceValue}>
                            {product.partnerPrice
                              ? `${formatPrice(parseFloat(product.partnerPrice), product.currencyCode)}/yr per license`
                              : 'Price not available'}
                          </div>
                        </div>
                      )}

                      {/* Licenses */}
                      <div className={styles.licensesSection}>
                        <div className={styles.licensesLabel}>Licenses</div>
                        <div className={styles.licensesValue}>
                          {product.currentQuantity || 0} ({product.usedQuantity || 0} in use)
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className={styles.buttonRow}>
                        <Button
                          variant="primary"
                          fillStyle={'outline'}
                          onPress={() => {
                            if (customerId && customerName && resellerId) {
                              setCustomerInfoInCart({
                                customerId,
                                customerName,
                                resellerId,
                              });
                            }

                            if (product.offerId) {
                              addToCart(
                                product.offerId,
                                product.name,
                                parseFloat(product.partnerPrice || '0.0'),
                                product.currencyCode,
                                marketSegment,
                                product.name,
                                1
                              );
                              setShowCartModal(true);
                            }
                          }}
                          isDisabled={isDisabled(product)}
                        >
                          Add licenses
                        </Button>
                        {hasUpgradePath(product.id) && (
                          <DialogTrigger>
                            <Button variant="primary" isDisabled={isDisabled(product)}>
                              Upgrade
                            </Button>
                            <UpgradePathsDialog
                              product={product}
                              upgradePaths={getUpgradePathDetails(product.id)}
                              onSelectUpgrade={(targetOfferId, switchType) => {
                                const params = new URLSearchParams({
                                  customerId: customerId || '',
                                  resellerId: resellerId || '',
                                  sourceOfferId: product.offerId || '',
                                  sourceSubscriptionId: product.id,
                                  sourceCurrency: product.currencyCode,
                                  targetOfferId,
                                  switchType,
                                  quantity: String(product.currentQuantity || 0),
                                });
                                router.push(`/checkout/upgrade?${params.toString()}`);
                              }}
                            />
                          </DialogTrigger>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
