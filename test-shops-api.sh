#!/bin/bash
# 测试多店铺API

BASE_URL="http://localhost:3000"

echo "=== 测试多店铺支持 API ==="

# 1. 登录获取token
echo -e "\n1. 登录获取token..."
LOGIN_RESP=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000"}')
echo "登录响应: $LOGIN_RESP"

TOKEN=$(echo $LOGIN_RESP | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  echo "登录失败，无法获取token"
  exit 1
fi
echo "Token: ${TOKEN:0:20}..."

# 2. 测试获取店铺列表
echo -e "\n2. 获取店铺列表..."
SHOPS_RESP=$(curl -s "$BASE_URL/api/shops" -H "Authorization: Bearer $TOKEN")
echo "响应: $SHOPS_RESP"

# 3. 测试添加店铺
echo -e "\n3. 添加店铺..."
ADD_RESP=$(curl -s -X POST "$BASE_URL/api/shops" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"测试店铺1","platform":"taobao","shopId":"test123"}')
echo "响应: $ADD_RESP"

SHOP_ID=$(echo $ADD_RESP | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "新店铺ID: $SHOP_ID"

# 4. 添加第二个店铺
echo -e "\n4. 添加第二个店铺..."
ADD_RESP2=$(curl -s -X POST "$BASE_URL/api/shops" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"测试店铺2","platform":"jd"}')
echo "响应: $ADD_RESP2"

# 5. 获取单个店铺
if [ ! -z "$SHOP_ID" ]; then
  echo -e "\n5. 获取单个店铺详情..."
  GET_ONE=$(curl -s "$BASE_URL/api/shops/$SHOP_ID" -H "Authorization: Bearer $TOKEN")
  echo "响应: $GET_ONE"

  # 6. 更新店铺
  echo -e "\n6. 更新店铺..."
  UPDATE_RESP=$(curl -s -X PUT "$BASE_URL/api/shops/$SHOP_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"name":"测试店铺1-已更新"}')
  echo "响应: $UPDATE_RESP"
fi

# 7. 再次获取店铺列表
echo -e "\n7. 获取店铺列表（验证）..."
FINAL=$(curl -s "$BASE_URL/api/shops" -H "Authorization: Bearer $TOKEN")
echo "响应: $FINAL"

# 8. 删除店铺
if [ ! -z "$SHOP_ID" ]; then
  echo -e "\n8. 删除店铺..."
  DELETE_RESP=$(curl -s -X DELETE "$BASE_URL/api/shops/$SHOP_ID" -H "Authorization: Bearer $TOKEN")
  echo "响应: $DELETE_RESP"
fi

echo -e "\n=== 测试完成 ==="
