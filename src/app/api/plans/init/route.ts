import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { defaultPlans } from '../route'

// POST: 初始化套餐数据
export async function POST(request: NextRequest) {
  try {
    // 检查是否已有套餐数据
    const existingPlans = await db.subscriptionPlan.findMany()
    
    if (existingPlans.length > 0) {
      return NextResponse.json({ 
        success: true, 
        message: '套餐数据已存在，无需初始化',
        data: { count: existingPlans.length }
      })
    }

    // 创建默认套餐
    const createdPlans = await db.subscriptionPlan.createMany({
      data: defaultPlans,
    })
    
    return NextResponse.json({ 
      success: true, 
      message: '套餐数据初始化成功',
      data: { count: createdPlans.count }
    }, { status: 201 })
  } catch (error) {
    console.error('Initialize plans error:', error)
    return NextResponse.json(
      { success: false, message: '套餐数据初始化失败' },
      { status: 500 }
    )
  }
}
