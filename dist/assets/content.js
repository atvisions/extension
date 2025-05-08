// 注入到交易所页面的脚本
console.log('K线军师插件已加载');

// 检查当前页面是否是交易所的交易页面
function isExchangeTradingPage() {
  return isExchangeUrl(window.location.href);
}

// 从URL中获取交易对信息
function getSymbolFromUrl() {
  return parseSymbolFromUrl(window.location.href);
}

// 简化后的初始化函数
async function initializePlugin() {
  try {
    if (!isExchangeTradingPage()) {
      return;
    }

    const symbol = getSymbolFromUrl();
    if (!symbol) {
      return;
    }

    // 只发送消息给background script
    chrome.runtime.sendMessage({
      type: 'TRADING_PAGE_LOADED',
      data: { symbol }
    });

  } catch (error) {
    console.error('插件初始化失败:', error);
  }
}

// 简化的URL变化监听
function setupPageChangeListener() {
  let lastUrl = window.location.href;
  
  const handleUrlChange = () => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      if (isExchangeTradingPage()) {
        initializePlugin();
      }
    }
  };

  window.addEventListener('popstate', handleUrlChange);
  window.addEventListener('hashchange', handleUrlChange);
}

// 监听来自background script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PAGE_UPDATED') {
    initializePlugin();
  }
  sendResponse({ status: 'success' });
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