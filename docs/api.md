# API & Server Actions

Phần lớn thao tác ghi đi qua **Server Actions** (Next.js) gọi thẳng từ component. HTTP route handler chỉ dùng cho những việc cần request thật: upload file, phục vụ ảnh, đăng nhập (Auth.js) và reset dữ liệu khi test.

Mọi điểm ghi đều tự kiểm quyền ở server bằng các guard trong `web/lib/auth/guards.ts`:

| Guard | Cho phép |
| --- | --- |
| `requireUser()` | Người đã đăng nhập, tài khoản đang hoạt động |
| `requireHost()` | Host có hồ sơ `approved`; trả về `hostId` để lọc dữ liệu |
| `requireHostReadOnly()` | Host kể cả đang `suspended` (chỉ đọc) |
| `requireAdmin()` | `role = admin` |
| `requireUploadActor()` | Admin hoặc Host `approved` |

Role và trạng thái tài khoản luôn đọc lại từ DB, không tin dữ liệu cũ trong JWT. Truy cập dữ liệu không thuộc quyền trả **403**; id của Host khác trả **404**.

## HTTP routes

| Method | Đường dẫn | Quyền | Mô tả |
| --- | --- | --- | --- |
| `GET`, `POST` | `/api/auth/[...nextauth]` | — | Auth.js v5 (Credentials, session JWT cookie) |
| `POST` | `/api/uploads` | `requireUploadActor` | Upload ảnh (`multipart/form-data`: `file`, `alt?`). Nhận JPEG/PNG/WebP/GIF tĩnh ≤ 5 MB, kiểm nội dung thật của file, xoay theo EXIF, thu cạnh dài ≤ 1600 px, nén WebP q80 và gỡ EXIF/GPS. Trả `201 { media }`; lỗi định dạng `400`, quá dung lượng `413` |
| `GET` | `/api/media?page=&pageSize=&search=` | `requireUploadActor` | Danh sách thư viện ảnh có phân trang. Host chỉ thấy ảnh mình upload; mỗi ảnh kèm `isInUse`, `usageCount` |
| `DELETE` | `/api/media/:id` | `requireUploadActor` | Xoá ảnh chưa được dùng ở đâu. Ảnh đang được tham chiếu trả `409 Conflict` |
| `GET`, `HEAD` | `/uploads/[...path]` | công khai | Phục vụ file trong `UPLOAD_DIR`; chặn path traversal, cache `immutable`, header `Content-Security-Policy: default-src 'none'; sandbox` |
| `POST` | `/api/admin/cms` | `requireAdmin` | Endpoint JSON `{ action, payload }` cho `saveLocation`, `saveTravelGuide` (dùng để kiểm phân quyền CMS từ ngoài UI) |
| `POST` | `/api/mock/reset?keepMedia=1` | chỉ khi `ALLOW_MOCK_RESET=true` | Đưa DB về dữ liệu mẫu cho bộ test E2E. **Phải tắt trên môi trường thật** (trả `403`) |

## Server Actions

### Chung — `web/app/actions/`

| Action | Mô tả |
| --- | --- |
| `signOutAction` | Đăng xuất |
| `submitContactInquiryAction` | Form liên hệ, gửi email qua SMTP (Mailpit khi chạy local) |

### Guest — `web/app/guests/*/actions.ts`

| Action | Quyền | Mô tả |
| --- | --- | --- |
| `toggleFavoriteAction`, `removeFavoriteAction`, `getUserFavoriteIdsAction` | `requireUser` | Yêu thích đồng bộ theo tài khoản |
| `cancelBookingAction` | `requireUser` | Huỷ đơn của chính mình theo chính sách (pending → void; confirmed ≥ 14 ngày → refund) |

Đặt phòng (checkout) và các thao tác của Host chạy bằng Server Action khai báo ngay trong page tương ứng (`app/booking/checkout`, `app/host/**`): tạo đơn trong transaction kèm kiểm lịch trống, accept / reject yêu cầu, tạo / sửa / gửi duyệt tin, khoá ngày, nộp đơn Host.

### Host — `web/app/host/profile/actions.ts`

| Action | Quyền | Mô tả |
| --- | --- | --- |
| `fetchCurrentHostProfileAction`, `updateCurrentHostProfileAction` | `requireHost` | Xem / sửa hồ sơ Host |

### Admin — `web/app/admin/admin-actions.ts`

Tất cả cần `requireAdmin`.

| Nhóm | Actions |
| --- | --- |
| Dashboard | `fetchAdminDashboardStatsAction(period)` — `today` \| `7d` \| `30d` \| `all` |
| Căn hộ | `fetchAdminPropertiesAction`, `fetchAdminPropertiesPaginatedAction`, `createAdminPropertyAction`, `updateAdminPropertyAction`, `approvePropertyAction`, `updatePropertyStatusAction` (duyệt / từ chối / ẩn), `deletePropertyAction` |
| Host | `fetchAdminHostsAction`, `fetchAdminHostsPaginatedAction`, `reviewHostAction` (approve / reject / suspend) |
| Đơn đặt phòng | `fetchAdminReservationsAction`, `fetchAdminReservationsPaginatedAction`, `cancelReservationAdminAction` (huỷ can thiệp + hoàn tiền) |
| Người dùng | `fetchAdminUsersAction`, `fetchAdminUsersPaginatedAction`, `fetchAdminUserReservationsAction`, `updateUserAction` (đổi role, khoá / mở; chặn hạ quyền admin cuối cùng) |

### Admin CMS — `web/app/admin/cms-actions.ts`

Tất cả cần `requireAdmin`. Nội dung HTML đi qua `sanitizeHtmlContent()` (allowlist thẻ, chỉ cho nhúng YouTube) trước khi lưu.

| Nội dung | Actions |
| --- | --- |
| Thành phố | `fetchLocationsAction`, `fetchAdminLocationsPaginatedAction`, `saveLocationAction`, `deleteLocationAction`, `reorderTopCitiesAction` |
| Workstation | `fetchWorkstationsAction`, `fetchAdminWorkstationsAction`, `saveWorkstationPackageAction`, `saveWorkstationComponentAction`, `deleteWorkstationComponentAction`, `saveWorkstationAddonAction`, `deleteWorkstationAddonAction`, `reorderWorkstationItemsAction` |
| Travel Guide | `fetchTravelGuidesAction`, `fetchAdminGuidesPaginatedAction`, `saveTravelGuideAction`, `deleteTravelGuideAction` |
| Blog | `fetchBlogPostsAction`, `fetchAdminBlogPostsPaginatedAction`, `saveBlogPostAction`, `deleteBlogPostAction` |
| Video cộng đồng | `fetchVideosAction`, `saveVideoAction`, `deleteVideoAction`, `reorderVideosAction` |
| Căn nổi bật | `reorderFeaturedPropertiesAction` |
| Tỷ giá | `fetchExchangeRatesAction`, `updateExchangeRatesAction` |

Linh kiện / phụ kiện Workstation đã có trong đơn đặt phòng thì không xoá được (chỉ ẩn).

## Lớp dữ liệu

Page và action không truy vấn DB trực tiếp mà gọi các hàm trong `web/lib/api/*` (`properties`, `reservations`, `hosts`, `users`, `locations`, `workstations`, `guides`, `blog`, `videos`, `rates`, `media`, `favorites`). Dữ liệu đầu vào được kiểm bằng schema Zod trong `web/lib/validations/*`, dùng chung cho form ở client và server.
