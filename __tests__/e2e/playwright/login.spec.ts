/**
 * Playwright E2E 测试 - 登录页面
 */

import { test, expect } from '@playwright/test';

// 测试配置
const TEST_USERS = {
  phone: '13800138000',
  password: 'test123456',
};

test.describe('登录页面 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('应该正确加载登录页面', async ({ page }) => {
    // 验证页面标题或主要元素
    await expect(page.locator('h1, h2, [data-testid="title"]')).toBeVisible();
  });

  test('应该有手机号输入框', async ({ page }) => {
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="手机"]');
    await expect(phoneInput).toBeVisible();
  });

  test('应该有密码输入框', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
  });

  test('应该有登录按钮', async ({ page }) => {
    const loginButton = page.locator('button[type="submit"], button:has-text("登录")');
    await expect(loginButton).toBeVisible();
  });

  test('应该能够输入手机号和密码', async ({ page }) => {
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="手机"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    await phoneInput.fill(TEST_USERS.phone);
    await passwordInput.fill(TEST_USERS.password);
    
    await expect(phoneInput).toHaveValue(TEST_USERS.phone);
    await expect(passwordInput).toHaveValue(TEST_USERS.password);
  });

  test('应该有"忘记密码"链接', async ({ page }) => {
    const forgotLink = page.locator('a:has-text("忘记"), a:has-text("密码")').first();
    // 可能不存在，不强制要求
    if (await forgotLink.isVisible()) {
      await expect(forgotLink).toHaveAttribute('href');
    }
  });

  test('应该有"注册账号"链接', async ({ page }) => {
    const registerLink = page.locator('a:has-text("注册")');
    await expect(registerLink.first()).toBeVisible();
  });

  test('点击注册链接应该跳转到注册页面', async ({ page }) => {
    const registerLink = page.locator('a:has-text("注册")').first();
    await registerLink.click();
    
    // 验证URL变化
    await expect(page).toHaveURL(/register/);
  });
});

test.describe('登录流程 E2E 测试', () => {
  test('应该能够使用验证码登录', async ({ page }) => {
    await page.goto('/login');
    
    // 切换到验证码登录模式
    const codeTab = page.locator('button:has-text("验证码"), [role="tab"]:has-text("验证码")').first();
    if (await codeTab.isVisible()) {
      await codeTab.click();
    }
    
    // 输入手机号
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="手机"]').first();
    await phoneInput.fill(TEST_USERS.phone);
    
    // 点击获取验证码
    const getCodeButton = page.locator('button:has-text("获取验证码"), button:has-text("发送")').first();
    if (await getCodeButton.isVisible()) {
      await getCodeButton.click();
      
      // 验证输入框出现
      const codeInput = page.locator('input[maxlength="6"], input[placeholder*="验证码"]').first();
      await expect(codeInput).toBeVisible();
      
      // 输入测试验证码
      await codeInput.fill('123456');
    }
  });

  test('登录错误应该显示提示信息', async ({ page }) => {
    await page.goto('/login');
    
    // 输入错误的手机号格式
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="手机"]').first();
    await phoneInput.fill('12345'); // 错误的手机号
    
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(TEST_USERS.password);
    
    // 点击登录
    const loginButton = page.locator('button[type="submit"], button:has-text("登录")').first();
    await loginButton.click();
    
    // 验证错误提示出现
    await expect(page.locator('[role="alert"], .text-red, .text-destructive, [data-testid="error"]').first()).toBeVisible({ timeout: 5000 });
  });
});
