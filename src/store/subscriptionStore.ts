import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export type SubscriptionPlan = 'starter' | 'pro' | 'enterprise';

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'trialing';

export interface SubscriptionFeatures {
  max_photospheres: number;
  max_photos: number;
  has_video: boolean;
  has_priority_support: boolean;
  has_white_label: boolean;
  has_dedicated_manager: boolean;
}

export interface Subscription {
  id: string;
  subscription_tier: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  features: SubscriptionFeatures;
  created_at: string;
  updated_at: string;
}

interface SubscriptionStore {
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchSubscription: () => Promise<void>;
  createCheckoutSession: (priceId: string, planType: SubscriptionPlan) => Promise<string>;
  createPortalSession: () => Promise<string>;
  hasFeature: (feature: keyof SubscriptionFeatures) => boolean;
  canCreatePhotosphere: () => boolean;
  canUploadPhotos: (currentCount: number) => boolean;
  clearError: () => void;
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  subscription: null,
  loading: false,
  error: null,

  fetchSubscription: async () => {
    set({ loading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Try to fetch the profile from Supabase
      console.log('🔍 Fetching subscription data for user:', user.id);
      console.log('🔍 User email:', user.email);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      console.log('🔍 Database query result:', { data, error });

      let profileData;
      
      if (error) {
        console.error('Error fetching profile:', error);
        // No fallback - set subscription to null if there's an error
        set({ subscription: null, loading: false, error: 'Failed to fetch subscription data' });
        return;
      } else if (!data) {
        console.log('No profile found');
        // No profile found - set subscription to null
        set({ subscription: null, loading: false });
        return;
      } else {
        console.log('Profile found:', data);
        // Use the profile from the database
        profileData = data;
        
        // If subscription fields are null or empty, treat as no subscription
        if (!profileData.subscription_tier || !profileData.subscription_status) {
          console.log('Profile exists but no subscription data found');
          set({ subscription: null, loading: false });
          return;
        }
      }

      if (profileData && profileData.subscription_tier) {
        // Define features based on subscription tier
        let features: SubscriptionFeatures;
        
        switch(profileData.subscription_tier) {
          case 'starter':
            features = {
              max_photospheres: 5,
              max_photos: 100,
              has_video: false,
              has_priority_support: false,
              has_white_label: false,
              has_dedicated_manager: false
            };
            break;
          case 'pro':
            features = {
              max_photospheres: 20,
              max_photos: 500,
              has_video: true,
              has_priority_support: true,
              has_white_label: false,
              has_dedicated_manager: false
            };
            break;
          case 'enterprise':
            features = {
              max_photospheres: 100,
              max_photos: 2000,
              has_video: true,
              has_priority_support: true,
              has_white_label: true,
              has_dedicated_manager: true
            };
            break;
          default:
            features = {
              max_photospheres: 1,
              max_photos: 20,
              has_video: false,
              has_priority_support: false,
              has_white_label: false,
              has_dedicated_manager: false
            };
        }
            
        // Create subscription object from profile data
        const subscription: Subscription = {
          id: profileData.id,
          subscription_tier: profileData.subscription_tier,
          subscription_status: profileData.subscription_status || 'active',
          features,
          created_at: profileData.created_at,
          updated_at: profileData.updated_at
        };
        set({ subscription, loading: false });
      } else {
        set({ subscription: null, loading: false });
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch subscription',
        loading: false 
      });
    }
  },

  createCheckoutSession: async (priceId: string, planType: SubscriptionPlan) => {
    try {
      set({ error: null });
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ priceId, planType }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      return data.url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout session';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  createPortalSession: async () => {
    try {
      set({ error: null });
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session');
      }

      return data.url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create portal session';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  hasFeature: (feature: keyof SubscriptionFeatures) => {
    const { subscription } = get();
    if (!subscription || (subscription.subscription_status !== 'active' && subscription.subscription_status !== 'trialing')) {
      return false;
    }
    return subscription.features[feature] === true;
  },

  canCreatePhotosphere: () => {
    const { subscription } = get();
    if (!subscription || (subscription.subscription_status !== 'active' && subscription.subscription_status !== 'trialing')) {
      return false;
    }
    // For now, return true if user has an active subscription
    // This can be enhanced with actual photosphere count checking
    return true;
  },

  canUploadPhotos: (currentCount: number) => {
    const { subscription } = get();
    if (!subscription || (subscription.subscription_status !== 'active' && subscription.subscription_status !== 'trialing')) {
      return false;
    }
    
    // If max_photos is -1, it means unlimited
    if (subscription.features.max_photos === -1) {
      return true;
    }
    
    return currentCount < subscription.features.max_photos;
  },

  clearError: () => set({ error: null }),
}));

// Plan configurations for the UI
export const PLAN_CONFIGS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 45,
    interval: 'month' as const,
    priceId: 'price_starter_monthly', // Will be created dynamically by Edge Function
    isPopular: false,
    features: [
      '5 PhotoSpheres included',
      'Virtual PhotoBooth',
      'Basic moderation tools',
      'Up to 200 photos displayed',
      '14-day free trial'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 99,
    interval: 'month' as const,
    priceId: 'price_pro_monthly', // Will be created dynamically by Edge Function
    isPopular: true,
    features: [
      '20 PhotoSpheres',
      'Advanced camera animations',
      'Built-in video recording',
      'Up to 500 photos',
      'Priority support'
    ]
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 499,
    interval: 'month' as const,
    priceId: 'price_enterprise_monthly', // Will be created dynamically by Edge Function
    isPopular: false,
    features: [
      'Unlimited PhotoSpheres',
      'White label on your domain',
      'Dedicated Account Manager',
      'Custom training sessions',
      '24/7 premium support'
    ]
  }
} as const;
