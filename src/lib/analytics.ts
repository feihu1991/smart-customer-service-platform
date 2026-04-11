// 简单的事件埋点工具
// 内存存储，可用于开发环境

interface Event {
  id: string
  userId?: string
  event: string
  data?: Record<string, any>
  timestamp: Date
}

// 内存存储
const events: Event[] = []

// 生成唯一ID
function generateId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 记录事件
export function trackEvent(
  event: string,
  data?: Record<string, any>,
  userId?: string
): Event {
  const evt: Event = {
    id: generateId(),
    userId,
    event,
    data,
    timestamp: new Date()
  }
  events.push(evt)
  console.log('[Analytics]', event, data || {})
  return evt
}

// 获取所有事件
export function getEvents(limit = 100): Event[] {
  return events.slice(-limit)
}

// 按事件类型统计
export function getEventStats(): Record<string, number> {
  const stats: Record<string, number> = {}
  for (const evt of events) {
    stats[evt.event] = (stats[evt.event] || 0) + 1
  }
  return stats
}

// 按用户统计
export function getUserStats(userId: string): Record<string, number> {
  const stats: Record<string, number> = {}
  for (const evt of events) {
    if (evt.userId === userId) {
      stats[evt.event] = (stats[evt.event] || 0) + 1
    }
  }
  return stats
}

// 清除事件
export function clearEvents(): void {
  events.length = 0
}

// 常用事件类型
export const EventTypes = {
  PAGE_VIEW: 'page_view',
  BUTTON_CLICK: 'button_click',
  API_CALL: 'api_call',
  LOGIN: 'login',
  LOGOUT: 'logout',
  REVIEW_VIEW: 'review_view',
  REPLY_GENERATE: 'reply_generate',
  SUBSCRIPTION_START: 'subscription_start',
} as const
