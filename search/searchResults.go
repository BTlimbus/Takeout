package search

import (
	"database/sql"
	"fmt"
	"github.com/gin-gonic/gin"
	"net/http"
	"shiZhan/structs"
)

func Run(ginserve *gin.Engine, db *sql.DB) {
	ginserve.Static("/templates/searchResults", "./templates/searchResults")
	ginserve.LoadHTMLGlob("templates/**/*")
	ginserve.GET("/searchResults", func(c *gin.Context) {
		c.HTML(http.StatusOK, "searchResults.html", gin.H{})
	})
	ginserve.GET("/searchMer", searchMer(db))
}
func searchMer(db *sql.DB) gin.HandlerFunc {
	var merchants []structs.Shop

	return func(c *gin.Context) {
		query := c.Query("q")
		if query == "" {
			c.JSON(500, gin.H{
				"error": "搜索关键词不能为空",
			})
			return
		}
		likeQuery := "%" + query + "%"
		rows, err := db.Query("select merId,merName,imageUrl from merchant where merName like ?", likeQuery)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
		}
		defer rows.Close()
		merchants = []structs.Shop{}
		for rows.Next() {
			var merchant structs.Shop
			err := rows.Scan(&merchant.MerId, &merchant.ShopName, &merchant.ImageUrl)
			if err != nil {
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}

			merchants = append(merchants, merchant)
		}
		fmt.Println(merchants)
		c.JSON(200, gin.H{"merchants": merchants})
	}
}
