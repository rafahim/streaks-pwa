$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dirs = @("$Root\modules", "$Root\.well-known")
foreach ($dir in $dirs) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
$required = @(
  "index.html","style.css","script.js","service-worker.js","manifest.json","README.md","LICENSE",".gitignore",
  "robots.txt","sitemap.xml","humans.txt","favicon.svg","og-image.svg",
  "modules/db.js","modules/habits.js","modules/stats.js","modules/heatmap.js","modules/notifications.js",
  ".well-known/security.txt"
)
foreach ($file in $required) {
  if (-not (Test-Path (Join-Path $Root $file))) { throw "Missing: $file" }
}
$zip = Join-Path $Root "streaks-pwa.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
$items = $required | ForEach-Object { Join-Path $Root $_ }
Compress-Archive -Path $items -DestinationPath $zip -CompressionLevel Optimal
Write-Host "Streaks project verified and packaged."
Write-Host "ZIP: $zip"
