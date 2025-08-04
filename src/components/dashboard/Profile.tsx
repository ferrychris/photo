import React, { useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useSubscriptionStore, PLAN_CONFIGS } from '../../store/subscriptionStore';
import { Loader2, CreditCard, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import DashboardLayout from '../layout/DashboardLayout';

const Profile: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const { 
    subscription, 
    loading, 
    error, 
    fetchSubscription, 
    createCheckoutSession, 
    createPortalSession,
    clearError 
  } = useSubscriptionStore();

  const subscriptionPlans = Object.values(PLAN_CONFIGS);

  // Add debugging console log - MUST be before any conditional returns
  useEffect(() => {
    if (subscription) {
      console.log('Subscription data:', subscription);
    }
  }, [subscription]);
  
  useEffect(() => {
    fetchSubscription();
    
    // Check for success or canceled URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const canceled = urlParams.get('canceled');
    
    if (success === 'true') {
      // Clear URL parameters and refresh subscription data
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchSubscription();
    } else if (canceled === 'true') {
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [fetchSubscription]);

  useEffect(() => {
    if (user) {
      fetchSubscription();
    }
  }, [user, fetchSubscription]);

  const handleUpgrade = async (planId: string) => {
    try {
      clearError();
      const plan = subscriptionPlans.find(p => p.id === planId);
      if (!plan) {
        throw new Error('Plan not found');
      }
      
      const checkoutUrl = await createCheckoutSession(plan.priceId, plan.id as any);
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error('Error creating checkout session:', err);
    }
  };

  const handleManageBilling = async () => {
    try {
      clearError();
      const portalUrl = await createPortalSession();
      window.location.href = portalUrl;
    } catch (err) {
      console.error('Error creating portal session:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      </DashboardLayout>
    );
  }


  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
              Account Settings
            </h2>
          </div>
        </div>

        {/* Debug subscription info */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Subscription Debug Info:</h2>
            <div className="space-x-2">
              <button 
                onClick={() => {
                  console.log('🔄 Manual subscription refresh triggered');
                  console.log('👤 Current user:', user);
                  fetchSubscription();
                }}
                className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
              >
                Refresh
              </button>
              <button 
                onClick={async () => {
                  if (!user?.id) return;
                  console.log('📝 Assigning test subscription to user:', user.id);
                  try {
                    // Import supabase client
                    const { createClient } = await import('@supabase/supabase-js');
                    const supabase = createClient(
                      import.meta.env.VITE_SUPABASE_URL,
                      import.meta.env.VITE_SUPABASE_ANON_KEY
                    );
                    
                    // Update the profile directly
                    const { error } = await supabase
                      .from('profiles')
                      .update({
                        subscription_tier: 'pro',
                        subscription_status: 'active',
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', user.id);
                      
                    if (error) {
                      console.error('❌ Database update error:', error);
                    } else {
                      console.log('✅ Test subscription assigned directly to database');
                      // Wait a moment then refresh
                      setTimeout(() => fetchSubscription(), 500);
                    }
                  } catch (err) {
                    console.error('❌ Error assigning test subscription:', err);
                  }
                }}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                Test Assign
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm">
              <strong>User ID:</strong> {user?.id || 'Not logged in'}
            </div>
            <div className="text-sm">
              <strong>User Email:</strong> {user?.email || 'No email'}
            </div>
            <div className="text-sm">
              <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
            </div>
            <div className="text-sm">
              <strong>Error:</strong> {error || 'None'}
            </div>
          </div>
          <pre className="text-xs overflow-auto max-h-40 mt-2 bg-gray-900 p-2 rounded">
            {JSON.stringify(subscription, null, 2)}
          </pre>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* User Profile Section */}
            <div className="bg-gray-800/50 rounded-lg p-4 shadow border border-gray-700">
              <div className="border-b border-gray-700 pb-3 mb-4">
                <h3 className="text-base font-medium text-white">Profile Information</h3>
                <p className="text-xs text-gray-400 mt-0.5">Account details and preferences</p>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-400">Name</p>
                  <p className="text-white text-sm">{user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="text-white text-sm">{user?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Account Created</p>
                  <p className="text-white text-sm">
                    {user?.created_at ? formatDate(user.created_at) : 'N/A'}
                  </p>
                </div>
                <div className="pt-1">
                  <button
                    onClick={signOut}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>

            {/* Subscription Status */}
            <div className="bg-gray-800/50 rounded-lg p-4 shadow border border-gray-700">
              <div className="border-b border-gray-700 pb-3 mb-4">
                <h3 className="text-base font-medium text-white">Subscription Status</h3>
                <p className="text-xs text-gray-400 mt-0.5">Manage your subscription</p>
              </div>
            
            {subscription ? (
              <div className="space-y-3">
                <div className="flex items-center">
                  <span className="px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-300 rounded-full">
                    {subscription.subscription_tier === 'pro' ? 'Pro' : subscription.subscription_tier === 'starter' ? 'Starter' : 'Enterprise'}
                  </span>
                  <span className="ml-2 text-xs text-green-400 flex items-center">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Active
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Next Billing Date</p>
                  <p className="text-white text-sm">
                    Monthly Subscription
                  </p>
                </div>
                <button
                  onClick={handleManageBilling}
                  className="inline-flex items-center text-xs text-blue-400 hover:text-blue-300 transition-colors mt-1"
                >
                  <CreditCard className="w-3 h-3 mr-1" />
                  Manage Billing
                </button>
              </div>
            ) : (
              <div className="text-gray-400 text-xs flex items-center">
                <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                <span>You have no subscription</span>
              </div>
              )}
            </div>
          </div>

          {/* Subscription Plans */}
          <div className="space-y-4 mt-6">
            <div>
              <h2 className="text-lg font-bold text-white">Upgrade Your Plan</h2>
              <p className="text-xs text-gray-400">Choose the plan that best fits your needs</p>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-800/50 text-red-300 px-4 py-3 rounded-lg flex items-center">
                <XCircle className="w-5 h-5 mr-2" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {subscriptionPlans.map((plan) => (
                <div 
                  key={plan.id}
                  className={`relative rounded-lg p-4 border ${
                    plan.isPopular 
                      ? 'border-purple-500 bg-gradient-to-b from-purple-900/20 to-gray-900/50' 
                      : 'border-gray-700 bg-gray-900/50'
                  }`}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                      <span className="px-2 py-0.5 text-xs font-medium bg-purple-500 text-white rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <h3 className="text-base font-bold text-white">{plan.name}</h3>
                  <div className="mt-1">
                    <span className="text-2xl font-bold text-white">${plan.price}</span>
                    <span className="text-sm text-gray-400">/{plan.interval}</span>
                  </div>
                  
                  <ul className="mt-4 space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <CheckCircle className="w-3.5 h-3.5 text-green-400 mr-1.5 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    className={`mt-4 w-full py-1.5 px-3 text-sm rounded-md font-medium transition-colors ${
                      plan.isPopular
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                  >
                    {subscription?.subscription_tier === plan.id ? 'Current Plan' : subscription?.subscription_status === 'active' ? 'Switch Plan' : 'Upgrade'}
                  </button>
                </div>
              ))}
            </div>
            
            <div className="text-center text-xs text-gray-500 mt-3">
              <p>Need a custom plan? <a href="mailto:support@photosphere.com" className="text-purple-400 hover:underline">Contact sales</a></p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;