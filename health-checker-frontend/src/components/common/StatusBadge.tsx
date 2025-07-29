import React from 'react';
import { HealthStatus } from '../../types/health';
import { CheckCircle, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import classNames from 'classnames';

interface StatusBadgeProps {
  status: HealthStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showText?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  showText = true,
}) => {
  const getStatusConfig = (status: HealthStatus) => {
    switch (status) {
      case 'Healthy':
        return {
          className: 'status-healthy',
          icon: CheckCircle,
          text: '✓ Healthy',
          color: 'text-green-600',
        };
      case 'Unhealthy':
        return {
          className: 'status-unhealthy',
          icon: XCircle,
          text: '✗ Unhealthy',
          color: 'text-red-600',
        };
      case 'Degraded':
        return {
          className: 'status-degraded',
          icon: AlertTriangle,
          text: '⚠ Degraded',
          color: 'text-yellow-600',
        };
      case 'Unknown':
        return {
          className: 'status-unknown',
          icon: HelpCircle,
          text: '? Unknown',
          color: 'text-gray-600',
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1 font-medium rounded-full border',
        config.className,
        sizeClasses[size]
      )}
    >
      {showIcon && (
        <Icon className={classNames(iconSizes[size], config.color)} />
      )}
      {showText && <span>{config.text}</span>}
    </span>
  );
};

export default StatusBadge;