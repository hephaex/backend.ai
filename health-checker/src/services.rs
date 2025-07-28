use anyhow::Result;
use chrono::Utc;
use log::{debug, error, warn};
use std::time::Instant;

use crate::{HealthCheckResult, HealthStatus};

impl crate::HealthChecker {
    pub async fn check_postgresql(&self) -> HealthCheckResult {
        let start_time = Instant::now();
        let service_name = "PostgreSQL".to_string();

        match self.check_postgresql_internal().await {
            Ok((status, details)) => HealthCheckResult {
                service_name,
                status,
                response_time_ms: start_time.elapsed().as_millis() as u64,
                details,
                timestamp: Utc::now(),
                error_message: None,
            },
            Err(e) => {
                error!("PostgreSQL health check failed: {}", e);
                HealthCheckResult {
                    service_name,
                    status: HealthStatus::Unhealthy,
                    response_time_ms: start_time.elapsed().as_millis() as u64,
                    details: "Connection failed".to_string(),
                    timestamp: Utc::now(),
                    error_message: Some(e.to_string()),
                }
            }
        }
    }

    async fn check_postgresql_internal(&self) -> Result<(HealthStatus, String)> {
        use tokio_postgres::NoTls;

        let connection_string = "host=127.0.0.1 port=8101 user=postgres dbname=backend";
        
        match tokio_postgres::connect(connection_string, NoTls).await {
            Ok((client, connection)) => {
                // Spawn connection handler
                tokio::spawn(async move {
                    if let Err(e) = connection.await {
                        error!("PostgreSQL connection error: {}", e);
                    }
                });

                // Test with a simple query
                match client.query("SELECT version()", &[]).await {
                    Ok(rows) => {
                        if let Some(row) = rows.first() {
                            let version: String = row.get(0);
                            debug!("PostgreSQL version: {}", version);
                            Ok((HealthStatus::Healthy, format!("Connected - {}", version.split_whitespace().take(2).collect::<Vec<_>>().join(" "))))
                        } else {
                            Ok((HealthStatus::Healthy, "Connected - Version query returned no results".to_string()))
                        }
                    }
                    Err(e) => {
                        warn!("PostgreSQL query failed: {}", e);
                        Ok((HealthStatus::Degraded, format!("Connected but query failed: {}", e)))
                    }
                }
            }
            Err(e) => {
                error!("PostgreSQL connection failed: {}", e);
                Ok((HealthStatus::Unhealthy, format!("Connection failed: {}", e)))
            }
        }
    }

    pub async fn check_redis(&self) -> HealthCheckResult {
        let start_time = Instant::now();
        let service_name = "Redis".to_string();

        match self.check_redis_internal().await {
            Ok((status, details)) => HealthCheckResult {
                service_name,
                status,
                response_time_ms: start_time.elapsed().as_millis() as u64,
                details,
                timestamp: Utc::now(),
                error_message: None,
            },
            Err(e) => {
                error!("Redis health check failed: {}", e);
                HealthCheckResult {
                    service_name,
                    status: HealthStatus::Unhealthy,
                    response_time_ms: start_time.elapsed().as_millis() as u64,
                    details: "Connection failed".to_string(),
                    timestamp: Utc::now(),
                    error_message: Some(e.to_string()),
                }
            }
        }
    }

    async fn check_redis_internal(&self) -> Result<(HealthStatus, String)> {
        use redis::AsyncCommands;

        let client = redis::Client::open("redis://127.0.0.1:8111/")?;
        let mut conn = client.get_tokio_connection().await?;

        // Test PING command using redis commands
        let pong: String = redis::cmd("PING").query_async(&mut conn).await?;
        if pong == "PONG" {
            Ok((HealthStatus::Healthy, "PING successful".to_string()))
        } else {
            Ok((HealthStatus::Degraded, format!("Unexpected PING response: {}", pong)))
        }
    }

    pub async fn check_etcd(&self) -> HealthCheckResult {
        let start_time = Instant::now();
        let service_name = "etcd".to_string();

        match self.check_etcd_internal().await {
            Ok((status, details)) => HealthCheckResult {
                service_name,
                status,
                response_time_ms: start_time.elapsed().as_millis() as u64,
                details,
                timestamp: Utc::now(),
                error_message: None,
            },
            Err(e) => {
                error!("etcd health check failed: {}", e);
                HealthCheckResult {
                    service_name,
                    status: HealthStatus::Unhealthy,
                    response_time_ms: start_time.elapsed().as_millis() as u64,
                    details: "Connection failed".to_string(),
                    timestamp: Utc::now(),
                    error_message: Some(e.to_string()),
                }
            }
        }
    }

    async fn check_etcd_internal(&self) -> Result<(HealthStatus, String)> {
        use etcd_rs::{Client, ClientConfig, Endpoint, KeyValueOp};

        let endpoints = vec![Endpoint::new("http://127.0.0.1:8121")];
        let client = Client::connect(ClientConfig::new(endpoints)).await?;

        // Try a simple key operation to test connectivity
        match client.put(("health_check_test", "test_value")).await {
            Ok(_) => {
                // Clean up test key
                let _ = client.delete("health_check_test").await;
                Ok((HealthStatus::Healthy, "Key operations successful".to_string()))
            }
            Err(e) => Ok((HealthStatus::Unhealthy, format!("etcd operations failed: {}", e)))
        }
    }

    pub async fn check_manager_api(&self) -> HealthCheckResult {
        let start_time = Instant::now();
        let service_name = "Manager API".to_string();

        match self.check_manager_api_internal().await {
            Ok((status, details)) => HealthCheckResult {
                service_name,
                status,
                response_time_ms: start_time.elapsed().as_millis() as u64,
                details,
                timestamp: Utc::now(),
                error_message: None,
            },
            Err(e) => {
                error!("Manager API health check failed: {}", e);
                HealthCheckResult {
                    service_name,
                    status: HealthStatus::Unhealthy,
                    response_time_ms: start_time.elapsed().as_millis() as u64,
                    details: "API not accessible".to_string(),
                    timestamp: Utc::now(),
                    error_message: Some(e.to_string()),
                }
            }
        }
    }

    async fn check_manager_api_internal(&self) -> Result<(HealthStatus, String)> {
        let client = reqwest::Client::builder()
            .timeout(self.timeout)
            .build()?;

        // Try server version endpoint
        match client.get("http://127.0.0.1:8081/server/version").send().await {
            Ok(response) => {
                let status_code = response.status();
                if status_code.is_success() {
                    match response.text().await {
                        Ok(text) => {
                            debug!("Manager API version response: {}", text);
                            Ok((HealthStatus::Healthy, format!("API accessible - Status: {}", status_code)))
                        }
                        Err(e) => {
                            Ok((HealthStatus::Degraded, format!("API accessible but response parsing failed: {}", e)))
                        }
                    }
                } else {
                    Ok((HealthStatus::Degraded, format!("API responded with status: {}", status_code)))
                }
            }
            Err(e) => {
                // Try to determine if it's a connection issue or other problem
                if e.is_connect() {
                    Ok((HealthStatus::Unhealthy, "Connection refused - service may be down".to_string()))
                } else if e.is_timeout() {
                    Ok((HealthStatus::Degraded, "Request timeout - service may be slow".to_string()))
                } else {
                    Ok((HealthStatus::Unhealthy, format!("Request failed: {}", e)))
                }
            }
        }
    }

    pub async fn check_prometheus(&self) -> HealthCheckResult {
        let start_time = Instant::now();
        let service_name = "Prometheus".to_string();

        match self.check_prometheus_internal().await {
            Ok((status, details)) => HealthCheckResult {
                service_name,
                status,
                response_time_ms: start_time.elapsed().as_millis() as u64,
                details,
                timestamp: Utc::now(),
                error_message: None,
            },
            Err(e) => {
                error!("Prometheus health check failed: {}", e);
                HealthCheckResult {
                    service_name,
                    status: HealthStatus::Unhealthy,
                    response_time_ms: start_time.elapsed().as_millis() as u64,
                    details: "Not accessible".to_string(),
                    timestamp: Utc::now(),
                    error_message: Some(e.to_string()),
                }
            }
        }
    }

    async fn check_prometheus_internal(&self) -> Result<(HealthStatus, String)> {
        let client = reqwest::Client::builder()
            .timeout(self.timeout)
            .build()?;

        match client.get("http://127.0.0.1:9090/-/healthy").send().await {
            Ok(response) => {
                if response.status().is_success() {
                    Ok((HealthStatus::Healthy, "Healthy endpoint accessible".to_string()))
                } else {
                    Ok((HealthStatus::Degraded, format!("Unhealthy status: {}", response.status())))
                }
            }
            Err(e) => {
                if e.is_connect() {
                    Ok((HealthStatus::Unhealthy, "Connection refused".to_string()))
                } else {
                    Ok((HealthStatus::Unhealthy, format!("Request failed: {}", e)))
                }
            }
        }
    }

    pub async fn check_grafana(&self) -> HealthCheckResult {
        let start_time = Instant::now();
        let service_name = "Grafana".to_string();

        match self.check_grafana_internal().await {
            Ok((status, details)) => HealthCheckResult {
                service_name,
                status,
                response_time_ms: start_time.elapsed().as_millis() as u64,
                details,
                timestamp: Utc::now(),
                error_message: None,
            },
            Err(e) => {
                error!("Grafana health check failed: {}", e);
                HealthCheckResult {
                    service_name,
                    status: HealthStatus::Unhealthy,
                    response_time_ms: start_time.elapsed().as_millis() as u64,
                    details: "Not accessible".to_string(),
                    timestamp: Utc::now(),
                    error_message: Some(e.to_string()),
                }
            }
        }
    }

    async fn check_grafana_internal(&self) -> Result<(HealthStatus, String)> {
        let client = reqwest::Client::builder()
            .timeout(self.timeout)
            .build()?;

        match client.get("http://127.0.0.1:3000/api/health").send().await {
            Ok(response) => {
                if response.status().is_success() {
                    match response.json::<serde_json::Value>().await {
                        Ok(json) => {
                            if let Some(status) = json.get("database").and_then(|v| v.as_str()) {
                                if status == "ok" {
                                    Ok((HealthStatus::Healthy, "Database connection OK".to_string()))
                                } else {
                                    Ok((HealthStatus::Degraded, format!("Database status: {}", status)))
                                }
                            } else {
                                Ok((HealthStatus::Healthy, "Health endpoint accessible".to_string()))
                            }
                        }
                        Err(_) => Ok((HealthStatus::Healthy, "Health endpoint accessible".to_string()))
                    }
                } else {
                    Ok((HealthStatus::Degraded, format!("HTTP status: {}", response.status())))
                }
            }
            Err(e) => {
                if e.is_connect() {
                    Ok((HealthStatus::Unhealthy, "Connection refused".to_string()))
                } else {
                    Ok((HealthStatus::Unhealthy, format!("Request failed: {}", e)))
                }
            }
        }
    }
}