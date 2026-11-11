# Ping911 REST API 接口文档

## 1. 接口概述

Ping911 REST API 用于批量检测 IPv4 或 IPv6 地址的 ICMP 网络可达性。

| 项目 | 内容 |
| --- | --- |
| 接口名称 | 批量创建 Ping 检测 |
| 请求方法 | `POST` |
| 接口路径 | `/api/v1/ping-checks` |
| 兼容路径 | `/api/ping` |
| 请求格式 | `application/json` |
| 鉴权方式 | Bearer Token |
| 单次上限 | 50 个去重后的 IP 地址 |

接口不会保存检测任务或检测结果，请求完成后直接返回本次检测结果。

## 2. 服务地址

默认服务地址：

```text
http://服务器IP:9110
```

完整接口地址：

```text
http://服务器IP:9110/api/v1/ping-checks
```

生产环境建议通过 HTTPS 反向代理访问，避免 Token 在明文网络中传输。

## 3. Token 配置

服务端 Token 读取自 `config/config.yaml` 的顶层 `token`：

```yaml
token: "替换为随机且足够长的Token"
```

Docker Compose 部署时，配置文件挂载路径为：

```text
/app/config/config.yaml
```

不要将真实 Token 提交到公开代码仓库或写入客户端源码。

Web 页面在首次鉴权成功后，会将 Token 保存到当前浏览器的 `localStorage`，刷新或重新打开页面时自动回填。清空 Token 输入框或接口返回 HTTP `401` 时，页面会删除已保存的 Token。共享设备上不建议使用此功能，浏览器本地存储也不能替代 HTTPS。

## 4. 请求鉴权

请求必须携带 `Authorization` 请求头：

```http
Authorization: Bearer <token>
```

完整请求头示例：

```http
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

Token 缺失、格式错误或与服务端配置不一致时，接口返回 HTTP `401`。

## 5. 请求参数

### 请求体

```json
{
  "ips": "1.1.1.1\n8.8.8.8"
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `ips` | string | 是 | 一个或多个 IPv4/IPv6 地址 |

多个 IP 地址可以使用以下字符分隔：

- 换行
- 空格或制表符
- 英文逗号 `,`
- 英文分号 `;`
- 中文逗号 `，`
- 中文分号 `；`

服务端会自动删除重复 IP。去重后最多允许 50 个 IP 地址；只要其中一个地址格式无效，整个请求都会返回 HTTP `400`。

## 6. 成功响应

HTTP 状态码：`200 OK`

```json
{
  "status": true,
  "statusCode": "200",
  "data": [
    {
      "ip": "1.1.1.1",
      "reachable": true,
      "durationMs": 24
    },
    {
      "ip": "192.0.2.1",
      "reachable": false,
      "durationMs": 2005,
      "message": "目标无响应"
    }
  ]
}
```

### 响应字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `status` | boolean | 请求是否成功 |
| `statusCode` | string | HTTP 状态码的字符串形式 |
| `data` | array | Ping 检测结果列表 |
| `data[].ip` | string | 标准化后的 IP 地址 |
| `data[].reachable` | boolean | `true` 表示 Ping 成功 |
| `data[].durationMs` | integer | 检测耗时，单位为毫秒 |
| `data[].message` | string | 检测失败原因，成功时不返回 |

可能出现的检测失败原因：

| message | 说明 |
| --- | --- |
| `检测超时` | 检测超过服务端超时时间 |
| `服务器未安装 ping 命令` | 部署环境缺少系统 `ping` 命令 |
| `目标无响应` | Ping 命令执行失败或目标未响应 |

单个 IP 的服务端检测超时时间为 3 秒，接口最多并发检测 10 个 IP。

## 7. 错误响应

### 7.1 请求参数错误

HTTP 状态码：`400 Bad Request`

```json
{
  "status": false,
  "statusCode": "400",
  "message": "包含无效 IP 地址: example.com"
}
```

可能的错误信息：

- `请求参数格式错误`
- `请输入至少一个 IP 地址`
- `包含无效 IP 地址: <输入值>`
- `单次最多检测 50 个 IP 地址`

### 7.2 Token 无效或缺失

HTTP 状态码：`401 Unauthorized`

响应头：

```http
WWW-Authenticate: Bearer realm="ping911"
```

响应体：

```json
{
  "status": false,
  "statusCode": "401",
  "message": "Token 无效或缺失"
}
```

### 7.3 服务端未配置 Token

HTTP 状态码：`503 Service Unavailable`

```json
{
  "status": false,
  "statusCode": "503",
  "message": "API Token 未配置"
}
```

## 8. curl 调用示例

### 检测单个 IP

```bash
curl -X POST 'http://127.0.0.1:9110/api/v1/ping-checks' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"ips":"1.1.1.1"}'
```

### 检测多个 IP

```bash
curl -X POST 'http://127.0.0.1:9110/api/v1/ping-checks' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"ips":"1.1.1.1\n8.8.8.8\n2606:4700:4700::1111"}'
```

## 9. JavaScript 调用示例

```javascript
const response = await fetch('http://127.0.0.1:9110/api/v1/ping-checks', {
    method: 'POST',
    headers: {
        Authorization: 'Bearer YOUR_TOKEN',
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        ips: '1.1.1.1\n8.8.8.8'
    })
});

const result = await response.json();
console.log(result);
```

## 10. 部署要求

- Linux 部署环境必须安装 `ping` 命令。
- Docker 容器必须保留 `NET_RAW` 能力。
- Docker Compose 配置需要包含 `cap_add: NET_RAW`。
- 对外提供服务时，需要在安全组或防火墙开放实际监听端口。
