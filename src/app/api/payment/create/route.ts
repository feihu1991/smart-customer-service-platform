/**
 * 创建支付订单
 * POST /api/payment/create
 * 
 * 支持支付宝沙箱：
 * - 如果未配置支付宝，返回沙箱模式提示
 * - 如果需要测试，可以使用 /api/payment/mock-success 模拟支付
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAlipayConfigured, isSandbox } from '@/lib/alipay'
import { generateOrderId, calculateExpireTime } from '@/lib/payment'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { planId, billingCycle = 'monthly' } = body

    // 获取用户ID（从header）
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        message: '请先登录' 
      }, { status: 401 })
    }

    // 验证套餐
    const plan = await db.subscriptionPlan.findUnique({ 
      where: { id: planId } 
    })
    if (!plan) {
      return NextResponse.json({ 
        success: false, 
        message: '套餐不存在' 
      }, { status: 400 })
    }

    // 计算价格
    const price = billingCycle === 'yearly' 
      ? (plan.priceYearly || plan.price * 12) 
      : plan.price

    if (price <= 0) {
      return NextResponse.json({ 
        success: false, 
        message: '免费套餐无需支付' 
      }, { status: 400 })
    }

    // 生成订单号
    const orderId = generateOrderId()
    const expireAt = calculateExpireTime(30)

    // 创建支付记录
    const payment = await db.payment.create({
      data: {
        orderId,
        userId,
        planId: plan.id,
        planTier: plan.tier,
        amount: price,
        billingCycle,
        status: 'pending',
        expireAt
      }
    })

    // 检查是否配置了支付宝
    if (!isAlipayConfigured()) {
      // 沙箱模式：返回模拟支付链接
      const mockPayUrl = `/subscription/payment-result?orderId=${orderId}&mode=sandbox`
      return NextResponse.json({
        success: true,
        data: {
          orderId,
          paymentId: payment.id,
          amount: price,
          planName: plan.name,
          billingCycle,
          expireAt: expireAt.toISOString(),
          mode: 'sandbox',
          payUrl: mockPayUrl,
          message: '沙箱模式：请使用模拟支付功能完成测试'
        },
        sandbox: true
      })
    }

    // 正式环境：返回支付宝支付链接
    // 这里需要调用支付宝SDK，实际项目中完整实现
    const alipayGateway = isSandbox() 
      ? 'https://openapi.alipaydev.com/gateway.do'
      : 'https://openapi.alipay.com/gateway.do'

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        paymentId: payment.id,
        amount: price,
        planName: plan.name,
        billingCycle,
        expireAt: expireAt.toISOString(),
        mode: 'alipay',
        gateway: alipayGateway,
        message: '请使用支付宝完成支付'
      }
    })

  } catch (error: any) {
    console.error('[Payment Create] 错误:', error)
    return NextResponse.json({
      success: false,
      message: `创建支付订单失败: ${error.message}`
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      description: '创建支付订单',
      method: 'POST',
      body: {
        planId: '套餐ID（必填）',
        billingCycle: 'monthly | yearly（默认monthly）'
      },
      response: {
        orderId: '订单号',
        paymentId: '支付记录ID',
        amount: '支付金额',
        planName: '套餐名称',
        mode: 'sandbox | alipay',
        payUrl: '支付链接（沙箱模式）或网关地址'
      }
    }
  })
}
