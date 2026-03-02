{{/*
Chart fullname
*/}}
{{- define "boardwalk.fullname" -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "boardwalk.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}

{{/*
Backend selector labels
*/}}
{{- define "boardwalk.backendSelectorLabels" -}}
app.kubernetes.io/name: {{ include "boardwalk.fullname" . }}-backend
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Frontend selector labels
*/}}
{{- define "boardwalk.frontendSelectorLabels" -}}
app.kubernetes.io/name: {{ include "boardwalk.fullname" . }}-frontend
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
