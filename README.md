# Mini Message Board MVP 3 — SQLite nâng cao

## Yêu cầu
- Node.js **24 trở lên**, npm, trình duyệt (Chrome/Edge), VS Code.
- SQLite chạy bằng `node:sqlite` tích hợp; chỉ cài `express` qua npm.
- Đây là bài lab **không có đăng nhập / phân quyền**. Chỉ chạy trên localhost.

## Khởi động
```bash
npm install
npm start
```
Mở http://localhost:3000. Trong Terminal khác: `npm test`, `npm run check:db`.

## Migration MVP 2 — GIỮ NGUYÊN DỮ LIỆU
1. **Tắt MVP 2 và MVP 3** trước khi sao chép file CSDL.
2. Sao lưu thủ công `messages.db` của MVP 2 ra nơi an toàn.
3. Sao chép `messages.db` từ thư mục `data/` MVP 2 vào `data/messages.db` MVP 3. Nếu MVP 2 dùng `DB_FILE`, chọn đường dẫn đó.
4. Chạy `npm run check:db` để khởi tạo/migration. Lần đầu, chương trình còn tạo `data/messages.db.before-mvp3.bak` bằng SQLite `VACUUM INTO`.
5. Các ID, nội dung và `created_at` cũ được giữ nguyên. Thông điệp cũ gắn user `legacy` ID 1 và danh mục `Chung` ID 1.
6. Chạy lại không nhân đôi dữ liệu (`PRAGMA user_version=3`). **Đừng chạy hai phiên bản trên cùng một file đang mở.**

## Schema
- `users(id,username,display_name,created_at)`
- `categories(id,name,slug)`
- `messages(id,user_id,category_id,content,created_at,updated_at)`
- `message_reactions(id,message_id,user_id,reaction_type,created_at)`
- FK ON; UNIQUE (message_id,user_id); reaction like/love/wow; reaction ON DELETE CASCADE.

## API
| Method | URL | Ý nghĩa |
|---|---|---|
| GET | /api/users | Người dùng mẫu |
| GET | /api/categories | Danh mục |
| GET | /api/messages?q=&page=1&limit=10&categoryId=1 | JOIN + lọc + tìm kiếm + phân trang |
| GET | /api/messages/:id | Chi tiết |
| POST | /api/messages | `{ "message":"Chào", "userId":2, "categoryId":1 }` |
| PATCH | /api/messages/:id | `{ "message":"Nội dung mới" }` |
| DELETE | /api/messages/:id | 204 |
| GET | /api/stats/categories | GROUP BY COUNT |
| PUT | /api/messages/:id/reaction | `{ "userId":2, "reactionType":"like" }` |
| DELETE | /api/messages/:id/reaction?userId=2 | 204 |

## CHECK PASS từng bước
1. `node -v` ≥24, `npm -v` hiện phiên bản — PASS 01.
2. `npm install` không lỗi, có `node_modules/express` — PASS 02.
3. `npm run check:db` cho bốn bảng, `schema version: 3`, `foreign keys: 1`, `integrity: ok` — PASS 03.
4. Nếu có MVP 2, kiểm tra ảnh chụp COUNT và ID trước/sau migration, backup `.bak` — PASS 04.
5. `npm start`, vào localhost:3000, có giao diện, Developer Tools cho GET 200 — PASS 05.
6. Gửi tin nhắn qua giao diện: POST 201, GET nhận tin mới — PASS 06.
7. Sửa tin: PATCH 200; xóa: DELETE 204; GET ID vừa xóa 404 — PASS 07.
8. Tìm `?q=`, phân trang `?page=1&limit=1`, lọc `?categoryId=1`; JSON có `data` và `pagination` — PASS 08.
9. GET `/api/stats/categories`: JSON có `message_count`; SQLite có INDEX `idx_messages_category_created` — PASS 09.
10. PUT reaction hai lần cùng user/message: không thêm dòng trùng; đổi loại reaction, xóa tin kéo theo xóa reactions — PASS 10.
11. Dừng/chạy lại server: tin lưu SQLite còn tồn tại — PASS 11.
12. `npm test` tất cả tests PASS — PASS 12. Khi chưa `npm install`, HTTP test bị SKIP, **không tính PASS**.

## Dùng curl kiểm tra nhanh
```bash
curl -i http://localhost:3000/api/messages
curl -i -X POST http://localhost:3000/api/messages -H "Content-Type: application/json" -d '{"message":"Bai lab SQLite","userId":2,"categoryId":1}'
curl -i http://localhost:3000/api/stats/categories
```
Trên PowerShell, dùng `curl.exe` để tránh alias.

## Lưu ý an toàn và giới hạn
- User ID là user demo truyền từ client; **không phải xác thực**. Không dùng public production.
- SQLite synchronous API phù hợp bài lab; với tải lớn cân nhắc async/worker/database server.
- Lỗi migration được rollback. File backup tự động chỉ tạo lần đầu; vẫn cần sao lưu thủ công.
