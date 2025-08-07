{{/*
Expand the name of the chart.
*/}}
{{- define "backend-ai-gpu-agent.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "backend-ai-gpu-agent.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "backend-ai-gpu-agent.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "backend-ai-gpu-agent.labels" -}}
helm.sh/chart: {{ include "backend-ai-gpu-agent.chart" . }}
{{ include "backend-ai-gpu-agent.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: backend-ai
{{- end }}

{{/*
Selector labels
*/}}
{{- define "backend-ai-gpu-agent.selectorLabels" -}}
app.kubernetes.io/name: {{ include "backend-ai-gpu-agent.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "backend-ai-gpu-agent.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "backend-ai-gpu-agent.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Generate VM name with index
*/}}
{{- define "backend-ai-gpu-agent.vmName" -}}
{{- printf "%s-%03d" .Values.vm.namePrefix .index }}
{{- end }}

{{/*
Generate agent ID with index
*/}}
{{- define "backend-ai-gpu-agent.agentId" -}}
{{- printf "%s-%03d" .Values.agent.id .index }}
{{- end }}

{{/*
Generate GPU device configuration
*/}}
{{- define "backend-ai-gpu-agent.gpuDevices" -}}
{{- if .Values.vm.resources.gpu.enabled }}
{{- range .Values.vm.resources.gpu.devices }}
- deviceName: {{ .deviceName | quote }}
  name: {{ .name | quote }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Generate cloud-init user data
*/}}
{{- define "backend-ai-gpu-agent.cloudInitUserData" -}}
{{- $userData := .Values.cloudInit.userData }}
{{- $userData = replace "{{ include \"backend-ai-gpu-agent.fullname\" . }}" (include "backend-ai-gpu-agent.fullname" .) $userData }}
{{- $userData }}
{{- end }}

{{/*
Generate registry secret name
*/}}
{{- define "backend-ai-gpu-agent.registrySecretName" -}}
{{- if .Values.imagePullSecrets }}
{{- (index .Values.imagePullSecrets 0).name }}
{{- else }}
harbor-registry-secret
{{- end }}
{{- end }}

{{/*
Generate ETCD endpoints
*/}}
{{- define "backend-ai-gpu-agent.etcdEndpoints" -}}
{{- .Values.global.manager.etcdEndpoint | quote }}
{{- end }}

{{/*
Generate registry URL
*/}}
{{- define "backend-ai-gpu-agent.registryUrl" -}}
{{- printf "%s/%s" .Values.global.registry.url .Values.global.registry.project }}
{{- end }}

{{/*
Generate full image name
*/}}
{{- define "backend-ai-gpu-agent.image" -}}
{{- printf "%s/%s:%s" (include "backend-ai-gpu-agent.registryUrl" .) .imageName .imageTag }}
{{- end }}