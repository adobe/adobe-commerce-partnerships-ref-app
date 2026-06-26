import React, { ReactNode } from 'react';
import Header from './Header';
import Sidebar, { ActivePage } from './Sidebar';
import styles from '../../styles/Layout.module.css';

interface LayoutProps {
  children: ReactNode;
  activePage: ActivePage;
  partnerName?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, activePage, partnerName }) => {
  return (
    <div className={styles.container}>
      <Header partnerName={partnerName} />

      <div className={styles.mainLayout}>
        <Sidebar activePage={activePage} />

        <div className={styles.contentArea}>
          <main className={styles.mainContent}>{children}</main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
