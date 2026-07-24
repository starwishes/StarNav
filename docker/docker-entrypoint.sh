#!/bin/sh
set -e

DATA_DIR="/app/data"

# 确保数据目录存在
mkdir -p "$DATA_DIR/users" "$DATA_DIR/uploads"

# 修复数据目录权限
chown -R node:node "$DATA_DIR"

# 切换到 node 用户执行应用
exec gosu node "$@"
