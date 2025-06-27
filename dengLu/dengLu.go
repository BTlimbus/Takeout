package dengLu

import (
	"database/sql"
	"fmt"
	"net/http"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

func Run(ginServe *gin.Engine, db *sql.DB) {
	ginServe.Static("/templates/dengLu", "./templates/dengLu")
	ginServe.LoadHTMLGlob("templates/**/*")
	ginServe.GET("/index", func(c *gin.Context) {
		session := sessions.Default(c)
		fmt.Println(session.Get("username"))
		c.HTML(http.StatusOK, "index.html", gin.H{})
	})
	ginServe.POST("/app/art", func(c *gin.Context) {
		session := sessions.Default(c)
		session.Clear()
		session.Save()
		zhangHu := c.PostForm("zhangHu")
		password := c.PostForm("password")
		var yongHu string
		var yongPassword string
		err := db.QueryRow("select zhangHu,password from user where zhangHu=?", zhangHu).Scan(&yongHu, &yongPassword)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "账号错误",
			})
			return
		}
		if !(zhangHu == yongHu && CheckPasswordHash(password, yongPassword)) {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "账户或密码错误",
			})
			return
		}

		huoQuYongHu(c, db, yongHu)
		c.JSON(http.StatusOK, gin.H{
			"status":  "success",
			"message": "登录成功",
		})
	})

}
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
func huoQuYongHu(c *gin.Context, dp *sql.DB, zhangHu string) {
	session := sessions.Default(c)
	var name string
	var userId int
	var standing string
	dp.QueryRow("select userId,username,standing from user where zhangHu=?", zhangHu).Scan(&userId, &name, &standing)
	if standing == "商家" {
		var merId int
		dp.QueryRow("select merId from merchant where userId=?", userId).Scan(&merId)
		fmt.Print("dd:", merId)
		session.Set("merId", merId)
		session.Save()
	}
	if standing == "配送" {
		var deId int
		dp.QueryRow("select deId from delivery where userId=?", userId).Scan(&deId)
		session.Set("deId", deId)
		session.Save()
	}
	session.Set("username", name)
	session.Set("zhangHu", zhangHu)
	session.Set("userId", userId)
	session.Save()
}
