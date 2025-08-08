# Backend.AI vLLM 자동 배포 가이드

## 📋 개요

이 가이드는 Backend.AI API를 사용하여 Hugging Face 모델을 vLLM으로 자동 배포하는 완전한 솔루션을 제공합니다. GPU 리소스를 효율적으로 활용하여 대형 언어 모델(LLM)을 서빙할 수 있습니다.

### 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Backend.AI Platform                          │
├─────────────────────────────────────────────────────────────────┤
│  Manager                                                        │
│  ├── API Gateway (포트 8081)                                    │
│  ├── Session Management                                         │
│  └── Resource Orchestration                                    │
├─────────────────────────────────────────────────────────────────┤
│  GPU Agent Nodes                                               │
│  ├── Agent 1 (GPU Compute)                                     │
│  │   ├── vLLM Container                                        │
│  │   │   ├── Model: HuggingFace Model                         │
│  │   │   ├── API Server: OpenAI Compatible                    │
│  │   │   └── GPU: CUDA Acceleration                           │
│  │   └── Resources: GPU + CPU + Memory                        │
│  └── Agent N (Scalable)                                        │
├─────────────────────────────────────────────────────────────────┤
│  External Integration                                           │
│  ├── HuggingFace Hub (Model Download)                         │
│  ├── OpenAI Compatible API                                     │
│  └── Client Applications                                       │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### 1단계: 환경 설정

```bash
# Backend.AI 자격 증명 설정
export BACKEND_AI_ENDPOINT="http://localhost:8081"
export BACKEND_AI_ACCESS_KEY="your-access-key"
export BACKEND_AI_SECRET_KEY="your-secret-key"

# HuggingFace 토큰 (private 모델용)
export HUGGING_FACE_HUB_TOKEN="your-hf-token"
```

### 2단계: 간단한 모델 배포

```bash
# 작은 모델 배포 (테스트용)
./deploy-vllm-model.sh microsoft/DialoGPT-medium

# 중간 크기 모델 배포
./deploy-vllm-model.sh -g 1 -m 16g --wait meta-llama/Llama-2-7b-chat-hf

# 대형 모델 배포 (다중 GPU)
./deploy-vllm-model.sh -g 4 -m 64g --quantization awq \
    --tensor-parallel-size 4 meta-llama/Llama-2-70b-chat-hf
```

### 3단계: API 사용

```bash
# 배포된 모델 API 테스트
curl -X POST http://localhost:8000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/Llama-2-7b-chat-hf",
    "prompt": "Hello, how are you?",
    "max_tokens": 100,
    "temperature": 0.7
  }'
```

## 📂 프로젝트 구조

```
backend.ai/
├── VLLM_DEPLOYMENT_GUIDE.md           # 이 문서
├── deploy-vllm-model.sh               # 메인 배포 스크립트
├── vllm-examples.sh                   # 예제 및 유틸리티
└── temp/
    └── deploy_vllm_*.py               # 임시 Python 스크립트
```

## 🔧 deploy-vllm-model.sh 사용법

### 기본 문법

```bash
./deploy-vllm-model.sh [OPTIONS] <huggingface-model-url>
```

### 주요 옵션

| 옵션 | 설명 | 기본값 | 예시 |
|------|------|---------|------|
| `-g, --gpu-count` | GPU 개수 | 1 | `-g 2` |
| `-m, --memory` | 메모리 할당 | 16g | `-m 32g` |
| `-c, --cpu-count` | CPU 코어 수 | 4 | `-c 8` |
| `-n, --session-name` | 세션 이름 | 자동생성 | `-n my-llama` |
| `--max-model-len` | 최대 시퀀스 길이 | 4096 | `--max-model-len 8192` |
| `--quantization` | 양자화 방법 | 없음 | `--quantization awq` |
| `--tensor-parallel-size` | 텐서 병렬화 크기 | 없음 | `--tensor-parallel-size 4` |
| `--huggingface-token` | HF 토큰 | 환경변수 | `--huggingface-token hf_xxx` |
| `--wait` | 배포 완료 대기 | false | `--wait` |
| `--dry-run` | 실행하지 않고 설정만 확인 | false | `--dry-run` |

### 사용 예시

#### 1. 기본 배포

```bash
# 기본 설정으로 모델 배포
./deploy-vllm-model.sh microsoft/DialoGPT-medium
```

#### 2. 커스텀 리소스 배포

```bash
# 2개 GPU, 32GB 메모리로 배포
./deploy-vllm-model.sh -g 2 -m 32g -c 8 meta-llama/Llama-2-13b-chat-hf
```

#### 3. 양자화된 대형 모델 배포

```bash
# AWQ 양자화로 4개 GPU에 분산 배포
./deploy-vllm-model.sh \
    --gpu-count 4 \
    --memory 64g \
    --cpu-count 16 \
    --quantization awq \
    --tensor-parallel-size 4 \
    --max-model-len 8192 \
    --wait \
    meta-llama/Llama-2-70b-chat-hf
```

#### 4. Private 모델 배포

```bash
# HuggingFace 토큰으로 private 모델 배포
./deploy-vllm-model.sh \
    --huggingface-token hf_xxxxxxxxxxxxxxxx \
    --gpu-count 2 \
    --memory 24g \
    --wait \
    your-org/private-llama-model
```

#### 5. 설정 확인 (Dry Run)

```bash
# 실제 배포하지 않고 설정만 확인
./deploy-vllm-model.sh --dry-run microsoft/DialoGPT-medium
```

## 🎯 vllm-examples.sh 유틸리티

### 대화형 메뉴 실행

```bash
./vllm-examples.sh
```

### 직접 명령어 사용

```bash
# 활성 세션 목록 보기
./vllm-examples.sh list

# 세션 종료
./vllm-examples.sh kill session-name

# 세션 로그 보기
./vllm-examples.sh logs session-name

# API 테스트
./vllm-examples.sh test http://localhost:8000

# 리소스 모니터링
./vllm-examples.sh monitor
```

## 📊 지원 모델 유형

### 1. 텍스트 생성 모델

| 모델 | 권장 GPU | 메모리 | 예시 명령어 |
|------|----------|--------|-------------|
| GPT-2 | 1 | 4g | `./deploy-vllm-model.sh gpt2` |
| DialoGPT-medium | 1 | 8g | `./deploy-vllm-model.sh microsoft/DialoGPT-medium` |
| DialoGPT-large | 1 | 16g | `./deploy-vllm-model.sh -m 16g microsoft/DialoGPT-large` |

### 2. 중간 크기 모델

| 모델 | 권장 GPU | 메모리 | 예시 명령어 |
|------|----------|--------|-------------|
| Llama-2-7B | 1 | 16g | `./deploy-vllm-model.sh meta-llama/Llama-2-7b-chat-hf` |
| Llama-2-13B | 2 | 32g | `./deploy-vllm-model.sh -g 2 -m 32g meta-llama/Llama-2-13b-chat-hf` |
| Mistral-7B | 1 | 16g | `./deploy-vllm-model.sh mistralai/Mistral-7B-Instruct-v0.1` |

### 3. 대형 모델

| 모델 | 권장 GPU | 메모리 | 양자화 | 예시 명령어 |
|------|----------|--------|--------|-------------|
| Llama-2-70B | 4 | 64g | AWQ | `./deploy-vllm-model.sh -g 4 -m 64g --quantization awq --tensor-parallel-size 4 meta-llama/Llama-2-70b-chat-hf` |
| CodeLlama-34B | 2 | 48g | GPTQ | `./deploy-vllm-model.sh -g 2 -m 48g --quantization gptq codellama/CodeLlama-34b-Instruct-hf` |

### 4. 특수 목적 모델

| 모델 | 용도 | 권장 설정 | 예시 명령어 |
|------|------|-----------|-------------|
| Code Llama | 코드 생성 | 1-2 GPU, 24g | `./deploy-vllm-model.sh -g 2 -m 24g codellama/CodeLlama-13b-Instruct-hf` |
| Vicuna | 채팅 | 1 GPU, 16g | `./deploy-vllm-model.sh -m 16g lmsys/vicuna-13b-v1.5` |
| WizardCoder | 코딩 어시스턴트 | 1 GPU, 16g | `./deploy-vllm-model.sh -m 16g WizardLM/WizardCoder-15B-V1.0` |

## 🔍 트러블슈팅

### 일반적인 문제

#### 1. 인증 오류

```bash
# 오류: Backend.AI credentials are required
export BACKEND_AI_ACCESS_KEY="your-access-key"
export BACKEND_AI_SECRET_KEY="your-secret-key"
```

#### 2. GPU 리소스 부족

```bash
# 오류: Insufficient GPU resources
# 해결: GPU 개수 줄이거나 대기 중인 세션 종료
./vllm-examples.sh list
./vllm-examples.sh kill session-name
```

#### 3. 메모리 부족

```bash
# 오류: Out of memory
# 해결: 메모리 할당 늘리거나 양자화 사용
./deploy-vllm-model.sh -m 32g --quantization awq model-name
```

#### 4. HuggingFace 모델 접근 오류

```bash
# 오류: Repository not found or private
# 해결: HuggingFace 토큰 설정
export HUGGING_FACE_HUB_TOKEN="hf_xxxxxxxxxxxxxxxx"
./deploy-vllm-model.sh --huggingface-token $HUGGING_FACE_HUB_TOKEN model-name
```

#### 5. 세션 시작 실패

```bash
# 로그 확인
./vllm-examples.sh logs session-name

# 세션 재시작
./vllm-examples.sh kill session-name
./deploy-vllm-model.sh model-name
```

### 디버깅 도구

#### 1. 상세 로그 활성화

```bash
# 디버그 모드로 실행
./deploy-vllm-model.sh --debug --verbose microsoft/DialoGPT-medium
```

#### 2. Dry Run으로 설정 확인

```bash
# 실행 없이 설정 확인
./deploy-vllm-model.sh --dry-run --verbose model-name
```

#### 3. 리소스 모니터링

```bash
# GPU 사용률 확인
nvidia-smi

# Backend.AI 리소스 모니터링
./vllm-examples.sh monitor
```

## 📈 성능 최적화

### 1. GPU 활용 최적화

```bash
# 텐서 병렬화로 다중 GPU 활용
./deploy-vllm-model.sh \
    --gpu-count 4 \
    --tensor-parallel-size 4 \
    model-name
```

### 2. 메모리 최적화

```bash
# 양자화로 메모리 사용량 감소
./deploy-vllm-model.sh \
    --quantization awq \
    --max-model-len 4096 \
    model-name
```

### 3. 배치 처리 최적화

```bash
# vLLM 환경 변수 조정 (고급 사용자용)
# 배포 후 세션 내에서 수정 필요
export VLLM_USE_MODELSCOPE=false
export VLLM_WORKER_MULTIPROC_METHOD=spawn
```

## 🔄 API 사용 가이드

### 1. OpenAI 호환 API

#### 텍스트 완성

```bash
curl -X POST http://localhost:8000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/Llama-2-7b-chat-hf",
    "prompt": "Explain quantum computing in simple terms:",
    "max_tokens": 200,
    "temperature": 0.7,
    "top_p": 0.9
  }'
```

#### 채팅 완성

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/Llama-2-7b-chat-hf",
    "messages": [
      {"role": "user", "content": "What is machine learning?"}
    ],
    "max_tokens": 200,
    "temperature": 0.7
  }'
```

#### 모델 정보 조회

```bash
# 사용 가능한 모델 목록
curl http://localhost:8000/v1/models

# 서버 상태 확인
curl http://localhost:8000/health
```

### 2. Python 클라이언트 예제

```python
import openai

# OpenAI 클라이언트 설정
openai.api_base = "http://localhost:8000/v1"
openai.api_key = "sk-dummy"  # vLLM은 API 키가 필요 없음

# 텍스트 생성
response = openai.Completion.create(
    model="meta-llama/Llama-2-7b-chat-hf",
    prompt="Write a Python function to calculate fibonacci numbers:",
    max_tokens=200,
    temperature=0.3
)

print(response.choices[0].text)

# 채팅 생성
response = openai.ChatCompletion.create(
    model="meta-llama/Llama-2-7b-chat-hf",
    messages=[
        {"role": "user", "content": "Explain the concept of recursion"}
    ],
    max_tokens=200,
    temperature=0.7
)

print(response.choices[0].message.content)
```

### 3. 스트리밍 응답

```bash
# 스트리밍 모드로 실시간 응답 받기
curl -X POST http://localhost:8000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/Llama-2-7b-chat-hf",
    "prompt": "Write a story about a robot:",
    "max_tokens": 200,
    "stream": true
  }'
```

## 🛡️ 보안 고려사항

### 1. 액세스 제어

- Backend.AI 액세스 키/시크릿 키 보안 관리
- HuggingFace 토큰을 환경변수로만 전달
- 필요시 Private 모델 사용으로 데이터 보안 강화

### 2. 네트워크 보안

```bash
# vLLM 서버를 내부 네트워크에만 노출
./deploy-vllm-model.sh -p 8000 model-name  # 기본 포트 8000
```

### 3. 리소스 격리

- Backend.AI의 세션 격리 기능 활용
- GPU 리소스를 세션별로 완전 분리
- 메모리 및 CPU 리소스 제한

## 📚 추가 리소스

### 문서
- [Backend.AI 공식 문서](https://docs.backend.ai/)
- [vLLM 공식 문서](https://vllm.readthedocs.io/)
- [HuggingFace Transformers](https://huggingface.co/docs/transformers)

### 예제 모델
- [HuggingFace Model Hub](https://huggingface.co/models)
- [Meta Llama Models](https://huggingface.co/meta-llama)
- [Mistral AI Models](https://huggingface.co/mistralai)

### 도구
- `deploy-vllm-model.sh` - 메인 배포 스크립트
- `vllm-examples.sh` - 예제 및 유틸리티 도구
- Backend.AI Web Console - 웹 기반 관리 도구

---

## 💡 Best Practices

### 개발 환경
- 작은 모델로 먼저 테스트 후 큰 모델로 확장
- `--dry-run` 옵션으로 설정 검증 후 배포
- 디버그 모드로 문제 해결

### 프로덕션 환경
- 적절한 리소스 할당으로 안정성 확보
- 모니터링 도구로 지속적인 상태 확인
- 로드 밸런싱을 위한 다중 세션 배포

### 비용 최적화
- 양자화 기법으로 GPU 메모리 사용량 감소
- 사용하지 않는 세션은 즉시 종료
- 배치 처리로 GPU 활용률 극대화

---

## ❓ 지원 및 문의

문제가 발생하거나 질문이 있으시면:

1. **스크립트 디버그**: `--debug --verbose` 옵션 사용
2. **로그 확인**: `./vllm-examples.sh logs session-name`
3. **GitHub Issues**: Backend.AI 프로젝트에 이슈 등록
4. **커뮤니티**: Backend.AI 커뮤니티 포럼 참여

**Happy Model Serving! 🤖🚀**