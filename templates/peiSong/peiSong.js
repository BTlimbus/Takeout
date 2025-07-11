let ws = null;
let heartbeatInterval = 10000; // 每10秒发送一次心跳
let heartbeatTimer; // 用于心跳的定时器

document.addEventListener('DOMContentLoaded', function() {
    const wsChannel=new BroadcastChannel('wsChannel-channel');
    let connectionEstablished=false;
    wsChannel.onmessage=(event) => {
        const data=event.data;
        if (data.type === 'connection-status'&&data.status==='connected') {
            console.log(`[webSocket]发现其他页面已存在连接(ID: ${data.connectionId})`);
            connectionEstablished = true;
        }
    }
});

// function sendHeartbeat() {
//   if (ws.readyState === WebSocket.OPEN) {
//     ws.send('ping');
//   }
// }
// function connectWebSocket(deId) {
//   // 替换为你的商户ID
//   const url = "ws://localhost:8080/peiSongMessage" ; // 替换为你的服务器地址和端口
//
//   ws = new WebSocket(url);
//
//   ws.onopen = function () {
//     console.log('WebSocket connection established');
//     heartbeatTimer = setInterval(sendHeartbeat, heartbeatInterval); // 启动心跳
//   };
//
//   ws.onmessage = function (event) {
//     if (event.data === 'pong') {
//       // 收到服务器的心跳响应，重置心跳计时器
//       clearInterval(heartbeatTimer);
//       heartbeatTimer = setInterval(sendHeartbeat, heartbeatInterval);
//     } else {
//       const data = JSON.parse(event.data);
//       if (data.action) {
//         // 抢单返回值的处理
//         console.log("这是抢单信息");
//         if (data.success) {
//           alert("抢单成功");
//         } else {
//           alert("手慢无");
//         }
//       } else {
//         const order = data;
//         const messagesDiv = document.getElementById('messages');
//         console.log('Received order:', event.data);
//         const newOrderDiv = document.createElement('div');
//         newOrderDiv.innerHTML = `
//                             <div class="order-card p-4 border border-gray-300 rounded-md mb-4">
//                                 <h3 class="text-lg font-bold">新外卖订单</h3>
//                                 <p><strong>订单号:</strong> ${order.orderId}</p>
//                                 <p><strong>顾客名:</strong> ${order.userName}</p>
//                                 <p><strong>商家 ID:</strong> ${order.merId}</p>
//                                 <button class="close-order bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md">抢单</button>
//                             </div>
//                         `;
//         const closeButton = newOrderDiv.querySelector('.close-order');
//         // 使用闭包保存当前订单信息
//         (function (currentOrder) {
//           closeButton.addEventListener("click", function () {
//             // 构建抢单请求数据
//             const qiangDanData = {
//               action: "qiangDan",
//               orderId: currentOrder.orderId,
//               merId: currentOrder.merId,
//               deId:deId,
//             };
//             // 发送抢单请求
//             if (ws.readyState === WebSocket.OPEN) {
//               try {
//                 ws.send(JSON.stringify(qiangDanData));
//               } catch (error) {
//                 console.error('发送抢单请求时出错:', error);
//               }
//             }
//             // 删除该按钮所在的订单卡片
//             const orderCard = closeButton.closest('.order-card');
//             if (orderCard) {
//               // 兼容旧版浏览器
//               if (orderCard.remove) {
//                 orderCard.remove();
//               } else {
//                 orderCard.parentNode.removeChild(orderCard);
//               }
//             } else {
//               console.log('未找到订单卡片元素');
//             }
//           });
//         })(order);
//         // 将新订单卡片添加到messagesDiv中
//         messagesDiv.appendChild(newOrderDiv);
//       }
//     }
//   };
//
//   ws.onclose = function (event) {
//     console.log('WebSocket connection closed', event);
//     clearInterval(heartbeatTimer); // 清除心跳定时器
//     if (event.wasClean === false || event.code !== 1000) {
//       // 如果是非正常关闭，尝试重连
//       setTimeout(connectWebSocket, 1000); // 延迟1秒后重连
//     }
//   };
//
//   ws.onerror = function (error) {
//     console.error('WebSocket error:', error);
//   };
// }
// // 调用函数以连接WebSocket
// connectWebSocket();