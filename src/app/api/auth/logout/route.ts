/**
 * 用户登出API
 * POST /api/auth/logout
 * 
 * 清除当前用户的session
 */
import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, deleteSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)

    if (token) {
      await deleteSession(token)
    }

    const response = NextResponse.json({
      success: true,
      message: '登出成功',
    })

    // 清除cookie
    response.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { success: false, message: '登出失败' },
      { status: 500 }
    )
  }
}
