import React from 'react';
import { useSubscription } from '../../hooks/useSubscription';
import { AlertTriangle, Crown, Clock, CheckCircle } from 'lucide-react';

interface SubscriptionStatusProps {
  showDetails?: boolean;
  className?: string;
}

const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({ 
  showDetails = false, 
  className = '' 
}) => {
  const {
    subscription,
    loading,
    isActive,
    isTrialing,
    isPastDue,
    isCanceled,
    planName,
    isInTrial,
    getRenewalDate,
    willCancel,
  } = useSubscription();

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-800/50 rounded-lg p-3 ${className}`}>
        <div className="h-4 bg-gray-700 rounded w-24"></div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className={`bg-gray-900/20 border border-gray-700/50 rounded-lg p-3 ${className}`}>
        <div className="flex items-center text-gray-300">
          <AlertTriangle className="w-4 h-4 mr-2" />
          <span className="text-sm font-medium">You have no subscription</span>
        </div>
        {showDetails && (
          <p className="text-xs text-gray-400 mt-1">
            Subscribe to access premium features
          </p>
        )}
      </div>
    );
  }

  const getStatusColor = () => {
    if (isActive) return 'text-green-300 bg-green-900/20 border-green-800/50';
    if (isTrialing) return 'text-blue-300 bg-blue-900/20 border-blue-800/50';
    if (isPastDue) return 'text-orange-300 bg-orange-900/20 border-orange-800/50';
    if (isCanceled) return 'text-red-300 bg-red-900/20 border-red-800/50';
    return 'text-gray-300 bg-gray-900/20 border-gray-800/50';
  };

  const getStatusIcon = () => {
    if (isActive) return <CheckCircle className="w-4 h-4" />;
    if (isTrialing) return <Clock className="w-4 h-4" />;
    if (isPastDue) return <AlertTriangle className="w-4 h-4" />;
    if (isCanceled) return <AlertTriangle className="w-4 h-4" />;
    return <Crown className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (isTrialing && isInTrial()) {
      return `${planName.charAt(0).toUpperCase() + planName.slice(1)} Trial`;
    }
    if (isActive) return `${planName.charAt(0).toUpperCase() + planName.slice(1)} Plan`;
    if (isPastDue) return 'Payment Past Due';
    if (isCanceled) return 'Plan Canceled';
    return subscription.subscription_status.charAt(0).toUpperCase() + subscription.subscription_status.slice(1);
  };

  const nextBilling = getRenewalDate();

  return (
    <div className={`border rounded-lg p-3 ${getStatusColor()} ${className}`}>
      <div className="flex items-center">
        {getStatusIcon()}
        <span className="text-sm font-medium ml-2">{getStatusText()}</span>
      </div>
      
      {showDetails && (
        <div className="mt-2 space-y-1">
          {isInTrial() && (
            <p className="text-xs opacity-80">
              Trial active
            </p>
          )}
          
          {nextBilling && !willCancel() && (
            <p className="text-xs opacity-80">
              Next billing: {new Date(nextBilling).toLocaleDateString()}
            </p>
          )}
          
          {willCancel() && nextBilling && (
            <p className="text-xs opacity-80">
              Cancels on: {new Date(nextBilling).toLocaleDateString()}
            </p>
          )}
          
          {isPastDue && (
            <p className="text-xs opacity-80">
              Please update your payment method
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SubscriptionStatus;
