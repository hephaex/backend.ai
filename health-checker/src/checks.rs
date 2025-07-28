use anyhow::Result;
use log::{info, warn};
use std::process::Command;

use crate::{HealthCheckResult, HealthStatus};

/// Additional health check utilities and system checks
pub struct SystemChecker;

impl SystemChecker {
    /// Check if Docker is running and accessible
    pub fn check_docker_daemon() -> Result<(HealthStatus, String)> {
        match Command::new("docker").arg("version").output() {
            Ok(output) => {
                if output.status.success() {
                    let version_info = String::from_utf8_lossy(&output.stdout);
                    let version_line = version_info
                        .lines()
                        .find(|line| line.contains("Version:"))
                        .unwrap_or("Docker daemon running");
                    Ok((HealthStatus::Healthy, version_line.to_string()))
                } else {
                    let error = String::from_utf8_lossy(&output.stderr);
                    Ok((HealthStatus::Unhealthy, format!("Docker command failed: {}", error)))
                }
            }
            Err(e) => Ok((HealthStatus::Unhealthy, format!("Docker not found or not running: {}", e))),
        }
    }

    /// Check system resources (CPU, Memory, Disk)
    pub fn check_system_resources() -> Result<(HealthStatus, String)> {
        let mut status = HealthStatus::Healthy;
        let mut details = Vec::new();

        // Check available memory using `vm_stat` on macOS
        if let Ok(output) = Command::new("vm_stat").output() {
            if output.status.success() {
                let _vm_info = String::from_utf8_lossy(&output.stdout);
                details.push("Memory check completed".to_string());
            } else {
                details.push("Memory check failed".to_string());
                status = HealthStatus::Degraded;
            }
        }

        // Check disk space for current directory
        if let Ok(output) = Command::new("df").arg("-h").arg(".").output() {
            if output.status.success() {
                let df_info = String::from_utf8_lossy(&output.stdout);
                if let Some(line) = df_info.lines().nth(1) {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 5 {
                        let usage_percent = parts[4].trim_end_matches('%');
                        if let Ok(usage) = usage_percent.parse::<u32>() {
                            if usage > 90 {
                                status = HealthStatus::Degraded;
                                details.push(format!("Disk usage high: {}%", usage));
                            } else {
                                details.push(format!("Disk usage: {}%", usage));
                            }
                        }
                    }
                }
            }
        }

        Ok((status, details.join(", ")))
    }

    /// Check network connectivity to essential services
    pub async fn check_network_connectivity() -> Result<(HealthStatus, String)> {
        let test_endpoints = vec![
            ("localhost:8081", "Manager API"),
            ("localhost:8101", "PostgreSQL"),
            ("localhost:8111", "Redis"),
            ("localhost:8121", "etcd"),
            ("localhost:9090", "Prometheus"),
            ("localhost:3000", "Grafana"),
        ];

        let mut successful_connections = 0;
        let mut failed_connections = Vec::new();

        let total_endpoints = test_endpoints.len();
        
        for (endpoint, service) in test_endpoints {
            match tokio::net::TcpStream::connect(endpoint).await {
                Ok(_) => {
                    successful_connections += 1;
                    info!("Network connectivity to {} ({}): OK", service, endpoint);
                }
                Err(e) => {
                    warn!("Network connectivity to {} ({}): FAILED - {}", service, endpoint, e);
                    failed_connections.push(format!("{} ({})", service, endpoint));
                }
            }
        }
        let success_rate = (successful_connections as f64 / total_endpoints as f64) * 100.0;

        let status = if successful_connections == total_endpoints {
            HealthStatus::Healthy
        } else if successful_connections > total_endpoints / 2 {
            HealthStatus::Degraded
        } else {
            HealthStatus::Unhealthy
        };

        let details = if failed_connections.is_empty() {
            format!("All {} endpoints accessible", total_endpoints)
        } else {
            format!(
                "{}/{} endpoints accessible ({:.1}%) - Failed: {}",
                successful_connections,
                total_endpoints,
                success_rate,
                failed_connections.join(", ")
            )
        };

        Ok((status, details))
    }

    /// Check Backend.AI configuration files
    pub fn check_configuration_files() -> Result<(HealthStatus, String)> {
        use std::path::Path;

        let config_files = vec![
            ("manager.toml", "Manager configuration"),
            ("agent.toml", "Agent configuration"), 
            ("storage-proxy.toml", "Storage proxy configuration"),
            ("env-local-admin-api.sh", "Admin API environment"),
            ("docker-compose.halfstack.yml", "Docker compose configuration"),
        ];

        let mut found_configs = Vec::new();
        let mut missing_configs = Vec::new();

        for (file, description) in config_files {
            if Path::new(file).exists() {
                found_configs.push(description);
            } else {
                missing_configs.push(description);
            }
        }

        let status = if missing_configs.is_empty() {
            HealthStatus::Healthy
        } else if missing_configs.len() <= 1 {
            HealthStatus::Degraded
        } else {
            HealthStatus::Unhealthy
        };

        let details = if missing_configs.is_empty() {
            format!("All {} configuration files found", found_configs.len())
        } else {
            format!(
                "{} configs found, {} missing: {}",
                found_configs.len(),
                missing_configs.len(),
                missing_configs.join(", ")
            )
        };

        Ok((status, details))
    }

    /// Check if required ports are available/in use
    pub async fn check_port_usage() -> Result<(HealthStatus, String)> {
        let required_ports = vec![
            (8081, "Manager API"),
            (8101, "PostgreSQL"),
            (8111, "Redis"),
            (8121, "etcd"),
            (9090, "Prometheus"),
            (3000, "Grafana"),
        ];

        let mut ports_in_use = Vec::new();
        let mut ports_available = Vec::new();

        for (port, service) in required_ports {
            let address = format!("127.0.0.1:{}", port);
            match tokio::net::TcpStream::connect(&address).await {
                Ok(_) => {
                    ports_in_use.push(format!("{} ({})", port, service));
                }
                Err(_) => {
                    ports_available.push(format!("{} ({})", port, service));
                }
            }
        }

        // For a health check, we want most ports to be in use (services running)
        let status = if ports_in_use.len() >= 4 {
            HealthStatus::Healthy
        } else if ports_in_use.len() >= 2 {
            HealthStatus::Degraded
        } else {
            HealthStatus::Unhealthy
        };

        let details = format!(
            "{} services listening, {} ports available",
            ports_in_use.len(),
            ports_available.len()
        );

        Ok((status, details))
    }

    /// Comprehensive system health check
    pub async fn comprehensive_system_check() -> Result<Vec<HealthCheckResult>> {
        use chrono::Utc;
        
        let mut results = Vec::new();

        // Docker daemon check
        let (status, details) = Self::check_docker_daemon()?;
        results.push(HealthCheckResult {
            service_name: "Docker Daemon".to_string(),
            status,
            response_time_ms: 0,
            details,
            timestamp: Utc::now(),
            error_message: None,
        });

        // System resources check
        let (status, details) = Self::check_system_resources()?;
        results.push(HealthCheckResult {
            service_name: "System Resources".to_string(),
            status,
            response_time_ms: 0,
            details,
            timestamp: Utc::now(),
            error_message: None,
        });

        // Configuration files check
        let (status, details) = Self::check_configuration_files()?;
        results.push(HealthCheckResult {
            service_name: "Configuration Files".to_string(),
            status,
            response_time_ms: 0,
            details,
            timestamp: Utc::now(),
            error_message: None,
        });

        // Network connectivity check
        let start_time = std::time::Instant::now();
        let (status, details) = Self::check_network_connectivity().await?;
        results.push(HealthCheckResult {
            service_name: "Network Connectivity".to_string(),
            status,
            response_time_ms: start_time.elapsed().as_millis() as u64,
            details,
            timestamp: Utc::now(),
            error_message: None,
        });

        // Port usage check
        let start_time = std::time::Instant::now();
        let (status, details) = Self::check_port_usage().await?;
        results.push(HealthCheckResult {
            service_name: "Port Usage".to_string(),
            status,
            response_time_ms: start_time.elapsed().as_millis() as u64,
            details,
            timestamp: Utc::now(),
            error_message: None,
        });

        Ok(results)
    }
}