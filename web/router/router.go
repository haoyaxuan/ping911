package router

import (
	"github.com/haoyaxuan/ping911/v2/web/service"
	"github.com/labstack/echo/v4"
)

func Init(e *echo.Echo) {
	pingService := service.NewPingService()
	e.GET("/", pingService.Panel)
	e.GET("/ping", pingService.Panel)

	api := e.Group("/api", service.TokenAuth)
	api.POST("/ping", pingService.Check)
	api.POST("/v1/ping-checks", pingService.Check)
}
