/**
 * 使用次数查询API
 * GET /api/usage
 * 
 * 返回当前用户的今日剩余使用次数
 */
import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken, checkUsageLimit } from '@/lib/auth'

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

    const usageInfo = await checkUsageLimit(session.userId)

    return NextResponse.json({
      success: true,
      data: {
        remaining: usageInfo.remaining,
        limit: usageInfo.limit,
        allowed: usageInfo.allowed,
      },
    })
  } catch (error) {
    console.error('Get usage error:', error)
    return NextResponse.json(
      { success: false, message: '获取使用次数失败' },
      { status: 500 }
    )
  }
}
