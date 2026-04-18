/**
 * 支付工具函数
 * 提供订单号生成、过期时间计算等功能
 */

/**
 * 生成支付订单号
 * 格式：PAY + 时间戳(13位) + 随机数(4位)
 */
export function generateOrderId(): string {
  const timestamp = Date.now().toString()
  const random = Math.floor(1000 + Math.random() * 9000).toString()
  return `PAY${timestamp}${random}`
}

/**
 * 计算订单过期时间
 * @param minutes 过期分钟数，默认30分钟
 */
export function calculateExpireTime(minutes: number = 30): Date {
  const now = new Date()
  return new Date(now.getTime() + minutes * 60 * 1000)
}
