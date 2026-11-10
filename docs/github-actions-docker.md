# 使用 GitHub Actions 构建 Docker 镜像

项目中的 `.github/workflows/build-docker-image.yml` 会在 GitHub 服务器上构建镜像，并生成可以下载的 Docker 镜像包。服务器只需要安装 Docker，不需要安装 Go 或拉取项目源码。

## 1. 提交工作流到 GitHub

```bash
git add Dockerfile compose.yaml .dockerignore .github/workflows/build-docker-image.yml docs
git commit -m "ci: add Docker image build workflow"
git push
```

## 2. 手动构建镜像

先登录服务器确认 CPU 架构：

```bash
uname -m
```

- 输出 `x86_64` 时选择 `linux/amd64`。
- 输出 `aarch64` 或 `arm64` 时选择 `linux/arm64`。

1. 打开 GitHub 仓库。
2. 进入 `Actions`。
3. 在左侧选择 `Build Docker image`。
4. 点击 `Run workflow`。
5. 根据服务器 CPU 选择平台，然后开始构建：
   - 普通 Intel/AMD Linux 服务器选择 `linux/amd64`。
   - ARM Linux 服务器选择 `linux/arm64`。
6. 等待工作流完成。
7. 打开本次运行记录，在 `Artifacts` 区域下载 `ping911-...`。

下载得到的是 ZIP 文件，解压后包含：

```text
ping911-sha-xxxxxxx-amd64.tar
ping911-sha-xxxxxxx-amd64.tar.sha256
compose.yaml
config.yaml
```

部署前编辑下载得到的 `config.yaml`，填写一个随机且足够长的 Token：

```yaml
token: "替换为你的随机Token"
```

## 3. 使用版本标签自动构建

推送以 `v` 开头的 Git 标签时也会自动构建：

```bash
git tag v1.0.0
git push origin v1.0.0
```

生成的文件名类似：

```text
ping911-v1.0.0-amd64.tar
```

## 4. 上传镜像到服务器

先在本地验证文件是否完整：

```bash
sha256sum -c ping911-sha-xxxxxxx-amd64.tar.sha256
```

上传到服务器：

```bash
ssh root@服务器IP "mkdir -p /opt/ping911"
scp ping911-sha-xxxxxxx-amd64.tar compose.yaml config.yaml root@服务器IP:/opt/ping911/
```

也可以使用 SFTP、宝塔面板或其他文件上传工具。

## 5. 在服务器导入镜像

登录服务器后执行：

```bash
cd /opt/ping911
docker load -i ping911-sha-xxxxxxx-amd64.tar
docker images ping911
```

导入后会存在两个标签：

```text
ping911:latest
ping911:sha-xxxxxxx
```

使用版本标签构建时，第二个标签为 `ping911:v1.0.0`。

## 6. 使用 Docker Compose 启动

登录服务器后启动：

```bash
cd /opt/ping911
docker compose up -d
```

检查容器：

```bash
docker compose ps
docker compose logs -f ping911
```

浏览器访问：

```text
http://服务器IP:9110/
```

服务器安全组和防火墙需要允许外部访问 TCP `9110` 端口。

## 7. 更新服务器镜像

下载并上传新的镜像包后执行：

```bash
docker load -i ping911-v1.0.1-amd64.tar
docker compose up -d --force-recreate
```

确认新容器正常运行后，可以清理不再使用的旧镜像：

```bash
docker image prune
```
