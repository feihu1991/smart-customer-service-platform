import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: 套餐对比数据
export async function GET(request: NextRequest) {
  try {
    const plans = await db.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })

    // 构建对比表格
    const comparisonData = {
      headers: plans.map(plan => ({
        id: plan.id,
        tier: plan.tier,
        name: plan.name,
        price: plan.price,
        priceYearly: plan.priceYearly,
      })),
      rows: [
        {
          category: '价格',
          items: [
            { label: '月付价格', key: 'price', format: (v: number) => v === 0 ? '免费' : `¥${v}/月` },
            { label: '年付价格', key: 'priceYearly', format: (v: number) => v === 0 ? '免费' : `¥${v}/年` },
          ]
        },
        {
          category: 'AI回复',
          items: [
            { label: '每日限制', key: 'dailyLimit', format: (v: number) => v === -1 ? '无限' : `${v}次` },
            { label: 'AI回复次数', key: 'aiReplyLimit', format: (v: number) => v === -1 ? '无限' : `${v}次` },
          ]
        },
        {
          category: '店铺管理',
          items: [
            { label: '店铺数量', key: 'shopLimit', format: (v: number) => v === -1 ? '无限' : `${v}个` },
          ]
        },
        {
          category: '模板',
          items: [
            { label: '可用模板', key: 'templateLimit', format: (v: number) => v === -1 ? '无限' : `${v}个` },
          ]
        }
      ],
      allFeatures: plans.flatMap(plan => JSON.parse(plan.features))
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        plans: plans.map(plan => ({
          ...plan,
          features: JSON.parse(plan.features)
        })),
        comparison: comparisonData
      }
    })
  } catch (error) {
    console.error('Get comparison error:', error)
    return NextResponse.json(
      { success: false, message: '获取套餐对比失败' },
      { status: 500 }
    )
  }
}
