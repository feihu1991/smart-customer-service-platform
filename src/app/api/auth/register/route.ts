/**
 * 用户注册API
 * POST /api/auth/register
 * Body: { phone: string, password?: string, name?: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createSession } from '@/lib/auth'
import { z } from 'zod'

// 注册请求体验证
const registerSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入正确的手机号'),
  password: z.string().min(6, '密码至少6位').optional(),
  name: z.string().min(1, '姓名不能为空').max(20, '姓名最多20个字符').optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 验证请求数据
    const validation = registerSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { phone, password, name } = validation.data

    // 检查手机号是否已注册
    const existingUser = await db.user.findUnique({
      where: { phone },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: '该手机号已注册，请直接登录' },
        { status: 409 }
      )
    }

    // 创建新用户
    const user = await db.user.create({
      data: {
        phone,
        password: password ? hashPassword(password) : null,
        name: name || '新用户',
        subscriptionTier: 'free',
        dailyUsageCount: 0,
        dailyLimit: 3,
        lastUsageDate: new Date(),
      },
      select: {
        id: true,
        phone: true,
        name: true,
        subscriptionTier: true,
        dailyUsageCount: true,
        dailyLimit: true,
        createdAt: true,
      },
    })

    // 创建session并获取token
    const deviceInfo = request.headers.get('User-Agent') || undefined
    const token = await createSession(user.id, deviceInfo)

    // 设置cookie
    const response = NextResponse.json({
      success: true,
      message: '注册成功',
      data: {
        user,
        token,
      },
    })

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7天
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { success: false, message: '注册失败，请稍后重试' },
      { status: 500 }
    )
  }
}
