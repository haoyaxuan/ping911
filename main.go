package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/haoyaxuan/ping911/v2/config"
	corelog "github.com/haoyaxuan/ping911/v2/core/log"
	"github.com/haoyaxuan/ping911/v2/web"
	"github.com/labstack/echo/v4"
)

func main() {
	config.Init()
	corelog.SetLevel(string(config.GetLogLevel()))

	e := echo.New()
	e.HideBanner = true
	web.Init(e)

	server := &http.Server{Addr: ":" + config.Address(), Handler: e}
	go func() {
		log.Printf("ping911 server started; open http://127.0.0.1:%s", config.Address())
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Printf("server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Printf("server shutdown error: %v", err)
	}
}
