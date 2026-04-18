/**
 * 支付宝集成工具
 * 提供支付宝配置检查、沙箱模式判断等功能
 */

// 支付宝配置
const ALIPAY_APP_ID = process.env.ALIPAY_APP_ID
const ALIPAY_PRIVATE_KEY = process.env.ALIPAY_PRIVATE_KEY
const ALIPAY_PUBLIC_KEY = process.env.ALIPAY_PUBLIC_KEY
const ALIPAY_GATEWAY = process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do'
const ALIPAY_SANDBOX_GATEWAY = 'https://openapi.alipaydev.com/gateway.do'

/**
 * 检查支付宝是否已配置
 */
export function isAlipayConfigured(): boolean {
  return !!(ALIPAY_APP_ID && ALIPAY_PRIVATE_KEY && ALIPAY_PUBLIC_KEY)
}

/**
 * 判断是否为沙箱模式
 */
export function isSandbox(): boolean {
  return process.env.ALIPAY_SANDBOX === 'true' || !isAlipayConfigured()
}

/**
 * 获取支付宝网关地址
 */
export function getAlipayGateway(): string {
  return isSandbox() ? ALIPAY_SANDBOX_GATEWAY : ALIPAY_GATEWAY
}

/**
 * 获取支付宝配置
 */
export function getAlipayConfig() {
  return {
    appId: ALIPAY_APP_ID,
    privateKey: ALIPAY_PRIVATE_KEY,
    publicKey: ALIPAY_PUBLIC_KEY,
    gateway: getAlipayGateway(),
    sandbox: isSandbox(),
  }
}
