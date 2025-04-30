async function getCsrfToken() {
    try {
        const response = await fetch('https://www.kxianjunshi.com/api/csrf-token/', {
            credentials: 'include'
        });
        const data = await response.json();
        return data.csrfToken;
    } catch (error) {
        console.error('获取 CSRF token 失败:', error);
        return null;
    }
}

async function sendRequest(url, method = 'GET', data = null) {
    const csrfToken = await getCsrfToken();
    if (!csrfToken) {
        throw new Error('无法获取 CSRF token');
    }

    const headers = {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken
    };

    const options = {
        method,
        headers,
        credentials: 'include'
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(url.replace('http://localhost:8000', 'https://www.kxianjunshi.com'), options);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
} 