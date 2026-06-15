# VirtualOn k3s Deployment — Backend.AI 26.4.4rc9

k3s 클러스터(GWA VM110) 위에 Backend.AI App Proxy (coordinator v2 + worker)를 배포하는 매니페스트.
[VirtualOn](https://github.com/hephaex/virtualOn) 컨트롤러와 연동한다.

## 컴포넌트

| 컴포넌트 | 이미지 | 포트 |
|---------|--------|------|
| app-proxy coordinator | `lablup/backend.ai-appproxy-coordinator:26.4.4rc9` | 10200 (NodePort 30200) |
| app-proxy worker | `lablup/backend.ai-appproxy-worker:26.4.4rc9` | 10201 (NodePort 30201) |
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

## 배포 순서

```bash
# 1. namespace + infrastructure
kubectl apply -f infrastructure/namespace.yaml
kubectl apply -f infrastructure/postgres.yaml

# 2. 시크릿 (값 변경 후)
kubectl apply -f app-proxy/secret.yaml

# 3. app-proxy coordinator + worker
kubectl apply -f app-proxy/

# 4. 검증
kubectl -n backend-ai get pods
kubectl -n backend-ai logs -l app=backend-ai-appproxy-coordinator
```

## VirtualOn 연동

VirtualOn controller가 App Proxy coordinator에 라우팅 요청을 보내는 엔드포인트:
- k3s 내부: `http://backend-ai-appproxy-coordinator.backend-ai.svc.cluster.local:10200`
- NodePort: `http://192.168.29.110:30200`
