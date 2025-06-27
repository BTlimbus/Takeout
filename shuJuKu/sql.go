package shuJuKu

import (
	"database/sql"
	_ "github.com/go-sql-driver/mysql"
	"log"
)

func ConnectToDatabase(db **sql.DB) {
	var err error
	*db, err = sql.Open("mysql", "root:39xiaosi@tcp(127.0.0.1:3306)/waimai")
	if err != nil {
		panic(err)
	}
	if err = (*db).Ping(); err != nil {
		log.Fatal("Error pinging database:", err)
	}
}
