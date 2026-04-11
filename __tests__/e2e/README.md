# E2E 测试套件

智能客服平台的端到端测试覆盖。

## 测试覆盖范围

### 1. 用户认证 (auth.test.ts)
- ✅ 用户注册
- ✅ 用户登录（密码登录）
- ✅ 用户登录（验证码登录）
- ✅ 获取用户信息
- ✅ 用户登出
- ✅ 登录失败场景
- ✅ Token 验证

### 2. 评价管理 (reviews.test.ts)
- ✅ 获取评价列表
- ✅ 获取单个评价详情
- ✅ 评价筛选和分页
- ✅ 按平台筛选（淘宝/天猫/京东/拼多多）
- ✅ 按情感倾向筛选（好评/中评/差评）
- ✅ 按回复状态筛选
- ✅ 评价回复状态批量更新
- ✅ 评价列表缓存测试

### 3. AI生成回复 (ai-reply.test.ts)
- ✅ AI生成回复基础测试
- ✅ 不同回复风格（真诚/专业/补偿）
- ✅ 自定义回复指令
- ✅ 差评类型分析
- ✅ 质量问题识别
- ✅ 物流问题识别
- ✅ 服务问题识别
- ✅ 描述不符问题识别
- ✅ 使用次数限制
- ✅ 回复质量评估
- ✅ 错误处理

### 4. 订阅购买 (subscription.test.ts)
- ✅ 获取套餐列表
- ✅ 套餐基础信息验证
- ✅ 套餐排序
- ✅ 套餐列表缓存
- ✅ 获取用户订阅信息
- ✅ 每日使用限制
- ✅ 订阅升级
- ✅ 订单管理
- ✅ 订阅取消
- ✅ 使用量统计

### 5. Playwright UI 测试
- ✅ 登录页面加载
- ✅ 登录表单验证
- ✅ 评价页面功能
- ✅ AI回复生成UI
- ✅ 评价筛选功能
- ✅ 订阅页面功能
- ✅ 套餐购买流程

## 运行测试

### 方式一：独立运行脚本（推荐）

```bash
# 运行所有测试
node __tests__/e2e/simple-runner.js

# 运行指定模块
node __tests__/e2e/simple-runner.js --module=auth
node __tests__/e2e/simple-runner.js --module=reviews
node __tests__/e2e/simple-runner.js --module=ai-reply
node __tests__/e2e/simple-runner.js --module=subscription

# 显示帮助
node __tests__/e2e/simple-runner.js --help
```

### 方式二：使用 Shell 脚本

```bash
# 添加执行权限
chmod +x run-e2e-tests.sh

# 运行所有测试
./run-e2e-tests.sh --all

# 运行指定模块
./run-e2e-tests.sh --module=auth
./run-e2e-tests.sh --module=reviews
./run-e2e-tests.sh --module=ai-reply
./run-e2e-tests.sh --module=subscription
```

### 方式三：使用 Vitest（需要配置）

```bash
# 安装 Vitest（如果尚未安装）
npm install -D vitest @playwright/test

# 运行所有测试
npx vitest run __tests__/e2e

# 运行指定测试文件
npx vitest run __tests__/e2e/auth.test.ts

# 开发模式（watch）
npx vitest __tests__/e2e
```

### 方式四：Playwright UI 测试

```bash
# 安装 Playwright
npm install -D @playwright/test
npx playwright install

# 运行 UI 测试
npx playwright test

# 运行指定 UI 测试
npx playwright test __tests__/e2e/playwright/login.spec.ts
```

## 前置要求

1. **启动开发服务器**
   ```bash
   npm run dev
   ```

2. **环境变量**（可选）
   ```bash
   # 设置 API URL
   export E2E_API_URL=http://localhost:3000/api
   
   # 设置基础 URL（Playwright）
   export E2E_BASE_URL=http://localhost:3000
   ```

## 测试配置

测试配置文件位于 `__tests__/e2e/config.ts`：

```typescript
export const E2E_CONFIG = {
  baseUrl: process.env.E2E_BASE_URL || 'http://localhost:3000',
  apiBaseUrl: process.env.E2E_API_URL || 'http://localhost:3000/api',
  timeout: 30000,
  retries: 3,
};
```

## 测试用户

测试使用动态生成的手机号，避免冲突：

```typescript
// 测试凭证（用于注册新用户）
export const TEST_USERS = {
  phone: '13800138000',      // 会被动态修改
  password: 'test123456',
  verificationCode: '123456', // 测试验证码
};
```

## 测试数据

测试数据在 `__tests__/e2e/config.ts` 中定义：

```typescript
export const TEST_DATA = {
  review: {
    platform: 'taobao',
    orderId: 'test_order_001',
    // ...
  },
  subscription: {
    packageId: 'test_package_001',
    cycle: 'month',
  },
};
```

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Setup database
        run: |
          npx prisma db push
          npm run db:seed
          
      - name: Start server
        run: npm run dev &
        
      - name: Wait for server
        run: npx wait-on http://localhost:3000 --timeout 60000
        
      - name: Run E2E tests
        run: node __tests__/e2e/simple-runner.js
        
      - name: Upload results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: test-results/
```

## 扩展测试

### 添加新的测试模块

1. 创建新的测试文件：
   ```typescript
   // __tests__/e2e/new-module.test.ts
   import { describe, it, expect } from 'vitest';
   
   describe('新模块', () => {
     it('应该...', async () => {
       // 测试代码
     });
   });
   ```

2. 更新配置和运行脚本

### 添加 Playwright 测试

1. 在 `__tests__/e2e/playwright/` 目录下创建测试文件：
   ```typescript
   // __tests__/e2e/playwright/new-page.spec.ts
   import { test, expect } from '@playwright/test';
   
   test('新页面测试', async ({ page }) => {
     await page.goto('/new-page');
     // 测试代码
   });
   ```

2. 更新 `playwright.config.ts`

## 故障排除

### 服务器未启动
```
❌ 服务器连接失败
请确保开发服务器正在运行 (npm run dev)
```

**解决方案**：
```bash
npm run dev
# 在另一个终端运行测试
node __tests__/e2e/simple-runner.js
```

### 测试超时
测试默认超时时间为 30 秒，可以在配置中调整：

```typescript
export const E2E_CONFIG = {
  // ...
  timeout: 60000, // 增加到 60 秒
};
```

### 数据库未初始化
```
Error: PrismaClientKnownRequestError
```

**解决方案**：
```bash
npx prisma db push
npm run db:seed
```

## 贡献指南

编写新的 E2E 测试时请遵循以下原则：

1. **独立性**：每个测试应该能独立运行
2. **可重复**：测试应该可以多次运行而不失败
3. **清晰命名**：测试名称应该描述测试内容
4. **适当的断言**：使用有意义的断言消息
5. **错误处理**：处理可能的错误场景

## 许可证

与主项目相同
