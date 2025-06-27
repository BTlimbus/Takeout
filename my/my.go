package my

import (
	"database/sql"
	"fmt"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"net/http"
	"shiZhan/structs"
)

//var userId int
//var merId int
//var deId int

func Run(ginServe *gin.Engine, db *sql.DB) {
	ginServe.Static("/templates/my", "./templates/my")
	ginServe.LoadHTMLGlob("templates/**/*")
	ginServe.GET("/my", func(c *gin.Context) {
		var userId int
		var merId int
		var deId int
		session := sessions.Default(c)
		userName := session.Get("username")
		userIdInterface := session.Get("userId")
		merIdInterface := session.Get("merId")
		deIdInterface := session.Get("deId")
		userId = userIdInterface.(int)
		if merIdInterface != nil {
			merId = merIdInterface.(int)
		}

		if deIdInterface != nil {
			deId = deIdInterface.(int)
		}

		fmt.Print(userId)
		if merId > 0 {
			c.HTML(http.StatusOK, "my_mer.html", gin.H{"merName": userName})
		} else if deId > 0 {
			c.HTML(http.StatusOK, "my_de.html", gin.H{})
		} else {
			c.HTML(http.StatusOK, "my.html", gin.H{})
		}
	})
	ginServe.POST("/app/art4", art3(db))
	ginServe.POST("/app/art3", art4(db))
	ginServe.POST("/addFood", addFood(db))
	ginServe.GET("/getMerOrders", getorders(db))
	ginServe.GET("/getMerFood", getMerFood(db))
	ginServe.POST("/updateMy", updateMy(db))
	ginServe.DELETE("/deleteFood/:foodId", deleteCategory(db))
	ginServe.GET("/getUser", getUser(db))
}

// 注册为商家
func art3(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		merName := c.PostForm("tradeName")
		session := sessions.Default(c)
		userId := session.Get("userId")
		var merId1 int
		err := db.QueryRow("select merId from merchant where userId=?", userId).Scan(&merId1)
		if err == nil && merId1 != 0 {
			c.JSON(http.StatusOK, gin.H{
				"status":  "error",
				"message": "该用户以是商家",
			})
			return
		}
		var deId1 int
		err = db.QueryRow("select deId from delivery where userId=?", userId).Scan(&deId1)
		if err == nil && deId1 != 0 {
			c.JSON(http.StatusOK, gin.H{
				"status":  "error",
				"message": "该用户以是配送员无法注册",
			})
			return
		}

		_, err = db.Exec("insert into merchant (userId,merName) values (?,?)", userId, merName)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "保存失败" + err.Error(),
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status":  "success",
			"message": "恭喜成为商家",
		})
	}
}

// 注册为配送员
func art4(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		session := sessions.Default(c)
		userIdInterface := session.Get("userId")
		userId := userIdInterface.(int)
		var deId1 int
		err := db.QueryRow("select deId from delivery where userId=?", userId).Scan(&deId1)
		if err == nil && deId1 != 0 {
			c.JSON(http.StatusOK, gin.H{
				"status":  "error",
				"message": "该用户以是配送员",
			})
			return
		}
		var merId1 int
		err = db.QueryRow("select merId from merchant where userId=?", userId).Scan(&merId1)
		if err == nil && merId1 != 0 {
			c.JSON(http.StatusOK, gin.H{
				"status":  "error",
				"message": "该用户以是商家无法注册",
			})
			return
		}

		_, err = db.Exec("insert into delivery (userId) values (?)", userId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "保存失败" + err.Error(),
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status":  "success",
			"message": "恭喜成为配送员",
		})
	}
}

// 添加菜品函数
func addFood(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		session := sessions.Default(c)
		flag := false
		merId1 := session.Get("merId")
		foodType := c.PostForm("foodType")
		foodName := c.PostForm("foodName")
		price := c.PostForm("price")
		imageUrl := c.PostForm("imageUrl")
		rows, err := db.Query("select types from foodtype where merId=?", merId1)
		if err != nil {
			c.JSON(500, gin.H{
				"err": err.Error(),
			})
		}
		defer rows.Close()
		for rows.Next() {
			var types string
			err = rows.Scan(&types)
			if err != nil {
				c.JSON(500, gin.H{
					"err": err.Error(),
				})
			}
			if foodType == types {
				flag = true
				break
			}
		}
		if flag {
			var typeId int
			err = db.QueryRow("select typeId from foodtype where types=?", foodType).Scan(&typeId)
			if err != nil {
				c.JSON(500, gin.H{
					"err": err.Error(),
				})
			}
			_, err = db.Exec("insert into food(foodName, price, merId, typeId, imageUrl) values(?,?,?,?,?) ", foodName, price, merId1, typeId, imageUrl)
			if err != nil {
				c.JSON(500, gin.H{
					"err": err.Error(),
				})
			}
		} else {
			var typeId int
			_, err = db.Exec("insert into foodtype(merId, types) values(?,?)", merId1, foodType)
			if err != nil {
				c.JSON(500, gin.H{"err": err.Error()})
				return
			}
			err = db.QueryRow("select typeId from foodtype where types=?", foodType).Scan(&typeId)
			if err != nil {
				c.JSON(500, gin.H{
					"err": err.Error(),
				})
			}
			_, err = db.Exec("insert into food(foodName, price, merId, typeId, imageUrl) values(?,?,?,?,?) ", foodName, price, merId1, typeId, imageUrl)
			if err != nil {
				c.JSON(500, gin.H{"err": err.Error()})
				return
			}
		}
		c.JSON(http.StatusOK, gin.H{"message": "添加成功"})
	}
}

// 删除菜品分类
func deleteCategory(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		categoryId := c.Param("foodId")

		// 删除菜品分类记录
		_, err := db.Exec("delete from food where foodId=?", categoryId)
		if err != nil {
			c.JSON(500, gin.H{"err": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": "ok", "message": "删除成功"})
	}
}
func getorders(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		session := sessions.Default(c)
		merIdsInterface := session.Get("merId")
		merIds := merIdsInterface.(int)
		fmt.Printf("merIds: %v\n", merIds)
		var orders []structs.OrderDate
		rows, err := db.Query("select orderId,prices,time,deId,userName,location,status from orderfrom where merId=?", merIds)
		if err != nil {
			fmt.Println("1")
			c.JSON(500, gin.H{"err": err.Error()})
			return
		}
		defer rows.Close()
		for rows.Next() {
			var order structs.OrderDate
			err = rows.Scan(&order.OrderId, &order.Prices, &order.Time, &order.DeId, &order.UserName, &order.Location, &order.Status)
			if err != nil {
				fmt.Println(err)
				c.JSON(500, gin.H{"err": err.Error()})
				return
			}
			order.Items = []struct {
				FoodId   int     `json:"foodId"`
				FoodName string  `json:"foodName"`
				Quantity int     `json:"quantity"`
				Price    float64 `json:"price"`
			}{}
			rowws, err := db.Query("SELECT oi.foodId, oi.quantity, f.foodName FROM orderItem oi LEFT JOIN food f ON oi.foodId = f.foodId WHERE oi.orderId = ?", order.OrderId)
			if err != nil {

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

				order.Items = append(order.Items, item) // 使用append添加元素
			}
			orders = append(orders, order)
		}
		c.JSON(200, gin.H{"orders": orders})
	}
}

// 获取商家菜单
func getMerFood(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var merId int
		var menus []structs.Menu
		rows, err := db.Query("SELECT foodId,foodName,price,typeId,imageUrl FROM food WHERE merid=?", merId)
		if err != nil {
			c.JSON(500, gin.H{"err": err.Error()})
			return
		}
		defer rows.Close()
		for rows.Next() {
			var menu1 structs.Menu
			err := rows.Scan(&menu1.FoodId, &menu1.FoodName, &menu1.Price, &menu1.TypeId, &menu1.ImageUrl)
			if err != nil {
				// 处理错误
				c.JSON(500, gin.H{"err": err.Error()})
			}
			err = db.QueryRow("select types from foodtype where typeId=?", menu1.TypeId).Scan(&menu1.LeiXing)
			if err != nil {
				c.JSON(500, gin.H{"err": err.Error()})
				return
			}
			menus = append(menus, menu1)
		}
		c.JSON(200, gin.H{"menus": menus})
	}
}

// 修改个人信息
func updateMy(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		session := sessions.Default(c)
		userIdInterface := session.Get("userId")
		userId := userIdInterface.(int)
		merIdInterface := session.Get("merId")
		merId := merIdInterface.(int)
		var deId int
		//商家修改个人信息
		if merId > 0 {
			merName := c.PostForm("merName")
			userName := c.PostForm("userName")
			merType := c.PostForm("merType")
			if userName != "" {
				_, err := db.Exec("update user set userName = ? where userId = ?", userName, userId)
				if err != nil {
					c.JSON(500, gin.H{"err": err.Error()})
					return
				}
			}
			if merName != "" {
				_, err := db.Exec("update merchant set merName = ? where merId = ?", merName, merId)
				if err != nil {
					c.JSON(500, gin.H{"err": err.Error()})
					return
				}
			}
			_, err := db.Exec("update merchant set merType = ? where merId = ?", merType, merId)
			if err != nil {
				c.JSON(500, gin.H{"err": err.Error()})
				return
			}
		} else if deId > 0 {
			//配送修改个人信息
		} else {
			//用户修改个人信息
		}
		c.JSON(200, gin.H{"success": "ok", "message": "修改成功"})
	}
}

// 获取商家信息
func getUser(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var userId int
		var merId int
		var deId int
		session := sessions.Default(c)
		userIdInterface := session.Get("userId")
		if userIdInterface != nil {
			userId = userIdInterface.(int)
		}
		merIdInterface := session.Get("merId")
		if merIdInterface != nil {
			merId = merIdInterface.(int)
		}
		deIdInterface := session.Get("deId")
		if deIdInterface != nil {
			deId = deIdInterface.(int)
		}
		if merId > 0 {
			var shop structs.Shop
			err := db.QueryRow("select merName,merType from merchant where merId=?", merId).Scan(&shop.ShopName, &shop.MerType)
			if err != nil {
				c.JSON(500, gin.H{"err": err.Error()})
				return
			}
			err = db.QueryRow("select userName from user where userId=?", userId).Scan(&shop.UserName)
			if err != nil {
				c.JSON(500, gin.H{"err": err.Error()})
				return
			}
			fmt.Println(shop)
			c.JSON(200, gin.H{"success": "ok", "shop": shop})
		} else if deId > 0 {

		} else {
			var user structs.User
			err := db.QueryRow("select userName,standing from user where userId=?", userId).Scan(&user.UserName, &user.Standing)
			if err != nil {
				c.JSON(500, gin.H{"err": err.Error()})
				return
			}
			c.JSON(200, gin.H{"success": "ok", "user": user})
		}
	}
}
