import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 预置模板数据 - 水果电商场景
const builtInTemplates = [
  // 质量类 (2个)
  {
    name: '品质问题-退款补偿',
    category: 'quality',
    content: '亲爱的{买家称呼}，非常抱歉您收到的{商品名}品质未达预期。我们高度重视您的购物体验，现为您安排{补偿金额}元补偿，款项将原路退回。优质水果是我们一直追求的，希望这次能有机会弥补，期待再次为您服务！',
    isBuiltIn: true,
  },
  {
    name: '品质问题-重发新品',
    category: 'quality',
    content: '尊敬的{买家称呼}，非常抱歉{商品名}出现问题。我们已安排重新发货优质产品，预计3天内送达，请您注意查收。如有任何问题可随时联系我们，感谢您的理解与支持！',
    isBuiltIn: true,
  },
  // 物流类 (2个)
  {
    name: '物流延迟-道歉关怀',
    category: 'logistics',
    content: '亲爱的{买家称呼}，非常抱歉{商品名}配送延迟，给您带来不便深表歉意。我们已催促物流加急配送，预计很快送达。如需了解具体进度可联系我们查件，感谢您的耐心等待！',
    isBuiltIn: true,
  },
  {
    name: '物流损坏-快速理赔',
    category: 'logistics',
    content: '尊敬的{买家称呼}，非常遗憾得知您的订单在运输中受损，我们深表歉意。已启动快速理赔程序，{补偿金额}元补偿将在24小时内到账。同时我们会将优质新品重新寄出，感谢您的理解！',
    isBuiltIn: true,
  },
  // 服务类 (2个)
  {
    name: '服务态度-诚恳道歉',
    category: 'service',
    content: '亲爱的{买家称呼}，非常抱歉之前的服务让您感到不满。我们已对相关人员进行批评教育，并将认真反思改进。您的反馈对我们非常重要，希望能给您带来更好的服务体验，谢谢！',
    isBuiltIn: true,
  },
  {
    name: '服务问题-升级处理',
    category: 'service',
    content: '尊敬的{买家称呼}，感谢您提出的宝贵意见。对于您遇到的服务问题，我们已升级由资深客服专员跟进处理，确保为您提供满意的解决方案。如有其他需求，请随时联系我们！',
    isBuiltIn: true,
  },
  // 期望类 (2个)
  {
    name: '期望不符-引导好评',
    category: 'expectation',
    content: '亲爱的{买家称呼}，感谢您的购买！关于您反馈的{商品名}与预期有些差异，这是由于拍摄光线和显示设备可能造成轻微色差，产品本身品质是优质的。如您满意希望获得您的5星鼓励，谢谢！',
    isBuiltIn: true,
  },
  {
    name: '期望不符-说明引导',
    category: 'expectation',
    content: '尊敬的{买家称呼}，感谢您的反馈。您购买的{商品名}我们保证是当季新鲜采摘的，可能因个人口味偏好有所不同。我们会继续努力提升品质，期待下次为您带来更满意的产品！',
    isBuiltIn: true,
  },
  // 混合类 (2个)
  {
    name: '综合问题-全面补偿',
    category: 'mixed',
    content: '亲爱的{买家称呼}，非常抱歉给您带来不愉快的购物体验。针对您反馈的问题，我们已安排{补偿金额}元补偿+新品重发双重补偿，款项将原路返回。您的反馈是我们改进的动力，感谢一直以来的支持！',
    isBuiltIn: true,
  },
  {
    name: '综合问题-感谢信任',
    category: 'mixed',
    content: '尊敬的{买家称呼}，感谢您选择我们的店铺。对于您遇到的问题，我们深表歉意并已妥善处理。希望您能继续信任我们，我们将以更优质的产品和服务回报您的支持！',
    isBuiltIn: true,
  },
]

async function main() {
  console.log('开始插入预置模板...')

  for (const template of builtInTemplates) {
    // 检查是否已存在同名模板
    const existing = await prisma.replyTemplate.findFirst({
      where: { name: template.name },
    })

    if (existing) {
      console.log(`跳过已存在的模板: ${template.name}`)
      continue
    }

    await prisma.replyTemplate.create({
      data: template,
    })
    console.log(`已创建模板: ${template.name}`)
  }

  console.log('预置模板插入完成！')
}

main()
  .catch((e) => {
    console.error('插入模板失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
