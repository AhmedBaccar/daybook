# Publishes Daybook to Cloudflare: copies only the app files (no CVs, scripts or logs) into hosting\dist,
# then deploys the worker. Run after changing anything in index.html, css\ or js\.
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $here
$dist = Join-Path $here 'dist'
if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory $dist | Out-Null
Copy-Item (Join-Path $root 'index.html'), (Join-Path $root 'manifest.webmanifest') $dist
foreach ($d in 'css', 'js', 'icons') { Copy-Item (Join-Path $root $d) $dist -Recurse }
Remove-Item (Join-Path $dist 'js\food-data.js') -ErrorAction SilentlyContinue   # served live by the worker from KV
# offline copy for phones: stamp the service worker with this deploy's version and file list
$assets = Get-ChildItem $dist -Recurse -File | ForEach-Object { $_.FullName.Substring($dist.Length + 1).Replace('\', '/') } |
    Where-Object { $_ -ne 'index.html' } | ForEach-Object { "'$_'" }
$sw = (Get-Content (Join-Path $root 'sw.js') -Raw).Replace("const VERSION = 'dev';", "const VERSION = '$(Get-Date -Format 'yyyyMMddHHmmss')';").Replace('const ASSETS = [];', "const ASSETS = ['./', $($assets -join ', ')];")
[IO.File]::WriteAllText((Join-Path $dist 'sw.js'), $sw, (New-Object Text.UTF8Encoding $false))
Push-Location $here
try { npx --yes wrangler@4 deploy; if ($LASTEXITCODE) { throw 'wrangler deploy failed' } }
finally { Pop-Location }
