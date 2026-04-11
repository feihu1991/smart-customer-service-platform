#!/bin/bash

# 智能客服平台 - 订阅管理功能测试脚本

echo "=========================================="
echo "智能客服平台 - 订阅管理功能测试"
echo "=========================================="
echo ""

BASE_URL="http://localhost:3000"

# 1. 初始化订阅套餐数据
echo "1. 初始化订阅套餐数据..."
curl -s -X POST "$BASE_URL/api/init/subscription" | jq '.'
echo ""

# 2. 用户登录（获取token）
echo "2. 用户登录..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","password":"123456"}')
echo "$LOGIN_RESPONSE" | jq '.'
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')
echo ""

# 3. 获取当前订阅信息
echo "3. 获取当前订阅信息..."
curl -s "$BASE_URL/api/subscription" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# 4. 获取套餐列表
echo "4. 获取套餐列表..."
curl -s "$BASE_URL/api/plans" | jq '.'
echo ""

echo "=========================================="
echo "测试完成"
echo "=========================================="
