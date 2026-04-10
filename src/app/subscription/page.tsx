'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, MessageCircle, Zap, Crown, Building2, ArrowLeft, RefreshCw, ArrowRight } from 'lucide-react'
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
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [plans, setPlans] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'cards' | 'comparison'>('cards')
  const [initLoading, setInitLoading] = useState(false)

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
  }, [router])

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/plans')
      const data = await res.json()
      if (data.success) {
        setPlans(data.data)
      } else {
        // 尝试初始化套餐
        await initializePlans()
      }
    } catch {
      // 初始化套餐
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

  const handleSelectPlan = async (planId: string) => {
    if (planId === user?.subscriptionTier) {
      alert('您已经是该套餐用户')
      return
    }

    if (planId === 'free') {
      alert('您已经是免费版用户')
      return
    }

    setLoading(true)
    // TODO: 接入支付系统
    const plan = plans.find(p => p.id === planId || p.tier === planId)
    alert(`感谢您选择${plan?.name}！支付功能即将上线，请联系客服开通。`)
    setLoading(false)
  }

  // 获取套餐对比数据
  const comparisonFeatures = [
    { label: '月付价格', getValue: (p: any) => p.price === 0 ? '免费' : `¥${p.price}/月`, isHighlight: false },
    { label: '年付价格', getValue: (p: any) => p.priceYearly === 0 ? '免费' : `¥${p.priceYearly}/年`, isHighlight: true },
    { label: '每日AI回复', getValue: (p: any) => p.dailyLimit === -1 ? '无限' : `${p.dailyLimit}次`, isHighlight: false },
    { label: '店铺数量', getValue: (p: any) => p.shopLimit === -1 ? '无限' : `${p.shopLimit}个`, isHighlight: false },
    { label: '模板数量', getValue: (p: any) => p.templateLimit === -1 ? '无限' : `${p.templateLimit}个`, isHighlight: false },
  ]

  // 获取所有功能列表
  const allFeatures = Array.from(new Set(
    plans.flatMap(p => p.features)
  ))

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">选择套餐</h1>
            <p className="text-sm text-slate-500">选择适合您业务规模的方案</p>
          </div>
        </div>
      </header>

      {/* Current Plan Banner */}
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

      {/* Tab Navigation */}
      <div className="max-w-6xl mx-auto px-4 pt-8">
        <div className="flex gap-4 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('cards')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'cards'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            套餐卡片
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'comparison'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            套餐对比
          </button>
        </div>
      </div>

      {/* Loading State */}
      {initLoading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
          <span className="ml-3 text-slate-600">正在初始化套餐数据...</span>
        </div>
      )}

      {/* Pricing Cards View */}
      {!initLoading && activeTab === 'cards' && (
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const Icon = iconMap[plan.tier] || MessageCircle
              const colors = colorMap[plan.tier] || colorMap.free
              const isCurrentPlan = user?.subscriptionTier === plan.tier
              const isRecommended = plan.tier === 'basic'

              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-transform hover:scale-[1.02] ${
                    isRecommended ? 'ring-2 ring-blue-500' : ''
                  } ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}
                >
                  {/* Recommended Badge */}
                  {isRecommended && !isCurrentPlan && (
                    <div className="bg-blue-500 text-white text-center text-xs font-medium py-1">
                      推荐
                    </div>
                  )}
                  
                  {/* Current Plan Badge */}
                  {isCurrentPlan && (
                    <div className="bg-green-500 text-white text-center text-xs font-medium py-1">
                      当前套餐
                    </div>
                  )}
                  
                  <div className={`p-6 ${isRecommended || isCurrentPlan ? 'pt-4' : ''}`}>
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${colors.bg} mb-4`}>
                      <Icon className={`h-6 w-6 ${colors.text}`} />
                    </div>
                    
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                    
                    {plan.description && (
                      <p className="text-sm text-slate-500 mb-4">{plan.description}</p>
                    )}
                    
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-slate-900">
                        {plan.price === 0 ? '免费' : `¥${plan.price}`}
                      </span>
                      {plan.price > 0 && <span className="text-slate-500">/月</span>}
                    </div>

                    <div className="text-sm text-slate-600 mb-6">
                      <span className="font-semibold text-slate-900">{plan.dailyLimit === -1 ? '无限' : plan.dailyLimit}</span> 次/日
                    </div>

                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                          <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleSelectPlan(plan.tier)}
                      disabled={loading || isCurrentPlan}
                      className={`w-full py-3 rounded-lg font-medium transition-colors ${
                        isCurrentPlan
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : isRecommended
                          ? 'bg-blue-500 hover:bg-blue-600 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {isCurrentPlan ? '当前套餐' : plan.price === 0 ? '免费使用' : '立即开通'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* FAQ */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">常见问题</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow">
                <h3 className="font-semibold text-slate-900 mb-2">如何升级套餐？</h3>
                <p className="text-sm text-slate-600">点击您想要的套餐，联系客服即可开通。支付方式支持微信、支付宝转账。</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow">
                <h3 className="font-semibold text-slate-900 mb-2">用完可以购买次数吗？</h3>
                <p className="text-sm text-slate-600">可以。付费用户可以额外购买AI调用次数，价格为0.5元/次。</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow">
                <h3 className="font-semibold text-slate-900 mb-2">套餐可以退款吗？</h3>
                <p className="text-sm text-slate-600">包月套餐7天内可申请退款，包年套餐30天内可申请退款。</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow">
                <h3 className="font-semibold text-slate-900 mb-2">企业版有什么特别服务？</h3>
                <p className="text-sm text-slate-600">企业版包含专属客服、API接入支持、定制化功能开发和私有化部署服务。</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Table View */}
      {!initLoading && activeTab === 'comparison' && (
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 w-1/4">
                      功能对比
                    </th>
                    {plans.map((plan) => {
                      const Icon = iconMap[plan.tier] || MessageCircle
                      const colors = colorMap[plan.tier] || colorMap.free
                      const isCurrentPlan = user?.subscriptionTier === plan.tier
                      
                      return (
                        <th 
                          key={plan.id} 
                          className={`px-6 py-4 text-center ${isCurrentPlan ? 'bg-green-50' : ''}`}
                        >
                          <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${colors.bg} mb-2`}>
                            <Icon className={`h-5 w-5 ${colors.text}`} />
                          </div>
                          <div className="font-bold text-slate-900">{plan.name}</div>
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
                  {/* Price Rows */}
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900" colSpan={plans.length + 1}>
                      价格
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-600 pl-10">月付价格</td>
                    {plans.map((plan) => (
                      <td key={plan.id} className="px-6 py-4 text-center text-sm font-medium">
                        {plan.price === 0 ? '免费' : `¥${plan.price}`}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-600 pl-10">年付价格</td>
                    {plans.map((plan) => (
                      <td key={plan.id} className="px-6 py-4 text-center">
                        {plan.priceYearly ? (
                          <span className="text-sm">
                            <span className="font-medium text-slate-900">¥{plan.priceYearly}</span>
                            <span className="text-slate-400 text-xs ml-1">/年</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Limits Rows */}
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900" colSpan={plans.length + 1}>
                      限制
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-600 pl-10">每日AI回复次数</td>
                    {plans.map((plan) => (
                      <td key={plan.id} className="px-6 py-4 text-center text-sm">
                        {plan.dailyLimit === -1 ? (
                          <span className="text-green-600 font-medium">无限</span>
                        ) : (
                          `${plan.dailyLimit}次`
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-600 pl-10">店铺数量</td>
                    {plans.map((plan) => (
                      <td key={plan.id} className="px-6 py-4 text-center text-sm">
                        {plan.shopLimit === -1 ? (
                          <span className="text-green-600 font-medium">无限</span>
                        ) : (
                          `${plan.shopLimit}个`
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-600 pl-10">可用模板数量</td>
                    {plans.map((plan) => (
                      <td key={plan.id} className="px-6 py-4 text-center text-sm">
                        {plan.templateLimit === -1 ? (
                          <span className="text-green-600 font-medium">无限</span>
                        ) : (
                          `${plan.templateLimit}个`
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Features Rows */}
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900" colSpan={plans.length + 1}>
                      功能
                    </td>
                  </tr>
                  {allFeatures.map((feature) => (
                    <tr key={feature} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-600 pl-10">{feature}</td>
                      {plans.map((plan) => (
                        <td key={plan.id} className="px-6 py-4 text-center">
                          {plan.features.includes(feature) ? (
                            <Check className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-slate-300 mx-auto" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-8 text-center">
            <p className="text-slate-600 mb-4">选择适合您的套餐，立即开始体验</p>
            <Link 
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              返回首页
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Contact */}
      <div className="mt-12 text-center pb-12">
        <p className="text-slate-600 mb-4">有其他问题？联系客服咨询</p>
        <p className="text-2xl font-bold text-orange-500">132-7709-1317</p>
        <p className="text-sm text-slate-500 mt-1">（东哥热线，7x24小时服务）</p>
      </div>
    </div>
  )
}
