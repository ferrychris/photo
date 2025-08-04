import React from 'react';
import { useFeatureGate } from '../../hooks/useSubscription';
import { Crown, Lock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
  upgradeMessage?: string;
  className?: string;
}

const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
  upgradeMessage,
  className = '',
}) => {
  const { hasAccess, requiresUpgrade } = useFeatureGate(feature);
  const navigate = useNavigate();

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  const defaultMessage = `This feature requires a premium subscription. Upgrade to unlock ${feature.replace('has_', '').replace('_', ' ')}.`;

  return (
    <div className={`bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-800/50 rounded-lg p-6 text-center ${className}`}>
      <div className="flex justify-center mb-4">
        <div className="bg-purple-600/20 rounded-full p-3">
          <Crown className="w-8 h-8 text-purple-400" />
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-white mb-2">Premium Feature</h3>
      <p className="text-gray-300 text-sm mb-4">
        {upgradeMessage || defaultMessage}
      </p>
      
      <button
        onClick={() => navigate('/dashboard/profile')}
        className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <Crown className="w-4 h-4 mr-2" />
        Upgrade Now
        <ArrowRight className="w-4 h-4 ml-2" />
      </button>
    </div>
  );
};

// Higher-order component version
export const withFeatureGate = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  feature: string,
  options?: {
    fallback?: React.ComponentType<P>;
    upgradeMessage?: string;
  }
) => {
  return (props: P) => {
    const { hasAccess } = useFeatureGate(feature);

    if (hasAccess) {
      return <WrappedComponent {...props} />;
    }

    if (options?.fallback) {
      const FallbackComponent = options.fallback;
      return <FallbackComponent {...props} />;
    }

    return (
      <FeatureGate
        feature={feature}
        upgradeMessage={options?.upgradeMessage}
      >
        <WrappedComponent {...props} />
      </FeatureGate>
    );
  };
};

// Component for inline feature checks
export const FeatureCheck: React.FC<{
  feature: string;
  children: (hasAccess: boolean) => React.ReactNode;
}> = ({ feature, children }) => {
  const { hasAccess } = useFeatureGate(feature);
  return <>{children(hasAccess)}</>;
};

// Component for showing locked features
export const LockedFeature: React.FC<{
  feature: string;
  title: string;
  description: string;
  className?: string;
}> = ({ feature, title, description, className = '' }) => {
  const navigate = useNavigate();

  return (
    <div className={`relative bg-gray-800/30 border border-gray-700 rounded-lg p-4 ${className}`}>
      <div className="absolute inset-0 bg-gray-900/50 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-400 mb-3">Premium Feature</p>
          <button
            onClick={() => navigate('/dashboard/profile')}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded transition-colors"
          >
            Upgrade
          </button>
        </div>
      </div>
      
      <div className="opacity-30">
        <h3 className="font-medium text-white mb-1">{title}</h3>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </div>
  );
};

export default FeatureGate;
