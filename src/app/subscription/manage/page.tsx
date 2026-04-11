'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, ArrowLeft, RefreshCw, Loader2, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'

// 套餐图标映射
const iconMap: Record<string, any> = {
  free: '📦',
  basic: '⚡',
  pro: '👑',
  enterprise: '🏢',
}

// 状态颜色映射
const statusColorMap: Record<string, { bg: string; text: string }> = {
  active: { bg: 'bg-green-100', text: 'text-green-700' },
  cancelled: { bg: 'bg-orange-100', text: 'text-orange-700' },
  expired: { bg: 'bg-red-100', text: 'text-red-700' },
  pending: { bg: 'bg-blue-100', text: 'text-blue-700' },
}

export default function SubscriptionManagePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [subscriptionData, setSubscriptionData] = useState<any>(null)
  const [plans, setPlans] = useState<any[]>([])
  const [cancelLoading, setCancelLoading] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelType, setCancelType] = useState<'immediately' | 'endOfPeriod'>('endOfPeriod')

  useEffect(() => {
    fetchSubscription()
    fetchPlans()
  }, [])

  const fetchSubscription = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/subscription', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      })
      const data = await res.json()
      if (data.success) {
        setSubscriptionData(data.data)
      } else {
        router.push('/login')
      }
    } catch {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/plans')
      const data = await res.json()
      if (data.success) {
        setPlans(data.data)
      }
    } catch (e) {
      console.error('获取套餐失败', e)
    }
  }

  const handleCancelSubscription = async () => {
    setCancelLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          cancelImmediately: cancelType === 'immediately',
        }),
      })
      const data = await res.json()
      
      if (data.success) {
        alert(data.message)
        setShowCancelModal(false)
        fetchSubscription()
      } else {
        alert(data.message || '取消订阅失败')
      }
    } catch (e: any) {
      alert(`操作失败: ${e.message}`)
    } finally {
      setCancelLoading(false)
    }
  }

  // 格式化日期
  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  // 获取状态文本
  const getStatusText = (status: string) => {
    const map: Record<string, string> = {
      active: '有效',
      cancelled: '已取消',
      expired: '已过期',
      pending: '待生效',
    }
    return map[status] || status
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-blue-500 animate-spin mx-auto" />
          <p className="mt-4 text-slate-600">加载中...</p>
        </div>
      </div>
    )
  }

  const { user, plan, subscriptions } = subscriptionData || {}
  const currentPlan = plan

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 取消订阅确认弹窗 */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold">确认取消订阅</h3>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <p className="text-slate-600 mb-4">请选择取消方式：</p>
              
              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 mb-3">
                <input
                  type="radio"
                  name="cancelType"
                  checked={cancelType === 'endOfPeriod'}
                  onChange={() => setCancelType('endOfPeriod')}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium">取消自动续费</p>
                  <p className="text-sm text-slate-500">
                    当前套餐可用至 {formatDate(user?.subscriptionExpireAt)}，到期后自动降级为免费版
                  </p>
                </div>
              </label>
              
              <label className="flex items-start gap-3 p-3 rounded-lg border border-red-200 bg-red-50 cursor-pointer hover:bg-red-100">
                <input
                  type="radio"
                  name="cancelType"
                  checked={cancelType === 'immediately'}
                  onChange={() => setCancelType('immediately')}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-red-600">立即取消</p>
                  <p className="text-sm text-red-500">
                    立即降级为免费版，未使用的订阅时长不退还
                  </p>
                </div>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelLoading}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
              >
                返回
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg font-medium flex items-center justify-center gap-2"
              >
                {cancelLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    处理中...
                  </>
                ) : (
                  '确认取消'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 页面头部 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">订阅管理</h1>
            <p className="text-sm text-slate-500">管理您的订阅套餐</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* 当前订阅状态 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">当前订阅</h2>
          
          {user && (
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl text-white mb-6">
              <div className="text-4xl">{iconMap[user.subscriptionTier] || '📦'}</div>
              <div className="flex-1">
                <p className="text-blue-100 text-sm">当前套餐</p>
                <p className="text-2xl font-bold">
                  {currentPlan?.name || '免费版'}
                </p>
                <p className="text-blue-100 text-sm mt-1">
                  {user.subscriptionExpireAt && user.subscriptionStatus === 'active'
                    ? `到期时间: ${formatDate(user.subscriptionExpireAt)}`
                    : user.subscriptionStatus === 'cancelled'
                      ? '已取消自动续费'
                      : user.subscriptionStatus === 'expired'
                        ? '已过期'
                        : '永久有效'}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusColorMap[user.subscriptionStatus]?.bg} ${statusColorMap[user.subscriptionStatus]?.text}`}>
                {getStatusText(user.subscriptionStatus)}
              </div>
            </div>
          )}

          {/* 使用情况 */}
          {currentPlan && user && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-slate-500 text-sm">今日剩余</p>
                <p className="text-2xl font-bold text-blue-600">
                  {user.dailyRemaining}
                </p>
                <p className="text-slate-400 text-xs">次</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-slate-500 text-sm">每日限额</p>
                <p className="text-2xl font-bold text-slate-600">
                  {user.dailyLimit === -1 ? '∞' : user.dailyLimit}
                </p>
                <p className="text-slate-400 text-xs">次</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-slate-500 text-sm">套餐价格</p>
                <p className="text-2xl font-bold text-green-600">
                  {currentPlan.price === 0 ? '免费' : `¥${currentPlan.price}`}
                </p>
                <p className="text-slate-400 text-xs">/月</p>
              </div>
            </div>
          )}

          {/* 套餐功能 */}
          {currentPlan && currentPlan.features?.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium text-slate-700 mb-3">套餐包含功能</h3>
              <div className="grid grid-cols-2 gap-2">
                {currentPlan.features.map((feature: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          {user?.subscriptionTier !== 'free' && (
            <div className="flex gap-3">
              <Link
                href="/subscription"
                className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-center"
              >
                升级套餐
              </Link>
              {user?.subscriptionStatus !== 'cancelled' && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-medium"
                >
                  取消订阅
                </button>
              )}
            </div>
          )}
        </div>

        {/* 订阅历史 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4">订阅历史</h2>
          
          {subscriptions && subscriptions.length > 0 ? (
            <div className="space-y-3">
              {subscriptions.map((sub: any) => (
                <div key={sub.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{iconMap[sub.tier] || '📦'}</div>
                    <div>
                      <p className="font-medium">
                        {plans.find(p => p.tier === sub.tier)?.name || sub.tier}
                      </p>
                      <p className="text-sm text-slate-500">
                        {formatDate(sub.startDate)} - {formatDate(sub.endDate)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {sub.price === 0 ? '免费' : `¥${sub.price}`}
                    </p>
                    <p className={`text-sm ${statusColorMap[sub.status]?.text}`}>
                      {getStatusText(sub.status)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Clock className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>暂无订阅记录</p>
            </div>
          )}
        </div>

        {/* 返回首页 */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>
        </div>
      </main>
    </div>
  )
}
