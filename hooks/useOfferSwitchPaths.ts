import { useQueries } from '@tanstack/react-query';

const fetchOfferSwitchPaths = async (customerId: string, subscriptionId: string) => {
  const params = new URLSearchParams({
    'customer-id': customerId,
    'subscription-id': subscriptionId,
  });

  const response = await fetch(`/api/offer-switch-paths?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch offer switch paths');
  }

  return response.json();
};

export const useOfferSwitchPaths = (customerId: string | undefined, subscriptionIds: string[]) => {
  const queries = useQueries({
    queries: subscriptionIds.map(subscriptionId => ({
      queryKey: ['offerSwitchPaths', customerId, subscriptionId],
      queryFn: () => fetchOfferSwitchPaths(customerId!, subscriptionId),
      enabled: !!customerId && !!subscriptionId,
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
    })),
  });

  const dataMap = Object.fromEntries(subscriptionIds.map((id, i) => [id, queries[i]?.data]));

  const hasUpgradePath = (subscriptionId: string) => {
    const data = dataMap[subscriptionId];
    return (
      (data?.productUpgrades?.length ?? 0) > 0 &&
      data.productUpgrades.some((u: any) => u.targetList?.length > 0)
    );
  };

  const getUpgradePathDetails = (
    subscriptionId: string
  ): { targetBaseOfferId: string; switchType: string }[] => {
    const upgrades = dataMap[subscriptionId]?.productUpgrades ?? [];
    return upgrades.flatMap(
      (u: any) =>
        u.targetList?.map((t: any) => ({
          targetBaseOfferId: t.targetBaseOfferId,
          switchType: t.switchType as string,
        })) ?? []
    );
  };

  return { hasUpgradePath, getUpgradePathDetails };
};
