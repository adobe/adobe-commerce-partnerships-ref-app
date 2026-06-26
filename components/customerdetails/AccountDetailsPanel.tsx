import React from 'react';
import { Card } from '@react-spectrum/s2';
import {
  formatAddress,
  formatAnniversaryDate,
  formatDiscountLevel,
  formatAdmins,
} from '../../utils/customerDetailsUtils';
import styles from '../../styles/customerdetails/AccountDetailsPanel.module.css';

interface CustomerDetails {
  companyProfile?: {
    address?: any;
    contacts?: any[];
  };
  discounts?: any[];
  cotermDate?: string;
}

interface AccountDetailsPanelProps {
  customer?: CustomerDetails;
  resellerId?: string;
  isLoading?: boolean;
}

interface DetailRowProps {
  label: string;
  value: string;
  description?: string;
  isHighlighted?: boolean;
  avatars?: string[];
  isLast?: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({
  label,
  value,
  description,
  isHighlighted = false,
  avatars = [],
}) => (
  <div className={`${styles.detailRow} ${isHighlighted ? styles.detailRowHighlighted : ''}`}>
    <div className={styles.detailRowContent}>
      <div className={styles.detailRowLabel}>{label}</div>

      <div className={styles.detailRowValueContainer}>
        <div className={styles.detailRowValue}>{value}</div>

        {description && <div className={styles.detailRowDescription}>{description}</div>}

        {avatars.length > 0 && (
          <div className={styles.avatarsContainer}>
            {avatars.map((avatar, index) => (
              <div
                key={index}
                className={`${styles.avatar} ${index === 0 ? styles.avatarPrimary : styles.avatarSecondary}`}
                style={{
                  zIndex: avatars.length - index,
                }}
              >
                {avatar}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

const AccountDetailsPanel: React.FC<AccountDetailsPanelProps> = ({
  customer,
  resellerId,
  isLoading = false,
}) => {
  // Derive account details from raw data
  const accountDetails =
    !customer || isLoading
      ? {
          resellerId: 'Loading...',
          companyAddress: 'Loading...',
          discountLevel: 'Loading...',
          anniversaryDate: 'Loading...',
          admins: [] as Array<{ email: string; name?: string }>,
        }
      : {
          resellerId: resellerId || 'N/A',
          companyAddress: formatAddress(customer.companyProfile?.address) || 'N/A',
          discountLevel: formatDiscountLevel(customer.discounts || []),
          anniversaryDate: formatAnniversaryDate(customer.cotermDate || ''),
          admins: formatAdmins(customer.companyProfile?.contacts || []),
        };

  return (
    <div className={styles.cardWrapper}>
      <Card size={'XL'} density={'spacious'}>
        <DetailRow label="Reseller ID" value={accountDetails.resellerId} />

        <DetailRow
          label="Company address"
          value={accountDetails.companyAddress}
          description="Contact support to make changes"
          isHighlighted={false}
        />

        <DetailRow label="Discount level" value={accountDetails.discountLevel} />

        <DetailRow label="Anniversary date" value={accountDetails.anniversaryDate} />

        <DetailRow
          label="Admins"
          value={
            accountDetails.admins.length > 0
              ? accountDetails.admins
                  .map(admin => `${admin.email}${admin.name ? ` (${admin.name})` : ''}`)
                  .join('\n')
              : 'N/A'
          }
          isLast={true}
        />
      </Card>
    </div>
  );
};

export const AccountDetailsSkeleton: React.FC = () => (
  <div className={styles.skeleton}>
    <div className={styles.skeletonTitle} />
    <div className={styles.skeletonContent}>
      <div className={styles.skeletonColumn}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className={styles.skeletonItem} />
        ))}
      </div>
      <div className={styles.skeletonColumn}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className={styles.skeletonItem} />
        ))}
      </div>
    </div>
  </div>
);

export default AccountDetailsPanel;
export type { AccountDetailsPanelProps, DetailRowProps };
