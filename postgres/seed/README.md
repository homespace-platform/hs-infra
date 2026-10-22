# Seed 300 listing demo

Nguồn: `homespace_seed_300_duong_govap.json` (giữ nguyên file người dùng). Mỗi `id` tạo một listing và một `listing_addresses`: 100 nhà, 100 căn hộ, 100 phòng trọ. Giá/nội thất/chính sách và ba ảnh S3 là dữ liệu mô phỏng.

Tiêu đề/mô tả hiển thị theo cách viết tin cho thuê thông thường, không có `[DEMO]` hay số thứ tự điểm. Nguồn mô phỏng được giữ trong comment SQL và `listings.status_reason`. Diện tích, số phòng/WC/tầng, nội thất và giá được sinh từ cùng một kịch bản, dùng chung cho nội dung và bảng chi tiết. Không tự thêm số nhà, dự án có tên riêng hoặc khoảng cách tới trường/bệnh viện. Ảnh vẫn dùng ba object S3 đã có, không phải 300 bộ ảnh bất động sản thật.

Thời điểm đăng được phân bố trong các ngày gần đây và lượt xem là số liệu mô phỏng, không phải hoạt động người dùng thật. Chạy lại SQL sẽ cập nhật đúng các ID seed hiện có; không cần drop CSDL chỉ để đổi nội dung tin.

**Đây là 300 điểm tham chiếu gần đúng trên đường, không phải 300 nhà thật đã xác minh.** Giữ nguyên latitude/longitude. `refId`, `houseNumber`, `districtId`, `district`, `resolvedAt` thiếu thì SQL lưu NULL; không tự tạo ref Vietmap hoặc giả lập thời điểm resolve. Mã tỉnh có sẵn được chuyển thành chuỗi. Tỉnh/phường hiển thị giữ theo JSON, chưa được xác minh theo tọa độ.

`ward_id` được bổ sung từ **chính hai file `hs-web-app/data/vietmap/province.json` và `ward.json` đang dùng cho filter**: khớp chính xác `cityId` + tên tỉnh + tên phường/xã có tiền tố. Không dùng mã ThangLeQuoc cũ, không match gần đúng, không đoán từ tọa độ. Tên không có trong catalog vẫn NULL; mã/tên/tỉnh mâu thuẫn hoặc tên trùng trong cùng tỉnh làm build lỗi. JSON 300 điểm gốc không bị sửa. Snapshot SQL hiện ánh xạ Gò Vấp `24588` (142 tin), An Nhơn `24332` (109), Hạnh Thông `24076` (49), tỉnh `12`.

Lỗi phiên bản seed trước: lưu `ward_id=NULL` nên filter theo mã luôn trả rỗng dù thẻ tin có tên phường. Chạy lại **toàn bộ SQL mới** sẽ upsert các mã đúng cho 300 ID cũ, không cần drop DB hoặc SQL fix riêng. Backend tiếp tục lọc theo ID, không bỏ điều kiện phường và không tìm tên thay thế.

## Chạy

1. Sau khi bạn tạo lại CSDL rỗng `homespace_core`, khởi động Core đã cập nhật để Hibernate tạo schema và catalog.
2. Đảm bảo tài khoản ADMIN `homespace` đã được bootstrap. Backend tạo `listing_addresses` với `ref_id`, `ward_id`, `resolved_at` cho phép NULL ngay từ đầu; không cần SQL sửa schema.
3. Mở `listings_seed_hcm.sql` và chạy **toàn bộ file** trên cùng database. JSON đã được nhúng sẵn; không cần mount JSON vào PostgreSQL.

Seed chạy trong transaction, kiểm tra dữ liệu trước COMMIT, upsert theo ID cố định. Không thêm cột/sửa schema, không gọi API. Không xóa listing thật hoặc 2.580 tin seed cũ: nếu DB còn dữ liệu cũ thì tổng tin có thể lớn hơn 300.

## Khi sửa JSON

Tại `D:\Workspace\homespace\hs-infrastructure`:

```powershell
node scripts/build-listings-seed.mjs
node --test scripts/build-listings-seed.test.mjs
node scripts/build-listings-seed.mjs --check
```

Script cập nhật hai vùng snapshot (JSON nguồn và các mã hành chính đã đối chiếu), không sửa JSON gốc. Cần checkout `hs-web-app` bên cạnh `hs-infrastructure` để đọc catalog; khi đổi catalog frontend hãy chạy lại build và `--check`. SQL xuất ra vẫn tự chứa dữ liệu, chạy độc lập bằng pgAdmin. Giữ `id` và `pointIndex` ổn định khi cập nhật để không tạo listing khác. Không dùng `sync-hcm-seed-wards.mjs` cũ với seed mới.

## Kiểm thử database dùng một lần

Test opt-in `ListingSeedPostgresTest` trong Core tạo schema thực bằng Hibernate và chạy SQL hai lần, kiểm tra tọa độ/NULL, mã phường, chi tiết/ảnh, idempotency, rollback và không ảnh hưởng bản ghi khác. Test còn gọi `ListingPublicService.search` trên PostgreSQL thật để kiểm tra tỉnh, ba phường, mã cũ/sai tỉnh, phân trang, loại hình, giá, diện tích và từ khóa. Chỉ trỏ `HS_SEED_TEST_PG_URL` tới PostgreSQL test rỗng tên `hs_seed_test`, **không trỏ vào DB dev/production** (test dùng create-drop).

Hoặc dùng runner tự tạo/xóa PostgreSQL riêng (cần Docker, Java 21, `mvn` trong PATH và image `postgres:16-alpine` có sẵn):

```powershell
node scripts/test-listings-seed.mjs
```

Runner chỉ đặt `HS_SEED_TEST_PG_URL` cho database `hs_seed_test` trong container test ngẫu nhiên; không dùng container `hs-postgres` hay cấu hình CSDL dev.

Không push hoặc chạy seed vào database đang sử dụng tự động.
