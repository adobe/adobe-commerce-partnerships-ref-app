import React, { useState } from 'react';
import UserProfileModal from '../UserProfileModal';
import styles from '../../styles/Header.module.css';

interface HeaderProps {
  partnerName?: string;
}

const Header: React.FC<HeaderProps> = () => {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleAvatarClick = () => {
    setIsProfileModalOpen(true);
  };

  return (
    <header className={styles.header}>
      {/* Adobe Logo */}
      <div className={styles.logo}>
        <svg
          width="78"
          height="20"
          viewBox="0 0 78 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clipPath="url(#clip0_4972_29460)">
            <path
              d="M11.9948 18.8322L10.525 14.7448H6.83907L9.93814 6.94429L14.6395 18.8322H20.2225L12.7695 0.934013H7.50701L0 18.8322H11.9948ZM32.7514 18.0305V0.399902H28.1028V4.83486C27.5147 4.70102 26.9535 4.64823 26.3936 4.64823C22.8145 4.64823 19.3679 7.13215 19.3679 11.9944C19.3679 16.8566 22.9213 19.0999 27.1144 19.0999C29.4117 19.0999 31.6819 18.5118 32.7514 18.0317V18.0305ZM24.0153 11.9134C24.0153 9.53626 25.431 8.387 26.9806 8.387C27.4078 8.387 27.7823 8.46681 28.1028 8.60064V15.0922C27.7823 15.1991 27.4078 15.2531 27.0076 15.2531C25.458 15.2531 24.0153 14.2106 24.0153 11.9134ZM48.2185 11.8606C48.2185 7.26598 44.9328 4.64823 41.0319 4.64823C37.1311 4.64823 33.8724 7.26598 33.8724 11.8606C33.8724 16.4551 37.1311 19.0729 41.0319 19.0729C44.9328 19.0729 48.2185 16.4551 48.2185 11.8606ZM38.494 11.8606C38.494 9.59028 39.669 8.52083 41.0319 8.52083C42.3949 8.52083 43.5969 9.58905 43.5969 11.8606C43.5969 14.1321 42.3949 15.2003 41.0319 15.2003C39.669 15.2003 38.494 14.1321 38.494 11.8606ZM62.75 11.6727C62.75 7.0241 59.3845 4.61999 55.7243 4.61999C55.1632 4.61999 54.5763 4.6998 53.9881 4.80662V0.399902H49.3395V18.0575C50.7822 18.7254 53.0795 19.0999 54.8955 19.0999C59.1426 19.0999 62.7488 16.589 62.7488 11.6739L62.75 11.6727ZM55.1104 8.41401C56.6599 8.41401 58.1026 9.48223 58.1026 11.7267C58.1026 14.1308 56.6071 15.2531 55.0306 15.2531C54.6303 15.2531 54.2828 15.2003 53.9881 15.0922V8.62766C54.3356 8.49382 54.6831 8.41401 55.1104 8.41401ZM71.6997 19.0729C73.3831 19.0729 75.0124 18.7794 76.3741 18.0845V14.5311C74.9044 15.172 73.5955 15.5195 72.1798 15.5195C70.4436 15.5195 69.0537 14.7718 68.5466 13.1952H77.2815C77.3613 12.6071 77.3883 12.0202 77.3883 11.405C77.3883 6.89026 74.1824 4.647 70.6831 4.647C66.9431 4.647 63.8182 7.37158 63.8182 11.8335C63.8182 16.2955 67.2647 19.0729 71.6985 19.0729H71.6997ZM70.7371 8.14634C71.7795 8.14634 72.7937 8.76149 73.0344 10.284H68.4926C68.8401 8.7885 69.7487 8.14634 70.7371 8.14634Z"
              fill="#EB1000"
            />
          </g>
          <defs>
            <clipPath id="clip0_4972_29460">
              <rect width="78" height="19.4" fill="white" />
            </clipPath>
          </defs>
        </svg>
      </div>

      {/* Right Side Icons */}
      <div className={styles.headerIcons}>
        {/* User Avatar */}
        <div
          className={styles.userAvatar}
          onClick={handleAvatarClick}
          role="button"
          aria-label="Open user profile"
          title="User profile"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleAvatarClick();
            }
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clipPath="url(#clip0_2825_1349)">
              <rect width="28" height="27.9983" rx="13.9992" fill="#60D8F3" />
              <g className={styles.avatarOverlay}>
                <path
                  d="M24.3195 17.0608L26.0337 21.1528C27.2354 19.1318 27.9087 16.8408 27.9915 14.491C28.0743 12.1413 27.5639 9.80854 26.5075 7.70803C25.4511 5.60752 23.8826 3.80693 21.9468 2.4724C20.0111 1.13787 17.7704 0.312392 15.4314 0.0721436L7.94189 17.0615L24.3195 17.0608Z"
                  fill="black"
                />
              </g>
            </g>
            <defs>
              <clipPath id="clip0_2825_1349">
                <rect width="28" height="27.9983" rx="13.9992" fill="white" />
              </clipPath>
            </defs>
          </svg>
        </div>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </header>
  );
};

export default Header;
