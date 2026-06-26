import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@react-spectrum/s2';
import InfoCircle from '@react-spectrum/s2/icons/InfoCircle';
import { CatalogProduct } from '../models/Catalog';
import { CartItem } from '../contexts/CartContext';
import { getIconWithFallback } from '../utils/iconUtils';
import { formatPrice, getSKUFromOfferId } from '../utils/commonUtils';
import styles from '../styles/CatalogProductCard.module.css';

interface CatalogProductCardProps {
  product: CatalogProduct;
  onAddToCart: () => void;
  cartItems?: CartItem[];
}

const CatalogProductCard: React.FC<CatalogProductCardProps> = ({
  product,
  onAddToCart,
  cartItems = [],
}) => {
  const [iconError, setIconError] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const productSku = getSKUFromOfferId(product.offerId);
  const cartItem = cartItems.find(item => getSKUFromOfferId(item.offerId) === productSku);
  const isInCart = !!cartItem;
  const cartQuantity = cartItem?.quantity || 0;

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        const iconElement = (event.target as HTMLElement).closest(`.${styles.infoIcon}`);
        if (!iconElement) {
          setShowPopup(false);
        }
      }
    };

    if (showPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPopup]);

  const handleInfoIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPopup(!showPopup);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
  };

  const getIconUrl = () => {
    if (iconError) {
      return getIconWithFallback(null, '48x48');
    }
    return getIconWithFallback(product.productFamily || '', '48x48');
  };

  const handleIconError = () => {
    setIconError(true);
  };

  return (
    <>
      <div className={`${styles.productCard} ${showPopup ? styles.productCardWithPopup : ''}`}>
        <div className={styles.productInfo}>
          {/* Icon and product name in the same row */}
          <div className={styles.productHeader}>
            <div className={styles.productTitleRow}>
              <div className={styles.productIcon}>
                <img
                  src={getIconUrl()}
                  alt={`${product.productFamily} icon`}
                  width="40"
                  height="40"
                  onError={handleIconError}
                  className={styles.productIconImg}
                />
              </div>
              <div className={styles.productTitleContainer}>
                <h3 className={styles.productTitle}>{product.name}</h3>
              </div>
            </div>
          </div>

          <div className={styles.productDetails}>
            <div className={styles.offerIdContainer}>
              <span className={styles.productOfferId}>{product.offerId}</span>
              {product.additionalDetail && (
                <div className={styles.infoIconWrapper}>
                  <button
                    type="button"
                    onClick={handleInfoIconClick}
                    className={styles.infoIconButton}
                    aria-label="Show additional details"
                  >
                    <InfoCircle />
                  </button>
                  {showPopup && (
                    <div className={styles.popup} ref={popupRef}>
                      <div className={styles.popupHeader}>
                        <h4 className={styles.popupTitle}>Additional details</h4>
                        <button
                          className={styles.popupClose}
                          onClick={handleClosePopup}
                          aria-label="Close"
                        >
                          ×
                        </button>
                      </div>
                      <div className={styles.popupContent}>
                        {product.additionalDetail ? String(product.additionalDetail) : ''}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className={styles.pricingInfo}>
            <span className={styles.priceLabel}>Priced as low as:</span>
            <div className={styles.price}>
              {formatPrice(product.price || 0, product.currency || '')}/yr
              {product.priceUnit && <span className={styles.priceUnit}> {product.priceUnit}</span>}
            </div>
          </div>

          {isInCart ? (
            <div className={styles.cartQuantityDisplay}>
              <span className={styles.cartQuantityText}>{cartQuantity} in cart</span>
            </div>
          ) : (
            <Button fillStyle={'outline'} size="M" onPress={onAddToCart}>
              Buy
            </Button>
          )}
        </div>
      </div>
    </>
  );
};

export default CatalogProductCard;
