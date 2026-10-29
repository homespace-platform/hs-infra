# Nearby Places — triển khai và vận hành

Prompt memory để AI tiếp tục đúng luồng đã chốt: [HOMESPACE_NEARBY_MEMORY_PROMPT.md](../../prompts/HOMESPACE_NEARBY_MEMORY_PROMPT.md).

Module mới nằm trong hs-core-api/hs-listing-service/com.hs.listing.nearby. Không thay bảng amenities,
amenity_categories, listing_amenities; không thay geocoding Vietmap; không khôi phục provider cũ.

## Chạy ngắn gọn

1. Với lần đổi từ quét riêng 8 nhóm sang truy vấn gộp: tạo lại CSDL dev theo kế hoạch của bạn,
   cấu hình hs-core-api/.env với JPA_DDL_AUTO=update rồi khởi động Core để Java tạo schema mới.
   Hibernate update không tự xóa cột category_group NOT NULL của schema cũ. Không dùng file SQL fix/migration.
   Không chạy seed trước khi Core tạo xong schema.
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
nearby.tomtom.category-set=7372,7377,7321,7326,7332005,9361009,7315,7328,9942002,9362
nearby.tomtom.result-limit=100
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
| nearby.public-page-size | 10 địa điểm/trang |
| nearby.max-radius-m | 5000 m |
| nearby.retention-hours | 0: giữ snapshot, không tự hết hạn/xóa |
| nearby.tomtom.result-limit | 100 địa điểm, một request Nearby/lượt quét thành công |
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
không cấu hình một tọa độ chung. ofs luôn bằng 0; gộp 10 categorySet trong một request.
Cap request trong bảng là giới hạn của ứng dụng, không phải quota TomTom; đồng bộ cần Redis.
Restart dịch vụ sau khi sửa cấu hình.

Không cần cấu hình mốc kích hoạt. Khi Core chạy, worker tự đưa các tin PUBLISHED, active,
chưa hết hạn và có tọa độ hợp lệ vào hàng đợi, kể cả tin đã đăng trước lúc bật tính năng.
Mỗi lượt đối soát lấy tối đa 25 tin chưa quét hoặc đã đổi vị trí, ưu tiên tin mới nhất.
Job đã hoàn tất (SUCCESS/PARTIAL) không được tạo lại chỉ vì thời gian trôi qua, kể cả sau restart.
Tin ẩn/hết hạn hoặc thiếu tọa độ không được quét.
Quét chạy nền và tuân thủ giới hạn request trong properties; dữ liệu không xuất hiện tức thì khi khởi động.

4. Build/restart Core và AI để áp dụng cấu hình. Web/Admin chỉ cần build khi cập nhật giao diện.
   Ở web, bản đồ tùy chọn dùng
   NEXT_PUBLIC_VIETMAP_MAP_API_KEY (key trình duyệt giới hạn domain, khác key backend).
   Không có key map vẫn đọc danh sách/khoảng cách và mở Google Maps chỉ đường.
   SDK npm được ghim VietMap GL 6.0.1, là dependency runtime; chỉ tải khi mở tab Bản đồ,
   không tải script từ CDN. Xem `hs-web-app/README.md` để cấu hình key và chạy.
   Hai tab Danh sách/Bản đồ dùng chung bộ lọc 2 km, 10 tiện ích/trang và API phân trang.
   Bản đồ có ghim tin đăng màu xanh, ghim tiện ích theo nhóm, chọn hai chiều giữa danh sách
   và popup bản đồ. Không fetch thêm POI từ TomTom/VietMap khi chuyển tab.
5. Công khai một tin có tọa độ; hệ thống tự quét bán kính 2 km.
   Mục quản trị Tiện ích xung quanh được ẩn khỏi admin; URL cũ chuyển về Tổng quan.
   Backend tiếp tục tự đồng bộ khi công khai tin hoặc thay đổi vị trí; không cần bấm quét từng tin.
6. Sau khi có dữ liệu, chi tiết tin có khối Tiện ích xung quanh. AI có thể hỏi:
   “Trong các phòng vừa tìm, gần siêu thị thì nên chọn phòng nào?”
   “So sánh khoảng cách của các phòng này đến Đại học Công nghiệp, đúng cơ sở ở Gò Vấp.”
   “Đổi sang bán kính 5 km.” Nếu địa điểm có nhiều cơ sở hoặc chưa có dữ liệu, AI hỏi rõ.

## Cách hoạt động

- Chỉ tin PUBLISHED, active, chưa hết hạn, có ListingAddress hợp lệ mới được enqueue/tra cứu.
- Sự kiện sau commit chỉ đánh thức worker, không gọi provider hay ghi job trong HTTP publish.
- Reconciliation định kỳ bù tín hiệu bị mất. Job lưu ở PostgreSQL, có unique snapshot/hash,
  claim SKIP LOCKED, lease token, heartbeat và retry. Scheduler riêng không chiếm scheduler hợp đồng.
  Đối soát không tự fetch lại snapshot đã hoàn tất; cập nhật nội dung/đăng lại ở cùng địa chỉ không gọi lại.
  Lượt fetch mới xuất phát từ tin chưa từng quét hoặc thay đổi vị trí; retry chỉ dành cho lượt fetch bị lỗi.
- POI Categories V2 được client cache 24 giờ, dùng chung để xác minh graph cha–con; không tải lại cho từng listing.
  Mapping runtime gồm đúng 10 mã cấu hình, phủ 7 nhóm; CSV 119 mã chỉ còn là tài liệu tham khảo.
  Mã con được phân loại theo graph thật, không cắt prefix. Mã chưa biết vẫn lưu source/POI, không đoán nhóm,
  không xuất hiện như tiện ích đã phân loại và làm coverage PARTIAL. Nghĩa trang bị loại khỏi RECREATION.
- Mỗi listing dùng một query Nearby gộp 10 categorySet với radius=2000, limit=100, countrySet=VN.
  Chỉ gọi trang đầu ofs=0. Không phân trang TomTom, không gọi bù cho đủ 100 hoặc đủ các nhóm.
  Trả 40 địa điểm thì lưu tối đa 40; có ID lặp thì số POI riêng biệt sẽ ít hơn số kết quả nhận.
  Một phản hồi thành công được lưu và hoàn tất job ngay, kể cả summary.totalResults lớn hơn 100.
  Khi còn kết quả ngoài giới hạn, coverage=LIMITED_PROVIDER_RESPONSE; job=SUCCESS, không xếp lịch gọi trang sau.
  COMPLETE_PROVIDER_RESPONSE chỉ nghĩa là phản hồi đã lấy hết tập provider báo cáo, không chứng minh mọi POI ngoài thực tế.
  Retry chỉ xử lý request lỗi; phản hồi đã lưu được hoàn tất từ CSDL sau crash mà không gọi lại.
  Mã chưa xác minh, ID lặp hoặc dữ liệu hỏng vẫn có trạng thái PARTIAL; không gọi thêm để bù dữ liệu.
  Nhóm có 0 kết quả chỉ là không thấy trong snapshot đã thu thập; AI không được kết luận khu vực không có tiện ích đó.
  SPORTS không nằm trong 10 mã; yêu cầu nhóm này trả NOT_REQUESTED, không diễn giải là không có gym/thể thao.
- Redis reservation theo cửa sổ trượt 60 giây/ngày/tháng áp dụng chung các instance HomeSpace;
  không nhân đôi burst khi đổi phút. Mặc định tối đa 40 request trong mọi cửa sổ 60 giây.
  429 theo Retry-After; lỗi quota không làm tiêu hết số lần retry nghiệp vụ.
  401/403 tạm dừng client 15 phút; sửa key rồi restart/thử lại job FAILED.
- Source unique theo provider/version/external ID; PK place là UUID nội bộ.
  Không tự merge hai provider/V2–V3 hay địa điểm trùng tên/tọa độ.
  Unique constraint cùng advisory lock chặn trùng cả khi hai worker ghi cùng POI đồng thời.
  Phiên bản job/coverage bao gồm mapping và fingerprint categorySet; đổi query không tái dùng bằng chứng scope cũ.
- Khoảng cách tính lại Haversine theo mỗi listing, không copy dist từ truy vấn khác.
  Khi tin công khai đổi tọa độ, worker xóa các liên kết có location hash cũ của riêng tin đó
  trong listing_nearby_places, vô hiệu job cũ và đánh dấu coverage cũ STALE rồi đưa vị trí mới vào hàng đợi.
  Không xóa nearby_places, nearby_place_sources hoặc liên kết của listing khác vì đổi địa chỉ.
  POI mới được đối chiếu theo provider/api_version/external_id: đã có thì dùng lại, chưa có thì tạo,
  sau đó thêm liên kết và khoảng cách cho listing tại tọa độ mới. POI/source dùng chung vẫn được giữ.
  Khóa địa chỉ và kiểm tra lease/hash trong transaction chặn kết quả đang bay từ vị trí cũ ghi lại liên kết.
  Đổi về địa chỉ từng dùng vẫn kích hoạt quét lại, không bỏ qua vì job trước đó còn hạn.
  Đổi POI position revision cũng làm khoảng cách cũ không được sử dụng.
  Khi nhận và lưu phản hồi mới ở cùng địa chỉ, chỉ bỏ liên kết của listing không còn trong snapshot mới;
  không xóa POI/source dùng chung. Request lỗi trước khi lưu phản hồi không xóa các liên kết còn hợp lệ.
  POI đổi vị trí làm coverage cũ thành STALE; source được tin khác làm mới không kéo dài
  thời hạn bằng chứng khoảng cách của tin này. Coverage gắn với đúng license policy.
- Scan 2 km không tự được báo là đủ 3/5 km. Để trả 5 km ngay, chủ động cấu hình scan 5000
  hoặc Admin gửi job 5 km, có kiểm soát chi phí; API đọc/chat không tự gọi provider.
- Tin RESERVED/RENTED/ẩn/hết hạn không xuất hiện trong truy vấn thuê mới. Không xóa POI chung.
- nearby.retention-hours=0 tắt TTL nội bộ: dữ liệu đã thu thập được giữ và đọc từ CSDL.
  Cả API danh sách, summary, địa điểm đích và bộ lọc AI đều giữ cách đọc này;
  các timestamp expiry của dữ liệu cũ được bỏ qua, purge không xóa nguồn/POI. Không cần SQL fix hay gọi lại TomTom.
  Nếu chủ động cấu hình retention-hours dương, TTL nguồn/bằng chứng và purge áp dụng lại, nhưng không tự tạo request làm mới.
  Cấu hình lưu trữ không thay thế nghĩa vụ license/backup. Khi đổi policy/revoke:
  tắt flags, dừng worker, purge nội dung nguồn theo chính sách được phê duyệt cả backup/tracing.
- Không lưu raw_payload, key/URI key hay response body vào log.
- Địa chỉ hiển thị ghép streetNumber + streetName, municipality, countrySubdivision; bỏ thành phần thiếu,
  không dùng freeformAddress hoặc tên hành chính cũ làm fallback. source_address vẫn giữ JSON gốc để đối chiếu.
  API dựng lại địa chỉ từ source_address cho cả dữ liệu đã cache, không cần SQL sửa dữ liệu hoặc gọi lại TomTom.
- Google Maps nhận origin là latitude/longitude của listing và destination là tọa độ POI,
  áp dụng cả danh sách và popup bản đồ. Không đọc vị trí tài khoản, không yêu cầu đăng nhập.
  Thiếu tọa độ hợp lệ ở listing hoặc POI thì không tạo URL chỉ đường.
  Khoảng cách hiển thị trong danh sách và URL chỉ đường cùng đi từ listing đến POI.
- Khối Nearby trên Web chỉ gọi phạm vi 2000 m, không có bộ chọn 3/5 km; mỗi trang yêu cầu 10 địa điểm.
  API dùng nearby.public-page-size khi thiếu size và chặn kích thước trang ở mức đã cấu hình
  (hiện là 10), kể cả client gửi size=20. LIMIT và OFFSET cùng dùng kích thước đã giới hạn.
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

- GET /api/v1/public/listings/{id}/nearby-places?radiusMeters=2000&page=1&size=10
- POST /api/v1/public/listings/ai/nearby-summary
- GET /api/v1/public/listings/ai/nearby-places/search?keyword=...
- POST /api/v1/public/listings/ai/nearby-places/{id}/listings?radiusMeters=2000
- POST /api/v1/public/listings/ai/search nhận thêm nearby: {placeId hoặc group, radiusMeters}
- GET /api/v1/admin/nearby-scans
- POST /api/v1/admin/listings/{id}/nearby-scans?radiusMeters=2000
- POST /api/v1/admin/nearby-scans/{jobId}/cancel

Các cờ trong properties tắt: public panel không hiển thị, AI giữ luồng tìm phòng cũ; không có outbound POI call.
Schema được quản lý bằng entity JPA, cùng JPA_DDL_AUTO của Core. Không còn bước migration SQL riêng.

## CSDL của truy vấn gộp

Java quản lý 7 bảng, không tạo bảng riêng cho từng nhóm tiện ích:

| Bảng | Dữ liệu / khóa |
|---|---|
| nearby_places | Một POI dùng chung: tên, tọa độ, địa chỉ đã ghép và position_revision |
| nearby_place_sources | results.id → external_id; unique(provider, api_version, external_id); categorySet IDs, nhãn/classifications, địa chỉ nguồn, TTL |
| nearby_categories | Từ điển nhóm HomeSpace; giữ SPORTS để tương thích API, nhưng scope hiện tại không quét nhóm này |
| nearby_place_categories | N–N POI ↔ nhóm; một POI nhiều categorySet có thể thuộc nhiều nhóm, không nhân bản POI |
| listing_nearby_places | N–N listing ↔ POI, PK(listing_id, place_id); khoảng cách, hash tọa độ và evidence_run_id |
| nearby_scan_jobs | Hàng đợi theo listing + tọa độ + radius + phiên bản mapping/categorySet |
| nearby_scan_runs | Một phản hồi gộp: requested_category_ids, requested_groups, limit, số nhận/số POI duy nhất, tổng provider báo cáo, coverage và response_consistent |

Scan run không còn category_group. Một scan chứa cả 7 requested_groups; API đọc coverage của từng nhóm
từ cùng scan, không tạo 7/8 bản sao dữ liệu. results.dist/score không được dùng làm khoảng cách dùng chung
hoặc điểm chất lượng; khoảng cách được backend tính riêng từ tọa độ listing tới POI.

Nhập lại collection `HomeSpace_TomTom_CategorySet_FullCatalog_Test.postman_collection.json`.
Folder `00 — HomeSpace` chỉ có một query gộp limit=100, ofs=0. Đặt key trong Postman environment,
lat/lon theo listing; gửi thủ công, không tự chạy toàn bộ collection. Chuyển tab Web hoặc hỏi AI chỉ đọc CSDL.

Lưu ý seed 300 listing vẫn được worker tự đưa vào hàng đợi và tiêu quota thật. Thay đổi này giảm query theo nhóm,
không biến TomTom thành nguồn miễn phí: mỗi lượt quét thành công có một request Nearby/listing, cộng catalog dùng chung khi cache hết hạn.
Đổi địa chỉ kích hoạt lượt quét mới; thời gian trôi qua không kích hoạt request mới. Request lỗi vẫn có retry theo cấu hình.
Để dev không gọi provider, đặt nearby.sync-enabled=false trước khi khởi động; nearby.query-enabled có thể giữ true
để đọc dữ liệu đã có. Không thêm cờ/env mới.

## Kiểm thử

Xác nhận luồng một request và vòng đời snapshot (29/10/2026): 55 test Nearby Core và 8 test tìm listing bằng AI qua
trên PostgreSQL/Redis tạm riêng; AI Python 49 test qua, 2 Mongo integration bỏ qua do chưa bật opt-in;
Web 21 test Nearby qua, TypeScript và ESLint component qua. Không gọi TomTom thật hoặc tác động DB HomeSpace.

Luồng mới cần kiểm tra một request ofs=0 ngay cả khi totalResults lớn hơn 100; không gọi bù nhóm trống;
chống trùng trong phản hồi và giữa listing; request lỗi mới retry; phản hồi đã lưu không bị gọi lại sau crash.
Đã kiểm tra dữ liệu sau 30 ngày, purge, restart, phát lại sự kiện publish ở cùng tọa độ: không gọi lại provider,
API danh sách/summary/địa điểm đích và bộ lọc AI vẫn đọc được. Đổi tọa độ phát sinh đúng một request Nearby mới.
Kiểm tra thêm N–N phân loại, đổi địa chỉ, giới hạn snapshot mới và giữ POI/liên kết của listing khác.
AI chỉ so sánh bằng chứng dương có thật giữa các listing khi snapshot bị giới hạn; giới hạn được đưa vào context trả lời.

Tham khảo chính thức: [TomTom Nearby Search](https://docs.tomtom.com/search-api/documentation/search-service/nearby-search)
(`categorySet` là OR, mỗi trang tối đa 100; HomeSpace chủ động chỉ lấy trang đầu).

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
  đối soát tin chưa quét và không tạo trùng job đã hoàn tất. Không tự làm mới snapshot theo thời gian.
  Test cấu hình vẫn kiểm tra thiếu thuộc tính khiến startup lỗi.
  Kiểm tra thay đúng liên kết của listing đổi địa chỉ, giữ POI/liên kết của listing khác, provider lỗi,
  job cũ trả kết quả muộn và quay về địa chỉ từng dùng; sự kiện công khai tin vẫn kích hoạt worker.
  Kiểm tra địa chỉ đã cache vẫn được dựng lại từ thành phần mới, không dùng freeformAddress cũ;
  worker tự quét đúng 2000 m và API dùng mặc định từ properties.
  Kiểm tra size mặc định 5, size=20 bị giới hạn về 5, trang 2 lấy đúng offset và không lặp mục trang 1.
- Bộ test AI unit/contract: 462 qua, 2 Mongo integration test bỏ qua vì chưa bật opt-in;
  kiểm tra tool Nearby bật sẵn, chế độ tắt và từ chối tool provider cũ.
- Web: 22 test Nearby directions/address/pagination qua; TypeScript và ESLint phần thay đổi qua.
  Kiểm tra listing origin/POI destination, tọa độ thiếu/sai và chỉ đường không phụ thuộc hồ sơ tài khoản.
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
Schema scan gộp khác schema scan từng nhóm; không chạy binary worker cũ với schema mới.
Khôi phục phiên bản ứng dụng/schema phù hợp nếu rollback toàn bộ; không đụng bảng tiện nghi/địa chỉ/hợp đồng ngoài phạm vi.
