# Lightsail 面板

- 页面地址：`/ls/{queryId}`
- 页面模板复刻自 `j2web/src/main/resources/templates/lightsail/index.html`
- 页面通过 `Authorization` 请求头传递路径中的 `queryId`
- 实例数据只查询本地 `aws_lightsail_instance`，不会补充远端 LBY 数据
- 列表响应不查询、不返回 SSH 密码字段

## 接口

- `GET /code?type={type}`：查询页面字典
- `GET /aws/lightsail/states`：查询实例状态字典
- `POST /aws/lightsail/list`：分页查询实例
- `PUT /aws/lightsail/restart`：提交重启任务
- `PUT /aws/lightsail/changeIp`：提交更换 IP 任务
- `PUT /aws/lightsail/off`：提交关机任务
- `PUT /aws/lightsail/start`：提交开机任务
- `PUT /aws/lightsail/note`：更新备注

`/aws/lightsail/*` 与 `/lb/lightsail/*` 为两套独立接口；实例操作共用后台 AWS 操作队列。

列表支持按实例 ID、公网 IP 和备注筛选；备注条件对 `aws_lightsail_instance.note` 做模糊匹配。
