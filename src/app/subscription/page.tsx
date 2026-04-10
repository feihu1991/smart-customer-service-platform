'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, MessageCircle, Zap, Crown, Building2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const plans = [
  {
    id: 'free',
    name: '免费版',
    icon: MessageCircle,
    price: 0,
    dailyLimit: 3,
    color: 'slate',
    features: [
      '每日3次AI回复',
      '基础评价分析',
      '简单回复模板',
      '单店铺管理',
    ],
    notIncluded: [
      '批量回复功能',
      '高级数据分析',
      '优先AI响应',
    ],
  },
  {
    id: 'basic',
    name: '基础版',
    icon: Zap,
    price: 99,
    dailyLimit: 50,
    color: 'blue',
    features: [
      '每日50次AI回复',
      '优先AI响应',
      '数据报表',
      '多店铺管理',
      '邮件支持',
    ],
    notIncluded: [
      '批量回复功能',
      'API接入',
    ],
    recommended: true,
  },
  {
    id: 'pro',
    name: '专业版',
    icon: Crown,
    price: 299,
    dailyLimit: 200,
    color: 'purple',
    features: [
      '每日200次AI回复',
      '优先AI响应',
      '高级数据报表',
      '批量回复',
      '多店铺管理',
      '优先技术支持',
    ],
    notIncluded: ['API接入', '定制化服务'],
  },
  {
    id: 'enterprise',
    name: '企业版',
    icon: Building2,
    price: 999,
    dailyLimit: 1000,
    color: 'orange',
    features: [
      '每日1000次AI回复',
      '专属客服支持',
      'API接入',
      '定制化服务',
      '私有化部署',
      'SLA保障',
    ],
    notIncluded: [],
  },
]

export default function SubscriptionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)

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
  }, [router])

  const handleSelectPlan = async (planId: string) => {
    if (planId === 'free') {
      alert('您已经是免费版用户')
      return
    }

    setLoading(true)
    // TODO: 接入支付系统
    alert(`感谢您选择${plans.find(p => p.id === planId)?.name}！支付功能即将上线，请联系客服开通。`)
    setLoading(false)
  }

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
                <p className="text-2xl font-bold">{plans.find(p => p.id === user.subscriptionTier)?.name || '免费版'}</p>
              </div>
              <div className="text-right">
                <p className="text-orange-100 text-sm">今日剩余次数</p>
                <p className="text-2xl font-bold">{user.dailyLimit - user.dailyUsageCount} / {user.dailyLimit}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon
            const isCurrentPlan = user?.subscriptionTier === plan.id
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-transform hover:scale-[1.02] ${
                  plan.recommended ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                {plan.recommended && (
                  <div className="bg-blue-500 text-white text-center text-xs font-medium py-1">
                    推荐
                  </div>
                )}
                
                <div className={`p-6 ${plan.recommended ? 'pt-4' : ''}`}>
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-${plan.color}-100 mb-4`}>
                    <Icon className={`h-6 w-6 text-${plan.color}-600`} />
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                  
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-slate-900">
                      {plan.price === 0 ? '免费' : `¥${plan.price}`}
                    </span>
                    {plan.price > 0 && <span className="text-slate-500">/月</span>}
                  </div>

                  <div className="text-sm text-slate-600 mb-6">
                    <span className="font-semibold text-slate-900">{plan.dailyLimit}</span> 次/日
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                        <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                    {plan.notIncluded.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-400">
                        <span className="h-4 w-4 shrink-0 mt-0.5">-</span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={loading || isCurrentPlan}
                    className={`w-full py-3 rounded-lg font-medium transition-colors ${
                      isCurrentPlan
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : plan.recommended
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

        {/* Contact */}
        <div className="mt-12 text-center">
          <p className="text-slate-600 mb-4">有其他问题？联系客服咨询</p>
          <p className="text-2xl font-bold text-orange-500">132-7709-1317</p>
          <p className="text-sm text-slate-500 mt-1">（东哥热线，7x24小时服务）</p>
        </div>
      </div>
    </div>
  )
}
