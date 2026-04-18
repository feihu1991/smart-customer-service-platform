/**
 * 认证工具函数
 * 提供JWT token生成、验证、密码加密等功能
 */
import { db } from './db'
import { v4 as uuidv4 } from 'uuid'
import { addDays } from 'date-fns'
import bcrypt from 'bcrypt'

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET
const TOKEN_EXPIRY_DAYS = 7

if (!JWT_SECRET) {
  console.warn('[Auth] JWT_SECRET 环境变量未设置，Token 安全性无法保证（仅限开发环境）')
}

const EFFECTIVE_SECRET = JWT_SECRET || 'smart-customer-service-dev-only-key'

/**
 * 密码哈希（使用 bcrypt）
 */
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10)
}

/**
 * 验证密码
 */
export function verifyPassword(password: string, hash: string): boolean {
  // 兼容旧的 base64 编码密码
  const legacyHash = Buffer.from(password + EFFECTIVE_SECRET).toString('base64')
  if (hash === legacyHash) {
    return true
  }
  return bcrypt.compareSync(password, hash)
}

/**
 * 生成会话token
 */
export async function createSession(
  userId: string,
  deviceInfo?: string,
  ipAddress?: string
): Promise<string> {
  const token = uuidv4()
  const expiresAt = addDays(new Date(), TOKEN_EXPIRY_DAYS)

  await db.userSession.create({
    data: {
      userId,
      token,
      deviceInfo,
      ipAddress,
      expiresAt,
    },
  })

  return token
}

/**
 * 验证token并返回用户信息
 */
export async function verifyToken(token: string): Promise<{
  userId: string
  user: {
    id: string
    phone: string
    name: string
    subscriptionTier: string
    planId: string | null
    subscriptionStatus: string
    subscriptionExpireAt: Date | null
    dailyUsageCount: number
    lastUsageDate: Date
    dailyLimit: number
  }
} | null> {
  const session = await db.userSession.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          phone: true,
          name: true,
          subscriptionTier: true,
          planId: true,
          subscriptionStatus: true,
          subscriptionExpireAt: true,
          dailyUsageCount: true,
          lastUsageDate: true,
          dailyLimit: true,
        },
      },
    },
  })

  if (!session) {
    return null
  }

  // 检查token是否过期
  if (new Date() > session.expiresAt) {
    // 删除过期session
    await db.userSession.delete({ where: { id: session.id } })
    return null
  }

  return {
    userId: session.userId,
    user: session.user as any,
  }
}

/**
 * 从请求中获取token
 */
export function getTokenFromRequest(request: Request): string | null {
  // 尝试从 Authorization header 获取
  const authHeader = request.headers.get('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // 尝试从 cookie 获取
  const cookieHeader = request.headers.get('Cookie')
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim())
    const tokenCookie = cookies.find(c => c.startsWith('auth_token='))
    if (tokenCookie) {
      return tokenCookie.split('=')[1]
    }
  }

  // 尝试从 query parameter 获取
  const url = new URL(request.url)
  return url.searchParams.get('token')
}

/**
 * 检查用户使用次数限制
 */
export async function checkUsageLimit(userId: string): Promise<{
  allowed: boolean
  remaining: number
  limit: number
}> {
  const user = await db.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    return { allowed: false, remaining: 0, limit: 0 }
  }

  // 检查是否需要重置每日计数
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  let dailyLimit = user.dailyLimit
  let dailyUsageCount = user.dailyUsageCount
  let lastUsageDate = user.lastUsageDate

  // 如果是不同的一天，重置计数
  if (lastUsageDate < today) {
    dailyUsageCount = 0
    await db.user.update({
      where: { id: userId },
      data: {
        dailyUsageCount: 0,
        lastUsageDate: today,
      },
    })
  }

  // 检查是否有套餐正在生效
  const activeSubscription = await db.subscription.findFirst({
    where: {
      userId,
      status: 'active',
      endDate: { gte: today },
    },
    orderBy: { dailyLimit: 'desc' },
  })

  if (activeSubscription) {
    dailyLimit = activeSubscription.dailyLimit
  }

  const remaining = Math.max(0, dailyLimit - dailyUsageCount)
  const allowed = remaining > 0

  return { allowed, remaining, limit: dailyLimit }
}

/**
 * 增加使用次数
 */
export async function incrementUsage(userId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
  })

  if (!user) return

  // 检查是否需要重置
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  if (user.lastUsageDate < today) {
    await db.user.update({
      where: { id: userId },
      data: {
        dailyUsageCount: 1,
        lastUsageDate: today,
      },
    })
  } else {
    await db.user.update({
      where: { id: userId },
      data: {
        dailyUsageCount: user.dailyUsageCount + 1,
      },
    })
  }
}

/**
 * 删除用户session
 */
export async function deleteSession(token: string): Promise<void> {
  await db.userSession.deleteMany({
    where: { token },
  })
}

/**
 * 删除用户所有session（登出所有设备）
 */
export async function deleteAllUserSessions(userId: string): Promise<void> {
  await db.userSession.deleteMany({
    where: { userId },
  })
}

/**
 * 套餐配置
 */
export const SUBSCRIPTION_PLANS = {
  free: {
    name: '免费版',
    dailyLimit: 3,
    price: 0,
    features: ['每日3次AI回复', '基础评价分析'],
  },
  basic: {
    name: '基础版',
    dailyLimit: 50,
    price: 99,
    features: ['每日50次AI回复', '优先AI响应', '数据报表'],
  },
  pro: {
    name: '专业版',
    dailyLimit: 200,
    price: 299,
    features: ['每日200次AI回复', '优先AI响应', '高级数据报表', '批量回复'],
  },
  enterprise: {
    name: '企业版',
    dailyLimit: 1000,
    price: 999,
    features: ['每日1000次AI回复', '专属客服支持', 'API接入', '定制化服务'],
  },
}
