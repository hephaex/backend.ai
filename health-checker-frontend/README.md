# Backend.AI Health Checker Frontend

A modern React-based web dashboard for monitoring Backend.AI infrastructure health, including real-time GPU monitoring, Docker container status, and service health checks.

## Features

- **Real-time Monitoring**: Live updates of system health status
- **GPU Dashboard**: Comprehensive GPU utilization, temperature, memory, and process monitoring
- **Docker Container Monitoring**: Status and health of all Backend.AI containers
- **Service Health Checks**: Infrastructure services (PostgreSQL, Redis, etcd) and Backend.AI services
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **REST API Integration**: Connects to health checker backend for real-time data

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS with custom Backend.AI theme
- **Icons**: Lucide React
- **Charts**: Recharts (for future metrics visualization)
- **HTTP Client**: Axios
- **Backend API**: Express.js server that interfaces with Rust health checker

## Architecture

```
frontend/
├── src/
│   ├── components/
│   │   ├── common/          # Reusable UI components
│   │   ├── dashboard/       # Dashboard-specific components
│   │   ├── gpu/            # GPU monitoring components
│   │   └── layout/         # Layout components (Header, Navigation)
│   ├── pages/              # Page components
│   ├── services/           # API service layer
│   ├── types/              # TypeScript type definitions
│   └── App.tsx
├── server/                 # Express.js API server
└── public/
```

## Development Setup

### Prerequisites

- Node.js 16+
- npm or yarn
- Backend.AI health checker binary built

### Installation

1. **Install frontend dependencies:**
   ```bash
   cd health-checker-frontend
   npm install
   ```

2. **Install server dependencies:**
   ```bash
   cd server
   npm install
   ```

3. **Ensure health checker binary is built:**
   ```bash
   cd ../health-checker
   cargo build --release
   ```

### Running the Application

1. **Start the API server:**
   ```bash
   cd server
   npm run dev
   ```
   Server runs on http://localhost:8080

2. **Start the React development server:**
   ```bash
   cd .. # back to frontend root
   npm start
   ```
   Frontend runs on http://localhost:3000

### Production Build

1. **Build the React app:**
   ```bash
   npm run build
   ```

2. **Start production server:**
   ```bash
   cd server
   npm start
   ```
   Serves both API and static files on http://localhost:8080

## API Endpoints

The Express server provides these endpoints:

- `GET /api/health/all` - All health checks
- `GET /api/health/docker` - Docker container health
- `GET /api/health/gpu` - GPU hardware health
- `GET /api/health/infrastructure` - Infrastructure services (PostgreSQL, Redis, etcd)
- `GET /api/health/services` - Backend.AI services (Manager API, Prometheus, Grafana)
- `GET /api/gpu/details` - Detailed GPU information
- `GET /api/health/stream` - Server-sent events for real-time updates

## Component Overview

### Dashboard Components

- **OverviewStats**: System-wide health statistics
- **ServiceList**: Categorized list of services with status
- **StatusBadge**: Health status indicator with colors and icons

### GPU Components

- **GpuDashboard**: Comprehensive GPU monitoring interface
  - GPU utilization graphs
  - Memory usage visualization
  - Temperature and power monitoring
  - Running process list

### Layout Components

- **Header**: Top navigation with refresh controls and system status
- **Navigation**: Sidebar navigation between different views

## Styling and Theming

### Custom Tailwind Theme

```css
colors: {
  'healthy': '#10b981',      // Green for healthy status
  'unhealthy': '#ef4444',    // Red for unhealthy status  
  'degraded': '#f59e0b',     // Yellow for degraded status
  'unknown': '#6b7280',      // Gray for unknown status
  'backend-ai': {
    50: '#f0f9ff',
    500: '#0ea5e9',          // Primary brand color
    600: '#0284c7',
    700: '#0369a1',
  }
}
```

### Custom CSS Classes

- `.status-*`: Status-specific styling for badges
- `.card`: Standard card container
- `.metric-card`: Enhanced card for metrics
- `.btn-primary`, `.btn-secondary`: Button styles

## Real-time Updates

The dashboard automatically refreshes data:

- **Overview**: Every 30 seconds
- **GPU Data**: Every 5 seconds  
- **Manual Refresh**: Header refresh button
- **Server-Sent Events**: Available at `/api/health/stream` for real-time streaming

## Mock Data Support

When the backend health checker is unavailable, the frontend gracefully falls back to mock data for development and demonstration purposes.

## Future Enhancements

- **Historical Metrics**: Time-series data visualization
- **Alerting**: Browser notifications for critical issues
- **Custom Dashboards**: User-configurable monitoring views
- **Export Capabilities**: Data export and reporting
- **WebSocket Support**: Enhanced real-time communication

## Integration with Backend.AI

This frontend is designed to integrate seamlessly with:

- Backend.AI halfstack deployment
- Docker container orchestration
- Prometheus metrics collection
- Grafana dashboards
- GPU compute resources

## Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ .
COPY --from=frontend-build /app/build ./build
COPY health-checker/target/release/backend-ai-health-checker ./backend-ai-health-checker

EXPOSE 8080
CMD ["npm", "start"]
```

### Environment Variables

- `PORT`: Server port (default: 8080)
- `REACT_APP_API_URL`: API base URL for frontend
- `HEALTH_CHECKER_PATH`: Path to health checker binary

## Contributing

1. Follow React/TypeScript best practices
2. Use Tailwind CSS for styling
3. Ensure mobile responsiveness
4. Add proper TypeScript types
5. Include error handling and loading states

## License

MIT License - see LICENSE file for details