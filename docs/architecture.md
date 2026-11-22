# Kiến trúc

## Stack

| Phần | Công nghệ |
| --- | --- |
| Web (FE + BE) | **Next.js 16** App Router, **React 19**, **TypeScript** |
| Giao diện | **Tailwind CSS v4** + design tokens (CSS variables), font Inter phục vụ local, icon `lucide-react` |
| Trình soạn thảo | **Tiptap v3** (2 tab Editor / HTML) |
| Database | **PostgreSQL 17** + **Drizzle ORM** / drizzle-kit migrations |
| Xác thực | **Auth.js v5** Credentials, bcrypt, session JWT cookie |
| Kiểm dữ liệu | **Zod** (schema dùng chung client / server) |
| Ảnh upload | **sharp** → WebP, lưu ổ đĩa (`UPLOAD_DIR`, Docker volume) |
| Email | **nodemailer** → Mailpit (local) |
| Thanh toán | Mock payment driver sau interface `PaymentDriver` |
| Test | **Vitest** (unit / integration), **Playwright** (E2E) |
| Chạy | **Docker Compose**: `db`, `mailpit`, `web` |

Toàn bộ chạy local, không gọi API hay CDN ngoài. Bản đồ là bản đồ SVG tương tác dựng sẵn, không cần API key.

## Một app, nhiều khu

Khu công khai, Guest, Host và Admin là các nhóm route trong cùng một app Next.js, dùng chung DB và phiên đăng nhập:

| Route | Khu | Render |
| --- | --- | --- |
| `/`, `/a/…`, `/c/…`, `/l/apartments/…`, `/workstations/**`, `/travel-guide/**`, `/blog/**`, trang tĩnh | Công khai | Server Components đọc DB |
| `/login`, `/register`, `/password/reset` | Xác thực | |
| `/booking/**` | Đặt phòng (cần đăng nhập) | `noindex` |
| `/guests/**` | Khu khách | `noindex` |
| `/host/**` | Khu Host (hồ sơ `approved`; `suspended` chỉ đọc) | layout có sidebar, `noindex` |
| `/admin/**` | Khu quản trị (`role = admin`) | layout có sidebar, `noindex` |

Layout của `/host` và `/admin` kiểm phiên ở server trước khi render. Mỗi action ghi vẫn tự kiểm quyền riêng, không dựa vào layout hay middleware.

## Phân lớp

```text
app/**            page.tsx (Server Component), layout, route handler, Server Actions
   │
features/**       component theo màn (client components, form, bảng, modal)
components/**     UI dùng chung (header, footer, button, modal, …)
   │
lib/api/*         nghiệp vụ + truy vấn: properties, reservations, hosts, users, …
lib/validations/* schema Zod
lib/auth/*        Auth.js config, guards (requireUser / requireHost / requireAdmin …)
lib/pricing.ts    calculateBookingTotal() — dùng chung client & server
lib/payments/*    PaymentDriver (authorize / capture / void / refund), bản mock
lib/email/*       client SMTP, template, thông báo giao dịch
lib/storage/*     xử lý ảnh upload (sharp), đọc / ghi UPLOAD_DIR
lib/db/*          schema Drizzle, client pool, migrate / seed / verify-seed
   │
PostgreSQL 17
```

- Component client không import `lib/db`; mọi dữ liệu đi qua Server Component hoặc Server Action → `lib/api`.
- Tính tiền chỉ ở `lib/pricing.ts`; server luôn tính lại, không tin số tiền gửi lên.
- Nội dung hiếm đổi (FAQ, trang tĩnh, menu / footer, quy tắc đặt phòng) gom trong `web/content/`.

## Cấu trúc `web/`

```text
web/
├── app/                 routes (App Router), Server Actions, route handlers
├── features/            component theo màn: home, city, property-detail, booking, guest,
│                        host, admin, media, property-form, workstations, content, …
├── components/          UI dùng chung + layout
├── content/             nội dung viết cứng (booking-rules, faqs, nav, site, pages/*)
├── context/             CurrencyProvider (tỷ giá đọc từ DB)
├── lib/                 xem "Phân lớp"
├── drizzle/migrations/  SQL migration
├── public/              font, ảnh dữ liệu mẫu (public/seed/)
├── e2e/                 Playwright specs
└── tests/               Vitest specs
```

## Các luồng quan trọng

**Đặt phòng.** Widget ở trang chi tiết tính tiền bằng `calculateBookingTotal()`. Ở checkout, server mở transaction, khoá dòng căn hộ (`SELECT … FOR UPDATE`), kiểm trùng với đơn `pending` / `confirmed` và ngày khoá, tính lại giá, gọi `PaymentDriver.authorize()` rồi tạo đơn. Instant book thì `capture` ngay (→ `confirmed`); Request to book giữ `pending` kèm hạn phản hồi 48 giờ. Exclusion constraint trong DB là chốt chặn cuối khi có hai request cùng lúc.

**Hết hạn & hoàn tất.** Đơn `pending` quá hạn chuyển `expired` (và `void`) khi được đọc; đơn `confirmed` qua ngày trả phòng chuyển `completed`. Không cần cron để app chạy đúng.

**Upload ảnh.** `POST /api/uploads` → kiểm loại file theo nội dung → sharp (xoay EXIF, resize ≤ 1600 px, WebP q80, gỡ metadata) → lưu tên ngẫu nhiên 32-hex vào `UPLOAD_DIR` → ghi bảng `media`. Ảnh phục vụ qua `/uploads/[...path]`. Admin và Host dùng chung Media Library Modal (Upload / Library / From URL).

**Nội dung HTML.** Admin / Host soạn bằng Tiptap; HTML được làm sạch bằng allowlist trước khi lưu, và hiển thị lại nguyên văn khi không chỉnh sửa (không biến dạng HTML cũ).

**Email.** Các sự kiện (đặt phòng, yêu cầu mới, accept / reject, duyệt Host / tin, form liên hệ) gửi qua nodemailer; khi chạy local mọi email vào Mailpit ở http://localhost:18188.

## Kiểm thử

| Lệnh (trong `web/`) | Phạm vi |
| --- | --- |
| `npm test` | Vitest: pricing, guards / phân quyền, API nghiệp vụ, upload, email, sanitize HTML |
| `npm run verify` | ESLint + `tsc --noEmit` + Vitest + `next build` |
| `npm run e2e:docker` | Playwright trên stack Docker: các tiêu chí nghiệm thu ở [requirements.md](requirements.md#6-tiêu-chí-nghiệm-thu-chính) |
