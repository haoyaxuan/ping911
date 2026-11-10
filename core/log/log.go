package log

import (
	"context"
	"errors"
	"strings"
	"time"

	logging "github.com/donnie4w/go-logger/logger"
	"gorm.io/gorm/logger"
	"gorm.io/gorm/utils"
)

type Log struct {
}

func NewLogger() *Log {
	l := &Log{}
	return l
}

func SetLevel(level string) {
	switch strings.ToLower(strings.TrimSpace(level)) {
	case "debug":
		logging.SetLevel(logging.LEVEL_DEBUG)
	case "warn":
		logging.SetLevel(logging.LEVEL_WARN)
	case "error":
		logging.SetLevel(logging.LEVEL_ERROR)
	default:
		logging.SetLevel(logging.LEVEL_INFO)
	}
}

func Debugf(format string, data ...interface{}) {
	logging.Debugf(format, data...)
}

func (l *Log) LogMode(level logger.LogLevel) logger.Interface {
	// 不做处理和框架日志等级保持一致
	return nil
}

func (l *Log) Info(ctx context.Context, msg string, data ...interface{}) {
	if data != nil {
		vs := make([]any, 1+len(data))
		vs[0] = msg
		copy(vs[1:], data)
		logging.Info(vs...)
	} else {
		logging.Info(msg)
	}
}
func (l *Log) Warn(ctx context.Context, msg string, data ...interface{}) {
	if data != nil {
		vs := make([]any, 1+len(data))
		vs[0] = msg
		copy(vs[1:], data)
		logging.Warn(vs...)
	} else {
		logging.Warn(msg)
	}
}

func (l *Log) Error(ctx context.Context, msg string, data ...interface{}) {
	if data != nil {
		vs := make([]any, 1+len(data))
		vs[0] = msg
		copy(vs[1:], data)
		logging.Error(vs...)
	} else {
		logging.Error(msg)
	}
}

func (l *Log) Trace(ctx context.Context, begin time.Time, fc func() (sql string, rowsAffected int64), err error) {
	elapsed := time.Since(begin)
	switch {
	case err != nil && !errors.Is(err, logger.ErrRecordNotFound):
		sql, rows := fc()
		if rows == -1 {
			logging.Error(utils.FileWithLineNum(), err, float64(elapsed.Nanoseconds())/1e6, "-", sql)
		} else {
			logging.Error(utils.FileWithLineNum(), err, float64(elapsed.Nanoseconds())/1e6, rows, " ", sql)
		}
	default:
		sql, rows := fc()
		if rows == -1 {
			logging.Debug(utils.FileWithLineNum(), " ", float64(elapsed.Nanoseconds())/1e6, "-", sql)
		} else {
			logging.Debug(utils.FileWithLineNum(), " ", float64(elapsed.Nanoseconds())/1e6, rows, " ", sql)
		}
	}
}
