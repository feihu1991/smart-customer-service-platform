/**
 * E2E 测试配置和测试用例
 * 
 * 测试覆盖：
 * 1. 用户登录
 * 2. 评价查看
 * 3. AI生成回复
 * 4. 订阅购买
 * 
 * 运行方式：
 * 1. API测试：npx tsx __tests__/e2e/api.test.ts
 * 2. Playwright测试：npx playwright test
 */

export const E2E_CONFIG = {
  baseUrl: process.env.E2E_BASE_URL || 'http://localhost:3000',
  apiBaseUrl: process.env.E2E_API_URL || 'http://localhost:3000/api',
  timeout: 30000,
  retries: 3,
};

// 测试用户凭证
export const TEST_USERS = {
  phone: '13800138000',
  password: 'test123456',
  verificationCode: '123456',
};

// 测试数据
export const TEST_DATA = {
  review: {
    platform: 'taobao',
    orderId: 'test_order_001',
    productId: 'test_product_001',
    productName: '测试商品',
    productImage: 'https://example.com/image.jpg',
    customerName: '测试买家',
    customerAvatar: 'https://example.com/avatar.jpg',
    rating: 3,
    content: '商品还可以，物流有点慢。',
  },
  subscription: {
    packageId: 'test_package_001',
    cycle: 'month',
  },
};

/**
 * 辅助函数：等待指定时间
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 辅助函数：重试机制
 */
export async function retry<T>(
  fn: () => Promise<T>,
  retries: number = E2E_CONFIG.retries,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) {
        await wait(delay * (i + 1));
      }
    }
  }
  
  throw lastError!;
}

/**
 * 辅助函数：创建测试用户
 */
export async function createTestUser(phone: string = TEST_USERS.phone) {
  const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone,
      name: '测试用户',
      password: TEST_USERS.password,
    }),
  });
  
  return response.json();
}

/**
 * 辅助函数：清理测试数据
 */
export async function cleanupTestData(userId: string) {
  // 清理评价
  await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews/cleanup`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  
  // 清理订单
  await fetch(`${E2E_CONFIG.apiBaseUrl}/orders/cleanup`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
}
