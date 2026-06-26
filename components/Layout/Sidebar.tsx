import React from 'react';
import { useRouter } from 'next/router';
import Market from '@react-spectrum/s2/icons/Market';
import Apps from '@react-spectrum/s2/icons/Apps';
import styles from '../../styles/Sidebar.module.css';

export type ActivePage = 'resellers' | 'catalog' | 'customers' | 'checkout';

interface SidebarProps {
  activePage: ActivePage;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage }) => {
  const router = useRouter();

  const navigationItems = [
    {
      id: 'resellers' as ActivePage,
      label: 'Resellers',
      icon: (isActive: boolean) => (
        <div
          className={`${styles.largeIcon} ${isActive ? styles.iconColorActive : styles.iconColorInactive}`}
        >
          <Market />
        </div>
      ),
      path: '/resellers',
    },
    {
      id: 'catalog' as ActivePage,
      label: 'Catalog',
      icon: (isActive: boolean) => (
        <div
          className={`${styles.largeIcon} ${isActive ? styles.iconColorActive : styles.iconColorInactive}`}
        >
          <Apps />
        </div>
      ),
      path: '/catalog',
    },
  ];

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <aside className={styles.sidebar}>
      {navigationItems.map(item => (
        <div
          key={item.id}
          className={styles.navItem}
          onClick={() => handleNavigation(item.path)}
          style={{ cursor: 'pointer' }}
        >
          <div
            className={`${styles.navIconContainer} ${
              activePage === item.id ? styles.navIconActive : styles.navIconInactive
            }`}
          >
            {typeof item.icon === 'function' ? item.icon(activePage === item.id) : item.icon}
          </div>
          <span
            className={`${styles.navLabel} ${
              activePage === item.id ? styles.navLabelActive : styles.navLabelInactive
            }`}
          >
            {item.label}
          </span>
        </div>
      ))}
    </aside>
  );
};

export default Sidebar;
