import React from 'react';
import styles from '../styles/UserProfileModal.module.css';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} />

      {/* Modal Dialog */}
      <div className={styles.modal}>
        <div className={styles.modalContent}>
          {/* Profile Content */}
          <div className={styles.profileContent}>
            <p>Service account authenticated</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserProfileModal;
