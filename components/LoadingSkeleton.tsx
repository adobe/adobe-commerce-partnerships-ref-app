import React from 'react';
import commonStyles from '../styles/CommonCard.module.css';

interface LoadingSkeletonProps {
  count?: number;
  testId?: string;
}

// Memoized skeleton component to prevent re-renders
const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ count = 50, testId }) => {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={`${commonStyles.skeletonCard} ${commonStyles.skeleton}`}
          data-testid={testId ? `${testId}-${index}` : undefined}
        >
          <div className={commonStyles.skeletonIcon} />
          <div className={commonStyles.skeletonName} />
        </div>
      ))}
    </>
  );
};

// Export memoized version to prevent unnecessary re-renders
export default React.memo(LoadingSkeleton);
