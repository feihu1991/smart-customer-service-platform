import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/analytics/trend - 趋势数据（按天）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const period = searchParams.get('period') || '30' // 7天/30天/全部

    // 计算时间范围
    const days = period === 'all' ? 30 : parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    // 构建基础查询条件
    const baseWhere: Record<string, unknown> = { createdAt: { gte: startDate } }
    if (shopId) baseWhere.shopId = shopId

    // 获取所有符合条件的数据
    const reviews = await db.review.findMany({
      where: baseWhere,
      select: {
        createdAt: true,
        replyStatus: true,
        recoveryStatus: true,
        rating: true,
      },
    })

    // 按天统计
    const trendMap = new Map<string, {
      date: string
      total: number
      replied: number
      recovered: number
      negative: number
      positive: number
    }>()

    // 初始化最近N天的数据
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`
      trendMap.set(dateStr, {
        date: dateStr,
        total: 0,
        replied: 0,
        recovered: 0,
        negative: 0,
        positive: 0,
      })
    }

    // 填充数据
    reviews.forEach(review => {
      const dateStr = `${review.createdAt.getMonth() + 1}/${review.createdAt.getDate()}`
      const dayData = trendMap.get(dateStr)
      if (dayData) {
        dayData.total++
        if (review.replyStatus !== 'pending') {
          dayData.replied++
        }
        if (review.recoveryStatus === 'recovered') {
          dayData.recovered++
        }
        if (review.rating <= 2) {
          dayData.negative++
        } else if (review.rating >= 4) {
          dayData.positive++
        }
      }
    })

    // 转换为数组
    const trendData = Array.from(trendMap.values()).map(day => ({
      ...day,
      replyRate: day.total > 0 ? Math.round((day.replied / day.total) * 100 * 100) / 100 : 0,
      recoveryRate: day.replied > 0 ? Math.round((day.recovered / day.replied) * 100 * 100) / 100 : 0,
    }))

    return NextResponse.json({
      success: true,
      data: {
        period,
        days,
        trendData,
      },
    })
  } catch (error) {
    console.error('Get trend analytics error:', error)
    return NextResponse.json(
      { success: false, message: '获取趋势数据失败' },
      { status: 500 }
    )
  }
}
