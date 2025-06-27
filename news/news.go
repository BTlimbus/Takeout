package news

import (
	"database/sql"
	"fmt"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"net/http"
	"shiZhan/structs"
	"strconv"
	"time"
)

// 定义心跳消息
const (
	heartbeatMessage  = `pong`           // 心跳消息的内容
	heartbeatInterval = 10 * time.Second // 心跳间隔
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

//
//type OrderPei struct {
//	OrderId  int    `json:"orderId"`
//	UserName string `json:"userName"`
//	MerId    int    `json:"merId"`
//}

var orderPei structs.OrderPei

func Run(ginServe *gin.Engine, orders chan structs.OrderDate, chanOrderPei chan<- structs.OrderPei, db *sql.DB) {
	ginServe.Static("/templates/news", "./templates/news")
	ginServe.LoadHTMLGlob("templates/**/*")
	ginServe.GET("/news", func(c *gin.Context) {
		session := sessions.Default(c)
		merId := session.Get("merId")
		fmt.Print(merId)
		if merId == nil {
			c.HTML(http.StatusOK, "err.html", gin.H{})
			return
		}
		c.HTML(http.StatusOK, "news.html", gin.H{
			"merId": merId,
		})
	})
	ginServe.GET("/merchant/:ShangjiaId", func(c *gin.Context) {
		shangJiaId := c.Param("ShangjiaId")
		merId, err := strconv.Atoi(shangJiaId)
		if err != nil {
			// 转换失败，返回错误响应
			c.String(http.StatusBadRequest, "Invalid ShangjiaId")
			return
		}
		fmt.Print(shangJiaId)
		handleWebSocket(merId, orders, c, upgrader, db)
	})
	ginServe.POST("/orderPei", func(c *gin.Context) {
		funcorderPei(c, chanOrderPei) // 将chanOrderPei传递给处理函数
	})

}
func handleWebSocket(merId int, orders chan structs.OrderDate, c *gin.Context, upgrader websocket.Upgrader, db *sql.DB) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		http.NotFound(c.Writer, c.Request)
		return
	}

	fmt.Println("WebSocket connection established")
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

		case order, ok := <-orders:
			if !ok {
				fmt.Println("orders channel closed")
				return
			}

			if order.MerId != merId {
				orders <- order
				return
			}
			_, err := db.Exec("update orderfrom set status=? where orderId=?", "商家已接单", order.OrderId)
			if err != nil {
				fmt.Println("Error updating order:", err)
			}
			fmt.Println("Received order:", order)
			if err = conn.WriteJSON(order); err != nil {
				fmt.Println("Error writing to WebSocket:", err)
				return
			}
		}
	}
}

func funcorderPei(c *gin.Context, chanOrderPei chan<- structs.OrderPei) {
	var tidai structs.OrderPei
	err := c.ShouldBindJSON(&tidai)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"err": err.Error()})
		return
	}
	orderPei = tidai
	chanOrderPei <- orderPei
	c.JSON(http.StatusOK, gin.H{"message": "Order received"})
}
