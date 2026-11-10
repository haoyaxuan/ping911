# AWS Lightsail 工具

代码位于 core/aws/lightsail，仅封装当前面板需要的 Lightsail 操作。

## 能力

- 静态凭证、默认凭证链和 HTTP 代理客户端
- 重启实例
- 更换实例 IP
- 打开全部公网端口

## 创建客户端

~~~go
client, err := lightsail.NewClient(ctx, lightsail.Options{
    AccessKeyID:     accessKey,
    SecretAccessKey: secretKey,
    Region:          "us-east-1",
    Proxy:           "host:port:user:password",
})
~~~

不传 AccessKeyID 和 SecretAccessKey 时使用 AWS 默认凭证链。Proxy 也支持完整代理 URL。

## 常用调用

~~~go
operations, err := client.RebootInstance(ctx, "instance-name")
operation, err := client.OpenAllPublicPorts(ctx, "instance-name")
instance, err := client.ChangeIP(ctx, lightsail.ChangeIPInput{
    InstanceName: "instance-name",
    Timeout:      60 * time.Second,
})
~~~

更换 IP 固定通过停止实例、等待 stopped、启动实例、等待 running 完成。
