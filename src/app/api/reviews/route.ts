import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const rating = searchParams.get('rating')
    const sentiment = searchParams.get('sentiment')
    const category = searchParams.get('category')
    const replyStatus = searchParams.get('replyStatus')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')

    const where: Prisma.ReviewWhereInput = {}
    if (shopId) where.shopId = shopId
    if (rating) where.rating = parseInt(rating)
    if (sentiment) where.sentiment = sentiment
    if (category) where.category = category
    if (replyStatus) where.replyStatus = replyStatus

    const [reviews, total] = await Promise.all([
      db.review.findMany({
        where,
        include: {
          product: {
            select: { id: true, title: true, imageUrl: true, price: true },
          },
          replies: {
            where: { isSent: true },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.review.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: reviews,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('Get reviews error:', error)
    return NextResponse.json(
      { success: false, message: '获取评价列表失败' },
      { status: 500 }
    )
  }
}
