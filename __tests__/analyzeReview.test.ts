/**
 * analyzeReview 函数单元测试
 * 测试差评分析功能的各种场景
 */

// 模拟 analyzeReview 函数（复制核心逻辑用于测试）
function analyzeReview(content: string, rating: number, sentiment: string) {
  // 空内容处理
  if (!content || content.trim().length === 0) {
    return {
      category: 'mixed' as const,
      emotion: 'neutral' as const,
      intensity: 'weak' as const,
      severity: 'minor' as const,
      recoveryDifficulty: 'easy' as const,
      keywords: { quality: false, logistics: false, service: false, expectation: false },
      isNegative: false,
      needsCompensation: false,
      analysis: '无法分析空内容',
    }
  }

  let category: 'quality' | 'logistics' | 'service' | 'expectation' | 'malicious' | 'mixed' = 'mixed'
  
  const qualityKeywords = ['质量', '质量差', '破损', '坏', '瑕疵', '次品', '假货', '劣质', '有问题', '不好用', '不好使', '不能用', '变质', '腐烂', '不新鲜', '不熟', '死包']
  const logisticsKeywords = ['物流', '快递', '发货', '慢', '迟迟不', '等了很久', '包装', '损坏', '压坏', '破', '摔坏', '少件', '漏发', '延迟', '迟迟']
  const serviceKeywords = ['客服', '服务', '态度', '不理', '不回', '不接', '推诿', '敷衍', '恶劣', '差劲', '傲慢', '爱答不理']
  const expectationKeywords = ['不符', '不一样', '不像', '图片', '描述', '宣传', '夸大', '虚标', '不值', '图片骗人', '货不对板', '色差', '大小不符']
  const maliciousKeywords = ['骗子', '假货满天飞', '垃圾店铺', '再也', '永远', '诅咒', '太垃圾', '黑店', '无良商家', '坑人', '诈骗', '恶心']

  const qualityCount = qualityKeywords.filter(k => content.includes(k)).length
  const logisticsCount = logisticsKeywords.filter(k => content.includes(k)).length
  const serviceCount = serviceKeywords.filter(k => content.includes(k)).length
  const expectationCount = expectationKeywords.filter(k => content.includes(k)).length
  const maliciousCount = maliciousKeywords.filter(k => content.includes(k)).length

  // 恶意差评检测：rating=1 或 多个恶意关键词
  if (maliciousCount >= 2 || rating === 1) {
    category = 'malicious'
  } else if (rating <= 2) {
    const counts = [
      { type: 'quality' as const, count: qualityCount },
      { type: 'logistics' as const, count: logisticsCount },
      { type: 'service' as const, count: serviceCount },
      { type: 'expectation' as const, count: expectationCount },
    ]
    counts.sort((a, b) => b.count - a.count)
    category = counts[0].count > 0 ? counts[0].type : 'mixed'
  }

  // 情感强度分析
  let intensity: 'weak' | 'medium' | 'strong' = 'medium'
  
  if (rating === 1) {
    intensity = 'strong'
  } else if (rating === 2) {
    intensity = 'medium'
  } else if (rating === 3) {
    intensity = 'weak'
  }
  
  const strongEmotionWords = ['非常', '特别', '极其', '超级', '简直', '太', '太差', '完全', '彻底', '极其', '忍无可忍', '愤怒', '生气', '失望透顶']
  const weakEmotionWords = ['有点', '稍微', '略微', '可能', '大概', '似乎', '感觉']
  
  const strongCount = strongEmotionWords.filter(w => content.includes(w)).length
  const weakCount = weakEmotionWords.filter(w => content.includes(w)).length
  
  if (strongCount > weakCount) {
    intensity = 'strong'
  } else if (weakCount > strongCount && intensity !== 'weak') {
    intensity = 'medium'
  }

  // 问题严重度评估
  let severity: 'minor' | 'moderate' | 'severe' = 'moderate'
  
  if (rating === 1) {
    severity = 'severe'
  } else if (rating === 2) {
    severity = 'moderate'
  } else if (rating === 3) {
    severity = 'minor'
  }
  
  const severeKeywords = ['假货', '诈骗', '欺骗', '索赔', '投诉', '315', '曝光', '食品安全', '中毒', '过敏']
  const minorKeywords = ['还好', '还行', '一般般', '凑合', '将就', '勉强']
  
  if (severeKeywords.some(k => content.includes(k))) {
    severity = 'severe'
  } else if (minorKeywords.some(k => content.includes(k))) {
    severity = 'minor'
  }

  // 挽回难度评估
  let recoveryDifficulty: 'easy' | 'medium' | 'hard' = 'medium'
  
  if (category === 'malicious') {
    recoveryDifficulty = 'hard'
  } else if (category === 'quality' && severity === 'severe') {
    recoveryDifficulty = 'hard'
  } else if (category === 'logistics' || category === 'expectation') {
    recoveryDifficulty = 'easy'
  } else if (category === 'service') {
    recoveryDifficulty = 'medium'
  }
  
  if (intensity === 'strong' && recoveryDifficulty !== 'hard') {
    recoveryDifficulty = recoveryDifficulty === 'easy' ? 'medium' : 'hard'
  }

  if (rating === 1 && intensity === 'strong') {
    recoveryDifficulty = 'hard'
  } else if (rating >= 3 && intensity === 'weak') {
    recoveryDifficulty = 'easy'
  }

  let emotion = 'neutral'
  if (rating >= 4) emotion = 'positive'
  else if (rating <= 2) emotion = 'negative'
  
  if (sentiment === 'negative' && rating <= 2) {
    emotion = 'negative'
  }

  return {
    category,
    emotion,
    intensity,
    severity,
    recoveryDifficulty,
    keywords: {
      quality: qualityCount > 0,
      logistics: logisticsCount > 0,
      service: serviceCount > 0,
      expectation: expectationCount > 0,
    },
    isNegative: rating <= 2,
    needsCompensation: category !== 'malicious' && rating <= 2,
    analysis: `检测到${category}类问题，情感强度${intensity}，严重度${severity}，挽回难度${recoveryDifficulty}`,
  }
}

// 模拟 scoreReplyQuality 函数
function scoreReplyQuality(reply: string, analysis: ReturnType<typeof analyzeReview>) {
  const factors: Record<string, { score: number; reason: string }> = {}
  
  const apologyWords = ['抱歉', '对不起', '歉意', '不好意思', '非常抱歉', '对不起亲', '抱歉亲']
  const hasApology = apologyWords.some(w => reply.includes(w))
  factors.apology = {
    score: hasApology ? 10 : 5,
    reason: hasApology ? '包含道歉表达' : '缺少道歉，建议添加真诚道歉',
  }

  const solutionWords = ['退款', '补发', '退换', '补偿', '处理', '解决', '优惠券', '红包', '折扣']
  const solutionCount = solutionWords.filter(w => reply.includes(w)).length
  let solutionScore = 5
  let solutionReason = '缺少明确的解决方案'
  
  if (solutionCount >= 2) {
    solutionScore = 10
    solutionReason = '提供了多种解决方案'
  } else if (solutionCount === 1) {
    solutionScore = 7
    solutionReason = '提供了一个解决方案'
  }
  
  if (analysis.category === 'malicious') {
    solutionScore = 5
    solutionReason = '恶意差评保持礼貌即可'
  }
  
  factors.solution = { score: solutionScore, reason: solutionReason }

  const compensationWords = ['优惠券', '红包', '折扣', '退款', '补发', '无门槛', '赠送']
  const hasCompensation = compensationWords.some(w => reply.includes(w))
  
  let compensationScore = 5
  let compensationReason = '未提及补偿'
  
  if (hasCompensation) {
    if (analysis.needsCompensation) {
      compensationScore = 10
      compensationReason = '提供了补偿建议'
    } else {
      compensationScore = 7
      compensationReason = '提供了补偿（但可能不需要）'
    }
  }
  
  factors.compensation = { score: compensationScore, reason: compensationReason }

  let toneScore = 7
  let toneReason = '语气基本合适'
  
  const positiveTone = ['感谢', '谢谢', '希望', '期待', '理解', '支持']
  const negativeTone = ['但是', '只是', '不过', '谁让你', '你自己', '怪']
  
  const positiveCount = positiveTone.filter(w => reply.includes(w)).length
  const negativeCount = negativeTone.filter(w => reply.includes(w)).length
  
  if (positiveCount > negativeCount && positiveCount >= 2) {
    toneScore = 10
    toneReason = '语气积极正向'
  } else if (negativeCount > positiveCount) {
    toneScore = 5
    toneReason = '语气可能显得推卸责任'
  }
  
  factors.tone = { score: toneScore, reason: toneReason }

  const length = reply.length
  let lengthScore = 7
  let lengthReason = '长度适中'
  
  if (length < 30) {
    lengthScore = 5
    lengthReason = '内容过短，可能显得敷衍'
  } else if (length > 200) {
    lengthScore = 6
    lengthReason = '内容偏长，建议精简'
  } else if (length >= 50 && length <= 150) {
    lengthScore = 10
    lengthReason = '长度合适'
  }
  
  factors.length = { score: lengthScore, reason: lengthReason }

  if (analysis.category === 'malicious') {
    const defensiveWords = ['不是', '没有', '不可能', '冤枉', '诋毁']
    const hasDefense = defensiveWords.some(w => reply.includes(w))
    
    if (hasDefense) {
      factors.maliciousDefense = { 
        score: 3, 
        reason: '恶意差评不应正面反驳，容易激化矛盾' 
      }
    } else {
      factors.maliciousDefense = { 
        score: 10, 
        reason: '恶意差评处理得当，保持礼貌' 
      }
    }
  }

  const factorScores = Object.values(factors).map(f => f.score)
  const total = Math.round((factorScores.reduce((a, b) => a + b, 0) / factorScores.length) * 10) / 10

  return { total, factors }
}

// ============== 测试用例 ==============

interface TestCase {
  name: string;
  input: { content: string; rating: number; sentiment: string };
  assertions: Array<{
    check: (result: ReturnType<typeof analyzeReview>) => boolean;
    message: string;
  }>;
}

interface ReplyTestCase {
  name: string;
  input: { reply: string; analysis: ReturnType<typeof analyzeReview> };
  expected: { minScore: number };
}

const testCases: TestCase[] = [
  // 边界情况测试
  {
    name: '空内容测试',
    input: { content: '', rating: 5, sentiment: 'positive' },
    assertions: [
      { check: r => r.category === 'mixed', message: '空内容应归类为mixed' },
      { check: r => r.intensity === 'weak', message: '空内容情感强度应为weak' },
      { check: r => r.severity === 'minor', message: '空内容严重度应为minor' },
      { check: r => r.isNegative === false, message: '空内容不应标记为负面' },
    ],
  },
  {
    name: '空格内容测试',
    input: { content: '   ', rating: 5, sentiment: 'positive' },
    assertions: [
      { check: r => r.category === 'mixed', message: '空格内容应归类为mixed' },
      { check: r => r.intensity === 'weak', message: '空格内容情感强度应为weak' },
    ],
  },

  // 质量问题测试
  {
    name: '榴莲质量问题-2星',
    input: { content: '榴莲是死包，根本不能吃，太差劲了', rating: 2, sentiment: 'negative' },
    assertions: [
      { check: r => r.category === 'quality', message: '应归类为质量问题' },
      { check: r => r.emotion === 'negative', message: '情感应为negative' },
      { check: r => r.intensity === 'strong', message: '情感强度应为strong（因为包含"太差"）' },
      { check: r => r.keywords.quality === true, message: '应检测到质量关键词' },
      { check: r => r.isNegative === true, message: '应标记为负面评价' },
      { check: r => r.needsCompensation === true, message: '质量问题应需要补偿' },
    ],
  },
  {
    name: '商品破损问题',
    input: { content: '收到水果发现包装破损，水果都压坏了', rating: 2, sentiment: 'negative' },
    assertions: [
      { check: r => r.keywords.logistics === true, message: '应检测到物流关键词' },
      { check: r => r.keywords.quality === true, message: '应同时检测到质量问题（压坏）' },
      { check: r => r.isNegative === true, message: '应标记为负面评价' },
    ],
  },

  // 物流问题测试
  {
    name: '物流慢问题',
    input: { content: '物流太慢了，等了一周才收到', rating: 2, sentiment: 'negative' },
    assertions: [
      { check: r => r.category === 'logistics', message: '应归类为物流问题' },
      { check: r => r.keywords.logistics === true, message: '应检测到物流关键词' },
      { check: r => r.intensity === 'strong', message: '包含"太"情感强度应为strong' },
      // 强度为strong时会提升难度，从easy变为medium
      { check: r => r.recoveryDifficulty === 'medium', message: '强情感强度时挽回难度应为medium' },
    ],
  },
  {
    name: '少件问题',
    input: { content: '买的5斤榴莲，少了2斤，漏发了', rating: 2, sentiment: 'negative' },
    assertions: [
      { check: r => r.category === 'logistics', message: '应归类为物流问题' },
      { check: r => r.keywords.logistics === true, message: '应检测到物流关键词' },
    ],
  },

  // 服务问题测试
  {
    name: '客服不理人',
    input: { content: '客服根本不理人，问了三天都没回复', rating: 2, sentiment: 'negative' },
    assertions: [
      { check: r => r.category === 'service', message: '应归类为服务问题' },
      { check: r => r.keywords.service === true, message: '应检测到服务关键词' },
      { check: r => r.recoveryDifficulty === 'medium', message: '服务问题挽回难度应为medium' },
    ],
  },
  {
    name: '客服态度恶劣-2星',
    input: { content: '客服态度太差了，说话特别傲慢，爱答不理的', rating: 2, sentiment: 'negative' },
    assertions: [
      { check: r => r.category === 'service', message: '应归类为服务问题（2星非恶意）' },
      { check: r => r.keywords.service === true, message: '应检测到服务关键词' },
      { check: r => r.severity === 'moderate', message: '2星服务问题严重度为moderate' },
    ],
  },

  // 期望差距测试
  {
    name: '图片与实物不符',
    input: { content: '图片上看着个头很大，收到的是迷你果，根本不一样', rating: 2, sentiment: 'negative' },
    assertions: [
      { check: r => r.category === 'expectation', message: '应归类为期望差距' },
      { check: r => r.keywords.expectation === true, message: '应检测到期望差距关键词' },
      { check: r => r.recoveryDifficulty === 'easy', message: '期望差距挽回难度应为easy' },
    ],
  },
  {
    name: '描述夸大',
    input: { content: '宣传说超级甜，收到的一点都不甜，太失望了', rating: 3, sentiment: 'negative' },
    assertions: [
      { check: r => r.keywords.expectation === true, message: '应检测到期望差距关键词' },
      { check: r => r.severity === 'minor', message: '3星评价严重度应为minor' },
    ],
  },

  // 恶意差评测试（rating=1直接判定为恶意）
  {
    name: '恶意差评-1星评分',
    input: { content: '榴莲不新鲜', rating: 1, sentiment: 'negative' },
    assertions: [
      { check: r => r.category === 'malicious', message: '1星评价应归类为恶意差评' },
      { check: r => r.severity === 'severe', message: '恶意差评严重度应为severe' },
      { check: r => r.recoveryDifficulty === 'hard', message: '恶意差评挽回难度应为hard' },
      { check: r => r.needsCompensation === false, message: '恶意差评不需要补偿' },
    ],
  },
  {
    name: '恶意差评-多关键词',
    input: { content: '黑店！骗子！永远不会再买了，太垃圾了！', rating: 2, sentiment: 'negative' },
    assertions: [
      { check: r => r.category === 'malicious', message: '多个恶意关键词应归类为恶意差评' },
      { check: r => r.recoveryDifficulty === 'hard', message: '恶意差评挽回难度应为hard' },
      { check: r => r.needsCompensation === false, message: '恶意差评不需要补偿' },
    ],
  },
  {
    name: '恶意差评-极端言辞',
    input: { content: '坑人商家，无良店铺，再也不会来了！', rating: 1, sentiment: 'negative' },
    assertions: [
      { check: r => r.category === 'malicious', message: '应归类为恶意差评' },
      { check: r => r.severity === 'severe', message: '严重度应为severe' },
      { check: r => r.recoveryDifficulty === 'hard', message: '挽回难度应为hard' },
    ],
  },

  // 情感强度测试
  {
    name: '情感强度-强烈',
    input: { content: '简直太失望了，完全忍无可忍！', rating: 2, sentiment: 'negative' },
    assertions: [
      { check: r => r.intensity === 'strong', message: '包含强烈情感词应为strong' },
    ],
  },
  {
    name: '情感强度-较弱',
    input: { content: '感觉有点失望，可能是我期望太高了吧', rating: 3, sentiment: 'neutral' },
    assertions: [
      { check: r => r.intensity === 'weak', message: '包含弱情感词应为weak' },
      { check: r => r.severity === 'minor', message: '3星评价严重度应为minor' },
    ],
  },

  // 中评测试
  {
    name: '中评-还行',
    input: { content: '一般般吧，还行，凑合用', rating: 3, sentiment: 'neutral' },
    assertions: [
      { check: r => r.severity === 'minor', message: '包含"还行"等词严重度应为minor' },
      { check: r => r.isNegative === false, message: '3星不应标记为负面' },
      { check: r => r.needsCompensation === false, message: '中评不需要补偿' },
    ],
  },

  // 好评测试
  {
    name: '好评测试',
    input: { content: '榴莲非常新鲜，个头很大，非常满意！', rating: 5, sentiment: 'positive' },
    assertions: [
      { check: r => r.emotion === 'positive', message: '5星情感应为positive' },
      { check: r => r.isNegative === false, message: '5星不应标记为负面' },
      { check: r => r.needsCompensation === false, message: '好评不需要补偿' },
    ],
  },

  // 严重问题关键词测试
  {
    name: '严重问题-假货投诉',
    input: { content: '这是假货，欺骗消费者，要求索赔！', rating: 2, sentiment: 'negative' },
    assertions: [
      { check: r => r.severity === 'severe', message: '包含假货/索赔等词严重度应为severe' },
    ],
  },
]

// 回复质量评分测试用例
const replyTestCases: ReplyTestCase[] = [
  {
    name: '优秀回复-包含道歉、解决方案和补偿',
    input: { 
      reply: '亲，非常抱歉给您带来了不好的体验。我们检测到商品可能存在质量问题，现在为您安排全额退款，同时赠送您一张30元无门槛优惠券作为补偿。感谢您的理解，期待您再次光临！',
      analysis: analyzeReview('榴莲是死包', 2, 'negative'),
    },
    expected: { minScore: 8 },
  },
  {
    name: '一般回复-有道歉但缺少补偿',
    input: { 
      reply: '抱歉亲，我们会认真处理您反馈的问题。',
      analysis: analyzeReview('水果不新鲜', 2, 'negative'),
    },
    expected: { minScore: 6 },
  },
  {
    name: '较差回复-过短且推卸责任',
    input: { 
      reply: '但是',
      analysis: analyzeReview('物流太慢', 2, 'negative'),
    },
    expected: { minScore: 3 },
  },
  {
    name: '恶意差评回复-保持礼貌',
    input: { 
      reply: '感谢您的反馈，我们希望能与您沟通了解具体情况。如有任何误会，我们会妥善处理。欢迎联系我们的客服热线。',
      analysis: analyzeReview('黑店骗子', 2, 'negative'),
    },
    expected: { minScore: 7 },
  },
  {
    name: '恶意差评回复-正面反驳（不好）',
    input: { 
      reply: '我们不是骗子，你这是诋毁我们店铺！',
      analysis: analyzeReview('黑店骗子', 2, 'negative'),
    },
    expected: { minScore: 2 },
  },
]

// ============== 测试执行 ==============

function runTests() {
  console.log('🧪 开始执行 analyzeReview 函数测试...\n')
  
  let passed = 0
  let failed = 0
  
  for (const testCase of testCases) {
    try {
      const result = analyzeReview(testCase.input.content, testCase.input.rating, testCase.input.sentiment)
      
      const failedAssertions: string[] = []
      
      for (const assertion of testCase.assertions) {
        if (!assertion.check(result)) {
          failedAssertions.push(assertion.message)
        }
      }
      
      if (failedAssertions.length === 0) {
        console.log(`✅ ${testCase.name}`)
        passed++
      } else {
        console.log(`❌ ${testCase.name}`)
        console.log(`   失败原因: ${failedAssertions.join(', ')}`)
        failed++
      }
    } catch (error) {
      console.log(`❌ ${testCase.name} - 测试执行错误: ${error}`)
      failed++
    }
  }
  
  console.log(`\n📊 回复质量评分测试...\n`)
  
  for (const testCase of replyTestCases) {
    try {
      const result = scoreReplyQuality(testCase.input.reply, testCase.input.analysis)
      
      if (result.total >= testCase.expected.minScore) {
        console.log(`✅ ${testCase.name} - 评分: ${result.total}`)
        passed++
      } else {
        console.log(`❌ ${testCase.name} - 评分: ${result.total} (期望 >= ${testCase.expected.minScore})`)
        console.log(`   因素: ${Object.entries(result.factors).map(([k, v]) => `${k}=${v.score}`).join(', ')}`)
        failed++
      }
    } catch (error) {
      console.log(`❌ ${testCase.name} - 测试执行错误: ${error}`)
      failed++
    }
  }
  
  console.log(`\n${'='.repeat(50)}`)
  console.log(`测试完成: ${passed} 通过, ${failed} 失败`)
  console.log(`${'='.repeat(50)}`)
  
  return failed === 0
}

// 导出测试函数供外部调用
export { analyzeReview, scoreReplyQuality, runTests }

// 入口函数
const main = () => {
  const success = runTests()
  process.exit(success ? 0 : 1)
}

main()
