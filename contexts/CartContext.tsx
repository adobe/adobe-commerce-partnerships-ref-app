import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import type { LicenseAvailability } from '../utils/constants';
import { getSKUFromOfferId } from '../utils/commonUtils';
import { createClientLogger } from '../utils/logger';

const CART_KEY = 'bridge_cart';
const logger = createClientLogger('CartContext');

export interface CartItem {
  id: string;
  offerId: string;
  productName: string;
  pricePerUnit: number;
  quantity: number;
  currency: string;
  productFamily?: string;
  lineItemTotal?: number;
  marketSegment?: string;
  discountCode?: string;
}

interface CustomerInfoInCart {
  customerId?: string;
  customerName?: string;
  resellerId?: string;
  resellerName?: string;
  makeAvailable?: LicenseAvailability;
}

interface CartContextType {
  cartItemIdToQuantityMap: { [key: string]: number };
  cartItemIdToCartItemDetailsMap: { [key: string]: Omit<CartItem, 'quantity'> };
  customerInfoInCart: CustomerInfoInCart;

  // Cart actions
  addToCart: (
    offerId: string,
    productName: string,
    pricePerUnit: number,
    currency: string,
    marketSegment?: string,
    productFamily?: string,
    quantity?: number
  ) => void;
  removeFromCart: (offerId: string) => void;
  updateQuantity: (offerId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;

  // Customer actions
  setCustomerInfoInCart: (customerInfo: CustomerInfoInCart) => void;
  clearCustomerInfoInCart: () => void;

  // Cart modal state
  showCartModal: boolean;
  setShowCartModal: (show: boolean) => void;

  // Update cart items after API calls like preview
  updateCartItemsFromAPI: (updatedItems: CartItem[]) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

const loadCartFromLocalStorage = (): {
  cartItemIdToQuantityMap: { [key: string]: number };
  cartItemIdToCartItemDetailsMap: { [key: string]: Omit<CartItem, 'quantity'> };
  customerInfoInCart: CustomerInfoInCart;
} => {
  if (typeof window === 'undefined')
    return {
      cartItemIdToQuantityMap: {},
      cartItemIdToCartItemDetailsMap: {},
      customerInfoInCart: {},
    };

  try {
    const item = localStorage.getItem(CART_KEY);
    if (item) {
      const parsed = JSON.parse(item);
      return {
        cartItemIdToQuantityMap: parsed.cartItemIdToQuantityMap || {},
        cartItemIdToCartItemDetailsMap: parsed.cartItemIdToCartItemDetailsMap || {},
        customerInfoInCart: parsed.customerInfoInCart || {},
      };
    }
    return {
      cartItemIdToQuantityMap: {},
      cartItemIdToCartItemDetailsMap: {},
      customerInfoInCart: {},
    };
  } catch (error) {
    logger.error({ err: error }, 'Error loading cart from localStorage');
    return {
      cartItemIdToQuantityMap: {},
      cartItemIdToCartItemDetailsMap: {},
      customerInfoInCart: {},
    };
  }
};

const saveCartToLocalStorage = (
  cartItemIdToQuantityMap: { [key: string]: number },
  cartItemIdToCartItemDetailsMap: { [key: string]: Omit<CartItem, 'quantity'> },
  customerInfoInCart: CustomerInfoInCart
): void => {
  if (typeof window === 'undefined') return;

  try {
    const cartData = {
      cartItemIdToQuantityMap,
      cartItemIdToCartItemDetailsMap,
      customerInfoInCart,
    };
    localStorage.setItem(CART_KEY, JSON.stringify(cartData));
  } catch (error) {
    logger.error({ err: error }, 'Error saving cart to localStorage');
  }
};

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [cartItemIdToQuantityMap, setCartItemIdToQuantityMap] = useState<{ [key: string]: number }>(
    {}
  );
  const [cartItemIdToCartItemDetailsMap, setCartItemIdToCartItemDetailsMap] = useState<{
    [key: string]: Omit<CartItem, 'quantity'>;
  }>({});
  const [customerInfoInCart, setCustomerInfoState] = useState<CustomerInfoInCart>({});
  const [showCartModal, setShowCartModal] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const savedCart = loadCartFromLocalStorage();
    setCartItemIdToQuantityMap(savedCart.cartItemIdToQuantityMap);
    setCartItemIdToCartItemDetailsMap(savedCart.cartItemIdToCartItemDetailsMap);
    setCustomerInfoState(savedCart.customerInfoInCart);
    setIsInitialized(true);
  }, []);

  // Save cart to localStorage whenever cart state or customerInfoInCart changes
  useEffect(() => {
    if (isInitialized) {
      saveCartToLocalStorage(
        cartItemIdToQuantityMap,
        cartItemIdToCartItemDetailsMap,
        customerInfoInCart
      );
    }
  }, [cartItemIdToQuantityMap, cartItemIdToCartItemDetailsMap, customerInfoInCart, isInitialized]);

  const addToCart = (
    offerId: string,
    productName: string,
    pricePerUnit: number,
    currency: string,
    marketSegment?: string,
    productFamily?: string,
    quantity: number = 1
  ) => {
    setCartItemIdToQuantityMap(prev => {
      return {
        ...prev,
        [offerId]: (prev[offerId] || 0) + quantity,
      };
    });

    setCartItemIdToCartItemDetailsMap(prev => {
      // Only generate UUID if this is a new item
      const existingDetails = prev[offerId];
      const itemId = existingDetails?.id || crypto.randomUUID();

      return {
        ...prev,
        [offerId]: {
          id: itemId,
          offerId,
          productName,
          pricePerUnit,
          currency,
          productFamily,
          marketSegment,
        },
      };
    });
  };

  const removeFromCart = (offerId: string) => {
    setCartItemIdToQuantityMap(prev => {
      const newItems = { ...prev };
      delete newItems[offerId];
      return newItems;
    });

    setCartItemIdToCartItemDetailsMap(prev => {
      const newDetails = { ...prev };
      delete newDetails[offerId];
      return newDetails;
    });
  };

  const updateQuantity = (offerId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(offerId);
    } else {
      setCartItemIdToQuantityMap(prev => {
        return {
          ...prev,
          [offerId]: quantity,
        };
      });
    }
  };

  const clearCart = () => {
    setCartItemIdToQuantityMap({});
    setCartItemIdToCartItemDetailsMap({});
    setCustomerInfoState({});
  };

  const setCustomerInfoInCart = (newCustomerInfo: CustomerInfoInCart) => {
    setCustomerInfoState(newCustomerInfo);
  };

  const clearCustomerInfoInCart = () => {
    setCustomerInfoState({});
  };

  const getTotalItems = () => {
    return Object.values(cartItemIdToQuantityMap).reduce((sum, count) => sum + count, 0);
  };

  const updateCartItemsFromAPI = (updatedItems: CartItem[]) => {
    const newCartItemIdToQuantityMap: { [key: string]: number } = {};
    const newCartItemIdToCartItemDetailsMap: { [key: string]: Omit<CartItem, 'quantity'> } = {};

    updatedItems.forEach(item => {
      const originalSku = getSKUFromOfferId(item.offerId);
      const originalEntry = Object.entries(cartItemIdToQuantityMap).find(
        ([originalOfferId]) => getSKUFromOfferId(originalOfferId) === originalSku
      );

      if (originalEntry) {
        const [originalOfferId, quantity] = originalEntry;
        const originalDetails = cartItemIdToCartItemDetailsMap[originalOfferId];

        newCartItemIdToQuantityMap[item.offerId] = quantity;

        newCartItemIdToCartItemDetailsMap[item.offerId] = {
          ...originalDetails,
          // Preserve original UUID, or use item.id from API, or generate new UUID
          id: originalDetails?.id || item.id || crypto.randomUUID(),
          offerId: item.offerId,
          pricePerUnit: item.pricePerUnit,
          productName: item.productName || originalDetails?.productName,
          currency: item.currency || originalDetails?.currency,
          lineItemTotal: item.lineItemTotal,
          discountCode: item.discountCode,
        };
      }
    });

    setCartItemIdToQuantityMap(newCartItemIdToQuantityMap);
    setCartItemIdToCartItemDetailsMap(newCartItemIdToCartItemDetailsMap);
  };

  const value: CartContextType = {
    cartItemIdToQuantityMap,
    cartItemIdToCartItemDetailsMap,
    customerInfoInCart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalItems,
    setCustomerInfoInCart,
    clearCustomerInfoInCart,
    showCartModal,
    setShowCartModal,
    updateCartItemsFromAPI,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
