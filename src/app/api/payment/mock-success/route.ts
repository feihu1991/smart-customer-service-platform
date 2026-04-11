/**
 * 模拟支付成功回调（沙箱测试用）
 * POST /api/payment/mock-success
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateOrderId } from '@/lib/payment'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json({ 
        success: false, 
        message: '缺少订单号' 
      }, { status: 400 })
    }

    // 查找订单
    const payment = await db.payment.findUnique({ 
      where: { orderId } 
    })

    if (!payment) {
      return NextResponse.json({ 
        success: false, 
        message: '订单不存在' 
      }, { status: 404 })
    }

    if (payment.status === 'paid') {
      return NextResponse.json({ 
        success: true, 
        message: '订单已支付',
        data: { 
          orderId: payment.orderId, 
          status: 'paid',
          amount: payment.amount 
        }
      })
    }

    // 更新支付状态为已支付
    const updatedPayment = await db.payment.update({
      where: { id: payment.id },
      data: {
        status: 'paid',
        paidAt: new Date(),
        alipayTradeNo: `SANDBOX_${Date.now()}`,
        alipayBuyerLogonId: 'sandbox@example.com'
      }
    })

    // 更新用户套餐等级
    await db.user.update({
      where: { id: payment.userId },
      data: {
        subscriptionTier: payment.planTier,
        dailyLimit: await getDailyLimit(payment.planId)
      }
    })

    return NextResponse.json({
      success: true,
      message: '模拟支付成功',
      data: {
        orderId: updatedPayment.orderId,
        status: 'paid',
        amount: updatedPayment.amount,
        paidAt: updatedPayment.paidAt
      }
    })

  } catch (error: any) {
    console.error('[Mock Success] 错误:', error)
    return NextResponse.json({
      success: false,
      message: `模拟支付失败: ${error.message}`
    }, { status: 500 })
  }
}

async function getDailyLimit(planId: string): Promise<number> {
  const plan = await db.subscriptionPlan.findUnique({ where: { id: planId } })
  return plan?.dailyLimit || 3
}

// 获取当前可用的套餐限制
async function getPlanLimits(planId: string) {
  const plan = await db.subscriptionPlan.findUnique({ where: { id: planId } })
  return {
    dailyLimit: plan?.dailyLimit || 3,
    shopLimit: plan?.shopLimit || 1,
    templateLimit: plan?.templateLimit || 10
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      description: '模拟支付成功回调（沙箱测试用）',
      method: 'POST',
      body: {
        orderId: 'PAY_xxx 订单号'
      }
    }
  })
}
