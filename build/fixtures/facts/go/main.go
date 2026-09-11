package main

import (
	"net/http"

	"github.com/example/svc/router"
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()
	v := viper.Default()
	c := cfg.Default()
	d := x.Default()
	router.Mount(r)
	http.ListenAndServe(":8080", r)
	_, _, _ = v, c, d
}
