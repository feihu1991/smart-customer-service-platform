# 智能客服平台 — 迭代分析与修复计划

**日期：** 2026-04-18
**状态：** 待执行

---

## 一、项目概述

本项目是一个 **AI 驱动的淘宝智能客服工作台**，面向电商卖家，核心价值是利用大语言模型自动生成针对差评的高质量回复，帮助卖家挽回客户满意度。

**项目定位：** SaaS 模式的智能客服工具，支持多店铺管理、订阅付费、数据报表等完整的商业功能。

---

## 二、技术栈

| 层级 | 技术选型 |
|------|----------|
| 框架 | Next.js 16 (App Router) + React 19 + TypeScript 5 |
| 样式 | Tailwind CSS 4 + shadcn/ui (Radix UI) |
| 数据库 | Prisma ORM 6.11 + SQLite |
| AI/LLM | 小米 LLM API (`lh-llama3-8b-instruct-adapter`) + Z.ai/GLM SDK |
| 认证 | 自建 Session 认证（UUID Token + Cookie/Bearer） |
| 状态管理 | Zustand + React Context |
| 数据表格 | @tanstack/react-table |
| 表单 | react-hook-form + zod |
| 图表 | Recharts |
| 动画 | Framer Motion |
| 拖拽 | @dnd-kit |
| 运行时 | Bun |

---

## 三、已实现功能模块

| 模块 | 状态 | 说明 |
|------|------|------|
| 数据看板 | 已完成 | KPI 概览、7天趋势图、差评分类分布、实时统计 |
| 评价管理 | 已完成 | 筛选/排序/批量操作、情感标注、AI 回复对话框（3种风格） |
| AI 智能回复 | 已完成 | 情感分析、分类识别、3种回复方案、5维质量评分 |
| 实时聊天 | 已完成 | 模拟旺旺聊天、GLM 自动回复、会话历史 |
| 订单管理 | 已完成 | 订单列表、状态跟踪、物流信息（模拟） |
| 回复模板 | 已完成 | 分类 CRUD、使用统计、内置模板 |
| 多店铺管理 | 已完成 | 多店铺切换、平台标识 |
| 用户认证 | 已完成 | 手机号登录/注册、Session 管理 |
| 订阅付费 | 部分完成 | 4档套餐定义完成，支付流程因缺少依赖而断裂 |
| 数据导出 | 已完成 | 评价、回复、分析数据导出 |
| 数据报表 | 已完成 | 趋势分析、分类统计、挽回追踪、质量评估 |
| 移动端适配 | 已完成 | 响应式布局、触屏优化、PWA 支持 |

---

## 四、已知问题清单

### Critical（必须修复）

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| C1 | `SubscriptionPlan` 模型重复定义 3 次 | `prisma/schema.prisma:218-275` | Prisma 生成失败或行为异常 |
| C2 | `@/lib/alipay.ts` 不存在 | `src/app/api/payment/create/route.ts:11` | 支付创建 API 报错崩溃 |
| C3 | `@/lib/payment.ts` 不存在 | `src/app/api/payment/create/route.ts:12` | 支付创建 API 报错崩溃 |
| C4 | `db.payment.create` 调用 Payment 模型不存在 | `src/app/api/payment/create/route.ts:56` | schema 中无 Payment 模型，支付记录无法创建 |

### Important（应该修复）

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| I1 | 密码使用 base64 编码，非 bcrypt | `src/lib/auth.ts:16-19` | 安全性极弱，容易被破解 |
| I2 | 短信验证码硬编码为 `123456` | 登录逻辑 | 任何人可用任意手机号登录 |
| I3 | JWT Secret 硬编码在代码中 | `src/lib/auth.ts:10` | 生产环境 Token 可被伪造 |

### Minor（建议修复）

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| M1 | `skills/` 目录包含 50+ 无关技能定义 | 项目根目录 | 增加仓库体积，造成混淆 |
| M2 | `.zscripts/dev.pid` 被提交到仓库 | `.zscripts/` | 运行时文件不应入库 |
| M3 | `download/` 目录包含大量临时缓存文件 | `download/` | 应清理或加入 .gitignore |

---

## 五、详细迭代步骤

### 迭代 1：修复 Schema 数据模型（Critical）

**目标：** 修复 `prisma/schema.prisma` 中的所有定义问题

**步骤：**

1. 删除 `schema.prisma` 中第 237-275 行重复的两个 `SubscriptionPlan` 模型定义，仅保留第 218-235 行的定义
2. 在 schema 中新增 `Payment` 模型（用于支付创建 API）：

```prisma
model Payment {
  id         String   @id @default(cuid())
  orderId    String   @unique
  userId     String
  planId     String
  planTier   String
  amount     Float
  billingCycle String @default("monthly")
  status     String   @default("pending") // pending/paid/failed/expired
  expireAt   DateTime
  paidAt     DateTime?
  transactionId String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  user       User     @relation(fields: [userId], references: [id])
}
```

3. 在 `User` 模型中添加 `payments Payment[]` 关联字段
4. 运行 `npx prisma generate` 验证 schema 语法正确
5. 运行 `npx prisma db push` 推送变更到数据库

**验证：** `npx prisma generate` 无报错，`npx prisma db push` 成功

---

### 迭代 2：补全支付依赖模块（Critical）

**目标：** 创建缺失的 `lib/alipay.ts` 和 `lib/payment.ts`，使支付流程可用

**步骤：**

1. 创建 `src/lib/alipay.ts`：
   - 导出 `isAlipayConfigured()` — 检查环境变量中是否有支付宝配置
   - 导出 `isSandbox()` — 判断是否为沙箱模式
   - 检查环境变量 `ALIPAY_APP_ID`、`ALIPAY_PRIVATE_KEY`、`ALIPAY_PUBLIC_KEY`

2. 创建 `src/lib/payment.ts`：
   - 导出 `generateOrderId()` — 生成 `PAY + 时间戳 + 随机数` 格式订单号
   - 导出 `calculateExpireTime(minutes: number)` — 计算订单过期时间

3. 修复 `src/app/api/payment/create/route.ts` 中 `db.payment` 的引用（确认为 `db.payment`，因为 Payment 模型已在迭代 1 中添加）

**验证：** 访问 `POST /api/payment/create` 不再报 module not found 错误

---

### 迭代 3：安全加固（Important）

**目标：** 提升认证安全性

**步骤：**

1. 安装 bcrypt：`bun add bcrypt && bun add -d @types/bcrypt`
2. 修改 `src/lib/auth.ts`：
   - `hashPassword()` 改用 `bcrypt.hashSync(password, 10)`
   - `verifyPassword()` 改用 `bcrypt.compareSync(password, hash)`
   - 注意：已有用户密码需要迁移（可通过创建迁移脚本或让用户重新注册）
3. 将 JWT Secret 从硬编码改为仅从环境变量读取，缺失时开发环境警告：
   ```ts
   const JWT_SECRET = process.env.JWT_SECRET
   if (!JWT_SECRET) {
     console.warn('[Auth] JWT_SECRET 未设置，使用不安全的默认值（仅限开发环境）')
   }
   ```
4. 修改短信验证码逻辑：不再硬编码，改为生成随机 6 位数字并存入数据库（可暂时打印到 console 日志，后续接入真实短信服务）

**验证：** 新注册用户密码使用 bcrypt 加密；JWT_SECRET 缺失时有警告日志

---

### 迭代 4：代码仓库清理（Minor）

**目标：** 清理不必要的文件，优化仓库结构

**步骤：**

1. 更新 `.gitignore`，添加：
   ```
   .zscripts/dev.pid
   download/
   skills/
   db/*.db
   ```
2. 从 Git 追踪中移除这些文件（`git rm --cached`）
3. 清理 `download/` 目录中与项目无关的缓存 JSON 文件
4. 确认 `skills/` 目录（50+ 无关技能）是否可以安全移除

**验证：** `git status` 干净，无关文件不再被追踪

---

### 迭代 5：功能验证与回归测试

**目标：** 确保所有修复后功能正常

**步骤：**

1. 启动开发服务器 `bun dev`
2. 验证注册/登录流程（新密码加密方式）
3. 验证 AI 回复生成功能（使用次数限制是否正常）
4. 验证支付创建 API（沙箱模式）
5. 验证订阅套餐页面数据正常展示
6. 验证评价管理、聊天、订单等核心功能无回归
7. 检查浏览器控制台和终端无报错

**验证：** 所有核心功能正常运行，无 JS/TS 编译错误

---

### 迭代 6：文档更新

**目标：** 同步更新项目文档

**步骤：**

1. 更新 `DEPLOYMENT_GUIDE.md`：
   - 更新安全相关说明（bcrypt、JWT_SECRET 配置）
   - 添加 Payment 模型说明
   - 更新 .env 示例添加 ALIPAY 相关配置
2. 更新 `docs/plans/2026-04-10-smart-cs-platform-design.md`：
   - 补充 Payment 和 SubscriptionPlan 数据模型
   - 更新非目标（已支持用户认证和支付）
3. 确认迭代文档（本文档）为最终版本

**验证：** 文档与代码实际状态一致

---

## 六、迭代优先级与依赖关系

```
迭代 1 (Schema修复)  ← 必须最先执行
       ↓
迭代 2 (支付模块)    ← 依赖迭代 1
       ↓
迭代 3 (安全加固)    ← 独立，可与迭代 2 并行
       ↓
迭代 4 (仓库清理)    ← 独立
       ↓
迭代 5 (验证测试)    ← 依赖迭代 1-4
       ↓
迭代 6 (文档更新)    ← 依赖迭代 5
```

**建议执行顺序：** 迭代 1 → 迭代 2 → 迭代 3 → 迭代 4 → 迭代 5 → 迭代 6
