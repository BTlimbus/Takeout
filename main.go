package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"html/template"
	"os"
	"shiZhan/ceShi"
	"shiZhan/checkOrder"
	"shiZhan/dengLu"
	"shiZhan/dianCan"
	"shiZhan/gouMai"
	"shiZhan/my"
	"shiZhan/news"
	"shiZhan/peiSong"
	"shiZhan/search"
	"shiZhan/shouYe"
	"shiZhan/shuJuKu"
	"shiZhan/structs"
	"shiZhan/websockets"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
)

func safeJS(data interface{}) template.JS {
	jsonData, _ := json.Marshal(data)
	return template.JS(jsonData)
}
func main() {

	//创建一个数据库对象
	var db *sql.DB
	shuJuKu.ConnectToDatabase(&db)
	//创建一个服务
	ginServe := gin.Default()
	ginServe.SetFuncMap(template.FuncMap{
		"safeJS": safeJS,
	})
	workDir, err := os.Getwd()
	if err != nil {
		panic(err)
	}
	fmt.Print(workDir)
	store := cookie.NewStore([]byte("secret"))
	ginServe.Use(sessions.Sessions("mysession", store))
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"*"} // 允许所有源
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Content-Length", "Accept-Encoding", "X-CSRF-Token", "Authorization"}
	config.ExposeHeaders = []string{"Content-Length"}
	config.AllowCredentials = true
	config.MaxAge = 12 * time.Hour
	ginServe.Use(cors.New(config))
	dengLu.ZhuCe(ginServe, db)
	dengLu.Run(ginServe, db)
	var orders = make(chan structs.OrderDate, 100)
	var orderPei = make(chan structs.OrderPei,100)
	defer close(orders)
	news.Run(ginServe, orders, orderPei, db)
	shouYe.Run(ginServe, db)
	my.Run(ginServe, db)
	ceShi.Run(ginServe)
	peiSong.Run(ginServe, orderPei, db)
	dianCan.Run(ginServe, db)
	gouMai.Run(ginServe, db, orders)
	checkOrder.Run(ginServe, db)
	search.Run(ginServe, db)
	websockets.Run(ginServe, db, orders,orderPei)
	//服务器端口
	err = ginServe.Run(":8080")
	if err != nil {
		return
	}
}
