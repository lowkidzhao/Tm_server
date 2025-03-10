# 服务端

使用 pm2 管理

```bash
# 查看本地安装的 PM2 版本
pnpm exec pm2 --version

# 启动服务（使用你在 package.json 中配置的脚本）
pnpm run win-start
pnpm run linux-start

# 之后查看进程状态
pnpm exec pm2 list

# 测试服务器响应（将地址替换为你的实际地址）
curl http://localhost:3000
```
