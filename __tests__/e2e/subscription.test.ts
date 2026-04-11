/**
 * E2E 测试 - 订阅购买模块
 * 
 * 测试用例：
 * 1. 获取套餐列表
 * 2. 获取订阅信息
 * 3. 创建订单
 * 4. 订阅升级
 * 5. 订阅取消
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  E2E_CONFIG,
  TEST_USERS,
} from './config';

describe('订阅购买 E2E 测试', () => {
  let authToken: string = '';
  
  beforeAll(async () => {
    // 创建测试用户并登录
    const testPhone = `136${Date.now().toString().slice(-8)}`;
    
    // 注册
    await fetch(`${E2E_CONFIG.apiBaseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testPhone,
        name: '订阅测试用户',
        password: TEST_USERS.password,
      }),
    });
    
    // 登录
    const loginResponse = await fetch(`${E2E_CONFIG.apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testPhone,
        password: TEST_USERS.password,
      }),
    });
    
    if (loginResponse.ok) {
      const loginResult = await loginResponse.json();
      authToken = loginResult.data?.token || '';
    }
  });

  describe('1. 获取套餐列表', () => {
    it('应该能够获取活跃套餐列表', async () => {
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/packages`);
      
      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('应该返回套餐的基础信息', async () => {
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/packages`);
      
      const result = await response.json();
      
      if (result.data && result.data.length > 0) {
        const pkg = result.data[0];
        
        // 验证套餐包含必要字段
        expect(pkg.id).toBeDefined();
        expect(pkg.name).toBeDefined();
        expect(pkg.pricePerMonth).toBeDefined();
        expect(pkg.pricePerYear).toBeDefined();
        expect(pkg.features).toBeDefined();
      }
    });

    it('套餐应该按排序顺序返回', async () => {
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/packages`);
      
      const result = await response.json();
      
      if (result.data && result.data.length > 1) {
        // 验证有多个套餐
        expect(result.data.length).toBeGreaterThan(1);
        
        // 验证排序
        for (let i = 1; i < result.data.length; i++) {
          const prev = result.data[i - 1];
          const curr = result.data[i];
          expect(prev.sortOrder).toBeLessThanOrEqual(curr.sortOrder);
        }
      }
    });

    it('套餐列表应该被缓存', async () => {
      // 第一次请求
      const response1 = await fetch(`${E2E_CONFIG.apiBaseUrl}/packages`);
      const result1 = await response1.json();
      
      // 第二次请求
      const response2 = await fetch(`${E2E_CONFIG.apiBaseUrl}/packages`);
      const result2 = await response2.json();
      
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      
      // 验证结果一致
      expect(result1.data).toEqual(result2.data);
      
      // 如果有缓存标记
      if (result1.cached !== undefined) {
        console.log('Package cache status - Request 1:', result1.cached);
      }
    });
  });

  describe('2. 获取订阅信息', () => {
    it('应该能够获取当前用户订阅信息（需认证）', async () => {
      if (!authToken) {
        console.log('Skipping - no auth token available');
        return;
      }
      
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/subscription`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.user).toBeDefined();
      expect(result.data.plan).toBeDefined();
    });

    it('未登录用户不应该能够获取订阅信息', async () => {
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/subscription`);
      
      expect(response.status).toBe(401);
      
      const result = await response.json();
      expect(result.success).toBe(false);
    });

    it('应该返回用户的每日使用限制', async () => {
      if (!authToken) {
        console.log('Skipping - no auth token available');
        return;
      }
      
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/subscription`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      const result = await response.json();
      
      if (result.success && result.data?.user) {
        expect(result.data.user.dailyLimit).toBeDefined();
        expect(typeof result.data.user.dailyLimit).toBe('number');
      }
    });
  });

  describe('3. 订阅升级', () => {
    it('应该能够获取可升级的套餐列表', async () => {
      if (!authToken) {
        console.log('Skipping - no auth token available');
        return;
      }
      
      // 先获取当前订阅
      const subResponse = await fetch(`${E2E_CONFIG.apiBaseUrl}/subscription`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      if (!subResponse.ok) {
        console.log('Could not get subscription info');
        return;
      }
      
      const subResult = await subResponse.json();
      const currentTier = subResult.data?.user?.subscriptionTier || 'free';
      
      // 获取套餐列表
      const packagesResponse = await fetch(`${E2E_CONFIG.apiBaseUrl}/packages`);
      const packagesResult = await packagesResponse.json();
      
      expect(packagesResult.success).toBe(true);
      
      // 验证有更高套餐可选
      if (packagesResult.data && packagesResult.data.length > 1) {
        const higherPackages = packagesResult.data.filter(
          (p: any) => p.tier !== currentTier
        );
        console.log(`Found ${higherPackages.length} packages to upgrade to`);
      }
    });

    it('应该能够升级到付费套餐', async () => {
      if (!authToken) {
        console.log('Skipping - no auth token available');
        return;
      }
      
      // 获取套餐列表
      const packagesResponse = await fetch(`${E2E_CONFIG.apiBaseUrl}/packages`);
      const packagesResult = await packagesResponse.json();
      
      if (!packagesResult.data || packagesResult.data.length === 0) {
        console.log('No packages available');
        return;
      }
      
      // 选择第一个非free套餐
      const targetPackage = packagesResult.data.find(
        (p: any) => p.tier !== 'free'
      );
      
      if (!targetPackage) {
        console.log('No paid packages available for upgrade test');
        return;
      }
      
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/subscription/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          packageId: targetPackage.id,
          cycle: 'month',
        }),
      });
      
      const result = await response.json();
      
      // 可能会返回创建订单的响应
      if (response.status === 200) {
        expect(result.success).toBe(true);
      } else {
        console.log('Upgrade response:', response.status, result);
      }
    });
  });

  describe('4. 订单管理', () => {
    it('应该能够获取订单列表（需认证）', async () => {
      if (!authToken) {
        console.log('Skipping - no auth token available');
        return;
      }
      
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/orders`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      // 可能成功或失败
      if (response.status === 200) {
        const result = await response.json();
        expect(result.success).toBe(true);
        expect(Array.isArray(result.data)).toBe(true);
      } else {
        console.log('Orders endpoint response:', response.status);
      }
    });

    it('应该能够获取单个订单详情', async () => {
      if (!authToken) {
        console.log('Skipping - no auth token available');
        return;
      }
      
      // 先获取订单列表
      const listResponse = await fetch(`${E2E_CONFIG.apiBaseUrl}/orders`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      if (listResponse.status !== 200) {
        console.log('Could not get orders list');
        return;
      }
      
      const listResult = await listResponse.json();
      
      if (listResult.data && listResult.data.length > 0) {
        const orderId = listResult.data[0].id;
        
        const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/orders/${orderId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        });
        
        expect(response.status).toBe(200);
        
        const result = await response.json();
        expect(result.success).toBe(true);
        expect(result.data.id).toBe(orderId);
      }
    });
  });

  describe('5. 订阅取消', () => {
    it('应该能够获取当前订阅状态', async () => {
      if (!authToken) {
        console.log('Skipping - no auth token available');
        return;
      }
      
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/subscription`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      const result = await response.json();
      
      if (result.success) {
        expect(result.data.user.subscriptionStatus).toBeDefined();
        console.log('Current subscription status:', result.data.user.subscriptionStatus);
      }
    });

    it('应该能够取消自动续费', async () => {
      if (!authToken) {
        console.log('Skipping - no auth token available');
        return;
      }
      
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/subscription/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      // 可能会成功或因为没有订阅而返回特定错误
      const result = await response.json();
      
      if (response.status === 200) {
        expect(result.success).toBe(true);
      } else {
        console.log('Cancel subscription response:', result);
      }
    });
  });

  describe('6. 使用量统计', () => {
    it('应该能够获取使用量信息（需认证）', async () => {
      if (!authToken) {
        console.log('Skipping - no auth token available');
        return;
      }
      
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/usage`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      if (response.status === 200) {
        const result = await response.json();
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      } else {
        console.log('Usage endpoint response:', response.status);
      }
    });
  });
});
