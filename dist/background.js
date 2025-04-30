// 监听安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('K线军师插件已安装');
});

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSymbol') {
    // 处理获取交易对的请求
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const url = tabs[0].url;
        // 从 URL 中提取交易对信息
        const match = url.match(/\/([A-Z]+)USDT/);
        if (match) {
          sendResponse({ symbol: `${match[1]}USDT` });
        } else {
          sendResponse({ symbol: 'BTCUSDT' }); // 默认值
        }
      }
    });
    return true; // 保持消息通道打开
  }
});

// 监听图标点击事件
chrome.action.onClicked.addListener((tab) => {
  // 如果在不支持的页面上点击图标，显示提示信息
  if (!tab.url.includes('gate.io') && !tab.url.includes('binance.com') && !tab.url.includes('okx.com')) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'public/icons/icon128.png',
      title: 'Crypto Analyst',
      message: '请在支持的交易所页面使用此插件'
    });
  }
}); 