import React from 'react';
import { Loader2 } from 'lucide-react';
import classNames from 'classnames';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message,
  className,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={classNames('flex flex-col items-center justify-center gap-2', className)}>
      <Loader2 className={classNames('animate-spin text-backend-ai-600', sizeClasses[size])} />
      {message && (
        <p className="text-sm text-gray-600 animate-pulse">{message}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;