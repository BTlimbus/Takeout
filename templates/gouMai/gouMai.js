
document.addEventListener('DOMContentLoaded', function() {
    const wsChannel = new BroadcastChannel('websocket-channel');
    let connectionEstablished = false;
    // 合并消息处理逻辑
    wsChannel.onmessage = (event) => {
        const data = event.data;

        // 1. 处理连接状态消息
        if (data.type === 'connection-status' && data.status === 'connected') {
            console.log(`[WebSocket] 发现其他页面已有连接`);
            connectionEstablished = true;

            // 商家页面：订阅状态更新
            if (localStorage.getItem('merId')) {
                window.WebSocketManager.subscribe('merchantStatus', function(data) {
                    console.log('商家状态更新:', data);
                });
            }
        }

        // 2. 处理连接状态请求
        if (data === 'request-connection-status') {
            // 如果当前页面已有连接，回复连接状态
            wsChannel.postMessage({
                type: 'connection-status',
                status: 'connected',
            });
        }
    };

    // 页面加载时检查是否已有连接
    wsChannel.postMessage('request-connection-status');

    // 延迟后决定是否创建新连接
    setTimeout(() => {
        if (!connectionEstablished) {
            console.log('[WebSocket] 没有发现活跃连接，创建新连接');

            window.WebSocketManager.init()
                .then(() => {
                    console.log('[WebSocket] 连接状态:', window.WebSocketManager.ws.readyState);
                    const token = localStorage.getItem("authToken");
                    console.log('使用Token:', token);

                    // 连接成功后广播状态
                    wsChannel.postMessage({
                        type: 'connection-status',
                        status: 'connected',
                    });
                })
                .catch(error => {
                    console.error('[WebSocket] 连接失败:', error);
                });
        }

        // 无论是否新建连接，都订阅订单结果
        window.WebSocketManager.subscribe('orderResult', (data) => {
            if (data) {
                alert(`订单创建成功！订单ID：${data.payload.OrderId}`);
            } else {
                alert(`订单创建失败：${data.payload.Message}`);
            }
        });
    }, 500);

    // 监听连接断开事件，广播状态
    window.WebSocketManager.onClose = () => {
        connectionEstablished = false;
        wsChannel.postMessage({
            type: 'connection-status',
            status: 'disconnected',
            connectionId: connectionId
        });
    };

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
            const userId=Number(localStorage.getItem('userId'));
// 格式化当前时间
            const time = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            // 这里可以添加将订单信息和表单数据发送到服务器的逻辑，比如使用fetch API
            const orderData = {
                userId: userId,
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
        orderData.time = new Date().toISOString();
            if (window.WebSocketManager && window.WebSocketManager.ws.readyState === WebSocket.OPEN) {
                window.WebSocketManager.send({
                    topic: 'submitOrder', // 自定义消息主题，表示提交订单
                    payload: orderData    // 订单数据
                });

                // 显示加载状态或提示用户
                document.getElementById('submitButton').disabled = true;
                document.getElementById('submitButton').textContent = '提交中...';

                // 监听订单处理结果（假设服务器会返回一个订单状态消息）
                window.WebSocketManager.subscribe('orderStatus', function(response) {
                    if (response.orderId) {
                        // 订单提交成功
                        document.getElementById('orderResult').innerHTML = `
                    <div class="success-message">
                        <h3>订单提交成功！</h3>
                        <p>订单号: ${response.orderId}</p>
                        <p>我们将尽快为您配送</p>
                    </div>
                `;

                        // 清空购物车
                        sessionStorage.removeItem('cartData');
                    } else {
                        // 订单提交失败
                        document.getElementById('orderResult').innerHTML = `
                    <div class="error-message">
                        <h3>订单提交失败</h3>
                        <p>${response.message || '请重试'}</p>
                    </div>
                `;
                    }

                    // 恢复按钮状态
                    document.getElementById('submitButton').disabled = false;
                    document.getElementById('submitButton').textContent = '提交订单';
                });
            }
//         console.log(orderData);
//         // 发送 POST 请求到后端
//         fetch('/gouMai_success', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify(orderData)
//         })
//             .then(response => {
//                 if (!response.ok) {
//                     throw new Error('网络响应不正常');
//                 }
//                 return response.json();
//             })
//             .then(data => {
//                 console.log('订单提交成功:', data);
//                 // 可以在这里添加订单提交成功后的提示信息
//             })
//             .catch(error => {
//                 console.error('订单提交失败:', error);
//                 // 可以在这里添加订单提交失败后的提示信息
//             });
        });
//
//     // 使用完数据后可以选择删除 sessionStorage 中的数据
//     sessionStorage.removeItem('cartData');

    }

});