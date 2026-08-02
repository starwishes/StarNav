#!/bin/sh
set -e

DATA_DIR="/app/data"
NODE_UID="$(id -u node)"

# 确保数据目录存在
mkdir -p "$DATA_DIR/users" "$DATA_DIR/uploads"

# 数据根目录属主不是 node 时才全量 chown，避免大数据卷每次启动全量扫盘
DIR_UID="$(stat -c '%u' "$DATA_DIR" 2>/dev/null || echo "")"
if [ "$DIR_UID" != "$NODE_UID" ]; then
  chown -R node:node "$DATA_DIR"
fi

# entrypoint 以 root 新建的 users/uploads 子目录必须交由 node 用户，
# 否则应用写入 uploads 会因 EACCES 失败；仅在属主异常时修正，避免重复扫盘
for SUB in users uploads; do
  SUB_UID="$(stat -c '%u' "$DATA_DIR/$SUB" 2>/dev/null || echo "")"
  if [ "$SUB_UID" != "$NODE_UID" ]; then
    chown -R node:node "$DATA_DIR/$SUB"
  fi
done

# 切换到 node 用户执行应用
exec gosu node "$@"
