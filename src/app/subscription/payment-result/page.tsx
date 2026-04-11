'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, X, ArrowLeft, RefreshCw, Loader2, CreditCard } from 'lucide-react'
import Link from 'next/link'

export default function PaymentResultPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [paymentData, setPaymentData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const orderId = searchParams.get('orderId')
    const mode = searchParams.get('mode')

    if (!orderId) {
      setError('缺少订单号')
      setLoading(false)
      return
    }

    queryPayment(orderId, mode === 'sandbox')
  }, [searchParams])

  const queryPayment = async (orderId: string, isSandbox: boolean) => {
    try {
      const res = await fetch(`/api/payment/${orderId}`)
      const data = await res.json()

      if (data.success) {
        setPaymentData({
          ...data.data,
          isSandbox
        })
      } else {
        setError(data.message || '查询失败')
      }
    } catch (e: any) {
      setError(`查询失败: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleMockPayment = async () => {
    if (!paymentData?.orderId) return

    setLoading(true)
    try {
      const res = await fetch('/api/payment/mock-success', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: paymentData.orderId })
      })
      const data = await res.json()

      if (data.success) {
        setPaymentData({
          ...paymentData,
          status: 'paid',
          statusText: '已支付',
          amount: data.data.amount
        })
        // 刷新页面状态
        window.location.reload()
      } else {
        alert(data.message || '模拟支付失败')
      }
    } catch (e: any) {
      alert(`操作失败: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    const orderId = searchParams.get('orderId')
    const mode = searchParams.get('mode')
    if (orderId) {
      router.push(`/subscription?orderId=${orderId}&mode=${mode}`)
    } else {
      router.push('/subscription')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        {loading ? (
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">正在查询支付状态...</p>
          </div>
        ) : error ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-red-600 mb-2">查询失败</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <div className="flex gap-3">
              <Link
                href="/subscription"
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-center"
              >
                返回选择套餐
              </Link>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
              >
                重试
              </button>
            </div>
          </div>
        ) : paymentData?.status === 'paid' ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">支付成功！</h2>
            <p className="text-slate-600 mb-6">
              您已成功订阅 {paymentData.planName || '会员套餐'}
            </p>

            <div className="bg-slate-50 rounded-lg p-4 mb-6 text-left">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-600">订单号</span>
                <span className="font-mono text-sm">{paymentData.orderId}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-600">金额</span>
                <span className="font-bold text-blue-600">¥{paymentData.amount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">支付方式</span>
                <span>{paymentData.isSandbox ? '模拟支付' : '支付宝'}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                href="/"
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-center"
              >
                返回首页
              </Link>
              <Link
                href="/subscription"
                className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-center"
              >
                查看套餐
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="h-8 w-8 text-orange-500" />
            </div>
            <h2 className="text-xl font-bold text-orange-600 mb-2">等待支付</h2>
            <p className="text-slate-600 mb-4">
              订单 {paymentData?.orderId} 尚未完成支付
            </p>

            {paymentData?.isSandbox && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-yellow-800">
                  <span className="font-semibold">💡 沙箱测试：</span>
                  点击下方按钮模拟支付完成
                </p>
              </div>
            )}

            <div className="bg-slate-50 rounded-lg p-4 mb-6 text-left">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-600">订单号</span>
                <span className="font-mono text-sm">{paymentData?.orderId}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-600">金额</span>
                <span className="font-bold text-blue-600">¥{paymentData?.amount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">状态</span>
                <span className="text-orange-600 font-medium">
                  {paymentData?.statusText || '待支付'}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                href="/subscription"
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-center"
              >
                返回选择套餐
              </Link>
              {paymentData?.isSandbox && (
                <button
                  onClick={handleMockPayment}
                  className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium"
                >
                  模拟支付
                </button>
              )}
            </div>
          </div>
        )}

        {/* 帮助链接 */}
        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">
            遇到问题？
            <Link href="/subscription" className="text-blue-500 hover:underline ml-1">
              返回套餐页面
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
