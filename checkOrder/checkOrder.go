package checkOrder

import (
	"database/sql"
	"fmt"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"shiZhan/structs"
)

func Run(ginserve *gin.Engine, db *sql.DB) {
	ginserve.Static("/templates/checkOrder", "./templates/checkOrder")
	ginserve.LoadHTMLGlob("templates/**/*")
	ginserve.GET("/checkOrder", func(c *gin.Context) {
		c.HTML(200, "checkOrder.html", gin.H{})
	})
	ginserve.GET("/checkOrder/order", func(c *gin.Context) {
		session := sessions.Default(c)
		userId, ok := session.Get("userId").(int) // 类型断言
		if !ok {
			c.JSON(400, gin.H{"error": "无效的 userId 类型"})
			return
		}
		orders, err := getOrders(userId, db)
		fmt.Println(orders)
		if err != nil {
			c.JSON(500, gin.H{"error": err})
		}
		c.JSON(200, gin.H{"orders": orders})

	})

}
func getOrders(userId int, db *sql.DB) ([]structs.OrderDate, error) {
	var orders []structs.OrderDate

	// 同上查询逻辑...
	rows, err := db.Query(`
    SELECT 
    o.orderId, 
    o.prices, 
    o.time, 
    o.merId, 
    o.deId, 
    o.status,
    m.merName
FROM orderfrom o
LEFT JOIN merchant m ON o.merId = m.merId
LEFT JOIN delivery d ON o.deId = d.deId  -- 通过 deId 关联 delivery 表
LEFT JOIN user u ON d.userId = u.userId  -- 通过 userId 关联 user 表
WHERE o.userId = ?`, userId)

	if err != nil {
		fmt.Println("查询订单失败:", err)
		return nil, fmt.Errorf("查询订单失败: %v", err)
	}
	defer rows.Close()
	for rows.Next() {
		var order structs.OrderDate
		err = rows.Scan(&order.OrderId, &order.Prices, &order.Time, &order.MerId, &order.DeId, &order.Status, &order.MerName)
		if err != nil {
			fmt.Println("扫描订单失败:", err)
			return nil, fmt.Errorf("扫描订单数据失败: %v", err)
		}
		var deUserId int
		_ = db.QueryRow("select userId from delivery d where d.deId=?", order.DeId).Scan(&deUserId)
		_ = db.QueryRow("select userName from user where userId=?", deUserId).Scan(&order.DeName)
		order.Items = []struct {
			FoodId   int     `json:"foodId"`
			FoodName string  `json:"foodName"`
			Quantity int     `json:"quantity"`
			Price    float64 `json:"price"`
		}{}
		rowws, err := db.Query("SELECT oi.foodId, oi.quantity, f.foodName FROM orderItem oi LEFT JOIN food f ON oi.foodId = f.foodId WHERE oi.orderId = ?", order.OrderId)
		if err != nil {
			return nil, fmt.Errorf("扫描订单数据失败: %v", err)
		}
		defer rowws.Close()
		for rowws.Next() {
			var item struct {
				FoodId   int     `json:"foodId"`
				FoodName string  `json:"foodName"`
				Quantity int     `json:"quantity"`
				Price    float64 `json:"price"`
			}
			err = rowws.Scan(&item.FoodId, &item.Quantity, &item.FoodName)
			if err != nil {
				return nil, fmt.Errorf("扫描商品数据失败: %v", err)
			}
			order.Items = append(order.Items, item) // 使用append添加元素
		}
		orders = append(orders, order)
	}

	if err := rows.Err(); err != nil {
		fmt.Println("遍历订单失败:", err)
		return nil, fmt.Errorf("遍历订单时出错: %v", err)
	}

	return orders, nil
}
