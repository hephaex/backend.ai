use anyhow::Result;
use chrono::{DateTime, Utc};
use clap::{Parser, Subcommand};
use colored::*;
use log::{debug, error, info, warn};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{Duration, Instant};
use tabled::{Table, Tabled};

mod checks;
mod docker;
mod services;
mod gpu;

use checks::*;
use docker::DockerClient;
use services::*;
use gpu::GpuMonitor;

#[derive(Parser)]
#[command(name = "backend-ai-health-checker")]
#[command(about = "Health check application for Backend.AI infrastructure")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Run all health checks
    All {
        /// Output format (table, json, summary)
        #[arg(short, long, default_value = "table")]
        format: String,
        /// Include detailed logs in output
        #[arg(short, long)]
        verbose: bool,
        /// Timeout for each check in seconds
        #[arg(short, long, default_value = "30")]
        timeout: u64,
    },
    /// Check Docker containers only
    Docker {
        #[arg(short, long, default_value = "table")]
        format: String,
    },
    /// Check Backend.AI services only
    Services {
        #[arg(short, long, default_value = "table")]
        format: String,
    },
    /// Check infrastructure services (Redis, PostgreSQL, etcd)
    Infrastructure {
        #[arg(short, long, default_value = "table")]
        format: String,
    },
    /// Check GPU hardware only
    Gpu {
        #[arg(short, long, default_value = "table")]
        format: String,
        /// Show detailed GPU information
        #[arg(short, long)]
        detailed: bool,
    },
    /// Monitor services continuously
    Monitor {
        /// Check interval in seconds
        #[arg(short, long, default_value = "30")]
        interval: u64,
        /// Maximum number of checks (0 for infinite)
        #[arg(short, long, default_value = "0")]
        max_checks: u32,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, Tabled)]
pub struct HealthCheckResult {
    #[tabled(rename = "Service")]
    pub service_name: String,
    #[tabled(rename = "Status")]
    pub status: HealthStatus,
    #[tabled(rename = "Response Time")]
    pub response_time_ms: u64,
    #[tabled(rename = "Details")]
    pub details: String,
    #[tabled(skip)]
    pub timestamp: DateTime<Utc>,
    #[tabled(skip)]
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum HealthStatus {
    Healthy,
    Unhealthy,
    Degraded,
    Unknown,
}

impl std::fmt::Display for HealthStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let colored_status = match self {
            HealthStatus::Healthy => "✓ Healthy".green(),
            HealthStatus::Unhealthy => "✗ Unhealthy".red(),
            HealthStatus::Degraded => "⚠ Degraded".yellow(),
            HealthStatus::Unknown => "? Unknown".cyan(),
        };
        write!(f, "{}", colored_status)
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthReport {
    pub timestamp: DateTime<Utc>,
    pub overall_status: HealthStatus,
    pub total_checks: usize,
    pub healthy_count: usize,
    pub unhealthy_count: usize,
    pub degraded_count: usize,
    pub unknown_count: usize,
    pub checks: Vec<HealthCheckResult>,
    pub summary: String,
}

pub struct HealthChecker {
    docker_client: DockerClient,
    gpu_monitor: GpuMonitor,
    timeout: Duration,
}

impl HealthChecker {
    pub async fn new(timeout_secs: u64) -> Result<Self> {
        let docker_client = DockerClient::new().await?;
        let gpu_monitor = GpuMonitor::new();
        Ok(Self {
            docker_client,
            gpu_monitor,
            timeout: Duration::from_secs(timeout_secs),
        })
    }

    pub async fn run_all_checks(&self) -> Result<HealthReport> {
        info!("Starting comprehensive health check...");
        let start_time = Instant::now();
        let mut results = Vec::new();

        // Docker container checks
        info!("Checking Docker containers...");
        let mut docker_results = self.check_docker_containers().await?;
        results.append(&mut docker_results);

        // Infrastructure service checks
        info!("Checking infrastructure services...");
        let mut infra_results = self.check_infrastructure_services().await?;
        results.append(&mut infra_results);

        // Backend.AI service checks
        info!("Checking Backend.AI services...");
        let mut service_results = self.check_backend_ai_services().await?;
        results.append(&mut service_results);

        // GPU hardware checks
        info!("Checking GPU hardware...");
        let mut gpu_results = self.gpu_monitor.get_gpu_health_checks().await?;
        results.append(&mut gpu_results);

        let total_time = start_time.elapsed();
        info!("Health check completed in {:.2}s", total_time.as_secs_f64());

        self.generate_report(results)
    }

    pub async fn check_docker_containers(&self) -> Result<Vec<HealthCheckResult>> {
        let mut results = Vec::new();
        let containers = self.docker_client.list_backend_ai_containers().await?;

        for container in containers {
            let start_time = Instant::now();
            let (status, details) = self.docker_client.check_container_health(&container.id).await?;
            let response_time = start_time.elapsed().as_millis() as u64;

            results.push(HealthCheckResult {
                service_name: container.name,
                status,
                response_time_ms: response_time,
                details,
                timestamp: Utc::now(),
                error_message: None,
            });
        }

        Ok(results)
    }

    pub async fn check_infrastructure_services(&self) -> Result<Vec<HealthCheckResult>> {
        let mut results = Vec::new();

        // PostgreSQL check
        let postgres_result = self.check_postgresql().await;
        results.push(postgres_result);

        // Redis check  
        let redis_result = self.check_redis().await;
        results.push(redis_result);

        // etcd check
        let etcd_result = self.check_etcd().await;
        results.push(etcd_result);

        Ok(results)
    }

    pub async fn check_backend_ai_services(&self) -> Result<Vec<HealthCheckResult>> {
        let mut results = Vec::new();

        // Manager API check
        let manager_result = self.check_manager_api().await;
        results.push(manager_result);

        // Prometheus check
        let prometheus_result = self.check_prometheus().await;
        results.push(prometheus_result);

        // Grafana check
        let grafana_result = self.check_grafana().await;
        results.push(grafana_result);

        Ok(results)
    }

    pub async fn check_gpu_hardware(&self) -> Result<Vec<HealthCheckResult>> {
        self.gpu_monitor.get_gpu_health_checks().await
    }

    fn generate_report(&self, results: Vec<HealthCheckResult>) -> Result<HealthReport> {
        let healthy_count = results.iter().filter(|r| matches!(r.status, HealthStatus::Healthy)).count();
        let unhealthy_count = results.iter().filter(|r| matches!(r.status, HealthStatus::Unhealthy)).count();
        let degraded_count = results.iter().filter(|r| matches!(r.status, HealthStatus::Degraded)).count();
        let unknown_count = results.iter().filter(|r| matches!(r.status, HealthStatus::Unknown)).count();

        let overall_status = if unhealthy_count > 0 {
            HealthStatus::Unhealthy
        } else if degraded_count > 0 {
            HealthStatus::Degraded
        } else if unknown_count > 0 {
            HealthStatus::Unknown
        } else {
            HealthStatus::Healthy
        };

        let summary = format!(
            "Health Check Summary: {} healthy, {} unhealthy, {} degraded, {} unknown out of {} total services",
            healthy_count, unhealthy_count, degraded_count, unknown_count, results.len()
        );

        Ok(HealthReport {
            timestamp: Utc::now(),
            overall_status,
            total_checks: results.len(),
            healthy_count,
            unhealthy_count,
            degraded_count,
            unknown_count,
            checks: results,
            summary,
        })
    }

    pub async fn monitor(&self, interval_secs: u64, max_checks: u32) -> Result<()> {
        let mut check_count = 0;
        
        loop {
            if max_checks > 0 && check_count >= max_checks {
                break;
            }

            let report = self.run_all_checks().await?;
            self.print_summary_report(&report);

            check_count += 1;
            
            if max_checks == 0 || check_count < max_checks {
                info!("Waiting {} seconds for next check...", interval_secs);
                tokio::time::sleep(Duration::from_secs(interval_secs)).await;
            }
        }

        Ok(())
    }

    fn print_table_report(&self, report: &HealthReport) {
        println!("\n{}", "Backend.AI Health Check Report".bold().underline());
        println!("Timestamp: {}", report.timestamp.format("%Y-%m-%d %H:%M:%S UTC"));
        println!("Overall Status: {}", report.overall_status);
        println!();

        let table = Table::new(&report.checks);
        println!("{}", table);
        println!("\n{}", report.summary);
    }

    fn print_json_report(&self, report: &HealthReport) -> Result<()> {
        let json = serde_json::to_string_pretty(report)?;
        println!("{}", json);
        Ok(())
    }

    fn print_summary_report(&self, report: &HealthReport) {
        println!("\n{} - {}", 
            "Backend.AI Health Status".bold(), 
            report.timestamp.format("%H:%M:%S")
        );
        
        for result in &report.checks {
            println!("{}: {} ({}ms)", 
                result.service_name,
                result.status,
                result.response_time_ms
            );
        }
        
        println!("{}", report.summary);
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    env_logger::init();
    let cli = Cli::parse();

    match cli.command {
        Commands::All { format, verbose: _, timeout } => {
            let checker = HealthChecker::new(timeout).await?;
            let report = checker.run_all_checks().await?;

            match format.as_str() {
                "json" => checker.print_json_report(&report)?,
                "summary" => checker.print_summary_report(&report),
                _ => checker.print_table_report(&report),
            }
        }
        Commands::Docker { format } => {
            let checker = HealthChecker::new(30).await?;
            let results = checker.check_docker_containers().await?;
            let report = checker.generate_report(results)?;

            match format.as_str() {
                "json" => checker.print_json_report(&report)?,
                "summary" => checker.print_summary_report(&report),
                _ => checker.print_table_report(&report),
            }
        }
        Commands::Services { format } => {
            let checker = HealthChecker::new(30).await?;
            let results = checker.check_backend_ai_services().await?;
            let report = checker.generate_report(results)?;

            match format.as_str() {
                "json" => checker.print_json_report(&report)?,
                "summary" => checker.print_summary_report(&report),
                _ => checker.print_table_report(&report),
            }
        }
        Commands::Infrastructure { format } => {
            let checker = HealthChecker::new(30).await?;
            let results = checker.check_infrastructure_services().await?;
            let report = checker.generate_report(results)?;

            match format.as_str() {
                "json" => checker.print_json_report(&report)?,
                "summary" => checker.print_summary_report(&report),
                _ => checker.print_table_report(&report),
            }
        }
        Commands::Gpu { format, detailed } => {
            let checker = HealthChecker::new(30).await?;
            let results = checker.check_gpu_hardware().await?;
            let report = checker.generate_report(results)?;

            if detailed {
                // Show detailed GPU information
                let gpu_infos = checker.gpu_monitor.get_detailed_gpu_info().await?;
                println!("GPU Summary: {}\n", checker.gpu_monitor.get_gpu_summary());
                
                for gpu_info in gpu_infos {
                    println!("GPU {}: {}", gpu_info.id, gpu_info.name);
                    println!("  Driver: {}", gpu_info.driver_version);
                    if let Some(cuda) = &gpu_info.cuda_version {
                        println!("  CUDA: {}", cuda);
                    }
                    println!("  Memory: {}/{} MB ({:.1}%)", 
                        gpu_info.memory_used / 1024 / 1024,
                        gpu_info.memory_total / 1024 / 1024,
                        (gpu_info.memory_used as f64 / gpu_info.memory_total as f64) * 100.0
                    );
                    println!("  Utilization: GPU {}%, Memory {}%", 
                        gpu_info.utilization_gpu, gpu_info.utilization_memory);
                    println!("  Temperature: {}°C", gpu_info.temperature);
                    println!("  Power: {:.1}W / {:.1}W", gpu_info.power_usage, gpu_info.power_limit);
                    
                    if !gpu_info.processes.is_empty() {
                        println!("  Processes:");
                        for process in &gpu_info.processes {
                            println!("    PID {}: {} ({}MB)", 
                                process.pid, process.name, process.memory_used / 1024 / 1024);
                        }
                    }
                    println!();
                }
            }

            match format.as_str() {
                "json" => checker.print_json_report(&report)?,
                "summary" => checker.print_summary_report(&report),
                _ => checker.print_table_report(&report),
            }
        }
        Commands::Monitor { interval, max_checks } => {
            let checker = HealthChecker::new(30).await?;
            checker.monitor(interval, max_checks).await?;
        }
    }

    Ok(())
}