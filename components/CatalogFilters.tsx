import React, { useMemo } from 'react';
import { RadioGroup, Radio } from '@react-spectrum/s2';
import { CatalogFilters as FiltersType } from '../models/Catalog';
import { usePartnerDetails } from '../contexts/PartnerContext';
import { getMarketSegmentDisplayName } from '../utils/commonUtils';
import styles from '../styles/CatalogFilters.module.css';

interface CatalogFiltersProps {
  filters: FiltersType;
  onFiltersChange: (filters: FiltersType) => void;
}

// Filter option configuration
interface FilterOption {
  value: string;
  label: string;
}

interface FilterConfig {
  title: string;
  key: keyof FiltersType;
  getValue: (filters: FiltersType) => string;
  options: FilterOption[] | (() => FilterOption[]);
}

// Reusable Filter Section Component
interface FilterSectionProps {
  title: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

const FilterSection: React.FC<FilterSectionProps> = ({ title, value, options, onChange }) => (
  <div className={styles.filterSection}>
    <div className={styles.filterHeader}>
      <span className={styles.filterTitle}>{title}</span>
    </div>
    <div className={styles.filterOptions}>
      <RadioGroup value={value} onChange={onChange} aria-label={title}>
        {options.map(option => (
          <Radio key={option.value} value={option.value}>
            {option.label}
          </Radio>
        ))}
      </RadioGroup>
    </div>
  </div>
);

const CatalogFilters: React.FC<CatalogFiltersProps> = ({ filters, onFiltersChange }) => {
  const { regionCurrencies, marketSegments } = usePartnerDetails();

  const marketSegmentOptions = useMemo(() => {
    if (!marketSegments || marketSegments.length === 0) {
      return [];
    }

    return marketSegments
      .map(code => ({
        value: getMarketSegmentDisplayName(code),
        label: getMarketSegmentDisplayName(code),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [marketSegments]);

  // Generic handler for filter changes - Fixed type safety
  const handleFilterChange = (key: keyof FiltersType, value: string) => {
    if (key === 'currency') {
      onFiltersChange({
        ...filters,
        currency: value,
      });
    } else {
      // Handle array fields explicitly with proper type safety
      const updatedFilters = { ...filters };
      if (key === 'marketSegment') {
        updatedFilters.marketSegment = [value];
      } else if (key === 'categories') {
        updatedFilters.categories = [value];
      } else if (key === 'type') {
        updatedFilters.type = [value];
      }
      onFiltersChange(updatedFilters);
    }
  };

  // Filter configurations
  const filterConfigs: FilterConfig[] = [
    {
      title: 'Market segment',
      key: 'marketSegment',
      getValue: filters => filters.marketSegment[0] || marketSegmentOptions[0]?.value || '',
      options: marketSegmentOptions,
    },
    {
      title: 'Categories',
      key: 'categories',
      getValue: filters => filters.categories[0] || 'All',
      options: [
        { value: 'All', label: 'All' },
        { value: 'Document Cloud', label: 'Document Cloud' },
        { value: 'Creative Cloud', label: 'Creative Cloud' },
      ],
    },
    {
      title: 'Type',
      key: 'type',
      getValue: filters => filters.type[0] || 'All',
      options: [
        { value: 'All', label: 'All' },
        { value: 'Teams', label: 'Teams' },
        { value: 'Enterprise', label: 'Enterprise' },
      ],
    },
    {
      title: 'Currency',
      key: 'currency',
      getValue: filters => filters.currency,
      options: () =>
        regionCurrencies.map(currencyInfo => ({
          value: currencyInfo.currency,
          label: currencyInfo.currency,
        })),
    },
  ];

  return (
    <div className={styles.filtersContainer}>
      {filterConfigs.map(config => {
        const options = typeof config.options === 'function' ? config.options() : config.options;
        const currentValue = config.getValue(filters);

        return (
          <FilterSection
            key={config.key}
            title={config.title}
            value={currentValue}
            options={options}
            onChange={value => handleFilterChange(config.key, value)}
          />
        );
      })}
    </div>
  );
};

export default CatalogFilters;
