'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, X, MessageCircle, Zap, Crown, Building2, ArrowLeft, RefreshCw, ArrowRight, Loader2, CreditCard, Settings } from 'lucide-react'
import Link from 'next/link'

// 套餐图标映射
const iconMap: Record<string, any> = {
  free: MessageCircle,
  basic: Zap,
  pro: Crown,
  enterprise: Building2,
}

// 颜色映射
const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  free: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  basic: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
  pro: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
  enterprise: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
}

export default function SubscriptionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [plans, setPlans] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'cards' | 'comparison'>('cards')
  const [initLoading, setInitLoading] = useState(false)
  
  // 支付相关状态
  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  
  // 支付结果状态
  const [paymentResult, setPaymentResult] = useState<any>(null)
  const [showResultModal, setShowResultModal] = useState(false)

  useEffect(() => {
    // 获取用户信息
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUser(data.data.user)
        } else {
          router.push('/login')
        }
      })
      .catch(() => router.push('/login'))
    
    // 获取套餐列表
    fetchPlans()
    
    // 检查URL中的支付结果参数
    const orderId = searchParams.get('orderId')
    const mode = searchParams.get('mode')
    if (orderId) {
      queryPaymentStatus(orderId, mode === 'sandbox')
    }
  }, [router, searchParams])

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/plans')
      const data = await res.json()
      if (data.success) {
        setPlans(data.data)
      } else {
        await initializePlans()
      }
    } catch {
      await initializePlans()
    }
  }

  const initializePlans = async () => {
    setInitLoading(true)
    try {
      const res = await fetch('/api/plans/init', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        await fetchPlans()
      }
    } finally {
      setInitLoading(false)
    }
  }

  // 查询支付状态
  const queryPaymentStatus = async (orderId: string, isSandbox: boolean) => {
    try {
      const res = await fetch(`/api/payment/${orderId}`)
      const data = await res.json()
      if (data.success) {
        setPaymentResult({
          orderId,
          status: data.data.status,
          statusText: data.data.statusText,
          amount: data.data.amount,
          planName: data.data.planName,
          isSandbox
        })
        setShowResultModal(true)
      }
    } catch (e) {
      console.error('查询支付状态失败:', e)
    }
  }

  // 选择套餐并打开支付弹窗
  const handleSelectPlan = async (plan: any) => {
    if (plan.tier === user?.subscriptionTier) {
      alert('您已经是该套餐用户')
      return
    }

    if (plan.tier === 'free') {
      alert('您已经是免费版用户')
      return
    }

    setSelectedPlan(plan)
    setShowPaymentModal(true)
  }

  // 创建支付订单
  const handleCreatePayment = async () => {
    if (!selectedPlan) return
    
    setPaymentLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
          billingCycle
        })
      })
      const data = await res.json()
      
      if (data.success) {
        if (data.sandbox || data.data.mode === 'sandbox') {
          // 沙箱模式：直接跳转到支付结果页面
          router.push(`/subscription/payment-result?orderId=${data.data.orderId}&mode=sandbox`)
        } else {
          // 正式模式：显示支付宝支付
          alert(`支付宝支付链接已生成，请完成支付。订单号: ${data.data.orderId}`)
        }
      } else {
        alert(data.message || '创建支付订单失败')
      }
    } catch (e: any) {
      alert(`支付创建失败: ${e.message}`)
    } finally {
      setPaymentLoading(false)
      setShowPaymentModal(false)
    }
  }

  // 模拟支付成功（沙箱测试用）
  const handleMockPayment = async () => {
    if (!selectedPlan) return
    
    setPaymentLoading(true)
    try {
      const token = localStorage.getItem('token')
      
      // 先创建支付订单
      const createRes = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
          billingCycle
        })
      })
      const createData = await createRes.json()
      
      if (!createData.success) {
        alert(createData.message || '创建支付订单失败')
        return
      }

      const orderId = createData.data.orderId

      // 模拟支付成功
      const mockRes = await fetch('/api/payment/mock-success', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderId })
      })
      const mockData = await mockRes.json()
      
      if (mockData.success) {
        setPaymentResult({
          orderId,
          status: 'paid',
          statusText: '已支付',
          amount: mockData.data.amount,
          planName: selectedPlan.name,
          isSandbox: true
        })
        setShowResultModal(true)
        // 刷新用户信息
        fetch('/api/auth/me')
          .then(res => res.json())
          .then(data => {
            if (data.success) setUser(data.data.user)
          })
      } else {
        alert(mockData.message || '模拟支付失败')
      }
    } catch (e: any) {
      alert(`操作失败: ${e.message}`)
    } finally {
      setPaymentLoading(false)
      setShowPaymentModal(false)
    }
  }

  // 获取套餐价格
  const getPrice = (plan: any) => {
    return billingCycle === 'yearly' 
      ? (plan.priceYearly || plan.price * 12) 
      : plan.price
  }

  // 获取套餐对比数据
  const comparisonFeatures = [
    { label: '月付价格', getValue: (p: any) => p.price === 0 ? '免费' : `¥${p.price}/月`, isHighlight: false },
    { label: '年付价格', getValue: (p: any) => p.priceYearly === 0 ? '免费' : `¥${p.priceYearly}/年`, isHighlight: true },
    { label: '每日AI回复', getValue: (p: any) => p.dailyLimit === -1 ? '无限' : `${p.dailyLimit}次`, isHighlight: false },
    { label: '店铺数量', getValue: (p: any) => p.shopLimit === -1 ? '无限' : `${p.shopLimit}个`, isHighlight: false },
    { label: '模板数量', getValue: (p: any) => p.templateLimit === -1 ? '无限' : `${p.templateLimit}个`, isHighlight: false },
  ]

  // 所有功能列表
  const allFeatures = Array.from(new Set(plans.flatMap((p: any) => {
    try {
      return JSON.parse(p.features || '[]')
    } catch {
      return []
    }
  })))

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 支付确认弹窗 */}
      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">确认支付</h3>
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-600">套餐</span>
                <span className="font-semibold">{selectedPlan.name}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-600">计费周期</span>
                <div className="flex gap-2">
                  {['monthly', 'yearly'].map(bc => (
                    <button
                      key={bc}
                      onClick={() => setBillingCycle(bc as any)}
                      className={`px-3 py-1 rounded-lg text-sm ${
                        billingCycle === bc 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-slate-200 hover:bg-slate-300'
                      }`}
                    >
                      {bc === 'monthly' ? '月付' : '年付'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">金额</span>
                <span className="text-2xl font-bold text-blue-600">
                  ¥{getPrice(selectedPlan).toFixed(2)}
                </span>
              </div>
              {billingCycle === 'yearly' && selectedPlan.priceYearly && (
                <div className="text-right text-sm text-green-600 mt-1">
                  节省 ¥{(selectedPlan.price * 12 - selectedPlan.priceYearly).toFixed(2)}/年
                </div>
              )}
            </div>
            
            {/* 沙箱测试提示 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <span className="font-semibold">💡 沙箱测试：</span>
                点击下方"模拟支付"按钮可测试支付流程
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                disabled={paymentLoading}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
              >
                取消
              </button>
              <button
                onClick={handleMockPayment}
                disabled={paymentLoading}
                className="flex-1 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg font-medium flex items-center justify-center gap-2"
              >
                {paymentLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    处理中...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    模拟支付 ¥{getPrice(selectedPlan).toFixed(2)}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 支付结果弹窗 */}
      {showResultModal && paymentResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              {paymentResult.status === 'paid' ? (
                <>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold text-green-600">支付成功！</h3>
                  <p className="text-slate-600 mt-2">
                    您已成功订阅 {paymentResult.planName}
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <RefreshCw className="h-8 w-8 text-orange-500" />
                  </div>
                  <h3 className="text-xl font-bold text-orange-600">等待支付</h3>
                  <p className="text-slate-600 mt-2">
                    订单 {paymentResult.orderId} 待支付
                  </p>
                </>
              )}
            </div>
            
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-600">订单号</span>
                <span className="font-mono text-sm">{paymentResult.orderId}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-600">金额</span>
                <span className="font-bold text-blue-600">¥{paymentResult.amount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">状态</span>
                <span className={`font-medium ${
                  paymentResult.status === 'paid' ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {paymentResult.statusText}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowResultModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
              >
                关闭
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
              >
                返回首页
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 页面头部 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-slate-100 rounded-lg">
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">选择套餐</h1>
              <p className="text-sm text-slate-500">选择适合您业务规模的方案</p>
            </div>
          </div>
          <Link 
            href="/subscription/manage" 
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium"
          >
            <Settings className="h-4 w-4" />
            订阅管理
          </Link>
        </div>
      </header>

      {/* 用户当前状态 */}
      {user && (
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">当前套餐</p>
                <p className="text-2xl font-bold">
                  {plans.find(p => p.tier === user.subscriptionTier)?.name || '免费版'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-orange-100 text-sm">今日剩余次数</p>
                <p className="text-2xl font-bold">
                  {user.dailyLimit - user.dailyUsageCount} / {user.dailyLimit}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 加载状态 */}
      {initLoading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
          <span className="ml-3 text-slate-600">正在初始化套餐数据...</span>
        </div>
      )}

      {/* 套餐卡片视图 */}
      {!initLoading && activeTab === 'cards' && (
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map(plan => {
              const Icon = iconMap[plan.tier] || MessageCircle
              const colors = colorMap[plan.tier] || colorMap.free
              const isCurrentPlan = user?.subscriptionTier === plan.tier
              const isRecommended = plan.tier === 'basic'
              const displayPrice = getPrice(plan)

              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-transform hover:scale-[1.02] ${
                    isRecommended ? 'ring-2 ring-blue-500' : ''
                  } ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}
                >
                  {isRecommended && !isCurrentPlan && (
                    <div className="bg-blue-500 text-white text-center text-xs font-medium py-1">
                      推荐
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div className="bg-green-500 text-white text-center text-xs font-medium py-1">
                      当前套餐
                    </div>
                  )}

                  <div className={`p-6 ${isRecommended || isCurrentPlan ? 'pt-4' : ''}`}>
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${colors.bg} mb-4`}>
                      <Icon className={`h-6 w-6 ${colors.text}`} />
                    </div>

                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                    {plan.description && (
                      <p className="text-sm text-slate-500 mb-4">{plan.description}</p>
                    )}

                    <div className="mb-4">
                      <span className="text-4xl font-bold">
                        {displayPrice === 0 ? '免费' : `¥${displayPrice}`}
                      </span>
                      {displayPrice > 0 && (
                        <span className="text-slate-500">/{billingCycle === 'yearly' ? '年' : '月'}</span>
                      )}
                    </div>

                    {billingCycle === 'yearly' && plan.priceYearly && plan.price > 0 && (
                      <div className="text-sm text-green-600 mb-2">
                        月均 ¥{(plan.priceYearly / 12).toFixed(0)}，省 ¥{(plan.price * 12 - plan.priceYearly).toFixed(0)}/年
                      </div>
                    )}

                    <div className="text-sm text-slate-600 mb-6">
                      <span className="font-semibold">
                        {plan.dailyLimit === -1 ? '无限' : plan.dailyLimit}
                      </span>
                      次/日
                    </div>

                    {/* 功能列表 */}
                    <ul className="space-y-3 mb-6">
                      {(() => {
                        try {
                          const features = JSON.parse(plan.features || '[]')
                          return features.slice(0, 4).map((f: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                              <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                              {f}
                            </li>
                          ))
                        } catch {
                          return null
                        }
                      })()}
                    </ul>

                    {/* 购买按钮 */}
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={isCurrentPlan}
                      className={`w-full py-3 rounded-lg font-medium ${
                        isCurrentPlan
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : isRecommended
                            ? 'bg-blue-500 hover:bg-blue-600 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {isCurrentPlan ? '当前套餐' : plan.price === 0 ? '免费使用' : '立即购买'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 常见问题 */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-8 text-center">常见问题</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { q: '如何升级套餐？', a: '点击您想要的套餐，选择支付方式后即可完成支付升级。' },
                { q: '用完可以购买次数吗？', a: '可以。付费用户可以额外购买AI调用次数。' },
                { q: '套餐可以退款吗？', a: '包月套餐7天内可申请退款，包年套餐30天内可申请退款。' },
                { q: '企业版有什么特别服务？', a: '企业版包含专属客服、API接入支持、定制化功能开发。' },
              ].map((faq, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow">
                  <h3 className="font-semibold mb-2">{faq.q}</h3>
                  <p className="text-sm text-slate-600">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 套餐对比视图 */}
      {!initLoading && activeTab === 'comparison' && (
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-4 text-left text-sm font-semibold w-1/4">功能对比</th>
                    {plans.map(plan => {
                      const Icon = iconMap[plan.tier] || MessageCircle
                      const colors = colorMap[plan.tier] || colorMap.free
                      const isCurrentPlan = user?.subscriptionTier === plan.tier

                      return (
                        <th key={plan.id} className={`px-6 py-4 text-center ${isCurrentPlan ? 'bg-green-50' : ''}`}>
                          <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${colors.bg} mb-2`}>
                            <Icon className={`h-5 w-5 ${colors.text}`} />
                          </div>
                          <div className="font-bold">{plan.name}</div>
                          <div className="text-sm text-slate-500">
                            {plan.price === 0 ? '免费' : `¥${plan.price}/月`}
                          </div>
                          {isCurrentPlan && (
                            <span className="inline-block mt-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                              当前
                            </span>
                          )}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* 基础对比 */}
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium" colSpan={plans.length + 1}>
                      基础信息
                    </td>
                  </tr>
                  {comparisonFeatures.map(row => (
                    <tr key={row.label} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-600 pl-10">{row.label}</td>
                      {plans.map(plan => (
                        <td key={plan.id} className="px-6 py-4 text-center">
                          {row.getValue(plan)}
                        </td>
                      ))}
                    </tr>
                  ))}

                  {/* 功能对比 */}
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium" colSpan={plans.length + 1}>
                      功能
                    </td>
                  </tr>
                  {allFeatures.map(feature => (
                    <tr key={feature} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-600 pl-10">{feature}</td>
                      {plans.map(plan => {
                        try {
                          const features = JSON.parse(plan.features || '[]')
                          return (
                            <td key={plan.id} className="px-6 py-4 text-center">
                              {features.includes(feature) ? (
                                <Check className="h-5 w-5 text-green-500 mx-auto" />
                              ) : (
                                <X className="h-5 w-5 text-slate-300 mx-auto" />
                              )}
                            </td>
                          )
                        } catch {
                          return <td key={plan.id} />
                        }
                      })}
                    </tr>
                  ))}

                  {/* 操作 */}
                  <tr className="bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium">操作</td>
                    {plans.map(plan => {
                      const isCurrentPlan = user?.subscriptionTier === plan.tier
                      return (
                        <td key={plan.id} className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleSelectPlan(plan)}
                            disabled={isCurrentPlan}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${
                              isCurrentPlan
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }`}
                          >
                            {isCurrentPlan ? '当前' : '购买'}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-slate-600 mb-4">选择适合您的套餐，立即开始体验</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
            >
              <ArrowRight className="h-4 w-4" />
              返回首页
            </Link>
          </div>
        </div>
      )}

      {/* Tab切换 */}
      <div className="max-w-6xl mx-auto px-4 pt-8">
        <div className="flex gap-4 border-b border-slate-200">
          {(['cards', 'comparison'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-2 font-medium ${
                activeTab === tab
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'cards' ? '套餐卡片' : '套餐对比'}
            </button>
          ))}
        </div>
      </div>

      {/* 底部联系 */}
      <div className="mt-12 text-center pb-12">
        <p className="text-slate-600 mb-4">有其他问题？联系客服咨询</p>
        <p className="text-2xl font-bold text-orange-500">132-7709-1317</p>
        <p className="text-sm text-slate-500 mt-1">（东哥热线，7x24小时服务）</p>
      </div>
    </div>
  )
}
