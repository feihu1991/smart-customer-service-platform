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
    return NextResponse.json(sessions)
  } catch (error) {
    return NextResponse.json({ error: '获取聊天失败' }, { status: 500 })
  }
}
