package service

import (
	"crypto/subtle"
	"net/http"
	"strings"

	"github.com/haoyaxuan/ping911/v2/config"
	"github.com/labstack/echo/v4"
)

func TokenAuth(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		expectedToken := strings.TrimSpace(config.Token())
		if expectedToken == "" {
			return apiFail(c, http.StatusServiceUnavailable, "API Token 未配置", nil)
		}

		parts := strings.Fields(c.Request().Header.Get(echo.HeaderAuthorization))
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") ||
			subtle.ConstantTimeCompare([]byte(parts[1]), []byte(expectedToken)) != 1 {
			c.Response().Header().Set(echo.HeaderWWWAuthenticate, `Bearer realm="ping911"`)
			return apiFail(c, http.StatusUnauthorized, "Token 无效或缺失", nil)
		}

		return next(c)
	}
}
