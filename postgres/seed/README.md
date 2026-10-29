# Seed 300 listing demo

Nguồn: `homespace_seed_300_duong_govap.json` (giữ nguyên file người dùng). Mỗi `id` tạo một listing và một `listing_addresses`: 100 nhà, 100 căn hộ, 100 phòng trọ. Giá/nội thất/chính sách và ba ảnh S3 là dữ liệu mô phỏng.

Tiêu đề/mô tả hiển thị theo cách viết tin cho thuê thông thường, không có `[DEMO]` hay số thứ tự điểm. Nguồn mô phỏng được giữ trong comment SQL và `listings.status_reason`. Diện tích, số phòng/WC/tầng, nội thất và giá được sinh từ cùng một kịch bản, dùng chung cho nội dung và bảng chi tiết. Không tự thêm số nhà, dự án có tên riêng hoặc khoảng cách tới trường/bệnh viện. Ảnh vẫn dùng ba object S3 đã có, không phải 300 bộ ảnh bất động sản thật.

Thời điểm đăng được phân bố trong các ngày gần đây và lượt xem là số liệu mô phỏng, không phải hoạt động người dùng thật. Chạy lại SQL sẽ cập nhật đúng các ID seed hiện có; không cần drop CSDL chỉ để đổi nội dung tin.

**Đây là 300 điểm tham chiếu gần đúng trên đường, không phải 300 nhà thật đã xác minh.** Giữ nguyên latitude/longitude. `refId`, `houseNumber`, `districtId`, `district`, `resolvedAt` thiếu thì SQL lưu NULL; không tự tạo ref Vietmap hoặc giả lập thời điểm resolve. Mã tỉnh có sẵn được chuyển thành chuỗi. Tỉnh/phường hiển thị giữ theo JSON, chưa được xác minh theo tọa độ.

`ward_id` được bổ sung từ **chính hai file `hs-web-app/data/vietmap/province.json` và `ward.json` đang dùng cho filter**: khớp chính xác `cityId` + tên tỉnh + tên phường/xã có tiền tố. Không dùng mã ThangLeQuoc cũ, không match gần đúng, không đoán từ tọa độ. Tên không có trong catalog vẫn NULL; mã/tên/tỉnh mâu thuẫn hoặc tên trùng trong cùng tỉnh làm build lỗi. JSON 300 điểm gốc không bị sửa. Snapshot SQL hiện ánh xạ Gò Vấp `24588` (142 tin), An Nhơn `24332` (109), Hạnh Thông `24076` (49), tỉnh `12`.

Lỗi phiên bản seed trước: lưu `ward_id=NULL` nên filter theo mã luôn trả rỗng dù thẻ tin có tên phường. Chạy lại **toàn bộ SQL mới** sẽ upsert các mã đúng cho 300 ID cũ, không cần drop DB hoặc SQL fix riêng. Backend tiếp tục lọc theo ID, không bỏ điều kiện phường và không tìm tên thay thế.

## Chạy

1. Sau khi bạn tạo lại CSDL rỗng `homespace_core`, khởi động Core đã cập nhật để Hibernate tạo schema và catalog.
2. Đảm bảo tài khoản ADMIN `homespace` đã được bootstrap, sau đó **dừng Core** trước khi seed. Backend tạo `listing_addresses` với `ref_id`, `ward_id`, `resolved_at` cho phép NULL ngay từ đầu; không cần SQL sửa schema.
3. Mở `listings_seed_hcm.sql` và chạy **toàn bộ file** trên cùng database. JSON đã được nhúng sẵn; không cần mount JSON vào PostgreSQL.
4. Khi SQL COMMIT thành công, khởi động Core lại. Các job Nearby của 300 tin đã có trạng thái hoàn tất nên không cần gọi TomTom bù.

Seed chạy trong transaction, kiểm tra dữ liệu trước COMMIT, upsert theo ID cố định. Không thêm cột/sửa schema, không gọi API. Không xóa listing thật hoặc 2.580 tin seed cũ: nếu DB còn dữ liệu cũ thì tổng tin có thể lớn hơn 300.

## Nearby offline — không gọi TomTom khi seed

`nearby_places_tomtom_snapshot.json` đã lưu **100 POI thật đang có trong cache TomTom**, kèm external ID, tọa độ, phân loại, địa chỉ và timestamp nguồn. Toàn bộ snapshot này cũng được nhúng vào `listings_seed_hcm.sql`. Vì vậy **drop volume xong vẫn seed được**, không cần CSDL cũ, không cần import JSON riêng hoặc gọi API để lấy lại.

SQL seed thêm cả 7 bảng: `nearby_categories`, `nearby_places`, `nearby_place_sources`, `nearby_place_categories`, `nearby_scan_jobs`, `nearby_scan_runs`, `listing_nearby_places`. Một POI chỉ lưu một lần; nhiều listing dùng chung `place_id`. Khoảng cách được tính từ tọa độ POI thật và tọa độ listing, chỉ liên kết trong **2.000 m**, lấy tối đa **100 điểm gần nhất**. Không nhân bản 100 POI cho từng tin và không di chuyển tọa độ để đủ số lượng.

Snapshot hiện tại cho kết quả:

| Kết quả trong 2 km | Số listing |
|---|---:|
| Đủ 100 điểm từ kho | 229 |
| Có 1–99 điểm | 41 |
| Chưa có điểm trong snapshot | 30 |

Tổng **100 POI dùng chung / 24.853 liên kết / 300 snapshot offline**. Kho này tập trung quanh IUH; 0 kết quả nghĩa là snapshot chưa có bằng chứng cho khu vực đó, không phải thực tế không có tiện ích. Muốn đủ 100 điểm cho cả 300 tin cần bổ sung snapshot POI thật bao phủ các khu vực thiếu, không thể tự tạo tọa độ giả.

Các job được seed terminal `PARTIAL`, attempts=0, đúng location hash, radius và fingerprint cấu hình hiện tại. Worker `reconcile/claim` không gọi TomTom cho 300 tin seed khi restart hoặc qua 24 giờ. Runs ghi `OFFLINE_SEED/CACHE_V1`, `OFFLINE_CACHE_REPLAY`, request count=0 và coverage `PARTIAL`, **không giả là 300 phản hồi provider mới**. Public Nearby vẫn xem được điểm và phân trang; AI hiện có thể từ chối xếp hạng nhóm theo coverage chưa đủ. Không đổi coverage thành COMPLETE chỉ để AI trả lời chắc chắn.

Đổi tọa độ listing sau seed, thay scope/category/version cấu hình hoặc chủ động force đồng bộ vẫn có thể tạo request thật theo workflow backend. Tin mới ngoài seed cũng hoạt động như bình thường. Seed không tắt Nearby toàn hệ thống.

**Trình tự an toàn sau drop volume:** khởi động Core để tạo schema/catalog và account → dừng Core → chạy toàn bộ `listings_seed_hcm.sql` → kiểm tra thống kê COMMIT → khởi động Core lại. Listing và completed jobs cùng một transaction nên không có khoảng trống để worker thấy 300 tin public chưa có snapshot. Khi chạy lại seed trên DB có dữ liệu, dừng Core để tránh tranh chấp với job đang chạy; SQL sẽ từ chối nếu phát hiện lease RUNNING còn hiệu lực.

Seed bảo toàn source timestamp/tọa độ đã export, không tự nhận POI đang hoạt động hoặc đã xác minh tại hiện trường. Khi chạy lại trên DB có POI mới hơn, source identity hiện có được dùng lại và không bị snapshot cũ ghi đè; liên kết seed được tính lại từ tọa độ đang lưu. POI chung và liên kết của listing ngoài seed không bị xóa.

## Khi sửa JSON

Tại `D:\Workspace\homespace\hs-infra`:

```powershell
node scripts/build-listings-seed.mjs
node --test scripts/build-listings-seed.test.mjs scripts/build-nearby-seed.test.mjs
node scripts/build-listings-seed.mjs --check
```

Script cập nhật các vùng snapshot sinh tự động (JSON địa chỉ, mã hành chính đã đối chiếu và Nearby), không sửa JSON gốc. Cần checkout `hs-web-app` bên cạnh `hs-infra` để đọc catalog; khi đổi catalog frontend hãy chạy lại build và `--check`. SQL xuất ra vẫn tự chứa dữ liệu, chạy độc lập bằng pgAdmin. Giữ `id` và `pointIndex` ổn định khi cập nhật để không tạo listing khác. Không dùng `sync-hcm-seed-wards.mjs` cũ với seed mới.

Build cũng cập nhật vùng Nearby và đọc properties/`NearbyCatalog.VERSION` từ `hs-core-api` bên cạnh để sinh đúng fingerprint runtime. Build hoàn toàn offline, không đọc API key. Khi đổi cấu hình scope hoặc thêm POI thật vào snapshot, chạy build + tests + `--check` trước khi seed. Không tự đổi tên/provider/external ID của dữ liệu nguồn; giữ provenance rõ ràng.

## Kiểm thử database dùng một lần

Test opt-in `ListingSeedPostgresTest` trong Core tạo schema thực bằng Hibernate và chạy SQL hai lần, kiểm tra tọa độ/NULL, mã phường, chi tiết/ảnh, idempotency, rollback và không ảnh hưởng bản ghi khác. Test còn gọi `ListingPublicService.search` trên PostgreSQL thật để kiểm tra tỉnh, ba phường, mã cũ/sai tỉnh, phân trang, loại hình, giá, diện tích và từ khóa. Chỉ trỏ `HS_SEED_TEST_PG_URL` tới PostgreSQL test rỗng tên `hs_seed_test`, **không trỏ vào DB dev/production** (test dùng create-drop).

Test Nearby đối chiếu từng POI với snapshot, tính lại khoảng cách, kiểm tra chia sẻ/chống trùng, đúng số điểm trong 2 km, page size 10, rerun/rollback và giữ liên kết của tin ngoài seed. Chạy `reconcile` cùng worker bật sync với provider mock để chứng minh **0 provider calls** cho 300 tin đã seed.

Hoặc dùng runner tự tạo/xóa PostgreSQL riêng (cần Docker, Java 21, `mvn` trong PATH và image `postgres:16-alpine` có sẵn):

```powershell
node scripts/test-listings-seed.mjs
```

Runner chỉ đặt `HS_SEED_TEST_PG_URL` cho database `hs_seed_test` trong container test ngẫu nhiên; không dùng container `hs-postgres` hay cấu hình CSDL dev.

Không push hoặc chạy seed vào database đang sử dụng tự động.
