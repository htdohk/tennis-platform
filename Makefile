.PHONY: up down logs build backup restore migrate ps restart

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

build:
	docker compose build

ps:
	docker compose ps

restart:
	docker compose restart

# 备份数据库
backup:
	@mkdir -p backups
	docker compose exec postgres pg_dump -U $${POSTGRES_USER:-dev} $${POSTGRES_DB:-tennis} > backups/backup-$$(date +%Y%m%d-%H%M%S).sql
	@echo "Backup saved to backups/"

# 恢复数据库（需要指定备份文件路径，如 make restore FILE=backups/backup-xxx.sql）
restore:
	docker compose exec -T postgres psql -U $${POSTGRES_USER:-dev} $${POSTGRES_DB:-tennis} < $(FILE)

# 执行数据库迁移
migrate:
	docker compose exec api npx prisma migrate deploy --schema=prisma/schema.prisma

# 停止所有服务
stop:
	docker compose stop

# 清理（停止并删除容器、网络，保留数据卷）
clean:
	docker compose down

# 完全清理（删除数据卷，注意数据会丢失）
clean-all:
	docker compose down -v
