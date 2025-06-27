package peiSong

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"github.com/gin-contrib/sessions"
	"net/http"
	"shiZhan/structs"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

const (
	heartbeatMessage  = `pong`           // 心跳消息的内容
	heartbeatInterval = 10 * time.Second // 心跳间隔
)

func Run(ginserve *gin.Engine, chanOrderPei <-chan structs.OrderPei, db *sql.DB) {
	ginserve.Static("/templates/peiSong", "./templates/peiSong")
	ginserve.LoadHTMLGlob("templates/**/*")
	var upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
	ginserve.GET("/peiSong", func(c *gin.Context) {
		session := sessions.Default(c)
		deId := session.Get("deId")
		if deId == nil {
			c.HTML(http.StatusOK, "peiSong_err.html", gin.H{})
			return
		}
		c.HTML(http.StatusOK, "peiSong.html", gin.H{
			"deId": deId,
		})
	})
	ginserve.GET("/peiSongMessage", func(c *gin.Context) {
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			http.NotFound(c.Writer, c.Request)
			return
		}
		fmt.Println("WebSocket connection established")
		handleWebSocket(chanOrderPei, conn, db) // 传递请求上下文和连接
	})
}

func handleWebSocket(chanOrderPei <-chan structs.OrderPei, conn *websocket.Conn, db *sql.DB) {
	defer conn.Close()
	ticker := time.NewTicker(heartbeatInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if err := conn.WriteMessage(websocket.TextMessage, []byte(heartbeatMessage)); err != nil {
				fmt.Println("Error sending heartbeat:", err)
				return
			}

		case order, ok := <-chanOrderPei:
			if !ok {
				fmt.Println("orders channel closed")
				return
			}
			fmt.Println("Received order:", order)
			if err := conn.WriteJSON(order); err != nil {
				fmt.Println("Error writing to WebSocket:", err)
				return
			}
		default:
			_, message, err := conn.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					fmt.Println("Error 1:", err)
				}
				break
			}
			if string(message) == "ping" {
				continue
			}
			var request map[string]interface{}
			err = json.Unmarshal(message, &request)
			if err != nil {
				fmt.Println("Error 2:", err)
				continue
			}
			fmt.Println("猜的:", request)
			if action, ok := request["action"].(string); ok && action == "qiangDan" {
				orderIdFloat, ok := request["orderId"].(float64)
				orderId := int(orderIdFloat)
				//获取类型有问题(大概
				deIdFloat, _ := request["deId"].(string)
				deId, _ := strconv.Atoi(deIdFloat)
				fmt.Println("这里deId:", deId)
				if ok {
					fmt.Println("测试2")
					result, success := handleQiangDan(orderId, deId, db)
					response := map[string]interface{}{
						"action":  "qiangDanResult",
						"success": success,
						"message": result,
					}
					if err := conn.WriteJSON(response); err != nil {
						fmt.Println("Error sending qiangDan result:", err)
						return
					}
				}
			}
		}
	}
}
func handleQiangDan(orderId int, deId int, db *sql.DB) (string, bool) {
	// 这里可以实现具体的抢单逻辑，如检查订单是否可抢、更新订单状态等
	var status string
	err := db.QueryRow("select status from orderfrom where orderId = ?", orderId).Scan(&status)
	if err != nil {
		fmt.Println("Error:", err)
	}
	if status == "配送中" {
		return "抢单失败", false
	}
	_, err = db.Exec("update orderfrom set status=? where orderId=?", "配送中", orderId)
	if err != nil {
		fmt.Println("Error:", err)
	}
	_, err = db.Exec("update orderfrom set deId=? where orderId=?", deId, orderId)
	if err != nil {
		fmt.Println("Error:", err)
	}
	return "抢单成功", true
}
