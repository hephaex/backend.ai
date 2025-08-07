# Backend.AI Kubernetes 배포 가이드

## 📋 개요

이 문서는 Harbor2 Docker Registry와 함께 쿠버네티스에 Backend.AI 플랫폼을 배포하고 관리하는 완전한 가이드입니다.

## 🏗️ 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                       │
├─────────────────────────────────────────────────────────────┤
│  Harbor2 Registry (harbor-system namespace)                │
│  ├── Registry Service (NodePort 30002)                     │
│  ├── Harbor Web UI                                         │
│  └── Image Storage & Management                            │
├─────────────────────────────────────────────────────────────┤
│  Backend.AI Services (backend-ai namespace)                │
│  ├── Manager (API & Job Orchestration)                     │
│  ├── Agent (Container Execution)                           │
│  ├── Storage Proxy (File Management)                       │
│  ├── App Proxy Coordinator & Worker (Application Proxy)    │
│  └── Web Server (Frontend UI)                              │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure Services                                   │
│  ├── PostgreSQL (Manager Database)                         │
│  ├── Redis (Cache & Message Queue)                         │
│  └── ETCD (Distributed Configuration)                      │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 사전 요구사항

### 필수 도구
- **Kubernetes 클러스터**: minikube, kind, k3s, OrbStack 또는 프로덕션 클러스터
- **Helm 3.x**: 패키지 관리
- **kubectl**: 클러스터 관리
- **Docker**: 컨테이너 이미지 빌드 및 관리

### 시스템 요구사항
- **CPU**: 최소 4코어 (권장 8코어 이상)
- **메모리**: 최소 8GB RAM (권장 16GB 이상)
- **스토리지**: 최소 50GB 여유 공간
- **네트워크**: 인터넷 연결 (이미지 다운로드용)

## 🚀 빠른 시작

### 1단계: 자동 배포 (권장)

```bash
# 전체 플랫폼 배포 (Harbor2 + Backend.AI)
./manage-backend-ai.sh deploy

# 배포 상태 확인
./manage-backend-ai.sh status

# 로그 확인
./manage-backend-ai.sh logs
```

### 2단계: 웹 UI 접속

```bash
# Harbor Registry 웹 UI
echo "Harbor Web UI: http://localhost:30002"
echo "Username: admin"
echo "Password: Harbor12345"

# Backend.AI 웹 UI (배포 완료 후)
./manage-backend-ai.sh url
```

## 📂 프로젝트 구조

```
backend.ai/
├── README-k8s.md                          # 이 문서
├── KUBERNETES_DEPLOYMENT_GUIDE.md         # 상세 배포 가이드 (영문)
├── KUBERNETES_DEPLOYMENT_GUIDE.kr         # 상세 배포 가이드 (한글)
├── deploy-backend-ai.sh                   # 자동 배포 스크립트
├── stop-backend-ai.sh                     # 자동 정리 스크립트  
├── manage-backend-ai.sh                   # 통합 관리 스크립트
├── harbor-values.yaml                     # Harbor 설정
├── Dockerfile.*                           # 각 서비스별 컨테이너 이미지
└── *-helm/                               # 각 서비스별 Helm 차트
    ├── backend-ai-manager-helm/
    ├── backend-ai-agent-helm/
    ├── backend-ai-storage-proxy-helm/
    ├── backend-ai-app-proxy-helm/
    └── backend-ai-web-server-helm/
```

## 🎯 관리 명령어

### 배포 관리

```bash
# 전체 배포
./manage-backend-ai.sh deploy

# Harbor만 배포
./manage-backend-ai.sh deploy-harbor

# Backend.AI만 배포 (Harbor가 이미 실행 중일 때)
./manage-backend-ai.sh deploy-backend-ai

# 전체 중지
./manage-backend-ai.sh stop

# 전체 정리 (데이터 삭제 포함)
./manage-backend-ai.sh cleanup
```

### 모니터링

```bash
# 전체 상태 확인
./manage-backend-ai.sh status

# 상세 상태 확인
./manage-backend-ai.sh status-detailed

# 실시간 로그 보기
./manage-backend-ai.sh logs

# 특정 서비스 로그
kubectl logs -f -n backend-ai deployment/backend-ai-manager
```

### 접속 정보

```bash
# 모든 서비스 URL 표시
./manage-backend-ai.sh url

# Harbor Registry 정보
./manage-backend-ai.sh harbor-info

# Backend.AI API 엔드포인트
./manage-backend-ai.sh endpoints
```

## 🔨 수동 배포 과정

자동 스크립트 대신 수동으로 배포하려는 경우:

### 1. 클러스터 준비

```bash
# 클러스터 연결 확인
kubectl cluster-info

# 네임스페이스 생성
kubectl create namespace harbor-system
kubectl create namespace backend-ai
```

### 2. Harbor2 Registry 배포

```bash
# Harbor Helm repository 추가
helm repo add harbor https://helm.goharbor.io
helm repo update

# Harbor 배포
helm install harbor harbor/harbor \
  -n harbor-system \
  -f harbor-values.yaml

# Harbor 준비 대기
kubectl wait --for=condition=ready pod \
  -l app=harbor,component=core \
  -n harbor-system --timeout=600s
```

### 3. Docker 이미지 빌드 및 푸시

```bash
# Harbor에 로그인
docker login localhost:30002 -u admin -p Harbor12345

# 이미지 빌드
docker build -f Dockerfile.manager -t localhost:30002/backend-ai/manager:25.06 .
docker build -f Dockerfile.agent -t localhost:30002/backend-ai/agent:25.06 .
docker build -f Dockerfile.storage-proxy -t localhost:30002/backend-ai/storage-proxy:25.06 .
docker build -f Dockerfile.app-proxy-coordinator -t localhost:30002/backend-ai/app-proxy-coordinator:25.06 .
docker build -f Dockerfile.app-proxy-worker -t localhost:30002/backend-ai/app-proxy-worker:25.06 .
docker build -f Dockerfile.web-server -t localhost:30002/backend-ai/web-server:25.06 .

# 이미지 푸시
docker push localhost:30002/backend-ai/manager:25.06
docker push localhost:30002/backend-ai/agent:25.06
docker push localhost:30002/backend-ai/storage-proxy:25.06
docker push localhost:30002/backend-ai/app-proxy-coordinator:25.06
docker push localhost:30002/backend-ai/app-proxy-worker:25.06
docker push localhost:30002/backend-ai/web-server:25.06
```

### 4. Backend.AI 서비스 배포

```bash
# 배포 순서 (의존성 순)
helm install backend-ai-manager ./backend-ai-manager-helm -n backend-ai
helm install backend-ai-agent ./backend-ai-agent-helm -n backend-ai
helm install backend-ai-storage-proxy ./backend-ai-storage-proxy-helm -n backend-ai
helm install backend-ai-app-proxy ./backend-ai-app-proxy-helm -n backend-ai
helm install backend-ai-web-server ./backend-ai-web-server-helm -n backend-ai
```

## 🔍 트러블슈팅

### 일반적인 문제

#### 1. 클러스터 연결 실패
```bash
# 클러스터 상태 확인
kubectl cluster-info

# 컨텍스트 확인
kubectl config get-contexts

# 올바른 컨텍스트로 전환
kubectl config use-context <your-context>
```

#### 2. Harbor 접속 불가
```bash
# Harbor 서비스 상태 확인
kubectl get svc -n harbor-system

# Harbor 포드 상태 확인
kubectl get pods -n harbor-system

# Harbor 로그 확인
kubectl logs -n harbor-system deployment/harbor-core
```

#### 3. 이미지 풀 실패
```bash
# Registry secret 확인
kubectl get secrets -n backend-ai

# Docker login 다시 시도
docker login localhost:30002 -u admin -p Harbor12345

# Secret 재생성
kubectl delete secret harbor-registry-secret -n backend-ai
kubectl create secret docker-registry harbor-registry-secret \
  --docker-server=localhost:30002 \
  --docker-username=admin \
  --docker-password=Harbor12345 \
  -n backend-ai
```

#### 4. 서비스 시작 실패
```bash
# 포드 상태 확인
kubectl get pods -n backend-ai

# 포드 로그 확인
kubectl logs -n backend-ai <pod-name>

# 포드 세부 정보 확인
kubectl describe pod -n backend-ai <pod-name>
```

### 로그 수집

```bash
# 전체 로그 수집
./manage-backend-ai.sh collect-logs

# 특정 서비스 로그
kubectl logs -n backend-ai deployment/backend-ai-manager --previous
kubectl logs -n harbor-system deployment/harbor-core --previous
```

## 🛡️ 보안 고려사항

### Harbor Registry 보안
- 기본 admin 비밀번호 변경
- HTTPS 설정 (프로덕션 환경)
- RBAC 및 프로젝트별 권한 관리
- 이미지 스캔 및 취약점 관리

### Backend.AI 보안
- JWT 토큰 보안 설정
- 네트워크 정책 구성
- 시크릿 관리 (비밀번호, API 키 등)
- TLS/SSL 인증서 설정

### Kubernetes 보안
- RBAC 권한 최소화
- Network Policy 적용
- Pod Security Standards 설정
- 정기적인 보안 업데이트

## 📊 모니터링 및 관리

### 리소스 모니터링

```bash
# 클러스터 리소스 사용량
kubectl top nodes
kubectl top pods -n backend-ai
kubectl top pods -n harbor-system

# 영구 볼륨 사용량
kubectl get pv
kubectl get pvc -n backend-ai
kubectl get pvc -n harbor-system
```

### 백업 및 복원

```bash
# Harbor 데이터 백업
kubectl exec -n harbor-system deployment/harbor-database -- pg_dump -U postgres harbor > harbor-backup.sql

# Backend.AI 설정 백업
kubectl get configmap -n backend-ai -o yaml > backend-ai-config-backup.yaml
kubectl get secret -n backend-ai -o yaml > backend-ai-secrets-backup.yaml
```

## 🔄 업데이트 및 업그레이드

### 이미지 업데이트

```bash
# 새 이미지 빌드 및 푸시
docker build -f Dockerfile.manager -t localhost:30002/backend-ai/manager:25.07 .
docker push localhost:30002/backend-ai/manager:25.07

# Helm 차트 업그레이드
helm upgrade backend-ai-manager ./backend-ai-manager-helm \
  -n backend-ai \
  --set image.tag=25.07
```

### Helm 차트 업데이트

```bash
# 의존성 업데이트
helm dependency update ./backend-ai-manager-helm

# 차트 업그레이드
helm upgrade backend-ai-manager ./backend-ai-manager-helm -n backend-ai
```

## 🚫 서비스 중지 및 정리

### 안전한 중지

```bash
# 순서대로 중지 (자동)
./manage-backend-ai.sh stop

# 수동 중지 (역순)
helm uninstall backend-ai-web-server -n backend-ai
helm uninstall backend-ai-app-proxy -n backend-ai
helm uninstall backend-ai-storage-proxy -n backend-ai
helm uninstall backend-ai-agent -n backend-ai
helm uninstall backend-ai-manager -n backend-ai
```

### 완전 정리

```bash
# 모든 데이터 포함 정리 (주의!)
./manage-backend-ai.sh cleanup

# 네임스페이스 삭제
kubectl delete namespace backend-ai
kubectl delete namespace harbor-system
```

## 📚 추가 리소스

### 문서
- [Backend.AI 공식 문서](https://docs.backend.ai/)
- [Harbor 공식 문서](https://goharbor.io/docs/)
- [Kubernetes 공식 문서](https://kubernetes.io/docs/)
- [Helm 공식 문서](https://helm.sh/docs/)

### 설정 파일
- `KUBERNETES_DEPLOYMENT_GUIDE.md` - 상세 영문 가이드
- `KUBERNETES_DEPLOYMENT_GUIDE.kr` - 상세 한글 가이드
- `harbor-values.yaml` - Harbor 설정
- `backend-ai-*-helm/values.yaml` - 각 서비스 설정

### 관리 스크립트
- `deploy-backend-ai.sh` - 전체 배포 자동화
- `stop-backend-ai.sh` - 안전한 중지 및 정리
- `manage-backend-ai.sh` - 통합 관리 인터페이스

## 💡 팁과 권장사항

### 개발 환경
- minikube 또는 kind 사용 권장
- 리소스 제한 설정으로 로컬 환경 최적화
- 개발용 Harbor에는 간단한 비밀번호 사용 가능

### 프로덕션 환경
- 고가용성을 위한 다중 노드 클러스터 구성
- 영구 스토리지를 위한 StorageClass 설정
- 백업 및 모니터링 시스템 구축
- 보안 강화 (HTTPS, RBAC, Network Policy)

### 성능 최적화
- 리소스 requests/limits 적절히 설정
- HPA (Horizontal Pod Autoscaler) 적용
- 이미지 크기 최적화
- 네트워크 정책으로 불필요한 트래픽 차단

---

## ❓ 지원 및 문의

문제가 발생하거나 질문이 있으시면:

1. **로그 수집**: `./manage-backend-ai.sh collect-logs`
2. **상태 확인**: `./manage-backend-ai.sh status-detailed`
3. **GitHub Issues**: Backend.AI 프로젝트에 이슈 등록
4. **커뮤니티**: Backend.AI 커뮤니티 포럼 참여

**Happy Kubernetes Deployment! 🎉**