/**
 * 取消订阅API
 * POST /api/subscription/cancel - 取消用户订阅
 * 
 * 需要在请求头或cookie中携带token
 * 
 * 请求体:
 * {
 *   cancelImmediately: boolean  // 是否立即取消，false则等到期后自动降级
 * }
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

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
    const body = await request.json().catch(() => ({}))
    const { cancelImmediately = false } = body

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

    // 检查当前订阅状态
    if (user.subscriptionTier === 'free') {
      return NextResponse.json(
        { success: false, message: '您当前是免费版用户，无需取消订阅' },
        { status: 400 }
      )
    }

    // 获取当前订阅记录
    const currentSubscription = await db.subscription.findFirst({
      where: {
        userId,
        status: 'active',
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (cancelImmediately) {
      // 立即取消：更新用户信息为免费版
      await db.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: 'free',
          planId: null,
          subscriptionStatus: 'cancelled',
          subscriptionExpireAt: null,
          dailyLimit: 3,
        },
      })

      // 更新订阅记录
      if (currentSubscription) {
        await db.subscription.update({
          where: { id: currentSubscription.id },
          data: {
            status: 'cancelled',
            autoRenew: false,
            endDate: new Date(),
          },
        })
      }

      return NextResponse.json({
        success: true,
        message: '订阅已立即取消，您已降级为免费版',
        data: {
          previousTier: user.subscriptionTier,
          currentTier: 'free',
          status: 'cancelled',
          effectiveAt: new Date(),
        },
      })
    } else {
      // 取消自动续费：保留当前套餐直到到期
      await db.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: 'cancelled', // 标记为已取消，不再续费
        },
      })

      // 更新订阅记录
      if (currentSubscription) {
        await db.subscription.update({
          where: { id: currentSubscription.id },
          data: {
            autoRenew: false,
          },
        })
      }

      return NextResponse.json({
        success: true,
        message: `订阅已取消自动续费，当前套餐可用至 ${user.subscriptionExpireAt?.toLocaleDateString() || '到期日'}`,
        data: {
          previousTier: user.subscriptionTier,
          currentTier: user.subscriptionTier,
          status: 'cancelled',
          expireAt: user.subscriptionExpireAt,
          effectiveAt: user.subscriptionExpireAt,
        },
      })
    }
  } catch (error) {
    console.error('Subscription cancel error:', error)
    return NextResponse.json(
      { success: false, message: '取消订阅失败' },
      { status: 500 }
    )
  }
}
