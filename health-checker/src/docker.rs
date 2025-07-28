use anyhow::Result;
use bollard::container::{ListContainersOptions, InspectContainerOptions};
use bollard::Docker;
use log::{debug, error, info};
use serde::{Deserialize, Serialize};
use crate::HealthStatus;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContainerInfo {
    pub id: String,
    pub name: String,
    pub image: String,
    pub status: String,
    pub ports: Vec<String>,
}

pub struct DockerClient {
    client: Docker,
}

impl DockerClient {
    pub async fn new() -> Result<Self> {
        let client = Docker::connect_with_local_defaults()?;
        
        // Test connection
        let version = client.version().await?;
        info!("Connected to Docker version: {:?}", version.version);
        
        Ok(Self { client })
    }

    pub async fn list_backend_ai_containers(&self) -> Result<Vec<ContainerInfo>> {
        let mut list_options = ListContainersOptions::<String>::default();
        list_options.all = true;
        
        let containers = self.client.list_containers(Some(list_options)).await?;
        let mut backend_ai_containers = Vec::new();

        for container in containers {
            // Filter for Backend.AI related containers
            let empty_names = vec![];
            let names = container.names.as_ref().unwrap_or(&empty_names);
            let empty_image = String::new();
            let image = container.image.as_ref().unwrap_or(&empty_image);
            
            if names.iter().any(|name| self.is_backend_ai_container(name)) ||
               self.is_backend_ai_image(image) {
                
                let name = names.first()
                    .map(|n| n.trim_start_matches('/').to_string())
                    .unwrap_or_else(|| container.id.clone().unwrap_or_default()[..12].to_string());

                let ports = container.ports.as_ref().unwrap_or(&vec![])
                    .iter()
                    .filter_map(|port| {
                        match (port.private_port, port.public_port) {
                            (private_port, Some(public_port)) => {
                                Some(format!("{}:{}", public_port, private_port))
                            }
                            (private_port, None) => {
                                Some(format!("{}", private_port))
                            }
                        }
                    })
                    .collect();

                backend_ai_containers.push(ContainerInfo {
                    id: container.id.unwrap_or_default(),
                    name,
                    image: image.clone(),
                    status: container.status.unwrap_or_default(),
                    ports,
                });
            }
        }

        debug!("Found {} Backend.AI containers", backend_ai_containers.len());
        Ok(backend_ai_containers)
    }

    pub async fn check_container_health(&self, container_id: &str) -> Result<(HealthStatus, String)> {
        let inspect_options = InspectContainerOptions { size: false };
        
        match self.client.inspect_container(container_id, Some(inspect_options)).await {
            Ok(container) => {
                let state = container.state.unwrap_or_default();
                let running = state.running.unwrap_or(false);
                let _status = state.status.map(|s| format!("{:?}", s)).unwrap_or_else(|| "Unknown".to_string());
                let exit_code = state.exit_code.unwrap_or(0);

                let health_status = if running {
                    // Check if container has health check
                    if let Some(health) = state.health {
                        match health.status.as_ref().map(|s| format!("{:?}", s)).as_deref() {
                            Some(status) if status.contains("healthy") => HealthStatus::Healthy,
                            Some(status) if status.contains("unhealthy") => HealthStatus::Unhealthy,
                            Some(status) if status.contains("starting") => HealthStatus::Degraded,
                            _ => HealthStatus::Unknown,
                        }
                    } else {
                        HealthStatus::Healthy 
                    }
                } else {
                    HealthStatus::Unhealthy
                };

                let details = if running {
                    if let Some(started_at) = state.started_at {
                        format!("Running since {}", started_at)
                    } else {
                        "Running".to_string()
                    }
                } else {
                    format!("Stopped (exit code: {})", exit_code)
                };

                Ok((health_status, details))
            }
            Err(e) => {
                error!("Failed to inspect container {}: {}", container_id, e);
                Ok((HealthStatus::Unknown, format!("Inspection failed: {}", e)))
            }
        }
    }

    pub async fn get_container_logs(&self, container_id: &str, tail: Option<String>) -> Result<String> {
        use bollard::container::LogsOptions;
        use futures::stream::StreamExt;

        let options = LogsOptions::<String> {
            stdout: true,
            stderr: true,
            tail: tail.unwrap_or_else(|| "50".to_string()),
            ..Default::default()
        };

        let mut log_stream = self.client.logs(container_id, Some(options));
        let mut logs = String::new();

        while let Some(log_result) = log_stream.next().await {
            match log_result {
                Ok(log_output) => {
                    logs.push_str(&log_output.to_string());
                }
                Err(e) => {
                    error!("Error reading logs: {}", e);
                    break;
                }
            }
        }

        Ok(logs)
    }

    pub async fn get_network_info(&self, network_name: &str) -> Result<Option<bollard::models::Network>> {
        use bollard::network::InspectNetworkOptions;

        match self.client.inspect_network(network_name, None::<InspectNetworkOptions<String>>).await {
            Ok(network) => Ok(Some(network)),
            Err(bollard::errors::Error::DockerResponseServerError { status_code: 404, .. }) => {
                Ok(None)
            }
            Err(e) => {
                error!("Failed to inspect network {}: {}", network_name, e);
                Err(e.into())
            }
        }
    }

    fn is_backend_ai_container(&self, name: &str) -> bool {
        let name_lower = name.to_lowercase();
        name_lower.contains("backend.ai") ||
        name_lower.contains("halfstack") ||
        name_lower.contains("postgres") && name_lower.contains("backend") ||
        name_lower.contains("redis") && name_lower.contains("backend") ||
        name_lower.contains("etcd") && name_lower.contains("backend") ||
        name_lower.contains("prometheus") && name_lower.contains("backend") ||
        name_lower.contains("grafana") && name_lower.contains("backend") ||
        name_lower.contains("loki") && name_lower.contains("backend") ||
        name_lower.contains("tempo") && name_lower.contains("backend") ||
        name_lower.contains("pyroscope") && name_lower.contains("backend") ||
        name_lower.contains("otel-collector") ||
        name_lower.contains("node-exporter")
    }

    fn is_backend_ai_image(&self, image: &str) -> bool {
        let image_lower = image.to_lowercase();
        image_lower.contains("backend.ai") ||
        image_lower.contains("postgres") && (image_lower.contains("15") || image_lower.contains("14")) ||
        image_lower.contains("redis") && image_lower.contains("7") ||
        image_lower.contains("etcd") ||
        image_lower.contains("prometheus") ||
        image_lower.contains("grafana") ||
        image_lower.contains("loki") ||
        image_lower.contains("tempo") ||
        image_lower.contains("pyroscope") ||
        image_lower.contains("otel/opentelemetry-collector") ||
        image_lower.contains("node-exporter")
    }

    pub async fn get_container_stats(&self, container_id: &str) -> Result<String> {
        use bollard::container::StatsOptions;
        use futures::stream::StreamExt;

        let options = StatsOptions {
            stream: false,
            one_shot: true,
        };

        let mut stats_stream = self.client.stats(container_id, Some(options));
        
        if let Some(stats_result) = stats_stream.next().await {
            match stats_result {
                Ok(stats) => {
                    let cpu_usage = stats.cpu_stats.cpu_usage.total_usage;
                    let memory_usage = stats.memory_stats.usage.unwrap_or(0);
                    let memory_limit = stats.memory_stats.limit.unwrap_or(0);
                    
                    let memory_usage_mb = memory_usage / 1024 / 1024;
                    let memory_limit_mb = memory_limit / 1024 / 1024;
                    let memory_percent = if memory_limit > 0 {
                        (memory_usage as f64 / memory_limit as f64) * 100.0
                    } else {
                        0.0
                    };

                    Ok(format!(
                        "CPU: {}, Memory: {}MB/{}MB ({:.1}%)",
                        cpu_usage,
                        memory_usage_mb,
                        memory_limit_mb,
                        memory_percent
                    ))
                }
                Err(e) => {
                    error!("Failed to get stats for container {}: {}", container_id, e);
                    Ok("Stats unavailable".to_string())
                }
            }
        } else {
            Ok("No stats available".to_string())
        }
    }
}