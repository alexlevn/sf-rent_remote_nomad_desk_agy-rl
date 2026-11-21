# NomadDesk


## Tổng quan kiến trúc & Cổng

- **App (FE + BE):** Next.js 16 (App Router, TypeScript strict, Tailwind CSS v4) trong thư mục `web/`.
- **Database:** PostgreSQL 17 (extension `btree_gist` chống đặt trùng lịch) + Drizzle ORM.
- **Auth:** Auth.js v5 Credentials (bcrypt + HttpOnly JWT cookie), 3 vai trò: **Guest**, **Host** (chọn lọc, cần Admin duyệt), **Admin**.
- **Email local:** Mailpit (SMTP + Web UI xem email gửi đi).
- **Thanh toán:** Driver mock theo mô hình `authorize → capture / void / refund` (không gọi dịch vụ thật).
- **Upload ảnh (`--storage=volume`):** Xử lý bằng `sharp` → WebP `q80` (≤ 1600 px, gỡ EXIF/GPS), lưu trong Docker named volume `ky-uploads` (`UPLOAD_DIR=/app/web/.data/uploads`), quản lý qua bảng `media`.

| Dịch vụ | Cổng host | Đường dẫn truy cập |
| --- | --- | --- |
| Web (Public / Guest / Host / Admin) | **3288** | `http://localhost:3288` |
| Admin Portal | **3288** | `http://localhost:3288/admin` |
| Host Portal | **3288** | `http://localhost:3288/host` |
| PostgreSQL 17 | **55188** | `postgres://postgres:postgres@localhost:55188/nomaddesk` |
| Mailpit Web UI / SMTP | **18188** / **11188** | `http://localhost:18188` |

## Chạy nhanh bằng Docker Compose

Yêu cầu: Docker Engine + Docker Compose v2.

```sh
# Dựng image, bật db + mailpit + web (tự chạy db:migrate và db:seed idempotent)
docker compose up -d --build --wait

# Mở ứng dụng
open http://localhost:3288
open http://localhost:3288/admin
open http://localhost:18188   # Mailpit UI xem email local
```

Dừng container (giữ nguyên dữ liệu DB và ảnh đã upload):

```sh
docker compose stop    # hoặc: docker compose down
```

> **Cảnh báo mất dữ liệu volume:** Lệnh `docker compose down -v` sẽ **xóa sạch cả volume cơ sở dữ liệu (`postgres_data`) lẫn volume ảnh đã upload (`ky-uploads`)**. Trước khi xóa volume hoặc chuyển máy, luôn backup volume ảnh:
>
> ```sh
> docker run --rm \
>   -v nomaddesk_ky-uploads:/data \
>   -v "$PWD":/out \
>   alpine tar czf /out/uploads.tgz -C /data .
> ```
>
> Xem chi tiết quy trình deploy, cấu hình biến môi trường, backup/restore DB và volume tại [docs/deploy.md](docs/deploy.md).

## Phát triển trên máy host (Host Dev)

```sh
# 1. Bật Postgres + Mailpit
docker compose up -d db mailpit --wait

# 2. Cài dependencies, chạy migration & seed
cd web
npm ci
npm run db:migrate
npm run db:seed

# 3. Chạy dev server trên cổng 3288
npm run dev -- -p 3288
```

## Tài khoản Seed mặc định

| Vai trò | Email | Mật khẩu | Ghi chú |
| --- | --- | --- | --- |
| **Admin** | `admin@example.com` | `admin1234` | Toàn quyền `/admin/**`, `/admin/media`, upload & quản lý toàn bộ ảnh |
| **Host 1** (`approved`) | `host@example.com` | `host1234` | Truy cập `/host/**`, quản lý 4 căn hộ seed, upload & xóa ảnh chưa dùng của mình |
| **Host 2** (`approved`) | `host2@example.com` | `host1234` | Truy cập `/host/**`, quản lý 4 căn hộ seed (cô lập dữ liệu với Host 1) |
| **Guest** | `demo@example.com` | `demo1234` | Đặt phòng, quản lý `/guests/**`, không truy cập `/admin` hay API upload |
| **Guest** (đơn Host `pending`) | `applicant@example.com` | `applicant1234` | Dùng để kiểm thử luồng Admin duyệt đơn Host tại `/admin/hosts` |

## Quản trị nội dung, Nhập liệu & Upload ảnh / Media Library

- **Khu quản trị Admin (`/admin`):**
  - Dashboard KPI thực theo kỳ (`Today` / `7d` / `30d` / `All`), duyệt Host (`/admin/hosts`), kiểm duyệt & CRUD căn hộ (`/admin/properties`, bố cục sửa 2 cột kiểu WordPress/WooCommerce tại `/admin/properties/new` và `/admin/properties/[id]/edit`), giám sát đơn đặt phòng (`/admin/reservations`), quản lý người dùng (`/admin/users`).
  - Quản lý nội dung CMS: Thành phố (`/admin/locations`), Gói/Linh kiện/Phụ kiện Workstation (`/admin/workstations` kèm chip `features[]`), Travel Guides (`/admin/guides`), Blog (`/admin/blog`), Video cộng đồng (`/admin/videos`), Tỷ giá (`/admin/settings`).
  - Trình soạn thảo trực quan **Tiptap v3** (2 tab Visual/HTML, giữ nguyên HTML gốc khi không sửa, làm sạch XSS qua `sanitizeHtml()` có allowlist YouTube iframe & `/uploads/`), ô tiền tệ định dạng dấu phân cách (`$` / `€`), thanh Lưu dính (sticky save bar), nút *View on Web* và cảnh báo khi rời trang đang sửa dở.
- **Host Portal (`/host`):**
  - Parity hoàn chỉnh với Admin cho màn tạo/sửa căn hộ (`/host/listings/new`, `/host/listings/[id]/edit`): trình soạn thảo Tiptap cho Description & House Rules, tải/chọn ảnh qua Media Library Modal (cô lập theo từng Host), ô giá tháng định dạng `$`, thanh Lưu dính, cùng upload ảnh đại diện ở `/host/profile`.
- **Upload ảnh & Thư viện ảnh (`/admin/media` & Media Library Modal):**
  - Hỗ trợ **Upload** (chọn file, kéo-thả, dán ảnh từ clipboard), **Media Library** (tìm kiếm, phân trang, badge `In use` / `Unused`, xóa ảnh chưa dùng) và **From URL** (vẫn chấp nhận `/seed/...`, `/uploads/...`, `https://...`).
  - Mọi ảnh tải lên qua `POST /api/uploads` đều đi qua `sharp`: chỉ chấp nhận JPEG, PNG, WebP, GIF tĩnh (kiểm bằng nội dung file, chặn GIF động & file giả), tối đa **5 MB**, tự động xoay EXIF, thu nhỏ cạnh dài **≤ 1600 px**, chuyển sang **WebP q80**, gỡ toàn bộ metadata (EXIF/GPS), lưu bằng tên ngẫu nhiên 16 byte hex (`/uploads/<32-hex>.webp`).
  - Kiểm quyền chặt ở server (`requireUploadActor()` đọc Auth.js JWT cookie + trạng thái mới nhất từ Postgres): chỉ `admin` và `host` đã duyệt được phép upload/truy cập thư viện; Host chỉ thấy và xóa được ảnh do chính mình tải lên.
  - Chính sách an toàn (D33): gỡ ảnh khỏi form không tự xóa file đĩa; `DELETE /api/media/[id]` kiểm tra tham chiếu trên toàn bộ 6 bảng nội dung và trả `409 Conflict` nếu ảnh còn đang được sử dụng.

## Kiểm thử & Xác minh

```sh
# Kiểm tra dữ liệu seed (14/14 bảng)
cd web && npm run db:verify-seed

# Bộ kiểm tra tổng hợp: ESLint + TypeScript + Vitest (unit/integration) + Next.js production build
cd web && npm run verify

# Toàn bộ Playwright E2E chạy trên stack Docker (http://localhost:3288)
cd web && npm run e2e:docker -- --reporter=list
```

## Tài liệu tham chiếu

- [docs/deploy.md](docs/deploy.md) — Hướng dẫn deploy Docker, biến môi trường, backup & restore DB và volume ảnh.
- [docs/requirements.md](docs/requirements.md) — Đặc tả chức năng (P0/P1/P2), ma trận màn hình và tiêu chí nghiệm thu.
