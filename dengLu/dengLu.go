package dengLu

import (
	"database/sql"
	"fmt"
	"github.com/dgrijalva/jwt-go"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"net/http"
	"time"
)

var JwtKey = []byte("uuz") // 建议从环境变量获取
// Claims结构
type Claims struct {
	UserId   int    `json:"userId"`
	Username string `json:"username"`
	ZhangHu  string `json:"zhangHu"`
	Role     string `json:"role"`
	MerId    int    `json:"merId,omitempty"` // 商家ID（可选）
	DeId     int    `json:"deId,omitempty"`  // 配送员ID（可选）
	jwt.StandardClaims
}
type LoginRequest struct {
	ZhangHu  string `json:"zhangHu"`
	Password string `json:"password"`
}

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
		var req LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		zhangHu := req.ZhangHu
		password := req.Password

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

		token, err := generateJWT(c, db, zhangHu)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "生成令牌失败",
			})
			return
		}

		// 返回JWT给客户端
		c.JSON(http.StatusOK, gin.H{
			"status":  "success",
			"message": "登录成功",
			"token":   token,
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
	var role string
	dp.QueryRow("select userId,username,role from user where zhangHu=?", zhangHu).Scan(&userId, &name, &role)
	if role == "商家" {
		var merId int
		dp.QueryRow("select merId from merchant where userId=?", userId).Scan(&merId)
		fmt.Print("dd:", merId)
		session.Set("merId", merId)
		session.Save()
	}
	if role == "配送" {
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
func generateJWT(c *gin.Context, db *sql.DB, zhangHu string) (string, error) {
	// 查询用户信息
	var userId int
	var username string
	var role string

	err := db.QueryRow("select userId,username,role from user where zhangHu=?", zhangHu).Scan(&userId, &username, &role)
	if err != nil {
		return "", err
	}

	// 创建Claims
	claims := &Claims{
		UserId:   userId,
		Username: username,
		ZhangHu:  zhangHu,
		Role:     role,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: time.Now().Add(24 * time.Hour).Unix(), // 24小时过期
			Issuer:    "dengLU",
		},
	}

	// 补充商家或配送员ID（如果适用）
	if role == "商家" {
		var merId int
		err := db.QueryRow("select merId from merchant where userId=?", userId).Scan(&merId)
		if err == nil {
			claims.MerId = merId
		}
	} else if role == "配送" {
		var deId int
		err := db.QueryRow("select deId from delivery where userId=?", userId).Scan(&deId)
		if err == nil {
			claims.DeId = deId
		}
	}

	// 生成JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(JwtKey)
	if err != nil {
		return "", err
	}

	return tokenString, nil
}
