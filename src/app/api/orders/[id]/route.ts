import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const order = await db.order.findUnique({
      where: { id },
      include: {
        product: {
          select: { id: true, title: true, imageUrl: true, price: true },
        },
        shop: {
          select: { id: true, name: true },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, message: '订单不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: order })
  } catch (error) {
    console.error('Get order error:', error)
    return NextResponse.json(
      { success: false, message: '获取订单详情失败' },
      { status: 500 }
    )
  }
}
