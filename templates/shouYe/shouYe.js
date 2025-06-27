// API 地址
const SEARCH_FOOD_URL = '/searchFood';
const GET_SHOPS_URL = '/get_shop';

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    // DOM 元素 - 现在可以安全获取，因为DOM已加载完成
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const foodGrid = document.getElementById('foodGrid');
    const shopsGrid = document.getElementById('shopsGrid');
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    // 检查必要元素是否存在
    if (!searchBtn || !searchInput || !shopsGrid || !navToggle || !navLinks) {
        console.error('某些必要的DOM元素未找到，请检查HTML结构');
        return;
    }

    // 渲染商家列表
    renderShops();

    // 搜索按钮点击事件
    searchBtn.addEventListener('click', searchFood);

    // 输入框回车事件
    searchInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            searchFood();
        }
    });

    // 移动端导航切换
    navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('hidden');
        navLinks.classList.toggle('flex');
    });

    // 初始化导航状态
    initNavigation();
});

// 初始化导航状态 - 处理移动端和桌面端导航显示
function initNavigation() {
    const navLinks = document.querySelector('.nav-links');
    if (window.innerWidth < 768) {
        navLinks.classList.add('hidden');
        navLinks.classList.remove('flex');
    } else {
        navLinks.classList.remove('hidden');
        navLinks.classList.add('flex');
    }
}

// 监听窗口大小变化，调整导航栏显示
window.addEventListener('resize', initNavigation);

// 获取商家数据并渲染
async function renderShops() {
    try {
        const shopsGrid = document.getElementById('shopsGrid');
        if (!shopsGrid) return;

        shopsGrid.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>加载商家列表...</p>
            </div>
        `;

        const response = await fetch(GET_SHOPS_URL);
        if (!response.ok) {
            throw new Error('获取商家数据失败');
        }

        const data = await response.json();
        const shops = data.shops || [];

        if (shops.length === 0) {
            shopsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-store"></i>
                    <p>暂无商家信息</p>
                </div>
            `;
            return;
        }

        shopsGrid.innerHTML = '';
        shops.forEach(shop => {
            const shopCard = createShopCard(shop);
            shopsGrid.appendChild(shopCard);
        });

    } catch (error) {
        console.error('渲染商家列表出错:', error);
        const shopsGrid = document.getElementById('shopsGrid');
        if (shopsGrid) {
            shopsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>加载商家列表失败，请稍后重试</p>
                </div>
            `;
        }
    }
}

// 创建商家卡片
function createShopCard(shop) {
    const card = document.createElement('div');
    card.className = 'shop-card';
    card.innerHTML = `
        <a href="dianCan/${shop.merId}" class="block">
            <img src="${shop.imageUrl || 'https://picsum.photos/600/400?random=' + shop.merId}" alt="${shop.shopName}" class="shop-image">
            <div class="shop-content">
                <h3 class="shop-name">${shop.shopName}</h3>
                <div class="shop-meta">
                    <span class="shop-rating">${shop.rating || '4.5'} 评分</span>
                    <span class="shop-delivery">¥${shop.deliveryFee || 0} 配送</span>
                </div>
                <p class="shop-address text-gray-500 text-sm">${shop.address || '未知地址'}</p>
            </div>
        </a>
    `;
    return card;
}

// 搜索功能
function searchFood() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    const query = searchInput.value.trim();
    if (!query) return;

    // 跳转到searchResults.html页面，并传递搜索关键词
    window.location.href = `searchResults?q=${encodeURIComponent(query)}`;
}

// 创建菜品卡片
function createFoodCard(food) {
    const card = document.createElement('div');
    card.className = 'food-card';
    card.innerHTML = `
        <a href="#" class="block">
            <img src="${food.imageUrl || 'https://picsum.photos/400/300?random=' + food.foodId}" alt="${food.foodName}" class="food-image">
            <div class="food-content">
                <h3 class="food-name">${food.foodName}</h3>
                <p class="food-category">${food.leiXing || '未知分类'}</p>
                <p class="food-price">¥${food.price}</p>
            </div>
        </a>
    `;
    return card;
}