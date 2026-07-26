#!/bin/sh
set -e

DATA_DIR="/app/data"
NODE_UID="$(id -u node)"

# 确保数据目录存在
mkdir -p "$DATA_DIR/users" "$DATA_DIR/uploads"

# 仅在属主不是 node 时 chown，避免大数据卷每次启动全量扫盘
DIR_UID="$(stat -c '%u' "$DATA_DIR" 2>/dev/null || echo "")"
if [ "$DIR_UID" != "$NODE_UID" ]; then
  chown -R node:node "$DATA_DIR"
fi

# 切换到 node 用户执行应用
exec gosu node "$@"
