const cartData = sessionStorage.getItem('cartData');
const merIdStr=sessionStorage.getItem('merId');
merId = parseInt(merIdStr, 10);
if (cartData) {
    const cart = JSON.parse(cartData);
    console.log(cart);
    console.log(typeof merId);
    // 在这里可以根据获取到的购物车数据进行相应的操作
    const orderList = document.getElementById('orderList');
    let totalAmount = 0;

    cart.forEach(item => {
        console.log(typeof item.quantity);
        const orderItem = document.createElement('div');
        orderItem.classList.add('order-item');
        orderItem.innerHTML = `
    <img src="${item.imageUrl}" alt="${item.foodName}" class="order-image">
    <div class="order-details">
      <p>商品名称: ${item.foodName}</p>
      <p>类型: ${item.leiXing}</p>
      <p>价格: ${item.price} 元</p>
      <p>数量: ${item.quantity}</p>
    </div>
  `;
        orderList.appendChild(orderItem);
        totalAmount += parseFloat(item.price) * item.quantity;
    });

    const totalAmountElement = document.getElementById('totalAmount');
    totalAmountElement.textContent = totalAmount.toFixed(2);

    const shippingForm = document.getElementById('shippingForm');
    shippingForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const address = document.getElementById('address').value;
        //获取时间
        const currentDate = new Date();

// 获取年、月、日、时、分、秒
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const hours = String(currentDate.getHours()).padStart(2, '0');
        const minutes = String(currentDate.getMinutes()).padStart(2, '0');
        const seconds = String(currentDate.getSeconds()).padStart(2, '0');

// 格式化当前时间
        const time = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        // 这里可以添加将订单信息和表单数据发送到服务器的逻辑，比如使用fetch API
        const orderData = {
            userName: name,
            location: address,
            merId: merId, // 这里假设 MerId 为 1，你可以根据实际情况修改
            prices: totalAmount,
            time: time,
            items: cart.map(item => ({
                foodId: item.foodId,
                foodName: item.foodName,
                quantity: item.quantity,
                price: item.price
            }))
        };
        // 将当前时间添加到 orderData 中
        // orderData.time = new Date().toISOString();
        console.log(orderData);
        // 发送 POST 请求到后端
        fetch('/gouMai_success', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('网络响应不正常');
                }
                return response.json();
            })
            .then(data => {
                console.log('订单提交成功:', data);
                // 可以在这里添加订单提交成功后的提示信息
            })
            .catch(error => {
                console.error('订单提交失败:', error);
                // 可以在这里添加订单提交失败后的提示信息
            });
    });

    // 使用完数据后可以选择删除 sessionStorage 中的数据
    sessionStorage.removeItem('cartData');
}