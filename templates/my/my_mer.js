// 后端API地址
const API_URL = '/getMerOrders'; // 订单API
const ADD_FOOD_URL = '/addFood'; // 添加菜品API
const GET_MENU_URL = '/getMerFood'; // 获取菜单API
const DELETE_FOOD_URL = '/deleteFood'; // 删除菜品API
const UPDATE_PROFILE_URL = '/updateMy'; // 所有用户修改信息
const GET_MER_INFO_URL = '/getUser'; // 获取用户信息
// 状态样式映射
const statusClasses = {
    '已下单': 'bg-blue-100 text-blue-800',
    '已接单': 'bg-yellow-100 text-yellow-800',
    '配送中': 'bg-orange-100 text-orange-800',
    '已完成': 'bg-green-100 text-green-800',
    '已取消': 'bg-red-100 text-red-800'
};

// 应用状态管理
const state = {
    orders: [],
    menus: [],
    loading: false,
    error: null,
    activeSection: 'profile-content',
    merchantInfo: null,
    merId: null // 新增：商家ID
};

// DOM元素缓存
const elements = {
    // 导航相关
    navLinks: document.querySelectorAll('.sidebar nav ul li a'),
    contentSections: document.querySelectorAll('.main-content .content-section'),

    // 订单表格相关
    ordersTable: document.getElementById('ordersTable'),
    refreshOrdersBtn: document.getElementById('refreshBtn'),

    // 菜单表格相关
    menuTable: document.getElementById('menuTable'),
    refreshMenuBtn: document.getElementById('refreshMenuBtn'),

    // 表单相关
    addFoodForm: document.querySelector('#menu-content .menu-form form'),
    foodType: document.getElementById('foodType'),
    foodName: document.getElementById('foodName'),
    price: document.getElementById('price'),
    imageUrl: document.getElementById('imageUrl'),

    // 商家信息相关
    merchantInfoDisplay: document.getElementById('merchantInfoDisplay'),
    merchantInfoForm: document.getElementById('merchantInfoForm'),
    displayMerName: document.getElementById('displayMerName'),
    displayUserName: document.getElementById('displayUserName'),
    displayMerType: document.getElementById('displayMerType'),
    editProfileBtn: document.getElementById('editProfileBtn'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    profileForm: document.getElementById('profileForm'),
    profileMerName: document.getElementById('profileMerName'),
    profileUserName: document.getElementById('profileUserName'),
    profileMerType: document.getElementById('profileMerType'),
    saveProfileBtn: document.getElementById('saveProfileBtn'),

    // 侧边栏相关
    sidebarMerName: document.getElementById('sidebarMerName'),
    sidebarMerNameText: document.getElementById('sidebarMerNameText')
};

// 初始化导航功能
function initNavigation() {
    elements.navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('data-target');

            // 更新活动状态
            elements.navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            // 显示对应内容区域
            elements.contentSections.forEach(section => {
                section.classList.remove('active');
            });

            const targetSection = document.getElementById(target);
            if (targetSection) {
                targetSection.classList.add('active');
                state.activeSection = target;

                // 当切换到订单管理时加载订单
                if (target === 'order-content') {
                    fetchOrders();
                }
                // 当切换到菜单管理时加载菜单
                if (target === 'menu-content') {
                    fetchMenus();
                }
                // 当切换到商家信息时确保信息已加载
                if (target === 'profile-content' && !state.merchantInfo) {
                    loadMerchantInfo();
                }
            }
        });
    });

    // 默认显示第一个内容区域
    if (elements.navLinks.length > 0) {
        elements.navLinks[0].click();
    }
}

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
    // 从URL参数中获取merId
    const urlParams = new URLSearchParams(window.location.search);

    // 初始化导航
    initNavigation();

    // 初始化订单模块
    initOrderModule();

    // 初始化菜单模块
    initMenuModule();

    // 初始化菜品添加表单
    initFoodForm();

    // 初始化商家信息表单
    initProfileForm();

    // 加载商家信息
    loadMerchantInfo();

    // 设置编辑和取消按钮事件
    if (elements.editProfileBtn) {
        elements.editProfileBtn.addEventListener('click', toggleEditMode);
    }

    if (elements.cancelEditBtn) {
        elements.cancelEditBtn.addEventListener('click', toggleEditMode);
    }
});

// 加载商家信息
async function loadMerchantInfo() {
    try {
        // 显示加载状态
        elements.displayMerName.textContent = '加载中...';
        elements.displayUserName.textContent = '加载中...';
        elements.displayMerType.textContent = '加载中...';

        // 发送GET请求到后端API，带上merId参数
        const response = await fetch(GET_MER_INFO_URL, {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // 检查HTTP响应状态
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态: ${response.status}`);
        }

        // 解析JSON响应
        const result = await response.json();
        // 处理成功响应
        if (result.success === 'ok' && result.shop) {
            state.merchantInfo = result.shop;
            renderMerchantInfo(result.shop);
        } else {
            console.log('获取商家信息失败:', result.err || '未知错误');
            elements.displayMerName.textContent = '获取失败';
            elements.displayUserName.textContent = '获取失败';
            elements.displayMerType.textContent = '获取失败';
        }
    } catch (error) {
        // 处理网络错误或服务器内部错误
        console.error('获取商家信息时发生错误:', error);
        elements.displayMerName.textContent = '获取失败';
        elements.displayUserName.textContent = '获取失败';
        elements.displayMerType.textContent = '获取失败';
    }
}

// 渲染商家信息
function renderMerchantInfo(info) {
    // 映射商家类型为中文显示
    const merTypeMap = {
        'restaurant': '餐厅',
        'cafe': '咖啡馆',
        'takeout': '外卖',
        'bar': '酒吧',
        'other': '其他',
        '游戏':'游戏'
    };

    // 显示商家信息
    elements.displayMerName.textContent = info.shopName || '-';
    elements.displayUserName.textContent = info.userName || '-';
    elements.displayMerType.textContent = merTypeMap[info.merType] || info.MerType || '-';

    // 更新侧边栏商家名称
    // elements.sidebarMerName.textContent = info.ShopName || '{{.merName}}';
    // elements.sidebarMerNameText.textContent = info.ShopName || '{{.merName}}';

    // 填充表单数据
    if (elements.profileMerName) elements.profileMerName.value = info.ShopName || '';
    if (elements.profileUserName) elements.profileUserName.value = info.UserName || '';
    if (elements.profileMerType) elements.profileMerType.value = info.MerType || 'restaurant';
}

// 切换编辑模式
function toggleEditMode() {
    elements.merchantInfoDisplay.classList.toggle('hidden');
    elements.merchantInfoForm.classList.toggle('hidden');

    // 如果是切换到编辑模式，确保表单数据是最新的
    if (!elements.merchantInfoDisplay.classList.contains('hidden')) {
        renderMerchantInfo(state.merchantInfo);
    }
}

// 新增个人信息表单初始化函数
function initProfileForm() {
    if (!elements.profileForm || !elements.saveProfileBtn) return;

    elements.profileForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // 防止重复提交
        elements.saveProfileBtn.disabled = true;
        elements.saveProfileBtn.innerHTML = '<i class="fa fa-spinner fa-spin mr-1"></i> 保存中...';

        try {
            // 收集表单数据
            const formData = {
                merId: state.merId, // 添加merId到表单数据
                merName: elements.profileMerName.value,
                userName: elements.profileUserName.value,
                merType: elements.profileMerType.value
            };

            // 发送更新请求
            const response = await fetch(UPDATE_PROFILE_URL, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams(formData).toString()
            });

            if (!response.ok) {
                throw new Error(`HTTP错误! 状态: ${response.status}`);
            }

            const result = await response.json();
            if (result.err) {
                throw new Error(result.err);
            }

            showNotification('个人信息更新成功！', 'success');

            // 更新状态
            state.merchantInfo = {
                ...state.merchantInfo,
                ShopName: formData.merName,
                UserName: formData.userName,
                MerType: formData.merType
            };

            // 切换回显示模式
            toggleEditMode();
        } catch (error) {
            console.error('更新个人信息失败:', error);
            showNotification('更新失败: ' + error.message, 'error');
        } finally {
            // 恢复按钮状态
            elements.saveProfileBtn.disabled = false;
            elements.saveProfileBtn.innerHTML = '<i class="fa fa-save"></i> 保存修改';
        }
    });
}

// 初始化订单模块
function initOrderModule() {
    if (!elements.ordersTable || !elements.refreshOrdersBtn) return;

    // 刷新订单按钮事件
    elements.refreshOrdersBtn.addEventListener('click', fetchOrders);
}

// 初始化菜单模块
function initMenuModule() {
    if (!elements.menuTable || !elements.refreshMenuBtn) return;

    // 刷新菜单按钮事件
    elements.refreshMenuBtn.addEventListener('click', fetchMenus);
}

// 初始化菜品添加表单
function initFoodForm() {
    if (!elements.addFoodForm) return;

    // 添加菜品表单提交事件
    elements.addFoodForm.addEventListener('submit', function(event) {
        event.preventDefault();

        // 防止重复提交
        const submitButton = this.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fa fa-spinner fa-spin mr-1"></i> 提交中...';

        // 获取表单数据
        const formData = {
            foodType: elements.foodType.value,
            foodName: elements.foodName.value,
            price: elements.price.value,
            imageUrl: elements.imageUrl.value
        };

        // 验证表单数据
        if (!formData.foodType || !formData.foodName || !formData.price) {
            alert('菜品类型、名称和价格为必填项');
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
            return;
        }

        // 发送 POST 请求
        fetch(ADD_FOOD_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams(formData).toString()
        })
            .then(response => {
                // 恢复按钮状态
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('服务器响应:', data);
                if (data.success) {
                    showNotification('菜品添加成功！', 'success');
                    // 清空表单
                    this.reset();
                    // 刷新菜单列表
                    fetchMenus();
                } else {
                    showNotification('添加失败: ' + (data.message || '未知错误'), 'error');
                }
            })
            .catch(error => {
                console.error('请求出错:', error);
                showNotification('请求出错，请稍后重试。', 'error');
            });
    });
}

// 获取商家订单列表
async function fetchOrders() {
    if (state.loading) return;

    state.loading = true;
    elements.ordersTable.querySelector('tbody').innerHTML = '<tr><td colspan="5" class="text-center">加载中...</td></tr>';

    try {
        // 发送GET请求到后端API
        const response = await fetch(`${API_URL}?merId=${state.merId}`, {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // 检查HTTP响应状态
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态: ${response.status}`);
        }

        // 解析JSON响应
        const result = await response.json();

        // 处理成功响应
        if (result.orders && result.orders.length > 0) {
            state.orders = result.orders;
            renderOrders(result.orders);
        } else {
            state.orders = [];
            renderEmptyOrders();
            console.log('暂无订单数据');
        }
    } catch (error) {
        // 处理网络错误或服务器内部错误
        console.error('获取订单时发生错误:', error);
        state.error = error.message;
        renderErrorState(error.message);
    } finally {
        state.loading = false;
    }
}

// 获取商家菜单列表
async function fetchMenus() {
    if (state.loading) return;

    state.loading = true;
    elements.menuTable.querySelector('tbody').innerHTML = '<tr><td colspan="4" class="text-center">加载中...</td></tr>';

    try {
        // 发送GET请求到后端API
        const response = await fetch(`${GET_MENU_URL}?merId=${state.merId}`, {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // 检查HTTP响应状态
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态: ${response.status}`);
        }

        // 解析JSON响应
        const result = await response.json();
        console.log(result.menus);
        // 处理成功响应
        if (result.menus && result.menus.length > 0) {
            state.menus = result.menus;
            renderMenus(result.menus);
        } else {
            state.menus = [];
            renderEmptyMenus();
            console.log('暂无菜品数据');
        }
    } catch (error) {
        // 处理网络错误或服务器内部错误
        console.error('获取菜单时发生错误:', error);
        renderMenuErrorState(error.message);
    } finally {
        state.loading = false;
    }
}

// 渲染订单列表到表格
function renderOrders(orders) {
    const tbody = elements.ordersTable.querySelector('tbody');
    tbody.innerHTML = '';

    if (orders.length === 0) {
        renderEmptyOrders();
        return;
    }

    orders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.OrderId || order.orderId}</td>
            <td>${order.UserName || order.userName}</td>
            <td>¥${parseFloat(order.Prices || order.prices).toFixed(2)}</td>
            <td>${order.Time || order.time}</td>
            <td>
                <span class="px-2 py-1 rounded-full ${getStatusClass(order.Status || order.status || '已下单')}">
                    ${order.Status || order.status || '已下单'}
                </span>
            </td>
        `;
        tbody.appendChild(row);

        // 添加行点击事件，显示订单详情
        row.addEventListener('click', () => showOrderDetails(order));
    });
}

// 渲染空订单状态
function renderEmptyOrders() {
    const tbody = elements.ordersTable.querySelector('tbody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10">暂无订单</td></tr>';
}

// 渲染订单错误状态
function renderErrorState(message) {
    const tbody = elements.ordersTable.querySelector('tbody');
    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="text-center py-10 text-red-500">
                <i class="fas fa-exclamation-circle mr-2"></i> ${message || '获取订单失败，请稍后重试'}
            </td>
        </tr>
    `;
}

// 渲染菜单列表到表格
function renderMenus(menus) {
    const tbody = elements.menuTable.querySelector('tbody');
    tbody.innerHTML = '';

    if (menus.length === 0) {
        renderEmptyMenus();
        return;
    }

    menus.forEach(menu => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${menu.foodName}</td>
            <td>${menu.leiXing}</td>
            <td>¥${menu.price}</td>
            <td>
                <button class="edit-btn" data-id="${menu.FoodId}">
                    <i class="fas fa-edit"></i> 编辑
                </button>
                <button class="delete-btn" data-id="${menu.FoodId}">
                    <i class="fas fa-trash"></i> 删除
                </button>
            </td>
        `;
        tbody.appendChild(row);

        // 添加编辑按钮事件
        const editBtn = row.querySelector('.edit-btn');
        editBtn.addEventListener('click', () => editFood(menu));

        // 添加删除按钮事件
        const deleteBtn = row.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => deleteFood(menu.foodId));
    });
}

// 渲染空菜单状态
function renderEmptyMenus() {
    const tbody = elements.menuTable.querySelector('tbody');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-10">暂无菜品</td></tr>';
}

// 渲染菜单错误状态
function renderMenuErrorState(message) {
    const tbody = elements.menuTable.querySelector('tbody');
    tbody.innerHTML = `
        <tr>
            <td colspan="4" class="text-center py-10 text-red-500">
                <i class="fas fa-exclamation-circle mr-2"></i> ${message || '获取菜单失败，请稍后重试'}
            </td>
        </tr>
    `;
}

// 获取状态对应的CSS类
function getStatusClass(status) {
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
}

// 显示订单详情
function showOrderDetails(order) {
    let itemsHTML = '';
    const items = order.Items || [];

    items.forEach(item => {
        itemsHTML += `- ${item.FoodName} x ${item.Quantity} - ¥${parseFloat(item.Price).toFixed(2)}\n`;
    });

    alert(`
订单详情:
订单号: ${order.OrderId || order.orderId}
顾客: ${order.UserName || order.userName}
地址: ${order.Location || order.location}
时间: ${order.Time || order.time}
总价: ¥${parseFloat(order.Prices || order.prices).toFixed(2)}
状态: ${order.Status || order.status || '已下单'}

商品明细:
${itemsHTML}
`);
}

// 编辑菜品（示例：填充表单，实际开发中可使用模态框）
function editFood(menu) {
    // 填充表单
    elements.foodType.value = menu.LeiXing;
    elements.foodName.value = menu.FoodName;
    elements.price.value = menu.Price;
    elements.imageUrl.value = menu.ImageUrl;

    // 为表单添加隐藏字段，标记为编辑模式
    let foodIdInput = elements.addFoodForm.querySelector('input[name="foodId"]');
    if (!foodIdInput) {
        foodIdInput = document.createElement('input');
        foodIdInput.type = 'hidden';
        foodIdInput.name = 'foodId';
        elements.addFoodForm.appendChild(foodIdInput);
    }
    foodIdInput.value = menu.FoodId;

    // 修改提交按钮文本
    const submitButton = elements.addFoodForm.querySelector('button[type="submit"]');
    submitButton.innerHTML = '<i class="fas fa-save"></i> 保存修改';
}

// 删除菜品
async function deleteFood(foodId) {
    if (!confirm('确定要删除此菜品吗？')) return;

    try {
        // 发送DELETE请求
        const response = await fetch(`${DELETE_FOOD_URL}/${foodId}?merId=${state.merId}`, {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // 检查HTTP响应状态
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
            showNotification('菜品删除成功！', 'success');
            // 刷新菜单列表
            fetchMenus();
        } else {
            showNotification('删除失败: ' + (data.message || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('删除菜品时发生错误:', error);
        showNotification('请求出错，请稍后重试。', 'error');
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    // 实际开发中可以创建通知组件
    console.log(`${type.toUpperCase()}: ${message}`);

    // 这里简单使用alert模拟通知
    alert(message);
}