package config

import (
	"fmt"
	"os"
	"time"

	"gopkg.in/yaml.v3"
)

var cfg *Config

type Config struct {
	Address string   `yaml:"address"`
	Logging *Logging `yaml:"logging"`
	Token   string   `yaml:"token"`
}

type Logging struct {
	Level string `yaml:"level"`
	File  string `yaml:"file"`
}

type Telegram struct {
	Token  string `yaml:"token"`
	ChatID string `yaml:"chat_id"`
}

type PushPlus struct {
	URL   string `yaml:"url"`
	Token string `yaml:"token"`
}

type AWS struct {
	OperationTimeout time.Duration `yaml:"operation_timeout"`
	PollInterval     time.Duration `yaml:"poll_interval"`
	Workers          int           `yaml:"workers"`
	InstanceSyncCron string        `yaml:"instance_sync_cron"`
	QuotaSyncCron    string        `yaml:"quota_sync_cron"`
}

type LBY struct {
	User      string `yaml:"user"`
	URL       string `yaml:"url"`
	Token     string `yaml:"token"`
	ChannelID int    `yaml:"channel-id"`
}

func Init() {
	const path = "./config/config.yaml"
	if cfg != nil {
		return
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		panic(fmt.Sprintf("读取配置文件 %s 失败: %v", path, err))
	}
	cfg = &Config{}
	if err = yaml.Unmarshal(raw, cfg); err != nil {
		panic(fmt.Sprintf("解析配置文件 %s 失败: %v", path, err))
	}
	defaults()
}

func defaults() {
	if cfg.Address == "" {
		cfg.Address = "8080"
	}
	if cfg.Logging == nil {
		cfg.Logging = &Logging{Level: "info", File: "./logs/g2aws.log"}
	}
}

func Address() string { return cfg.Address }
func Log() *Logging   { return cfg.Logging }
func Token() string   { return cfg.Token }

type LogLevel string

const (
	Debug LogLevel = "debug"
	Info  LogLevel = "info"
	Warn  LogLevel = "warn"
	Error LogLevel = "error"
)

func GetLogLevel() LogLevel {
	if cfg.Logging.Level == "" {
		return Info
	}
	return LogLevel(cfg.Logging.Level)
}
