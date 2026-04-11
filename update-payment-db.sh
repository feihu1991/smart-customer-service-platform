#!/bin/bash
# 支付集成完成后需要执行的数据库更新脚本

cd /app/data/所有对话/主对话/smart-customer-service-platform

echo "正在更新 Prisma Schema..."

# 确保安装正确版本的 prisma
npm install prisma@6.11.1 @prisma/client@6.11.1 --save

# 生成 Prisma Client
npx prisma generate

# 推送数据库更新
npx prisma db push

echo "完成！"
