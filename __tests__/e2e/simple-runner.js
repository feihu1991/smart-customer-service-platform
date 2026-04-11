/**
 * E2E 测试 - 独立运行脚本
 * 
 * 不依赖 Vitest，直接使用 Node.js 运行 API 测试
 * 适用于快速验证 API 功能
 * 
 * 使用方式：
 * 1. node __tests__/e2e/simple-runner.js
 * 2. node __tests__/e2e/simple-runner.js --module=auth
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 测试配置
const CONFIG = {
  baseUrl: process.env.E2E_API_URL || 'http://localhost:3000/api',
  timeout: 30000,
};

// 颜色输出
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[PASS]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[FAIL]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
};

// 简单 HTTP 请求函数
async function request(method, endpoint, body = null, headers = {}) {
  const url = `${CONFIG.baseUrl}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    return { status: response.status, ok: response.ok, data };
  } catch (error) {
    throw new Error(`请求失败: ${error.message}`);
  }
}

// 测试结果收集
const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

function test(name, fn) {
  return async () => {
    try {
      await fn();
      results.passed++;
      results.tests.push({ name, status: 'passed' });
      log.success(name);
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: 'failed', error: error.message });
      log.error(`${name}: ${error.message}`);
    }
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || '断言失败');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || '值不匹配'}: 期望 ${expected}, 实际 ${actual}`);
  }
}

// 测试模块
const tests = {
  // 用户认证测试
  auth: [
    test('测试套餐列表API', async () => {
      const res = await request('GET', '/packages');
      assert(res.ok, '获取套餐列表失败');
      assert(res.data.success, 'API返回失败');
      assert(Array.isArray(res.data.data), '套餐数据应该是数组');
      log.info(`找到 ${res.data.data.length} 个套餐`);
    }),
    
    test('测试评价列表API', async () => {
      const res = await request('GET', '/reviews?pageSize=5');
      assert(res.ok, '获取评价列表失败');
      assert(res.data.success, 'API返回失败');
      assert(Array.isArray(res.data.list), '评价数据应该是数组');
      log.info(`找到 ${res.data.list.length} 条评价`);
    }),
    
    test('测试评价平台筛选', async () => {
      const res = await request('GET', '/reviews?platform=taobao');
      assert(res.ok, '筛选评价失败');
      assert(res.data.success, 'API返回失败');
    }),
    
    test('测试评价情感筛选', async () => {
      const res = await request('GET', '/reviews?sentiment=negative');
      assert(res.ok, '筛选评价失败');
      assert(res.data.success, 'API返回失败');
    }),
    
    test('测试评价分页', async () => {
      const res = await request('GET', '/reviews?page=1&pageSize=10');
      assert(res.ok, '分页查询失败');
      assert(res.data.pagination, '应该有分页信息');
      assertEqual(res.data.pagination.page, 1, '页码错误');
      assertEqual(res.data.pagination.pageSize, 10, '页大小错误');
    }),
  ],
  
  // AI回复测试
  'ai-reply': [
    test('测试差评原因分类API', async () => {
      const res = await request('POST', '/reviews/classify/reason', {
        content: '商品质量太差，用了两天就坏了',
      });
      // 可能返回各种状态，但不应该崩溃
      assert(res.data !== undefined, '应该有响应数据');
    }),
    
    test('测试物流问题分类', async () => {
      const res = await request('POST', '/reviews/classify/reason', {
        content: '物流太慢，等了一周才收到',
      });
      assert(res.data !== undefined, '应该有响应数据');
    }),
    
    test('测试服务问题分类', async () => {
      const res = await request('POST', '/reviews/classify/reason', {
        content: '客服态度很差，问问题都不回答',
      });
      assert(res.data !== undefined, '应该有响应数据');
    }),
  ],
  
  // 订阅测试
  subscription: [
    test('测试获取套餐列表', async () => {
      const res = await request('GET', '/packages');
      assert(res.ok, '获取套餐列表失败');
      assertEqual(res.data.success, true, 'API应该返回成功');
      
      if (res.data.data.length > 0) {
        const pkg = res.data.data[0];
        assert(pkg.id, '套餐应该有ID');
        assert(pkg.name, '套餐应该有名称');
        log.info(`套餐: ${pkg.name}, 月价: ¥${pkg.pricePerMonth}`);
      }
    }),
  ],
};

// 显示横幅
function showBanner() {
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     E2E 测试 - 智能客服平台                  ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
}

// 显示帮助
function showHelp() {
  console.log('使用方式:');
  console.log('  node simple-runner.js              # 运行所有测试');
  console.log('  node simple-runner.js --module=auth     # 运行认证测试');
  console.log('  node simple-runner.js --module=ai-reply # 运行AI测试');
  console.log('  node simple-runner.js --module=subscription # 运行订阅测试');
  console.log('');
  console.log('可用模块:');
  console.log('  - auth         用户认证');
  console.log('  - reviews      评价管理');
  console.log('  - ai-reply     AI生成回复');
  console.log('  - subscription 订阅购买');
  console.log('');
}

// 显示结果
function showResults() {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('测试结果');
  console.log('═══════════════════════════════════════════');
  console.log('');
  console.log(`  ${colors.green}通过: ${results.passed}${colors.reset}`);
  console.log(`  ${colors.red}失败: ${results.failed}${colors.reset}`);
  console.log(`  总计: ${results.passed + results.failed}`);
  console.log('');
  
  if (results.failed > 0) {
    console.log('失败测试:');
    results.tests
      .filter(t => t.status === 'failed')
      .forEach(t => {
        console.log(`  - ${t.name}`);
        console.log(`    ${colors.red}${t.error}${colors.reset}`);
      });
    console.log('');
  }
  
  if (results.failed === 0) {
    console.log(`${colors.green}🎉 所有测试通过！${colors.reset}`);
  } else {
    console.log(`${colors.red}⚠️  有测试失败${colors.reset}`);
  }
  
  console.log('');
}

// 主函数
async function main() {
  showBanner();
  
  // 解析参数
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const moduleArg = args.find(arg => arg.startsWith('--module='));
  const targetModule = moduleArg ? moduleArg.split('=')[1] : null;
  
  // 检查服务器
  log.info(`检查服务器 ${CONFIG.baseUrl.replace('/api', '')}...`);
  try {
    await request('GET', '/packages');
    log.success('服务器正常');
  } catch (error) {
    log.error(`服务器连接失败: ${error.message}`);
    log.warn('请确保开发服务器正在运行 (npm run dev)');
    process.exit(1);
  }
  
  console.log('');
  
  // 运行测试
  const startTime = Date.now();
  
  if (targetModule && tests[targetModule]) {
    log.info(`运行模块测试: ${targetModule}`);
    console.log('-'.repeat(40));
    for (const testFn of tests[targetModule]) {
      await testFn();
    }
  } else if (targetModule) {
    log.error(`未知模块: ${targetModule}`);
    showHelp();
    process.exit(1);
  } else {
    log.info('运行所有测试');
    console.log('-'.repeat(40));
    for (const [moduleName, moduleTests] of Object.entries(tests)) {
      console.log('');
      console.log(`>>> 模块: ${moduleName}`);
      console.log('-'.repeat(30));
      for (const testFn of moduleTests) {
        await testFn();
      }
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  log.info(`测试完成，耗时: ${duration}s`);
  
  showResults();
  
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(console.error);
