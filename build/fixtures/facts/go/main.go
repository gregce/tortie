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

func flags(mux *http.ServeMux) {
	var verbose bool
	flag.BoolVar(&verbose, "verbose", false, "say more")
	mux.HandleFunc("GET /v1/me", me)
	req := &http.Request{Method: "GET"}
	_ = req
}
