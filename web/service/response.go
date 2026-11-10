package service

import (
	"log"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type apiResponse struct {
	Status     bool        `json:"status"`
	StatusCode string      `json:"statusCode"`
	Message    string      `json:"message,omitempty"`
	Data       interface{} `json:"data,omitempty"`
	List       interface{} `json:"list,omitempty"`
	Total      *int64      `json:"total,omitempty"`
}

func success(c echo.Context, data interface{}) error {
	return c.JSON(http.StatusOK, apiResponse{
		Status:     true,
		StatusCode: strconv.Itoa(http.StatusOK),
		Data:       data,
	})
}

func pageSuccess(c echo.Context, total int64, list interface{}) error {
	return c.JSON(http.StatusOK, apiResponse{
		Status:     true,
		StatusCode: strconv.Itoa(http.StatusOK),
		Message:    "成功",
		List:       list,
		Total:      &total,
	})
}

func messageSuccess(c echo.Context, message string, data interface{}) error {
	return c.JSON(http.StatusOK, apiResponse{
		Status:     true,
		StatusCode: strconv.Itoa(http.StatusOK),
		Message:    message,
		Data:       data,
	})
}

func apiFail(c echo.Context, status int, message string, err error) error {
	if err != nil {
		log.Printf("%s: %v", message, err)
	}
	return c.JSON(status, apiResponse{
		Status:     false,
		StatusCode: strconv.Itoa(status),
		Message:    message,
	})
}
