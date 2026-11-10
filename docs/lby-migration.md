# LBY 功能迁移说明

## 页面

- `GET /lb/{queryId}`

访问令牌直接放在页面 URL 中，不提供手工输入弹窗。页面会自动将 `queryId` 作为接口的 `Authorization` 请求头。

页面支持访问令牌校验、实例查询、分页加载、自动刷新、深色模式、重启、换 IP、开启端口、22 端口检测、备注更新、管理员批量导出和到期时间修正。

## 接口

接口前缀为 `/lb/lightsail`，请求头使用 `Authorization: {queryId}`。

- `POST /profile`
- `POST /code`
- `POST /page`
- `POST /detail`
- `POST /restart`
- `POST /openport`
- `POST /changeIp`
- `POST /editRemark`
- `POST /fixOutTime`
- `POST /checkNet`

非管理员令牌优先通过本地 `aws_lightsail_instance.query_id` 校验，没有本地记录时再通过 LBY 分组数据校验。管理员令牌使用 `lby.token`。

## 配置

沿用项目配置中的 `lby` 节点：

```yaml
lby:
  user: "..."
  url: "https://example.com/login.php"
  token: "..."
  channel-id: 31
```

敏感字段不在代码中写死。

## 数据库

列表沿用 Java 工程的本地优先逻辑：先查询 `aws_lightsail_instance` 及最新一条 `aws_lightsail_traffic`，当前页剩余位置再补充远端 LBY 实例。本地实例到期时间修正会更新 `aws_lightsail_instance.expired_days`；远端 LBY 实例沿用 `lby_lightsail_fix` 表，若目标数据库没有该表，执行 [lby_lightsail_fix.sql](./lby_lightsail_fix.sql)。

## 实现差异

- 重启和更换 IP 接口通过 Redis List `aws-panel:lby:instance-action` 异步排队，接口成功表示任务已进入队列。
- 路由初始化时启动一个消费者协程。消费者按 `sid + query_id` 查询 `aws_lightsail_instance`：本地记录存在时关联 `aws_tenant` 调用 AWS Lightsail，不存在时调用远端 LBY。
- 本地更换 IP 成功后会同步公网 IP、私网 IP、IPv6、实例状态和换 IP 次数；操作失败会记录失败状态及错误信息。
- 本地 AWS 更换 IP 成功后会写入 `aws_lightsail_change_ip_log`，日志包含新旧 IP；远端 LBY 更换 IP 不写操作记录。
- 编辑备注时先按 `sid + query_id` 查询本地实例；存在时直接更新 `aws_lightsail_instance.note`，不存在时才调用远端 LBY。数据库查询异常不会降级调用 LBY。
- 详情接口按实例 ID 或公网 IP 优先查询本地实例，点查包含已过期记录；到期时间修正也会先区分本地 AWS 实例和远端 LBY 实例。
- 面板分页和详情响应中的密码统一显示为 `******`，不向页面返回明文密码。
- 分页接口保留 `id` 和 `publicIpAddress` 精确筛选，分页与详情成功响应包含 `message`，时间字段按 `yyyy-MM-dd HH:mm:ss` 输出。
- 数据库查询异常时任务直接失败并记录日志，不会将可能属于本地实例的 ID 发送给远端 LBY。
- 网络检测使用服务端 TCP 连接目标实例的 22 端口，不依赖 Java 工程中带密钥的第三方检测接口。
