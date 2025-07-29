import React from 'react';
import { HealthReport } from '../../types/health';
import { Activity, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';

interface OverviewStatsProps {
  report: HealthReport;
}

const OverviewStats: React.FC<OverviewStatsProps> = ({ report }) => {
  const averageResponseTime = Math.round(
    report.checks.reduce((sum, check) => sum + check.response_time_ms, 0) / report.checks.length
  );

  const healthPercentage = Math.round((report.healthy_count / report.total_checks) * 100);

  const stats = [
    {
      name: 'Total Services',
      value: report.total_checks,
      icon: Activity,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      name: 'Healthy Services',
      value: report.healthy_count,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      percentage: healthPercentage,
    },
    {
      name: 'Issues Detected',
      value: report.unhealthy_count + report.degraded_count,
      icon: report.unhealthy_count > 0 ? XCircle : AlertTriangle,
      color: report.unhealthy_count > 0 ? 'text-red-600' : 'text-yellow-600',
      bgColor: report.unhealthy_count > 0 ? 'bg-red-50' : 'bg-yellow-50',
      borderColor: report.unhealthy_count > 0 ? 'border-red-200' : 'border-yellow-200',
    },
    {
      name: 'Avg Response Time',
      value: `${averageResponseTime}ms`,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.name}
            className={`metric-card border ${stat.borderColor} ${stat.bgColor}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  {stat.percentage && (
                    <span className="text-sm text-gray-500">({stat.percentage}%)</span>
                  )}
                </div>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OverviewStats;