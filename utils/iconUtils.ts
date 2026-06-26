import iconMapping from '../lib/product_merchandising.json';
export interface ProductMerchandisingData {
  icons: {
    '48x48': string;
    '16x16': string;
    svg: string;
    '128x128': string;
  };
  cloudCategory: string;
}

export type IconSize = '48x48' | '16x16' | 'svg' | '128x128';

/**
 * Get icon URL for a product family
 * @param productFamily - The product family name from the API
 * @param size - The desired icon size (default: '48x48')
 * @returns Icon URL or null if no match found
 */
export const getProductFamilyIcon = (
  productFamily: string,
  size: IconSize = '128x128'
): string | null => {
  if (!productFamily) return null;

  const normalize = (str: string): string => str.toLowerCase().trim();

  // Case-insensitive direct match only
  const normalizedProductFamily = normalize(productFamily);
  const productFamilyKeys = Object.keys(iconMapping);

  for (const key of productFamilyKeys) {
    if (normalize(key) === normalizedProductFamily) {
      const match = iconMapping[key as keyof typeof iconMapping] as ProductMerchandisingData;
      return match.icons[size];
    }
  }

  return null;
};

/**
 * Get fallback icon URL for products without specific icons (internal helper)
 * @param size - The desired icon size (default: '48x48')
 * @returns Image icon SVG as data URI
 */
const getFallbackIcon = (size: IconSize = '48x48'): string => {
  const dimensions = {
    '48x48': 48,
    '16x16': 16,
    svg: 48,
    '128x128': 128,
  };

  const dimension = dimensions[size];
  const svg = `<svg width="${dimension}" height="${dimension}" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
  <path d="M2 4C2 2.89543 2.89543 2 4 2H16C17.1046 2 18 2.89543 18 4V16C18 17.1046 17.1046 18 16 18H4C2.89543 18 2 17.1046 2 16V4Z" fill="#999" fill-opacity="0.1"/>
  <path d="M2 4C2 2.89543 2.89543 2 4 2H16C17.1046 2 18 2.89543 18 4V16C18 17.1046 17.1046 18 16 18H4C2.89543 18 2 17.1046 2 16V4Z" stroke="#999" stroke-width="1" fill="none"/>
  <circle cx="7" cy="7" r="1.5" fill="#999" fill-opacity="0.6"/>
  <path d="M2 14L6 10L10 14L14 10L18 14" stroke="#999" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

/**
 * Get icon URL with automatic fallback
 * @param productFamily - The product family name from the API (optional, if empty/null returns fallback)
 * @param size - The desired icon size (default: '48x48')
 * @returns Icon URL (either specific or fallback)
 */
export const getIconWithFallback = (
  productFamily?: string | null,
  size: IconSize = '48x48'
): string => {
  if (!productFamily) {
    return getFallbackIcon(size);
  }
  return getProductFamilyIcon(productFamily, size) || getFallbackIcon(size);
};
/**
 * Get all available product families for debugging/testing
 * @returns Array of product family names
 */
export const getAvailableProductFamilies = (): string[] => {
  return Object.keys(iconMapping);
};

/**
 * Get cloud category for a product family
 * @param productFamily - The product family name from the API
 * @returns Cloud category string or null if no match found
 */
export const getProductCloudCategory = (productFamily: string): string | null => {
  if (!productFamily) return null;

  const normalize = (str: string): string => str.toLowerCase().trim();

  // Case-insensitive direct match only
  const normalizedProductFamily = normalize(productFamily);
  const productFamilyKeys = Object.keys(iconMapping);

  for (const key of productFamilyKeys) {
    if (normalize(key) === normalizedProductFamily) {
      const match = iconMapping[key as keyof typeof iconMapping] as ProductMerchandisingData;
      return match.cloudCategory || null;
    }
  }

  return null;
};
