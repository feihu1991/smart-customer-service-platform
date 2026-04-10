/**
 * 获取当前用户信息API
 * GET /api/auth/me
 * 
 * 需要在请求头或cookie中携带token
 */
import { NextRequest, NextResponse } from 'next/server'
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

    return NextResponse.json({
      success: true,
      data: {
        user: session.user,
        token,
      },
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { success: false, message: '获取用户信息失败' },
      { status: 500 }
    )
  }
}
