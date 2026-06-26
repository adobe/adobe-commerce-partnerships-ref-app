import React from 'react';
import { useRouter } from 'next/router';
import { getIconWithFallback } from '../utils/iconUtils';
import { formatPrice } from '../utils/commonUtils';
import styles from '../styles/orderConfirmation/OrderConfirmation.module.css';
import { createClientLogger } from '../utils/logger';

const logger = createClientLogger('orderConfirmation');

// Use a more reliable image path
const ORDER_SUMMARY_IMG = '/assets/OrderConfirmed.png';

interface Product {
  id: string;
  name: string;
  icon?: string;
  quantity: number;
}

export default function OrderConfirmedPage() {
  const router = useRouter();

  const {
    customerId,
    currencyCode,
    totalAmount,
    customerName,
    resellerId,
    products: productsParam,
  } = router.query;

  const total = parseFloat(totalAmount as string) || 0;
  const currency = currencyCode as string;
  const displayCustomerName = (customerName as string) || 'Customer';
  const navigationCustomerId = customerId as string;
  const navigationResellerId = (resellerId as string) || '';

  // Parse products from query parameters
  let products: Product[] = [];
  if (productsParam) {
    try {
      const parsedProducts = JSON.parse(productsParam as string);
      products = parsedProducts.map((product: any, index: number) => ({
        id: index.toString(),
        name: product.productFamily || 'Product',
        icon: getIconWithFallback(product.productFamily || '', '48x48'),
        quantity: product.quantity || 1,
      }));
    } catch (error) {
      logger.error({ err: error }, 'Error parsing products from query params');
      products = [];
    }
  }

  return (
    <div className={styles.pageContainer}>
      {/* Header (copied from checkout page) */}
      <header className={styles.header}>
        <svg
          width="78"
          height="20"
          viewBox="0 0 78 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M7.51838 1.3465H12.7944L20.2374 19.2662H14.6787L9.96798 7.35743L6.85887 15.1773H10.5521L12.0219 19.2662H0L7.51838 1.3465ZM26.4368 5.05858C26.9644 5.05858 27.5674 5.11511 28.1515 5.24701V0.800049H32.8058V18.456C31.7317 18.9459 29.4329 19.53 27.134 19.53C22.9508 19.53 19.3707 17.1558 19.3707 12.4074C19.3707 7.65892 22.8189 5.05858 26.4368 5.05858ZM27.0209 15.7049C27.4543 15.7049 27.7935 15.6295 28.1515 15.5165V9.01562C27.8124 8.88372 27.4543 8.82719 27.0021 8.82719C25.4758 8.82719 24.0626 9.95778 24.0626 12.332C24.0626 14.7062 25.5135 15.7049 27.0398 15.7049H27.0209ZM41.0967 5.05858C44.9784 5.05858 48.2759 7.67777 48.2759 12.2755C48.2759 16.8732 44.9784 19.4924 41.0967 19.4924C37.215 19.4924 33.8987 16.8732 33.8987 12.2755C33.8987 7.67777 37.1585 5.05858 41.0967 5.05858ZM41.0967 15.6295C42.4346 15.6295 43.6594 14.5555 43.6594 12.2943C43.6594 10.0331 42.4346 8.94025 41.0967 8.94025C39.7589 8.94025 38.5529 10.0143 38.5529 12.2943C38.5529 14.5743 39.7023 15.6295 41.0967 15.6295ZM49.3877 0.800049H54.0607V5.24701C54.626 5.13395 55.2102 5.05858 55.7943 5.05858C59.431 5.05858 62.8039 7.43281 62.8039 12.087C62.8039 16.7413 59.2237 19.4924 54.9652 19.4924C50.7067 19.4924 50.8197 19.1155 49.3688 18.456V0.800049H49.3877ZM55.0971 15.6861C56.6988 15.6861 58.1685 14.5366 58.1685 12.1624C58.1685 9.78819 56.7176 8.90256 55.1725 8.90256C53.6273 8.90256 54.3999 8.95909 54.0796 9.09099V15.5165C54.3434 15.6295 54.7014 15.7049 55.0971 15.7049V15.6861ZM70.7745 5.05858C74.2793 5.05858 77.4827 7.3009 77.4827 11.8232C77.4827 16.3456 77.4638 13.0292 77.3696 13.6133H68.6453C69.1352 15.1961 70.5107 15.9499 72.2631 15.9499C74.0155 15.9499 74.9954 15.6107 76.4651 14.9512V18.5125C75.1084 19.2097 73.4691 19.5112 71.7921 19.5112C67.3451 19.5112 63.8968 16.8355 63.8968 12.2943C63.8968 7.75314 67.0248 5.07742 70.7745 5.07742V5.05858ZM73.1299 10.7115C72.8849 9.18521 71.8674 8.56339 70.8311 8.56339C69.7947 8.56339 68.9279 9.20405 68.5887 10.7115H73.1299Z"
            fill="#EB1000"
          />
        </svg>
      </header>
      {/* Main content layout */}
      <div className={styles.mainContent}>
        {/* Left: Order summary card */}
        <div className={styles.orderSummaryCard}>
          <div className={styles.imageContainer}>
            <img
              src={ORDER_SUMMARY_IMG}
              alt="Order summary"
              className={styles.orderImage}
              onError={e => {
                logger.error({ event: e.type }, 'Error loading order summary image');
              }}
            />
          </div>
          {/* Product list */}
          {products.map(product => (
            <div key={product.id} className={styles.productItem}>
              <img
                src={product.icon || getIconWithFallback(null, '48x48')}
                alt={product.name}
                className={styles.productIcon}
              />
              <span className={styles.productName}>{product.name}</span>
            </div>
          ))}
          <div className={styles.orderDetails}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Customer</span>
              <span className={styles.detailValue}>{displayCustomerName || '—'}</span>
            </div>
            <div className={styles.detailRowLast}>
              <span className={styles.detailLabel}>Total</span>
              <span className={styles.detailValueTotal}>{formatPrice(total, currency)}</span>
            </div>
          </div>
        </div>
        {/* Right: Confirmation message */}
        <div className={styles.confirmationSection}>
          <h1 className={styles.confirmationTitle}>Thanks, the order is confirmed!</h1>
          <p className={styles.confirmationMessage}>
            Inform the Reseller and {displayCustomerName} of the changes.
          </p>
          <button
            className={styles.continueButton}
            onClick={() => {
              // Use the navigation IDs from either query params or cart
              const queryParams = new URLSearchParams({
                resellerId: navigationResellerId,
                customerId: navigationCustomerId,
              }).toString();
              router.push(`/customerdetails?${queryParams}`);
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
