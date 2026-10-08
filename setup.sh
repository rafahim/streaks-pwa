#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$ROOT/modules" "$ROOT/.well-known"
required=(
  index.html style.css script.js service-worker.js manifest.json README.md LICENSE .gitignore
  robots.txt sitemap.xml humans.txt favicon.svg og-image.svg
  modules/db.js modules/habits.js modules/stats.js modules/heatmap.js modules/notifications.js
  .well-known/security.txt
)
for file in "${required[@]}"; do
  test -f "$ROOT/$file" || { echo "Missing: $file"; exit 1; }
done
rm -f "$ROOT/streaks-pwa.zip"
if command -v zip >/dev/null 2>&1; then
  (cd "$ROOT" && zip -qr "streaks-pwa.zip" "${required[@]}")
else
  python3 - "$ROOT" "${required[@]}" <<'PY'
import sys, zipfile, pathlib
root = pathlib.Path(sys.argv[1])
files = sys.argv[2:]
with zipfile.ZipFile(root / "streaks-pwa.zip", "w", zipfile.ZIP_DEFLATED) as z:
    for name in files:
        z.write(root / name, name)
print(root / "streaks-pwa.zip")
PY
fi
echo "Streaks project verified and packaged."
echo "ZIP: $ROOT/streaks-pwa.zip"
