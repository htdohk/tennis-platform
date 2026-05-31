# 网球场地预订平台 - 部署文档

## 系统要求

- **Docker** 24+（含 Docker Compose v2）
- **内存** 4GB+ RAM
- **磁盘** 20GB 可用空间
- **操作系统** Linux（推荐）/ macOS（开发测试）

## 快速开始

```bash
# 1. 克隆项目
git clone <your-repo-url> tennis-platform
cd tennis-platform

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，至少修改：
#   - JWT_SECRET / SESSION_SECRET（生成随机字符串）
#   - MCP_INTERNAL_TOKEN（生成随机字符串）
#   - PUBLIC_WEB_BASE_URL（改为你的域名）
#   - NEXT_PUBLIC_API_BASE_URL（改为你的域名 + /api）
vim .env

# 3. 构建并启动
docker compose up -d

# 4. 等待所有服务 ready（约 30 秒）
docker compose ps
# 所有服务状态应为 "healthy" 或 "Up"

# 5. 访问
#    C 端网站：http://your-domain/
#    管理后台：http://your-domain/admin/
```

## 环境变量说明

| 变量 | 说明 | 示例值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接串，Docker 中 host 为 `postgres` | `postgresql://dev:dev@postgres:5432/tennis` |
| `REDIS_URL` | Redis 连接串，Docker 中 host 为 `redis` | `redis://redis:6379` |
| `POSTGRES_DB` | 数据库名 | `tennis` |
| `POSTGRES_USER` | 数据库用户 | `dev` |
| `POSTGRES_PASSWORD` | 数据库密码 | 改成你自己的 |
| `JWT_SECRET` | JWT 签名密钥 | 随机 32+ 位字符串 |
| `JWT_EXPIRES_IN` | JWT 过期时间 | `7d` |
| `SESSION_SECRET` | Session 加密密钥 | 随机 32+ 位字符串 |
| `BRAND_NAME` | 场馆品牌名 | `XX网球馆` |
| `PUBLIC_WEB_BASE_URL` | C 端外网地址 | `https://tennis.example.com` |
| `NEXT_PUBLIC_API_BASE_URL` | 前端访问 API 地址 | `https://tennis.example.com/api` 或 `http://api:3000` |
| `NEXT_PUBLIC_BRAND_NAME` | 前端显示品牌名 | `XX网球馆` |
| `MCP_INTERNAL_TOKEN` | MCP Server 认证 Token | 随机长字符串 |
| `INTERNAL_API_BASE_URL` | MCP 访问 API 地址 | `http://api:3000` |
| `BUSINESS_LLM_*` | LLM 配置（可选） | 见 .env.example |
| `LOG_LEVEL` | 日志级别 | `info` |
| `NODE_ENV` | 运行环境 | `production` |

> **关于 NEXT_PUBLIC_* 变量**：这些变量在 Docker build 时注入到 Next.js 前端，而非运行时读取 `.env`。
> 修改后需重新 `docker compose build --no-cache web-admin web-customer` 才能生效。
>
> `NEXT_PUBLIC_API_BASE_URL` 填 API 的**外网**地址（如 `https://your-domain.com/api`），因为 Next.js 代码在浏览器端执行。

## 常用命令

| 命令 | 说明 |
|------|------|
| `make up` | 启动所有服务 |
| `make down` | 停止所有服务 |
| `make logs` | 查看实时日志 |
| `make ps` | 查看服务运行状态 |
| `make restart` | 重启所有服务 |
| `make build` | 重新构建所有镜像 |
| `make backup` | 备份数据库到 `backups/` 目录 |
| `make migrate` | 执行数据库迁移 |

等效 Docker Compose 命令：

```bash
docker compose up -d          # 启动
docker compose down           # 停止
docker compose logs -f        # 日志
docker compose ps             # 状态
docker compose restart        # 重启
docker compose build          # 构建
```

## 数据备份与恢复

### 备份数据库

```bash
# 使用 Makefile
make backup
# 备份文件保存在 backups/backup-YYYYMMDD-HHMMSS.sql

# 手动备份
docker compose exec postgres pg_dump -U dev tennis > backup.sql
```

### 恢复数据库

```bash
# 使用 Makefile
make restore FILE=backups/backup-20260530-120000.sql

# 手动恢复
docker compose exec -T postgres psql -U dev tennis < backup.sql
```

### 定时备份（crontab）

```bash
# 每天凌晨 2 点备份
0 2 * * * cd /path/to/tennis-platform && make backup
```

## 升级流程

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 重新构建镜像并重启
docker compose up -d --build

# 3. 检查服务状态
docker compose ps
docker compose logs -f api | head -20
```

> 如果数据库 schema 有变更，API 容器启动时会自动执行 `prisma migrate deploy`，无需手动操作。

## 架构说明

```
                    ┌──────────────┐
                    │   Nginx:80   │
                    └──────┬───────┘
           ┌───────────────┼───────────────┐
           │               │               │
    /      │        /admin │        /api/  │
           │               │               │
  ┌────────▼──┐  ┌────────▼──┐  ┌────────▼──┐
  │web-customer│  │ web-admin │  │    api     │
  │   :3003   │  │   :3001   │  │   :3000    │
  └───────────┘  └───────────┘  └──┬─────┬───┘
                                   │     │
                            ┌──────▼┐ ┌──▼───┐
                            │postgres│ │redis │
                            │  :5432 │ │ :6379│
                            └────────┘ └──────┘
```

## 常见问题

### 端口被占用

```bash
# 查看 80 端口占用
lsof -i :80
# 修改 docker-compose.yml 中 nginx 的 ports 为其他端口，如 8080:80
```

### 数据库连接失败

```bash
# 检查 postgres 容器状态
docker compose logs postgres
# 确认 .env 中 DATABASE_URL 的 host 为 postgres（非 localhost）
```

### 前端页面空白

```bash
# 检查 NEXT_PUBLIC_API_BASE_URL 配置
# Docker 中前端容器无法访问 localhost:3000（容器间需要 service 名称）
# 如果通过 nginx 反向代理：填 /api
# 如果直连：填 http://api:3000
docker compose logs web-customer
```

### 数据库迁移未执行

```bash
# 手动执行迁移
docker compose exec api npx prisma migrate deploy --schema=prisma/schema.prisma
# 或
make migrate
```

### 重置所有数据

```bash
# 删除所有容器和数据卷
docker compose down -v
# 重新启动（会自动创建新的数据库和迁移）
docker compose up -d
```

### 查看某个服务的日志

```bash
docker compose logs api         # API 日志
docker compose logs nginx        # Nginx 日志
docker compose logs postgres     # 数据库日志
```

## 远程服务器部署

当目标服务器已有 PostgreSQL 和 Redis 服务时（如通过 1Panel 管理），使用 `docker-compose.prod.yml` 部署应用层即可。

### 部署步骤

```bash
# 1. 在远程服务器上拉取项目
git clone <your-repo-url> tennis-platform
cd tennis-platform

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，指向你的外部数据库和 Redis：
#   DATABASE_URL=postgresql://user:pass@your-pg-host:5432/tennis
#   REDIS_URL=redis://:password@your-redis-host:6379
#   JWT_SECRET=<随机字符串>
#   MCP_INTERNAL_TOKEN=<随机字符串>
vim .env

# 3. 使用生产配置启动（不含 postgres/redis 容器）
docker compose -f docker-compose.prod.yml up -d

# 4. 检查服务状态
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs api | head -20
```

### .env 关键配置（远程服务器）

```bash
# 外部数据库（由 1Panel 或其他方式管理）
DATABASE_URL=postgresql://tennis_user:your_password@192.168.1.100:5432/tennis
REDIS_URL=redis://:your_redis_password@192.168.1.100:6379

# 安全密钥（务必生成随机字符串）
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
MCP_INTERNAL_TOKEN=$(openssl rand -base64 32)

# 域名配置
PUBLIC_WEB_BASE_URL=https://tennis.your-domain.com
NEXT_PUBLIC_API_BASE_URL=https://tennis.your-domain.com/api
```

### 1Panel 面板配置说明（占位）

> 以下步骤待实际部署时补充。

1. 在 1Panel 中创建 PostgreSQL 数据库 `tennis` 和用户
2. 在 1Panel 中确认 Redis 连接信息
3. 将 `DATABASE_URL` 和 `REDIS_URL` 填入 `.env`
4. 如果使用 1Panel 的 Nginx 反向代理，可禁用 `docker-compose.prod.yml` 中的 nginx 服务，改为在 1Panel 中配置反向代理规则
5. 启动应用容器后，在 1Panel 的容器管理中监控运行状态

### 镜像推送（Docker Hub）

```bash
# 构建并标记镜像
docker compose build

# 推送到 Docker Hub
docker push your-dockerhub-username/tennis-platform-api:latest
docker push your-dockerhub-username/tennis-platform-web-admin:latest
docker push your-dockerhub-username/tennis-platform-web-customer:latest
docker push your-dockerhub-username/tennis-platform-mcp-server:latest
```

推送后，远程服务器可直接拉取镜像，无需重新构建：

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```
