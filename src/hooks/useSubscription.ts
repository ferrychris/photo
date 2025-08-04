import { useSubscriptionStore } from '../store/subscriptionStore';

export const useSubscription = () => {
  const {
    subscription,
    loading,
    error,
    fetchSubscription,
    hasFeature,
    canCreatePhotosphere,
    canUploadPhotos,
  } = useSubscriptionStore();

  const isActive = subscription?.subscription_status === 'active';
  const isTrialing = subscription?.subscription_status === 'trialing';
  const isPastDue = subscription?.subscription_status === 'past_due';
  const isCanceled = subscription?.subscription_status === 'canceled';

  const planName = subscription?.subscription_tier || 'none';
  const planFeatures = subscription?.features;

  // Helper functions for common feature checks
  const canUseVideo = () => hasFeature('has_video');
  const hasPrioritySupport = () => hasFeature('has_priority_support');
  const hasWhiteLabel = () => hasFeature('has_white_label');
  const hasDedicatedManager = () => hasFeature('has_dedicated_manager');

  // Usage limits
  const getMaxPhotospheres = () => planFeatures?.max_photospheres || 0;
  const getMaxPhotos = () => planFeatures?.max_photos || 0;
  const isUnlimitedPhotospheres = () => planFeatures?.max_photospheres === -1;
  const isUnlimitedPhotos = () => planFeatures?.max_photos === -1;

  // Trial information
  const getTrialEnd = () => {
    // Since we're not storing trial_end in profiles table, we'll return null
    return null;
  };

  const isInTrial = () => {
    // Check if subscription status is trialing
    return subscription?.subscription_status === 'trialing';
  };

  // Billing information
  const getRenewalDate = () => {
    // Since we're not storing current_period_end in profiles table, we'll return null
    return null;
  };

  const willCancel = () => false; // Simplified since we're not tracking cancel_at_period_end

  return {
    // Subscription state
    subscription,
    loading,
    error,
    isActive,
    isTrialing,
    isPastDue,
    isCanceled,
    planName,
    planFeatures,

    // Feature checks
    canUseVideo,
    hasPrioritySupport,
    hasWhiteLabel,
    hasDedicatedManager,
    canCreatePhotosphere,
    canUploadPhotos,

    // Usage limits
    getMaxPhotospheres,
    getMaxPhotos,
    isUnlimitedPhotospheres,
    isUnlimitedPhotos,

    // Trial information
    getTrialEnd,
    isInTrial,

    // Billing information
    getRenewalDate,
    willCancel,

    // Actions
    fetchSubscription,
  };
};

// Hook for protecting components that require specific features
export const useFeatureGate = (feature: string) => {
  const { subscription, hasFeature } = useSubscriptionStore();
  
  const hasAccess = subscription?.subscription_status === 'active' && hasFeature(feature as any);
  
  return {
    hasAccess,
    subscription,
    requiresUpgrade: !hasAccess,
  };
};

// Hook for usage-based limits
export const useUsageLimit = (type: 'photospheres' | 'photos', currentUsage: number) => {
  const { subscription } = useSubscriptionStore();
  
  if (!subscription || subscription.subscription_status !== 'active') {
    return {
      canUse: false,
      limit: 0,
      usage: currentUsage,
      remaining: 0,
      isUnlimited: false,
      requiresUpgrade: true,
    };
  }

  const limit = type === 'photospheres' 
    ? subscription.features.max_photospheres 
    : subscription.features.max_photos;

  const isUnlimited = limit === -1;
  const canUse = isUnlimited || currentUsage < limit;
  const remaining = isUnlimited ? Infinity : Math.max(0, limit - currentUsage);

  return {
    canUse,
    limit: isUnlimited ? Infinity : limit,
    usage: currentUsage,
    remaining,
    isUnlimited,
    requiresUpgrade: !canUse,
  };
};
