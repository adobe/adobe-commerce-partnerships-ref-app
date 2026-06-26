import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Link } from '@react-spectrum/s2';
import { OrdersHistoryOrder } from '../../models/Order';
import { formatDate } from '../../utils/customerDetailsUtils';
import { getOrderStatusText, getOrderTypeText } from '../../utils/commonUtils';
import OrderDetailsDialog from './OrderDetailsDialog';
import styles from '../../styles/customerdetails/PurchaseHistory.module.css';
import { ORDER_API_TYPE } from '../../utils/constants';

interface PurchaseHistoryProps {
  customerId: string;
  customerName?: string;
}

// Fetch orders history function
const fetchOrdersHistory = async (customerId: string, offset: number = 0, limit: number = 25) => {
  const url = `/api/orders?type=${ORDER_API_TYPE.GET_ORDERS_HISTORY}&customerId=${customerId}&offset=${offset}&limit=${limit}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch orders history: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

export default function PurchaseHistoryPanel({ customerId }: PurchaseHistoryProps) {
  const [currentPage, setCurrentPage] = useState(1); // Changed to 1-based
  const [pageSize] = useState(10);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrdersHistoryOrder | null>(null);

  // Handle page changes
  const handlePageChange = React.useCallback((page: number) => {
    if (page < 1) return;
    setCurrentPage(page);
  }, []);

  // Handle order click
  const handleOrderClick = (order: OrdersHistoryOrder) => {
    setSelectedOrder(order);
    setIsOrderDialogOpen(true);
  };

  // Fetch orders history
  const {
    data: ordersHistory,
    isLoading,
    error,
    isFetching,
    isPlaceholderData,
  } = useQuery({
    queryKey: ['ordersHistory', customerId, currentPage],
    queryFn: () => {
      const offset = (currentPage - 1) * pageSize;
      return fetchOrdersHistory(customerId!, offset, pageSize);
    },
    enabled: !!customerId,
    placeholderData: previousData => previousData,
    staleTime: 0,
    gcTime: 0,
  });

  return (
    <div className={styles.container}>
      {/* Content */}
      {isLoading ? (
        <div className={styles.loadingState}>Loading purchase history...</div>
      ) : error ? (
        <div className={styles.errorState}>Error loading purchase history: {error.message}</div>
      ) : !ordersHistory || ordersHistory.items.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateText}>No purchase history available</div>
          <div className={styles.emptyStateSubtext}>
            Purchase history will be displayed here when available
          </div>
        </div>
      ) : (
        <>
          <div className={styles.tableContainer}>
            {/* Table Header */}
            <div className={styles.tableHeader}>
              <div>ID</div>
              <div>Type</div>
              <div>Date</div>
              <div>Source</div>
              <div>Status</div>
            </div>

            {/* Table Rows */}
            <div className={styles.tableRows}>
              {ordersHistory.items.map((order: OrdersHistoryOrder, index: number) => (
                <div key={order.orderId || index} className={styles.tableRow}>
                  {/* ID Column */}
                  <div>
                    <Link variant="primary" onPress={() => handleOrderClick(order)}>
                      {order.orderId}
                    </Link>
                  </div>

                  {/* Type Column */}
                  <div className={styles.typeCell}>{getOrderTypeText(order.orderType)}</div>

                  {/* Date Column */}
                  <div className={styles.dateCell}>{formatDate(order.creationDate || '')}</div>

                  {/* Source Column */}
                  <div className={styles.sourceCell}>{order.source || '-'}</div>

                  {/* Status Column */}
                  <div>
                    <span
                      className={`${styles.statusBadge} ${
                        order.status === '1000'
                          ? styles.statusActive
                          : order.status === '1001'
                            ? styles.statusSuspended
                            : order.status === '1002'
                              ? styles.statusCancelled
                              : order.status === '1003'
                                ? styles.statusExpired
                                : order.status === '1009'
                                  ? styles.statusScheduled
                                  : styles.statusExpired
                      }`}
                    >
                      {getOrderStatusText(order.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination Text Below Table */}
          <div className={styles.paginationContainer}>
            {/* Loading indicator while fetching in background */}
            {isFetching && isPlaceholderData && (
              <div className={styles.loadingIndicator}>
                <div className={styles.spinner} />
              </div>
            )}

            {/* Showing text with range - First */}
            <div className={styles.paginationInfo}>
              Showing {(currentPage - 1) * pageSize + 1}-
              {Math.min(currentPage * pageSize, ordersHistory.totalCount)} of{' '}
              {ordersHistory.totalCount} orders
            </div>

            {/* Pagination Controls - Next to showing text */}
            {ordersHistory.totalCount > pageSize && (
              <div className={styles.paginationControls}>
                <Button
                  variant={'secondary'}
                  onPress={() => handlePageChange(currentPage - 1)}
                  isDisabled={currentPage === 1 || (isFetching && !isPlaceholderData)}
                >
                  Previous
                </Button>

                <span className={styles.paginationInfo}>
                  Page {currentPage} of {Math.ceil(ordersHistory.totalCount / pageSize)}
                  {isFetching && isPlaceholderData && ' (Loading...)'}
                </span>

                <Button
                  variant={'secondary'}
                  onPress={() => handlePageChange(currentPage + 1)}
                  isDisabled={!ordersHistory.hasMore || (isFetching && !isPlaceholderData)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        isOpen={isOrderDialogOpen}
        onClose={() => {
          setIsOrderDialogOpen(false);
          setSelectedOrder(null);
        }}
        orderData={selectedOrder}
      />
    </div>
  );
}
