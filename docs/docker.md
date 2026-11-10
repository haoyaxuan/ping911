# Ping911 Docker 镜像

镜像包含 Go 服务、内嵌的 `ping.html` 页面和 Linux `ping` 命令。服务默认读取镜像内的 `config/config.yaml`，监听 `9110` 端口。

## 构建镜像

在项目根目录执行：

```bash
docker build -t ping911:latest .
```

## 运行容器

```bash
docker run -d \
  --name ping911 \
  --restart unless-stopped \
  --cap-add NET_RAW \
  -p 9110:9110 \
  -v /宿主机绝对路径/config.yaml:/app/config/config.yaml:ro \
  ping911:latest
```

访问：

```text
http://服务器IP:9110/
```

查看运行日志：

```bash
docker logs -f ping911
```

## 使用外部配置

需要配置 API Token、覆盖端口或日志等级时，可以挂载配置文件。容器内配置路径必须保持为 `/app/config/config.yaml`：

```bash
docker run -d \
  --name ping911 \
  --restart unless-stopped \
  --cap-add NET_RAW \
  -p 9110:9110 \
  -v /宿主机绝对路径/config.yaml:/app/config/config.yaml:ro \
  ping911:latest
```

如果修改了配置中的 `address`，需要同时调整 `-p 宿主机端口:容器端口`。

## 验证服务

```bash
curl http://127.0.0.1:9110/

curl -X POST http://127.0.0.1:9110/api/v1/ping-checks \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"ips":"1.1.1.1\n8.8.8.8"}'
```

如果运行环境主动移除了容器的网络能力，必须保留 `NET_RAW`，否则容器内无法发送 ICMP Ping 请求。

## 推送镜像仓库

```bash
docker tag ping911:latest registry.example.com/ping911:latest
docker push registry.example.com/ping911:latest
```
