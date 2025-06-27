package ceShi

import (
	"fmt"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"net/http"
)

func Run(ginserve *gin.Engine) {
	ginserve.Static("/templates/ceShi", "./templates/ceShi")
	ginserve.Static("/images", "./images")
	ginserve.LoadHTMLGlob("templates/**/*")
	ginserve.GET("/ceshiye", func(c *gin.Context) {
		session := sessions.Default(c)
		fmt.Println(session.Get("username"))
		c.HTML(http.StatusOK, "ceShi.html", gin.H{})
	})
	ginserve.GET("/ceshi", func(c *gin.Context) {
		urlfile := "uuz.jpg"
		imgfile := fmt.Sprintf("../images/%s", urlfile)
		c.JSON(200, gin.H{
			"imgfile": imgfile,
		})
	})
}
