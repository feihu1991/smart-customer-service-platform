/**
 * 模板推荐API
 * GET /api/templates/recommend
 * 
 * 功能：
 * 1. 根据差评类型自动匹配相关模板
 * 2. 返回推荐模板列表供AI生成参考
 * 3. 支持按类型筛选
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 差评类型到模板类别的映射
const categoryMapping: Record<string, string[]> = {
  quality: ['quality'],
  logistics: ['logistics'],
  service: ['service'],
  expectation: ['expectation'],
  malicious: ['service', 'mixed'],
  mixed: ['mixed', 'quality', 'logistics'],
}

// 差评类型描述
const categoryDescriptions: Record<string, string> = {
  quality: '商品质量问题（破损、变质、不新鲜等）',
  logistics: '物流配送问题（延迟、损坏、包装破损等）',
  service: '客服服务问题（态度差、不回复等）',
  expectation: '期望不符问题（货不对板、图片差异等）',
  malicious: '疑似恶意差评',
  mixed: '综合问题',
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const reviewContent = searchParams.get('content')
    const rating = searchParams.get('rating')
    const sentiment = searchParams.get('sentiment')
    const limit = parseInt(searchParams.get('limit') || '5')

    // 如果提供了评价内容，分析推荐类别
    let targetCategories: string[] = []
    if (category) {
      targetCategories = categoryMapping[category] || [category]
    } else if (reviewContent || rating || sentiment) {
      // 根据评价内容推断类别
      targetCategories = inferCategories(reviewContent || '', parseInt(rating || '3'), sentiment || 'neutral')
    } else {
      // 返回所有类别的高使用模板
      const allTemplates = await db.replyTemplate.findMany({
        orderBy: { usageCount: 'desc' },
        take: limit,
      })
      return NextResponse.json({
        success: true,
        data: {
          templates: allTemplates,
          recommendation: {
            basedOn: 'usage_count',
            message: '根据使用频率推荐模板',
          },
        },
      })
    }

    // 查询匹配的模板
    const templates = await db.replyTemplate.findMany({
      where: {
        category: {
          in: targetCategories,
        },
      },
      orderBy: [
        { isBuiltIn: 'desc' }, // 内置模板优先
        { usageCount: 'desc' },
      ],
      take: limit,
    })

    // 如果没有精确匹配，扩大搜索范围
    if (templates.length < limit) {
      const additionalTemplates = await db.replyTemplate.findMany({
        where: {
          id: {
            notIn: templates.map(t => t.id),
          },
        },
        orderBy: { usageCount: 'desc' },
        take: limit - templates.length,
      })
      templates.push(...additionalTemplates)
    }

    return NextResponse.json({
      success: true,
      data: {
        templates,
        recommendation: {
          basedOn: category ? 'category' : 'content_analysis',
          sourceCategory: category || 'inferred',
          sourceDescription: categoryDescriptions[category || 'mixed'] || categoryDescriptions.mixed,
          targetCategories,
        },
      },
    })
  } catch (error) {
    console.error('Template recommendation error:', error)
    return NextResponse.json(
      { success: false, message: '获取模板推荐失败' },
      { status: 500 }
    )
  }
}

/**
 * 根据评价内容推断类别
 */
function inferCategories(content: string, rating: number, sentiment: string): string[] {
  const result: string[] = []
  
  // 质量问题关键词
  const qualityKeywords = ['质量', '破损', '坏', '瑕疵', '变质', '腐烂', '不新鲜', '假货', '次品']
  // 物流问题关键词
  const logisticsKeywords = ['物流', '快递', '发货', '慢', '延迟', '包装', '压坏', '摔坏', '少件']
  // 服务问题关键词
  const serviceKeywords = ['客服', '服务', '态度', '不理', '不回', '敷衍', '推诿']
  // 期望差距关键词
  const expectationKeywords = ['不符', '不一样', '图片', '描述', '货不对板', '色差', '夸大']

  if (qualityKeywords.some(k => content.includes(k))) {
    result.push('quality')
  }
  if (logisticsKeywords.some(k => content.includes(k))) {
    result.push('logistics')
  }
  if (serviceKeywords.some(k => content.includes(k))) {
    result.push('service')
  }
  if (expectationKeywords.some(k => content.includes(k))) {
    result.push('expectation')
  }

  // 如果没有匹配关键词，根据评分推断
  if (result.length === 0) {
    if (rating <= 2 || sentiment === 'negative') {
      result.push('mixed', 'quality')
    } else if (rating === 3) {
      result.push('expectation')
    }
  }

  // 确保至少返回一个类别
  if (result.length === 0) {
    result.push('mixed')
  }

  return result
}

/**
 * 为评价回复生成构建模板上下文
 * 这个函数可以被其他API调用，用于获取模板参考
 */
export async function getTemplateContext(params: {
  category?: string
  content?: string
  rating?: number
  sentiment?: string
}) {
  const { category, content, rating, sentiment } = params
  
  // 获取推荐模板
  let targetCategories: string[] = []
  if (category) {
    targetCategories = categoryMapping[category] || [category]
  } else if (content || rating || sentiment) {
    targetCategories = inferCategories(content || '', rating || 3, sentiment || 'neutral')
  }

  const templates = await db.replyTemplate.findMany({
    where: targetCategories.length > 0 ? {
      category: { in: targetCategories }
    } : {},
    orderBy: { usageCount: 'desc' },
    take: 3,
  })

  // 构建模板上下文
  const templateContext = templates.map(t => ({
    name: t.name,
    content: t.content,
    variables: extractVariables(t.content),
  }))

  return {
    templates,
    templateContext,
    recommendedStyle: templates[0]?.content.includes('{补偿金额}') ? 'compensation' : 'apology',
  }
}

/**
 * 提取模板中的变量占位符
 */
function extractVariables(content: string): string[] {
  const matches = content.match(/\{([^}]+)\}/g)
  if (!matches) return []
  return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))]
}
