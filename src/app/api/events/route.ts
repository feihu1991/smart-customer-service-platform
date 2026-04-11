import { NextRequest, NextResponse } from 'next/server'
import { trackEvent, getEvents, getEventStats } from '@/lib/analytics'

// 记录事件
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event, data, userId } = body
    
    if (!event) {
      return NextResponse.json(
        { error: 'Event name is required' },
        { status: 400 }
      )
    }
    
    const evt = trackEvent(event, data, userId)
    
    return NextResponse.json({ 
      success: true, 
      event: evt 
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    )
  }
}

// 获取事件统计
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  
  if (type === 'stats') {
    return NextResponse.json({ 
      stats: getEventStats(),
      total: getEvents(1000).length
    })
  }
  
  const limit = parseInt(searchParams.get('limit') || '100')
  return NextResponse.json({ 
    events: getEvents(limit) 
  })
}
