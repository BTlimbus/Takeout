package shouYe

import (
	"database/sql"
	"net/http"
	"shiZhan/structs"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

func Run(ginServe *gin.Engine, db *sql.DB) {
	ginServe.Static("/templates/shouYe", "./templates/shouYe")
	ginServe.LoadHTMLGlob("templates/**/*")

	ginServe.GET("/", func(c *gin.Context) {
		session := sessions.Default(c)
		name := session.Get("username")
		c.HTML(http.StatusOK, "shouYe.html", gin.H{
			"name": name,
		})
	})
	ginServe.GET("/get_shop", func(c *gin.Context) {
		var shops []structs.Shop
		rows, err := db.Query("SELECT merId,merName,imageUrl FROM merchant")
		defer rows.Close()
		if err != nil {
			c.JSON(500, gin.H{"err": err.Error()})
		}
		for rows.Next() {
			var shop structs.Shop
			rows.Scan(&shop.MerId, &shop.ShopName, &shop.ImageUrl)
			shops = append(shops, shop)
		}
		c.JSON(200, gin.H{"shops": shops})
	})
	ginServe.GET("/search")
}
func search(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {

	}
}
