#!/bin/sh
set -eu

npm run versions:check
npm run lint:check
npm run typecheck
npm run lint:ops
npm run audit:prod
npm run test:fast
npm run test:smoke
npm run build
SKIP_BUILD=1 npm run test:browser
npm run docker:smoke

VERSION="$(node --input-type=module -e "import fs from 'node:fs'; const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')); process.stdout.write(pkg.version);")"
TAG="v${VERSION}"

# 历史用途：此前会在本地检查同名 GitHub Release 是否已存在（需 GITHUB_TOKEN/GH_TOKEN/gh）。
# RELEASE.md §2 已明确"不再自动创建 GitHub Release"，交付以 Docker 镜像为准，
# 该远程存在性检查不再有意义，故移除。
echo "Validated local release gates. Planned release version from package.json: ${TAG}"
