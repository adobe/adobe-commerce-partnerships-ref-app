import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { PartnerDetails, Currency } from '../models/PartnerDetails';

interface PartnerContextType {
  partnerDetails: PartnerDetails | undefined;
  partnerName: string;
  availableCurrencies: Currency[];
  region: string;
  regionCurrencies: Currency[];
  marketSegments: string[];
  isLoading: boolean;
  error: Error | null;
}

const PartnerContext = createContext<PartnerContextType | undefined>(undefined);

interface PartnerProviderProps {
  children: ReactNode;
}

const fetchPartnerDetails = async (): Promise<PartnerDetails> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch('/api/partnerDetails', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Failed to fetch partner contract: ${response.status} ${responseText}`);
    }

    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error('Invalid API response format');
    }

    if (!result.data) {
      throw new Error('Invalid response format: missing data field');
    }

    return result.data as PartnerDetails;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const PartnerProvider: React.FC<PartnerProviderProps> = ({ children }) => {
  const staleTime = 24 * 60 * 60 * 1000;
  const gcTime = 7 * 24 * 60 * 60 * 1000;

  const {
    data: partnerDetails,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['partnerDetails'],
    queryFn: fetchPartnerDetails,
    staleTime,
    gcTime,
    retry: 1,
  });

  // Extract available currencies from contract
  const availableCurrencies = React.useMemo(() => {
    if (!partnerDetails?.currencies) return [];
    return partnerDetails.currencies;
  }, [partnerDetails]);

  // Get region from partner contract currencies (first currency's region)
  const region = React.useMemo(() => {
    if (availableCurrencies.length > 0) {
      return availableCurrencies[0].priceRegion;
    }
    return '';
  }, [availableCurrencies]);

  // Filter currencies to only those matching the region
  const regionCurrencies = React.useMemo(() => {
    if (!region || !availableCurrencies.length) return availableCurrencies;
    return availableCurrencies.filter(currency => currency.priceRegion === region);
  }, [availableCurrencies, region]);

  const marketSegments = React.useMemo(() => {
    if (!partnerDetails?.marketSegments || partnerDetails.marketSegments.length === 0) {
      return [];
    }
    return Array.from(
      new Set(
        partnerDetails.marketSegments
          .filter(program => program.programType === 'VIPMP')
          .map(program => program.marketSegment)
      )
    );
  }, [partnerDetails]);

  const partnerName = partnerDetails?.partnerName ?? '';

  const value: PartnerContextType = {
    partnerDetails,
    partnerName,
    availableCurrencies,
    region,
    regionCurrencies,
    marketSegments,
    isLoading,
    error: error as Error | null,
  };

  return <PartnerContext.Provider value={value}>{children}</PartnerContext.Provider>;
};

export const usePartnerDetails = (): PartnerContextType => {
  const context = useContext(PartnerContext);
  if (context === undefined) {
    throw new Error('usePartnerDetails must be used within a PartnerProvider');
  }
  return context;
};

export default PartnerContext;
