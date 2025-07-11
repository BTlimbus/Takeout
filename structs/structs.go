package structs

import "database/sql"

// Menu 菜单
type Menu struct {
	FoodId   int    `json:"foodId"`
	FoodName string `json:"foodName"`
	Price    int    `json:"price"`
	LeiXing  string `json:"leiXing"`
	TypeId   int    `json:"typeId"`
	ImageUrl string `json:"imageUrl"`
}

// OrderDate 订单数据
type OrderDate struct {
	UserId   int            `json:"userId"`
	UserName string         `json:"userName"`
	Location string         `json:"location"`
	MerId    int            `json:"merId"`
	MerName  string         `json:"merName"`
	DeId     sql.NullInt64  `json:"deId"`
	DeName   sql.NullString `json:"deName"`
	Prices   float64        `json:"prices"`
	Time     string         `json:"time"`
	OrderId  int            `json:"orderId"`
	Status   string         `json:"status"`
	Items    []struct {
		FoodId   int     `json:"foodId"`
		FoodName string  `json:"foodName"`
		Quantity int     `json:"quantity"`
		Price    float64 `json:"price"`
	} `json:"items"`
}

// OrderPei 配送订单
type OrderPei struct {
	OrderId  int    `json:"orderId"`
	UserName string `json:"userName"`
	MerId    int    `json:"merId"`
}

// Shop 商家
type Shop struct {
	ImageUrl string `json:"imageUrl"`
	ShopName string `json:"shopName"`
	MerId    int    `json:"merId"`
	MerType  string `json:"merType"`
	UserName string `json:"userName"`
}

// 用户
type User struct {
	UserName string `json:"userName"`
	Role     string `json:"role"`
}
