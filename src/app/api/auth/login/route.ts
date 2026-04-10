/**
 * 用户登录API
 * POST /api/auth/login
 * Body: { phone: string, password?: string, code?: string }
 * 
 * 支持两种登录方式：
 * 1. 手机号+密码登录
 * 2. 手机号+验证码登录（简化版，实际生产应接入短信服务）
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, verifyPassword, createSession } from '@/lib/auth'
import { z } from 'zod'

// 登录请求体验证
const loginSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入正确的手机号'),
  password: z.string().optional(),
  code: z.string().optional(), // 验证码（简化实现，实际生产应接入短信服务）
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 验证请求数据
    const validation = loginSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { phone, password, code } = validation.data

    // 查找用户
    const user = await db.user.findUnique({
      where: { phone },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: '用户不存在，请先注册' },
        { status: 401 }
      )
    }

    // 验证密码或验证码
    // 简化实现：密码登录必须有密码，验证码登录（code=123456为测试验证码）
    if (password) {
      if (!user.password) {
        return NextResponse.json(
          { success: false, message: '该账号未设置密码，请使用验证码登录或设置密码' },
          { status: 401 }
        )
      }
      if (!verifyPassword(password, user.password)) {
        return NextResponse.json(
          { success: false, message: '密码错误' },
          { status: 401 }
        )
      }
    } else if (code) {
      // 简化验证码验证：123456为测试验证码
      // 实际生产应接入短信服务验证
      if (code !== '123456') {
        return NextResponse.json(
          { success: false, message: '验证码错误' },
          { status: 401 }
        )
      }
    } else {
      return NextResponse.json(
        { success: false, message: '请提供密码或验证码' },
        { status: 400 }
      )
    }

    // 创建session并获取token
    const deviceInfo = request.headers.get('User-Agent') || undefined
    const ipAddress = request.headers.get('x-forwarded-for') || undefined
    const token = await createSession(user.id, deviceInfo, ipAddress)

    // 返回用户信息和token
    const response = NextResponse.json({
      success: true,
      message: '登录成功',
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          avatar: user.avatar,
          subscriptionTier: user.subscriptionTier,
          dailyUsageCount: user.dailyUsageCount,
          dailyLimit: user.dailyLimit,
          lastUsageDate: user.lastUsageDate,
        },
        token,
      },
    })

    // 设置cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7天
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, message: '登录失败，请稍后重试' },
      { status: 500 }
    )
  }
}
