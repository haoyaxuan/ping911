# LBY Client 入参说明

`core/lby.Client` 负责调用远端 LBY 接口，认证信息统一读取 `config.yaml` 的 `lby` 节点，业务代码不传递远端账号和令牌。

## 分页

方法：`Page(ctx, PageRequest)`

| 字段 | 远端参数 | 说明 |
| --- | --- | --- |
| `Offset` | `offset` | 可选；未传时不发送 |
| `Limit` | `limit` | 可选；未传时不发送 |
| `Keyword` | `search` | 自动移除 `#` |
| `ID` | `filter.id` | 操作符为 `=` |
| `PublicIPAddress` | `filter.publicIpAddress` | 操作符为 `IN`，支持多行 IP |
| `Remark` | `filter.remark` | 操作符为 `LIKE` |
| `GroupName` | `filter.groups.name` | 管理员分组模糊查询 |
| `QueryID` | `filter.groups.name` | 自动追加 `@`，优先级高于 `GroupName` |

本地分页归一化使用 `NormalizePage`：默认每页 10 条，最大 100 条，负数偏移量按 0 处理。

## 详情

方法：`Detail(ctx, DetailRequest)`

支持 `ID`、`PublicIPAddress` 和 `QueryID`，内部固定使用 `offset=0&limit=1` 调用分页接口。

## 实例操作

- `Restart(ctx, ActionRequest)`
- `OpenPort(ctx, ActionRequest)`
- `ChangeIP(ctx, ActionRequest)`

`ActionRequest.IDs` 对应远端 `ids`，保留批量 ID 字符串语义。重启和开放端口将 `ids` 放在 URL 路径中，更换 IP 使用表单参数 `ids`。

## 更新备注

方法：`EditRemark(ctx, EditRemarkRequest)`

- `IDs`：远端实例 ID 字符串。
- `Remark`：表单字段 `row[remark]`。

## 字典

方法：`Code(ctx)`

远端参数 `channel_id` 读取 `lby.channel-id`，结果使用进程内缓存保存 24 小时。

LBY 业务接口统一使用 `/lb/lightsail` 前缀。

## Debug 日志

`core/lby/client.go` 会记录两类 Debug 日志：

- `[LBY Client]`：记录 `Page`、`Detail`、`Code`、重启、开端口、换 IP 和编辑备注的方法级入参与出参。
- `[LBY HTTP]`：记录最终 HTTP method、URL、header、query、body、状态码、耗时和远端响应。

日志会递归脱敏 Authorization、Token、Password、Secret、Cookie、QueryID 和 GroupName 等敏感字段。
