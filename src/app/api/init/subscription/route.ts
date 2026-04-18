/**
 * 初始化订阅套餐数据
 * POST /api/init/subscription
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

// 默认套餐配置
const defaultPlans = [
  {
    tier: 'free' as const,
    name: '免费版',
    description: '适合个人用户体验基础功能',
    price: 0,
    priceYearly: 0,
    dailyLimit: 3,
    shopLimit: 1,
    aiReplyLimit: 3,
    templateLimit: 5,
    features: JSON.stringify([
      '每日3次AI回复',
      '基础评价分析',
      '简单回复模板',
      '单店铺管理',
      '邮件支持'
    ]),
    isActive: true,
    sortOrder: 0,
  },
  {
    tier: 'basic' as const,
    name: '基础版',
    description: '适合小规模店铺运营',
    price: 99,
    priceYearly: 990,
    dailyLimit: 50,
    shopLimit: 3,
    aiReplyLimit: 50,
    templateLimit: 50,
    features: JSON.stringify([
      '每日50次AI回复',
      '优先AI响应',
      '数据报表',
      '多店铺管理',
      '邮件支持',
      '模板推荐'
    ]),
    isActive: true,
    sortOrder: 1,
  },
  {
    tier: 'pro' as const,
    name: '专业版',
    description: '适合中大型店铺批量运营',
    price: 299,
    priceYearly: 2990,
    dailyLimit: 200,
    shopLimit: 10,
    aiReplyLimit: 200,
    templateLimit: -1,
    features: JSON.stringify([
      '每日200次AI回复',
      '优先AI响应',
      '高级数据报表',
      '批量回复',
      '多店铺管理',
      '优先技术支持',
      '模板自定义',
      '回复历史查看'
    ]),
    isActive: true,
    sortOrder: 2,
  },
  {
    tier: 'enterprise' as const,
    name: '企业版',
    description: '适合大型企业全面管理',
    price: 999,
    priceYearly: 9990,
    dailyLimit: -1,
    shopLimit: -1,
    aiReplyLimit: -1,
    templateLimit: -1,
    features: JSON.stringify([
      '无限AI回复',
      '专属客服支持',
      'API接入',
      '定制化服务',
      '私有化部署',
      'SLA保障',
      '高级数据分析',
      '多管理员协作',
      '批量导入导出'
    ]),
    isActive: true,
    sortOrder: 3,
  },
]

export async function POST(request: NextRequest) {
  try {
    // 创建套餐
    const createdPlans = await (db.subscriptionPlan.createMany as any)({
      data: defaultPlans,
      skipDuplicates: true,
    })

    // 创建测试用户
    const freePlan = defaultPlans.find(p => p.tier === 'free')!
    const existingUser = await db.user.findUnique({
      where: { phone: '13800138000' },
    })

    let user = existingUser as NonNullable<typeof existingUser> | Awaited<ReturnType<typeof db.user.create>>
    if (!existingUser) {
      user = await db.user.create({
        data: {
          phone: '13800138000',
          password: hashPassword('123456'),
          name: '测试用户',
          subscriptionTier: 'basic',
          planId: (await db.subscriptionPlan.findUnique({ where: { tier: 'basic' } }))?.id,
          subscriptionStatus: 'active',
          dailyLimit: 50,
        },
      })

      // 创建测试用户的会话
      const session = await db.userSession.create({
        data: {
          userId: user.id,
          token: 'test-token-' + Date.now(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })

      return NextResponse.json({
        success: true,
        message: '初始化成功',
        data: {
          plansCreated: createdPlans.count,
          user: {
            id: user.id,
            phone: user.phone,
            name: user.name,
            token: session.token,
          },
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: '数据已存在',
      data: {
        plansCreated: createdPlans.count,
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
        },
      },
    })
  } catch (error) {
    console.error('Init subscription error:', error)
    return NextResponse.json(
      { success: false, message: '初始化失败', error: String(error) },
      { status: 500 }
    )
  }
}
