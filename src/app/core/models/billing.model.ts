export type SubscriptionTier = 'Free' | 'Pro' | 'Enterprise';

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  isActive: boolean;
  limits: {
    scansPerMonth: number;
    aiEnabled: boolean;
    ciCdEnabled: boolean;
  };
  usage: {
    scansUsed: number;
    scansRemaining: number;
  };
}

