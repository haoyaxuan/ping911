# Ping911 ICMP 检测

## 页面

- `GET /`
- `GET /ping`

页面支持在一个多行输入框中按换行、空格、逗号或分号输入多个 IPv4/IPv6 地址。

## 接口

`POST /api/ping`

请求体：

```json
{
  "ips": "1.1.1.1\n8.8.8.8"
}
```

服务端会校验并去重 IP，单次最多检测 50 个地址。检测通过操作系统 `ping` 命令发送 ICMP 请求，单个地址的超时时间为 3 秒。

响应数据：

```json
{
  "status": true,
  "statusCode": "200",
  "data": [
    {
      "ip": "1.1.1.1",
      "reachable": true,
      "durationMs": 24
    }
  ]
}
```

部署环境需要安装 `ping` 命令，并允许运行服务的系统用户发送 ICMP 请求。
