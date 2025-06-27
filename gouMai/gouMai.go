package gouMai

import (
	"database/sql"
	"fmt"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"net/http"
	"shiZhan/structs"
)

func Run(ginserve *gin.Engine, db *sql.DB, orders chan<- structs.OrderDate) {
	ginserve.Static("/templates/gouMai", "./templates/gouMai")
	ginserve.LoadHTMLGlob("templates/**/*")
	ginserve.GET("/gouMai", func(c *gin.Context) {
		c.HTML(http.StatusOK, "gouMai.html", gin.H{})
	})
	ginserve.POST("/gouMai_success", func(c *gin.Context) {
		session := sessions.Default(c)
		userId := session.Get("userId")
		var order structs.OrderDate
		err := c.ShouldBindJSON(&order)
		if err != nil {
			c.JSON(400, gin.H{"err": err.Error()})
			return
		}
		order.Status = "已支付"
		_, err = db.Exec("insert into orderfrom(userId,userName,merId,location,prices,time,status) values(?,?,?,?,?,?,?)", userId, order.UserName, order.MerId, order.Location, order.Prices, order.Time, order.Status)
		if err != nil {
			c.JSON(500, gin.H{"err": err.Error()})
			return
		}
		fmt.Println("1111")
		db.QueryRow("select orderId from orderfrom where userId=? and time=?", userId, order.Time).Scan(&order.OrderId)
		fmt.Println("order.OrderId")
		for i, _ := range order.Items {
			_, err = db.Exec("insert into orderItem(orderId,foodId,quantity) values(?,?,?)", order.OrderId, order.Items[i].FoodId, order.Items[i].Quantity)
			if err != nil {
				c.JSON(500, gin.H{"err": err.Error()})
				return
			}
		}
		orders <- order
		fmt.Println("进管道了")
		c.JSON(http.StatusOK, gin.H{"status": "order placed"})
	})

}
