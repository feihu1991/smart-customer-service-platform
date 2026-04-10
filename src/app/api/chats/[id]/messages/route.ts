import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await db.chatSession.findUnique({
      where: { id },
    })

    if (!session) {
      return NextResponse.json(
        { success: false, message: '聊天会话不存在' },
        { status: 404 }
      )
    }

    const messages = await db.chatMessage.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ success: true, data: messages })
  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json(
      { success: false, message: '获取消息列表失败' },
      { status: 500 }
    )
  }
}
