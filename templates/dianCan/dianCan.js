const cart = [];
document.addEventListener("DOMContentLoaded", function () {
    // 从全局变量中获取 JSON 数据
    const jsonData = window.jsonData;
    if (jsonData && jsonData.menus && jsonData.LeiXings) {
        console.log(jsonData);
        // 调用渲染函数
        renderMenus(jsonData.menus);
        renderLeiXings(jsonData.LeiXings);
    } else {
        console.error("数据获取失败，请检查数据是否正确");
    }

    const clearCartButton = document.getElementById('clear-cart');
    if (clearCartButton) {
        clearCartButton.addEventListener('click', clearCart);
    }

    // 渲染购买按钮
    renderBuyButton();
});

// 渲染分类信息
function renderLeiXings(leixings) {
    const ul = document.getElementById('leixings');
    if (ul) {
        leixings.forEach(leixing => {
            const li = document.createElement('li');
            li.textContent = leixing;
            ul.appendChild(li);
        });
    }
}

// 渲染菜单信息
function renderMenus(menus) {
    const ul = document.getElementById('menus');
    if (ul) {
        menus.forEach(menu => {
            const li = document.createElement('li');
            const table = document.createElement('table');
            const row = document.createElement('tr');
            const imageCell = document.createElement('td');
            const shopNameCell = document.createElement('td');
            const priceCell = document.createElement('td');
            const leiXingsCell = document.createElement('td');
            const quantityCell = document.createElement('td');

            // 创建图片元素
            const img = document.createElement('img');
            img.src = menu.imageUrl;
            img.alt = menu.foodName;
            img.style.width = '100px'; // 可以根据需要调整图片宽度
            imageCell.appendChild(img);

            shopNameCell.textContent = menu.foodName;
            priceCell.textContent = menu.price;
            leiXingsCell.textContent = menu.leiXing;

            // 创建数量相关元素
            const decreaseButton = document.createElement('button');
            decreaseButton.textContent = "-";
            decreaseButton.addEventListener('click', function () {
                const quantityElement = this.nextElementSibling;
                let quantity = parseInt(quantityElement.textContent);
                if (quantity > 0) {
                    quantity--;
                    quantityElement.textContent = quantity;
                    updateCart(menu, -1);
                }
            });

            const quantity = document.createElement('span');
            quantity.textContent = "0";

            const increaseButton = document.createElement('button');
            increaseButton.textContent = "+";
            increaseButton.addEventListener('click', function () {
                const quantityElement = this.previousElementSibling;
                let quantity = parseInt(quantityElement.textContent);
                quantity++;
                quantityElement.textContent = quantity;
                updateCart(menu, 1);
            });

            quantityCell.appendChild(decreaseButton);
            quantityCell.appendChild(quantity);
            quantityCell.appendChild(increaseButton);

            row.appendChild(imageCell);
            row.appendChild(shopNameCell);
            row.appendChild(priceCell);
            row.appendChild(leiXingsCell);
            row.appendChild(quantityCell);

            table.appendChild(row);
            li.appendChild(table);
            ul.appendChild(li);
        });
    }
}

function updateCart(menu, change) {
    const existingItem = cart.find(item => item.foodName === menu.foodName);
    if (existingItem) {
        existingItem.quantity += change;
        if (existingItem.quantity === 0) {
            const index = cart.indexOf(existingItem);
            cart.splice(index, 1);
        }
    } else if (change > 0) {
        cart.push({ ...menu, quantity: change });
    }
    renderCart();
}

function renderCart() {
    const cartItemsList = document.getElementById('cart-items');
    const cartTotalElement = document.getElementById('cart-total');
    if (cartItemsList && cartTotalElement) {
        const fragment = document.createDocumentFragment();
        let total = 0;
        cart.forEach(item => {
            const li = document.createElement('li');
            const name = document.createElement('span');
            name.textContent = `${item.foodName} x ${item.quantity}`;
            const itemTotal = parseFloat(item.price) * item.quantity;
            const price = document.createElement('span');
            price.textContent = `${itemTotal.toFixed(2)} 元`;
            li.appendChild(name);
            li.appendChild(price);
            fragment.appendChild(li);
            total += itemTotal;
        });
        cartItemsList.innerHTML = '';
        cartItemsList.appendChild(fragment);
        cartTotalElement.textContent = `总价: ${total.toFixed(2)} 元`;
    }
}

function clearCart() {
    cart.length = 0;
    const quantitySpans = document.querySelectorAll('#menus span');
    quantitySpans.forEach(span => {
        if (span.textContent.match(/^\d+$/)) {
            span.textContent = '0';
        }
    });
    renderCart();
}

function renderBuyButton() {
    const buyButton = document.createElement('button');
    buyButton.textContent = '购买';
    buyButton.addEventListener('click', function () {
        const merId=getParameterByName('dianCan',null)
        sessionStorage.setItem('cartData', JSON.stringify(cart));
        sessionStorage.setItem('merId', JSON.stringify(merId));
        window.location.href = '/gouMai';
    });
    const cartContainer = document.getElementById('shopping-cart');
    const cartTotalElement = document.getElementById('cart-total');
    if (!cartContainer) {
        console.error("未找到 id 为 'shopping-cart' 的元素");
        return;
    }
    if (!cartTotalElement) {
        console.error("未找到 id 为 'cart-total' 的元素");
        return;
    }
    cartContainer.insertBefore(buyButton, cartTotalElement.nextSibling);
}
function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    // 先尝试从查询参数中获取
    name = name.replace(/[\[\]]/g, '\\$&');
    const queryRegex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
    const queryResults = queryRegex.exec(url);
    if (queryResults) {
        if (!queryResults[2]) return null;
        const paramValue = decodeURIComponent(queryResults[2].replace(/\+/g, ' '));
        const intValue = parseInt(paramValue, 10);
        return isNaN(intValue)? null : intValue;
    }

    // 如果查询参数中没有找到，尝试从路径参数中获取
    const pathRegex = new RegExp('/' + name + '/([^/?#]+)');
    const pathResults = pathRegex.exec(url);
    if (pathResults) {
        const paramValue = decodeURIComponent(pathResults[1].replace(/\+/g, ' '));
        const intValue = parseInt(paramValue, 10);
        return isNaN(intValue)? null : intValue;
    }

    return null;
}