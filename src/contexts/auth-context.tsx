'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

interface User {
  id: string
  phone: string
  name: string
  avatar?: string
  subscriptionTier: string
  dailyUsageCount: number
  dailyLimit: number
  lastUsageDate: string
}

interface UsageInfo {
  remaining: number
  limit: number
  allowed: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  usage: UsageInfo | null
  login: (phone: string, password?: string, code?: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  refreshUsage: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [usage, setUsage] = useState<UsageInfo | null>(null)

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      if (data.success) {
        setUser(data.data.user)
        setUsage({
          remaining: data.data.user.dailyLimit - data.data.user.dailyUsageCount,
          limit: data.data.user.dailyLimit,
          allowed: data.data.user.dailyLimit - data.data.user.dailyUsageCount > 0,
        })
      } else {
        setUser(null)
        setUsage(null)
      }
    } catch {
      setUser(null)
      setUsage(null)
    }
  }, [])

  const refreshUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/usage')
      const data = await res.json()
      if (data.success) {
        setUsage(data.data)
      }
    } catch {
      // ignore
    }
  }, [])

  const login = useCallback(async (phone: string, password?: string, code?: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password, code }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message)
    await refreshUser()
  }, [refreshUser])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setUsage(null)
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await refreshUser()
      setLoading(false)
    }
    init()
  }, [refreshUser])

  return (
    <AuthContext.Provider value={{ user, loading, usage, login, logout, refreshUser, refreshUsage }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
