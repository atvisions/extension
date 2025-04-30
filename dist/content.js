// 监听来自插件的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSymbol') {
    // 从页面 URL 中提取交易对信息
    const symbol = getCurrentSymbol();
    sendResponse({ symbol });
  }
  return true; // 保持消息通道打开
});

// 从页面 URL 中获取交易对信息
function getCurrentSymbol() {
  const url = window.location.href;
  const urlObj = new URL(url);
  
  let symbol = '';
  if (urlObj.hostname.includes('binance.com')) {
    // 处理币安的 URL 格式
    // 例如: https://www.binance.com/en/trade/SOL_USDT?type=spot
    const searchParams = new URLSearchParams(urlObj.search);
    const pathParts = urlObj.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    
    if (lastPart.includes('_USDT')) {
      symbol = lastPart.replace('_', '');
    } else if (searchParams.has('symbol')) {
      symbol = searchParams.get('symbol');
    }
  } else if (urlObj.hostname.includes('gate.io')) {
    // 处理 Gate.io 的 URL 格式
    // 例如: https://www.gate.io/trade/SOL_USDT
    const pathParts = urlObj.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart.includes('_USDT')) {
      symbol = lastPart.replace('_', '');
    } else {
      // 尝试从其他可能的位置获取交易对
      const tradePair = document.querySelector('[data-original-title="Current trading pair"]');
      if (tradePair) {
        symbol = tradePair.textContent.trim();
      }
    }
  } else if (urlObj.hostname.includes('okx.com')) {
    // 处理 OKX 的 URL 格式
    // 例如: https://www.okx.com/trade-spot/sol-usdt
    const pathParts = urlObj.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart.includes('-usdt')) {
      symbol = lastPart.replace('-', '').toUpperCase();
    } else {
      // 尝试从页面元素获取交易对
      const tradePair = document.querySelector('[data-test="trade-ticker"]');
      if (tradePair) {
        symbol = tradePair.textContent.trim().replace('/', '');
      }
    }
  }
  
  // 确保返回有效的交易对格式
  if (symbol) {
    symbol = symbol.toUpperCase();
    // 如果不是以 USDT 结尾，添加 USDT
    if (!symbol.endsWith('USDT')) {
      symbol = symbol + 'USDT';
    }
  } else {
    // 默认返回 BTCUSDT
    symbol = 'BTCUSDT';
  }
  
  console.log('获取到的交易对:', symbol);
  return symbol;
} 