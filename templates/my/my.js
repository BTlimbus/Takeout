const GET_MER_INFO_URL = '/getUser'; // 获取用户信息
// DOM元素缓存
const elements = {
    // 导航相关
    navLinks: document.querySelectorAll('.sidebar nav ul li a'),
    contentSections: document.querySelectorAll('.main-content .content-section'),

    // 表单相关
    userInfoDisplay: document.getElementById('userInfoDisplay'),
    userInfoForm: document.getElementById('userInfoForm'),
    displayUserName: document.getElementById('displayUserName'),
    displayUserType: document.getElementById('displayUserType'),
    editProfileBtn: document.getElementById('editProfileBtn'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    profileForm: document.getElementById('profileForm'),
    profileUserName: document.getElementById('profileUserName'),
    profileUserType: document.getElementById('profileUserType'),
    saveProfileBtn: document.getElementById('saveProfileBtn'),

    // 侧边栏相关
    sidebarUserName: document.getElementById('sidebarUserName'),
    sidebarUserNameText: document.getElementById('sidebarUserNameText'),
    sidebarUserType: document.getElementById('sidebarUserType'),

    // 注册按钮相关
    deliverymanBtn: document.getElementById('deliveryman'),
    merchantBtn: document.getElementById('merchant'),
    myForm: document.getElementById('myForm'),
    twoForm: document.getElementById('twoForm'),
    quXiaoBtn: document.getElementById('quXiao'),
    quXiao2Btn: document.getElementById('quXiao2')
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
    // 初始化导航
    initNavigation();

    // 初始化用户信息表单
    initProfileForm();

    // 初始化注册按钮事件
    initRegisterButtons();

    // 设置编辑和取消按钮事件
    if (elements.editProfileBtn) {
        elements.editProfileBtn.addEventListener('click', toggleEditMode);
    }

    if (elements.cancelEditBtn) {
        elements.cancelEditBtn.addEventListener('click', toggleEditMode);
    }

    // 加载用户信息
    loadUserInfo();
});

// 加载用户信息
// 假设这是后端提供用户信息的 API 地
function loadUserInfo() {
    // 发送 GET 请求到后端 API
    fetch(GET_MER_INFO_URL, {
        method: 'GET',
        credentials: 'same-origin', // 如果需要携带 cookie 等信息
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            // 检查 HTTP 响应状态
            if (!response.ok) {
                throw new Error(`HTTP 错误! 状态: ${response.status}`);
            }
            // 解析 JSON 响应
            return response.json();
        })
        .then(result => {
            // 处理成功响应
            if (result.success === 'ok' && result.user) {
                const user = result.user;
                const username = user.userName;
                const userType = user.standing;

                elements.displayUserName.textContent = username;
                elements.displayUserType.textContent = userType;

                elements.sidebarUserName.textContent = username;
                elements.sidebarUserNameText.textContent = username;
                elements.sidebarUserType.textContent = userType;

                elements.profileUserName.value = username;
                elements.profileUserType.value = userType;
            } else {
                console.log('获取用户信息失败:', result.err || '未知错误');
                elements.displayUserName.textContent = '获取失败';
                elements.displayUserType.textContent = '获取失败';
            }
        })
        .catch(error => {
            // 处理网络错误或服务器内部错误
            console.error('获取用户信息时发生错误:', error);
            elements.displayUserName.textContent = '获取失败';
            elements.displayUserType.textContent = '获取失败';
        });
}


// 渲染用户信息
function renderUserInfo() {
    loadUserInfo();
}

// 切换编辑模式
function toggleEditMode() {
    elements.userInfoDisplay.classList.toggle('hidden');
    elements.userInfoForm.classList.toggle('hidden');

    // 如果是切换到编辑模式，确保表单数据是最新的
    if (!elements.userInfoDisplay.classList.contains('hidden')) {
        renderUserInfo();
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
                username: elements.profileUserName.value,
                userType: elements.profileUserType.value
            };

            // 这里可以添加发送更新请求到后端的逻辑
            // 示例：
            // const response = await fetch('/updateUserInfo', {
            //     method: 'POST',
            //     credentials: 'same-origin',
            //     headers: {
            //         'Content-Type': 'application/x-www-form-urlencoded'
            //     },
            //     body: new URLSearchParams(formData).toString()
            // });

            // if (!response.ok) {
            //     throw new Error(`HTTP错误! 状态: ${response.status}`);
            // }

            // const result = await response.json();
            // if (result.err) {
            //     throw new Error(result.err);
            // }

            showNotification('个人信息更新成功！', 'success');

            // 更新状态
            // 这里可以更新状态变量

            // 切换回显示模式
            toggleEditMode();
        } catch (error) {
            console.error('更新个人信息失败:', error);
            showNotification('更新失败: ' + error.message, 'error');
        } finally {
            elements.saveProfileBtn.disabled = false;
            elements.saveProfileBtn.innerHTML = '<i class="fas fa-save"></i> 保存修改';
        }
    });
}

// 初始化注册按钮事件
function initRegisterButtons() {
    if (elements.deliverymanBtn) {
        elements.deliverymanBtn.addEventListener('click', function() {
            elements.myForm.style.display = 'block';
        });
    }

    if (elements.merchantBtn) {
        elements.merchantBtn.addEventListener('click', function() {
            elements.twoForm.style.display = 'block';
        });
    }

    if (elements.quXiaoBtn) {
        elements.quXiaoBtn.addEventListener('click', function() {
            elements.myForm.style.display = 'none';
        });
    }

    if (elements.quXiao2Btn) {
        elements.quXiao2Btn.addEventListener('click', function() {
            elements.twoForm.style.display = 'none';
        });
    }
}

// 显示通知
function showNotification(message, type) {
    // 这里可以添加显示通知的逻辑，例如使用弹窗或提示框
    console.log(`${type}: ${message}`);
}