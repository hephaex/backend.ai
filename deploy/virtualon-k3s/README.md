# VirtualOn k3s Deployment — Backend.AI 26.4.4rc9 + Manager 26.4.3 + WebUI v26.4.8-rc.12

k3s 클러스터(GWA VM110) 위에 Backend.AI App Proxy (coordinator v2 + worker) + Manager + WebUI를 배포하는 매니페스트.
[VirtualOn](https://github.com/hephaex/virtualOn) 컨트롤러와 연동한다.

## 컴포넌트

| 컴포넌트 | 이미지 | 포트 |
|---------|--------|------|
| app-proxy coordinator | `bai-appproxy-coordinator:26.4.4rc9` (로컬 빌드) | 10200 (NodePort 30200) |
| app-proxy worker | `bai-appproxy-worker:26.4.4rc9` (로컬 빌드) | 10201 (NodePort 30201) |
| backend.ai manager | `bai-manager:26.4.3` (로컬 빌드) | 8081 (NodePort 38080) |
| backend.ai webui | `bai-webui:v26.4.8-rc.12` (로컬 빌드) | 80 (NodePort 30080) |
| PostgreSQL | `postgres:16` | 5432 |
| Redis | `redis:7` | 6379 |
| etcd | `bitnami/etcd:3.5` | 2379 |

## rc9 주요 변경 (25.x 대비)

- coordinator 모듈 경로: `ai.backend.appproxy.coordinator.server` (이전: `ai.backend.app.coordinator`)
- coordinator bind 포트: **10200** (이전: 8080)
- coordinator toml 마운트: `/etc/backend.ai/proxy-coordinator.toml`
- coordinator가 PostgreSQL 필수 (라우팅 규칙·circuit 상태 저장)
- worker 모듈 경로: `ai.backend.appproxy.worker.server` (이전: `ai.backend.app.worker`)
- worker toml 마운트: `/etc/backend.ai/proxy-worker.toml`
- 이미지 분리: `backend.ai-app-proxy` 단일 이미지 → `appproxy-coordinator` / `appproxy-worker` 분리

## 로컬 이미지 빌드 (VM110에서 실행)

```bash
cd deploy/virtualon-k3s

# App Proxy coordinator (26.4.4rc9)
docker build -t bai-appproxy-coordinator:26.4.4rc9 -f app-proxy/Dockerfile.coordinator app-proxy/
docker save bai-appproxy-coordinator:26.4.4rc9 | sudo ctr -n k8s.io images import -

# App Proxy worker (26.4.4rc9)
docker build -t bai-appproxy-worker:26.4.4rc9 -f app-proxy/Dockerfile.worker app-proxy/
docker save bai-appproxy-worker:26.4.4rc9 | sudo ctr -n k8s.io images import -

# Manager (26.4.3) — 소스 빌드, build context = repo root (~5분)
# deploy/virtualon-k3s/ 에서 실행하지 말고 repo root에서 실행할 것
cd /root/backend.ai
docker build -t bai-manager:26.4.3 -f deploy/virtualon-k3s/manager/Dockerfile.manager .
docker save bai-manager:26.4.3 | sudo ctr -n k8s.io images import -
cd deploy/virtualon-k3s

# WebUI (v26.4.8-rc.12)
# 1. GitHub Releases에서 dist 아카이브 다운로드 후 web-server/dist/ 에 배치
#    https://github.com/lablup/backend.ai-webui/releases/tag/v26.4.8-rc.12
docker build -t bai-webui:v26.4.8-rc.12 -f web-server/Dockerfile.webui web-server/
docker save bai-webui:v26.4.8-rc.12 | sudo ctr -n k8s.io images import -
```

## 배포 순서

```bash
cd deploy/virtualon-k3s

# 1. namespace + infrastructure (postgres, redis, etcd)
kubectl apply -f infrastructure/namespace.yaml
kubectl apply -f infrastructure/postgres.yaml
kubectl apply -f infrastructure/redis.yaml
kubectl apply -f infrastructure/etcd.yaml

# 2. 시크릿 (값 변경 후)
kubectl apply -f app-proxy/secret.yaml

# 3. app-proxy coordinator + worker
kubectl apply -f app-proxy/

# 4. manager init job (DB 생성 + etcd 키 설정 + schema 생성)
#    postgres + etcd 기동 후 실행 — init container가 readiness를 기다림
kubectl apply -f manager/job-init.yaml
kubectl -n backend-ai wait --for=condition=complete job/backend-ai-manager-init --timeout=120s
kubectl -n backend-ai logs job/backend-ai-manager-init -c init

# 5. manager deployment
kubectl apply -f manager/configmap-manager.yaml
kubectl apply -f manager/deployment-manager.yaml
kubectl -n backend-ai rollout status deployment/backend-ai-manager

# 6. webui configmap + deployment
#    (web-server/configmap-webui.yaml의 server.endpoint가 이미 http://192.168.29.110:38080 으로 설정됨)
kubectl apply -f web-server/configmap-webui.yaml
kubectl apply -f web-server/deployment-webui.yaml

# 7. 검증
kubectl -n backend-ai get pods
# WebUI: http://192.168.29.110:30080
# Manager API: http://192.168.29.110:38080/auth/login
```

## VirtualOn 연동

VirtualOn controller가 App Proxy coordinator에 라우팅 요청을 보내는 엔드포인트:
- k3s 내부: `http://backend-ai-appproxy-coordinator.backend-ai.svc.cluster.local:10200`
- NodePort: `http://192.168.29.110:30200`

WebUI는 NodePort 30080으로 접근:
- `http://192.168.29.110:30080`
- manager endpoint는 `web-server/configmap-webui.yaml`의 `server.endpoint` 값으로 설정
