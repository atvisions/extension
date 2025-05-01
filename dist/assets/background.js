// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'RELOAD_RESOURCES') {
    console.log('收到重新加载资源的请求')
    // 重新加载扩展资源
    chrome.runtime.reload()
  } else if (message.type === 'TRADING_PAGE_LOADED') {
    console.log('交易页面已加载:', message.data)
    // 处理交易页面加载事件
    handleTradingPage(message.data, sender.tab.id)
    sendResponse({ status: 'success' })
  } else if (message.type === 'GET_RESOURCE_URL') {
    try {
      const url = chrome.runtime.getURL(message.data.resource)
      sendResponse({ status: 'success', url })
    } catch (error) {
      console.error('获取资源URL失败:', error)
      sendResponse({ status: 'error', error: error.message })
    }
  }
  return true
})

// 处理交易页面
async function handleTradingPage(data, tabId) {
  try {
    const { symbol } = data
    console.log(`处理交易页面: ${symbol}`)

    // 检查资源是否可用
    const resources = [
      'assets/main.js',
      'assets/main.css',
      'assets/background.js',
      'assets/content.js',
      'assets/csrf.js'
    ]

    for (const resource of resources) {
      try {
        const url = chrome.runtime.getURL(resource)
        const response = await fetch(url)
        if (!response.ok) {
          console.error(`资源不可用: ${resource}`)
          continue
        }
        console.log(`资源可用: ${resource}`)
      } catch (error) {
        console.error(`检查资源失败: ${resource}`, error)
      }
    }

    // 通知content script更新页面
    try {
      chrome.tabs.sendMessage(tabId, {
        type: 'UPDATE_TRADING_VIEW',
        data: { symbol }
      }, (response) => {
        // 检查是否有错误
        if (chrome.runtime.lastError) {
          console.log('发送更新交易视图消息时出错:', chrome.runtime.lastError.message);
          return;
        }

        if (response) {
          console.log('更新交易视图消息已接收:', response);
        }
      });
    } catch (error) {
      console.error('发送更新交易视图消息失败:', error);
    }

  } catch (error) {
    console.error('处理交易页面失败:', error)
  }
}

// 检查是否是支持的交易所网站
function isSupportedExchange(url) {
  const exchanges = [
    'binance.com',
    'okx.com',
    'gate.io',
    'kucoin.com',
    'huobi.com',
    'bybit.com',
    'mexc.com',
    'bitget.com',
    'bitfinex.com',
    'kraken.com'
  ];
  return exchanges.some(exchange => url.includes(exchange));
}

// 监听扩展安装或更新
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('扩展已安装')
    // 可以在这里添加首次安装的欢迎页面
  } else if (details.reason === 'update') {
    console.log('扩展已更新')
    // 清理旧的缓存
    chrome.storage.local.clear()
  }
})

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // 检查是否是目标网站
    if (isSupportedExchange(tab.url)) {
      // 通知content script页面已更新
      try {
        chrome.tabs.sendMessage(tabId, {
          type: 'PAGE_UPDATED',
          data: { url: tab.url }
        }, (response) => {
          // 检查是否有错误
          if (chrome.runtime.lastError) {
            console.log('发送消息时出错:', chrome.runtime.lastError.message);
            // 可能是content script尚未加载，这是正常的
            return;
          }

          if (response) {
            console.log('页面更新消息已接收:', response);
          }
        });
      } catch (error) {
        console.error('发送消息失败:', error);
      }
    }
  }
})