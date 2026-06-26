import React, { useState, useEffect, useRef } from 'react';
import { TextField, Button } from '@react-spectrum/s2';
import ChevronDown from '@react-spectrum/s2/icons/ChevronDown';
import { usePaginatedCustomersList } from '../../hooks/usePaginatedCustomersList';
import { CustomerMinimal } from '../../models/Customer';
import styles from '../../styles/ResellerSelector.module.css';

export interface CustomerSelectorProps {
  resellerId: string;
  value?: string;
  onChange?: (customerId: string, customer?: CustomerMinimal) => void;
  label?: string;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  placement?: 'top' | 'bottom';
  isDisabled?: boolean;
}

const ITEMS_PER_PAGE = 50;

const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  resellerId,
  value = '',
  onChange,
  label = 'Search customer by name or ID',
  isRequired = false,
  isInvalid = false,
  errorMessage,
  placement = 'bottom',
  isDisabled = false,
}) => {
  const [searchValue, setSearchValue] = useState<string>(value);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerMinimal | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    customers: customersList,
    data,
    totalCount,
    hasMore,
    isLoading,
    isFetching,
    isPlaceholderData,
    error,
    debouncedSearch,
    isSearchMode,
    currentPage,
    goToPage,
  } = usePaginatedCustomersList({
    resellerId,
    itemsPerPage: ITEMS_PER_PAGE,
    enabled: !isDisabled && !!resellerId, // Fetch when resellerId is available and not disabled
    prefetchEnabled: isDropdownOpen && !isDisabled, // Only prefetch when dropdown is open
    search: searchValue,
  });

  const noCustomersFound = !isLoading && customersList.length === 0;

  // Clear selected customer if value prop is cleared externally (e.g., when reseller changes)
  useEffect(() => {
    if (!value && selectedCustomer) {
      setSelectedCustomer(null);
      setSearchValue('');
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearchChange = (newValue: string) => {
    setSearchValue(newValue);
    setIsDropdownOpen(newValue.length > 0 || customersList.length > 0);
    if (selectedCustomer) {
      setSelectedCustomer(null);
      onChange?.('', undefined);
    }
  };

  const handleCustomerSelect = (customer: CustomerMinimal) => {
    setSelectedCustomer(customer);
    setIsDropdownOpen(false);
    onChange?.(customer.customerId, customer);
  };

  const displayValue = selectedCustomer ? selectedCustomer.companyProfile.companyName : searchValue;

  return (
    <div
      ref={containerRef}
      className={`${styles.resellerSelectorContainer} ${isDropdownOpen ? styles.dropdownOpen : ''}`}
    >
      <div className={styles.inputWrapper}>
        <TextField
          label={label}
          value={displayValue}
          onChange={handleSearchChange}
          isRequired={isRequired}
          isInvalid={isInvalid}
          errorMessage={errorMessage}
          isDisabled={isDisabled}
        />
        {!isDisabled && (
          <div className={styles.dropdownButton} onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            <div
              className={isDropdownOpen ? styles.dropdownIconRotated : styles.dropdownIconNormal}
            >
              <ChevronDown />
            </div>
          </div>
        )}
      </div>

      {/* Dropdown Results */}
      {isDropdownOpen && !isDisabled && (
        <div
          className={`${styles.dropdownResults} ${
            placement === 'top' ? styles.dropdownResultsTop : ''
          }`}
          data-placement={placement}
        >
          {isLoading && customersList.length === 0 && (
            <div className={styles.loadingMessage}>Loading customers...</div>
          )}

          {!isLoading && noCustomersFound && (
            <div className={styles.noResellersMessage}>
              No customers found{isSearchMode ? ` for "${debouncedSearch}"` : ''}
            </div>
          )}

          {customersList.length > 0 && (
            <>
              {customersList.map(customer => (
                <div
                  key={customer.customerId}
                  className={`${styles.dropdownItem} ${
                    selectedCustomer?.customerId === customer.customerId ? styles.selectedItem : ''
                  }`}
                  onClick={() => handleCustomerSelect(customer)}
                >
                  <div className={styles.resellerName}>{customer.companyProfile.companyName}</div>
                  <div className={styles.resellerId}>ID: {customer.customerId}</div>
                </div>
              ))}

              {/* Pagination Controls */}
              {data && totalCount > ITEMS_PER_PAGE && (
                <div className={styles.pagination}>
                  <Button
                    variant="secondary"
                    size="S"
                    isDisabled={currentPage === 1 || (isFetching && !isPlaceholderData)}
                    onPress={() => goToPage(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <span className={styles.pageInfo}>
                    Page {currentPage} of {Math.ceil(totalCount / ITEMS_PER_PAGE)}
                    {isFetching && isPlaceholderData && ' (Loading...)'}
                  </span>
                  <Button
                    variant="secondary"
                    size="S"
                    isDisabled={!hasMore || (isFetching && !isPlaceholderData)}
                    onPress={() => goToPage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
          {error && (
            <div className={styles.errorMessage}>
              {error?.message || 'Failed to load customers'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerSelector;
