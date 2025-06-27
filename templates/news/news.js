let ws = null;
let heartbeatInterval = 10000; // 每10秒发送一次心跳
let heartbeatTimer; // 用于心跳的定时器

document.addEventListener('DOMContentLoaded', function() {
  var merIdElement = document.getElementById('merId');
  var merId = merIdElement ? merIdElement.textContent : null;
  if (merId) {
    console.log('MerId:', merId);
    connectWebSocket(merId);
  } else {
    console.error('MerId element not found');
  }
});

function sendHeartbeat() {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send('ping'); // 发送心跳消息
  }
}

function connectWebSocket(merId) {
  const url = 'ws://localhost:8080/merchant/' + merId;
  ws = new WebSocket(url);
  ws.withCredentials = true;
  ws.onopen = function() {
    console.log('WebSocket connection established');
    heartbeatTimer = setInterval(sendHeartbeat, heartbeatInterval); // 启动心跳
  };

  ws.onmessage = function(event) {
    if (event.data === 'pong') {
      // 收到服务器的心跳响应，重置心跳计时器
      clearInterval(heartbeatTimer);
      heartbeatTimer = setInterval(sendHeartbeat, heartbeatInterval);
    } else {
      const order = JSON.parse(event.data);
      const messagesDiv = document.getElementById('messages');
      console.log('Received order:', event.data);
      const newOrderDiv = document.createElement('div');
      newOrderDiv.innerHTML = `
        <div class="order-card">
            <h3>新订单通知</h3>
            <p><strong>顾客名:</strong>${order.userName}</p>
            <p><strong>商家 ID:</strong>${order.merId}</p>
            <p><strong>订单内容:</strong></p>
            <ul>
                ${order.items.map(item => `<li>${item.foodName} - ${item.quantity} x $${item.price}</li>`).join('')}
            </ul>
            <button class="close-order">通知外卖员取餐</button>
        </div>
      `;
      const closeButton = newOrderDiv.querySelector('.close-order');
      closeButton.addEventListener("click", function() {
        sendPostRequest(order.orderId,order.userName, order.merId, "http://127.0.0.1:8080/orderPei");
        console.log("测试点"+order.merId);
      });
      // 将新订单卡片添加到messagesDiv中
      messagesDiv.appendChild(newOrderDiv);
    }
  };

  ws.onclose = function(event) {
    console.log('WebSocket connection closed', event);
    clearInterval(heartbeatTimer); // 清除心跳定时器
    if (event.wasClean === false || event.code !== 1000) {
      // 如果是非正常关闭，尝试重连
      setTimeout(() => connectWebSocket(merId), 1000); // 延迟1秒后重连
    }
  };

  ws.onerror = function(error) {
    console.error('WebSocket error:', error);
  };
}

function sendPostRequest(orderId,userName, merId, url) {
  // 创建要发送的数据对象
  const data = {
    orderId: orderId,
    userName: userName,
    merId: merId,
  };

  // 使用fetch发送POST请求
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data) // 将数据对象转换为JSON字符串
  })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json(); // 解析JSON响应
      })
      .then(data => {
        console.log('Success:', data); // 处理响应数据
      })
      .catch((error) => {
        console.error('Error:', error); // 处理错误
      });
}