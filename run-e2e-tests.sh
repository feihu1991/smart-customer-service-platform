#!/bin/bash

# E2E 测试运行脚本
# 
# 使用方式：
# ./run-e2e-tests.sh              # 运行认证测试示例
# ./run-e2e-tests.sh --all        # 运行所有API测试
# ./run-e2e-tests.sh --module=auth # 运行指定模块

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "E2E 测试 - 智能客服平台"
echo "=========================================="
echo ""

# 检查服务器是否运行
check_server() {
    echo -e "${YELLOW}检查服务器状态...${NC}"
    if curl -s -f http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 服务器正在运行${NC}"
        return 0
    else
        echo -e "${RED}❌ 服务器未运行${NC}"
        echo ""
        echo "请先启动开发服务器："
        echo "  npm run dev"
        return 1
    fi
}

# 运行 Vitest 测试
run_vitest() {
    local test_file=$1
    local test_name=$2
    
    echo ""
    echo -e "${YELLOW}运行测试: ${test_name}${NC}"
    echo "----------------------------------------"
    
    npx vitest run "$test_file" --reporter=verbose || {
        echo -e "${RED}测试失败${NC}"
        return 1
    }
    
    echo -e "${GREEN}✅ 测试完成: ${test_name}${NC}"
}

# 主流程
main() {
    # 解析参数
    MODULE=""
    RUN_ALL=false
    
    for arg in "$@"; do
        case $arg in
            --all)
                RUN_ALL=true
                ;;
            --module=*)
                MODULE="${arg#*=}"
                ;;
            --help|-h)
                echo "使用方法: $0 [选项]"
                echo ""
                echo "选项:"
                echo "  --all           运行所有测试"
                echo "  --module=<name> 运行指定模块 (auth, reviews, ai-reply, subscription)"
                echo "  --help, -h      显示帮助"
                echo ""
                echo "示例:"
                echo "  $0              # 运行认证测试示例"
                echo "  $0 --all        # 运行所有测试"
                echo "  $0 --module=auth # 只运行认证测试"
                exit 0
                ;;
        esac
    done
    
    # 检查服务器
    if ! check_server; then
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}开始运行测试...${NC}"
    echo ""
    
    # 定义测试模块
    AUTH_TEST="__tests__/e2e/auth.test.ts"
    REVIEWS_TEST="__tests__/e2e/reviews.test.ts"
    AI_REPLY_TEST="__tests__/e2e/ai-reply.test.ts"
    SUBSCRIPTION_TEST="__tests__/e2e/subscription.test.ts"
    
    if [ "$RUN_ALL" = true ]; then
        # 运行所有测试
        run_vitest "$AUTH_TEST" "用户认证"
        run_vitest "$REVIEWS_TEST" "评价管理"
        run_vitest "$AI_REPLY_TEST" "AI生成回复"
        run_vitest "$SUBSCRIPTION_TEST" "订阅购买"
    elif [ -n "$MODULE" ]; then
        # 运行指定模块
        case $MODULE in
            auth)
                run_vitest "$AUTH_TEST" "用户认证"
                ;;
            reviews)
                run_vitest "$REVIEWS_TEST" "评价管理"
                ;;
            ai-reply)
                run_vitest "$AI_REPLY_TEST" "AI生成回复"
                ;;
            subscription)
                run_vitest "$SUBSCRIPTION_TEST" "订阅购买"
                ;;
            *)
                echo -e "${RED}未知模块: ${MODULE}${NC}"
                echo "可用模块: auth, reviews, ai-reply, subscription"
                exit 1
                ;;
        esac
    else
        # 默认运行认证测试示例
        echo "运行认证测试（示例）"
        echo "使用 --all 参数运行所有测试"
        echo "使用 --module=<name> 运行指定模块"
        echo ""
        echo "可用模块:"
        echo "  - auth"
        echo "  - reviews"
        echo "  - ai-reply"
        echo "  - subscription"
        echo ""
        
        run_vitest "$AUTH_TEST" "用户认证"
    fi
    
    echo ""
    echo "=========================================="
    echo -e "${GREEN}所有测试完成！${NC}"
    echo "=========================================="
}

main "$@"
