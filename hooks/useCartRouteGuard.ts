import { useEffect, useRef, useState } from 'react';
import type { NextRouter } from 'next/router';
import { shouldShowCartClearanceConfirmation } from '../components/customerdetails/ClearCartConfirmationDialog';

export interface UseCartRouteGuardOptions {
  router: NextRouter;
  getTotalItems: () => number;
  clearCart: () => void;
  shouldAllowNavigation: (url: string) => boolean;
}

export interface UseCartRouteGuardReturn {
  showClearCartDialog: boolean;
  setShowClearCartDialog: (show: boolean) => void;
  pendingRouteRef: React.MutableRefObject<string | null>;
  handleClose: () => void;
  handleLeaveWithoutSaving: () => void;
  handleViewCart: () => void;
}

export function useCartRouteGuard(options: UseCartRouteGuardOptions): UseCartRouteGuardReturn {
  const { router, getTotalItems, clearCart, shouldAllowNavigation } = options;
  const [showClearCartDialog, setShowClearCartDialog] = useState(false);
  const pendingRouteRef = useRef<string | null>(null);

  useEffect(() => {
    const handleRouteChangeStart = (url: string) => {
      if (getTotalItems() > 0 && !shouldAllowNavigation(url)) {
        if (shouldShowCartClearanceConfirmation()) {
          pendingRouteRef.current = url;
          setShowClearCartDialog(true);
          router.events.emit('routeChangeError');
          throw 'Route change aborted.';
        } else {
          clearCart();
        }
      }
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
    };
  }, [router, getTotalItems, clearCart, shouldAllowNavigation]);

  const handleClose = () => {
    setShowClearCartDialog(false);
    pendingRouteRef.current = null;
  };

  const handleLeaveWithoutSaving = () => {
    clearCart();
    setShowClearCartDialog(false);
    if (pendingRouteRef.current) {
      router.push(pendingRouteRef.current);
    }
    pendingRouteRef.current = null;
  };

  const handleViewCart = () => {
    setShowClearCartDialog(false);
    pendingRouteRef.current = null;
  };

  return {
    showClearCartDialog,
    setShowClearCartDialog,
    pendingRouteRef,
    handleClose,
    handleLeaveWithoutSaving,
    handleViewCart,
  };
}
