# NomadDesk

**NomadDesk** là nền tảng marketplace chọn lọc cho thuê căn hộ trung & dài hạn (≥ 30 đêm) trang bị sẵn trạm làm việc công thái học (Workstation) dành cho Digital Nomads và Remote Workers. Hệ thống hỗ trợ trọn vẹn 3 vai trò **Guest / Host / Admin** (kèm trình soạn thảo trực quan Tiptap, thư viện upload ảnh lưu trên Docker volume, chống đặt trùng bằng Postgres `btree_gist`, Mailpit email và thanh toán mock) và chạy hoàn toàn local.

Tài liệu sản phẩm và kỹ thuật (yêu cầu, kiến trúc, database, API, deploy): xem [docs/README.md](docs/README.md).

---

## Kiến trúc hệ thống & Luồng nghiệp vụ

### Điểm nhấn kỹ thuật

- **Chống đặt trùng 2 lớp (Concurrency-safe):** Khoá dòng `SELECT ... FOR UPDATE` trong transaction kết hợp `EXCLUDE USING gist` (`btree_gist`) ở tầng PostgreSQL cho các đơn `pending` / `confirmed` — chặn tuyệt đối race condition khi hai request đặt cùng một căn hộ tại cùng thời điểm.
- **Phân quyền tầng sâu (Defense-in-depth RBAC):** Ngoài kiểm phiên ở layout `/host` và `/admin`, mọi Server Action & HTTP route đều tự chạy guard (`requireUser`, `requireHost`, `requireAdmin`, `requireUploadActor`) đọc lại `role` và `is_active` trực tiếp từ DB thay vì chỉ tin JWT; dữ liệu giữa các Host được cô lập hoàn toàn theo `hostId`.
- **Tính giá phía server bằng số nguyên (Integer Cents):** Mọi đơn giá lưu dạng USD/EUR cents; `calculateBookingTotal()` luôn được tính lại ở server khi checkout, lưu bản chụp quy tắc (`commission_rate`, `respond_hours`, `free_cancel_days`) vào từng đơn.
- **Pipeline xử lý ảnh & nội dung an toàn:** Upload ảnh đi qua kiểm tra magic-byte (≤ 5 MB, chặn GIF động & file giả), `sharp` chuẩn hoá sang WebP `q80` (≤ 1600 px, gỡ sạch EXIF/GPS), lưu tên 32-hex trên Docker volume, phục vụ kèm `Content-Security-Policy: default-src 'none'; sandbox`, và chặn xoá khi còn tham chiếu (`409 Conflict`). Nội dung Tiptap v3 đi qua allowlist XSS sanitizer.
- **Vòng đời đơn không phụ thuộc cron:** Đơn `pending` quá hạn 48h tự chuyển `expired` (+ `void` thanh toán) và đơn `confirmed` quá ngày trả phòng tự chuyển `completed` khi truy vấn.
- **Kiểm thử tự động toàn diện:** **332 unit/integration tests** (Vitest) + **54 E2E tests** (Playwright chạy trực tiếp trên Docker stack).

### 1. Kiến trúc tổng thể & Phân lớp

```mermaid
flowchart TB
    subgraph Client["Trình duyệt — 4 phân hệ trên 1 Next.js 16 App"]
        PUB["Public SSR · Tìm kiếm & Bản đồ SVG"]
        GUEST["Guest Portal · /booking, /guests"]
        HOST["Host Portal · /host (cô lập theo hostId)"]
        ADMIN["Admin & CMS · /admin (Tiptap v3, Media)"]
    end

    subgraph AppLayer["Next.js 16 App Router (Server Components · Server Actions · Route Handlers)"]
        SA["Server Actions (Checkout, Host Ops, Admin & CMS)"]
        API["HTTP Routes (/api/auth, /api/uploads, /api/media, /uploads)"]
    end

    subgraph Domain["Lớp Bảo mật & Nghiệp vụ (web/lib)"]
        GUARD["Auth.js v5 + DB-backed RBAC Guards"]
        VALID["Zod Schemas + XSS HTML Sanitizer"]
        BIZ["Domain API (lib/api/*) + Pricing Engine (cents)"]
        PAY["PaymentDriver (authorize / capture / void / refund)"]
        MEDIA["Sharp Media Pipeline (Magic-byte · Resize · WebP · Strip EXIF)"]
        MAIL["Email Service (nodemailer)"]
    end

    subgraph Infra["Hạ tầng Docker Compose (Local Self-Contained)"]
        PG[("PostgreSQL 17 + Drizzle ORM + btree_gist")]
        VOL[("Docker Volume · ky-uploads")]
        MP["Mailpit SMTP & Web UI"]
    end

    PUB & GUEST & HOST & ADMIN --> SA
    HOST & ADMIN --> API
    GUEST --> API

    SA --> GUARD --> VALID --> BIZ
    API --> GUARD
    API --> MEDIA

    BIZ --> PG
    BIZ --> PAY
    BIZ --> MAIL
    MEDIA --> VOL
    MEDIA --> PG
    MAIL --> MP
```

### 2. Luồng đặt phòng chống Race Condition (Checkout Transaction)

```mermaid
sequenceDiagram
    autonumber
    actor G as Guest
    participant SA as Checkout Server Action
    participant RBAC as requireUser + Zod
    participant PG as PostgreSQL 17 (TX)
    participant PAY as PaymentDriver
    participant MAIL as Mailpit SMTP

    G->>SA: Submit checkout (propertyId, moveIn, moveOut, workstation)
    SA->>RBAC: Kiểm tra phiên DB-backed & validate input
    RBAC-->>SA: Hợp lệ (userId)

    SA->>PG: BEGIN TRANSACTION
    SA->>PG: SELECT ... FROM properties WHERE id = $1 FOR UPDATE
    PG-->>SA: Row locked (tránh đặt trùng đồng thời)

    SA->>PG: Kiểm tra xung đột blocked_dates & reservations (pending/confirmed)
    SA->>SA: Tính lại tổng tiền ở server (calculateBookingTotal — USD cents)
    SA->>PAY: authorize(totalAmount)
    PAY-->>SA: paymentRef (status: authorized)

    SA->>PG: INSERT INTO reservations (bảo vệ cuối bởi EXCLUDE USING gist)
    alt Instant Book (is_direct_booking = true)
        SA->>PAY: capture(paymentRef)
        PAY-->>SA: status: captured
        SA->>PG: UPDATE status = 'confirmed', payment_status = 'captured'
        SA->>PG: COMMIT
        SA-->>MAIL: Gửi email xác nhận cho Guest & Host
        SA-->>G: Đặt phòng thành công (Confirmed)
    else Request to Book (is_direct_booking = false)
        SA->>PG: Lưu status = 'pending', respond_by = NOW() + 48h
        SA->>PG: COMMIT
        SA-->>MAIL: Gửi thông báo yêu cầu mới cho Host (hạn 48h)
        SA-->>G: Chờ Host phản hồi (Pending)
    end
```

### 3. Vòng đời đơn đặt phòng & Trạng thái thanh toán

```mermaid
stateDiagram-v2
    [*] --> pending: Request to Book (authorized · hạn 48h)
    [*] --> confirmed: Instant Book (captured)

    pending --> confirmed: Host Accept (capture)
    pending --> rejected: Host Reject (void)
    pending --> expired: Quá hạn 48h — lazy on read (void)
    pending --> cancelled: Guest / Admin huỷ (void)

    confirmed --> cancelled: Guest huỷ ≥ 14 ngày hoặc Admin Void (refund)
    confirmed --> completed: Qua ngày move_out_date — lazy on read

    rejected --> [*]
    expired --> [*]
    cancelled --> [*]
    completed --> [*]
```

---

## Chạy nhanh bằng 1 lệnh (Docker Compose)

Yêu cầu: Docker Engine ≥ 24 và Docker Compose v2.

```sh
docker compose up -d --build
```

Lệnh trên dựng và khởi chạy đủ 3 container (`db`, `mailpit`, `web`). Mỗi lần container `web` khởi động sẽ tự chạy migrate (Drizzle + extension `btree_gist`) rồi seed (idempotent, chỉ chèn bản ghi còn thiếu, không ghi đè dữ liệu đã sửa) — bằng bản JS dựng sẵn `node dist/db/migrate.js` và `node dist/db/seed.js`. Có thể thêm `--wait` để đợi container `web` báo `healthy`.

### URL & Cổng

| Dịch vụ / Khu vực | Cổng host | Đường dẫn |
| --- | --- | --- |
| **Web công khai & Guest Portal** | **3288** | http://localhost:3288 |
| **Host Portal** (quản lý căn hộ, lịch, đơn) | **3288** | http://localhost:3288/host |
| **Admin Portal** (duyệt Host/tin, CMS, Media) | **3288** | http://localhost:3288/admin |
| **Mailpit Web UI** (xem email local) | **18188** | http://localhost:18188 |
| **Mailpit SMTP** | **11188** | `localhost:11188` |
| **PostgreSQL 17** | **55188** | `postgres://postgres:postgres@localhost:55188/nomaddesk` |

### Reset về dữ liệu mẫu sạch (local)

```sh
docker compose down -v
docker compose up -d --build --wait
```

Xoá volume DB và ảnh upload, rồi khởi động lại; seed nạp lại toàn bộ dữ liệu mẫu (kể cả ảnh mẫu trong `web/public/seed/`, nằm sẵn trong image). Chỉ mất những gì tự tạo sau khi seed: ảnh upload qua Media Library và dữ liệu thêm/sửa trên web. Dùng thoải mái khi test local.

### Dừng container & Cảnh báo Volume ảnh

```sh
docker compose down          # Dừng & xoá container, GIỮ NGUYÊN volume DB và ảnh upload
```

> **Cảnh báo mất dữ liệu:** `docker compose down -v` sẽ **xoá sạch cả volume PostgreSQL (`nomaddesk_postgres_data`) lẫn volume ảnh đã upload (`nomaddesk_ky-uploads`)**. Luôn backup volume ảnh trước khi xoá volume hoặc chuyển máy:
>
> ```sh
> docker run --rm \
>   -v nomaddesk_ky-uploads:/data \
>   -v "$PWD":/out \
>   alpine tar czf /out/uploads.tgz -C /data .
> ```
>
> Xem đầy đủ quy trình backup/restore DB & volume và cấu hình VPS tại [docs/deploy.md](docs/deploy.md).

---

## Tài khoản Seed mặc định

| Vai trò | Email | Mật khẩu | Phạm vi truy cập |
| --- | --- | --- | --- |
| **Admin** | `admin@example.com` | `admin1234` | Toàn quyền `/admin/**`, `/admin/media`, duyệt Host/tin, quản lý toàn bộ CMS & ảnh |
| **Host 1** (`approved`) | `host@example.com` | `host1234` | `/host/**`, sở hữu 4 căn hộ seed (Madrid & Barcelona), upload & xoá ảnh chưa dùng của mình |
| **Host 2** (`approved`) | `host2@example.com` | `host1234` | `/host/**`, sở hữu 4 căn hộ seed (Buenos Aires & Lima), cô lập hoàn toàn với Host 1 |
| **Guest** | `demo@example.com` | `demo1234` | Đặt phòng, `/guests/**`, nộp đơn Host tại `/host/apply` (bị chặn `/admin` & upload) |
| **Guest** (đơn Host `pending`) | `applicant@example.com` | `applicant1234` | Kiểm thử luồng Admin duyệt đơn Host tại `/admin/hosts` |

---

## Chạy Dev trên máy host

```sh
# 1. Tạo file biến môi trường local từ mẫu
cp web/.env.example web/.env.local

# 2. Khởi chạy PostgreSQL 17 và Mailpit
docker compose up -d db mailpit --wait

# 3. Cài dependencies, chạy migration và seed dữ liệu mẫu
cd web
npm ci
npm run db:migrate
npm run db:seed

# 4. Bật Next.js dev server trên cổng 3288
npm run dev -- -p 3288
```

*(Nếu container `web` đang chạy trên cổng 3288, dừng nó trước bằng `docker compose stop web`.)*

---

## Chạy Test & Xác minh

```sh
# Kiểm tra khớp 100% số bản ghi seed (14/14 bảng)
cd web && npm run db:verify-seed

# Unit & integration tests (Vitest — 15 file / 332 test)
cd web && npm test

# Bộ kiểm tra đầy đủ: ESLint + TypeScript + Vitest + Next.js production build
cd web && npm run verify

# Toàn bộ Playwright E2E trên stack Docker (9 file / 54 test, yêu cầu docker compose up -d)
cd web && npm run e2e:docker -- --reporter=list
```

---

## Quản trị nội dung, Tiptap WYSIWYG & Upload ảnh

- **Admin Portal (`/admin`):** Dashboard KPI theo kỳ (`Today`/`7d`/`30d`/`All`), duyệt & đình chỉ Host (`/admin/hosts`), kiểm duyệt & CRUD căn hộ bố cục 2 cột kiểu WordPress/WooCommerce (`/admin/properties`), giám sát & huỷ can thiệp đơn (`/admin/reservations`), quản lý người dùng (`/admin/users`), và CMS đầy đủ cho Thành phố (`/admin/locations`), Workstation (`/admin/workstations`), Travel Guides (`/admin/guides`), Blog (`/admin/blog`), Video cộng đồng (`/admin/videos`), Tỷ giá (`/admin/settings`) và Thư viện ảnh (`/admin/media`).
- **Trình soạn thảo trực quan Tiptap v3:** Dùng cho mọi nội dung dài (mô tả/nội quy căn hộ ở cả Admin & Host, Travel Guide, Blog, Thành phố) với 2 tab Visual/HTML, bảo toàn HTML gốc khi không chỉnh sửa và làm sạch XSS (`sanitizeHtml()`, allowlist YouTube embed).
- **Upload ảnh lưu Docker volume (`UPLOAD_DIR` → `ky-uploads`):** `POST /api/uploads` kiểm nội dung file (JPEG/PNG/WebP/GIF tĩnh ≤ 5 MB, chặn GIF động & file giả), tự động xoay EXIF, thu nhỏ cạnh dài ≤ 1600 px, nén sang WebP `q80` gỡ toàn bộ EXIF/GPS, lưu tên ngẫu nhiên 32-hex phục vụ tại `/uploads/[...path]`. Host đã duyệt và Admin đều dùng chung Media Library Modal (3 tab Upload kéo-thả/clipboard, Media Library phân trang, From URL) với cô lập sở hữu theo Host và chặn xoá ảnh đang được tham chiếu (`409 Conflict`).

---

## Tài liệu

| Tài liệu | Nội dung |
| --- | --- |
| [Yêu cầu sản phẩm](docs/requirements.md) | Phạm vi, vai trò & phân quyền, quy tắc nghiệp vụ, tiêu chí nghiệm thu |
| [Kiến trúc](docs/architecture.md) | Stack, các khu của app, phân lớp code, luồng đặt phòng / upload / email |
| [Database](docs/database.md) | Sơ đồ quan hệ, bảng & cột, ràng buộc chống đặt trùng, migration & seed |
| [API & Server Actions](docs/api.md) | HTTP routes, Server Actions, guard phân quyền |
| [Triển khai & Sao lưu](docs/deploy.md) | Biến môi trường, Docker, nâng cấp, backup / restore, VPS |

---

## Cấu trúc thư mục

```text
.
├── docker-compose.yml        # Stack local: db (Postgres 17), mailpit, web (Next.js 16)
├── .env.example              # Biến môi trường mẫu ở gốc repo
├── README.md                 # Tài liệu này
├── docs/
│   ├── *.md                  # Tài liệu: requirements, architecture, database, api, deploy, milestones
│   └── seed/                 # Dữ liệu mẫu (*.json) được seed vào Postgres
└── web/                      # Ứng dụng Next.js 16 + TypeScript + Tailwind CSS v4
    ├── app/                  # App Router pages, layouts, Server Actions, API Routes (/api/*, /uploads/*)
    ├── components/           # UI primitives & layout dùng chung (Header, Footer, MobileNav, Modal...)
    ├── content/              # Nội dung viết cứng gom 1 chỗ (booking-rules.ts, faqs.ts, nav.ts, site.ts, pages/*)
    ├── context/              # CurrencyProvider đọc tỷ giá từ DB
    ├── drizzle/migrations/   # SQL migrations append-only (0000, 0001, 0002)
    ├── e2e/                  # 9 bộ test Playwright E2E (54 test phủ đủ 43 AC P0 + Admin/Upload)
    ├── features/             # Module tính năng theo phân hệ (home, city, property-detail, booking, guest, host, admin, media)
    ├── lib/                  # Lớp DB/API, Auth.js v5, email Mailpit, thanh toán mock, sharp upload, Zod validations
    ├── public/seed/          # Ảnh dữ liệu mẫu phục vụ local
    └── tests/                # Bộ unit/integration test Vitest
```

