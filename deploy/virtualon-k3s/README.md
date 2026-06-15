# VirtualOn k3s Deployment — Backend.AI 26.4.4rc9 + WebUI v26.4.8-rc.12

k3s 클러스터(GWA VM110) 위에 Backend.AI App Proxy (coordinator v2 + worker) + WebUI를 배포하는 매니페스트.
[VirtualOn](https://github.com/hephaex/virtualOn) 컨트롤러와 연동한다.

## 컴포넌트

| 컴포넌트 | 이미지 | 포트 |
|---------|--------|------|
| app-proxy coordinator | `bai-appproxy-coordinator:26.4.4rc9` (로컬 빌드) | 10200 (NodePort 30200) |
| app-proxy worker | `bai-appproxy-worker:26.4.4rc9` (로컬 빌드) | 10201 (NodePort 30201) |
| backend.ai webui | `bai-webui:v26.4.8-rc.12` (로컬 빌드) | 80 (NodePort 30080) |
| PostgreSQL (coordinator DB) | `postgres:16` | 5432 |
| Redis (이미 배포됨) | — | 6379 |
| etcd (이미 배포됨) | — | 2379 |

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

# WebUI (v26.4.8-rc.12)
# 1. GitHub Releases에서 dist 아카이브 다운로드 후 web-server/dist/ 에 배치
#    https://github.com/lablup/backend.ai-webui/releases/tag/v26.4.8-rc.12
docker build -t bai-webui:v26.4.8-rc.12 -f web-server/Dockerfile.webui web-server/
docker save bai-webui:v26.4.8-rc.12 | sudo ctr -n k8s.io images import -
```

## 배포 순서

```bash
# 1. namespace + infrastructure
kubectl apply -f infrastructure/namespace.yaml
kubectl apply -f infrastructure/postgres.yaml

# 2. 시크릿 (값 변경 후)
kubectl apply -f app-proxy/secret.yaml

# 3. app-proxy coordinator + worker
kubectl apply -f app-proxy/

# 4. webui configmap + deployment
kubectl apply -f web-server/configmap-webui.yaml
kubectl apply -f web-server/deployment-webui.yaml

# 5. 검증
kubectl -n backend-ai get pods
kubectl -n backend-ai logs -l app=backend-ai-appproxy-coordinator
# WebUI: http://192.168.29.110:30080
```

## VirtualOn 연동

VirtualOn controller가 App Proxy coordinator에 라우팅 요청을 보내는 엔드포인트:
- k3s 내부: `http://backend-ai-appproxy-coordinator.backend-ai.svc.cluster.local:10200`
- NodePort: `http://192.168.29.110:30200`

WebUI는 NodePort 30080으로 접근:
- `http://192.168.29.110:30080`
- manager endpoint는 `web-server/configmap-webui.yaml`의 `server.endpoint` 값으로 설정
