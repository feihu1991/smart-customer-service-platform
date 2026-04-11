/**
 * 查询支付订单状态
 * GET /api/payment/[orderId]
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    const userId = request.headers.get('x-user-id')

    const payment = await db.payment.findUnique({ 
      where: { orderId } 
    })

    if (!payment) {
      return NextResponse.json({ 
        success: false, 
        message: '订单不存在' 
      }, { status: 404 })
    }

    // 验证用户权限
    if (userId && payment.userId !== userId) {
      return NextResponse.json({ 
        success: false, 
        message: '无权访问该订单' 
      }, { status: 403 })
    }

    // 获取套餐信息
    const plan = await db.subscriptionPlan.findUnique({ 
      where: { id: payment.planId } 
    })

    const statusMap: Record<string, string> = {
      pending: '待支付',
      paid: '已支付',
      failed: '支付失败',
      refunded: '已退款',
      closed: '已关闭'
    }

    return NextResponse.json({
      success: true,
      data: {
        ...payment,
        statusText: statusMap[payment.status] || payment.status,
        planName: plan?.name,
        planTier: payment.planTier
      }
    })

  } catch (error: any) {
    console.error('[Payment Query] 错误:', error)
    return NextResponse.json({
      success: false,
      message: `查询失败: ${error.message}`
    }, { status: 500 })
  }
}
