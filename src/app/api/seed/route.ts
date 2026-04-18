import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 买家名称池
const buyerNames = [
  '张三', '李四', '王五', '赵六', '孙七', '周八', '吴九', '郑十',
  '陈小红', '刘小明', '黄丽华', '杨美美', '朱大伟', '林小芳',
  '何建国', '马晓东', '高雪梅', '罗志强', '梁婷婷', '宋天宇',
  '谢丹丹', '韩文文', '唐小宝', '冯雅琴', '董浩然', '萧雨薇',
]

const phonePrefixes = ['138', '139', '136', '137', '158', '159', '188', '187', '135', '186']

function randomPhone() {
  const prefix = phonePrefixes[Math.floor(Math.random() * phonePrefixes.length)]
  const suffix = String(Math.floor(Math.random() * 100000000)).padStart(8, '0')
  return prefix + suffix
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDate(daysAgo: number, recentDays: number = 0): Date {
  const now = new Date()
  const past = new Date(now.getTime() - daysAgo * 86400000)
  const recent = new Date(now.getTime() - recentDays * 86400000)
  return new Date(past.getTime() + Math.random() * (recent.getTime() - past.getTime()))
}

// 评价内容池 - 按rating分类
const positiveReviews = [
  '非常好！质量超出预期，物流也很快，好评！',
  '第二次买了，品质一如既往的好，值得信赖的店铺。',
  '包装很精美，做工精细，颜色和图片一样，非常满意。',
  '性价比很高，比实体店便宜多了，推荐给大家。',
  '客服态度很好，耐心解答了我的问题，商品也很不错。',
  '发货速度超快，隔天就到了，商品完好无损。',
  '用了一段时间了，质量确实不错，以后还会回购。',
  '整体感觉很好，细节处理到位，很用心的一家店。',
  '朋友推荐的，果然没让我失望，物美价廉。',
  '已经是老顾客了，每次都不会失望，加油！',
  '非常满意的一次购物体验，全五星好评！',
  '实物比图片还好看，手感也不错，太喜欢了。',
]

const neutralReviews = [
  '还可以吧，没有想象中那么好，但也不差。',
  '一般般，和描述基本一致，就是物流有点慢。',
  '中规中矩吧，价格合理，质量过得去。',
  '还可以，使用中暂时没发现问题，先给个中评。',
  '款式不错但尺寸偏小，建议买大一码。',
  '收到有一段时间了，感觉一般，没什么特别的。',
  '质量还行，但包装有点简陋，希望改进。',
  '价格不贵，一分钱一分货吧，能用就行。',
]

const negativeReviews = [
  '太失望了！收到的商品有明显瑕疵，和图片差太多了。',
  '等了快一周才发货，物流也很慢，体验很差。',
  '质量太差了，用了两天就坏了，完全不值这个价。',
  '色差严重，实物和图片完全不是一个颜色，欺骗消费者！',
  '客服态度恶劣，问了半天也不回消息，以后不会再来了。',
  '包装破损，商品也有问题，售后还不给处理。',
  '尺寸严重偏小，根本穿不了，退换货又很麻烦。',
  '买到假货的感觉，做工粗糙，材料很廉价，差评。',
  '商品描述严重不符，功能也没有宣传的那么好，误导消费。',
  '快递问题还好，但商品质量真的不行，很失望。',
  '买回来就发现有线头，扣子也松了，品控太差了。',
  '第一次这么差评，东西不好还态度差，不会再买。',
]

const addresses = [
  '北京市朝阳区建国路88号',
  '上海市浦东新区陆家嘴东路168号',
  '广州市天河区天河路385号',
  '深圳市南山区科技园南区',
  '杭州市西湖区文三路556号',
  '成都市武侯区人民南路四段1号',
  '南京市鼓楼区中山北路30号',
  '武汉市江汉区江汉路129号',
  '重庆市渝中区解放碑步行街',
  '西安市雁塔区高新路2号',
]

const logisticsCompanies = ['顺丰速运', '中通快递', '圆通速递', '韵达快递', '申通快递', '极兔速递']

function generateLogisticsNo() {
  const prefix = ['SF', 'ZT', 'YT', 'YD', 'ST', 'JT'][Math.floor(Math.random() * 6)]
  const num = String(Math.floor(Math.random() * 10000000000)).padStart(10, '0')
  return prefix + num
}

// AI reply templates for chat messages
const aiReplies = {
  greeting: [
    '您好，欢迎光临！请问有什么可以帮您的？',
    '亲亲，您好！很高兴为您服务，请问有什么问题需要咨询呢？',
  ],
  product: [
    '关于您问的这款商品，它采用优质材料制作，品质有保障。目前库存充足，可以放心下单哦！',
    '这款商品是我们店铺的热销款，好评率99%以上。支持7天无理由退换货，您可以放心购买。',
    '这款商品有多个颜色可选，目前所有颜色都有库存。如果您对颜色不确定，可以先看看买家秀哦。',
  ],
  logistics: [
    '您的订单我们会在24小时内发货，一般3-5天就能收到。发货后我们会第一时间通知您物流信息。',
    '目前合作的快递是顺丰速运，大部分地区2-3天即可到达。偏远地区可能需要4-5天。',
    '如果您需要加急配送，可以选择顺丰特快，但需要补一下差价。需要的话我帮您备注。',
  ],
  afterSale: [
    '非常抱歉给您带来不好的体验。我们非常重视您的反馈，可以麻烦您提供一下商品照片吗？我们核实后会尽快为您处理。',
    '您好，我们支持7天无理由退换货。您可以先申请退货，收到退回商品后我们会第一时间为您处理退款。',
    '非常抱歉出现这个问题，我们已经记录并反馈给相关部门。为了表示歉意，我们可以为您安排补发或退款，您看哪个方案更合适？',
  ],
  price: [
    '目前这款商品已经在做活动价了，是近期的最低价。如果您是老客户，我们可以在您下单时再给您一点优惠。',
    '亲，这款商品的价格已经很有诚意了。不过我们可以给您赠送一个小礼品，您觉得怎么样？',
    '现在下单可以享受满减优惠，凑单满300减30哦。您可以看看店里其他需要的商品一起下单更划算。',
  ],
  default: [
    '好的，我了解了您的情况。让我帮您查一下，请稍等。',
    '收到您的问题了，我马上帮您处理，请稍等片刻。',
    '感谢您的耐心等待，我正在帮您核实相关信息。',
  ],
}

// Reply templates for reviews
const replyTemplates = [
  { name: '物流问题-致歉', category: '物流问题', content: '非常抱歉给您带来不好的物流体验！我们已向物流公司反馈此问题，会持续跟进改进。感谢您的理解与支持，祝您生活愉快！' },
  { name: '物流问题-跟进', category: '物流问题', content: '亲爱的顾客您好，关于您反馈的物流问题，我们深表歉意。我们已加强和物流合作方的沟通，确保后续包裹能安全准时送达。如有其他问题，欢迎随时联系我们。' },
  { name: '质量问题-换货', category: '质量问题', content: '非常抱歉商品出现了质量问题！我们对此高度重视。请您联系客服提供照片，我们将为您免费办理换货或退款，运费由我们承担。再次向您致歉！' },
  { name: '质量问题-补偿', category: '质量问题', content: '亲爱的顾客，感谢您的真实反馈。对于商品质量问题我们深感歉意，已安排品控部门加强检验。我们愿意为您提供补偿方案，请您联系客服处理。' },
  { name: '服务态度-改进', category: '服务态度', content: '非常感谢您的反馈！对于服务不到位的地方我们深表歉意，已对相关客服人员进行了培训改进。我们会不断提升服务水平，为您带来更好的体验。' },
  { name: '服务态度-感谢', category: '服务态度', content: '感谢您对我们服务的监督！您的意见是我们进步的动力。我们已将您的反馈记录并制定了改进措施，希望下次能给您带来满意的服务体验。' },
  { name: '描述不符-核实', category: '描述不符', content: '非常抱歉给您造成了困惑。我们已认真核实您反馈的商品描述问题，并更新了商品详情页。如给您带来不便，请联系客服，我们将为您提供满意的解决方案。' },
  { name: '描述不符-更正', category: '描述不符', content: '感谢您的宝贵意见！我们已对商品描述进行了全面检查和更正，确保信息准确。为了弥补给您带来的不便，下次购物可以享受95折优惠。' },
  { name: '通用好评感谢', category: '通用', content: '感谢您的好评和认可！您的满意是我们最大的动力。我们会继续努力，为您提供更优质的商品和服务。期待您的再次光临！' },
  { name: '通用-期待回购', category: '通用', content: '非常感谢您的支持和信任！很高兴您对商品感到满意。我们会继续提升品质，也欢迎您随时关注我们店铺的新品和优惠活动，期待您的再次光临！' },
  { name: '通用-诚心致歉', category: '通用', content: '非常抱歉给您带来不好的购物体验。我们十分重视您的每一条反馈，已将问题记录并安排专人处理。如有任何需要，请随时联系我们，我们将全力为您解决。' },
  { name: '通用-温馨关怀', category: '通用', content: '感谢您的耐心等待和理解！我们会持续优化商品和服务质量。如果您在使用过程中有任何问题，欢迎随时联系我们的客服团队，我们会第一时间为您处理。' },
]

export async function POST() {
  try {
    // Check if data already exists
    const existingShops = await db.shop.count()
    if (existingShops > 0) {
      return NextResponse.json({
        success: true,
        message: '数据库已有数据，跳过种子数据生成',
        existingShops,
      })
    }

    // ===== Create Seed User =====
    const seedUser = await db.user.create({
      data: {
        phone: '13800000001',
        name: '测试用户',
      },
    })

    // ===== Create Shops =====
    const shop1 = await db.shop.create({
      data: {
        userId: seedUser.id,
        name: '旗舰数码店',
        platform: 'taobao',
        logo: '/shops/digital-shop.png',
        isActive: true,
      },
    })

    const shop2 = await db.shop.create({
      data: {
        userId: seedUser.id,
        name: '时尚女装坊',
        platform: 'taobao',
        logo: '/shops/fashion-shop.png',
        isActive: true,
      },
    })

    // ===== Create Products for Shop 1 (数码店) =====
    const digitalProducts = [
      { title: '华为Mate 60 Pro 5G手机 512GB', price: 6999 },
      { title: 'Apple AirPods Pro 第二代 主动降噪', price: 1799 },
      { title: '小米14 Ultra 骁龙8Gen3 徕卡影像', price: 5999 },
      { title: '索尼WH-1000XM5 头戴式无线降噪耳机', price: 2299 },
      { title: 'iPad Air M2芯片 11英寸 256GB', price: 4799 },
      { title: '机械革命极光Pro RTX4060 游戏笔记本', price: 6499 },
    ]

    const shop1Products = await Promise.all(
      digitalProducts.map((p) =>
        db.product.create({
          data: { shopId: shop1.id, title: p.title, price: p.price },
        })
      )
    )

    // ===== Create Products for Shop 2 (女装店) =====
    const fashionProducts = [
      { title: '2024新款春季碎花连衣裙女中长款', price: 168 },
      { title: '高腰显瘦牛仔裤女弹力修身小脚裤', price: 129 },
      { title: '法式复古小香风外套女优雅气质开衫', price: 259 },
      { title: '纯棉短袖T恤女宽松百搭2024夏季新款', price: 79 },
      { title: '雪纺衬衫女长袖通勤职业装气质上衣', price: 149 },
    ]

    const shop2Products = await Promise.all(
      fashionProducts.map((p) =>
        db.product.create({
          data: { shopId: shop2.id, title: p.title, price: p.price },
        })
      )
    )

    // ===== Helper: create reviews for a shop =====
    async function createReviewsForShop(shopId: string, products: { id: string }[], count: number) {
      const reviews: Array<{ id: string; rating: number; replyStatus: string; content: string }> = []
      for (let i = 0; i < count; i++) {
        // Determine rating with realistic distribution
        const rand = Math.random()
        let rating: number
        let sentiment: string
        let category: string | null
        let content: string

        if (rand < 0.3) {
          // 30% negative (1-2 stars)
          rating = Math.random() < 0.5 ? 1 : 2
          sentiment = 'negative'
          const catOptions = ['质量问题', '物流问题', '服务态度', '描述不符']
          category = randomItem(catOptions)
          content = randomItem(negativeReviews)
        } else if (rand < 0.55) {
          // 25% neutral (3 stars)
          rating = 3
          sentiment = 'neutral'
          category = null
          content = randomItem(neutralReviews)
        } else {
          // 45% positive (4-5 stars)
          rating = Math.random() < 0.5 ? 4 : 5
          sentiment = 'positive'
          category = null
          content = randomItem(positiveReviews)
        }

        const product = randomItem(products)
        const replyStatus = Math.random() < 0.2 ? 'replied' : 'pending'

        const review = await db.review.create({
          data: {
            shopId,
            productId: product.id,
            buyerName: randomItem(buyerNames),
            rating,
            content,
            sentiment,
            category,
            replyStatus,
            createdAt: randomDate(30, 0),
          },
        })
        reviews.push(review)
      }
      return reviews
    }

    // ===== Create Reviews =====
    const shop1Reviews = await createReviewsForShop(shop1.id, shop1Products, 22)
    const shop2Reviews = await createReviewsForShop(shop2.id, shop2Products, 24)

    // ===== Create Orders =====
    const orderStatuses = ['pending', 'paid', 'shipped', 'delivered', 'completed', 'refunded']

    async function createOrdersForShop(shopId: string, products: { id: string }[], count: number) {
      const orders: Array<{ id: string }> = []
      for (let i = 0; i < count; i++) {
        const product = randomItem(products)
        const status = randomItem(orderStatuses)
        const quantity = Math.floor(Math.random() * 3) + 1

        const order = await db.order.create({
          data: {
            shopId,
            productId: product.id,
            orderNo: `TB${Date.now()}${Math.floor(Math.random() * 10000)}`,
            buyerName: randomItem(buyerNames),
            buyerPhone: randomPhone(),
            amount: product instanceof Object && 'price' in product ? (product as { price: number; id: string }).price * quantity : 100 * quantity,
            status,
            address: randomItem(addresses),
            logisticsNo: ['shipped', 'delivered', 'completed'].includes(status) ? generateLogisticsNo() : null,
            logisticsCompany: ['shipped', 'delivered', 'completed'].includes(status) ? randomItem(logisticsCompanies) : null,
            createdAt: randomDate(45, 0),
          },
        })
        orders.push(order)
      }
      return orders
    }

    const shop1Orders = await createOrdersForShop(shop1.id, shop1Products.map(p => ({ id: p.id, price: p.price })), 18)
    const shop2Orders = await createOrdersForShop(shop2.id, shop2Products.map(p => ({ id: p.id, price: p.price })), 16)

    // ===== Create Chat Sessions and Messages =====
    async function createChatSessionsForShop(shopId: string, count: number) {
      const sessions: Array<{ id: string }> = []
      const topicFlows = [
        { topic: 'greeting', msgs: [{ sender: 'customer', content: '你好，在吗？' }, { sender: 'customer_service', content: randomItem(aiReplies.greeting) }] },
        { topic: 'product', msgs: [
          { sender: 'customer', content: '请问这款商品还有货吗？' },
          { sender: 'customer_service', content: randomItem(aiReplies.product) },
          { sender: 'customer', content: '好的，那我考虑一下再下单' },
        ]},
        { topic: 'logistics', msgs: [
          { sender: 'customer', content: '我的订单什么时候发货？' },
          { sender: 'customer_service', content: randomItem(aiReplies.logistics) },
          { sender: 'customer', content: '好的谢谢' },
        ]},
        { topic: 'afterSale', msgs: [
          { sender: 'customer', content: '收到的东西有问题，我要退货' },
          { sender: 'customer_service', content: randomItem(aiReplies.afterSale) },
          { sender: 'customer', content: '好的我拍一下照片发给你们' },
          { sender: 'customer_service', content: '好的，收到照片后我们会尽快为您处理。' },
        ]},
        { topic: 'price', msgs: [
          { sender: 'customer', content: '能便宜点吗？' },
          { sender: 'customer_service', content: randomItem(aiReplies.price) },
        ]},
        { topic: 'mixed', msgs: [
          { sender: 'customer', content: '你好，想问下这个和那个有什么区别？' },
          { sender: 'customer_service', content: randomItem(aiReplies.default) },
          { sender: 'customer', content: '等了很久了还没回复？' },
          { sender: 'customer_service', content: '抱歉让您久等了！这两个款式的主要区别在于材质和设计风格。A款采用棉质面料更加舒适，B款则是聚酯纤维更加挺括。' },
        ]},
      ]

      for (let i = 0; i < count; i++) {
        const status = randomItem(['active', 'active', 'active', 'closed', 'waiting'])
        const flow = randomItem(topicFlows)

        const session = await db.chatSession.create({
          data: {
            shopId,
            buyerName: randomItem(buyerNames),
            status,
            createdAt: randomDate(14, 0),
          },
        })

        for (const msg of flow.msgs) {
          await db.chatMessage.create({
            data: {
              sessionId: session.id,
              sender: msg.sender,
              content: msg.content,
              createdAt: new Date(session.createdAt.getTime() + Math.random() * 3600000),
            },
          })
        }

        sessions.push(session)
      }
      return sessions
    }

    const shop1Chats = await createChatSessionsForShop(shop1.id, 7)
    const shop2Chats = await createChatSessionsForShop(shop2.id, 6)

    // ===== Create Reply Templates =====
    for (const tpl of replyTemplates) {
      await db.replyTemplate.create({
        data: {
          name: tpl.name,
          category: tpl.category,
          content: tpl.content,
          isBuiltIn: true,
        },
      })
    }

    // ===== Add some replies to already-replied reviews =====
    const repliedReviews = [...shop1Reviews, ...shop2Reviews].filter(r => r.replyStatus === 'replied')
    for (const review of repliedReviews) {
      await db.reviewReply.create({
        data: {
          reviewId: review.id,
          content: `感谢您的${review.rating >= 4 ? '好评' : '反馈'}！我们会持续努力为您提供更好的购物体验。如有任何问题，欢迎随时联系我们的客服团队。`,
          type: 'ai_generated',
          isSent: true,
          aiScore: 0.85 + Math.random() * 0.15,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: '种子数据创建成功',
      data: {
        shops: 2,
        products: shop1Products.length + shop2Products.length,
        reviews: shop1Reviews.length + shop2Reviews.length,
        orders: shop1Orders.length + shop2Orders.length,
        chatSessions: shop1Chats.length + shop2Chats.length,
        replyTemplates: replyTemplates.length,
      },
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { success: false, message: '种子数据创建失败', error: String(error) },
      { status: 500 }
    )
  }
}
