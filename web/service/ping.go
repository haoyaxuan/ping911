package service

import (
	"context"
	"errors"
	"net"
	"net/http"
	"os/exec"
	"runtime"
	"strings"
	"sync"
	"time"
	"unicode"

	"github.com/labstack/echo/v4"
)

const (
	maxPingIPs  = 50
	pingWorkers = 10
	pingTimeout = 3 * time.Second
)

type PingService struct{}

type pingRequest struct {
	IPs string `json:"ips"`
}

type pingResult struct {
	IP         string `json:"ip"`
	Reachable  bool   `json:"reachable"`
	DurationMS int64  `json:"durationMs"`
	Message    string `json:"message,omitempty"`
}

func NewPingService() *PingService {
	return &PingService{}
}

func (s *PingService) Panel(c echo.Context) error {
	return c.Render(http.StatusOK, "ping.html", nil)
}

func (s *PingService) Check(c echo.Context) error {
	request := new(pingRequest)
	if err := c.Bind(request); err != nil {
		return apiFail(c, http.StatusBadRequest, "请求参数格式错误", err)
	}

	ips, err := parseIPs(request.IPs)
	if err != nil {
		return apiFail(c, http.StatusBadRequest, err.Error(), nil)
	}

	results := make([]pingResult, len(ips))
	workers := make(chan struct{}, pingWorkers)
	requestContext := c.Request().Context()
	var waitGroup sync.WaitGroup
	for index, ip := range ips {
		waitGroup.Add(1)
		go func(index int, ip string) {
			defer waitGroup.Done()
			workers <- struct{}{}
			defer func() { <-workers }()
			results[index] = checkIP(requestContext, ip)
		}(index, ip)
	}
	waitGroup.Wait()

	return success(c, results)
}

func parseIPs(value string) ([]string, error) {
	items := strings.FieldsFunc(value, func(r rune) bool {
		return unicode.IsSpace(r) || r == ',' || r == ';' || r == '，' || r == '；'
	})
	if len(items) == 0 {
		return nil, errors.New("请输入至少一个 IP 地址")
	}

	ips := make([]string, 0, len(items))
	seen := make(map[string]struct{}, len(items))
	for _, item := range items {
		parsedIP := net.ParseIP(item)
		if parsedIP == nil {
			return nil, errors.New("包含无效 IP 地址: " + item)
		}
		ip := parsedIP.String()
		if _, exists := seen[ip]; exists {
			continue
		}
		seen[ip] = struct{}{}
		ips = append(ips, ip)
		if len(ips) > maxPingIPs {
			return nil, errors.New("单次最多检测 50 个 IP 地址")
		}
	}
	return ips, nil
}

func checkIP(parent context.Context, ip string) pingResult {
	ctx, cancel := context.WithTimeout(parent, pingTimeout)
	defer cancel()

	startedAt := time.Now()
	command, args := pingCommand(ip)
	err := exec.CommandContext(ctx, command, args...).Run()
	duration := time.Since(startedAt).Milliseconds()
	result := pingResult{
		IP:         ip,
		Reachable:  err == nil,
		DurationMS: duration,
	}
	if err == nil {
		return result
	}
	if errors.Is(ctx.Err(), context.DeadlineExceeded) {
		result.Message = "检测超时"
		return result
	}
	if errors.Is(err, exec.ErrNotFound) {
		result.Message = "服务器未安装 ping 命令"
		return result
	}
	result.Message = "目标无响应"
	return result
}

func pingCommand(ip string) (string, []string) {
	switch runtime.GOOS {
	case "windows":
		return "ping", []string{"-n", "1", "-w", "2000", ip}
	case "darwin":
		return "ping", []string{"-c", "1", "-W", "2000", ip}
	default:
		return "ping", []string{"-c", "1", "-W", "2", ip}
	}
}
