// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'RELOAD_RESOURCES') {
    console.log('收到重新加载资源的请求')
    // 重新加载扩展资源
    chrome.runtime.reload()
  } else if (message.type === 'TRADING_PAGE_LOADED') {
    console.log('交易页面已加载:', message.data)
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
  } else if (message.type === 'PROXY_API_REQUEST') {
    // 处理API代理请求
    handleApiProxyRequest(message.data, sendResponse)
    return true // 保持连接打开，等待异步响应
  }
  return true
})

// 请求限制配置
const rateLimits = {
  maxRequests: 10,  // 每个时间窗口允许的最大请求数
  timeWindow: 1000, // 时间窗口大小（毫秒）
  requests: new Map() // 记录请求时间戳
};

// 检查请求限制
function checkRateLimit(tabId) {
  const now = Date.now();
  const requests = rateLimits.requests.get(tabId) || [];

  // 清理过期的请求记录
  const validRequests = requests.filter(time => now - time < rateLimits.timeWindow);

  if (validRequests.length >= rateLimits.maxRequests) {
    const oldestRequest = validRequests[0];
    const waitTime = (rateLimits.timeWindow - (now - oldestRequest)) / 1000;
    throw new Error(`请求过于频繁，请等待 ${waitTime.toFixed(2)} 秒`);
  }

  // 更新请求记录
  validRequests.push(now);
  rateLimits.requests.set(tabId, validRequests);
}

// 处理交易页面
async function handleTradingPage(data, tabId) {
  try {
    const { symbol } = data
    console.log(`处理交易页面: ${symbol}`)

    // 检查请求限制
    checkRateLimit(tabId);

    // 通知content script更新页面
    try {
      chrome.tabs.sendMessage(tabId, {
        type: 'PAGE_UPDATED',
        data: { symbol }
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('发送更新消息时出错:', chrome.runtime.lastError.message);
          return;
        }

        if (response) {
          console.log('更新消息已接收:', response);
        }
      });
    } catch (error) {
      console.error('发送更新消息失败:', error);
    }

  } catch (error) {
    console.error('处理交易页面失败:', error)
    // 如果是请求限制错误，通知前端
    if (error.message.includes('请求过于频繁')) {
      chrome.tabs.sendMessage(tabId, {
        type: 'RATE_LIMIT_ERROR',
        data: { message: error.message }
      });
    }
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
    'kraken.com',
    'htx.com',
    'bitmart.com',
    'coinbase.com',
    'bitstamp.net',
    'poloniex.com',
    'bithumb.com',
    'upbit.com',
    'bitflyer.com',
    'gemini.com',
    'lbank.com',
    'phemex.com'
  ];
  return exchanges.some(exchange => url.includes(exchange));
}

// 监听扩展安装或更新
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('扩展已安装')
    // 不再设置 CSP 规则
  } else if (details.reason === 'update') {
    console.log('扩展已更新')
    // 清理旧的缓存
    chrome.storage.local.clear()
  }
})

// 处理API代理请求
async function handleApiProxyRequest(data, sendResponse) {
  try {
    const { url, method, headers, body } = data;
    // 检查是否是强制刷新请求
    const isForceRefresh = url.includes('force_refresh=true');

    // 构建请求选项
    const options = {
      method: method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers
      }
    };

    // 添加请求体（如果有）
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    // 设置超时
    const timeout = isForceRefresh ? 120000 : 30000; // 强制刷新使用更长的超时时间

    // 创建超时Promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`请求超时 (${timeout/1000}秒)`)), timeout);
    });

    // 创建fetch Promise
    const fetchPromise = fetch(url, options);

    // 使用Promise.race竞争，谁先完成就用谁的结果
    const response = await Promise.race([fetchPromise, timeoutPromise]);

    // 获取响应头
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // 获取响应体
    const responseText = await response.text();

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = responseText;
    }

    // 发送响应回去
    sendResponse({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      data: responseData,
      success: response.ok
    });
  } catch (error) {
    sendResponse({
      success: false,
      error: error.message || '请求失败',
      errorDetail: error.toString()
    });
  }
}

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // 检查是否是目标网站
    try {
      chrome.tabs.sendMessage(tabId, {
        type: 'PAGE_UPDATED',
        data: { url: tab.url }
      }, () => {
        if (chrome.runtime.lastError) {
          // content script 可能尚未加载，这是正常的
          return;
        }
      });
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  }
})