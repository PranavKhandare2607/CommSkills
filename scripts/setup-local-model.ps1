$ErrorActionPreference = "Stop"

# Fast CPU model for CommSkills. A small context window keeps tokenisation and
# KV-cache work low, which matters a lot when Ollama runs without a GPU.
$sourceModel = "qwen2.5:1.5b-instruct"
$targetModel = "commskills-turbo"
$modelfile = Join-Path $env:TEMP "commskills-turbo.Modelfile"

ollama pull $sourceModel
if ($LASTEXITCODE -ne 0) { throw "Failed to pull $sourceModel" }

@"
FROM $sourceModel
PARAMETER num_ctx 4096
PARAMETER num_predict 768
PARAMETER temperature 0.3
"@ | Set-Content -Path $modelfile -Encoding ascii

ollama create $targetModel -f $modelfile
if ($LASTEXITCODE -ne 0) { throw "Failed to create $targetModel" }

Remove-Item -Force $modelfile -ErrorAction SilentlyContinue

"Local model ready: $targetModel"
