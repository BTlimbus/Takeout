// 后端API地址
const API_URL = 'http://127.0.0.1:8080/checkOrder/order';

// 状态样式映射
const statusClasses = {
    '配送中': 'bg-yellow-100 text-yellow-800',
    '已完成': 'bg-green-100 text-green-800',
    '已取消': 'bg-red-100 text-red-800',
    '待取货': 'bg-gray-100 text-gray-800'
};

// 应用状态管理
const state = {
    loading: false,
    error: null,
    orders: []
};

// DOM元素缓存
const elements = {
    ordersTable: document.getElementById('ordersTable'),
    totalCount: document.getElementById('totalCount'),
    completedCount: document.getElementById('completedCount'),
    inProgressCount: document.getElementById('inProgressCount'),
    refreshBtn: document.getElementById('refreshBtn'),
    loadingIndicator: document.getElementById('loadingIndicator')
};

// 从API获取数据
async function fetchData() {
    // 更新状态
    setState({ loading: true, error: null });

    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`HTTP错误! 状态码: ${response.status}`);
        }

        const data = await response.json();
        console.log('获取订单数据成功:', data);

        // 更新状态
        setState({ orders: data, loading: false });

        // 显示成功通知
        showNotification('数据加载成功', 'success');
    } catch (error) {
        console.error('请求出错:', error);

        // 更新状态
        setState({ error: error.message, loading: false });

        // 显示错误通知
        showNotification(`加载失败: ${error.message}`, 'error');
    }
}

// 渲染订单表格
function renderOrders() {
    const { orders, loading, error } = state;

    // 清空表格
    elements.ordersTable.innerHTML = '';

    // 处理加载状态
    if (loading) {
        elements.ordersTable.innerHTML = `
            <tr>
                <td colspan="5" class="py-4 text-center text-gray-500">
                    <i class="fa fa-spinner fa-spin mr-1"></i>加载中...
                </td>
            </tr>
        `;
        return;
    }

    // 处理错误状态
    if (error) {
        elements.ordersTable.innerHTML = `
            <tr>
                <td colspan="5" class="py-4 text-center text-red-500">
                    <i class="fa fa-exclamation-circle mr-1"></i>${error}
                </td>
            </tr>
        `;
        return;
    }

    // 处理空数据
    if (orders.length === 0) {
        elements.ordersTable.innerHTML = `
            <tr>
                <td colspan="5" class="py-4 text-center text-gray-500">
                    暂无订单数据
                </td>
            </tr>
        `;
        return;
    }
    // 渲染订单列表
    orders.forEach(order => {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50 transition-colors';

        row.innerHTML = `
            <td class="py-2 px-4">#${order.orderId}</td>
            <td class="py-2 px-4">${order.merName}</td>
            <td class="py-2 px-4">${order.deName}</td>
            <td class="py-2 px-4">¥${order.prices.toFixed(2)}</td>
            <td class="py-2 px-4">
                <span class="px-2 py-1 rounded-full text-xs font-medium ${statusClasses[order.status] || 'bg-gray-100 text-gray-800'}">
                    ${order.status}
                </span>
            </td>
        `;

        // 添加行点击事件
        row.addEventListener('click', () => handleRowClick(order));

        elements.ordersTable.appendChild(row);
    });
}

// 渲染统计数据
function renderStats() {
    const { orders } = state;

    elements.totalCount.textContent = orders.length;
    elements.completedCount.textContent = orders.filter(o => o.status === '已完成').length;
    elements.inProgressCount.textContent = orders.filter(o => o.status === '配送中').length;
}

// 更新应用状态
function setState(newState) {
    Object.assign(state, newState);
    renderOrders();
    renderStats();
}

// 行点击事件处理
function handleRowClick(order) {
    console.log('点击订单:', order);
    // 这里可以添加订单详情弹窗等功能
}

// 显示通知
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-4 py-2 rounded shadow-lg z-50 transform transition-all duration-300 translate-x-full opacity-0 ${
        type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
                'bg-blue-500 text-white'
    }`;
    notification.textContent = message;

    // 添加到页面
    document.body.appendChild(notification);

    // 显示通知
    setTimeout(() => {
        notification.classList.remove('translate-x-full', 'opacity-0');
    }, 10);

    // 3秒后隐藏
    setTimeout(() => {
        notification.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始加载数据
    fetchData();

    // 绑定刷新按钮事件
    elements.refreshBtn.addEventListener('click', fetchData);

    // 添加自动刷新功能（可选）
    // setInterval(fetchData, 30000); // 每30秒自动刷新
});