# LBY 面板

- 页面地址：`/lb/{token}`
- 管理员：路径 Token 与配置项 `lby.token` 完全一致
- 用户：远端实例的 `groupId` 按 `@` 分割后，前缀与路径 Token 完全一致
- 无效 Token 返回 HTTP 401；LBY 配置不完整或远端校验失败返回 HTTP 503
- 页面模板与静态资源迁移自 `j2web/src/main/resources/templates/lb/index.html`

面板业务接口统一使用 `/lb/lightsail` 前缀。
