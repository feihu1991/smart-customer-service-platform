/**
 * 订阅管理API
 * GET /api/subscription - 获取当前用户订阅信息
 * 
 * 需要在请求头或cookie中携带token
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)

    if (!token) {
      return NextResponse.json(
        { success: false, message: '未登录，请先登录' },
        { status: 401 }
      )
    }

    const session = await verifyToken(token)

    if (!session) {
      return NextResponse.json(
        { success: false, message: '登录已过期，请重新登录' },
        { status: 401 }
      )
    }

    const userId = session.userId

    // 获取用户信息
    const user = await db.user.findUnique({
      where: { id: userId },
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
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      )
    }

    // 获取订阅套餐信息
    let plan: Awaited<ReturnType<typeof db.subscriptionPlan.findUnique>> = null
    if (user.planId) {
      plan = await db.subscriptionPlan.findUnique({
        where: { id: user.planId },
      })
    }

    // 如果没有套餐信息，获取free套餐
    if (!plan) {
      plan = await db.subscriptionPlan.findUnique({
        where: { tier: 'free' },
      })
    }

    // 获取订阅历史
    const subscriptions = await db.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // 计算今日剩余次数
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isSameDay = user.lastUsageDate && new Date(user.lastUsageDate) >= today
    const dailyRemaining = isSameDay 
      ? Math.max(0, user.dailyLimit - user.dailyUsageCount)
      : user.dailyLimit

    // 解析套餐功能
    let features: string[] = []
    if (plan?.features) {
      try {
        features = JSON.parse(plan.features)
      } catch {
        features = []
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          subscriptionTier: user.subscriptionTier,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionExpireAt: user.subscriptionExpireAt,
          dailyUsageCount: user.dailyUsageCount,
          dailyLimit: user.dailyLimit,
          dailyRemaining,
          createdAt: user.createdAt,
        },
        plan: plan ? {
          id: plan.id,
          tier: plan.tier,
          name: plan.name,
          description: plan.description,
          price: plan.price,
          priceYearly: plan.priceYearly,
          dailyLimit: plan.dailyLimit,
          shopLimit: plan.shopLimit,
          aiReplyLimit: plan.aiReplyLimit,
          templateLimit: plan.templateLimit,
          features,
          isActive: plan.isActive,
        } : null,
        subscriptions: subscriptions.map(s => ({
          id: s.id,
          tier: s.tier,
          status: s.status,
          startDate: s.startDate,
          endDate: s.endDate,
          autoRenew: s.autoRenew,
          price: s.price,
          createdAt: s.createdAt,
        })),
      },
    })
  } catch (error) {
    console.error('Get subscription error:', error)
    return NextResponse.json(
      { success: false, message: '获取订阅信息失败' },
      { status: 500 }
    )
  }
}
