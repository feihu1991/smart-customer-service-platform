import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')

    const where: Prisma.OrderWhereInput = {}
    if (shopId) where.shopId = shopId
    if (status) where.status = status

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        include: {
          product: {
            select: { id: true, title: true, imageUrl: true, price: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.order.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('Get orders error:', error)
    return NextResponse.json(
      { success: false, message: '获取订单列表失败' },
      { status: 500 }
    )
  }
}
