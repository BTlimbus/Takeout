(function(window) {
    class WebSocketManager {
        constructor() {
            this.ws = null;
            this.subscribers = new Map();
            this.messageQueue = [];
            this.reconnectTimer = null;
            this.heartbeatTimer = null;
            this.isConnecting = false;
            this.baseUrl = 'ws://127.0.0.1:8080/ws';
        }

        // 初始化连接（返回Promise）
        init() {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                return Promise.resolve(this.ws);
            }

            if (this.isConnecting) {
                return new Promise((resolve) => {
                    // 等待现有连接尝试完成
                    const checkInterval = setInterval(() => {
                        if (!this.isConnecting) {
                            clearInterval(checkInterval);
                            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                                resolve(this.ws);
                            } else {
                                resolve(this.init());
                            }
                        }
                    }, 100);
                });
            }

            this.isConnecting = true;
            this.ws = new WebSocket(`${this.baseUrl}?token=${this.getAuthToken()}`);

            return new Promise((resolve, reject) => {
                this.ws.onopen = () => {
                    this.isConnecting = false;
                    this.connectionId = Date.now().toString(); // 生成唯一连接 ID
                    localStorage.setItem('wsConnectionId', this.connectionId);
                    console.log(`WebSocket 连接已建立 (ID: ${this.connectionId})`);
                    this.startHeartbeat();
                    this.sendQueuedMessages();
                    resolve(this.ws);
                };

                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.topic==="heartbeat"){
                            return
                        }
                        console.log("2",data);
                        this.notifySubscribers(data);
                    } catch (error) {
                        console.error('[WebSocket] 解析消息失败:', error);
                    }
                };

                this.ws.onclose = (event) => {
                    console.log('[WebSocket] 连接已关闭', event.code, event.reason);
                    this.isConnecting = false;
                    this.stopHeartbeat();
                    this.scheduleReconnect();
                };

                this.ws.onerror = (error) => {
                    console.error('[WebSocket] 发生错误:', error);
                    this.isConnecting = false;
                    this.ws.close(); // 触发重连
                    reject(error);
                };
            });
        }

        // 发送消息（自动处理连接状态）
        send(message) {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                try {
                    const messageStr = JSON.stringify(message);
                    this.ws.send(messageStr);
                    console.log('[WebSocket] 消息已发送:', message);
                } catch (error) {
                    console.error('[WebSocket] 发送消息失败:', error);
                    this.messageQueue.push(message);
                    this.scheduleReconnect();
                }
            } else {
                console.warn('[WebSocket] 连接未就绪，消息入队等待:', message);
                this.messageQueue.push(message);

                // 如果未连接，则尝试连接
                if (!this.isConnecting) {
                    this.init().catch(err => {
                        console.error('[WebSocket] 初始化连接失败:', err);
                    });
                }
            }
        }

        // 发送队列中的所有消息
        sendQueuedMessages() {
            if (this.messageQueue.length === 0) return;

            console.log(`[WebSocket] 开始发送队列中的 ${this.messageQueue.length} 条消息`);
            const messages = [...this.messageQueue];
            this.messageQueue = [];

            messages.forEach(msg => {
                this.send(msg);
            });
        }

        // 订阅主题
        subscribe(topic, callback) {
            if (!this.subscribers.has(topic)) {
                this.subscribers.set(topic, new Set());
            }
            this.subscribers.get(topic).add(callback);
            console.log(`[WebSocket] 已订阅主题: ${topic}`);
        }

        // 取消订阅
        unsubscribe(topic, callback) {
            if (this.subscribers.has(topic)) {
                this.subscribers.get(topic).delete(callback);
                console.log(`[WebSocket] 已取消订阅主题: ${topic}`);
            }
        }

        // 通知订阅者
        notifySubscribers(data) {
            const { topic } = data;
            if (this.subscribers.has(topic)) {
                console.log(`[WebSocket] 收到主题消息: ${topic}`);
                this.subscribers.get(topic).forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        console.error(`[WebSocket] 执行订阅回调失败 (${topic}):`, error);
                    }
                });
            } else {
                console.log(`[WebSocket] 收到未订阅主题的消息: ${topic}`);
            }
        }

        // 启动心跳
        startHeartbeat() {
            this.stopHeartbeat();
            this.heartbeatTimer = setInterval(() => {
                this.send({ topic: 'heartbeat' });
            }, 30000); // 30秒一次心跳
        }

        // 停止心跳
        stopHeartbeat() {
            if (this.heartbeatTimer) {
                clearInterval(this.heartbeatTimer);
                this.heartbeatTimer = null;
            }
        }

        // 安排重连
        scheduleReconnect() {
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
            }

            const delay = 5000; // 5秒后重连
            console.log(`[WebSocket] 将在 ${delay/1000} 秒后尝试重连`);
            this.reconnectTimer = setTimeout(() => {
                this.init().catch(err => {
                    console.error('[WebSocket] 重连失败，将再次尝试:', err);
                    this.scheduleReconnect();
                });
            }, delay);
        }

        // 手动关闭连接
        close() {
            console.log('[WebSocket] 手动关闭连接');
            this.stopHeartbeat();
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
            }
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }
        }
        getAuthToken() {
            // 从 localStorage 或 cookie 获取用户认证令牌
            console.log(localStorage.getItem('authToken') || '')
            const token = localStorage.getItem('authToken');
            // 开发环境默认令牌，生产环境移除
            return token || 'valid-token-123';
        }
    }

    // 全局实例
    window.WebSocketManager = new WebSocketManager();
})(window);
