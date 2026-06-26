import React, { useState } from 'react';
import {
  Dialog,
  DialogTrigger,
  Heading,
  Content,
  ButtonGroup,
  Button,
  Checkbox,
} from '@react-spectrum/s2';

interface ClearCartConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLeaveWithoutSaving: () => void;
  onViewCart: () => void;
  customerName: string;
}

const DONT_SHOW_CART_CLEARANCE_CONFIRMATION = 'dontShowCartClearanceConfirmation';

export const ClearCartConfirmationDialog: React.FC<ClearCartConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onLeaveWithoutSaving,
  onViewCart,
  customerName,
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleDontShowAgainChange = (checked: boolean) => {
    setDontShowAgain(checked);
    if (checked) {
      sessionStorage.setItem(DONT_SHOW_CART_CLEARANCE_CONFIRMATION, 'true');
    } else {
      sessionStorage.removeItem(DONT_SHOW_CART_CLEARANCE_CONFIRMATION);
    }
  };

  const handleLeaveWithoutSaving = () => {
    onLeaveWithoutSaving();
  };

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={open => !open && onClose()}>
      <Dialog>
        <Heading slot="title">Wait, the order isn't finished yet</Heading>
        <Content>
          <p>Leaving the page will remove the items you've added to the cart for {customerName}.</p>
          <Checkbox isSelected={dontShowAgain} onChange={handleDontShowAgainChange}>
            Don't show this again
          </Checkbox>
        </Content>
        <ButtonGroup>
          <Button variant="secondary" onPress={handleLeaveWithoutSaving}>
            Leave without saving
          </Button>
          <Button variant="accent" onPress={onViewCart}>
            View cart
          </Button>
        </ButtonGroup>
      </Dialog>
    </DialogTrigger>
  );
};

export const shouldShowCartClearanceConfirmation = (): boolean => {
  if (typeof window === 'undefined') return true;
  return sessionStorage.getItem(DONT_SHOW_CART_CLEARANCE_CONFIRMATION) !== 'true';
};
