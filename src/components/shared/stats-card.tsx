'use client'

import { Card, CardContent } from '@/components/ui/card'
import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  change?: number
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
}

export function StatsCard({ title, value, change, icon: Icon, iconColor = 'text-orange-500', iconBg = 'bg-orange-50' }: StatsCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1 text-sm">
                {change >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className={change >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {change >= 0 ? '+' : ''}{change}%
                </span>
                <span className="text-muted-foreground">较昨日</span>
              </div>
            )}
          </div>
          <div className={`${iconBg} p-3 rounded-xl`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
