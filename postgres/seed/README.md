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

`nearby_places_tomtom_snapshot.json` lưu **1.328 POI thật từ TomTom**, kèm external ID, tọa độ, phân loại, địa chỉ, timestamp và tham chiếu SHA256 tới response gốc trong `nearby-source/tomtom/`. Dữ liệu đã được thu thập một lần tại ba tọa độ listing có thật trong JSON, đối chiếu cây danh mục chính thức; không sinh POI hoặc nội suy tọa độ. Toàn bộ snapshot đã nhúng vào `listings_seed_hcm.sql`, nên **drop volume xong vẫn seed được**, không cần CSDL cũ hay gọi API lấy lại.

SQL seed thêm cả 7 bảng: `nearby_categories`, `nearby_places`, `nearby_place_sources`, `nearby_place_categories`, `nearby_scan_jobs`, `nearby_scan_runs`, `listing_nearby_places`. Một POI chỉ lưu một lần theo `TOMTOM/V2/externalId`; nhiều listing dùng chung `place_id`. Tính khoảng cách từ tọa độ gốc, chỉ liên kết trong **2.000 m**, tối đa **100 điểm/tin**. Chọn mẫu offline: giữ tối đa 5 điểm gần nhất mỗi nhóm và 3 điểm gần nhất mỗi loại trong 10 category đã cấu hình, chống trùng rồi lấp phần còn lại theo khoảng cách. Nhờ vậy trường đại học không bị trường mầm non lấn hết, bệnh viện không bị nhà thuốc lấn hết, và quán ăn không chiếm toàn bộ 100 điểm. Không ép đủ nhóm nếu nguồn không có; không đổi workflow runtime một request gộp khi publish/đổi tọa độ.

Snapshot hiện tại cho kết quả:

| Kết quả trong 2 km | Số listing |
|---|---:|
| Đủ 100 điểm từ kho | 300 |
| Có 1–99 điểm | 0 |
| Chưa có điểm trong snapshot | 0 |

Nguyên nhân lỗi cũ: kho 100 POI chỉ quanh một tin gần IUH, dùng lại cho cả 300 tin nên 30 tin rỗng và 41 tin thiếu. Kho mới tạo **30.000 liên kết / 300 snapshot offline**, sử dụng **772 POI**, trong đó **743 POI được nhiều tin dùng chung**. Tổng 1.328 POI được giữ để tra cứu địa điểm đích; không phải 30.000 POI bị nhân bản.

| Nhóm | POI trong kho | Tin có nhóm trong 2 km |
|---|---:|---:|
| Giáo dục (cả trường học và đại học/cao đẳng) | 341 | 300 |
| Y tế (bệnh viện, nhà thuốc) | 352 | 300 |
| Mua sắm (siêu thị, cửa hàng tiện lợi) | 163 | 300 |
| Ăn uống | 300 | 300 |
| Ngân hàng | 164 | 300 |
| Trạm xe buýt | 1 | 79 |
| Giải trí/công viên theo phân loại nguồn | 7 | 300 |

Mỗi tin có ít nhất **6 nhóm**, không giả trạm xe buýt cho 221 tin còn lại. Không có điểm trong một nhóm nghĩa là chưa ghi nhận trong kho, không chứng minh ngoài thực tế không có. `nearby_seed_audit.json` ghi từng ID địa chỉ, số điểm/nhóm/loại, khoảng cách gần/xa nhất và 100 `place_id` đã chọn để đối chiếu.

Các job được seed terminal `PARTIAL`, attempts=0, đúng location hash, radius và fingerprint cấu hình hiện tại. Worker `reconcile/claim` không gọi TomTom cho 300 tin seed khi restart hoặc qua 24 giờ. Runs ghi `OFFLINE_SEED/CACHE_V1`, `OFFLINE_CACHE_REPLAY`, request count=0 và coverage `PARTIAL`, **không giả là 300 phản hồi provider mới**. Public/AI đọc được các liên kết và điểm đã lưu. Dòng vàng có thể vẫn hiển thị: 100 điểm là mẫu có thật, không phải bằng chứng đã thu thập mọi địa điểm/nhóm trong bán kính. Không đổi coverage thành COMPLETE để che cảnh báo.

Đổi tọa độ listing sau seed, thay scope/category/version cấu hình hoặc chủ động force đồng bộ vẫn có thể tạo request thật theo workflow backend. Tin mới ngoài seed cũng hoạt động như bình thường. Seed không tắt Nearby toàn hệ thống.

**Trình tự an toàn sau drop volume:** khởi động Core để tạo schema/catalog và account → dừng Core → chạy toàn bộ `listings_seed_hcm.sql` → kiểm tra thống kê COMMIT → khởi động Core lại. Listing và completed jobs cùng một transaction nên không có khoảng trống để worker thấy 300 tin public chưa có snapshot. Khi chạy lại seed trên DB có dữ liệu, dừng Core để tránh tranh chấp với job đang chạy; SQL sẽ từ chối nếu phát hiện lease RUNNING còn hiệu lực.

Seed bảo toàn source timestamp/tọa độ đã export, không tự nhận POI đang hoạt động hoặc đã xác minh tại hiện trường. Khi chạy lại trên DB có POI mới hơn, source identity hiện có được dùng lại và không bị snapshot cũ ghi đè; liên kết seed được tính lại từ tọa độ đang lưu. POI chung và liên kết của listing ngoài seed không bị xóa.

## Khi sửa JSON

Tại `D:\Workspace\homespace\hs-infra`:

```powershell
node scripts/build-listings-seed.mjs
node scripts/audit-nearby-seed.mjs
node --test scripts/build-listings-seed.test.mjs scripts/build-nearby-seed.test.mjs
node scripts/build-listings-seed.mjs --check
node scripts/audit-nearby-seed.mjs --check
```

Script cập nhật các vùng snapshot sinh tự động (JSON địa chỉ, mã hành chính đã đối chiếu và Nearby), không sửa JSON gốc. Cần checkout `hs-web-app` bên cạnh `hs-infra` để đọc catalog; khi đổi catalog frontend hãy chạy lại build và `--check`. SQL xuất ra vẫn tự chứa dữ liệu, chạy độc lập bằng pgAdmin. Giữ `id` và `pointIndex` ổn định khi cập nhật để không tạo listing khác. Không dùng `sync-hcm-seed-wards.mjs` cũ với seed mới.

Build cũng cập nhật vùng Nearby và đọc properties/`NearbyCatalog.VERSION` từ `hs-core-api` bên cạnh để sinh đúng fingerprint runtime. Build hoàn toàn offline, không đọc API key. Khi đổi cấu hình scope hoặc thêm POI thật vào snapshot, chạy build + tests + `--check` trước khi seed. Không tự đổi tên/provider/external ID của dữ liệu nguồn; giữ provenance rõ ràng.

### Chuẩn bị nguồn một lần (đã làm sẵn, không cần chạy khi seed)

`collect-nearby-seed.mjs` tách biệt hoàn toàn khỏi build/SQL/Core. Lần chuẩn bị này đã dùng **31 request thật**: 1 danh mục + 30 truy vấn (3 tâm × 10 loại), không phân trang, không retry ngầm. Mỗi request limit 100, radius 2 km, cách nhau tối thiểu 2,1 giây. Response không chứa API key được lưu cố định; ID/tên/tọa độ/địa chỉ/cây category đều kiểm chứng lại trước build.

`node scripts/collect-nearby-seed.mjs` chỉ dựng lại từ các response đã lưu, **0 request**; thiếu file thì dừng. Chỉ lệnh có `--fetch` mới được phép đọc `TOMTOM_API_KEY` backend và lấy các capture còn thiếu (tối đa 31 request, file đã có không gọi lại). Không cần chạy lệnh này cho việc seed thông thường. Quy cách provider: [Nearby Search](https://docs.tomtom.com/search-api/documentation/search-service/nearby-search), [POI Categories](https://docs.tomtom.com/search-api/documentation/poi-categories-service/poi-categories).

## Kiểm thử database dùng một lần

Test opt-in `ListingSeedPostgresTest` trong Core tạo schema thực bằng Hibernate và chạy SQL hai lần, kiểm tra tọa độ/NULL, mã phường, chi tiết/ảnh, idempotency, rollback và không ảnh hưởng bản ghi khác. Test còn gọi `ListingPublicService.search` trên PostgreSQL thật để kiểm tra tỉnh, ba phường, mã cũ/sai tỉnh, phân trang, loại hình, giá, diện tích và từ khóa. Chỉ trỏ `HS_SEED_TEST_PG_URL` tới PostgreSQL test rỗng tên `hs_seed_test`, **không trỏ vào DB dev/production** (test dùng create-drop).

Test Nearby đối chiếu từng POI với snapshot và response gốc, tính lại khoảng cách, kiểm tra chính xác 100 ID được chọn/nhóm cho từng tin trong báo cáo, chống trùng, page size 10, rerun/rollback và giữ liên kết của tin ngoài seed. Chạy `reconcile` cùng worker bật sync với provider mock để chứng minh **0 provider calls** cho 300 tin đã seed.

Hoặc dùng runner tự tạo/xóa PostgreSQL riêng (cần Docker, Java 21, `mvn` trong PATH và image `postgres:16-alpine` có sẵn):

```powershell
node scripts/test-listings-seed.mjs
```

Runner chỉ đặt `HS_SEED_TEST_PG_URL` cho database `hs_seed_test` trong container test ngẫu nhiên; không dùng container `hs-postgres` hay cấu hình CSDL dev.

Không push hoặc chạy seed vào database đang sử dụng tự động.
