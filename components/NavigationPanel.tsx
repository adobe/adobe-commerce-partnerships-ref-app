import React from 'react';
import { useRouter } from 'next/router';
import ChevronRight from '@react-spectrum/s2/icons/ChevronRight';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface NavigationPanelProps {
  items: BreadcrumbItem[];
}

const NavigationPanel: React.FC<NavigationPanelProps> = ({ items }) => {
  const router = useRouter();

  // Don't render if no items or only one item (landing page)
  if (!items || items.length <= 1) {
    return null;
  }

  const handleNavigation = (href: string) => {
    if (href) {
      router.push(href);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '16px',
        color: '#374151',
        marginBottom: '24px',
        paddingLeft: '24px',
      }}
    >
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <div style={{ color: '#9CA3AF' }}>
              <ChevronRight />
            </div>
          )}
          <span
            onClick={() => item.href && handleNavigation(item.href)}
            style={{
              color: index === items.length - 1 ? '#111827' : '#6B7280',
              fontWeight: index === items.length - 1 ? '600' : '500',
              cursor: item.href ? 'pointer' : 'default',
              textDecoration: 'none',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={e => {
              if (item.href && index !== items.length - 1) {
                e.currentTarget.style.color = '#374151';
                e.currentTarget.style.textDecoration = 'underline';
              }
            }}
            onMouseLeave={e => {
              if (item.href && index !== items.length - 1) {
                e.currentTarget.style.color = '#6B7280';
                e.currentTarget.style.textDecoration = 'none';
              }
            }}
          >
            {item.label}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
};

export default NavigationPanel;
