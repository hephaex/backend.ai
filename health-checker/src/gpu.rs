use anyhow::{anyhow, Result};
use chrono::Utc;
use log::{error, info};
use serde::{Deserialize, Serialize};
use std::time::Instant;

use crate::{HealthCheckResult, HealthStatus};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuInfo {
    pub id: u32,
    pub name: String,
    pub uuid: Option<String>,
    pub driver_version: String,
    pub cuda_version: Option<String>,
    pub memory_total: u64,
    pub memory_used: u64,
    pub memory_free: u64,
    pub utilization_gpu: u32,
    pub utilization_memory: u32,
    pub temperature: u32,
    pub power_usage: f32,
    pub power_limit: f32,
    pub fan_speed: Option<u32>,
    pub processes: Vec<GpuProcess>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuProcess {
    pub pid: u32,
    pub name: String,
    pub memory_used: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppleGpuInfo {
    pub name: String,
    pub utilization: f32,
    pub memory_pressure: f32,
    pub temp_gpu: f32,
    pub temp_tgpu: f32,
    pub power_usage: f32,
}

pub struct GpuMonitor {
    nvidia_available: bool,
    apple_silicon_available: bool,
}

impl GpuMonitor {
    pub fn new() -> Self {
        let nvidia_available = Self::check_nvidia_availability();
        let apple_silicon_available = Self::check_apple_silicon_availability();
        
        info!("GPU Monitor initialized - NVIDIA: {}, Apple Silicon: {}", 
              nvidia_available, apple_silicon_available);
        
        Self {
            nvidia_available,
            apple_silicon_available,
        }
    }

    pub async fn get_gpu_health_checks(&self) -> Result<Vec<HealthCheckResult>> {
        let mut results = Vec::new();

        if self.nvidia_available {
            match self.check_nvidia_gpus().await {
                Ok(mut nvidia_results) => results.append(&mut nvidia_results),
                Err(e) => {
                    error!("NVIDIA GPU check failed: {}", e);
                    results.push(HealthCheckResult {
                        service_name: "NVIDIA GPU".to_string(),
                        status: HealthStatus::Unhealthy,
                        response_time_ms: 0,
                        details: format!("NVIDIA check failed: {}", e),
                        timestamp: Utc::now(),
                        error_message: Some(e.to_string()),
                    });
                }
            }
        }

        if self.apple_silicon_available {
            match self.check_apple_silicon_gpu().await {
                Ok(apple_result) => results.push(apple_result),
                Err(e) => {
                    error!("Apple Silicon GPU check failed: {}", e);
                    results.push(HealthCheckResult {
                        service_name: "Apple Silicon GPU".to_string(),
                        status: HealthStatus::Unhealthy,
                        response_time_ms: 0,
                        details: format!("Apple GPU check failed: {}", e),
                        timestamp: Utc::now(),
                        error_message: Some(e.to_string()),
                    });
                }
            }
        }

        if results.is_empty() {
            results.push(HealthCheckResult {
                service_name: "GPU Hardware".to_string(),
                status: HealthStatus::Unknown,
                response_time_ms: 0,
                details: "No supported GPU hardware detected".to_string(),
                timestamp: Utc::now(),
                error_message: None,
            });
        }

        Ok(results)
    }

    async fn check_nvidia_gpus(&self) -> Result<Vec<HealthCheckResult>> {
        let start_time = Instant::now();
        let mut results = Vec::new();

        #[cfg(feature = "nvidia")]
        {
            use nvml_wrapper::Nvml;

            let nvml = Nvml::init()?;
            let device_count = nvml.device_count()?;

            for i in 0..device_count {
                let device = nvml.device_by_index(i)?;
                let gpu_info = self.collect_nvidia_gpu_info(&device).await?;
                
                let (status, details) = self.evaluate_nvidia_gpu_health(&gpu_info);
                
                results.push(HealthCheckResult {
                    service_name: format!("NVIDIA GPU {}", i),
                    status,
                    response_time_ms: start_time.elapsed().as_millis() as u64,
                    details,
                    timestamp: Utc::now(),
                    error_message: None,
                });
            }
        }

        #[cfg(not(feature = "nvidia"))]
        {
            // Fallback implementation using nvidia-smi command
            results.append(&mut self.check_nvidia_via_command().await?);
        }

        Ok(results)
    }

    #[cfg(feature = "nvidia")]
    async fn collect_nvidia_gpu_info(&self, device: &nvml_wrapper::Device) -> Result<GpuInfo> {
        use nvml_wrapper::enum_wrappers::device::MemoryInfo;

        let name = device.name()?;
        let uuid = device.uuid().ok();
        let memory_info = device.memory_info()?;
        let utilization = device.utilization_rates()?;
        let temperature = device.temperature(nvml_wrapper::enum_wrappers::device::TemperatureSensor::Gpu)?;
        let power_usage = device.power_usage()? as f32 / 1000.0; // Convert mW to W
        let power_limit = device.enforced_power_limit()? as f32 / 1000.0;
        
        let processes = match device.running_compute_processes() {
            Ok(proc_info) => {
                proc_info.into_iter().map(|p| GpuProcess {
                    pid: p.pid,
                    name: format!("Process {}", p.pid), // Would need additional lookup for name
                    memory_used: p.used_gpu_memory,
                }).collect()
            }
            Err(_) => Vec::new(),
        };

        Ok(GpuInfo {
            id: device.index()?,
            name,
            uuid: uuid.map(|u| u.to_string()),
            driver_version: device.driver_version().unwrap_or_default(),
            cuda_version: device.cuda_driver_version().ok().map(|v| format!("{}.{}", v.major, v.minor)),
            memory_total: memory_info.total,
            memory_used: memory_info.used,
            memory_free: memory_info.free,
            utilization_gpu: utilization.gpu,
            utilization_memory: utilization.memory,
            temperature,
            power_usage,
            power_limit,
            fan_speed: device.fan_speed(0).ok(),
            processes,
        })
    }

    async fn check_nvidia_via_command(&self) -> Result<Vec<HealthCheckResult>> {
        use std::process::Command;

        let output = Command::new("nvidia-smi")
            .args(&["--query-gpu=index,name,utilization.gpu,utilization.memory,memory.total,memory.used,temperature.gpu,power.draw,power.limit", "--format=csv,noheader,nounits"])
            .output();

        match output {
            Ok(result) if result.status.success() => {
                let output_str = String::from_utf8_lossy(&result.stdout);
                let mut health_results = Vec::new();

                for (_line_idx, line) in output_str.lines().enumerate() {
                    if line.trim().is_empty() {
                        continue;
                    }

                    let fields: Vec<&str> = line.split(',').map(|s| s.trim()).collect();
                    if fields.len() >= 9 {
                        let gpu_util: u32 = fields[2].parse().unwrap_or(0);
                        let mem_util: u32 = fields[3].parse().unwrap_or(0);
                        let temp: u32 = fields[6].parse().unwrap_or(0);
                        let power_draw: f32 = fields[7].parse().unwrap_or(0.0);
                        
                        let (status, details) = self.evaluate_gpu_metrics(gpu_util, mem_util, temp, power_draw);
                        
                        health_results.push(HealthCheckResult {
                            service_name: format!("NVIDIA GPU {} ({})", fields[0], fields[1]),
                            status,
                            response_time_ms: 0,
                            details,
                            timestamp: Utc::now(),
                            error_message: None,
                        });
                    }
                }

                Ok(health_results)
            }
            Ok(result) => {
                let error_msg = String::from_utf8_lossy(&result.stderr);
                Err(anyhow!("nvidia-smi failed: {}", error_msg))
            }
            Err(e) => Err(anyhow!("Failed to execute nvidia-smi: {}", e)),
        }
    }

    async fn check_apple_silicon_gpu(&self) -> Result<HealthCheckResult> {
        let start_time = Instant::now();

        #[cfg(target_os = "macos")]
        {
            match self.get_apple_gpu_metrics().await {
                Ok(gpu_info) => {
                    let (status, details) = self.evaluate_apple_gpu_health(&gpu_info);
                    
                    Ok(HealthCheckResult {
                        service_name: "Apple Silicon GPU".to_string(),
                        status,
                        response_time_ms: start_time.elapsed().as_millis() as u64,
                        details,
                        timestamp: Utc::now(),
                        error_message: None,
                    })
                }
                Err(e) => {
                    error!("Apple Silicon GPU metrics failed: {}", e);
                    Ok(HealthCheckResult {
                        service_name: "Apple Silicon GPU".to_string(),
                        status: HealthStatus::Unhealthy,
                        response_time_ms: start_time.elapsed().as_millis() as u64,
                        details: format!("Metrics collection failed: {}", e),
                        timestamp: Utc::now(),
                        error_message: Some(e.to_string()),
                    })
                }
            }
        }

        #[cfg(not(target_os = "macos"))]
        {
            Ok(HealthCheckResult {
                service_name: "Apple Silicon GPU".to_string(),
                status: HealthStatus::Unknown,
                response_time_ms: 0,
                details: "Not running on macOS".to_string(),
                timestamp: Utc::now(),
                error_message: None,
            })
        }
    }

    #[cfg(target_os = "macos")]
    async fn get_apple_gpu_metrics(&self) -> Result<AppleGpuInfo> {
        use std::process::Command;

        // Use powermetrics to get GPU information
        let output = Command::new("powermetrics")
            .args(&["-n", "1", "-s", "gpu_power", "--format", "plist"])
            .output()?;

        if !output.status.success() {
            return Err(anyhow!("powermetrics command failed"));
        }

        // This is a simplified implementation - real implementation would parse plist
        // For now, return mock data structure
        Ok(AppleGpuInfo {
            name: "Apple Silicon GPU".to_string(),
            utilization: 0.0, // Would parse from powermetrics output
            memory_pressure: 0.0,
            temp_gpu: 0.0,
            temp_tgpu: 0.0,
            power_usage: 0.0,
        })
    }

    fn evaluate_nvidia_gpu_health(&self, gpu_info: &GpuInfo) -> (HealthStatus, String) {
        let mut issues = Vec::new();
        let mut status = HealthStatus::Healthy;

        // Temperature check
        if gpu_info.temperature > 85 {
            issues.push(format!("High temperature: {}°C", gpu_info.temperature));
            status = HealthStatus::Degraded;
        } else if gpu_info.temperature > 95 {
            issues.push(format!("Critical temperature: {}°C", gpu_info.temperature));
            status = HealthStatus::Unhealthy;
        }

        // Memory usage check
        let memory_usage_percent = (gpu_info.memory_used as f64 / gpu_info.memory_total as f64) * 100.0;
        if memory_usage_percent > 90.0 {
            issues.push(format!("High memory usage: {:.1}%", memory_usage_percent));
            if status == HealthStatus::Healthy {
                status = HealthStatus::Degraded;
            }
        }

        // Power usage check
        let power_usage_percent = (gpu_info.power_usage / gpu_info.power_limit) * 100.0;
        if power_usage_percent > 95.0 {
            issues.push(format!("High power usage: {:.1}W ({:.1}%)", gpu_info.power_usage, power_usage_percent));
            if status == HealthStatus::Healthy {
                status = HealthStatus::Degraded;
            }
        }

        let details = if issues.is_empty() {
            format!(
                "{} - GPU: {}%, Mem: {:.1}% ({}/{}MB), Temp: {}°C, Power: {:.1}W",
                gpu_info.name,
                gpu_info.utilization_gpu,
                memory_usage_percent,
                gpu_info.memory_used / 1024 / 1024,
                gpu_info.memory_total / 1024 / 1024,
                gpu_info.temperature,
                gpu_info.power_usage
            )
        } else {
            format!("{} - Issues: {}", gpu_info.name, issues.join(", "))
        };

        (status, details)
    }

    fn evaluate_apple_gpu_health(&self, gpu_info: &AppleGpuInfo) -> (HealthStatus, String) {
        let mut status = HealthStatus::Healthy;
        let mut issues = Vec::new();

        if gpu_info.temp_gpu > 80.0 {
            issues.push(format!("High GPU temperature: {:.1}°C", gpu_info.temp_gpu));
            status = HealthStatus::Degraded;
        }

        if gpu_info.memory_pressure > 0.8 {
            issues.push(format!("High memory pressure: {:.1}%", gpu_info.memory_pressure * 100.0));
            if status == HealthStatus::Healthy {
                status = HealthStatus::Degraded;
            }
        }

        let details = if issues.is_empty() {
            format!(
                "{} - Utilization: {:.1}%, Memory Pressure: {:.1}%, Temp: {:.1}°C, Power: {:.1}W",
                gpu_info.name,
                gpu_info.utilization,
                gpu_info.memory_pressure * 100.0,
                gpu_info.temp_gpu,
                gpu_info.power_usage
            )
        } else {
            format!("{} - Issues: {}", gpu_info.name, issues.join(", "))
        };

        (status, details)
    }

    fn evaluate_gpu_metrics(&self, gpu_util: u32, mem_util: u32, temp: u32, power_draw: f32) -> (HealthStatus, String) {
        let mut status = HealthStatus::Healthy;
        let mut issues = Vec::new();

        if temp > 85 {
            issues.push(format!("High temperature: {}°C", temp));
            status = HealthStatus::Degraded;
        }

        if mem_util > 90 {
            issues.push(format!("High memory utilization: {}%", mem_util));
            if status == HealthStatus::Healthy {
                status = HealthStatus::Degraded;
            }
        }

        let details = if issues.is_empty() {
            format!("GPU: {}%, Memory: {}%, Temp: {}°C, Power: {:.1}W", gpu_util, mem_util, temp, power_draw)
        } else {
            format!("GPU: {}%, Memory: {}%, Temp: {}°C, Power: {:.1}W - Issues: {}", 
                   gpu_util, mem_util, temp, power_draw, issues.join(", "))
        };

        (status, details)
    }

    fn check_nvidia_availability() -> bool {
        use std::process::Command;

        match Command::new("nvidia-smi").arg("--version").output() {
            Ok(output) => output.status.success(),
            Err(_) => false,
        }
    }

    fn check_apple_silicon_availability() -> bool {
        #[cfg(target_os = "macos")]
        {
            use std::process::Command;
            
            // Check if we're on Apple Silicon by looking for Metal support
            match Command::new("system_profiler").args(&["SPDisplaysDataType"]).output() {
                Ok(output) => {
                    let output_str = String::from_utf8_lossy(&output.stdout);
                    output_str.contains("Apple") && (output_str.contains("M1") || output_str.contains("M2") || output_str.contains("M3") || output_str.contains("M4"))
                }
                Err(_) => false,
            }
        }

        #[cfg(not(target_os = "macos"))]
        {
            false
        }
    }

    pub async fn get_detailed_gpu_info(&self) -> Result<Vec<GpuInfo>> {
        let gpu_infos = Vec::new();

        if self.nvidia_available {
            #[cfg(feature = "nvidia")]
            {
                use nvml_wrapper::Nvml;
                
                let nvml = Nvml::init()?;
                let device_count = nvml.device_count()?;

                for i in 0..device_count {
                    let device = nvml.device_by_index(i)?;
                    let gpu_info = self.collect_nvidia_gpu_info(&device).await?;
                    gpu_infos.push(gpu_info);
                }
            }
        }

        Ok(gpu_infos)
    }

    pub fn get_gpu_summary(&self) -> String {
        if self.nvidia_available && self.apple_silicon_available {
            "NVIDIA and Apple Silicon GPUs available".to_string()
        } else if self.nvidia_available {
            "NVIDIA GPUs available".to_string()
        } else if self.apple_silicon_available {
            "Apple Silicon GPU available".to_string()
        } else {
            "No supported GPU hardware detected".to_string()
        }
    }
}