'use client'

import { useCallback } from 'react'
import { EventTypes } from '@/lib/analytics'

// 埋点 Hook
export function useAnalytics() {
  const track = useCallback(async (
    event: string,
    data?: Record<string, any>
  ) => {
    try {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, data })
      })
    } catch (error) {
      console.error('[Analytics] Failed to track:', error)
    }
  }, [])

  const trackPageView = useCallback((page: string) => {
    track(EventTypes.PAGE_VIEW, { page })
  }, [track])

  const trackButtonClick = useCallback((button: string) => {
    track(EventTypes.BUTTON_CLICK, { button })
  }, [track])

  const trackApiCall = useCallback((api: string, success: boolean) => {
    track(EventTypes.API_CALL, { api, success })
  }, [track])

  return {
    track,
    trackPageView,
    trackButtonClick,
    trackApiCall
  }
}
