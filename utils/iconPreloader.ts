import { getAvailableProductFamilies, getIconWithFallback } from './iconUtils';
import { createClientLogger } from './logger';

const logger = createClientLogger('iconPreloader');

/**
 * Icon preloader for better performance
 */
class IconPreloader {
  private preloadedIcons = new Set<string>();
  private preloadPromises = new Map<string, Promise<void>>();

  /**
   * Preload a single icon
   * @param iconUrl - The icon URL to preload
   * @returns Promise that resolves when icon is loaded
   */
  private preloadSingleIcon(iconUrl: string): Promise<void> {
    if (this.preloadedIcons.has(iconUrl)) {
      return Promise.resolve();
    }

    if (this.preloadPromises.has(iconUrl)) {
      return this.preloadPromises.get(iconUrl)!;
    }

    const promise = new Promise<void>((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        this.preloadedIcons.add(iconUrl);
        this.preloadPromises.delete(iconUrl);
        resolve();
      };

      img.onerror = () => {
        this.preloadPromises.delete(iconUrl);
        reject(new Error(`Failed to load icon: ${iconUrl}`));
      };

      img.src = iconUrl;
    });

    this.preloadPromises.set(iconUrl, promise);
    return promise;
  }

  /**
   * Preload icons for specific product families
   * @param productFamilies - Array of product family names
   * @param size - Icon size to preload (default: '48x48')
   */
  async preloadProductFamilyIcons(
    productFamilies: string[],
    size: '48x48' | '16x16' | 'svg' | '128x128' = '48x48'
  ): Promise<void> {
    const iconUrls = productFamilies
      .map(family => getIconWithFallback(family, size))
      .filter((url, index, array) => array.indexOf(url) === index); // Remove duplicates

    const preloadPromises = iconUrls.map(url =>
      this.preloadSingleIcon(url).catch(error => {
        logger.warn({ err: error }, 'Failed to preload icon');
      })
    );

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Preload all available icons (use sparingly)
   * @param size - Icon size to preload (default: '48x48')
   */
  async preloadAllIcons(size: '48x48' | '16x16' | 'svg' | '128x128' = '48x48'): Promise<void> {
    const allProductFamilies = getAvailableProductFamilies();
    await this.preloadProductFamilyIcons(allProductFamilies, size);
  }

  /**
   * Check if an icon is preloaded
   * @param iconUrl - The icon URL to check
   * @returns True if the icon is preloaded
   */
  isPreloaded(iconUrl: string): boolean {
    return this.preloadedIcons.has(iconUrl);
  }

  /**
   * Get preloaded icon count
   * @returns Number of preloaded icons
   */
  getPreloadedCount(): number {
    return this.preloadedIcons.size;
  }

  /**
   * Clear preloaded icons cache
   */
  clearCache(): void {
    this.preloadedIcons.clear();
    this.preloadPromises.clear();
  }
}

// Export singleton instance
export const iconPreloader = new IconPreloader();

/**
 * Hook for preloading icons in React components
 * @param productFamilies - Array of product families to preload
 * @param size - Icon size to preload
 */
export const useIconPreloader = (
  productFamilies: string[],
  size: '48x48' | '16x16' | 'svg' | '128x128' = '48x48'
) => {
  const preloadIcons = () => {
    iconPreloader.preloadProductFamilyIcons(productFamilies, size);
  };

  return { preloadIcons, isPreloaded: iconPreloader.isPreloaded.bind(iconPreloader) };
};
