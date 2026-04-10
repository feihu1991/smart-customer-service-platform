import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// 套餐配置数据
export const defaultPlans = [
  {
    tier: 'free' as const,
    name: '免费版',
    description: '适合个人用户体验基础功能',
    price: 0,
    priceYearly: 0,
    dailyLimit: 3,
    shopLimit: 1,
    aiReplyLimit: 3,
    templateLimit: 5,
    features: JSON.stringify([
      '每日3次AI回复',
      '基础评价分析',
      '简单回复模板',
      '单店铺管理',
      '邮件支持'
    ]),
    isActive: true,
    sortOrder: 0,
  },
  {
    tier: 'basic' as const,
    name: '基础版',
    description: '适合小规模店铺运营',
    price: 99,
    priceYearly: 990,
    dailyLimit: 50,
    shopLimit: 3,
    aiReplyLimit: 50,
    templateLimit: 50,
    features: JSON.stringify([
      '每日50次AI回复',
      '优先AI响应',
      '数据报表',
      '多店铺管理',
      '邮件支持',
      '模板推荐'
    ]),
    isActive: true,
    sortOrder: 1,
  },
  {
    tier: 'pro' as const,
    name: '专业版',
    description: '适合中大型店铺批量运营',
    price: 299,
    priceYearly: 2990,
    dailyLimit: 200,
    shopLimit: 10,
    aiReplyLimit: 200,
    templateLimit: -1,
    features: JSON.stringify([
      '每日200次AI回复',
      '优先AI响应',
      '高级数据报表',
      '批量回复',
      '多店铺管理',
      '优先技术支持',
      '模板自定义',
      '回复历史查看'
    ]),
    isActive: true,
    sortOrder: 2,
  },
  {
    tier: 'enterprise' as const,
    name: '企业版',
    description: '适合大型企业全面管理',
    price: 999,
    priceYearly: 9990,
    dailyLimit: -1,
    shopLimit: -1,
    aiReplyLimit: -1,
    templateLimit: -1,
    features: JSON.stringify([
      '无限AI回复',
      '专属客服支持',
      'API接入',
      '定制化服务',
      '私有化部署',
      'SLA保障',
      '高级数据分析',
      '多管理员协作',
      '批量导入导出'
    ]),
    isActive: true,
    sortOrder: 3,
  },
]

// GET: 获取所有套餐列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') !== 'false'
    
    const where: Prisma.SubscriptionPlanWhereInput = {}
    if (activeOnly) {
      where.isActive = true
    }

    const plans = await db.subscriptionPlan.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    })

    // 如果没有套餐数据，使用默认数据
    if (plans.length === 0) {
      const createdPlans = await db.subscriptionPlan.createMany({
        data: defaultPlans,
        skipDuplicates: true,
      })
      
      const allPlans = await db.subscriptionPlan.findMany({
        orderBy: { sortOrder: 'asc' },
      })
      
      return NextResponse.json({ 
        success: true, 
        data: allPlans.map(plan => ({
          ...plan,
          features: JSON.parse(plan.features)
        })) 
      })
    }

    return NextResponse.json({ 
      success: true, 
      data: plans.map(plan => ({
        ...plan,
        features: JSON.parse(plan.features)
      })) 
    })
  } catch (error) {
    console.error('Get plans error:', error)
    return NextResponse.json(
      { success: false, message: '获取套餐列表失败' },
      { status: 500 }
    )
  }
}

// POST: 创建套餐（管理员）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      tier, name, description, price, priceYearly, 
      dailyLimit, shopLimit, aiReplyLimit, templateLimit, 
      features, limits, isActive, sortOrder 
    } = body

    // 验证必填字段
    if (!tier || !name || price === undefined) {
      return NextResponse.json(
        { success: false, message: '请填写完整的套餐信息' },
        { status: 400 }
      )
    }

    // 检查tier是否已存在
    const existing = await db.subscriptionPlan.findUnique({
      where: { tier },
    })
    
    if (existing) {
      return NextResponse.json(
        { success: false, message: '该套餐等级已存在' },
        { status: 400 }
      )
    }

    const plan = await db.subscriptionPlan.create({
      data: {
        tier,
        name,
        description,
        price,
        priceYearly,
        dailyLimit: dailyLimit ?? 3,
        shopLimit: shopLimit ?? 1,
        aiReplyLimit: aiReplyLimit ?? 3,
        templateLimit: templateLimit ?? 10,
        features: JSON.stringify(features || []),
        limits: limits ? JSON.stringify(limits) : null,
        isActive: isActive ?? true,
        sortOrder: sortOrder ?? 0,
      },
    })

    return NextResponse.json({ 
      success: true, 
      data: {
        ...plan,
        features: JSON.parse(plan.features)
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Create plan error:', error)
    return NextResponse.json(
      { success: false, message: '创建套餐失败' },
      { status: 500 }
    )
  }
}
