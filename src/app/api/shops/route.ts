import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const shops = await db.shop.findMany({
      where: { isActive: true },
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

    return NextResponse.json({ success: true, data: shops })
  } catch (error) {
    console.error('Get shops error:', error)
    return NextResponse.json(
      { success: false, message: '获取店铺列表失败' },
      { status: 500 }
    )
  }
}
