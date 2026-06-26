import React, { useState, useEffect, useRef } from 'react';
import { TextField, Button } from '@react-spectrum/s2';
import ChevronDown from '@react-spectrum/s2/icons/ChevronDown';
import { usePaginatedResellersList } from '../../hooks/usePaginatedResellersList';
import { ResellerMinimal } from '../../models/Reseller';
import styles from '../../styles/ResellerSelector.module.css';

export interface ResellerSelectorProps {
  value?: string;
  onChange?: (resellerId: string, reseller?: ResellerMinimal) => void;
  label?: string;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  placement?: 'top' | 'bottom';
}

const ITEMS_PER_PAGE = 50;

const ResellerSelector: React.FC<ResellerSelectorProps> = ({
  value = '',
  onChange,
  label = 'Search Reseller by name or ID',
  isRequired = false,
  isInvalid = false,
  errorMessage,
  placement = 'bottom',
}) => {
  const [searchValue, setSearchValue] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [selectedReseller, setSelectedReseller] = useState<ResellerMinimal | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    resellers: resellersList,
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
  } = usePaginatedResellersList({
    enabled: true,
    prefetchEnabled: true,
    search: searchValue,
  });

  const noResellersFound = !isLoading && resellersList.length === 0 && isSearchMode;

  // Clear selected reseller if value prop changes and doesn't match
  useEffect(() => {
    if (value && selectedReseller && selectedReseller.resellerId !== value) {
      setSelectedReseller(null);
      setSearchValue('');
    } else if (!value && selectedReseller) {
      setSelectedReseller(null);
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
    setIsDropdownOpen(newValue.length > 0 || resellersList.length > 0);
    if (selectedReseller) {
      setSelectedReseller(null);
      onChange?.('', undefined);
    }
  };

  const handleResellerSelect = (reseller: ResellerMinimal) => {
    setSelectedReseller(reseller);
    setIsDropdownOpen(false);
    onChange?.(reseller.resellerId, reseller);
  };

  const displayValue = selectedReseller ? selectedReseller.companyProfile.companyName : searchValue;

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
        />
        <div className={styles.dropdownButton} onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
          <div className={isDropdownOpen ? styles.dropdownIconRotated : styles.dropdownIconNormal}>
            <ChevronDown />
          </div>
        </div>
      </div>

      {/* Dropdown Results */}
      {isDropdownOpen && (
        <div
          className={`${styles.dropdownResults} ${
            placement === 'top' ? styles.dropdownResultsTop : ''
          }`}
          data-placement={placement}
        >
          {isLoading && resellersList.length === 0 && (
            <div className={styles.loadingMessage}>Loading resellers...</div>
          )}

          {!isLoading && noResellersFound && (
            <div className={styles.noResellersMessage}>
              No resellers found{isSearchMode ? ` for "${debouncedSearch}"` : ''}
            </div>
          )}

          {resellersList.length > 0 && (
            <>
              {resellersList.map(reseller => (
                <div
                  key={reseller.resellerId}
                  className={`${styles.dropdownItem} ${
                    selectedReseller?.resellerId === reseller.resellerId ? styles.selectedItem : ''
                  }`}
                  onClick={() => handleResellerSelect(reseller)}
                >
                  <div className={styles.resellerName}>{reseller.companyProfile.companyName}</div>
                  <div className={styles.resellerId}>ID: {reseller.resellerId}</div>
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
              {error?.message || 'Failed to load resellers'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default ResellerSelector;
