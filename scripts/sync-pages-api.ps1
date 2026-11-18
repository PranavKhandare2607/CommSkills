param(
  [string]$Repo = "PranavKhandare2607/CommSkills"
)

$ErrorActionPreference = "Stop"

gh auth status --hostname github.com | Out-Null
if ($LASTEXITCODE -ne 0) { throw "GitHub CLI is not authenticated." }

docker compose up -d --build api tunnel
if ($LASTEXITCODE -ne 0) { throw "Failed to start API and tunnel." }

$pattern = 'https://[a-z0-9-]+\.trycloudflare\.com'
$apiUrl = $null
for ($i = 0; $i -lt 60; $i++) {
  $logs = docker compose logs tunnel 2>&1 | Out-String
  $found = [regex]::Matches($logs, $pattern)
  if ($found.Count -gt 0) {
    $apiUrl = $found[$found.Count - 1].Value
    break
  }
  Start-Sleep -Seconds 2
}
if (-not $apiUrl) { throw "No tunnel URL found in Docker logs." }

$healthy = $false
for ($i = 0; $i -lt 30; $i++) {
  try {
    $response = Invoke-WebRequest -Uri "$apiUrl/api/healthz" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
      $healthy = $true
      break
    }
  } catch {
    Start-Sleep -Seconds 2
  }
}
if (-not $healthy) { throw "Tunnel $apiUrl is not healthy." }

gh variable set VITE_API_BASE_URL --body $apiUrl --repo $Repo
if ($LASTEXITCODE -ne 0) { throw "Failed to set VITE_API_BASE_URL." }

gh workflow run deploy-pages.yml --repo $Repo --ref main
if ($LASTEXITCODE -ne 0) { throw "Failed to trigger Pages deployment." }

"API_URL=$apiUrl"
