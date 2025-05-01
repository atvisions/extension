// 注入到交易所页面的脚本
console.log('K线军师插件已加载');

// 检查资源是否可用
async function checkResource(src) {
  try {
    const url = chrome.runtime.getURL(src);
    const response = await fetch(url);
    return response.ok;
  } catch (error) {
    console.error(`资源检查失败: ${src}`, error);
    return false;
  }
}

// 等待资源可用
async function waitForResource(src, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    if (await checkResource(src)) {
      return true;
    }
    console.log(`资源未就绪，等待重试: ${src} (${i + 1}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
  }
  return false;
}

// 创建并注入样式
async function injectStyles() {
  try {
    if (!await waitForResource('assets/main.css')) {
      throw new Error('样式文件未就绪');
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = chrome.runtime.getURL('assets/main.css');
    document.head.appendChild(link);
    console.log('样式注入成功');
  } catch (error) {
    console.error('样式注入失败:', error);
  }
}

// 创建并注入脚本
async function injectScript(src) {
  try {
    if (!await waitForResource(src)) {
      throw new Error(`脚本文件未就绪: ${src}`);
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL(src);
      script.onload = () => {
        console.log(`脚本加载成功: ${src}`);
        resolve();
      };
      script.onerror = (error) => {
        console.error(`脚本加载失败: ${src}`, error);
        reject(error);
      };
      document.body.appendChild(script);
    });
  } catch (error) {
    console.error(`脚本注入失败: ${src}`, error);
    throw error;
  }
}

// 创建UI容器
function createUIContainer() {
  try {
    const container = document.createElement('div');
    container.id = 'kxianjunshi-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 15px;
      max-width: 300px;
      display: none;
    `;
    document.body.appendChild(container);
    console.log('UI容器创建成功');
    return container;
  } catch (error) {
    console.error('UI容器创建失败:', error);
    return null;
  }
}

// 初始化UI
async function initializeUI() {
  try {
    // 注入样式
    await injectStyles();
    
    // 创建UI容器
    const container = createUIContainer();
    if (!container) {
      throw new Error('无法创建UI容器');
    }

    // 注入必要的脚本
    await Promise.all([
      injectScript('assets/main.js'),
      injectScript('assets/csrf.js')
    ]);

    // 显示容器
    container.style.display = 'block';
    console.log('UI初始化成功');
  } catch (error) {
    console.error('UI初始化失败:', error);
  }
}

// 检查当前页面是否是交易所的交易页面
function isExchangeTradingPage() {
  const url = window.location.href;
  const tradingPatterns = [
    /binance\.com\/.*\/trade/,
    /okx\.com\/.*\/trade/,
    /gate\.io\/.*\/trade/,
    /kucoin\.com\/.*\/trade/,
    /huobi\.com\/.*\/trade/,
    /bybit\.com\/.*\/trade/,
    /mexc\.com\/.*\/trade/,
    /bitget\.com\/.*\/trade/,
    /bitfinex\.com\/t\//,
    /kraken\.com\/.*\/trade/
  ];
  return tradingPatterns.some(pattern => pattern.test(url));
}

// 初始化插件
async function initializePlugin() {
  try {
    console.log('K线军师插件正在初始化...');
    
    // 检查是否在交易页面
    if (!isExchangeTradingPage()) {
      console.log('当前不是交易页面，插件不会启动');
      return;
    }

    // 初始化UI
    await initializeUI();

    // 获取交易对信息
    const symbol = getSymbolFromUrl();
    if (!symbol) {
      console.log('无法获取交易对信息');
      return;
    }

    console.log('当前交易对:', symbol);
    
    // 向background script发送消息
    chrome.runtime.sendMessage({
      type: 'TRADING_PAGE_LOADED',
      data: { symbol }
    }, response => {
      if (chrome.runtime.lastError) {
        console.error('与background script通信失败:', chrome.runtime.lastError);
        return;
      }
      console.log('background script响应:', response);
    });

  } catch (error) {
    console.error('插件初始化失败:', error);
    // 尝试重新初始化
    setTimeout(() => {
      console.log('尝试重新初始化插件...');
      initializePlugin();
    }, 2000);
  }
}

// 从URL中获取交易对信息
function getSymbolFromUrl() {
  const url = window.location.href;
  let symbol = '';

  try {
    if (url.includes('binance.com')) {
      // Binance URL格式: https://www.binance.com/zh-CN/trade/BTC_USDT
      const match = url.match(/trade\/([A-Z0-9]+)_([A-Z0-9]+)/);
      if (match) {
        symbol = `${match[1]}${match[2]}`;
      }
    } else if (url.includes('okx.com')) {
      // OKX URL格式: https://www.okx.com/trade-spot/btc-usdt
      const match = url.match(/trade-spot\/([a-zA-Z0-9]+)-([a-zA-Z0-9]+)/);
      if (match) {
        symbol = `${match[1]}${match[2]}`.toUpperCase();
      }
    } else if (url.includes('gate.io')) {
      // Gate.io URL格式: https://www.gate.io/trade/BTC_USDT
      const match = url.match(/trade\/([A-Z0-9]+)_([A-Z0-9]+)/);
      if (match) {
        symbol = `${match[1]}${match[2]}`;
      }
    } else if (url.includes('kucoin.com')) {
      // KuCoin URL格式: https://www.kucoin.com/trade/BTC-USDT
      const match = url.match(/trade\/([A-Z0-9]+)-([A-Z0-9]+)/);
      if (match) {
        symbol = `${match[1]}${match[2]}`;
      }
    } else if (url.includes('huobi.com')) {
      // Huobi URL格式: https://www.huobi.com/en-us/trade/btc_usdt/
      const match = url.match(/trade\/([a-zA-Z0-9]+)_([a-zA-Z0-9]+)/);
      if (match) {
        symbol = `${match[1]}${match[2]}`.toUpperCase();
      }
    } else if (url.includes('bybit.com')) {
      // Bybit URL格式: https://www.bybit.com/trade/spot/BTC/USDT
      const match = url.match(/trade\/spot\/([A-Z0-9]+)\/([A-Z0-9]+)/);
      if (match) {
        symbol = `${match[1]}${match[2]}`;
      }
    } else if (url.includes('mexc.com')) {
      // MEXC URL格式: https://www.mexc.com/exchange/BTC_USDT
      const match = url.match(/exchange\/([A-Z0-9]+)_([A-Z0-9]+)/);
      if (match) {
        symbol = `${match[1]}${match[2]}`;
      }
    } else if (url.includes('bitget.com')) {
      // Bitget URL格式: https://www.bitget.com/spot/BTC-USDT
      const match = url.match(/spot\/([A-Z0-9]+)-([A-Z0-9]+)/);
      if (match) {
        symbol = `${match[1]}${match[2]}`;
      }
    } else if (url.includes('bitfinex.com')) {
      // Bitfinex URL格式: https://trading.bitfinex.com/t/BTC:USD
      const match = url.match(/t\/([A-Z0-9]+):([A-Z0-9]+)/);
      if (match) {
        symbol = `${match[1]}${match[2]}`;
      }
    } else if (url.includes('kraken.com')) {
      // Kraken URL格式: https://trade.kraken.com/charts/KRAKEN:BTC-USDT
      const match = url.match(/KRAKEN:([A-Z0-9]+)-([A-Z0-9]+)/);
      if (match) {
        symbol = `${match[1]}${match[2]}`;
      }
    }
  } catch (error) {
    console.error('解析交易对失败:', error);
  }

  return symbol;
}

// 监听页面变化
function setupPageChangeListener() {
  // 创建一个观察器实例
  const observer = new MutationObserver((mutations) => {
    if (isExchangeTradingPage()) {
      initializePlugin();
    }
  });

  // 配置观察选项
  const config = { 
    subtree: true, 
    childList: true 
  };

  // 开始观察
  observer.observe(document.body, config);
}

// 监听来自background script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PAGE_UPDATED') {
    console.log('页面已更新，重新初始化插件');
    initializePlugin();
  } else if (message.type === 'UPDATE_TRADING_VIEW') {
    try {
      const { symbol } = message.data;
      console.log('更新交易视图:', symbol);
      
      // 更新UI内容
      const container = document.getElementById('kxianjunshi-container');
      if (container) {
        container.innerHTML = `
          <h3 style="margin: 0 0 10px 0;">K线军师分析</h3>
          <p style="margin: 0;">正在分析 ${symbol} ...</p>
        `;
      }
      
      sendResponse({ status: 'success' });
    } catch (error) {
      console.error('更新交易视图失败:', error);
      sendResponse({ status: 'error', error: error.message });
    }
  }
  return true;
});

// 在页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializePlugin();
    setupPageChangeListener();
  });
} else {
  initializePlugin();
  setupPageChangeListener();
} 