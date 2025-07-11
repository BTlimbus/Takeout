let ws = null;
let heartbeatInterval = 10000; // 每10秒发送一次心跳
let heartbeatTimer; // 用于心跳的定时器

document.addEventListener('DOMContentLoaded', function() {
  const wsChannel = new BroadcastChannel('websocket-channel');
  let connectionEstablished = false;

  // 监听其他页面的连接状态
  wsChannel.onmessage = (event) => {
    const data = event.data;

    if (data.type === 'connection-status' && data.status === 'connected') {
      console.log(`[WebSocket] 发现其他页面已有连接 (ID: ${data.connectionId})`);
      connectionEstablished = true;

      // 无需重新连接，直接订阅消息
      window.WebSocketManager.subscribe('merchantStatus', function(data) {
        console.log('商家状态更新:', data);
      });
    }
  };

  // 页面加载时检查是否已有连接
  wsChannel.postMessage('request-connection-status');

  // 短暂延迟后，如果没有收到其他页面的响应，则初始化新连接
  setTimeout(() => {
    if (!connectionEstablished) {
      console.log('[WebSocket] 没有发现活跃连接，创建新连接');

      // 初始化连接并等待成功
      window.WebSocketManager.init()
          .then(() => {
            console.log('[WebSocket] 连接状态:', window.WebSocketManager.ws.readyState);
            const token = localStorage.getItem("authToken");
            const merId = localStorage.getItem("merId");
            console.log(token)
            // 订阅消息
            window.WebSocketManager.subscribe('merchantStatus', function(data) {
              console.log('商家状态更新:', data);
            });
            window.WebSocketManager.subscribe('newOrder', handleNewOrder)
            // 发送请求
          })
          .catch(error => {
            console.error('[WebSocket] 连接失败:', error);
          });
    }
  }, 500);
})

// 处理后端推送的新订单
function handleNewOrder(data) {
    console.log('收到新订单:', data);
    const order = data.payload; // 订单数据在payload中

    // 1. 验证订单数据完整性
    if (!order || !order.orderId) {
        console.error('无效的订单数据:', order);
        return;
    }

    // 2. 渲染订单到页面（示例：添加到订单列表）
    const orderList = document.getElementById('orderList');
    if (!orderList) {
        console.error('未找到订单列表容器');
        return;
    }

    // 3. 创建订单DOM元素
    const orderItem = document.createElement('div');
    orderItem.className = 'order-card';
    orderItem.dataset.orderId = order.orderId; // 存储订单ID用于后续操作

    // 4. 填充订单信息（根据实际字段调整）
    orderItem.innerHTML = `
        <div class="order-header">
            <h3>新订单 #${order.orderId}</h3>
            <span class="order-status">${order.status || '待处理'}</span>
        </div>
        <div class="order-details">
            <p>用户：${order.userName || '未知用户'}</p>
            <p>地址：${order.location || '未填写'}</p>
            <p>时间：${formatTime(order.time) || '未知时间'}</p>
            <p>总金额：¥${order.prices.toFixed(2)}</p>
        </div>
        <div class="order-items">
            <h4>商品列表：</h4>
            <ul>
                ${order.items.map(item => `
                    <li>${item.foodName} × ${item.quantity} - ¥${item.price.toFixed(2)}</li>
                `).join('')}
            </ul>
            <button class="close-order">通知外卖员取餐</button>
        </div>
    `;
    const closeButton = orderItem.querySelector('.close-order');
    closeButton.addEventListener("click",()=>orderPei(order) )
    // 5. 添加到页面（插入到列表顶部，优先展示新订单）
    orderList.insertBefore(orderItem, orderList.firstChild);

    // 6. 播放提示音或显示通知（增强用户体验）
    // playNotificationSound();
    // showToast(`收到新订单 #${order.OrderId}`);
}
function orderPei(order){
    window.WebSocketManager.send({
        topic: 'orderPei', // 自定义消息主题，表示提交订单
        payload:order
    })
}






//辅助功能，看着玩吧
// 格式化时间（将ISO格式转为本地时间）
function formatTime(isoTime) {
    if (!isoTime) return '';
    const date = new Date(isoTime);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}
//
// // 播放提示音
// function playNotificationSound() {
//     const audio = new Audio('/sounds/notification.mp3'); // 替换为你的提示音路径
//     audio.volume = 0.5;
//     audio.play().catch(err => console.log('提示音播放失败:', err));
// }
//
// // 显示 Toast 通知
// function showToast(message) {
//     const toast = document.createElement('div');
//     toast.className = 'toast-notification';
//     toast.textContent = message;
//     document.body.appendChild(toast);
//     setTimeout(() => toast.remove(), 3000); // 3秒后自动消失
// }
//
// // 接单操作（发送WebSocket消息给后端）
// function acceptOrder(orderId) {
//     window.WebSocketManager.send({
//         topic: 'acceptOrder',
//         payload: { orderId: orderId }
//     });
//     // 更新页面状态
//     document.querySelector(`.order-card[data-order-id="${orderId}"] .order-status`).textContent = '已接单';
// }
//
// // 拒单操作
// function rejectOrder(orderId) {
//     window.WebSocketManager.send({
//         topic: 'rejectOrder',
//         payload: { orderId: orderId }
//     });
//     document.querySelector(`.order-card[data-order-id="${orderId}"] .order-status`).textContent = '已拒单';
// }