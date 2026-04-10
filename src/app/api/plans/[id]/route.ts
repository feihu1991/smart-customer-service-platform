import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: 获取单个套餐详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // 尝试通过ID查找
    let plan = await db.subscriptionPlan.findUnique({
      where: { id },
    })

    // 如果没找到，尝试通过tier查找
    if (!plan) {
      plan = await db.subscriptionPlan.findUnique({
        where: { tier: id as any },
      })
    }

    if (!plan) {
      return NextResponse.json(
        { success: false, message: '套餐不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        ...plan,
        features: JSON.parse(plan.features)
      }
    })
  } catch (error) {
    console.error('Get plan error:', error)
    return NextResponse.json(
      { success: false, message: '获取套餐详情失败' },
      { status: 500 }
    )
  }
}

// PUT: 更新套餐
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { 
      name, description, price, priceYearly, 
      dailyLimit, shopLimit, aiReplyLimit, templateLimit, 
      features, limits, isActive, sortOrder 
    } = body

    // 尝试通过ID查找
    let plan = await db.subscriptionPlan.findUnique({
      where: { id },
    })

    // 如果没找到，尝试通过tier查找
    if (!plan) {
      plan = await db.subscriptionPlan.findUnique({
        where: { tier: id as any },
      })
    }

    if (!plan) {
      return NextResponse.json(
        { success: false, message: '套餐不存在' },
        { status: 404 }
      )
    }

    const updateData: any = {}
    
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (price !== undefined) updateData.price = price
    if (priceYearly !== undefined) updateData.priceYearly = priceYearly
    if (dailyLimit !== undefined) updateData.dailyLimit = dailyLimit
    if (shopLimit !== undefined) updateData.shopLimit = shopLimit
    if (aiReplyLimit !== undefined) updateData.aiReplyLimit = aiReplyLimit
    if (templateLimit !== undefined) updateData.templateLimit = templateLimit
    if (features !== undefined) updateData.features = JSON.stringify(features)
    if (limits !== undefined) updateData.limits = JSON.stringify(limits)
    if (isActive !== undefined) updateData.isActive = isActive
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder

    const updatedPlan = await db.subscriptionPlan.update({
      where: { id: plan.id },
      data: updateData,
    })

    return NextResponse.json({ 
      success: true, 
      data: {
        ...updatedPlan,
        features: JSON.parse(updatedPlan.features)
      }
    })
  } catch (error) {
    console.error('Update plan error:', error)
    return NextResponse.json(
      { success: false, message: '更新套餐失败' },
      { status: 500 }
    )
  }
}

// DELETE: 删除套餐（软删除，设置isActive为false）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // 尝试通过ID查找
    let plan = await db.subscriptionPlan.findUnique({
      where: { id },
    })

    // 如果没找到，尝试通过tier查找
    if (!plan) {
      plan = await db.subscriptionPlan.findUnique({
        where: { tier: id as any },
      })
    }

    if (!plan) {
      return NextResponse.json(
        { success: false, message: '套餐不存在' },
        { status: 404 }
      )
    }

    // 软删除：设置isActive为false
    const updatedPlan = await db.subscriptionPlan.update({
      where: { id: plan.id },
      data: { isActive: false },
    })

    return NextResponse.json({ 
      success: true, 
      message: '套餐已禁用',
      data: updatedPlan 
    })
  } catch (error) {
    console.error('Delete plan error:', error)
    return NextResponse.json(
      { success: false, message: '删除套餐失败' },
      { status: 500 }
    )
  }
}
