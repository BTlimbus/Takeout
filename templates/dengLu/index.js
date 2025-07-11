const DATA_CATEGORIES = {
    ACCOUNT_SENSITIVE: ['authToken', 'userID', 'role', 'merId','deId','username']
};
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const loginButton = document.getElementById('loginButton');
    const errorMessage = document.getElementById('errorMessage');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // 收集表单数据
        const formData = new FormData(this);
        const credentials = Object.fromEntries(formData.entries());

        // 显示加载状态
        const originalText = loginButton.innerHTML;
        loginButton.disabled = true;
        loginButton.innerHTML = '<span class="loading"><span class="spinner"></span> 登录中...</span>';
        errorMessage.style.display = 'none';

        try {
            // 使用Fetch API发送登录请求
            const response = await fetch('/app/art', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });

            // 处理响应
            const data = await response.json();

            if (data.status === 'success') {
                //清除原有数据
                clearLocalStorageOnAccountSwitch()
                // 存储JWT到localStorage
                localStorage.setItem('authToken', data.token);
                const jsonPayload = parseJwt(data.token);
                console.log(jsonPayload)
                localStorage.setItem('userId', jsonPayload.userId);
                localStorage.setItem('username', jsonPayload.username);
                localStorage.setItem('role', jsonPayload.role);
                localStorage.setItem('merId', jsonPayload.merId);
                localStorage.setItem('deId', jsonPayload.deId);
                // 重定向到首页
                window.location.href = '/';
            } else {
                // 显示错误信息
                errorMessage.textContent = data.message;
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            // 网络错误或其他异常
            console.error('登录请求失败:', error);
            errorMessage.textContent = '网络连接失败，请重试';
            errorMessage.style.display = 'block';
        } finally {
            // 恢复按钮状态
            loginButton.disabled = false;
            loginButton.innerHTML = originalText;
        }
    });
});
//解析jwt获取用户数据
function parseJwt(token) {
    if (!token) return null;

    try {
        // JWT由三部分组成：header.payload.signature
        const parts = token.split('.');
        if (parts.length !== 3) {
            console.error('无效的JWT格式');
            return null;
        }

        // 解析payload部分（base64解码）
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('解析JWT失败:', error);
        return null;
    }
}
//登录账号时清理原有的localStorage
function clearLocalStorageOnAccountSwitch() {
    DATA_CATEGORIES.ACCOUNT_SENSITIVE.forEach(key => {
        localStorage.removeItem(key);
    });}