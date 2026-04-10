# 智能客服平台 P0 版本部署指南

## 📋 版本说明
- **版本**: P0 种子版本
- **日期**: 2024年
- **状态**: 可商用种子版

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/feihu1991/smart-customer-service-platform.git
cd smart-customer-service-platform
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
创建 `.env` 文件（或修改现有文件）：
```env
# 数据库配置
DATABASE_URL=file:./dev.db

# 小米API配置（AI大模型）
XIAOMI_API_KEY=tp-co4w95prj5eftqhfbbafahz21fagbhtm9z6b5vnxycbecztc
XIAOMI_BASE_URL=https://token-plan-cn.xiaomimimo.com/v1
AI_MODEL=xiaomi/lh-llama3-8b-instruct-adapter

# JWT密钥
JWT_SECRET=smart-customer-service-secret-key-2024-p0

NODE_ENV=development
```

### 4. 数据库迁移
```bash
npx prisma generate
npx prisma db push
```

### 5. 创建测试用户
项目启动后，访问：
```
POST http://localhost:3000/api/auth/create-test-user
```
或直接注册新用户。

### 6. 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:3000

---

## 🔐 测试账号

| 手机号 | 密码 | 套餐 |
|--------|------|------|
| 13277091317 | 123456 | 免费版（每日3次） |

**验证码登录**: 123456

---

## 📁 改动文件清单

### 数据库层
| 文件 | 说明 |
|------|------|
| `prisma/schema.prisma` | 新增 User、UserSession、Subscription 模型 |

### 认证模块
| 文件 | 说明 |
|------|------|
| `src/lib/auth.ts` | 认证工具函数（密码哈希、Token验证、次数限制） |
| `src/lib/xiaomi-api.ts` | 小米API调用封装 |
| `src/app/api/auth/register/route.ts` | 用户注册API |
| `src/app/api/auth/login/route.ts` | 用户登录API |
| `src/app/api/auth/logout/route.ts` | 登出API |
| `src/app/api/auth/me/route.ts` | 获取当前用户信息API |
| `src/app/api/auth/create-test-user/route.ts` | 创建测试用户API |
| `src/app/api/usage/route.ts` | 使用次数查询API |

### 业务逻辑
| 文件 | 说明 |
|------|------|
| `src/app/api/reviews/[id]/reply/route.ts` | 重写，添加使用限制和差评挽回优化 |

### 前端页面
| 文件 | 说明 |
|------|------|
| `src/app/(auth)/login/page.tsx` | 登录页面 |
| `src/app/(auth)/register/page.tsx` | 注册页面 |
| `src/app/subscription/page.tsx` | 套餐订阅页面 |

### 上下文和组件
| 文件 | 说明 |
|------|------|
| `src/contexts/auth-context.tsx` | 用户认证上下文 |
| `src/components/layout/header.tsx` | 更新Header，显示用户信息和剩余次数 |

### 配置
| 文件 | 说明 |
|------|------|
| `.env` | 环境变量配置 |
| `.env.example` | 环境变量示例 |

---

## 🗄️ 数据库迁移命令

```bash
# 开发环境
npx prisma generate      # 生成Prisma Client
npx prisma db push       # 推送到数据库（开发用）
# 或
npx prisma migrate dev   # 创建迁移（生产用）

# 生产环境
npx prisma migrate deploy
npx prisma db push --accept-data-loss
```

---

## ✅ 测试验证步骤

### 1. 注册登录测试
- [ ] 访问 http://localhost:3000/login
- [ ] 使用手机号 13277091317 + 密码 123456 登录
- [ ] 或使用验证码登录：任意手机号 + 验证码 123456
- [ ] 登录成功后显示用户信息

### 2. 使用次数测试
- [ ] Header显示剩余次数（应为 3/3）
- [ ] 进入「评价管理」
- [ ] 点击评价的「AI回复」按钮
- [ ] 查看剩余次数是否减少（应为 2/3）
- [ ] 继续使用直到用完，显示次数用尽提示

### 3. AI回复测试
- [ ] 找一个差评（如1-2星评价）
- [ ] 点击「AI回复」
- [ ] 查看生成的回复内容
- [ ] 验证回复是否针对差评类型有优化

### 4. 订阅页面测试
- [ ] 点击Header剩余次数
- [ ] 进入订阅页面
- [ ] 查看套餐列表

---

## 📊 套餐配置

| 套餐 | 每日次数 | 价格 | 功能 |
|------|----------|------|------|
| 免费版 | 3次 | ¥0 | 基础AI回复 |
| 基础版 | 50次 | ¥99/月 | 优先响应、数据报表 |
| 专业版 | 200次 | ¥299/月 | 批量回复、高级报表 |
| 企业版 | 1000次 | ¥999/月 | API接入、定制服务 |

---

## 🔧 后续待办事项

### P1阶段（下一版本）
1. [ ] 接入真实短信验证码服务（阿里云/腾讯云）
2. [ ] 支付功能接入（微信支付/支付宝）
3. [ ] 订阅管理后台
4. [ ] 批量评价回复功能
5. [ ] 数据统计报表完善

### P2阶段
1. [ ] 多店铺管理
2. [ ] 团队协作功能
3. [ ] API开放平台
4. [ ] 私有化部署方案

### 技术优化
1. [ ] 生产环境使用更强的密码加密（bcrypt）
2. [ ] 使用真实的JWT token替代UUID
3. [ ] 添加Redis缓存
4. [ ] 添加操作日志和审计
5. [ ] API限流和防护

---

## 📞 联系方式
- **技术支持**: 132-7709-1317（东哥）
- **客服邮箱**: support@example.com

---

## ⚠️ 注意事项

1. **API Key安全**: 生产环境请勿将真实API Key提交到Git
2. **密码加密**: 当前使用简单base64，生产环境请使用bcrypt
3. **数据库**: 当前使用SQLite，适合小规模使用，大规模请迁移到PostgreSQL
4. **短信服务**: 当前验证码为测试代码123456，需要接入真实短信服务
