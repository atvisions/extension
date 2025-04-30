// API 基础配置
// 根据环境自动选择 API 地址
const API_BASE_URL = (() => {
  // 检查当前 URL 是否包含 localhost 或 IP 地址
  const isDevelopment = window.location.href.includes('localhost') ||
                        window.location.href.includes('127.0.0.1') ||
                        window.location.href.includes('192.168.3.16');

  // 开发环境使用本地 API，生产环境使用线上 API
  return isDevelopment
    ? 'http://192.168.3.16:8000/api'
    : 'https://www.kxianjunshi.com/api';
})();

// 调试函数 - 仅在控制台输出，不在页面显示
function debugLog(message, data = null) {
  // 仅在开发环境下输出日志
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${new Date().toISOString()}] ${message}`, data || '');
  }
}

// 初始化DOM元素
document.addEventListener('DOMContentLoaded', () => {
  // Tab 切换
  const loginTab = document.getElementById('login-tab');
  const registerTab = document.getElementById('register-tab');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (loginTab && registerTab && loginForm && registerForm) {
    loginTab.addEventListener('click', () => {
      loginTab.classList.add('tab-active');
      loginTab.classList.remove('tab-inactive');
      registerTab.classList.add('tab-inactive');
      registerTab.classList.remove('tab-active');
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
    });

    registerTab.addEventListener('click', () => {
      registerTab.classList.add('tab-active');
      registerTab.classList.remove('tab-inactive');
      loginTab.classList.add('tab-inactive');
      loginTab.classList.remove('tab-active');
      registerForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
    });
  }
});

// 登录和注册相关变量
let loginEmail, loginPassword, loginButton, loginError;
let registerEmail, registerPassword, registerCode, invitationCode, registerButton, sendCodeButton, registerError, registerSuccess;

// 在DOMContentLoaded事件中初始化登录和注册相关元素
document.addEventListener('DOMContentLoaded', () => {
  // 初始化登录相关元素
  loginEmail = document.getElementById('loginEmail');
  loginPassword = document.getElementById('loginPassword');
  loginButton = document.getElementById('loginButton');
  loginError = document.getElementById('loginError');

  // 初始化注册相关元素
  registerEmail = document.getElementById('registerEmail');
  registerPassword = document.getElementById('registerPassword');
  registerCode = document.getElementById('registerCode');
  invitationCode = document.getElementById('invitationCode');
  registerButton = document.getElementById('registerButton');
  sendCodeButton = document.getElementById('sendCodeButton');
  registerError = document.getElementById('registerError');
  registerSuccess = document.getElementById('registerSuccess');

  // 从本地存储中恢复注册表单状态
  restoreRegisterFormState();

  // 添加登录按钮事件监听
  if (loginButton) {
    console.log('loginButton 事件已绑定', loginButton);
    loginButton.addEventListener('click', async () => {
      console.log('loginButton clicked');
      if (!loginEmail || !loginPassword || !loginError) {
        console.error('登录表单元素未找到');
        return;
      }
      const email = loginEmail.value.trim();
      const password = loginPassword.value;
      if (!email || !password) {
        loginError.textContent = '请填写邮箱和密码';
        return;
      }
      loginError.textContent = '';
      loginButton.disabled = true;
      loginButton.textContent = '登录中...';
      try {
        // 检查网络连接
        if (!navigator.onLine) {
          throw new Error('网络连接已断开');
        }

        // 启用真实API调用
        console.log('尝试登录:', email, password);
        const response = await fetch(`${API_BASE_URL}/auth/login/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          mode: 'cors',           // 添加这行
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('登录接口返回:', data);

        if (data.status === 'success' && data.data && data.data.token) {
          chrome.storage.local.set({
            token: data.data.token,
            user: data.data.user
          }, () => {
            chrome.storage.local.get(['token', 'user'], (result) => {
              if (result.token && result.user) {
                showMarketContent();
              } else {
                loginError.textContent = '登录信息保存失败，请重试';
                loginButton.disabled = false;
                loginButton.textContent = '登录';
              }
            });
          });
        } else {
          loginError.textContent = data.message || '登录失败，请检查邮箱和密码';
          loginButton.disabled = false;
          loginButton.textContent = '登录';
        }
      } catch (err) {
        console.error('登录错误:', err);
        if (!navigator.onLine) {
          loginError.textContent = '网络连接已断开，请检查网络设置';
        } else if (err.message.includes('HTTP error!')) {
          loginError.textContent = '服务器连接失败，请稍后重试';
        } else {
          loginError.textContent = '登录失败，请检查网络连接';
        }
        loginButton.disabled = false;
        loginButton.textContent = '登录';
      }
    });
  }
});

// 在DOMContentLoaded事件中添加注册和发送验证码按钮的事件监听
document.addEventListener('DOMContentLoaded', () => {
  // 为注册表单添加输入事件监听，自动保存状态
  if (registerEmail) {
    registerEmail.addEventListener('input', saveRegisterFormState);
  }
  if (registerPassword) {
    registerPassword.addEventListener('input', saveRegisterFormState);
  }
  if (registerCode) {
    registerCode.addEventListener('input', saveRegisterFormState);
  }
  if (invitationCode) {
    invitationCode.addEventListener('input', saveRegisterFormState);
  }
  // 添加注册按钮事件监听
  if (registerButton) {
    console.log('注册按钮已找到，绑定事件');
    registerButton.addEventListener('click', async () => {
      console.log('注册按钮被点击');
      if (!registerEmail || !registerPassword || !registerCode || !invitationCode || !registerError || !registerSuccess) {
        console.error('注册表单元素未找到', {
          registerEmail,
          registerPassword,
          registerCode,
          invitationCode,
          registerError,
          registerSuccess
        });
        return;
      }

      const email = registerEmail.value.trim();
      const password = registerPassword.value;
      const code = registerCode.value.trim();
      const invitation = invitationCode.value.trim();

      console.log('注册表单数据:', {
        email,
        password: password ? '******' : '',
        code,
        invitation
      });

      if (!email || !password || !code || !invitation) {
        registerError.textContent = '请填写所有必填项';
        registerSuccess.textContent = '';
        return;
      }

      registerError.textContent = '';
      registerSuccess.textContent = '';

      try {
        // 打印请求详情
        const requestBody = JSON.stringify({
          email,
          password,
          code,
          invitation_code: invitation,
        });
        console.log('调用注册API:', `${API_BASE_URL}/auth/register/`);
        console.log('请求头:', { 'Content-Type': 'application/json' });
        console.log('请求体:', requestBody);

        const response = await fetch(`${API_BASE_URL}/auth/register/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: requestBody,
        });

        console.log('注册API响应状态:', response.status);
        const data = await response.json();
        console.log('注册API响应数据:', data);

        // 详细打印响应数据的所有字段
        for (const key in data) {
          console.log(`响应字段 ${key}:`, data[key]);
        }

        if (data.status === 'success') {
          console.log('注册成功，准备自动登录');
          registerSuccess.textContent = '注册成功，正在跳转到行情页面...';
          registerError.textContent = '';

          // 清除保存的表单状态
          chrome.storage.local.remove(['registerFormState'], () => {
            console.log('注册成功，表单状态已清除');
          });

          // 注册成功后，自动登录并跳转到行情页面
          setTimeout(() => {
            // 使用注册的邮箱和密码自动登录
            autoLogin(email, password);
          }, 1000);
        } else {
          // 处理错误信息，可能在不同的字段中
          let errorMessage = '';

          if (data.message) {
            // 检查 message 是否是对象
            if (typeof data.message === 'object' && data.message !== null) {
              // 处理嵌套的错误对象，例如 {email: ['该邮箱已被注册']}
              for (const key in data.message) {
                if (Array.isArray(data.message[key]) && data.message[key].length > 0) {
                  errorMessage += data.message[key].join(', ');
                } else {
                  errorMessage += data.message[key];
                }
                errorMessage += ' ';
              }
            } else {
              errorMessage = data.message;
            }
          } else if (data.error) {
            errorMessage = data.error;
          } else if (data.detail) {
            errorMessage = data.detail;
          } else if (typeof data === 'string') {
            errorMessage = data;
          } else {
            errorMessage = '注册失败，请稍后重试';
          }

          console.error('注册失败:', errorMessage);
          registerError.textContent = errorMessage;
          registerSuccess.textContent = '';
        }
      } catch (err) {
        console.error('注册请求错误:', err);
        registerError.textContent = '注册失败，请稍后重试';
        registerSuccess.textContent = '';
      }
    });
  } else {
    console.error('未找到注册按钮');
  }

  // 添加发送验证码按钮事件监听
  if (sendCodeButton) {
    console.log('发送验证码按钮已找到，绑定事件');
    sendCodeButton.addEventListener('click', async () => {
      console.log('发送验证码按钮被点击');
      if (!registerEmail || !registerError || !registerSuccess) {
        console.error('注册表单元素未找到', { registerEmail, registerError, registerSuccess });
        return;
      }

      const email = registerEmail.value.trim();
      if (!email) {
        registerError.textContent = '请输入邮箱';
        registerSuccess.textContent = '';
        return;
      }

      console.log('开始发送验证码到邮箱:', email);
      registerError.textContent = '';
      registerSuccess.textContent = '';
      sendCodeButton.disabled = true;
      sendCodeButton.textContent = '发送中...';

      try {
        // 打印请求详情
        const requestBody = JSON.stringify({ email });
        console.log('调用发送验证码API:', `${API_BASE_URL}/auth/send-code/`);
        console.log('请求头:', { 'Content-Type': 'application/json' });
        console.log('请求体:', requestBody);

        const response = await fetch(`${API_BASE_URL}/auth/send-code/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: requestBody,
        });

        console.log('发送验证码API响应状态:', response.status);
        const data = await response.json();
        console.log('发送验证码API响应数据:', data);

        // 详细打印响应数据的所有字段
        for (const key in data) {
          console.log(`响应字段 ${key}:`, data[key]);
        }

        if (data.status === 'success') {
          console.log('验证码发送成功');
          registerSuccess.textContent = '验证码已发送';
          sendCodeButton.textContent = '已发送';

          // 倒计时功能
          let countdown = 60;
          sendCodeButton.textContent = `${countdown}秒后重发`;
          const timer = setInterval(() => {
            countdown--;
            sendCodeButton.textContent = `${countdown}秒后重发`;
            if (countdown <= 0) {
              clearInterval(timer);
              sendCodeButton.disabled = false;
              sendCodeButton.textContent = '发送验证码';
            }
          }, 1000);
        } else {
          // 处理错误信息，可能在不同的字段中
          let errorMessage = '';

          if (data.message) {
            // 检查 message 是否是对象
            if (typeof data.message === 'object' && data.message !== null) {
              // 处理嵌套的错误对象，例如 {email: ['该邮箱已被注册']}
              for (const key in data.message) {
                if (Array.isArray(data.message[key]) && data.message[key].length > 0) {
                  errorMessage += data.message[key].join(', ');
                } else {
                  errorMessage += data.message[key];
                }
                errorMessage += ' ';
              }
            } else {
              errorMessage = data.message;
            }
          } else if (data.error) {
            errorMessage = data.error;
          } else if (data.detail) {
            errorMessage = data.detail;
          } else if (typeof data === 'string') {
            errorMessage = data;
          } else {
            errorMessage = '发送验证码失败，请稍后重试';
          }

          console.error('验证码发送失败:', errorMessage);
          registerError.textContent = errorMessage;
          sendCodeButton.disabled = false;
          sendCodeButton.textContent = '发送验证码';
        }
      } catch (err) {
        console.error('发送验证码请求错误:', err);
        registerError.textContent = '发送验证码失败，请稍后重试';
        sendCodeButton.disabled = false;
        sendCodeButton.textContent = '发送验证码';
      }
    });
  } else {
    console.error('未找到发送验证码按钮');
  }
});

// 检查登录状态并显示相应界面
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['token'], (result) => {
    if (result.token) {
      // 已登录，显示行情内容
      showMarketContent();
    } else {
      // 未登录，显示登录界面
      showAuthContent();
    }
  });
});

// 显示行情内容
function showMarketContent() {
  console.log('显示行情内容');

  const authContainer = document.getElementById('auth-container');
  const marketContainer = document.getElementById('market-container');
  const profileContent = document.getElementById('profileContent');
  const loading = document.getElementById('loading');

  // 获取底部导航栏标签
  const marketTab = document.getElementById('market-tab');
  const profileTab = document.getElementById('profile-tab');

  // 获取底部指示器
  const marketIndicator = marketTab ? marketTab.querySelector('.market-indicator') : null;
  const profileIndicator = profileTab ? profileTab.querySelector('.profile-indicator') : null;

  // 先隐藏市场数据内容，避免闪烁
  hideMarketDataContent();

  // 显示加载动画
  if (loading) {
    loading.style.display = 'flex';
    loading.classList.remove('hidden');
  }

  // 隐藏登录界面
  if (authContainer) {
    authContainer.style.display = 'none';
    authContainer.classList.add('hidden');
  }

  // 显示市场内容
  if (marketContainer) {
    marketContainer.style.display = 'block';
    marketContainer.classList.remove('hidden');
  }

  // 隐藏个人资料
  if (profileContent) {
    profileContent.style.display = 'none';
    profileContent.classList.add('hidden');
  }

  // 更新底部导航栏样式
  if (marketTab) {
    marketTab.className = 'nav-item text-primary cursor-pointer';
    marketTab.classList.add('active');
    const marketIcon = marketTab.querySelector('i');
    const marketText = marketTab.querySelector('span');
    if (marketIcon) marketIcon.className = 'ri-line-chart-line ri-lg text-primary';
    if (marketText) marketText.className = 'text-xs text-primary font-medium transition-colors duration-300 relative z-10';
    // 显示市场指示器
    if (marketIndicator) marketIndicator.style.opacity = '1';
  }

  if (profileTab) {
    profileTab.className = 'nav-item text-[#8E8E93] cursor-pointer';
    profileTab.classList.remove('active');
    const profileIcon = profileTab.querySelector('i');
    const profileText = profileTab.querySelector('span');
    if (profileIcon) profileIcon.className = 'ri-user-3-line ri-lg text-gray-500 group-hover:text-blue-400 transition-colors duration-300';
    if (profileText) profileText.className = 'text-xs text-gray-500 group-hover:text-blue-400 font-medium transition-colors duration-300 relative z-10';
    // 隐藏个人资料指示器
    if (profileIndicator) profileIndicator.style.opacity = '0';
  }

  // 加载行情数据
  loadAnalysisData();
}

// 显示登录/注册界面
function showAuthContent() {
  console.log('显示登录/注册界面');

  const authContainer = document.getElementById('auth-container');
  const marketContainer = document.getElementById('market-container');
  const profileContent = document.getElementById('profileContent');

  // 获取底部导航栏标签
  const marketTab = document.getElementById('market-tab');
  const profileTab = document.getElementById('profile-tab');

  // 获取底部指示器
  const marketIndicator = marketTab ? marketTab.querySelector('.market-indicator') : null;
  const profileIndicator = profileTab ? profileTab.querySelector('.profile-indicator') : null;

  if (authContainer) {
    authContainer.style.display = 'block';
    authContainer.classList.remove('hidden');
  }

  if (marketContainer) {
    marketContainer.style.display = 'none';
    marketContainer.classList.add('hidden');
  }

  if (profileContent) {
    profileContent.style.display = 'none';
    profileContent.classList.add('hidden');
  }

  // 更新底部导航栏样式 - 默认选中市场标签
  if (marketTab) {
    marketTab.className = 'nav-item text-primary cursor-pointer';
    marketTab.classList.add('active');
    const marketIcon = marketTab.querySelector('i');
    const marketText = marketTab.querySelector('span');
    if (marketIcon) marketIcon.className = 'ri-line-chart-line ri-lg text-primary';
    if (marketText) marketText.className = 'text-xs text-primary font-medium transition-colors duration-300 relative z-10';
    // 显示市场指示器
    if (marketIndicator) marketIndicator.style.opacity = '1';
  }

  if (profileTab) {
    profileTab.className = 'nav-item text-[#8E8E93] cursor-pointer';
    profileTab.classList.remove('active');
    const profileIcon = profileTab.querySelector('i');
    const profileText = profileTab.querySelector('span');
    if (profileIcon) profileIcon.className = 'ri-user-3-line ri-lg text-gray-500 group-hover:text-blue-400 transition-colors duration-300';
    if (profileText) profileText.className = 'text-xs text-gray-500 group-hover:text-blue-400 font-medium transition-colors duration-300 relative z-10';
    // 隐藏个人资料指示器
    if (profileIndicator) profileIndicator.style.opacity = '0';
  }
}

// 自动登录函数
async function autoLogin(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (data.status === 'success') {
      chrome.storage.local.set({ token: data.data.token }, () => {
        // 登录成功后显示行情内容
        showMarketContent();
      });
    } else {
      // 如果自动登录失败，显示登录表单
      const loginTab = document.getElementById('login-tab');
      if (loginTab) loginTab.click();

      const loginError = document.getElementById('loginError');
      if (loginError) loginError.textContent = '自动登录失败，请手动登录';
    }
  } catch (err) {
    console.error('自动登录失败:', err);
    // 如果自动登录失败，显示登录表单
    const loginTab = document.getElementById('login-tab');
    if (loginTab) loginTab.click();
  }
}

// DOM 元素 - 将在DOMContentLoaded中初始化
let content, loading, error;

// 标签页相关元素 - 将在DOMContentLoaded中初始化
let tabs, marketContent, profileContent;

// 详细报告相关变量
let detailRendered = false;
let isReportExpanded = false;

// 在DOMContentLoaded事件中初始化这些元素
document.addEventListener('DOMContentLoaded', () => {
  // 检查是否存在这些元素，如果不存在则创建
  content = document.getElementById('content') || createElementIfNotExists('content', 'div');
  loading = document.getElementById('loading') || createElementIfNotExists('loading', 'div', 'hidden');
  error = document.getElementById('error') || createElementIfNotExists('error', 'div', 'hidden');

  // 标签页相关元素
  tabs = document.querySelectorAll('.tab');
  marketContent = document.getElementById('marketContent');
  profileContent = document.getElementById('profileContent');
});

// 创建元素如果不存在
function createElementIfNotExists(id, tagName, className = '') {
  if (!document.getElementById(id)) {
    const element = document.createElement(tagName);
    element.id = id;
    if (className) element.className = className;
    document.body.appendChild(element);
    return element;
  }
  return document.getElementById(id);
}

// 保存注册表单状态到本地存储
function saveRegisterFormState() {
  if (registerEmail && registerPassword && registerCode && invitationCode) {
    const formState = {
      email: registerEmail.value,
      password: registerPassword.value,
      code: registerCode.value,
      invitation: invitationCode.value,
      timestamp: Date.now() // 添加时间戳，以便我们可以在一定时间后清除数据
    };

    chrome.storage.local.set({ registerFormState: formState }, () => {
      console.log('注册表单状态已保存');
    });
  }
}

// 从本地存储中恢复注册表单状态
function restoreRegisterFormState() {
  chrome.storage.local.get(['registerFormState'], (result) => {
    if (result.registerFormState) {
      const formState = result.registerFormState;

      // 检查数据是否过期（24小时）
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000; // 24小时的毫秒数

      if (now - formState.timestamp < oneDay) {
        // 数据未过期，恢复表单状态
        if (registerEmail) registerEmail.value = formState.email || '';
        if (registerPassword) registerPassword.value = formState.password || '';
        if (registerCode) registerCode.value = formState.code || '';
        if (invitationCode) invitationCode.value = formState.invitation || '';

        console.log('注册表单状态已恢复');
      } else {
        // 数据已过期，清除存储
        chrome.storage.local.remove(['registerFormState'], () => {
          console.log('过期的注册表单状态已清除');
        });
      }
    }
  });
}

// 标签页切换逻辑 - 移到DOMContentLoaded中
document.addEventListener('DOMContentLoaded', () => {
  console.log('初始化底部导航栏');

  // 获取底部导航栏的标签
  const marketTab = document.getElementById('market-tab');
  const profileTab = document.getElementById('profile-tab');

  if (marketTab) {
    console.log('找到市场标签');
    // 为市场标签添加点击事件
    marketTab.addEventListener('click', () => {
      console.log('点击市场标签');
      handleTabClick('market');
    });
  } else {
    console.error('未找到市场标签');
  }

  if (profileTab) {
    console.log('找到个人资料标签');
    // 为个人资料标签添加点击事件
    profileTab.addEventListener('click', () => {
      console.log('点击个人资料标签');
      handleTabClick('profile');
    });
  } else {
    console.error('未找到个人资料标签');
  }
});

// 处理标签点击
function handleTabClick(tabName) {
  console.log('处理标签点击:', tabName);

  const authContainer = document.getElementById('auth-container');
  const marketContainer = document.getElementById('market-container');
  const profileContent = document.getElementById('profileContent');

  // 获取底部导航栏标签
  const marketTab = document.getElementById('market-tab');
  const profileTab = document.getElementById('profile-tab');

  // 获取底部指示器
  const marketIndicator = marketTab ? marketTab.querySelector('.market-indicator') : null;
  const profileIndicator = profileTab ? profileTab.querySelector('.profile-indicator') : null;

  console.log('容器元素:', {
    authContainer: !!authContainer,
    marketContainer: !!marketContainer,
    profileContent: !!profileContent
  });

  if (tabName === 'market') {
    console.log('处理市场标签点击');

    // 检查登录状态
    chrome.storage.local.get(['token'], (result) => {
      if (!result.token) {
        // 未登录，显示登录界面
        showAuthContent();
        return;
      }

      // 先隐藏市场数据内容，避免闪烁
      hideMarketDataContent();

      // 已登录，显示行情内容
      if (authContainer) {
        authContainer.style.display = 'none';
        authContainer.classList.add('hidden');
      }

      if (marketContainer) {
        marketContainer.style.display = 'block';
        marketContainer.classList.remove('hidden');
      }

      if (profileContent) {
        profileContent.style.display = 'none';
        profileContent.classList.add('hidden');
      }

      // 更新底部导航栏样式
      if (marketTab) {
        marketTab.classList.add('active');
        const marketIcon = marketTab.querySelector('i');
        const marketText = marketTab.querySelector('span');
        if (marketIcon) marketIcon.className = 'ri-line-chart-line ri-lg text-primary';
        if (marketText) marketText.className = 'text-xs text-primary font-medium transition-colors duration-300 relative z-10';
        // 显示市场指示器
        if (marketIndicator) marketIndicator.style.opacity = '1';
      }
      if (profileTab) {
        profileTab.classList.remove('active');
        const profileIcon = profileTab.querySelector('i');
        const profileText = profileTab.querySelector('span');
        if (profileIcon) profileIcon.className = 'ri-user-3-line ri-lg text-gray-500 group-hover:text-blue-400 transition-colors duration-300';
        if (profileText) profileText.className = 'text-xs text-gray-500 group-hover:text-blue-400 font-medium transition-colors duration-300 relative z-10';
        // 隐藏个人资料指示器
        if (profileIndicator) profileIndicator.style.opacity = '0';
      }

      // 加载分析数据
      loadAnalysisData();
    });
  } else if (tabName === 'profile') {
    console.log('处理个人资料标签点击');

    // 检查登录状态
    chrome.storage.local.get(['token'], (result) => {
      if (!result.token) {
        // 未登录，显示登录界面
        showAuthContent();
        return;
      }

      // 隐藏错误提示
      const error = document.getElementById('error');
      if (error) {
        error.style.display = 'none';
        error.classList.add('hidden');
        error.innerHTML = ''; // 清空错误内容
      }

      // 隐藏加载动画
      const loading = document.getElementById('loading');
      if (loading) {
        loading.style.display = 'none';
        loading.classList.add('hidden');
      }

      // 已登录，显示个人资料
      if (authContainer) {
        authContainer.style.display = 'none';
        authContainer.classList.add('hidden');
      }

      if (marketContainer) {
        marketContainer.style.display = 'none';
        marketContainer.classList.add('hidden');
      }

      if (profileContent) {
        profileContent.style.display = 'block';
        profileContent.classList.remove('hidden');
      }

      // 更新底部导航栏样式
      if (marketTab) {
        marketTab.classList.remove('active');
        const marketIcon = marketTab.querySelector('i');
        const marketText = marketTab.querySelector('span');
        if (marketIcon) marketIcon.className = 'ri-line-chart-line ri-lg text-gray-500 group-hover:text-blue-400 transition-colors duration-300';
        if (marketText) marketText.className = 'text-xs text-gray-500 group-hover:text-blue-400 font-medium transition-colors duration-300 relative z-10';
        // 隐藏市场指示器
        if (marketIndicator) marketIndicator.style.opacity = '0';
      }
      if (profileTab) {
        profileTab.classList.add('active');
        const profileIcon = profileTab.querySelector('i');
        const profileText = profileTab.querySelector('span');
        if (profileIcon) profileIcon.className = 'ri-user-3-line ri-lg text-primary';
        if (profileText) profileText.className = 'text-xs text-primary font-medium transition-colors duration-300 relative z-10';
        // 显示个人资料指示器
        if (profileIndicator) profileIndicator.style.opacity = '1';
      }

      // 加载个人资料数据
      loadProfileData();
    });
  }
}

// 格式化时间为"几分钟前"或"几小时前"等格式
function formatTimeAgo(timestamp) {
  if (!timestamp) {
    console.log('时间戳为空');
    return '未知时间';
  }

  try {
    const now = new Date();
    const updateTime = new Date(timestamp);
    
    console.log('时间格式化:', {
      input: timestamp,
      parsed: updateTime,
      now: now
    });

    if (isNaN(updateTime.getTime())) {
      console.log('无效的时间格式');
      return '未知时间';
    }

    const diffMs = now - updateTime;
    const diffSec = Math.floor(diffMs / 1000);

    // 小于1分钟
    if (diffSec < 60) {
      return '刚刚更新';
    }

    // 分钟
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) {
      return `${diffMin}分钟前`;
    }

    // 小时
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) {
      return `${diffHour}小时前`;
    }

    // 天
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 30) {
      return `${diffDay}天前`;
    }

    // 月
    const diffMonth = Math.floor(diffDay / 30);
    if (diffMonth < 12) {
      return `${diffMonth}个月前`;
    }

    // 年
    const diffYear = Math.floor(diffMonth / 12);
    return `${diffYear}年前`;
  } catch (error) {
    console.error('时间格式化错误:', error);
    return '未知时间';
  }
}

// 更新概率和趋势分析（默认显示）
function updateSummaryUI(data) {
  if (loading) {
    loading.style.display = 'none';
    loading.classList.add('hidden');
  }

  // 更新最后更新时间
  const lastUpdateTime = document.getElementById('lastUpdateTime');
  if (lastUpdateTime) {
    // 尝试从数据中获取更新时间
    const updateTimestamp = data.last_update_time ||
                           (data.technical_analysis && data.technical_analysis.timestamp) ||
                           (data.timestamp) ||
                           new Date().toISOString();
    lastUpdateTime.textContent = `更新时间：${formatTimeAgo(updateTimestamp)}`;
  }

  // 更新当前价格
  const currentPrice = document.getElementById('currentPrice');
  if (currentPrice) {
    // 直接从API响应的current_price字段获取价格
    const price = data.current_price !== undefined ?
                  data.current_price :
                  (data.trading_advice && data.trading_advice.entry_price ?
                   data.trading_advice.entry_price :
                   '暂无数据');

    // 格式化价格显示
    if (typeof price === 'number') {
      // 如果价格大于1，保留2位小数；如果小于1，保留更多位小数
      const formattedPrice = price >= 1 ?
                            price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) :
                            price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6});
      currentPrice.textContent = `$${formattedPrice}`;
    } else {
      currentPrice.textContent = price;
    }
  }

  // 概率卡片及进度条
  const upProb = document.getElementById('upProb');
  const sidewaysProb = document.getElementById('sidewaysProb');
  const downProb = document.getElementById('downProb');
  const upProbBar = document.getElementById('upProbBar');
  const sidewaysProbBar = document.getElementById('sidewaysProbBar');
  const downProbBar = document.getElementById('downProbBar');
  if (upProb) upProb.textContent = `${data.trend_analysis.probabilities.up}%`;
  if (sidewaysProb) sidewaysProb.textContent = `${data.trend_analysis.probabilities.sideways}%`;
  if (downProb) downProb.textContent = `${data.trend_analysis.probabilities.down}%`;
  if (upProbBar) upProbBar.style.width = `${data.trend_analysis.probabilities.up}%`;
  if (sidewaysProbBar) sidewaysProbBar.style.width = `${data.trend_analysis.probabilities.sideways}%`;
  if (downProbBar) downProbBar.style.width = `${data.trend_analysis.probabilities.down}%`;

  // 更新趋势分析
  const trendAnalysis = document.getElementById('trendAnalysis');
  if (trendAnalysis) trendAnalysis.textContent = data.trend_analysis.summary;
}

// 详细报告（点击按钮后显示）
function updateDetailUI(data) {
  // 技术指标分析
  const indicatorsContainer = document.getElementById('indicatorsAnalysis');
  if (indicatorsContainer) {
    indicatorsContainer.innerHTML = '';
    const indicators = data.indicators_analysis;
    for (const [name, indicator] of Object.entries(indicators)) {
      const indicatorItem = document.createElement('div');
      indicatorItem.className = 'bg-gray-800 rounded-lg border border-gray-700 p-4 shadow-lg';
      let trendClass = 'bg-yellow-900/30 text-yellow-400';
      let trendText = '中性';
      if (indicator.support_trend === '支持当前趋势') {
        trendClass = 'bg-green-900/30 text-green-400';
        trendText = '上涨';
      } else if (indicator.support_trend === '反对当前趋势') {
        trendClass = 'bg-red-900/30 text-red-400';
        trendText = '下跌';
      }
      let valueDisplay = '';
      if (typeof indicator.value === 'object') {
        valueDisplay = `<div class=\"text-right\">`;
        for (const [key, val] of Object.entries(indicator.value)) {
          valueDisplay += `<div class=\"text-sm font-medium text-gray-300\">${key}: ${val}</div>`;
        }
        valueDisplay += `</div>`;
      } else {
        valueDisplay = `<span class=\"text-xl font-semibold text-primary\">${indicator.value}</span>`;
      }
      indicatorItem.innerHTML = `
        <div class=\"flex justify-between items-center mb-3\">
          <span class=\"text-gray-300 font-medium\">${name}</span>
          ${valueDisplay}
        </div>
        <p class=\"text-sm text-gray-400\">${indicator.analysis}</p>
        <div class=\"mt-2\">
          <span class=\"text-xs px-2 py-1 ${trendClass} rounded-full\">趋势：${trendText}</span>
        </div>
      `;
      indicatorsContainer.appendChild(indicatorItem);
    }
  }
  // 交易建议
  const tradingAdvice = data.trading_advice;
  const tradingAdviceEl = document.getElementById('tradingAdvice');
  if (tradingAdviceEl) {
    tradingAdviceEl.innerHTML = `
      <p><strong>操作建议：</strong>${tradingAdvice.action}</p>
      <p><strong>原因：</strong>${tradingAdvice.reason}</p>
      <p><strong>入场价格：</strong>${tradingAdvice.entry_price}</p>
      <p><strong>止损价格：</strong>${tradingAdvice.stop_loss}</p>
      <p><strong>止盈价格：</strong>${tradingAdvice.take_profit}</p>
    `;
  }
  // 风险评估
  const riskAssessment = data.risk_assessment;
  const riskAssessmentEl = document.getElementById('riskAssessment');
  if (riskAssessmentEl) {
    riskAssessmentEl.innerHTML = `
      <p><strong>风险等级：</strong>${riskAssessment.level}</p>
      <p><strong>风险分数：</strong>${riskAssessment.score}</p>
      <p><strong>风险详情：</strong></p>
      <ul>
        ${riskAssessment.details.map(detail => `<li>${detail}</li>`).join('')}
      </ul>
    `;
  }
}

// 从当前标签页获取交易对符号
async function getCurrentSymbol() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        resolve('BTCUSDT'); // 默认值
        return;
      }

      const activeTab = tabs[0];
      chrome.tabs.sendMessage(activeTab.id, { action: 'getSymbol' }, (response) => {
        if (chrome.runtime.lastError || !response || !response.symbol) {
          console.log('获取交易对失败，使用默认值:', chrome.runtime.lastError);
          resolve('BTCUSDT'); // 默认值
        } else {
          console.log('获取到交易对:', response.symbol);
          resolve(response.symbol);
        }
      });
    });
  });
}

// 添加重试函数
async function fetchWithRetry(url, options, maxRetries = 3) {
    let lastError;
    let needTokenRefresh = false;

    for (let i = 0; i < maxRetries; i++) {
        try {
            // 如果需要刷新 token，先尝试刷新
            if (needTokenRefresh) {
                try {
                    const newToken = await refreshToken();
                    options.headers['Authorization'] = `Token ${newToken}`;
                    needTokenRefresh = false;
                } catch (refreshError) {
                    console.error('Token refresh failed:', refreshError);
                    // 如果刷新失败，清除 token 并显示登录界面
                    await chrome.storage.local.remove(['token']);
                    showAuthContent();
                    throw new Error('认证已过期，请重新登录');
                }
            }

            const response = await fetch(url, options);
            
            // 检查响应类型
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.error('服务器返回非JSON数据:', contentType);
                // 如果是第一次遇到非JSON响应，尝试刷新 token
                if (!needTokenRefresh) {
                    needTokenRefresh = true;
                    continue;
                }
                throw new Error('服务器返回了非JSON数据');
            }

            // 解析JSON响应
            const data = await response.json();

            // 处理401或403错误
            if (response.status === 401 || response.status === 403) {
                if (!needTokenRefresh) {
                    needTokenRefresh = true;
                    continue;
                }
                throw new Error('认证失败');
            }

            // 如果是404错误但返回了正确的JSON格式，直接返回数据
            if (response.status === 404 && data.status === 'not_found') {
                return data;
            }

            // 其他非200响应
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`第 ${i + 1} 次请求失败:`, error);
            lastError = error;
            
            // 如果已经尝试过刷新 token 但仍然失败，直接退出
            if (error.message.includes('认证已过期')) {
                throw error;
            }
            
            // 最后一次重试失败
            if (i === maxRetries - 1) {
                throw lastError;
            }
            
            // 等待一段时间再重试
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

// 修改加载分析数据函数
async function loadAnalysisData() {
    console.log('开始加载分析数据');
    
    // 先隐藏所有市场数据内容，避免闪烁
    hideMarketDataContent();
    
    // 重置详细报告状态
    resetDetailReport();

    if (loading) {
        loading.style.display = 'flex';
        loading.classList.remove('hidden');
    }
    if (error) {
        error.style.display = 'none';
        error.classList.add('hidden');
    }

    try {
        const token = await getToken();
        if (!token) {
            showError('请先登录');
            showAuthContent();
            return;
        }

        console.log('开始加载分析数据...');

        // 获取当前交易对
        const symbol = await getCurrentSymbol();
        console.log('分析交易对:', symbol);

        // 更新标题显示代币名称
        const marketTitle = document.getElementById('marketTitle');
        if (marketTitle) {
            const coinName = symbol.replace(/USDT$|USD$|BUSD$|USDC$/, '');
            marketTitle.textContent = `${coinName}市场分析报告`;
        }

        try {
            const data = await fetchWithRetry(`${API_BASE_URL}/crypto/technical-indicators/${symbol}/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            console.log('分析数据接口返回:', data);

            if (data.status === 'success' && data.data) {
                // 显示市场数据内容
                showMarketDataContent();

                // 保存数据以便详细报告使用
                window.lastMarketData = data.data;
                
                console.log('准备更新UI，数据:', {
                    timestamp: data.data.last_update_time,
                    current_price: data.data.current_price
                });

                // 更新UI显示数据
                updateUI(data.data);
            } else if (data.status === 'not_found' && data.needs_refresh) {
                // 显示数据不存在的友好提示
                showDataNotFoundError(symbol);
            } else {
                showError(data.message || '获取分析数据失败');
            }
        } catch (err) {
            console.error('加载数据错误:', err);
            
            // 如果是认证过期错误，显示特定消息
            if (err.message.includes('认证已过期')) {
                showError('登录已过期，请重新登录');
            } else {
                showError('加载数据失败，请稍后重试');
            }
        }
    } catch (err) {
        console.error('加载数据错误:', err);
        showError('加载数据失败，请稍后重试');
    } finally {
        // 隐藏加载动画
        if (loading) {
            loading.style.display = 'none';
            loading.classList.add('hidden');
        }
    }
}

// 获取 token
async function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['token'], (result) => {
      resolve(result.token);
    });
  });
}

// 更新 UI
function updateUI(data) {
    if (loading) {
        loading.style.display = 'none';
        loading.classList.add('hidden');
    }

    // 更新最后更新时间
    const lastUpdateTime = document.getElementById('lastUpdateTime');
    if (lastUpdateTime) {
        // 从数据中获取时间戳
        const updateTimestamp = data.last_update_time || 
                              data.timestamp || 
                              new Date().toISOString();
        
        console.log('更新时间数据:', {
            timestamp: updateTimestamp,
            formatted: formatTimeAgo(updateTimestamp)
        });
        
        lastUpdateTime.textContent = `更新时间：${formatTimeAgo(updateTimestamp)}`;
        lastUpdateTime.style.display = 'block';
    }

    // 更新当前价格
    const currentPrice = document.getElementById('currentPrice');
    if (currentPrice && data.current_price) {
        currentPrice.textContent = formatPrice(data.current_price);
    }

    // 概率卡片及进度条
    const upProb = document.getElementById('upProb');
    const sidewaysProb = document.getElementById('sidewaysProb');
    const downProb = document.getElementById('downProb');
    const upProbBar = document.getElementById('upProbBar');
    const sidewaysProbBar = document.getElementById('sidewaysProbBar');
    const downProbBar = document.getElementById('downProbBar');

    if (upProb) upProb.textContent = `${data.trend_analysis.probabilities.up}%`;
    if (sidewaysProb) sidewaysProb.textContent = `${data.trend_analysis.probabilities.sideways}%`;
    if (downProb) downProb.textContent = `${data.trend_analysis.probabilities.down}%`;
    if (upProbBar) upProbBar.style.width = `${data.trend_analysis.probabilities.up}%`;
    if (sidewaysProbBar) sidewaysProbBar.style.width = `${data.trend_analysis.probabilities.sideways}%`;
    if (downProbBar) downProbBar.style.width = `${data.trend_analysis.probabilities.down}%`;

    // 更新趋势分析
    const trendAnalysis = document.getElementById('trendAnalysis');
    if (trendAnalysis) trendAnalysis.textContent = data.trend_analysis.summary;

    // 更新技术指标分析
    const indicatorsContainer = document.getElementById('indicatorsAnalysis');
    if (indicatorsContainer) {
        indicatorsContainer.innerHTML = '';
        const indicators = data.indicators_analysis;
        for (const [name, indicator] of Object.entries(indicators)) {
            const indicatorItem = document.createElement('div');
            indicatorItem.className = 'bg-gray-800 rounded-lg border border-gray-700 p-4 shadow-lg';
            // 确定趋势方向
            let trendClass = 'bg-yellow-900/30 text-yellow-400';
            let trendText = '中性';
            if (indicator.support_trend === '支持当前趋势') {
                trendClass = 'bg-green-900/30 text-green-400';
                trendText = '上涨';
            } else if (indicator.support_trend === '反对当前趋势') {
                trendClass = 'bg-red-900/30 text-red-400';
                trendText = '下跌';
            }
            // 构建指标值显示
            let valueDisplay = '';
            if (typeof indicator.value === 'object') {
                valueDisplay = `<div class="text-right">`;
                for (const [key, val] of Object.entries(indicator.value)) {
                    valueDisplay += `<div class="text-sm font-medium text-gray-300">${key}: ${val}</div>`;
                }
                valueDisplay += `</div>`;
            } else {
                valueDisplay = `<span class="text-xl font-semibold text-primary">${indicator.value}</span>`;
            }
            indicatorItem.innerHTML = `
                <div class="flex justify-between items-center mb-3">
                    <span class="text-gray-300 font-medium">${name}</span>
                    ${valueDisplay}
                </div>
                <p class="text-sm text-gray-400">${indicator.analysis}</p>
                <div class="mt-2">
                    <span class="text-xs px-2 py-1 ${trendClass} rounded-full">趋势：${trendText}</span>
                </div>
            `;
            indicatorsContainer.appendChild(indicatorItem);
        }
    }
}

// 更新详细报告 UI
function updateDetailUI(data) {
  // 更新交易建议
  const tradingAdvice = data.trading_advice;
  const tradingAdviceEl = document.getElementById('tradingAdvice');
  if (tradingAdviceEl) {
    tradingAdviceEl.innerHTML = `
      <p><strong>操作建议：</strong>${tradingAdvice.action}</p>
      <p><strong>原因：</strong>${tradingAdvice.reason}</p>
      <p><strong>入场价格：</strong>${tradingAdvice.entry_price}</p>
      <p><strong>止损价格：</strong>${tradingAdvice.stop_loss}</p>
      <p><strong>止盈价格：</strong>${tradingAdvice.take_profit}</p>
    `;
  }

  // 更新风险评估
  const riskAssessment = data.risk_assessment;
  const riskAssessmentEl = document.getElementById('riskAssessment');
  if (riskAssessmentEl) {
    riskAssessmentEl.innerHTML = `
      <p><strong>风险等级：</strong>${riskAssessment.level}</p>
      <p><strong>风险分数：</strong>${riskAssessment.score}</p>
      <p><strong>风险详情：</strong></p>
      <ul>
        ${riskAssessment.details.map(detail => `<li>${detail}</li>`).join('')}
      </ul>
    `;
  }
}

// 格式化价格
function formatPrice(price) {
    // 如果价格不是数字，直接返回
    if (typeof price !== 'number') {
        return price;
    }

    // 将科学计数法转换为普通数字字符串
    let priceStr = price.toString();
    if (priceStr.includes('e')) {
        priceStr = Number(price).toFixed(20);
    }

    // 移除末尾的0
    priceStr = priceStr.replace(/\.?0+$/, '');

    // 根据价格大小决定保留的小数位数
    if (price >= 1) {
        // 大于等于1的价格保留2位小数
        return parseFloat(priceStr).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    } else if (price >= 0.01) {
        // 0.01-1之间保留4位小数
        return parseFloat(priceStr).toLocaleString(undefined, {
            minimumFractionDigits: 4,
            maximumFractionDigits: 4
        });
    } else if (price >= 0.0001) {
        // 0.0001-0.01之间保留6位小数
        return parseFloat(priceStr).toLocaleString(undefined, {
            minimumFractionDigits: 6,
            maximumFractionDigits: 6
        });
    } else {
        // 非常小的数字，显示8位小数
        return parseFloat(priceStr).toLocaleString(undefined, {
            minimumFractionDigits: 8,
            maximumFractionDigits: 8
        });
    }
}

// 格式化指标值
function formatIndicatorValue(value) {
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, val]) => `${key}: ${val}`)
      .join(', ');
  }
  return value;
}

// 获取趋势文本
function getTrendText(trend) {
  switch (trend) {
    case 'up':
      return '看涨';
    case 'down':
      return '看跌';
    default:
      return '中性';
  }
}

// 显示错误
function showError(message) {
  const error = document.getElementById('error');
  if (error) {
    error.textContent = message;
    error.style.display = 'block';
    error.classList.remove('hidden');
  }

  const loading = document.getElementById('loading');
  if (loading) {
    loading.style.display = 'none';
    loading.classList.add('hidden');
  }
}

// 显示数据不存在的友好错误提示
function showDataNotFoundError(symbol) {
  // 注意：市场数据内容已经在loadAnalysisData函数开始时隐藏，这里不需要再次隐藏

  // 显示当前价格
  const priceContainer = document.querySelector('.mb-4.text-center');
  if (priceContainer) {
    priceContainer.style.display = 'block';
  }

  const error = document.getElementById('error');
  if (error) {
    // 清空原有内容
    error.innerHTML = '';

    // 从交易对中提取代币名称（例如从BTCUSDT中提取BTC）
    const coinName = symbol.replace(/USDT$|USD$|BUSD$|USDC$/, '');

    // 创建提示文本
    const errorText = document.createElement('p');
    errorText.className = 'mb-4 text-center';
    errorText.textContent = `当前代币 ${coinName} 数据不存在`;

    // 创建说明文本
    const descText = document.createElement('p');
    descText.className = 'mb-4 text-sm text-gray-400 text-center';
    descText.textContent = '需要刷新数据库中的代币信息';

    // 创建刷新按钮
    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'bg-primary text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors duration-200 flex items-center justify-center';
    refreshBtn.innerHTML = '<i class="ri-refresh-line mr-2"></i>刷新代币数据';
    refreshBtn.onclick = handleForceRefresh;

    // 添加到错误容器
    error.appendChild(errorText);
    error.appendChild(descText);
    error.appendChild(refreshBtn);

    // 显示错误容器
    error.style.display = 'flex';
    error.style.flexDirection = 'column';
    error.style.alignItems = 'center';
    error.style.justifyContent = 'center';
    error.style.padding = '20px';
    error.classList.remove('hidden');
  }

  const loading = document.getElementById('loading');
  if (loading) {
    loading.style.display = 'none';
    loading.classList.add('hidden');
  }
}

// 隐藏市场数据相关内容
function hideMarketDataContent() {
  // 隐藏当前价格显示
  const priceContainer = document.querySelector('.mb-4.text-center');
  if (priceContainer) {
    priceContainer.style.display = 'none';
  }

  // 隐藏概率卡片区
  const probCards = document.querySelector('.grid.grid-cols-3.gap-4.mb-6');
  if (probCards) {
    probCards.style.display = 'none';
  }

  // 隐藏市场趋势分析（包括标题和内容）
  const trendAnalysisContainers = document.querySelectorAll('.mb-6:not(.hidden)');
  trendAnalysisContainers.forEach(container => {
    // 检查是否包含"市场趋势分析"文本或加载中文本
    const titleElement = container.querySelector('.text-sm.text-gray-400');
    if (titleElement && (titleElement.textContent.includes('市场趋势分析') ||
        container.textContent.includes('加载中'))) {
      container.style.display = 'none';
    }
  });

  // 隐藏详细报告折叠面板
  const detailsButton = document.getElementById('detailsButton');
  if (detailsButton) {
    const detailsPanel = detailsButton.closest('.mb-6');
    if (detailsPanel) {
      detailsPanel.style.display = 'none';
    }
  }
}

// 显示市场数据相关内容
function showMarketDataContent() {
  // 显示当前价格显示
  const priceContainer = document.querySelector('.mb-4.text-center');
  if (priceContainer) {
    priceContainer.style.display = 'block';
  }

  // 显示概率卡片区
  const probCards = document.querySelector('.grid.grid-cols-3.gap-4.mb-6');
  if (probCards) {
    probCards.style.display = 'grid';
  }

  // 显示市场趋势分析（包括标题和内容）
  const trendAnalysisContainers = document.querySelectorAll('.mb-6');
  trendAnalysisContainers.forEach(container => {
    // 检查是否包含"市场趋势分析"文本
    const titleElement = container.querySelector('.text-sm.text-gray-400');
    if (titleElement && titleElement.textContent.includes('市场趋势分析')) {
      container.style.display = 'block';
    }
  });

  // 显示详细报告折叠面板
  const detailsButton = document.getElementById('detailsButton');
  if (detailsButton) {
    const detailsPanel = detailsButton.closest('.mb-6');
    if (detailsPanel) {
      detailsPanel.style.display = 'block';
    }
  }

  // 隐藏错误提示
  const error = document.getElementById('error');
  if (error) {
    error.style.display = 'none';
    error.classList.add('hidden');
  }
}

// 重置详细报告状态
function resetDetailReport() {
  // 隐藏详细报告容器
  const reportContainer = document.getElementById('reportContainer');
  if (reportContainer) {
    reportContainer.classList.add('hidden');
  }

  // 重置按钮文本和图标
  const detailsButtonText = document.getElementById('detailsButtonText');
  const detailsButtonIcon = document.getElementById('detailsButtonIcon');
  if (detailsButtonText) {
    detailsButtonText.textContent = '查看详细报告';
  }
  if (detailsButtonIcon) {
    detailsButtonIcon.classList.remove('rotate-180');
  }

  // 重置状态变量
  isReportExpanded = false;
  detailRendered = false;
}

// 详细报告切换函数 - 使用容器版
function toggleDetailReport() {
  console.log('详细报告按钮被点击');

  // 获取必要的DOM元素
  const reportContainer = document.getElementById('reportContainer');
  const detailsButtonText = document.getElementById('detailsButtonText');
  const detailsButtonIcon = document.getElementById('detailsButtonIcon');

  if (!reportContainer || !detailsButtonText || !detailsButtonIcon) {
    console.error('找不到必要的DOM元素');
    return;
  }

  // 检查容器是否隐藏
  const isContainerHidden = reportContainer.classList.contains('hidden');
  console.log('当前报告容器是否隐藏:', isContainerHidden);

  if (isContainerHidden) {
    // 当前是隐藏状态，需要显示
    console.log('展开详细报告');
    reportContainer.classList.remove('hidden');
    detailsButtonText.textContent = '收起详细报告';
    detailsButtonIcon.classList.add('rotate-180');

    // 首次展开时渲染详细内容
    if (!detailRendered && window.lastMarketData) {
      console.log('首次渲染详细内容');
      updateDetailUI(window.lastMarketData);
      detailRendered = true;
    }
  } else {
    // 当前是显示状态，需要隐藏
    console.log('收起详细报告');
    reportContainer.classList.add('hidden');
    detailsButtonText.textContent = '查看详细报告';
    detailsButtonIcon.classList.remove('rotate-180');
  }
}

// 更新个人资料界面
function updateProfileUI(data) {
    const profileContent = document.getElementById('profileContent');
    if (!profileContent) return;

    if (!data) {
        // 未登录状态
        showAuthContent();
        return;
    }

    // 填充用户信息
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const registerTime = document.getElementById('registerTime');

    if (profileName) profileName.textContent = data.username || '用户名';
    if (profileEmail) profileEmail.textContent = data.email || '';
    if (registerTime && data.created_at) {
        const date = new Date(data.created_at);
        registerTime.textContent = date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(/\//g, '/');
    }

    // 填充会员信息
    const membershipStatus = document.getElementById('membershipStatus');
    const membershipLevel = document.getElementById('membershipLevel');
    const analysisCount = document.getElementById('analysisCount');

    // 会员状态处理
    if (membershipStatus && data.membership) {
        const expiryDate = data.membership.expires_at ? new Date(data.membership.expires_at).toLocaleDateString() : '永久';
        membershipStatus.textContent = `有效期至 ${expiryDate}`;

        // 根据有效期设置不同的样式
        if (data.membership.status === 'active') {
            membershipStatus.className = 'px-2.5 py-1 bg-green-900/50 text-green-400 text-xs rounded-full';
        } else if (data.membership.status === 'expired') {
            membershipStatus.className = 'px-2.5 py-1 bg-red-900/50 text-red-400 text-xs rounded-full';
            membershipStatus.textContent = '已过期';
        } else {
            membershipStatus.className = 'px-2.5 py-1 bg-yellow-900/50 text-yellow-400 text-xs rounded-full';
        }
    }

    // 会员级别处理
    if (membershipLevel && data.membership) {
        membershipLevel.textContent = data.membership.level || 'Free会员';
    }

    // 剩余分析次数
    if (analysisCount && data.membership) {
        analysisCount.textContent = data.membership.remaining_analysis_count !== undefined ?
            `${data.membership.remaining_analysis_count}次` : '无限制';
    }

    // 绑定退出登录按钮事件
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    // 绑定升级会员按钮事件
    const upgradeMembershipBtn = document.getElementById('upgradeMembershipBtn');
    if (upgradeMembershipBtn) {
        upgradeMembershipBtn.addEventListener('click', function() {
            // 这里可以添加升级会员的逻辑，例如打开支付页面
            alert('即将跳转到会员升级页面');
            // 实际项目中可以跳转到一个真实的支付页面
            // window.open('/membership-upgrade', '_blank');
        });
    }

    // 绑定编辑个人资料按钮事件
    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function() {
            // 编辑个人资料的逻辑
            alert('编辑个人资料功能正在开发中');
        });
    }

    // 修复功能菜单中的链接效果
    const menuItems = profileContent.querySelectorAll('.hover\\:bg-gray-700\\/30 a');
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const text = this.querySelector('span').textContent;
            alert(`${text}功能正在开发中`);
        });
    });
}

// 处理退出登录
async function handleLogout() {
    try {
        // 显示确认对话框
        const confirmDialog = document.createElement('div');
        confirmDialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        confirmDialog.innerHTML = `
            <div class="bg-[#1C1C1E] w-[300px] rounded-lg overflow-hidden">
                <div class="p-5 text-center">
                    <h3 class="text-lg font-medium mb-2">确认退出</h3>
                    <p class="text-[#8E8E93] text-sm">您确定要退出登录吗？</p>
                </div>
                <div class="flex border-t border-[#2C2C2E]">
                    <button id="cancelLogout" class="flex-1 py-3 text-[#8E8E93] border-r border-[#2C2C2E]">取消</button>
                    <button id="confirmLogout" class="flex-1 py-3 text-[#FF3B30]">确认退出</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmDialog);

        // 绑定按钮事件
        document.getElementById('cancelLogout').addEventListener('click', function() {
            document.body.removeChild(confirmDialog);
        });

        document.getElementById('confirmLogout').addEventListener('click', async function() {
            document.body.removeChild(confirmDialog);

            // 显示退出中提示
            const loadingToast = document.createElement('div');
            loadingToast.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#1C1C1E] rounded px-4 py-2 shadow-lg z-50';
            loadingToast.textContent = '正在退出...';
            document.body.appendChild(loadingToast);

            // 清除存储的登录信息
            await chrome.storage.local.clear();

            // 移除提示
            setTimeout(() => {
                document.body.removeChild(loadingToast);
                // 显示登录界面
                showAuthContent();

                // 重置表单
                const loginEmail = document.getElementById('loginEmail');
                const loginPassword = document.getElementById('loginPassword');
                if (loginEmail) loginEmail.value = '';
                if (loginPassword) loginPassword.value = '';

                // 显示退出成功消息
                const successToast = document.createElement('div');
                successToast.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#1C1C1E] text-white rounded px-4 py-2 shadow-lg z-50';
                successToast.textContent = '已成功退出登录';
                document.body.appendChild(successToast);

                // 3秒后移除成功提示
                setTimeout(() => {
                    document.body.removeChild(successToast);
                }, 3000);
            }, 1000);
        });
    } catch (err) {
        console.error('退出登录错误:', err);
        showError('退出登录失败，请重试');
    }
}

// 加载个人资料数据
async function loadProfileData() {
    // 隐藏错误提示
    const error = document.getElementById('error');
    if (error) {
        error.style.display = 'none';
        error.classList.add('hidden');
        error.innerHTML = ''; // 清空错误内容
    }

    try {
        const token = await getToken();
        if (!token) {
            showError('请先登录');
            const loginForm = document.getElementById('login-form');
            if (loginForm) loginForm.style.display = 'block';
            if (profileContent) profileContent.style.display = 'none';
            return;
        }

        const response = await fetch(`${API_BASE_URL}/auth/profile/`, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        if (data.status === 'success') {
            updateProfileUI(data.data);
        } else {
            showError(data.message || '加载个人资料失败');
            updateProfileUI(null); // 显示未登录状态
        }
    } catch (err) {
        console.error('加载个人资料错误:', err);
        showError('加载个人资料失败，请稍后重试');
        updateProfileUI(null); // 显示未登录状态
    }
}

// 在DOMContentLoaded中添加按钮事件监听
document.addEventListener('DOMContentLoaded', () => {
  // 绑定刷新按钮事件
  const refreshButton = document.getElementById('refreshButton');
  if (refreshButton) {
    refreshButton.addEventListener('click', handleForceRefresh);
  }

  // 绑定详细报告按钮事件
  const detailsButton = document.getElementById('detailsButton');
  if (detailsButton) {
    detailsButton.addEventListener('click', toggleDetailReport);
    console.log('详细报告按钮事件绑定成功');
  }
});

// 强制刷新函数
async function handleForceRefresh() {
  console.log('强制刷新开始');

  try {
    const token = await getToken();
    if (!token) {
      showError('请先登录');
      showAuthContent();
      return;
    }

    // 获取当前交易对
    const symbol = await getCurrentSymbol();
    console.log('强制刷新交易对:', symbol);

    // 显示刷新按钮动画
    const refreshButton = document.getElementById('refreshButton');
    const refreshIcon = refreshButton.querySelector('i');
    refreshButton.disabled = true;
    refreshIcon.classList.add('spin-animation');

    // 更新最后更新时间为"正在刷新..."
    const lastUpdateTime = document.getElementById('lastUpdateTime');
    if (lastUpdateTime) {
      lastUpdateTime.textContent = '正在刷新...';
    }

    // 创建并显示加载覆盖层
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-text">正在进行强制刷新，预计需要40秒左右完成分析...</div>
      <div class="loading-progress">
        <div class="loading-progress-bar" id="progressBar"></div>
      </div>
      <div class="loading-percent" id="progressPercent">0%</div>
    `;
    document.body.appendChild(loadingOverlay);

    // 设置更真实的进度模拟
    const progressBar = document.getElementById('progressBar');
    const progressPercent = document.getElementById('progressPercent');
    let progress = 0;

    // 每100ms更新一次，使动画更流畅
    const interval = 100;

    // 立即显示初始进度，避免进度条看起来卡住
    progress = 1;
    progressBar.style.width = `${progress}%`;
    progressPercent.textContent = `${progress}%`;

    // 使用非线性函数来模拟进度
    // 前10秒快速增长到40%
    // 中间10秒增长到70%
    // 最后10秒缓慢增长到95%
    const getProgressForTime = (elapsedMs) => {
      // 直接使用毫秒计算，不需要转换为秒
      const elapsedSeconds = elapsedMs / 1000;

      // 使用平方根函数使进度条在开始时更快，后面更慢
      if (elapsedSeconds <= 10) {
        // 0-10秒: 1% 到 40%
        return 1 + 39 * Math.sqrt(elapsedSeconds / 10);
      } else if (elapsedSeconds <= 20) {
        // 10-20秒: 40% 到 70%
        return 40 + 30 * ((elapsedSeconds - 10) / 10);
      } else {
        // 20-30秒: 70% 到 95%
        const remaining = Math.min(1, (elapsedSeconds - 20) / 10);
        // 使用缓动函数，让后期增长更慢
        return 70 + 25 * (1 - Math.pow(1 - remaining, 3));
      }
    };

    let startTime = Date.now();

    const progressInterval = setInterval(() => {
      const elapsedMs = Date.now() - startTime;

      // 计算当前应该显示的进度
      progress = Math.min(95, getProgressForTime(elapsedMs));

      // 更新进度条和百分比文本
      progressBar.style.width = `${progress}%`;
      progressPercent.textContent = `${Math.round(progress)}%`;

      // 根据进度更新提示文本
      const loadingText = loadingOverlay.querySelector('.loading-text');
      if (loadingText) {
        if (progress < 30) {
          loadingText.textContent = '正在获取市场数据并进行技术指标计算...';
        } else if (progress < 60) {
          loadingText.textContent = '正在进行趋势分析和概率评估...';
        } else if (progress < 85) {
          loadingText.textContent = '正在生成交易建议和风险评估...';
        } else {
          loadingText.textContent = '最终数据整合中，即将完成...';
        }
      }
    }, interval);

    console.log('开始请求强制刷新API:', `${API_BASE_URL}/crypto/technical-indicators/${symbol}/?force_refresh=true`);

    // 调用强制刷新API
    const response = await fetch(`${API_BASE_URL}/crypto/technical-indicators/${symbol}/?force_refresh=true`, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // 清除进度条计时器
    clearInterval(progressInterval);

    // 平滑过渡到100%
    const completeProgress = () => {
      // 从当前进度平滑过渡到100%
      const currentProgress = parseFloat(progressBar.style.width);
      const startTransition = Date.now();
      const transitionDuration = 800; // 800毫秒的过渡时间

      const transitionInterval = setInterval(() => {
        const elapsedMs = Date.now() - startTransition;
        const transitionProgress = Math.min(1, elapsedMs / transitionDuration);

        // 使用缓动函数使过渡更自然
        const easedProgress = 1 - Math.pow(1 - transitionProgress, 3);
        const newProgress = currentProgress + (100 - currentProgress) * easedProgress;

        progressBar.style.width = `${newProgress}%`;
        progressPercent.textContent = `${Math.round(newProgress)}%`;

        if (transitionProgress >= 1) {
          clearInterval(transitionInterval);
          progressBar.style.width = '100%';
          progressPercent.textContent = '100%';

          // 更新加载文本
          const loadingText = loadingOverlay.querySelector('.loading-text');
          if (loadingText) {
            loadingText.textContent = '数据刷新完成！';
          }
        }
      }, 16); // 约60fps的更新频率
    };

    completeProgress();

    console.log('强制刷新API响应状态:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('强制刷新API响应数据:', data);

    // 强制刷新成功后，再次请求普通接口获取最新数据
    if (data.status === 'success') {
      console.log('强制刷新成功，开始请求最新数据:', `${API_BASE_URL}/crypto/technical-indicators/${symbol}/`);

      try {
        // 更新加载文本
        const loadingText = loadingOverlay.querySelector('.loading-text');
        if (loadingText) {
          loadingText.textContent = '刷新成功！正在获取最新分析数据...';
        }

        // 延迟一秒再请求，确保后端数据已完全更新
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 请求普通接口获取最新数据
        const freshResponse = await fetch(`${API_BASE_URL}/crypto/technical-indicators/${symbol}/`, {
          method: 'GET',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (freshResponse.ok) {
          const freshData = await freshResponse.json();
          console.log('获取最新数据成功:', freshData);

          if (freshData.status === 'success' && freshData.data) {
            data.data = freshData.data; // 更新数据为最新数据
            // 保存数据以便详细报告使用
            window.lastMarketData = freshData.data;
            console.log('强制刷新后保存数据到window.lastMarketData:', window.lastMarketData);
          }
        }
      } catch (refreshErr) {
        console.error('获取最新数据失败:', refreshErr);
        // 继续使用强制刷新返回的数据，不中断流程
      }
    }

    // 延迟一小段时间再关闭加载覆盖层，让用户看到100%的进度
    setTimeout(() => {
      // 移除加载覆盖层
      if (document.body.contains(loadingOverlay)) {
        // 添加淡出动画
        loadingOverlay.style.transition = 'opacity 0.5s ease';
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
          if (document.body.contains(loadingOverlay)) {
            document.body.removeChild(loadingOverlay);
          }
        }, 500);
      }

      // 恢复刷新按钮状态
      refreshButton.disabled = false;
      refreshIcon.classList.remove('spin-animation');

      // 处理API响应
      if (data.status === 'success') {
        // 确保显示市场数据内容
        showMarketDataContent();

        // 更新UI显示数据
        if (data.data) {
          updateUI(data.data);

          // 保存数据以便详细报告使用
          window.lastMarketData = data.data;
        }

        // 显示成功提示
        showToast('分析数据已成功更新', 'success');
      } else {
        showError(data.message || '获取分析数据失败');
      }
    }, 1000);

  } catch (err) {
    console.error('强制刷新错误:', err);

    // 移除加载覆盖层（如果存在）
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
      document.body.removeChild(loadingOverlay);
    }

    // 恢复刷新按钮状态
    const refreshButton = document.getElementById('refreshButton');
    if (refreshButton) {
      refreshButton.disabled = false;
      const refreshIcon = refreshButton.querySelector('i');
      if (refreshIcon) {
        refreshIcon.classList.remove('spin-animation');
      }
    }

    // 恢复最后更新时间显示
    const lastUpdateTime = document.getElementById('lastUpdateTime');
    if (lastUpdateTime) {
      lastUpdateTime.textContent = '更新时间：未知';
    }

    showError('强制刷新失败，请稍后重试');
  }
}

// 显示toast提示消息
function showToast(message, type = 'info') {
  // 移除现有的toast
  const existingToast = document.querySelector('.toast-message');
  if (existingToast) {
    document.body.removeChild(existingToast);
  }

  // 创建新toast
  const toast = document.createElement('div');
  toast.className = 'toast-message';

  // 设置toast样式
  toast.style.position = 'fixed';
  toast.style.bottom = '80px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.padding = '10px 16px';
  toast.style.borderRadius = '4px';
  toast.style.fontSize = '14px';
  toast.style.zIndex = '9999';
  toast.style.transition = 'opacity 0.3s ease';

  // 根据类型设置背景色
  if (type === 'success') {
    toast.style.backgroundColor = 'rgba(16, 185, 129, 0.9)';
    toast.style.color = 'white';
  } else if (type === 'error') {
    toast.style.backgroundColor = 'rgba(239, 68, 68, 0.9)';
    toast.style.color = 'white';
  } else {
    toast.style.backgroundColor = 'rgba(59, 130, 246, 0.9)';
    toast.style.color = 'white';
  }

  toast.textContent = message;
  document.body.appendChild(toast);

  // 3秒后自动消失
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

// 获取 CSRF token
async function getCsrfToken() {
  try {
    const response = await fetch(`${API_BASE_URL}/csrf/`, {
      method: 'GET',
      mode: 'cors'
    });
    if (response.ok) {
      const data = await response.json();
      return data.csrfToken;
    }
  } catch (err) {
    console.error('获取 CSRF token 失败:', err);
  }
  return null;
}

// 修改登录函数
async function handleLogin(email, password) {
  try {
    const csrfToken = await getCsrfToken();
    if (!csrfToken) {
      throw new Error('无法获取 CSRF token');
    }

    const response = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      mode: 'cors',
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('登录接口返回:', data);

    if (data.status === 'success' && data.data && data.data.token) {
      chrome.storage.local.set({
        token: data.data.token,
        user: data.data.user
      }, () => {
        chrome.storage.local.get(['token', 'user'], (result) => {
          if (result.token && result.user) {
            showMarketContent();
          } else {
            loginError.textContent = '登录信息保存失败，请重试';
            loginButton.disabled = false;
            loginButton.textContent = '登录';
          }
        });
      });
    } else {
      loginError.textContent = data.message || '登录失败，请检查邮箱和密码';
      loginButton.disabled = false;
      loginButton.textContent = '登录';
    }
  } catch (err) {
    console.error('登录错误:', err);
    if (!navigator.onLine) {
      loginError.textContent = '网络连接已断开，请检查网络设置';
    } else if (err.message.includes('HTTP error!')) {
      loginError.textContent = '服务器连接失败，请稍后重试';
    } else {
      loginError.textContent = '登录失败，请检查网络连接';
    }
    loginButton.disabled = false;
    loginButton.textContent = '登录';
  }
}

// 修改注册函数
async function handleRegister(email, password, code, invitation) {
  try {
    const csrfToken = await getCsrfToken();
    if (!csrfToken) {
      throw new Error('无法获取 CSRF token');
    }

    const response = await fetch(`${API_BASE_URL}/auth/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      mode: 'cors',
      body: JSON.stringify({ email, password, code, invitation }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('注册API响应数据:', data);

    if (data.status === 'success') {
      console.log('注册成功，准备自动登录');
      registerSuccess.textContent = '注册成功，正在跳转到行情页面...';
      registerError.textContent = '';

      // 清除保存的表单状态
      chrome.storage.local.remove(['registerFormState'], () => {
        console.log('注册成功，表单状态已清除');
      });

      // 注册成功后，自动登录并跳转到行情页面
      setTimeout(() => {
        // 使用注册的邮箱和密码自动登录
        autoLogin(email, password);
      }, 1000);
    } else {
      // 处理错误信息，可能在不同的字段中
      let errorMessage = '';

      if (data.message) {
        // 检查 message 是否是对象
        if (typeof data.message === 'object' && data.message !== null) {
          // 处理嵌套的错误对象，例如 {email: ['该邮箱已被注册']}
          for (const key in data.message) {
            if (Array.isArray(data.message[key]) && data.message[key].length > 0) {
              errorMessage += data.message[key].join(', ');
            } else {
              errorMessage += data.message[key];
            }
            errorMessage += ' ';
          }
        } else {
          errorMessage = data.message;
        }
      } else if (data.error) {
        errorMessage = data.error;
      } else if (data.detail) {
        errorMessage = data.detail;
      } else if (typeof data === 'string') {
        errorMessage = data;
      } else {
        errorMessage = '注册失败，请稍后重试';
      }

      console.error('注册失败:', errorMessage);
      registerError.textContent = errorMessage;
      registerSuccess.textContent = '';
    }
  } catch (err) {
    console.error('注册请求错误:', err);
    registerError.textContent = '注册失败，请稍后重试';
    registerSuccess.textContent = '';
  }
}

// 添加 token 刷新函数
async function refreshToken() {
    try {
        // 获取当前 token
        const currentToken = await getToken();
        if (!currentToken) {
            throw new Error('No token found');
        }

        // 尝试刷新 token
        const response = await fetch(`${API_BASE_URL}/auth/refresh-token/`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${currentToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Token refresh failed');
        }

        const data = await response.json();
        if (data.status === 'success' && data.data && data.data.token) {
            // 保存新的 token
            await chrome.storage.local.set({ token: data.data.token });
            return data.data.token;
        } else {
            throw new Error('Invalid refresh response');
        }
    } catch (error) {
        console.error('Token refresh failed:', error);
        throw error;
    }
}
