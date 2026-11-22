# Hướng dẫn Triển khai & Vận hành (Docker Local / VPS 1 máy)

Tài liệu này mô tả cách dựng, cấu hình biến môi trường, nâng cấp, và sao lưu/khôi phục dữ liệu (PostgreSQL + volume ảnh upload `ky-uploads`) cho **NomadDesk** bằng Docker Compose trên máy local hoặc một VPS Linux độc lập.

---

## 1. Yêu cầu hạ tầng

- **Docker Engine** ≥ 24 và **Docker Compose v2** (`docker compose version`).
- RAM tối thiểu 2 GB (khuyến nghị 4 GB để build Next.js 16 + `sharp` mượt mà).
- Các cổng mặc định trên host (có thể chỉnh trong `docker-compose.yml` hoặc đặt sau Nginx/Caddy reverse proxy khi đưa lên VPS):
  - `3288`: Web app Next.js (`nomaddesk_web`)
  - `55188`: PostgreSQL 17 (`nomaddesk_db`) — trên VPS nên không public ra ngoài hoặc chỉ bind `127.0.0.1:55188:5432`
  - `18188` / `11188`: Mailpit Web UI / SMTP (`nomaddesk_mailpit`) — chỉ dùng local/staging

---

## 2. Biến môi trường

Tham khảo file mẫu [.env.example](../.env.example) và [web/.env.example](../web/.env.example).

| Biến | Bắt buộc | Giá trị mặc định trong `docker-compose.yml` | Ghi chú |
| --- | --- | --- | --- |
| `DATABASE_URL` | Có | `postgres://postgres:postgres@db:5432/nomaddesk` | Kết nối Postgres 17 (host dev dùng `@localhost:55188/nomaddesk`). |
| `NEXTAUTH_SECRET` | Có | `nomaddesk_jwt_secret_dev` | Khóa ký JWT chính được `web/lib/auth/config.ts` đọc trực tiếp. **Bắt buộc thay bằng chuỗi ngẫu nhiên ≥ 32 byte (`openssl rand -base64 32`) khi chạy trên VPS** (nếu bỏ trống sẽ rơi về chuỗi dev mặc định). |
| `AUTH_SECRET` | Có | `nomaddesk_jwt_secret_dev` | Khóa chuẩn Auth.js v5; luôn đặt **trùng giá trị với `NEXTAUTH_SECRET`**. |
| `NEXTAUTH_URL` | Có | `http://localhost:3288` | Origin công khai của web (vd `https://nomaddesk.example.com` khi lên VPS). |
| `AUTH_TRUST_HOST` | Khuyến nghị | `true` | Cần thiết khi chạy sau reverse proxy hoặc trong Docker container. |
| `UPLOAD_DIR` | Có | `/app/web/.data/uploads` | Thư mục lưu file WebP đã xử lý, gắn trực tiếp vào named volume `ky-uploads`. Khi chạy dev trên host mặc định là `./.data/uploads`. |
| `SMTP_HOST` / `SMTP_PORT` | Tùy chọn | `mailpit` / `1025` | Máy chủ SMTP gửi email thông báo (đặt phòng, reset mật khẩu, liên hệ). |
| `SMTP_FROM` | Tùy chọn | `NomadDesk <noreply@nomaddesk.com>` | Địa chỉ người gửi email. |
| `PORT` / `HOSTNAME` | Có | `3288` / `0.0.0.0` | Cổng lắng nghe của server Next.js bên trong container. |

> Không commit file `.env`, `.env.local` chứa mật khẩu/secret thật lên git.

---

## 3. Khởi chạy lần đầu & Nâng cấp

### Khởi chạy sạch lần đầu

```sh
docker compose up -d --build --wait
```

Container `web` chạy chuỗi lệnh khởi động `node dist/db/migrate.js && node dist/db/seed.js && exec npm start` (bản JS dựng sẵn từ `npm run db:build-scripts` lúc build image; image không kèm devDependencies nên không có `tsx`):
- `db:migrate`: áp dụng toàn bộ migration Drizzle (`web/drizzle/migrations/`), bao gồm extension `btree_gist` và bảng `media`.
- `db:seed`: chỉ chèn dữ liệu mẫu khi chưa tồn tại (**insert-if-missing**, không ghi đè nội dung đã chỉnh sửa).
- Healthcheck container kiểm tra `http://127.0.0.1:3288/` cho đến khi `healthy`.

### Kiểm tra sau khi khởi động

```sh
# 1. Trạng thái container phải đều healthy / running
docker compose ps

# 2. Xác minh 14 bảng seed
docker compose exec web node dist/db/verify-seed.js

# 3. Kiểm tra trang web phản hồi HTTP 200
curl -I http://localhost:3288/
```

### Cập nhật phiên bản mới (KHÔNG mất dữ liệu)

```sh
# Rebuild & restart container mà KHÔNG đụng volume
docker compose up -d --build --wait
```

> **Tuyệt đối không chạy `docker compose down -v` trên môi trường có dữ liệu thật.** Cờ `-v` sẽ xóa cả volume PostgreSQL (`nomaddesk_postgres_data`) lẫn volume ảnh upload (`nomaddesk_ky-uploads`).

---

## 4. Lưu trữ ảnh upload & Độ bền qua restart

- Trong `docker-compose.yml`, dự án khai báo `name: nomaddesk` và named volume `ky-uploads` gắn vào `/app/web/.data/uploads` (tên volume đầy đủ trên Docker host là `nomaddesk_ky-uploads`).
- Container `web` chạy dưới user không phải root (`USER node`, UID `1000`); `web/Dockerfile` tạo sẵn `/app/web/.data/uploads` thuộc sở hữu `node:node`.
- Khi `docker compose restart web` hoặc `docker compose up -d --build`, toàn bộ file `/uploads/<32-hex>.webp` trong volume `nomaddesk_ky-uploads` và metadata trong bảng `media` đều được bảo toàn nguyên vẹn.
- **Chính sách dọn rác ảnh:** Việc gỡ ảnh khỏi một căn hộ, bài viết hoặc thành phố không tự xóa file đĩa để tránh làm vỡ ảnh dùng chung ở nơi khác. Quản trị viên chủ động dọn các ảnh không còn tham chiếu tại `/admin/media` (`DELETE /api/media/[id]`); server tự kiểm tra 6 bảng tham chiếu và chặn bằng `409 Conflict` nếu ảnh vẫn đang dùng.

---

## 5. Backup & Restore

### 5.1 Backup PostgreSQL

```sh
mkdir -p backups
docker compose exec -T db pg_dump -U postgres -d nomaddesk --clean --if-exists \
  > "backups/nomaddesk_db_$(date +%Y%m%d_%H%M%S).sql"
```

### 5.2 Restore PostgreSQL

Dừng `web` trước khi khôi phục để tránh kết nối đang mở khóa bảng, và bật `ON_ERROR_STOP=1` để dừng ngay nếu file SQL lỗi:

```sh
docker compose stop web

# Thay tên file backup tương ứng
cat backups/nomaddesk_db_YYYYMMDD_HHMMSS.sql \
  | docker compose exec -T db psql -v ON_ERROR_STOP=1 -U postgres -d nomaddesk

docker compose start web
```

### 5.3 Backup volume ảnh upload (`nomaddesk_ky-uploads`)

```sh
docker run --rm \
  -v nomaddesk_ky-uploads:/data \
  -v "$PWD":/out \
  alpine tar czf /out/uploads.tgz -C /data .
```

### 5.4 Restore volume ảnh upload (`nomaddesk_ky-uploads`)

Kiểm tra tính hợp lệ của file `uploads.tgz` trước khi xóa dữ liệu cũ, dừng container `web` trong lúc khôi phục và cấp lại quyền sở hữu `1000:1000` (`node:node`) sau khi giải nén:

```sh
docker compose stop web

docker run --rm \
  -v nomaddesk_ky-uploads:/data \
  -v "$PWD":/out \
  alpine sh -c "set -e; tar tzf /out/uploads.tgz >/dev/null && find /data -mindepth 1 -delete && tar xzf /out/uploads.tgz -C /data && chown -R 1000:1000 /data"

docker compose start web
```

---

## 6. Triển khai trên VPS với Reverse Proxy (tham khảo)

Khi chạy trên một VPS có domain (vd `nomaddesk.example.com`):

1. Đổi `POSTGRES_PASSWORD`, `AUTH_SECRET`, `NEXTAUTH_SECRET` thành giá trị bí mật riêng; đặt `NEXTAUTH_URL=https://nomaddesk.example.com`.
2. Đổi mapping cổng trong `docker-compose.yml` thành `127.0.0.1:3288:3288` và không mở cổng `55188` / `18188` ra internet.
3. Cấu hình Nginx hoặc Caddy reverse proxy chuyển tiếp `https://nomaddesk.example.com` tới `http://127.0.0.1:3288` kèm `client_max_body_size 8m` (đủ khoảng đệm cho giới hạn upload ảnh 5 MB của ứng dụng).
4. Thiết lập cron hằng ngày chạy đồng thời lệnh backup PostgreSQL (§5.1) và backup `uploads.tgz` (§5.3) ra ổ lưu trữ ngoài.
