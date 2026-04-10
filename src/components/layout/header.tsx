'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Bell, Search, Settings, LogOut, User, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'

interface HeaderProps {
  title: string
  description?: string
}

export function Header({ title, description }: HeaderProps) {
  const router = useRouter()
  const { user, usage, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    await logout()
    router.push('/login')
  }

  // 根据套餐等级显示标签颜色
  const tierColors: Record<string, string> = {
    free: 'bg-slate-100 text-slate-600',
    basic: 'bg-blue-100 text-blue-600',
    pro: 'bg-purple-100 text-purple-600',
    enterprise: 'bg-orange-100 text-orange-600',
  }

  const tierNames: Record<string, string> = {
    free: '免费版',
    basic: '基础版',
    pro: '专业版',
    enterprise: '企业版',
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 hidden lg:block">
      <div className="flex items-center justify-between h-12 md:h-14 px-4 md:px-6">
        {/* Left */}
        <div className="flex items-center gap-3 md:gap-4">
          <div>
            <h2 className="text-base md:text-lg font-semibold text-gray-900">{title}</h2>
            {description && (
              <p className="text-sm text-gray-500 hidden md:block">{description}</p>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索评价、订单、买家..."
              className="w-[240px] pl-8 h-9 bg-gray-50 border-gray-200 text-sm"
            />
          </div>

          {/* Usage Count */}
          {user && usage && (
            <Link href="/subscription">
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium touch-manipulation ${
                usage.remaining > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
              }`}>
                <Zap className="h-3 w-3" />
                <span className="hidden sm:inline">剩余 {usage.remaining}/{usage.limit}</span>
                <span className="sm:hidden">{usage.remaining}</span>
              </div>
            </Link>
          )}

          {/* Notification */}
          <Button variant="ghost" size="icon" className="relative h-9 w-9 touch-manipulation">
            <Bell className="h-4 w-4 text-gray-600" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
              3
            </span>
          </Button>

          {/* Settings */}
          <Button variant="ghost" size="icon" className="h-9 w-9 touch-manipulation">
            <Settings className="h-4 w-4 text-gray-600" />
          </Button>

          {/* Divider */}
          <div className="hidden md:block w-px h-6 bg-gray-200" />

          {/* User Menu */}
          {user ? (
            <div className="hidden md:flex items-center gap-3 pl-2">
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{user.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${tierColors[user.subscriptionTier] || tierColors.free}`}>
                    {tierNames[user.subscriptionTier] || '免费版'}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{user.phone}</p>
              </div>
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {user.name.charAt(0)}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 touch-manipulation"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                <LogOut className="h-4 w-4 text-gray-500" />
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button variant="default" size="sm" className="bg-orange-500 hover:bg-orange-600 touch-manipulation">
                <User className="h-4 w-4 mr-1" />
                登录
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
