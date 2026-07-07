# 我们的胶片册

一个部署在 GitHub Pages、后端使用 Supabase 的双人私密情侣空间。首版包含照片墙、留言板、时间线、纪念日和设置页。

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

没有 Supabase 环境变量时，应用会进入演示模式，方便先查看界面。

## Supabase 设置

1. 创建 Supabase 项目。
2. 在 Authentication 中开启 Email OTP，并把站点 URL 设置为 GitHub Pages 地址；本地开发时加入 `http://localhost:5173`。
3. 如果是 2026-06-03 之后创建的 Supabase 免费项目，需要先在 Authentication -> SMTP Settings 启用自己的 SMTP（例如 QQ 邮箱 SMTP），否则默认邮件服务可能不会使用自定义模板。
4. 在 Authentication -> Email Templates -> Magic Link or OTP 中加入 `{{ .Token }}`，让邮件显示 6 位验证码，并点击页面底部的 Save。示例正文：
   ```html
   <h2>你的登录验证码</h2>
   <p>请输入这个验证码：{{ .Token }}</p>
   <p>验证码会在短时间后过期。如果不是你本人操作，可以忽略这封邮件。</p>
   ```
5. 在 SQL Editor 执行 `supabase/migrations/20260707000000_initial_schema.sql`。
6. 两个人都用邮箱登录一次后，修改并执行 `supabase/seed-members.sql`，把两个人加入同一个 `couple_id`。
7. 前端环境变量使用 publishable key 或 anon key，不要使用 service role key。

## GitHub Pages 部署

1. 将仓库默认分支设为 `main`。
2. 在 GitHub 仓库 Settings -> Secrets and variables -> Actions 添加：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. 在 Settings -> Pages 中选择 GitHub Actions。
4. Push 到 `main` 后，`.github/workflows/deploy.yml` 会构建并发布 `dist`。

应用使用 hash 路由，例如 `#/photos`，所以在 GitHub Pages 刷新子页面不会 404。

## 数据与权限

- `couples`：情侣空间基本信息。
- `couple_members`：两位成员和用户 ID 绑定。
- `photos`：照片元数据，真实图片在 Supabase Storage 的 `couple-photos` 私有 bucket。
- `messages`：留言板。
- `anniversaries`：纪念日。

所有业务表都启用 RLS，并通过 `couple_id` 限制只有成员可读写对应空间的数据。

首页的相恋天数来自 `couples.start_date`，可以在应用的“设置”页自行修改。其他纪念日可以在“纪念日”页新增、删除。
