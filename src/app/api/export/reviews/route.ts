import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// 通用工具函数：将数据转为CSV格式
function convertToCSV(data: Record<string, unknown>[], headers: Record<string, string>): string {
  const headerRow = Object.values(headers).join(',')
  const rows = data.map(row => {
    return Object.keys(headers).map(key => {
      const value = row[key]
      if (value === null || value === undefined) return ''
      const str = String(value)
      // 如果包含逗号、引号或换行，需要用引号包裹
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',')
  })
  return [headerRow, ...rows].join('\n')
}

// GET /api/export/reviews - 导出评价数据
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const format = searchParams.get('format') || 'csv'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const rating = searchParams.get('rating')
    const sentiment = searchParams.get('sentiment')
    const replyStatus = searchParams.get('replyStatus')

    // 构建查询条件
    const where: Prisma.ReviewWhereInput = {}
    if (shopId) where.shopId = shopId
    if (rating) where.rating = parseInt(rating)
    if (sentiment) where.sentiment = sentiment
    if (replyStatus) where.replyStatus = replyStatus
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    // 获取数据
    const reviews = await db.review.findMany({
      where,
      include: {
        product: {
          select: { id: true, title: true, price: true },
        },
        shop: {
          select: { id: true, name: true },
        },
        replies: {
          where: { isSent: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // 转换为导出格式
    const exportData = reviews.map(review => ({
      id: review.id,
      shopName: review.shop.name,
      productTitle: review.product.title,
      productPrice: review.product.price,
      buyerName: review.buyerName,
      rating: review.rating,
      content: review.content,
      images: review.images || '',
      sentiment: review.sentiment,
      category: review.category || '',
      replyStatus: review.replyStatus,
      replyContent: review.replies[0]?.content || '',
      replySentAt: review.replySentAt ? new Date(review.replySentAt).toLocaleString('zh-CN') : '',
      recoveryStatus: review.recoveryStatus,
      recoveredAt: review.recoveredAt ? new Date(review.recoveredAt).toLocaleString('zh-CN') : '',
      buyerFeedback: review.buyerFeedback || '',
      createdAt: new Date(review.createdAt).toLocaleString('zh-CN'),
    }))

    // CSV表头映射
    const headers = {
      id: '评价ID',
      shopName: '店铺名称',
      productTitle: '商品名称',
      productPrice: '商品价格',
      buyerName: '买家',
      rating: '评分',
      content: '评价内容',
      images: '评价图片',
      sentiment: '情感倾向',
      category: '分类',
      replyStatus: '回复状态',
      replyContent: '回复内容',
      replySentAt: '回复时间',
      recoveryStatus: '挽回状态',
      recoveredAt: '挽回时间',
      buyerFeedback: '买家反馈',
      createdAt: '创建时间',
    }

    if (format === 'csv') {
      const csv = convertToCSV(exportData, headers)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="reviews-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    // 默认返回JSON
    return NextResponse.json({
      success: true,
      data: exportData,
      total: exportData.length,
    })
  } catch (error) {
    console.error('Export reviews error:', error)
    return NextResponse.json(
      { success: false, message: '导出评价数据失败' },
      { status: 500 }
    )
  }
}
