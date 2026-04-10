import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const review = await db.review.findUnique({
      where: { id },
      include: {
        product: {
          select: { id: true, title: true, imageUrl: true, price: true },
        },
        shop: {
          select: { id: true, name: true },
        },
        replies: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!review) {
      return NextResponse.json(
        { success: false, message: '评价不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: review })
  } catch (error) {
    console.error('Get review error:', error)
    return NextResponse.json(
      { success: false, message: '获取评价详情失败' },
      { status: 500 }
    )
  }
}
