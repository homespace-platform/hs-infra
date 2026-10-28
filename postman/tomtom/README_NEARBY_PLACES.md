# Nearby Places — triển khai và vận hành

Module mới nằm trong hs-core-api/hs-listing-service/com.hs.listing.nearby. Không thay bảng amenities,
amenity_categories, listing_amenities; không thay geocoding Vietmap; không khôi phục provider cũ.

## Chạy ngắn gọn

1. Cấu hình hs-core-api/.env với JPA_DDL_AUTO=update rồi khởi động Core.
   Có thể giữ database hiện có; không cần drop database hoặc chạy file SQL tạo/sửa schema Nearby.
2. Hibernate tự tạo 7 bảng Nearby từ entity Java trong com.hs.listing.nearby.model,
   gồm field, khóa ngoại, khóa ghép, unique, index và default. NearbyCategoryInitializer
   tự bổ sung 8 nhóm nội bộ khi startup; không gọi TomTom hoặc seed POI.
   Nếu tạo database trống, sau đó chạy seed listing như luồng hiện tại.

3. Trong hs-core-api/.env, nhóm TomTom chỉ khai báo key bí mật:

~~~dotenv
TOMTOM_API_KEY=
~~~

Toàn bộ cấu hình nghiệp vụ/vận hành nằm tại
hs-core-api/hs-api-service/src/main/resources/application.properties, có giá trị tường minh:

~~~properties
nearby.sync-enabled=true
nearby.query-enabled=true
nearby.tomtom.license-approved=true
nearby.tomtom.license-policy-id=homespace-tomtom-poi-v1
nearby.tomtom.base-url=https://api.tomtom.com
nearby.tomtom.api-key=${TOMTOM_API_KEY}
~~~

Không có fallback trong @Value, scheduler hoặc placeholder của file properties.
Xóa một thuộc tính Nearby bắt buộc hoặc thiếu biến TOMTOM_API_KEY sẽ làm startup lỗi;
giá trị không hợp lệ cũng lỗi khi tạo bean. Đồng bộ và truy vấn đã bật sẵn;
chỉ cần điền TOMTOM_API_KEY hợp lệ trong .env backend rồi build/restart.

Các giá trị vận hành sau cũng được khai báo ngay trong cùng file properties:

| Thuộc tính | Giá trị đã cấu hình |
|---|---:|
| nearby.default-radius-m | 2000 m |
| nearby.scan-radius-m | 2000 m |
| nearby.public-page-size | 5 địa điểm/trang |
| nearby.max-radius-m | 5000 m |
| nearby.retention-hours | 24 giờ |
| nearby.max-pages-per-group | 10 |
| nearby.max-attempts | 4 |
| nearby.requests-per-minute | 40 |
| nearby.requests-per-day | 2000 |
| nearby.requests-per-month | 20000 |
| nearby.poll-delay-ms | 5000 ms |
| nearby.purge-delay-ms | 3600000 ms |

license-policy-id là mã nội bộ HomeSpace tự đặt để phiên bản hóa chính sách/provenance của dữ liệu;
không lấy từ TomTom Console, không phải API key và không phải bằng chứng quyền sử dụng.
Ví dụ homespace-tomtom-poi-v1. Khi chính sách thay đổi, đổi mã và xử lý dữ liệu cũ theo chính sách.
license-approved được đặt true cùng cấu hình bật tính năng theo yêu cầu vận hành;
cờ này không cấp thêm quyền sử dụng từ TomTom.

Core đã bật sẵn sync-enabled/query-enabled=true.
Trong hs-ai-service/src/homespace_ai/application.properties, nearby.query-enabled=true cũng đã bật sẵn.
AI khai báo nearby.default-radius-m=2000 trong cùng file properties; thiếu/sai bán kính làm startup lỗi.
File properties của AI được đóng gói cùng ứng dụng; thiếu file hoặc thiếu/sai cờ cũng làm startup lỗi.
Không dùng NEARBY_QUERY_ENABLED trong .env của AI nữa.

Postman baseUrl tương ứng nearby.tomtom.base-url. latitude/longitude lấy từ từng listing,
không cấu hình một tọa độ chung. ofs tự tăng khi phân trang; categorySet lấy từ mapping 8 nhóm.
Cap request trong bảng là giới hạn của ứng dụng, không phải quota TomTom; đồng bộ cần Redis.
Restart dịch vụ sau khi sửa cấu hình.

Không cần cấu hình mốc kích hoạt. Khi Core chạy, worker tự đưa các tin PUBLISHED, active,
chưa hết hạn và có tọa độ hợp lệ vào hàng đợi, kể cả tin đã đăng trước lúc bật tính năng.
Mỗi lượt đối soát lấy tối đa 25 tin cần quét, ưu tiên tin mới nhất; job còn mới không bị tạo lại.
Dữ liệu hết hạn được tự quét lại. Tin ẩn/hết hạn hoặc thiếu tọa độ không được quét.
Quét chạy nền và tuân thủ giới hạn request trong properties; dữ liệu không xuất hiện tức thì khi khởi động.

4. Build/restart Core và AI để áp dụng cấu hình. Web/Admin chỉ cần build khi cập nhật giao diện.
   Ở web, bản đồ tùy chọn dùng
   NEXT_PUBLIC_VIETMAP_MAP_API_KEY (key trình duyệt giới hạn domain, khác key backend).
   Không có key map vẫn đọc danh sách/khoảng cách và mở Google Maps chỉ đường.
   SDK npm được ghim VietMap GL 6.0.1, là dependency runtime; chỉ tải khi mở tab Bản đồ,
   không tải script từ CDN. Xem `hs-web-app/README.md` để cấu hình key và chạy.
   Hai tab Danh sách/Bản đồ dùng chung bộ lọc 2 km, 5 tiện ích/trang và API phân trang.
   Bản đồ có ghim tin đăng màu xanh, ghim tiện ích theo nhóm, chọn hai chiều giữa danh sách
   và popup bản đồ. Không fetch thêm POI từ TomTom/VietMap khi chuyển tab.
5. Công khai một tin có tọa độ; hệ thống tự quét bán kính 2 km.
   Admin → Vận hành & Hỗ trợ → Tiện ích xung quanh theo dõi 100 job gần nhất,
   thử lại, hủy hoặc chủ động quét 5 km khi cần. Không cần bấm quét từng tin.
6. Sau khi có dữ liệu, chi tiết tin có khối Tiện ích xung quanh. AI có thể hỏi:
   “Trong các phòng vừa tìm, gần siêu thị thì nên chọn phòng nào?”
   “So sánh khoảng cách của các phòng này đến Đại học Công nghiệp, đúng cơ sở ở Gò Vấp.”
   “Đổi sang bán kính 5 km.” Nếu địa điểm có nhiều cơ sở hoặc chưa có dữ liệu, AI hỏi rõ.

## Cách hoạt động

- Chỉ tin PUBLISHED, active, chưa hết hạn, có ListingAddress hợp lệ mới được enqueue/tra cứu.
- Sự kiện sau commit chỉ đánh thức worker, không gọi provider hay ghi job trong HTTP publish.
- Reconciliation định kỳ bù tín hiệu bị mất. Job lưu ở PostgreSQL, có unique snapshot/hash,
  claim SKIP LOCKED, lease token, heartbeat và retry. Scheduler riêng không chiếm scheduler hợp đồng.
- Lấy actual POI Categories V2 trước khi quét; graph cha–con từ API, không cắt prefix ID.
  Mapping versioned chứa 119 mã tham khảo, 55 mapping nghiệp vụ; mã chưa được catalog xác minh
  không được đoán nhóm. Source lưu parent-edge evidence cùng TTL để audit cách phân loại.
- Không gọi 42 request trong collection cho mỗi tin. Quét 8 nhóm, mỗi nhóm có pagination/budget.
  5/100 kết quả luôn PARTIAL. 100 là giới hạn một trang, không chứng minh quét hết vùng.
- Redis reservation theo cửa sổ trượt 60 giây/ngày/tháng áp dụng chung các instance HomeSpace;
  không nhân đôi burst khi đổi phút. Mặc định tối đa 40 request trong mọi cửa sổ 60 giây.
  429 theo Retry-After; lỗi quota không làm tiêu hết số lần retry nghiệp vụ.
  401/403 tạm dừng client 15 phút; sửa key rồi restart/thử lại job FAILED.
- Source unique theo provider/version/external ID; PK place là UUID nội bộ.
  Không tự merge hai provider/V2–V3 hay địa điểm trùng tên/tọa độ.
- Khoảng cách tính lại Haversine theo mỗi listing, không copy dist từ truy vấn khác.
  Khi tin công khai đổi tọa độ, worker xóa các liên kết có location hash cũ của riêng tin đó
  trong listing_nearby_places, vô hiệu job cũ và đánh dấu coverage cũ STALE rồi đưa vị trí mới vào hàng đợi.
  Không xóa nearby_places, nearby_place_sources hoặc liên kết của listing khác vì đổi địa chỉ.
  POI mới được đối chiếu theo provider/api_version/external_id: đã có thì dùng lại, chưa có thì tạo,
  sau đó thêm liên kết và khoảng cách cho listing tại tọa độ mới. Giới hạn lưu trữ/TTL nguồn vẫn áp dụng riêng.
  Khóa địa chỉ và kiểm tra lease/hash trong transaction chặn kết quả đang bay từ vị trí cũ ghi lại liên kết.
  Đổi về địa chỉ từng dùng vẫn kích hoạt quét lại, không bỏ qua vì job trước đó còn hạn.
  Đổi POI position revision cũng làm khoảng cách cũ không được sử dụng.
  POI đổi vị trí làm coverage cũ thành STALE; source được tin khác làm mới không kéo dài
  thời hạn bằng chứng khoảng cách của tin này. Coverage gắn với đúng license policy.
- Scan 2 km không tự được báo là đủ 3/5 km. Để trả 5 km ngay, chủ động cấu hình scan 5000
  hoặc Admin gửi job 5 km, có kiểm soát chi phí; API đọc/chat không tự gọi provider.
- Tin RESERVED/RENTED/ẩn/hết hạn không xuất hiện trong truy vấn thuê mới. Không xóa POI chung.
- Nguồn hết hạn không được trả; purge nền xóa source hết hạn và place không còn nguồn.
  Đây là TTL nội bộ, không thay thế nghĩa vụ license/backup. Khi đổi policy/revoke:
  tắt flags, dừng worker, purge nội dung nguồn theo chính sách được phê duyệt cả backup/tracing.
- Không lưu raw_payload, key/URI key hay response body vào log.
- Địa chỉ hiển thị ghép streetNumber + streetName, municipality, countrySubdivision; bỏ thành phần thiếu,
  không dùng freeformAddress hoặc tên hành chính cũ làm fallback. source_address vẫn giữ JSON gốc để đối chiếu.
  API dựng lại địa chỉ từ source_address cho cả dữ liệu đã cache, không cần SQL sửa dữ liệu hoặc gọi lại TomTom.
- Google Maps nhận origin là latitude/longitude địa chỉ tài khoản hiện tại và destination là tọa độ POI.
  Không dùng tọa độ listing làm origin. Chưa đăng nhập thì mời đăng nhập; tài khoản thiếu vị trí thì dẫn cập nhật hồ sơ.
  Khoảng cách hiển thị trong danh sách vẫn là listing–POI; URL chỉ đường dùng account–POI.
- Khối Nearby trên Web chỉ gọi phạm vi 2000 m, không có bộ chọn 3/5 km; mỗi trang yêu cầu 5 địa điểm.
  API dùng nearby.public-page-size khi thiếu size và chặn kích thước trang ở mức đã cấu hình
  (hiện là 5), kể cả client gửi size=20. LIMIT và OFFSET cùng dùng kích thước đã giới hạn.
- AI đọc summary ngắn của shortlist rồi chỉ lấy detail tối đa 3 tin cho lời khuyên Nearby.
  Tìm phòng thông thường vẫn hỗ trợ số lượng linh động và lọc tiêu chí trong DB trước LIMIT.
- Named target được resolve từ kho POI; nhiều cơ sở → hỏi rõ. Không lấy trường ngoại ngữ gần nhất
  thay đại học người dùng nêu. Khoảng cách không phải thời gian đi lại, chất lượng hay độ yên tĩnh.
- Lịch sử Mongo/signed guest state không chép cố định prose chứa POI; chỉ giữ lời nhắc đọc lại,
  listing IDs/thứ tự và tiêu chí/bán kính/target reference. Câu trả lời hiện tại vẫn hiển thị đầy đủ.

## API để test

Đối chiếu endpoint/field với tài liệu chính thức:
[Nearby Search V2](https://docs.tomtom.com/search-api/documentation/search-service/nearby-search),
[POI Categories V2](https://docs.tomtom.com/search-api/documentation/poi-categories-service/poi-categories).

Import HomeSpace_Nearby_Places_Core.postman_collection.json; điền listingId và access_token cho admin.
Collection này chỉ gọi HomeSpace Core qua Gateway, không nhúng TomTom key.
Các request admin là thao tác chủ động; không chạy Runner toàn bộ collection.

- GET /api/v1/public/listings/{id}/nearby-places?radiusMeters=2000&page=1&size=5
- POST /api/v1/public/listings/ai/nearby-summary
- GET /api/v1/public/listings/ai/nearby-places/search?keyword=...
- POST /api/v1/public/listings/ai/nearby-places/{id}/listings?radiusMeters=2000
- POST /api/v1/public/listings/ai/search nhận thêm nearby: {placeId hoặc group, radiusMeters}
- GET /api/v1/admin/nearby-scans
- POST /api/v1/admin/listings/{id}/nearby-scans?radiusMeters=2000
- POST /api/v1/admin/nearby-scans/{jobId}/cancel

Các cờ trong properties tắt: public panel không hiển thị, AI giữ luồng tìm phòng cũ; không có outbound POI call.
Schema được quản lý bằng entity JPA, cùng JPA_DDL_AUTO của Core. Không còn bước migration SQL riêng.

## Kiểm thử

~~~powershell
# Core unit + integration opt-in, URL chỉ chấp nhận database hs_nearby_test
$env:HS_NEARBY_TEST_PG_URL="jdbc:postgresql://127.0.0.1:<test-port>/hs_nearby_test"
# Tùy chọn test quota: Redis tạm riêng tại 127.0.0.1:57869, không dùng Redis HomeSpace.
$env:HS_NEARBY_TEST_REDIS_PORT="57869"
cd D:\Workspace\homespace\hs-core-api
mvn -Pisolated-build -pl hs-api-service -am test "-Dtest=Nearby*Test,AiListing*Test,Vietmap*Test" "-Dsurefire.failIfNoSpecifiedTests=false"
# PostgreSQL test dùng user/password nearby_test trong container tạm, không dùng database homespace_core.

cd D:\Workspace\homespace\hs-ai-service
uv run --no-sync pytest tests/unit tests/contract -q
~~~

Fixture 5 POI là snapshot người dùng cung cấp, không phải live request mới. Seed 300 điểm hiện là
street reference/approximate; không dùng seed này để chứng nhận khoảng cách tới số nhà thực tế.
Live provider/pilot chưa chạy trong bước kiểm thử; bộ test dùng provider fixture và database tạm riêng.

Kết quả kiểm tra ngày 28/10/2026:

- Core Nearby: bộ test ban đầu đã qua trên PostgreSQL 16 và Redis 7 tạm riêng; không dùng DB/cache HomeSpace.
  Sau khi chuyển JPA, 15 test PostgreSQL đã qua với schema tạo trực tiếp bằng Hibernate từ entity Java,
  gồm kiểm tra 7 bảng, initializer 8 nhóm chạy lại an toàn, JSON, khóa ghép và worker; không đọc DDL từ file SQL.
- Sau khi cố định Web 2 km và phân trang 5 địa điểm: 40 test Nearby Core qua, gồm 24 PostgreSQL và Redis quota trên container tạm riêng.
  Kiểm tra tự quét tin cũ không cần mốc kích hoạt/Admin, ưu tiên tin mới, bỏ tin không khả dụng,
  tự làm mới job hết hạn và không tạo trùng job còn mới. Test cấu hình vẫn kiểm tra thiếu thuộc tính khiến startup lỗi.
  Kiểm tra thay đúng liên kết của listing đổi địa chỉ, giữ POI/liên kết của listing khác, provider lỗi,
  job cũ trả kết quả muộn và quay về địa chỉ từng dùng; sự kiện công khai tin vẫn kích hoạt worker.
  Kiểm tra địa chỉ đã cache vẫn được dựng lại từ thành phần mới, không dùng freeformAddress cũ;
  worker tự quét đúng 2000 m và API dùng mặc định từ properties.
  Kiểm tra size mặc định 5, size=20 bị giới hạn về 5, trang 2 lấy đúng offset và không lặp mục trang 1.
- Bộ test AI unit/contract: 462 qua, 2 Mongo integration test bỏ qua vì chưa bật opt-in;
  kiểm tra tool Nearby bật sẵn, chế độ tắt và từ chối tool provider cũ.
- Web: 22 test Nearby directions/address/pagination qua; TypeScript và ESLint phần thay đổi qua.
  Kiểm tra account origin/POI destination, tọa độ thiếu/sai và không dùng hồ sơ của tài khoản trước.
- Gateway: 7 test route/header/security qua. Web và Admin production build thành công; ESLint phần Nearby qua.
- Web card/chat regression: 41/42 qua. Test `guest can use the shared composer and sees an anonymous greeting; loading stays gated`
  lỗi ở assertion chữ “Khách được hỏi 3 câu”; kiểm tra lại source HEAD cũng có cùng lỗi, ngoài phạm vi module Nearby.
- Chưa kiểm thử live TomTom, Vietmap map render hoặc pilot ingest; không drop/tác động homespace_core của bạn.

## Theo dõi và rollback

Prometheus có nearby_provider_requests_total, nearby_provider_duration_seconds,
nearby_sync_duration_seconds, nearby_jobs_completed_total; trang Admin có status/error code/attempts.
Theo dõi PARTIAL/FAILED và quota trước mở rộng số tin. Module dùng scheduler một luồng quét mỗi instance;
nhiều instance chia lease + budget Redis.

Rollback bằng tắt nearby.sync-enabled/nearby.query-enabled trong properties Core
và nearby.query-enabled trong properties AI, rồi restart. Không drop bảng lúc worker còn chạy.
Schema additive có thể giữ khi rollback app; không đụng bảng tiện nghi/địa chỉ/hợp đồng cũ.
