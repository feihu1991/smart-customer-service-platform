import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const sessions = await db.chatSession.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })
    return NextResponse.json({ success: true, data: sessions })
  } catch (error) {
    console.error('Get chats error:', error)
    return NextResponse.json({ success: false, message: '获取聊天失败' }, { status: 500 })
  }
}
