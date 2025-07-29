import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HealthDataProvider } from './contexts/HealthDataContext';
import Header from './components/layout/Header';
import Navigation from './components/layout/Navigation';
import OverviewPage from './pages/OverviewPage';
import GpuPage from './pages/GpuPage';
import LogsPage from './pages/LogsPage';
import LoadingSpinner from './components/common/LoadingSpinner';

function App() {

  return (
    <HealthDataProvider refreshInterval={10000}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Header />
          
          <div className="flex">
            <Navigation />
            
            <main className="flex-1 p-8">
              <Routes>
                <Route path="/" element={<OverviewPage />} />
                <Route path="/docker" element={<DockerPage />} />
                <Route path="/gpu" element={<GpuPage />} />
                <Route path="/infrastructure" element={<InfrastructurePage />} />
                <Route path="/services" element={<ServicesPage />} />
                <Route path="/logs" element={<LogsPage />} />
                <Route path="/metrics" element={<MetricsPage />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </HealthDataProvider>
  );
}

// Placeholder components for other pages
const DockerPage: React.FC = () => (
  <div className="space-y-8">
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Docker Containers</h1>
      <p className="text-gray-600">
        Monitor the health and status of all Backend.AI Docker containers
      </p>
    </div>
    <div className="card">
      <LoadingSpinner message="Docker container monitoring coming soon..." />
    </div>
  </div>
);

const InfrastructurePage: React.FC = () => (
  <div className="space-y-8">
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Infrastructure Services</h1>
      <p className="text-gray-600">
        Monitor PostgreSQL, Redis, etcd, and other core infrastructure components
      </p>
    </div>
    <div className="card">
      <LoadingSpinner message="Infrastructure monitoring coming soon..." />
    </div>
  </div>
);

const ServicesPage: React.FC = () => (
  <div className="space-y-8">
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Backend.AI Services</h1>
      <p className="text-gray-600">
        Monitor Manager API, Prometheus, Grafana, and other Backend.AI services
      </p>
    </div>
    <div className="card">
      <LoadingSpinner message="Service monitoring coming soon..." />
    </div>
  </div>
);

const MetricsPage: React.FC = () => (
  <div className="space-y-8">
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Performance Metrics</h1>
      <p className="text-gray-600">
        Historical performance data, trends, and analytics
      </p>
    </div>
    <div className="card">
      <LoadingSpinner message="Metrics dashboard coming soon..." />
    </div>
  </div>
);

export default App;