# NomadDesk — Yêu cầu sản phẩm

Tài liệu mô tả phạm vi chức năng, vai trò, quy tắc nghiệp vụ và tiêu chí nghiệm thu của NomadDesk. Cách chạy xem [README](../README.md); các tài liệu khác xem [mục lục docs](README.md).

---

## 1. Tổng quan

**NomadDesk** là marketplace chọn lọc cho thuê căn hộ trung và dài hạn (từ 30 đêm) có sẵn trạm làm việc công thái học, dành cho digital nomad và người làm việc từ xa.

- **Mô hình:** Host (công ty quản lý căn hộ, chủ nhà có danh mục căn hộ) nộp đơn và phải được NomadDesk duyệt mới được đăng tin. NomadDesk kiểm duyệt tin đăng, thu tiền của khách (thanh toán mock), cung cấp gói Workstation và giữ **hoa hồng 10%** tiền thuê.
- **Vấn đề giải quyết:** căn hộ cho thuê thông thường hay thiếu bàn ghế làm việc tử tế và Internet ổn định. NomadDesk cho khách "xách vali tới là làm việc được ngay": bàn ghế công thái học, màn hình 4K/Ultrawide, Internet cáp quang được xác minh tốc độ, hợp đồng linh hoạt không phí ẩn. Với Host: thêm nguồn khách dài hạn, công cụ quản lý lịch và yêu cầu đặt phòng.
- **Ngôn ngữ giao diện:** tiếng Anh cho toàn bộ app (kể cả khu Host và Admin).
- **Kiến trúc:** một ứng dụng Next.js duy nhất, các khu là nhóm route dùng chung DB và đăng nhập, phân quyền theo `role`.

```text
/                → công khai (Home, Cities, Listings, Detail, Workstations, Guides, Blog, Pages)
/booking/**      → đặt phòng (Guest đã đăng nhập)
/guests/**       → khu khách (role guest | host | admin)
/host/**         → khu Host (role host, hồ sơ host đã duyệt)
/admin/**        → khu quản trị (role admin)
```

---

## 2. Phạm vi

### P0 — Chức năng cốt lõi

**Công khai & Guest**
- **Trang chủ (`/`):** header nổi, hero tìm kiếm (điểm đến, ngày), căn hộ nổi bật, top cities, 3D stay showcase, workstation showcase, community reels, travel guides, FAQ, footer.
- **Danh mục điểm đến (`/a/furnished-apartments`):** toàn bộ quốc gia và thành phố có căn hộ.
- **Danh sách theo thành phố (`/c/furnished-apartments-:city`):** split-view 55% danh sách / 45% bản đồ; lọc theo phòng ngủ, giá, tiện ích, khu phố; đổi tiền tệ USD / EUR / GBP. Khi có `move_in`/`move_out` thì ẩn căn không còn trống. Chỉ hiện căn `published` của Host `approved`.
- **Chi tiết căn hộ (`/l/apartments/:slug`):** gallery, thông số workstation, tiện nghi, nội quy, khối thông tin Host, lịch làm mờ ngày đã kín, widget đặt phòng sticky tính tiền theo số đêm và phụ phí workstation. CTA là **"Book now"** (instant) hoặc **"Request to book"** (cần Host duyệt).
- **Workstations (`/workstations`, `/workstations/build`):** giới thiệu gói Comfort Base / Pro Upgrade; Builder tự chọn bàn, ghế, màn hình, phím chuột, phụ kiện và tính giá realtime.
- **Travel Guide & Blog:** danh sách, lọc và trang chi tiết bài viết.
- **Xác thực (`/login`, `/register`, `/password/reset`):** Auth.js v5 Credentials. Tài khoản mới luôn là `guest`; tài khoản bị khoá không đăng nhập được.
- **Đặt phòng (`/booking/checkout`, `/booking/confirmation`):** form lưu trú, xác nhận workstation, giữ tiền (authorize) qua mock payment, kiểm tra lịch trống lần cuối trên server, trang xác nhận theo trạng thái (Confirmed / Request sent).
- **Khu khách (`/guests/dashboard`, `/guests/reservations`):** xem và huỷ đơn của mình theo chính sách huỷ.

**Host**
- **Trang đối tác (`/partner-network`)** và **nộp đơn Host (`/host/apply`)**: đơn ở trạng thái `pending` tới khi Admin duyệt.
- **Dashboard (`/host`):** KPI căn đang đăng, yêu cầu chờ duyệt, check-in sắp tới, thu nhập dự kiến tháng; danh sách yêu cầu cần phản hồi.
- **Quản lý căn hộ (`/host/listings`, `/new`, `/:id/edit`):** tạo/sửa tin (ảnh, tiện nghi, workstation, giá/tháng, số đêm tối thiểu, chế độ Instant/Request, nội quy), lưu nháp, gửi duyệt, ẩn/hiện.
- **Lịch trống (`/host/calendar`):** khoá/mở khoảng ngày, xem các khoảng đã có booking.
- **Đơn đặt phòng (`/host/reservations`):** chấp nhận / từ chối (kèm lý do), theo dõi đơn sắp tới, đang ở, đã xong, đã huỷ.

**Admin**
- **Dashboard (`/admin`)** theo kỳ Today / 7d / 30d / All.
- **Duyệt Host** (duyệt, từ chối, đình chỉ, kích hoạt lại), **kiểm duyệt tin đăng** (duyệt, từ chối, ẩn) và CRUD căn hộ, **giám sát đơn** (xem tất cả, huỷ can thiệp kèm hoàn tiền), **quản lý người dùng** (đổi role guest ↔ admin, khoá/mở tài khoản, xem đơn của từng người).
- **Quản lý nội dung:** căn hộ nổi bật, thành phố & thứ tự Top Cities, gói/linh kiện/phụ kiện Workstation, Travel Guide, Blog (kèm SEO), video cộng đồng, tỷ giá, thư viện ảnh. Nội dung dài dùng trình soạn thảo trực quan Tiptap (2 tab Editor/HTML, không làm biến dạng HTML cũ khi không sửa).
- Nội dung hiếm đổi (FAQ, trang tĩnh, khối trang chủ, menu/footer, quy tắc đặt phòng) viết cứng, gom trong `web/content/`.

### P1
- Danh sách yêu thích (`/guests/favorites`): localStorage khi chưa đăng nhập, đồng bộ DB khi đã đăng nhập.
- Bộ lọc nâng cao: "Instant book", "Internet ≥ X Mbps".
- Hồ sơ Host (`/host/profile`) và thu nhập Host (`/host/payouts`, chỉ hiển thị).
- Trang thông tin: `/how-it-works`, `/faq`, `/about-us`, `/contact-us`, `/mid-term-rentals`, `/corporate-housing`, `/terms`.

### P2 — Chừa chỗ (nút mờ, nhãn "Coming Soon")
- Thanh toán thẻ thật (Stripe), đăng nhập Google / LinkedIn, nhắn tin Guest ↔ Host, ký hợp đồng điện tử, đánh giá sau lưu trú, giá theo mùa.

### Ngoài phạm vi
- Thanh toán và chi trả tiền thật cho Host.
- Marketplace mở (Host tự đăng tin không qua duyệt); coworking, thuê theo giờ, một tin nhiều đơn vị.
- Dịch vụ email ngoài (chỉ dùng Mailpit local); app di động native; đa ngôn ngữ; đồng bộ lịch bên thứ ba (iCal, channel manager).

---

## 3. Vai trò & phân quyền

| Vai trò | Quyền |
| --- | --- |
| **Visitor** (chưa đăng nhập) | Xem mọi trang công khai, tìm kiếm, lọc, đổi tiền tệ, lưu yêu thích tạm trên trình duyệt, dùng Workstation Builder. |
| **Guest** (`role = guest`) | Đặt phòng / gửi yêu cầu; quản lý và huỷ đơn **của mình** ở `/guests/**`; yêu thích đồng bộ tài khoản; nộp đơn Host. |
| **Host** (`role = host` + hồ sơ `approved`) | Mọi quyền Guest; CRUD căn hộ **của mình** (không tự `published`, không đặt căn nổi bật); khoá/mở lịch; accept/reject đơn `pending`; chỉ thấy liên hệ khách khi đơn `confirmed`; upload ảnh. Host bị `suspended` vào `/host` ở chế độ chỉ đọc. |
| **Admin** (`role = admin`) | Toàn quyền `/admin/**`: duyệt/đình chỉ Host, kiểm duyệt và CRUD mọi căn, huỷ can thiệp đơn, quản lý người dùng (chặn hạ quyền admin cuối cùng), quản lý nội dung, upload ảnh. |

- Phiên JWT trong cookie `HttpOnly`, `SameSite=Lax`. Role và trạng thái tài khoản được đọc lại từ DB ở mỗi thao tác ghi.
- Mỗi Server Action / Route Handler ghi đều tự kiểm quyền (`requireAdmin()`, `requireHost()`, `requireUser()`).
- Mọi truy vấn trong `/host/**` lọc theo `hostId` phía server; truy cập dữ liệu của Host khác trả 404.

---

## 4. Quy tắc nghiệp vụ

### 4.1 Tính tiền

```text
months          = nights / 30                       (không làm tròn tháng)
rentAmount      = round(pricePerMonth × months)                     [USD cents]
workstationFee  = round(toUSD(workstationMonthlyEUR) × months)      [USD cents]
totalAmount     = rentAmount + workstationFee
commission      = round(rentAmount × 10%)
hostPayout      = rentAmount − commission
```

- Giá căn hộ lưu USD cents, giá Workstation lưu EUR cents; `toUSD` dùng bảng tỷ giá do Admin cấu hình, không gọi API ngoài.
- Một hàm thuần `calculateBookingTotal()` dùng chung client và server; server luôn tính lại, không tin số tiền từ client.
- Đơn lưu cố định số tiền và bản chụp quy tắc (hoa hồng, hạn phản hồi, hạn huỷ miễn phí) lúc tạo; đổi tỷ giá hay quy tắc sau đó không làm sai đơn cũ.

### 4.2 Vòng đời hồ sơ Host

```text
[guest nộp đơn] → pending ──approve──→ approved ──suspend──→ suspended
                     │                    ↑                     │
                     └──reject──→ rejected └─────reactivate──────┘
                                     └── Host sửa & nộp lại → pending
```

- `approved` → `users.role` thành `host`. `suspended` → mọi căn của Host bị ẩn khỏi trang công khai, đơn `pending` của Host bị huỷ.

### 4.3 Vòng đời tin đăng

```text
draft ──Host submit──→ pending_review ──Admin approve──→ published ⇄ hidden
                             │
                             └──Admin reject──→ rejected ──Host sửa & submit──→ pending_review
```

### 4.4 Vòng đời đơn đặt phòng

```text
Guest checkout ─┬─ Instant book ───────────────────────────→ confirmed (capture)
                └─ Request to book ─→ pending (authorize, hạn phản hồi 48h)
                                         ├─ Host accept ──→ confirmed (capture)
                                         ├─ Host reject ──→ rejected  (void)
                                         ├─ quá hạn ──────→ expired   (void)
                                         └─ Guest huỷ ────→ cancelled (void)

confirmed ─┬─ Guest huỷ ≥ 14 ngày trước move-in ─→ cancelled (refunded)
           ├─ Admin huỷ can thiệp ───────────────→ cancelled (refunded)
           └─ sau moveOutDate ────────────────────→ completed
```

- `expired` và `completed` được cập nhật khi đọc dữ liệu.
- Guest không tự huỷ đơn `confirmed` khi còn dưới 14 ngày tới move-in; Host không tự huỷ đơn `confirmed`.
- Chuyển trạng thái sai sơ đồ (vd accept đơn đã `expired`) trả lỗi 409.
- Chống đặt trùng: kiểm lịch trong transaction (`SELECT … FOR UPDATE`) khi tạo đơn và khi Host accept, cộng exclusion constraint `btree_gist` trên khoảng ngày làm chốt chặn cuối.

### 4.5 Email

Email giao dịch (xác nhận đặt phòng, yêu cầu mới cho Host, accept/reject, duyệt Host/tin, form liên hệ…) gửi qua Mailpit local, xem tại http://localhost:18188.

---

## 5. Dữ liệu mẫu

Dữ liệu mẫu nằm trong `docs/seed/*.json`, ảnh trong `web/public/seed/`. Seed tự chạy khi container `web` khởi động và chỉ chèn bản ghi còn thiếu.

| Bảng | Nội dung |
| --- | --- |
| `locations`, `categories` | Thành phố và danh mục căn hộ |
| `properties` | 8 căn hộ (Madrid, Barcelona, Buenos Aires, Lima) kèm ảnh |
| `users`, `host_profiles` | 5 tài khoản seed, 2 Host đã duyệt + 1 đơn đang chờ |
| `workstation_*` | 2 gói, 8 linh kiện, 5 phụ kiện |
| `travel_guides`, `blog_posts`, `community_videos` | Nội dung bài viết và video |
| `reservations`, `blocked_dates` | Đơn mẫu đủ 6 trạng thái và ngày khoá, sinh theo ngày chạy seed |
| `settings` | Tỷ giá EUR / GBP mặc định |

---

## 6. Tiêu chí nghiệm thu chính

Toàn bộ tiêu chí P0 có test Playwright E2E trong `web/e2e/` (chạy bằng `npm run e2e:docker`). Tóm tắt:

- **Trang chủ:** header nổi ở 1440px, thu thành menu ở 390px; tìm "Madrid" chuyển tới trang thành phố; có ít nhất 3 căn nổi bật.
- **Trang thành phố:** split-view 55/45 trên desktop, nút "Map" nổi trên mobile; lọc phòng ngủ ghi lên URL; đổi EUR cập nhật thẻ và pin bản đồ; khoảng ngày trùng đơn đã xác nhận làm ẩn căn đó; căn chưa duyệt không hiện và trả 404.
- **Chi tiết căn:** gallery 5 ảnh và thông số workstation; widget sticky tính tiền realtime; CTA theo chế độ đặt; ngày đã kín bị làm mờ.
- **Đặt phòng:** instant book ra "Booking confirmed" + mã `ND-XXXXX`; request to book ra "Request sent"; đặt trùng ngày báo lỗi; huỷ đơn pending giải phóng lịch.
- **Host:** nộp đơn → "Application under review"; tạo tin và gửi duyệt → "Pending review"; accept/reject yêu cầu; khoá lịch; Host này không sửa được căn của Host khác (404).
- **Admin:** khách và Host bị chặn khỏi `/admin` (403); duyệt Host, duyệt tin, đình chỉ Host làm ẩn toàn bộ căn của Host đó; huỷ can thiệp đơn → Cancelled + Refunded.
- **Quản lý nội dung:** thêm thành phố hiện ở mọi nơi; đổi giá Workstation cập nhật ngay nhưng đơn cũ giữ giá; bài viết Tiptap hiển thị đúng định dạng; tỷ giá mới áp ngay; thay đổi giữ nguyên sau khi tải lại trang; HTML có script bị làm sạch.

---

## 7. Yêu cầu phi chức năng

- **Responsive:** dùng tốt ở 390px và 1440px, không cuộn ngang; khu Host/Admin có sidebar trên desktop, drawer trên mobile.
- **Trạng thái giao diện:** mọi danh sách có đủ trạng thái rỗng, đang tải, lỗi.
- **Chạy hoàn toàn local:** ảnh phục vụ từ `/seed/` và `/uploads/`; không phụ thuộc API hay CDN ngoài; email qua Mailpit, thanh toán và bản đồ là mock.
- **Bảo mật:** mật khẩu băm `bcrypt`; phân quyền ở từng thao tác ghi; chống IDOR theo `hostId`; upload chỉ nhận ảnh JPEG/PNG/WebP/GIF tĩnh ≤ 5 MB, nén sang WebP và gỡ EXIF/GPS; chặn path traversal khi phục vụ file; làm sạch HTML do Admin nhập.
- **SEO:** title, description, OpenGraph, canonical cho trang công khai; `noindex` cho `/host`, `/admin`, `/guests`, `/booking`.
