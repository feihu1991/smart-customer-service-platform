import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const status = searchParams.get('status')

    const where: Prisma.ChatSessionWhereInput = {}
    if (shopId) where.shopId = shopId
    if (status) where.status = status

    const sessions = await db.chatSession.findMany({
      where,
      include: {
        _count: {
          select: { messages: true },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { content: true, createdAt: true, sender: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: sessions })
  } catch (error) {
    console.error('Get chats error:', error)
    return NextResponse.json(
      { success: false, message: '获取聊天会话列表失败' },
      { status: 500 }
    )
  }
}
