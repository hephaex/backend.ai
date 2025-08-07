# Backend.AI KubeVirt GPU Deployment Guide

## 📋 Overview

이 가이드는 KubeVirt를 사용하여 물리적 GPU 서버를 가상머신으로 구성하고, 그 위에 Backend.AI Agent를 배포하여 Backend.AI Manager와 연동하는 방법을 설명합니다.

### 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Kubernetes Cluster                           │
├─────────────────────────────────────────────────────────────────────┤
│  KubeVirt Infrastructure                                            │
│  ├── KubeVirt Operator                                              │
│  ├── Containerized Data Importer (CDI)                             │
│  ├── NVIDIA GPU Operator                                            │
│  └── GPU Device Plugins                                             │
├─────────────────────────────────────────────────────────────────────┤
│  Backend.AI Manager (backend-ai namespace)                         │
│  ├── Manager Pod                                                   │
│  ├── ETCD                                                          │
│  ├── PostgreSQL                                                    │
│  └── Redis                                                         │
├─────────────────────────────────────────────────────────────────────┤
│  GPU Agent VMs (backend-ai-gpu namespace)                          │
│  ├── VM 1: backend-ai-gpu-agent-001                               │
│  │   ├── GPU Passthrough (NVIDIA A10)                             │
│  │   ├── Backend.AI Agent Service                                 │
│  │   ├── Docker + NVIDIA Container Toolkit                       │
│  │   └── Network: Pod + Management                                │
│  ├── VM 2: backend-ai-gpu-agent-002 (scalable)                   │
│  └── VM N: backend-ai-gpu-agent-N                                 │
├─────────────────────────────────────────────────────────────────────┤
│  Physical GPU Nodes                                                │
│  ├── Node 1 (GPU passthrough enabled)                             │
│  ├── Node 2 (GPU passthrough enabled)                             │
│  └── Node N                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## 🔧 Prerequisites

### Hardware Requirements
- **GPU Nodes**: NVIDIA GPU가 장착된 워커 노드
- **IOMMU Support**: Intel VT-d 또는 AMD IOMMU 지원
- **CPU**: 최소 8코어 (VM당 16코어 권장)
- **Memory**: 최소 32GB (VM당 64GB 권장)
- **Storage**: NVMe SSD 권장 (VM 디스크용)

### Software Requirements
- **Kubernetes**: v1.25+ (RBAC 활성화)
- **KubeVirt**: v1.1.1+
- **CDI**: v1.58.1+
- **NVIDIA GPU Operator**: v23.9.1+
- **Helm**: v3.8+
- **Docker**: 최신 버전

### BIOS/UEFI Configuration
```bash
# BIOS에서 활성화 필요
- Intel VT-x / AMD-V (Virtualization)
- Intel VT-d / AMD IOMMU (I/O Virtualization)
- SR-IOV (선택사항, 고성능 네트워킹용)
```

### Kernel Parameters
```bash
# /etc/default/grub에 추가
GRUB_CMDLINE_LINUX="intel_iommu=on vfio-pci.ids=10de:2236"  # NVIDIA A10 예시
# 또는 AMD의 경우
GRUB_CMDLINE_LINUX="amd_iommu=on vfio-pci.ids=10de:2236"

# GRUB 업데이트
sudo update-grub
sudo reboot
```

## 🚀 Quick Start

### 1단계: 노드 준비 및 라벨링

```bash
# GPU 노드에 라벨 추가
kubectl label nodes <gpu-node-1> nvidia.com/gpu.workload.config=vm-passthrough
kubectl label nodes <gpu-node-1> gpu-type=a10
kubectl label nodes <gpu-node-1> node-role.kubernetes.io/worker=""

# GPU 정보 확인
kubectl describe node <gpu-node-1>
```

### 2단계: 전체 배포 (자동)

```bash
# 모든 컴포넌트 배포
./deploy-kubevirt-gpu.sh deploy

# 배포 검증
./deploy-kubevirt-gpu.sh verify

# GPU 접근 테스트
./deploy-kubevirt-gpu.sh test-gpu
```

### 3단계: 배포 상태 확인

```bash
# KubeVirt 상태 확인
kubectl get kubevirt kubevirt -n kubevirt

# GPU VM 상태 확인
kubectl get vms -n backend-ai-gpu
kubectl get vmis -n backend-ai-gpu

# Backend.AI Agent 로그 확인
kubectl logs -f -n backend-ai-gpu deployment/backend-ai-gpu-agent-001-service
```

## 📂 Project Structure

```
backend.ai/
├── KUBEVIRT_GPU_GUIDE.md                   # 이 문서
├── kubevirt-gpu-setup.yaml                 # KubeVirt GPU 설정
├── backend-ai-gpu-vm.yaml                  # GPU VM 정의
├── kubevirt-network-config.yaml            # 네트워크 설정
├── deploy-kubevirt-gpu.sh                  # 자동 배포 스크립트
└── backend-ai-gpu-agent-helm/              # Helm 차트
    ├── Chart.yaml
    ├── values.yaml
    └── templates/
        ├── virtualmachine.yaml
        ├── service.yaml
        ├── configmap.yaml
        └── ...
```

## 🔨 Manual Deployment Steps

자동 배포 스크립트를 사용하지 않고 수동으로 배포하는 경우:

### 1. KubeVirt 설치

```bash
# KubeVirt Operator 설치
kubectl apply -f https://github.com/kubevirt/kubevirt/releases/download/v1.1.1/kubevirt-operator.yaml

# KubeVirt CR 설치
kubectl apply -f https://github.com/kubevirt/kubevirt/releases/download/v1.1.1/kubevirt-cr.yaml

# GPU 설정 적용
kubectl apply -f kubevirt-gpu-setup.yaml

# 설치 확인
kubectl wait --for=condition=Available kubevirt kubevirt -n kubevirt --timeout=600s
```

### 2. CDI 설치

```bash
# CDI Operator 설치
kubectl apply -f https://github.com/kubevirt/containerized-data-importer/releases/download/v1.58.1/cdi-operator.yaml

# CDI CR 설치
kubectl apply -f https://github.com/kubevirt/containerized-data-importer/releases/download/v1.58.1/cdi-cr.yaml

# 설치 확인
kubectl wait --for=condition=Available cdi cdi -n cdi --timeout=300s
```

### 3. NVIDIA GPU Operator 설치

```bash
# NVIDIA Helm Repository 추가
helm repo add nvidia https://helm.ngc.nvidia.com/nvidia
helm repo update

# GPU Operator 설치
kubectl create namespace gpu-operator
helm install gpu-operator nvidia/gpu-operator \
  --namespace gpu-operator \
  --set sandboxWorkloads.enabled=true \
  --set toolkit.enabled=true \
  --set driver.enabled=true \
  --set migManager.enabled=false
```

### 4. 네트워킹 설정

```bash
# Multus CNI 설치
kubectl apply -f https://raw.githubusercontent.com/k8snetworkplumbingwg/multus-cni/master/deployments/multus-daemonset.yml

# 네트워크 설정 적용
kubectl apply -f kubevirt-network-config.yaml
```

### 5. GPU Base Image 빌드

```bash
# Harbor 로그인
docker login localhost:30002 -u admin -p Harbor12345

# GPU Base Image 빌드 및 푸시
docker build -f Dockerfile.ubuntu-gpu -t localhost:30002/backend-ai/ubuntu-gpu:22.04 .
docker push localhost:30002/backend-ai/ubuntu-gpu:22.04
```

### 6. Backend.AI GPU Agent VM 배포

```bash
# 네임스페이스 생성
kubectl create namespace backend-ai-gpu

# Registry Secret 생성
kubectl create secret docker-registry harbor-registry-secret \
    --docker-server=localhost:30002 \
    --docker-username=admin \
    --docker-password=Harbor12345 \
    -n backend-ai-gpu

# Helm으로 GPU Agent 배포
helm install backend-ai-gpu-agents ./backend-ai-gpu-agent-helm \
    --namespace backend-ai-gpu \
    --set vm.replicas=2 \
    --set vm.resources.gpu.enabled=true
```

## 🎯 Management Commands

### VM 관리

```bash
# VM 상태 확인
kubectl get vms -n backend-ai-gpu
kubectl get vmis -n backend-ai-gpu

# VM 시작/중지
kubectl patch vm backend-ai-gpu-agent-001 -n backend-ai-gpu --type merge -p '{"spec":{"running":true}}'
kubectl patch vm backend-ai-gpu-agent-001 -n backend-ai-gpu --type merge -p '{"spec":{"running":false}}'

# VM 콘솔 접근 (virtctl 필요)
virtctl console -n backend-ai-gpu backend-ai-gpu-agent-001

# VM SSH 접근 (VM 내부에서 SSH 설정 후)
kubectl port-forward -n backend-ai-gpu svc/backend-ai-gpu-agent-001-service 2222:22
ssh backend-ai@localhost -p 2222
```

### Scaling

```bash
# VM 개수 조정
helm upgrade backend-ai-gpu-agents ./backend-ai-gpu-agent-helm \
    --namespace backend-ai-gpu \
    --set vm.replicas=5

# 특정 GPU 타입으로 배포
helm upgrade backend-ai-gpu-agents ./backend-ai-gpu-agent-helm \
    --namespace backend-ai-gpu \
    --set vm.nodeSelector."gpu-type"="v100" \
    --set vm.resources.gpu.devices[0].deviceName="nvidia.com/GV100GL_Tesla_V100"
```

### 모니터링

```bash
# VM 리소스 사용량
kubectl top pods -n backend-ai-gpu

# GPU 사용률 확인
kubectl exec -n backend-ai-gpu virt-launcher-backend-ai-gpu-agent-001 -- nvidia-smi

# VM 이벤트 확인
kubectl get events -n backend-ai-gpu --sort-by=.metadata.creationTimestamp

# Backend.AI Agent 로그
kubectl logs -f -n backend-ai-gpu <virt-launcher-pod-name> -c compute
```

## 🔍 Troubleshooting

### Common Issues

#### 1. VM이 시작되지 않음

```bash
# VM 이벤트 확인
kubectl describe vm backend-ai-gpu-agent-001 -n backend-ai-gpu

# VMI 상태 확인
kubectl describe vmi backend-ai-gpu-agent-001 -n backend-ai-gpu

# 가능한 원인:
# - GPU 노드에 충분한 리소스가 없음
# - GPU 디바이스가 이미 사용 중
# - 이미지 풀 실패
```

#### 2. GPU Passthrough 실패

```bash
# GPU 노드 상태 확인
kubectl describe node <gpu-node-name>

# VFIO-PCI 드라이버 확인
lspci -nnk -d 10de:

# IOMMU 그룹 확인
find /sys/kernel/iommu_groups/ -type l | grep <gpu-pci-id>

# 해결 방법:
# - BIOS에서 IOMMU 활성화 확인
# - Kernel 파라미터 확인
# - GPU 드라이버 바인딩 확인
```

#### 3. 네트워크 연결 문제

```bash
# 네트워크 설정 확인
kubectl get networkattachmentdefinition -n backend-ai-gpu

# Pod 네트워크 인터페이스 확인
kubectl exec -n backend-ai-gpu <virt-launcher-pod> -- ip addr show

# Manager-Agent 연결 테스트
kubectl exec -n backend-ai-gpu <virt-launcher-pod> -- ping backend-ai-etcd.backend-ai.svc.cluster.local
```

#### 4. Backend.AI Agent 연결 실패

```bash
# Agent 설정 확인
kubectl exec -n backend-ai-gpu <virt-launcher-pod> -- cat /etc/backend.ai/agent.toml

# ETCD 연결 테스트
kubectl exec -n backend-ai-gpu <virt-launcher-pod> -- curl -v http://backend-ai-etcd.backend-ai.svc.cluster.local:2379/health

# Agent 서비스 상태
kubectl exec -n backend-ai-gpu <virt-launcher-pod> -- systemctl status backend-ai-agent
```

### Log Collection

```bash
# 모든 KubeVirt 로그 수집
kubectl logs -n kubevirt -l kubevirt.io=virt-operator > kubevirt-operator.log

# GPU VM 로그 수집
kubectl logs -n backend-ai-gpu <virt-launcher-pod-name> > gpu-vm.log

# GPU Operator 로그 수집
kubectl logs -n gpu-operator -l app=nvidia-operator-validator > gpu-operator.log
```

## 🛡️ Security Considerations

### GPU Resource Isolation
- VFIO-PCI 드라이버를 통한 하드웨어 격리
- IOMMU를 통한 메모리 보호
- VM간 GPU 리소스 완전 분리

### Network Security
- VM별 별도 네트워크 네임스페이스
- Network Policy를 통한 트래픽 제어
- 관리 네트워크와 데이터 네트워크 분리

### Access Control
- RBAC를 통한 세밀한 권한 제어
- VM 콘솔 접근 제한
- SSH Key 기반 인증

## 📊 Performance Optimization

### CPU 최적화
```yaml
# CPU Pinning 설정
cpu:
  dedicatedCpuPlacement: true
  numa:
    guestMappingPassthrough: {}
```

### Memory 최적화
```yaml
# Huge Pages 사용
memory:
  guest: 64Gi
  hugepages:
    pageSize: 2Mi
```

### Storage 최적화
```yaml
# NVMe SSD 사용
storageClassName: fast-nvme-ssd
```

### Network 최적화
```yaml
# SR-IOV 사용 (고성능 워크로드용)
networks:
- name: sriov-net
  multus:
    networkName: backend-ai-gpu-sriov-net
```

## 🔄 Backup and Recovery

### VM 스냅샷
```bash
# VM 스냅샷 생성
kubectl apply -f - <<EOF
apiVersion: snapshot.kubevirt.io/v1alpha1
kind: VirtualMachineSnapshot
metadata:
  name: gpu-agent-snapshot
  namespace: backend-ai-gpu
spec:
  source:
    apiVersion: kubevirt.io/v1
    kind: VirtualMachine
    name: backend-ai-gpu-agent-001
EOF

# 스냅샷에서 복원
kubectl apply -f - <<EOF
apiVersion: snapshot.kubevirt.io/v1alpha1
kind: VirtualMachineRestore
metadata:
  name: gpu-agent-restore
  namespace: backend-ai-gpu
spec:
  target:
    apiVersion: kubevirt.io/v1
    kind: VirtualMachine
    name: backend-ai-gpu-agent-001-restored
  virtualMachineSnapshotName: gpu-agent-snapshot
EOF
```

### 설정 백업
```bash
# VM 정의 백업
kubectl get vm -n backend-ai-gpu -o yaml > gpu-vms-backup.yaml

# 네트워크 설정 백업
kubectl get networkattachmentdefinition -n backend-ai-gpu -o yaml > network-backup.yaml

# Helm 값 백업
helm get values backend-ai-gpu-agents -n backend-ai-gpu > gpu-agent-values.yaml
```

## 🚫 Cleanup

### VM 제거
```bash
# Helm으로 GPU Agent 제거
helm uninstall backend-ai-gpu-agents -n backend-ai-gpu

# 네임스페이스 제거
kubectl delete namespace backend-ai-gpu
```

### 완전 정리
```bash
# 전체 정리 스크립트 실행
./deploy-kubevirt-gpu.sh cleanup

# 수동 정리
kubectl delete namespace backend-ai-gpu
kubectl delete namespace gpu-operator
# KubeVirt와 CDI는 다른 워크로드가 사용할 수 있으므로 신중하게 제거
```

## 📚 Additional Resources

### Documentation
- [KubeVirt User Guide](https://kubevirt.io/user-guide/)
- [NVIDIA GPU Operator](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/overview.html)
- [Backend.AI Documentation](https://docs.backend.ai/)

### Tools
- [virtctl CLI](https://kubevirt.io/user-guide/operations/virtctl_client_tool/) - VM 관리 도구
- [CDI CLI](https://github.com/kubevirt/containerized-data-importer) - 데이터 볼륨 관리

### Examples
- GPU VM 템플릿: `backend-ai-gpu-vm.yaml`
- Helm 차트: `backend-ai-gpu-agent-helm/`
- 네트워크 설정: `kubevirt-network-config.yaml`

---

## 💡 Best Practices

### Development Environment
- 단일 GPU 노드로 시작하여 점진적 확장
- 리소스 제한을 통한 멀티테넌시 구현
- 개발/테스트용 작은 VM 사이즈 사용

### Production Environment
- 고가용성을 위한 다중 GPU 노드
- 자동 스케일링 정책 구성
- 모니터링 및 알람 시스템 구축
- 정기적인 백업 스케줄

### Cost Optimization
- GPU 사용률 모니터링을 통한 적정 VM 크기 조정
- Spot Instance 활용 (클라우드 환경)
- 유휴 시간 VM 자동 종료

---

## ❓ Support

문제가 발생하거나 질문이 있으시면:

1. **로그 수집**: 위의 "Log Collection" 섹션 참고
2. **GitHub Issues**: KubeVirt, Backend.AI 프로젝트에 이슈 등록
3. **커뮤니티**: 
   - KubeVirt Slack: kubernetes.slack.com #kubevirt
   - Backend.AI 커뮤니티 포럼

**Happy GPU Virtualization! 🎮🚀**