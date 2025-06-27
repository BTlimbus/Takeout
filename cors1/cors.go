package cors1

import (
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func Run(ginserve *gin.Engine) {
	config := cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization"}, // 允许的HTTP头部
		AllowCredentials: true,                                                                  // 是否允许浏览器发送Cookie
		MaxAge:           12 * time.Hour,
	}
	ginserve.Use(cors.New(config))
}
