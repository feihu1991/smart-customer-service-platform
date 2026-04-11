import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 通用工具函数：将数据转为CSV格式
function convertToCSV(data: Record<string, unknown>[], headers: Record<string, string>): string {
  const headerRow = Object.values(headers).join(',')
  const rows = data.map(row => {
    return Object.keys(headers).map(key => {
      const value = row[key]
      if (value === null || value === undefined) return ''
      const str = String(value)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',')
  })
  return [headerRow, ...rows].join('\n')
}

// GET /api/export/replies - 导出回复数据
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const format = searchParams.get('format') || 'csv'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const type = searchParams.get('type')

    // 构建查询条件
    const where: Record<string, unknown> = {}
    if (shopId) {
      where.review = { shopId }
    }
    if (type) where.type = type
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    // 获取数据
    const replies = await db.reviewReply.findMany({
      where,
      include: {
        review: {
          include: {
            product: {
              select: { id: true, title: true },
            },
            shop: {
              select: { id: true, name: true },
            },
          },
        },
        quality: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // 转换为导出格式
    const exportData = replies.map(reply => ({
      id: reply.id,
      shopName: reply.review.shop.name,
      productTitle: reply.review.product.title,
      reviewRating: reply.review.rating,
      reviewContent: reply.review.content.substring(0, 50),
      replyContent: reply.content,
      replyType: reply.type === 'ai_generated' ? 'AI生成' : reply.type === 'manual' ? '手动回复' : '模板回复',
      isSent: reply.isSent ? '已发送' : '未发送',
      aiScore: reply.aiScore ? reply.aiScore.toFixed(1) : '',
      qualityScore: reply.quality?.score || '',
      qualityRelevance: reply.quality?.relevance || '',
      qualityPoliteness: reply.quality?.politeness || '',
      qualityProfessionalism: reply.quality?.professionalism || '',
      qualityRecoveryPotential: reply.quality?.recoveryPotential || '',
      isLowQuality: reply.quality?.isLowQuality ? '是' : '否',
      createdAt: new Date(reply.createdAt).toLocaleString('zh-CN'),
    }))

    // CSV表头映射
    const headers = {
      id: '回复ID',
      shopName: '店铺名称',
      productTitle: '商品名称',
      reviewRating: '评价评分',
      reviewContent: '评价内容',
      replyContent: '回复内容',
      replyType: '回复类型',
      isSent: '发送状态',
      aiScore: 'AI评分',
      qualityScore: '质量评分',
      qualityRelevance: '相关性',
      qualityPoliteness: '礼貌度',
      qualityProfessionalism: '专业性',
      qualityRecoveryPotential: '挽回潜力',
      isLowQuality: '低质量标记',
      createdAt: '创建时间',
    }

    if (format === 'csv') {
      const csv = convertToCSV(exportData, headers)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="replies-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: exportData,
      total: exportData.length,
    })
  } catch (error) {
    console.error('Export replies error:', error)
    return NextResponse.json(
      { success: false, message: '导出回复数据失败' },
      { status: 500 }
    )
  }
}
