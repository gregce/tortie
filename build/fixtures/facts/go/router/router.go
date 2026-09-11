package router

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func Mount(g *gin.Engine) {
	oidcGroup := g.Group("/oidc")
	oidcGroup.GET("/x", h)
	oidcGroup.POST("/x", h)
	g.GET("version", h)
	g.GET("gotifyinfo", h)
	g.POST("", h)
	clientAuth := g.Group("/client")
	clientAuth.GET("/", h)
	clientAuth.DELETE("/:id", h)
	tokenMessage := g.Group("/message")
	tokenMessage.GET("/", h)
	tokenMessage.POST("/", h)
	tokenMessage.PUT("/:id", h)
	http.HandleFunc("/h", hh)
	resp, _ := client.Get(url)
	_ = resp
}
