package websockets

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/dgrijalva/jwt-go"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"log"
	"net/http"
	"shiZhan/dengLu"
	"shiZhan/structs"
	"sync"
	"time"
)

// 消息结构定义
type Message struct {
	Topic   string      `json:"topic"`
	Payload interface{} `json:"payload"`
}
type OrderResult struct {
	Success  bool   `json:"success"`
	OrderId  int    `json:"orderId"`
	Message  string `json:"message"`
	Status   string `json:"status"`
	CreateAt string `json:"createAt"`
}

// 包级变量存储WebSocket状态
var (
	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true // 生产环境需修改为安全的来源检查
		},
	}
	clients          = make(map[*websocket.Conn]bool)            // 所有客户端连接
	topicSubscribers = make(map[string]map[*websocket.Conn]bool) // 主题订阅映射
	userConnections  = make(map[int]map[*websocket.Conn]bool)    // 客户连接映射（key: userId）
	merConnections   = make(map[int]map[*websocket.Conn]bool)    // 商家连接映射（key: merId）
	deConnections    = make(map[int]map[*websocket.Conn]bool)

	// 并发控制锁（一一对应）
	clientsLock  sync.RWMutex // 保护 clients
	topicLock    sync.RWMutex // 保护 topicSubscribers
	userLock     sync.RWMutex // 保护 userConnections
	merchantLock sync.RWMutex // 保护 merConnections（关键修正）
	deLock       sync.RWMutex // 保护 deConnections
)

// Run 函数将WebSocket功能注册到Gin引擎
func Run(ginEngine *gin.Engine, db *sql.DB, orders chan structs.OrderDate, orderPeis chan structs.OrderPei) {
	ginEngine.Static("/templates/global_websocket", "./templates/global_websocket")
	ginEngine.GET("/ws", func(c *gin.Context) {
		handleWebSocket(c, db, orders, orderPeis)
	})
	fmt.Println("WebSocket服务已启动")
	// 启动全局唯一的订单处理协程
	go globalHandleOrders(orders, db)
	go globalHandleOrderPei(orderPeis)
}

// globalHandleOrders 全局唯一的订单处理协程，统一分发所有订单
func globalHandleOrders(orders chan structs.OrderDate, db *sql.DB) {
	for order := range orders {
		// 1. 更新订单状态为“商家已接单”
		_, err := db.Exec("UPDATE orderfrom SET status=? WHERE orderId=?", "商家已接单", order.OrderId)
		if err != nil {
			fmt.Printf("更新订单状态失败 (OrderId=%d): %v\n", order.OrderId, err)
		}
		// 2. 推送订单给对应商家
		pushOrderToMerchant(order)
	}
}
func globalHandleOrderPei(orderPeis chan structs.OrderPei) {
	for orderPei := range orderPeis {
		resp := Message{
			Topic:   "forOrderPei",
			Payload: orderPei,
		}
		respJson, err := json.Marshal(resp)
		if err != nil {
			fmt.Println("发给前端配送员的订单序列化失败")
			return
		}
		fmt.Println(string(respJson))
		deLock.RLock()
		for deId, connection := range deConnections {
			fmt.Println("给配送员发消息", deId)
			for conn := range connection {
				err = conn.WriteMessage(websocket.TextMessage, respJson)
				if err != nil {
					return
				}
			}
		}
		deLock.RUnlock()
	}
}

// handleWebSocket 处理WebSocket连接请求
func handleWebSocket(c *gin.Context, db *sql.DB, orders chan structs.OrderDate, orderPei chan structs.OrderPei) {
	// 获取并验证token
	token := c.Query("token")
	if token == "" {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}
	claims, err := validateToken(token)
	if err != nil {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	// 升级HTTP连接为WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("WebSocket升级失败:", err)
		return
	}

	// 区分连接类型（商家/用户）
	isMerchant := claims.MerId > 0
	isDe := claims.DeId > 0
	connID := claims.UserId

	// 连接关闭时的清理逻辑（核心修正：按类型清理）
	defer func() {
		conn.Close() // 关闭WebSocket连接
		if isMerchant {
			// 清理商家连接
			merchantLock.Lock()
			if connections, exists := merConnections[claims.MerId]; exists {
				delete(connections, conn)
			}
			merchantLock.Unlock()
		} else if isDe {
			deLock.Lock()
			if connections, exists := deConnections[claims.DeId]; exists {
				delete(connections, conn)
			}

		} else {
			// 清理用户连接
			userLock.Lock()
			if connections, exists := userConnections[connID]; exists {
				delete(connections, conn)
				if len(connections) == 0 {
					delete(userConnections, connID) // 无连接时删除用户记录
				}
			}
			userLock.Unlock()
		}
		// 从全局客户端和订阅中移除
		clientsLock.Lock()
		delete(clients, conn)
		clientsLock.Unlock()
		topicLock.Lock()
		for topic := range topicSubscribers {
			delete(topicSubscribers[topic], conn)
		}
		topicLock.Unlock()
	}()

	// 添加连接到对应映射（核心修正：锁匹配）
	if isMerchant {
		// 商家连接：用 merchantLock 保护 merConnections
		merchantLock.Lock()
		if _, exists := merConnections[claims.MerId]; !exists {
			merConnections[claims.MerId] = make(map[*websocket.Conn]bool)
		}
		merConnections[claims.MerId][conn] = true
		merchantLock.Unlock()
	} else if isDe {
		deLock.Lock()
		if _, exists := deConnections[claims.DeId]; !exists {
			deConnections[claims.DeId] = make(map[*websocket.Conn]bool)
		}
		deConnections[claims.DeId][conn] = true
		deLock.Unlock()
	} else {
		// 用户连接：用 userLock 保护 userConnections
		userLock.Lock()
		if _, exists := userConnections[claims.UserId]; !exists {
			userConnections[claims.UserId] = make(map[*websocket.Conn]bool)
		}
		userConnections[claims.UserId][conn] = true
		userLock.Unlock()
	}
	// 添加到全局客户端列表
	clientsLock.Lock()
	clients[conn] = true
	clientsLock.Unlock()

	fmt.Printf("新WebSocket连接（商家: %v, ID: %d）\n", isMerchant, connID)

	// 消息处理循环
	heartbeatInterval := 30 * time.Second
	heartbeatMessage := `{"topic":"heartbeat","payload":"pong"}`
	ticker := time.NewTicker(heartbeatInterval)
	defer ticker.Stop()

	for {
		select {
		// 处理客户端消息
		case <-time.After(0):
			_, message, err := conn.ReadMessage()
			if err != nil {
				fmt.Printf("客户端断开连接（ID: %d）: %v\n", connID, err)
				return
			}
			var msg Message
			if err := json.Unmarshal(message, &msg); err != nil {
				fmt.Println("消息解析失败:", err)
				continue
			}
			// 按主题处理消息
			switch msg.Topic {
			case "subscribe":
				handleSubscription(conn, msg)
			case "submitOrder":
				submitOrder(conn, msg.Payload, db, orders)
			case "orderPei":
				ordersPei(conn, msg.Payload, orderPei)
			case "requestMerchantStatus":
				handleMerchantStatus(msg, db, "在线")
			case "closeMerchantStatus":
				handleMerchantStatus(msg, db, "离线")
			}
			//broadcastMessageByTopic(msg)

		// 处理心跳
		case <-ticker.C:
			if err := conn.WriteMessage(websocket.TextMessage, []byte(heartbeatMessage)); err != nil {
				fmt.Printf("心跳发送失败（ID: %d）: %v\n", connID, err)
				return
			}
		}
	}
}
func ordersPei(conn *websocket.Conn, payload interface{}, orderPei chan structs.OrderPei) {
	payloadBytes, _ := json.Marshal(payload)
	var payloadString structs.OrderDate
	var orderDate structs.OrderPei
	if err := json.Unmarshal(payloadBytes, &payloadString); err != nil {
		sendErrorResponse(conn, "订单格式错误")
		return
	}
	orderDate.OrderId = payloadString.OrderId
	orderDate.MerId = payloadString.MerId
	orderDate.UserName = payloadString.UserName
	orderPei <- orderDate
}

// handleSubscription 处理主题订阅
func handleSubscription(conn *websocket.Conn, msg Message) {
	if payload, ok := msg.Payload.(map[string]interface{}); ok {
		if subTopic, ok := payload["topic"].(string); ok {
			topicLock.Lock()
			if _, exists := topicSubscribers[subTopic]; !exists {
				topicSubscribers[subTopic] = make(map[*websocket.Conn]bool)
			}
			topicSubscribers[subTopic][conn] = true
			topicLock.Unlock()
			sendToClient(conn, Message{
				Topic: "subscription",
				Payload: map[string]string{
					"status":  "success",
					"topic":   subTopic,
					"message": "已订阅",
				},
			})
		}
	}
}

// handleMerchantStatus 处理商家状态更新
func handleMerchantStatus(msg Message, db *sql.DB, status string) {
	if payload, ok := msg.Payload.(map[string]interface{}); ok {
		merId, ok := payload["merId"].(float64) // JSON数字默认float64
		if !ok {
			fmt.Println("商家ID格式错误")
			return
		}
		_, err := db.Exec("UPDATE merchant SET status = ? WHERE merId = ?", status, int(merId))
		if err != nil {
			fmt.Println("更新商家状态失败:", err)
		}
	}
}

// pushOrderToMerchant 推送订单给商家的所有在线连接（核心修正）
func pushOrderToMerchant(order structs.OrderDate) {
	// 准备推送消息
	resp := Message{
		Topic:   "newOrder",
		Payload: order,
	}
	respBytes, err := json.Marshal(resp)
	if err != nil {
		fmt.Printf("订单序列化失败 (OrderId=%d): %v\n", order.OrderId, err)
		return
	}

	// 读取商家连接（用 merchantLock 读锁）
	merchantLock.RLock()
	connections, exists := merConnections[order.MerId]
	merchantLock.RUnlock() // 尽早释放读锁

	if !exists {
		fmt.Printf("商家无在线连接 (MerId=%d, OrderId=%d)\n", order.MerId, order.OrderId)
		return
	}

	// 推送消息到所有连接（核心修正：错误处理）
	for conn := range connections {
		if err := conn.WriteMessage(websocket.TextMessage, respBytes); err != nil {
			fmt.Printf("推送失败 (MerId=%d, OrderId=%d): %v\n", order.MerId, order.OrderId, err)
			continue // 继续处理其他连接，不终止
		}
	}
	fmt.Printf("订单推送成功 (MerId=%d, OrderId=%d)\n", order.MerId, order.OrderId)
}

// submitOrder 处理用户提交的订单
func submitOrder(conn *websocket.Conn, payload interface{}, db *sql.DB, orders chan<- structs.OrderDate) {
	payloadBytes, _ := json.Marshal(payload)
	var orderPayload structs.OrderDate
	if err := json.Unmarshal(payloadBytes, &orderPayload); err != nil {
		sendErrorResponse(conn, "订单格式错误")
		return
	}
	// 时间转换与数据库操作（保持原逻辑）
	orderPayload.Status = "已支付"
	mysqlTime, _ := convertToMySQLDatetime(orderPayload.Time)
	orderPayload.Time = mysqlTime
	result, err := db.Exec("insert into orderfrom(userId,userName,merId,location,prices,time,status) values(?,?,?,?,?,?,?)",
		orderPayload.UserId, orderPayload.UserName, orderPayload.MerId, orderPayload.Location, orderPayload.Prices, orderPayload.Time, orderPayload.Status)
	if err != nil {
		sendErrorResponse(conn, "订单保存失败")
		return
	}
	// 获取订单ID
	orderId, _ := result.LastInsertId()
	orderPayload.OrderId = int(orderId)
	// 保存订单项
	for _, item := range orderPayload.Items {
		_, err := db.Exec("insert into orderItem(orderId,foodId,quantity) values(?,?,?)", orderPayload.OrderId, item.FoodId, item.Quantity)
		if err != nil {
			sendErrorResponse(conn, "订单项保存失败")
			return
		}
	}
	// 发送到订单通道
	orders <- orderPayload
	sendToClient(conn, Message{
		Topic: "orderResult",
		Payload: OrderResult{
			Success:  true,
			OrderId:  orderPayload.OrderId,
			Message:  "订单创建成功",
			CreateAt: time.Now().Format(time.RFC3339),
		},
	})
}

// 其他辅助函数（sendToClient、sendToUser、validateToken等保持不变）
func sendToClient(conn *websocket.Conn, msg Message) {
	message, err := json.Marshal(msg)
	if err != nil {
		log.Println("消息序列化失败:", err)
		return
	}
	if err := conn.WriteMessage(websocket.TextMessage, message); err != nil {
		log.Println("单播失败:", err)
		clientsLock.Lock()
		delete(clients, conn)
		clientsLock.Unlock()
	}
}

func sendToUser(claims *dengLu.Claims, msg Message) {
	userLock.RLock()
	defer userLock.RUnlock()
	if connections, exists := userConnections[claims.UserId]; exists {
		for conn := range connections {
			sendToClient(conn, msg)
		}
	}
}

func validateToken(tokenStr string) (*dengLu.Claims, error) {
	claims := &dengLu.Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("无效签名方法: %v", token.Header["alg"])
		}
		return dengLu.JwtKey, nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("无效令牌")
	}
	return claims, nil
}

func sendErrorResponse(conn *websocket.Conn, message string) {
	resp, _ := json.Marshal(Message{
		Topic:   "error",
		Payload: map[string]string{"message": message},
	})
	conn.WriteMessage(websocket.TextMessage, resp)
}

func convertToMySQLDatetime(isoTime string) (string, error) {
	t, err := time.Parse(time.RFC3339, isoTime)
	if err != nil {
		return "", err
	}
	return t.Format("2006-01-02 15:04:05"), nil
}

// broadcastMessageByTopic 按主题广播消息
func broadcastMessageByTopic(msg Message) {
	message, err := json.Marshal(msg)
	if err != nil {
		log.Println("消息序列化失败:", err)
		return
	}

	// 1. 先检查主题订阅者（读操作，用读锁）
	topicLock.RLock() // 读锁
	subscribers, hasSubscribers := topicSubscribers[msg.Topic]
	topicLock.RUnlock() // 释放读锁（关键修正：用 RUnlock() 而非 Unlock()）

	if hasSubscribers {
		// 向订阅者广播
		topicLock.RLock() // 再次获取读锁遍历订阅者
		for conn := range subscribers {
			if err := conn.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Printf("主题广播失败 (Topic=%s): %v\n", msg.Topic, err)
				// 异步清理无效连接
				go func(c *websocket.Conn) {
					topicLock.Lock() // 写锁（修改订阅者列表）
					delete(topicSubscribers[msg.Topic], c)
					topicLock.Unlock() // 释放写锁
				}(conn)
			}
		}
		topicLock.RUnlock() // 释放读锁（关键修正）
		return
	}

	// 2. 无主题订阅者，全局广播（读操作，用读锁）
	clientsLock.RLock() // 读锁（遍历 clients）
	for conn := range clients {
		if err := conn.WriteMessage(websocket.TextMessage, message); err != nil {
			log.Printf("全局广播失败: %v\n", err)
			// 异步清理无效连接
			go func(c *websocket.Conn) {
				clientsLock.Lock() // 写锁（修改 clients）
				delete(clients, c)
				clientsLock.Unlock() // 释放写锁
			}(conn)
		}
	}
	clientsLock.RUnlock() // 释放读锁（关键修正）
}
