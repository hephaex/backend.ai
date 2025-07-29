import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Container, 
  Zap, 
  Database, 
  Settings,
  FileText,
  BarChart3 
} from 'lucide-react';
import classNames from 'classnames';

const Navigation: React.FC = () => {
  const navItems = [
    {
      name: 'Overview',
      path: '/',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: 'Docker Containers',
      path: '/docker',
      icon: Container,
    },
    {
      name: 'GPU Hardware',
      path: '/gpu',
      icon: Zap,
    },
    {
      name: 'Infrastructure',
      path: '/infrastructure',
      icon: Database,
    },
    {
      name: 'Services',
      path: '/services',
      icon: Settings,
    },
    {
      name: 'Service Logs',
      path: '/logs',
      icon: FileText,
    },
    {
      name: 'Metrics',
      path: '/metrics',
      icon: BarChart3,
    },
  ];

  return (
    <nav className="bg-white border-r border-gray-200 w-64 min-h-screen">
      <div className="p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.name}>
                <NavLink
                  to={item.path}
                  end={item.exact}
                  className={({ isActive }) =>
                    classNames(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
                      isActive
                        ? 'bg-backend-ai-100 text-backend-ai-700 border border-backend-ai-200'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    )
                  }
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

export default Navigation;