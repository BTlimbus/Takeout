package dengLu

import (
	"database/sql"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"net/http"
)

func ZhuCe(ginServer *gin.Engine, db *sql.DB) {
	ginServer.Static("/templates/zhuCe", "./templates/zhuCe")
	ginServer.LoadHTMLGlob("templates/**/*")
	ginServer.GET("/zhuCe", func(c *gin.Context) {
		c.HTML(http.StatusOK, "zhuCe.html", gin.H{})
	})
	ginServer.POST("/app/art2", func(c *gin.Context) {
		username := c.PostForm("username")
		zhangHu := c.PostForm("zhangHu")
		password := c.PostForm("password")
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "密码哈希失败"})
			return
		}
		var yonghu string
		err = db.QueryRow("select zhangHu from user where zhangHu=?", zhangHu).Scan(&yonghu)
		if err == nil && yonghu == zhangHu {
			c.JSON(http.StatusOK, gin.H{
				"status":  "error",
				"message": "用户名已存在",
			})
			return
		}
		//保存到数据库
		_, err = db.Exec("insert into user (userName,zhangHu,password) values (?,?,?)", username, zhangHu, string(hashedPassword))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "保存失败" + err.Error(),
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status":  "success",
			"message": "注册成功,前去登录吧"})
	})

}
