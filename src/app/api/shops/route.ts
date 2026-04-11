import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

// 获取用户店铺数量限制
async function getShopLimit(userId: string): Promise<number> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: {
        where: { status: 'active' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!user) return 1

  // 如果有订阅计划，使用套餐限制
  if (user.planId) {
    const plan = await db.subscriptionPlan.findUnique({
      where: { id: user.planId },
    })
    if (plan) return plan.shopLimit
  }

  // 否则使用订阅等级的限制
  const tierLimits: Record<string, number> = {
    free: 1,
    basic: 3,
    pro: 10,
    enterprise: 999,
  }

  return tierLimits[user.subscriptionTier] || 1
}

// GET /api/shops - 获取用户所有店铺
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ success: false, message: '未登录' }, { status: 401 })
    }

    const session = await verifyToken(token)
    if (!session) {
      return NextResponse.json({ success: false, message: '登录已过期' }, { status: 401 })
    }

    const shops = await db.shop.findMany({
      where: { userId: session.userId },
      include: {
        _count: {
          select: {
            reviews: true,
            orders: true,
            chatSessions: true,
            products: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const shopLimit = await getShopLimit(session.userId)

    return NextResponse.json({
      success: true,
      data: {
        shops,
        shopLimit,
        shopCount: shops.length,
      },
    })
  } catch (error) {
    console.error('Get shops error:', error)
    return NextResponse.json({ success: false, message: '获取店铺列表失败' }, { status: 500 })
  }
}

// POST /api/shops - 添加店铺
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ success: false, message: '未登录' }, { status: 401 })
    }

    const session = await verifyToken(token)
    if (!session) {
      return NextResponse.json({ success: false, message: '登录已过期' }, { status: 401 })
    }

    const body = await request.json()
    const { name, platform, shopId, logo } = body

    if (!name || !platform) {
      return NextResponse.json({ success: false, message: '店铺名称和平台不能为空' }, { status: 400 })
    }

    // 检查店铺数量限制
    const currentCount = await db.shop.count({
      where: { userId: session.userId },
    })
    const shopLimit = await getShopLimit(session.userId)

    if (currentCount >= shopLimit) {
      return NextResponse.json({
        success: false,
        message: `店铺数量已达上限（${shopLimit}个），请升级套餐`,
      }, { status: 403 })
    }

    // 创建店铺（使用模拟数据）
    const shop = await db.shop.create({
      data: {
        userId: session.userId,
        name,
        platform,
        shopId: shopId || `mock_${platform}_${Date.now()}`,
        accessToken: `mock_token_${Date.now()}`, // 模拟token
        logo: logo || null,
        status: 'active',
        isActive: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: '店铺添加成功',
      data: shop,
    })
  } catch (error) {
    console.error('Create shop error:', error)
    return NextResponse.json({ success: false, message: '添加店铺失败' }, { status: 500 })
  }
}
