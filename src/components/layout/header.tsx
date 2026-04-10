'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Bell, Search, Settings } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface HeaderProps {
  title: string
  description?: string
}

export function Header({ title, description }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-12 md:h-14 px-3 md:px-6">
        {/* Left */}
        <div className="flex items-center gap-3 md:gap-4 ml-10 md:ml-0">
          <div>
            <h2 className="text-base md:text-lg font-semibold text-gray-900">{title}</h2>
            {description && (
              <p className="text-sm text-gray-500 hidden md:block">{description}</p>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索评价、订单、买家..."
              className="w-[240px] pl-8 h-9 bg-gray-50 border-gray-200 text-sm"
            />
          </div>

          {/* Notification */}
          <Button variant="ghost" size="icon" className="relative h-9 w-9">
            <Bell className="h-4 w-4 text-gray-600" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
              3
            </span>
          </Button>

          {/* Settings */}
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Settings className="h-4 w-4 text-gray-600" />
          </Button>

          {/* Divider */}
          <div className="hidden md:block w-px h-6 bg-gray-200" />

          {/* User */}
          <div className="hidden md:flex items-center gap-2 pl-2">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
              客
            </div>
            <span className="text-sm font-medium text-gray-700">客服小橙</span>
          </div>
        </div>
      </div>
    </header>
  )
}
