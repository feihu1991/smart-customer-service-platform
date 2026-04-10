/**
 * 创建测试用户API
 * POST /api/auth/create-test-user
 * 
 * 创建测试用户：13277091317
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const phone = '13277091317'

    // 检查是否已存在
    const existing = await db.user.findUnique({
      where: { phone },
    })

    if (existing) {
      return NextResponse.json({
        success: true,
        message: '测试用户已存在',
        data: {
          phone: existing.phone,
          name: existing.name,
          subscriptionTier: existing.subscriptionTier,
        },
      })
    }

    // 创建测试用户
    const user = await db.user.create({
      data: {
        phone,
        password: hashPassword('123456'),
        name: '东哥',
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

    return NextResponse.json({
      success: true,
      message: '测试用户创建成功',
      data: user,
    })
  } catch (error) {
    console.error('Create test user error:', error)
    return NextResponse.json(
      { success: false, message: '创建失败', error: String(error) },
      { status: 500 }
    )
  }
}
