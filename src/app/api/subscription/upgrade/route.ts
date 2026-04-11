/**
 * 订阅升级API
 * POST /api/subscription/upgrade - 升级用户套餐
 * 
 * 需要在请求头或cookie中携带token
 * 
 * 请求体:
 * {
 *   planId: string,      // 目标套餐ID
 *   billingCycle: 'monthly' | 'yearly'  // 计费周期
 * }
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { addDays, addMonths, addYears } from 'date-fns'

export async function POST(request: NextRequest) {
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
    const body = await request.json()
    const { planId, billingCycle = 'monthly' } = body

    // 验证必填字段
    if (!planId) {
      return NextResponse.json(
        { success: false, message: '请选择要升级的套餐' },
        { status: 400 }
      )
    }

    // 获取目标套餐
    const targetPlan = await db.subscriptionPlan.findUnique({
      where: { id: planId },
    })

    if (!targetPlan) {
      return NextResponse.json(
        { success: false, message: '套餐不存在' },
        { status: 404 }
      )
    }

    if (!targetPlan.isActive) {
      return NextResponse.json(
        { success: false, message: '该套餐已停售' },
        { status: 400 }
      )
    }

    // 获取当前用户
    const user = await db.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      )
    }

    // 免费版不能升级到免费版
    if (targetPlan.tier === 'free' && user.subscriptionTier === 'free') {
      return NextResponse.json(
        { success: false, message: '您已经是免费版用户' },
        { status: 400 }
      )
    }

    // 计算订阅时长和价格
    const now = new Date()
    let endDate: Date
    let price: number

    if (billingCycle === 'yearly' && targetPlan.priceYearly) {
      endDate = addYears(now, 1)
      price = targetPlan.priceYearly
    } else {
      endDate = addMonths(now, 1)
      price = targetPlan.price
    }

    // 如果当前有有效的订阅，更新订阅到期时间
    let newExpireAt = endDate
    if (user.subscriptionExpireAt && new Date(user.subscriptionExpireAt) > now) {
      if (billingCycle === 'yearly' && targetPlan.priceYearly) {
        newExpireAt = addYears(new Date(user.subscriptionExpireAt), 1)
      } else {
        newExpireAt = addMonths(new Date(user.subscriptionExpireAt), 1)
      }
    }

    // 更新用户订阅信息
    await db.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: targetPlan.tier as any,
        planId: targetPlan.id,
        subscriptionStatus: 'active',
        subscriptionExpireAt: newExpireAt,
        dailyLimit: targetPlan.dailyLimit,
        dailyUsageCount: 0, // 重置每日使用次数
        lastUsageDate: now,
      },
    })

    // 创建订阅记录
    const subscription = await db.subscription.create({
      data: {
        userId,
        tier: targetPlan.tier as any,
        status: 'active',
        startDate: now,
        endDate: newExpireAt,
        autoRenew: true,
        dailyLimit: targetPlan.dailyLimit,
        price: price,
      },
    })

    return NextResponse.json({
      success: true,
      message: '订阅升级成功',
      data: {
        subscription: {
          id: subscription.id,
          tier: subscription.tier,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          autoRenew: subscription.autoRenew,
          price: subscription.price,
        },
        plan: {
          id: targetPlan.id,
          tier: targetPlan.tier,
          name: targetPlan.name,
          description: targetPlan.description,
          price: targetPlan.price,
          priceYearly: targetPlan.priceYearly,
          dailyLimit: targetPlan.dailyLimit,
          shopLimit: targetPlan.shopLimit,
          features: JSON.parse(targetPlan.features || '[]'),
        },
        user: {
          subscriptionTier: targetPlan.tier,
          subscriptionStatus: 'active',
          subscriptionExpireAt: newExpireAt,
          dailyLimit: targetPlan.dailyLimit,
        },
      },
    })
  } catch (error) {
    console.error('Subscription upgrade error:', error)
    return NextResponse.json(
      { success: false, message: '订阅升级失败' },
      { status: 500 }
    )
  }
}
