/**
 * E2E 测试 - 用户认证模块
 * 
 * 测试用例：
 * 1. 用户注册
 * 2. 用户登录（密码登录）
 * 3. 用户登录（验证码登录）
 * 4. 获取用户信息
 * 5. 用户登出
 * 6. 登录失败场景
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  E2E_CONFIG,
  TEST_USERS,
  wait,
  retry,
  cleanupTestData,
} from './config';

describe('用户认证 E2E 测试', () => {
  let testUserId: string | null = null;
  let authToken: string | null = null;
  
  const testPhone = `138${Date.now().toString().slice(-8)}`;
  
  afterAll(async () => {
    // 清理测试数据
    if (testUserId) {
      try {
        await cleanupTestData(testUserId);
      } catch (e) {
        console.log('Cleanup error:', e);
      }
    }
  });

  describe('1. 用户注册', () => {
    it('应该能够注册新用户', async () => {
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
          name: '测试用户',
          password: TEST_USERS.password,
        }),
      });

      const result = await response.json();
      
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.user).toBeDefined();
      expect(result.data.user.phone).toBe(testPhone);
      
      testUserId = result.data.user.id;
    });

    it('不应该允许重复注册相同手机号', async () => {
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
          name: '重复注册',
          password: TEST_USERS.password,
        }),
      });

      const result = await response.json();
      
      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
    });

    it('应该验证手机号格式', async () => {
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: 'invalid-phone',
          name: '测试用户',
          password: TEST_USERS.password,
        }),
      });

      const result = await response.json();
      
      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
    });
  });

  describe('2. 用户登录（密码登录）', () => {
    beforeAll(async () => {
      // 先确保用户存在
      if (!testUserId) {
        // 注册新用户用于登录测试
        const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: testPhone,
            name: '登录测试用户',
            password: TEST_USERS.password,
          }),
        });
        const result = await response.json();
        testUserId = result.data?.user?.id;
      }
    });

    it('应该能够使用正确密码登录', async () => {
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
          password: TEST_USERS.password,
        }),
      });

      const result = await response.json();
      
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.token).toBeDefined();
      expect(result.data.user).toBeDefined();
      expect(result.data.user.phone).toBe(testPhone);
      
      authToken = result.data.token;
      
      // 检查cookie是否设置
      const setCookie = response.headers.get('set-cookie');
      expect(setCookie).toContain('auth_token');
    });

    it('不应该能够使用错误密码登录', async () => {
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
          password: 'wrong-password',
        }),
      });

      const result = await response.json();
      
      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.message).toContain('密码错误');
    });

    it('不应该能够登录不存在的用户', async () => {
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '19900000000',
          password: TEST_USERS.password,
        }),
      });

      const result = await response.json();
      
      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
    });
  });

  describe('3. 用户登录（验证码登录）', () => {
    it('应该能够使用正确验证码登录', async () => {
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
          code: TEST_USERS.verificationCode,
        }),
      });

      const result = await response.json();
      
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.token).toBeDefined();
    });

    it('不应该能够使用错误验证码登录', async () => {
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
          code: '999999',
        }),
      });

      const result = await response.json();
      
      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.message).toContain('验证码错误');
    });

    it('应该要求提供密码或验证码', async () => {
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
        }),
      });

      const result = await response.json();
      
      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
    });
  });

  describe('4. 获取用户信息', () => {
    it('应该能够获取当前用户信息（已登录）', async () => {
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const result = await response.json();
      
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.phone).toBe(testPhone);
    });

    it('不应该能够获取未登录用户信息', async () => {
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/auth/me`);

      const result = await response.json();
      
      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
    });

    it('不应该能够使用无效token获取用户信息', async () => {
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/auth/me`, {
        headers: {
          'Authorization': 'Bearer invalid-token-123',
        },
      });

      const result = await response.json();
      
      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
    });
  });

  describe('5. 用户登出', () => {
    it('应该能够正常登出', async () => {
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const result = await response.json();
      
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      
      // 验证token已被销毁
      const meResponse = await fetch(`${E2E_CONFIG.apiBaseUrl}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      expect(meResponse.status).toBe(401);
    });
  });
});
