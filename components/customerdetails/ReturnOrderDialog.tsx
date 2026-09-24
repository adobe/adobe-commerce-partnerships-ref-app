import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card, Switch, Text } from '@react-spectrum/s2';
import { useProductNamesFromPricelist } from '../../hooks/useProductPricing';
import { useReturnOrder } from '../../hooks/useOrderOperations';
import { OrdersHistoryOrder, LineItem } from '../../models/Order';
import { usePartnerDetails } from '../../contexts/PartnerContext';
import { useToastState } from '../../hooks/useToastState';
import { getIconWithFallback } from '../../utils/iconUtils';
import { generateExternalReferenceId } from '../../utils/commonUtils';
import { ErrorToast, SuccessToast } from '../../utils/ToastMessageUtils';
import { buildReturnErrorMessage } from '../../utils/returnOrderUtils';
import styles from '../../styles/customerdetails/ReturnOrderDialog.module.css';

interface ReturnOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: OrdersHistoryOrder | null;
  customerId: string;
}

const ReturnOrderDialog: React.FC<ReturnOrderDialogProps> = ({
  isOpen,
  onClose,
  orderData,
  customerId,
}) => {
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const { region } = usePartnerDetails();
  const queryClient = useQueryClient();
  const returnOrder = useReturnOrder();
  const { toastState, showError, showSuccess, clearError, clearSuccess } = useToastState();

  const isSubmitting = returnOrder.isPending;
  const success = returnOrder.isSuccess;

  useEffect(() => {
    if (isOpen && orderData?.lineItems) {
      setSelectedItems(new Set());
      returnOrder.reset();
      clearError();
      clearSuccess();
    }
    // returnOrder.reset is stable; excluded to avoid re-running on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, orderData, clearError, clearSuccess]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const subscriptionContexts = useMemo(
    () =>
      orderData?.lineItems
        ?.filter(item => item.offerId && orderData.currencyCode)
        .map(item => ({
          offerId: item.offerId!,
          currencyCode: orderData.currencyCode!,
          region,
        })) ?? [],
    [orderData, region]
  );

  const { getProductName } = useProductNamesFromPricelist(subscriptionContexts);

  if (!isOpen) return null;

  let returnButtonLabel = 'Return';
  if (isSubmitting) {
    returnButtonLabel = 'Returning...';
  } else if (success) {
    returnButtonLabel = 'Returned!';
  }

  const toggleItem = (extLineItemNumber: number) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(extLineItemNumber)) {
        next.delete(extLineItemNumber);
      } else {
        next.add(extLineItemNumber);
      }
      return next;
    });
  };

  const handleReturn = () => {
    if (!orderData || selectedItems.size === 0) return;

    clearError();

    const lineItems = orderData.lineItems
      .filter(item => selectedItems.has(item.extLineItemNumber) && item.status === '1000')
      .map(item => ({
        extLineItemNumber: item.extLineItemNumber,
        offerId: item.offerId,
        quantity: item.quantity,
        ...(item.currencyCode ? { currencyCode: item.currencyCode } : {}),
      }));

    returnOrder.mutate(
      {
        customerId,
        referenceOrderId: orderData.orderId || orderData.referenceOrderId,
        externalReferenceId: generateExternalReferenceId(),
        currencyCode: orderData.currencyCode,
        lineItems,
      },
      {
        onSuccess: () => {
          showSuccess('Return submitted');
          setTimeout(() => {
            onClose();
            // Invalidate order history after a slight delay so the backend reflects the
            // return; TanStack Query then automatically refetches the purchase history.
            queryClient.invalidateQueries({ queryKey: ['ordersHistory', customerId] });
          }, 1500);
        },
        onError: (err: Error) => {
          showError(buildReturnErrorMessage(err as Error & { additionalDetails?: string[] }));
        },
      }
    );
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose} role="presentation">
        <div
          className={styles.dialog}
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="return-order-dialog-title"
        >
          <div className={styles.header}>
            <h2 className={styles.title} id="return-order-dialog-title">
              Return Order
            </h2>
            <div className={styles.headerActions}>
              <Button
                variant="secondary"
                fillStyle="outline"
                onPress={onClose}
                isDisabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="accent"
                onPress={handleReturn}
                isDisabled={isSubmitting || selectedItems.size === 0 || success}
              >
                {returnButtonLabel}
              </Button>
            </div>
          </div>

          <div className={styles.content}>
            {orderData ? (
              <div className={styles.productList}>
                {orderData.lineItems
                  .filter((item: LineItem) => item.status === '1000')
                  .map((item: LineItem, index: number) => {
                    const isSelected = selectedItems.has(item.extLineItemNumber);
                    const productName = getProductName(item.offerId) || item.offerId;

                    return (
                      <Card key={item.offerId || index} UNSAFE_className={styles.productCard}>
                        <div className={styles.cardHeader}>
                          <div className={styles.productHeader}>
                            <img
                              src={getIconWithFallback(productName, '48x48')}
                              alt={productName || ''}
                              className={styles.productIcon}
                              onError={e => {
                                const target = e.currentTarget as HTMLImageElement;
                                target.src = getIconWithFallback(null, '48x48');
                              }}
                            />
                            <div className={styles.productName}>{productName}</div>
                          </div>
                          <Switch
                            isSelected={isSelected}
                            onChange={() => toggleItem(item.extLineItemNumber)}
                            isDisabled={isSubmitting}
                          >
                            <Text>Return</Text>
                          </Switch>
                        </div>

                        <div className={styles.productInfo}>
                          <div className={styles.leftCol}>
                            <span className={styles.quantity}>{item.quantity} licenses</span>
                            <span className={styles.offerId}>{item.offerId}</span>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
              </div>
            ) : (
              <div className={styles.noDataContainer}>
                <p>No order data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <SuccessToast
        show={toastState.success.show}
        message={toastState.success.message}
        onClose={clearSuccess}
      />
      <ErrorToast
        show={toastState.error.show}
        message={toastState.error.message}
        onClose={clearError}
      />
    </>
  );
};

export default ReturnOrderDialog;
