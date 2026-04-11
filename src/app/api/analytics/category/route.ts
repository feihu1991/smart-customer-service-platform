import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/analytics/category - 分类统计
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const period = searchParams.get('period') || '30'

    // 计算时间范围
    let startDate: Date | undefined
    if (period !== 'all') {
      const days = parseInt(period)
      startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      startDate.setHours(0, 0, 0, 0)
    }

    // 构建基础查询条件
    const baseWhere: Record<string, unknown> = {}
    if (shopId) baseWhere.shopId = shopId
    if (startDate) baseWhere.createdAt = { gte: startDate }

    // 按评价类型分组（好评/中评/差评）
    const byRating = await db.review.groupBy({
      by: ['rating'],
      where: baseWhere,
      _count: true,
    })

    // 按回复状态分组
    const byReplyStatus = await db.review.groupBy({
      by: ['replyStatus'],
      where: baseWhere,
      _count: true,
    })

    // 按挽回状态分组
    const byRecoveryStatus = await db.review.groupBy({
      by: ['recoveryStatus'],
      where: baseWhere,
      _count: true,
    })

    // 按商品类别分组
    const byCategory = await db.review.groupBy({
      by: ['category'],
      where: baseWhere,
      _count: true,
    })

    // 按平台分组
    const shops = await db.shop.findMany({
      where: shopId ? { id: shopId } : {},
      select: { id: true, platform: true },
    })
    const shopMap = new Map(shops.map(s => [s.id, s.platform]))
    
    const reviewsWithPlatform = await db.review.findMany({
      where: baseWhere,
      select: { shopId: true },
    })
    
    const platformCount: Record<string, number> = { taobao: 0, jd: 0, pdd: 0, other: 0 }
    reviewsWithPlatform.forEach(r => {
      const platform = shopMap.get(r.shopId) || 'other'
      if (platform in platformCount) {
        platformCount[platform]++
      } else {
        platformCount.other++
      }
    })

    // 格式化数据
    const formatRating = (rating: number) => {
      if (rating <= 2) return '差评'
      if (rating === 3) return '中评'
      return '好评'
    }

    return NextResponse.json({
      success: true,
      data: {
        period,
        byRating: byRating.map(item => ({
          type: formatRating(item.rating),
          rating: item.rating,
          count: item._count,
          percentage: 0, // 稍后计算
        })),
        byReplyStatus: byReplyStatus.map(item => ({
          status: item.replyStatus,
          label: item.replyStatus === 'pending' ? '待回复' 
            : item.replyStatus === 'replied' ? '已回复' 
            : item.replyStatus === 'skipped' ? '已跳过' : '已归档',
          count: item._count,
        })),
        byRecoveryStatus: byRecoveryStatus.map(item => ({
          status: item.recoveryStatus,
          label: item.recoveryStatus === 'pending' ? '待挽回' 
            : item.recoveryStatus === 'contacted' ? '已联系' 
            : item.recoveryStatus === 'recovered' ? '挽回成功' : '挽回失败',
          count: item._count,
        })),
        byCategory: byCategory.map(item => ({
          category: item.category || '未分类',
          count: item._count,
        })),
        byPlatform: Object.entries(platformCount).map(([platform, count]) => ({
          platform,
          label: platform === 'taobao' ? '淘宝' 
            : platform === 'jd' ? '京东' 
            : platform === 'pdd' ? '拼多多' : '其他',
          count,
        })),
      },
    })
  } catch (error) {
    console.error('Get category analytics error:', error)
    return NextResponse.json(
      { success: false, message: '获取分类数据失败' },
      { status: 500 }
    )
  }
}
