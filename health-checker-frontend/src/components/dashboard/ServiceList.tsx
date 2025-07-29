import React, { useState } from 'react';
import { HealthCheckResult, ServiceCategory } from '../../types/health';
import StatusBadge from '../common/StatusBadge';
import { ChevronDown, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import classNames from 'classnames';

interface ServiceListProps {
  categories: ServiceCategory[];
}

const ServiceList: React.FC<ServiceListProps> = ({ categories }) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map(cat => cat.name))
  );

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getResponseTimeColor = (responseTime: number) => {
    if (responseTime < 100) return 'text-green-600';
    if (responseTime < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {categories.map((category) => {
        const isExpanded = expandedCategories.has(category.name);
        const healthyCount = category.services.filter(s => s.status === 'Healthy').length;
        const totalCount = category.services.length;
        
        return (
          <div key={category.name} className="card">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleCategory(category.name)}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="text-2xl">{category.icon}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {category.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {healthyCount}/{totalCount} services healthy
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge 
                  status={healthyCount === totalCount ? 'Healthy' : 
                         healthyCount === 0 ? 'Unhealthy' : 'Degraded'} 
                  size="sm"
                />
              </div>
            </div>

            {isExpanded && (
              <div className="mt-6 border-t border-gray-100 pt-4">
                <div className="space-y-3">
                  {category.services.map((service, index) => (
                    <div
                      key={`${service.service_name}-${index}`}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-gray-900">
                            {service.service_name}
                          </h4>
                          <StatusBadge status={service.status} size="sm" />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span className={getResponseTimeColor(service.response_time_ms)}>
                              {service.response_time_ms}ms
                            </span>
                          </div>
                          <span>Updated: {formatTimestamp(service.timestamp)}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{service.details}</p>
                        {service.error_message && (
                          <div className="flex items-center gap-1 mt-2 text-sm text-red-600">
                            <AlertCircle className="w-4 h-4" />
                            <span>{service.error_message}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ServiceList;