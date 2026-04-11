import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

// 辅助函数：验证店铺所有权
async function verifyShopOwnership(shopId: string, userId: string) {
  const shop = await db.shop.findUnique({
    where: { id: shopId },
  })
  return shop && shop.userId === userId
}

// GET /api/shops/[id] - 获取单个店铺详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ success: false, message: '未登录' }, { status: 401 })
    }

    const session = await verifyToken(token)
    if (!session) {
      return NextResponse.json({ success: false, message: '登录已过期' }, { status: 401 })
    }

    // 验证店铺所有权
    const isOwner = await verifyShopOwnership(id, session.userId)
    if (!isOwner) {
      return NextResponse.json({ success: false, message: '无权访问该店铺' }, { status: 403 })
    }

    const shop = await db.shop.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            reviews: true,
            orders: true,
            chatSessions: true,
            products: true,
          },
        },
      },
    })

    if (!shop) {
      return NextResponse.json({ success: false, message: '店铺不存在' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: shop })
  } catch (error) {
    console.error('Get shop error:', error)
    return NextResponse.json({ success: false, message: '获取店铺信息失败' }, { status: 500 })
  }
}

// PUT /api/shops/[id] - 更新店铺
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ success: false, message: '未登录' }, { status: 401 })
    }

    const session = await verifyToken(token)
    if (!session) {
      return NextResponse.json({ success: false, message: '登录已过期' }, { status: 401 })
    }

    // 验证店铺所有权
    const isOwner = await verifyShopOwnership(id, session.userId)
    if (!isOwner) {
      return NextResponse.json({ success: false, message: '无权操作该店铺' }, { status: 403 })
    }

    const body = await request.json()
    const { name, platform, shopId, logo, status, isActive } = body

    const shop = await db.shop.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(platform !== undefined && { platform }),
        ...(shopId !== undefined && { shopId }),
        ...(logo !== undefined && { logo }),
        ...(status !== undefined && { status }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json({
      success: true,
      message: '店铺更新成功',
      data: shop,
    })
  } catch (error) {
    console.error('Update shop error:', error)
    return NextResponse.json({ success: false, message: '更新店铺失败' }, { status: 500 })
  }
}

// DELETE /api/shops/[id] - 删除店铺
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ success: false, message: '未登录' }, { status: 401 })
    }

    const session = await verifyToken(token)
    if (!session) {
      return NextResponse.json({ success: false, message: '登录已过期' }, { status: 401 })
    }

    // 验证店铺所有权
    const isOwner = await verifyShopOwnership(id, session.userId)
    if (!isOwner) {
      return NextResponse.json({ success: false, message: '无权删除该店铺' }, { status: 403 })
    }

    await db.shop.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: '店铺删除成功',
    })
  } catch (error) {
    console.error('Delete shop error:', error)
    return NextResponse.json({ success: false, message: '删除店铺失败' }, { status: 500 })
  }
}
