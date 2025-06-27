package dianCan

import (
	"database/sql"
	"github.com/gin-gonic/gin"
	"net/http"
	"shiZhan/structs"
	"strconv"
)

func Run(ginserve *gin.Engine, db *sql.DB) {

	ginserve.Static("/templates/dianCan", "./templates/dianCan")
	ginserve.LoadHTMLGlob("templates/**/*")
	ginserve.GET("/dianCan", func(c *gin.Context) {
		c.HTML(http.StatusOK, "dianCan.html", gin.H{})
	})
	ginserve.GET("/dianCan/:shangJiaId", func(c *gin.Context) {
		shangJiaId := c.Param("shangJiaId")
		LeiXings := getTypes(shangJiaId, c, db)
		menus := getFood(shangJiaId, c, db)
		c.HTML(200, "dianCan.html", gin.H{
			"LeiXings": LeiXings,
			"menus":    menus,
			"jsonData": gin.H{
				"LeiXings": LeiXings,
				"menus":    menus,
			},
		})
	})
}
func getTypes(shangJiaId string, c *gin.Context, db *sql.DB) []string {
	var LeiXings []string
	merId, err := strconv.Atoi(shangJiaId)
	if err != nil {
		c.JSON(500, gin.H{"err": err.Error()})
	}
	rows, err := db.Query("SELECT types FROM foodType WHERE merid=?", merId)
	if err != nil {
		c.JSON(500, gin.H{"err": err.Error()})
		return nil
	}
	defer rows.Close()
	for rows.Next() {
		var leiXing string
		err := rows.Scan(&leiXing)
		if err != nil {
			// 处理错误
		}
		LeiXings = append(LeiXings, leiXing)
	}
	return LeiXings
}
func getFood(shangJiaId string, c *gin.Context, db *sql.DB) []structs.Menu {
	var menus []structs.Menu
	merId, err := strconv.Atoi(shangJiaId)
	if err != nil {
		c.JSON(500, gin.H{"err": err.Error()})
	}
	rows, err := db.Query("SELECT foodId,foodName,price,typeId,imageUrl FROM food WHERE merid=?", merId)
	if err != nil {
		c.JSON(500, gin.H{"err": err.Error()})
		return nil
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
			return nil
		}
		menus = append(menus, menu1)
	}
	return menus
}
