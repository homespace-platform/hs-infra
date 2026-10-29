# PROMPT MEMORY CHO AI AGENT — LUỒNG NEARBY HOMESPACE

Cập nhật theo source và các quyết định đã chốt ngày **29/10/2026**.

Bạn là AI Agent tiếp tục phát triển HomeSpace. Hãy đọc bản memory này trước khi xử lý yêu cầu liên quan đến Nearby. Đây là **tính năng đã triển khai**, không phải yêu cầu xây lại từ đầu. Đối chiếu source hiện tại trước khi sửa và thực hiện yêu cầu mới trong phạm vi người dùng giao.

Nếu prompt khảo sát cũ đề xuất 8 request, phân trang lấy toàn bộ TomTom, TTL 24 giờ, 5 mục/trang hoặc gom ghim thành số lượng cụm, hãy dùng các quyết định cuối trong tài liệu này. Chỉ thay đổi quyết định đã chốt khi người dùng yêu cầu.

## 1. Mục tiêu và phân chia trách nhiệm

- Từ tọa độ bài đăng, thu thập một snapshot tiện ích xung quanh để khách thuê xem và AI đối chiếu giữa các phòng.
- **TomTom Search V2**: nguồn POI. Backend Core gọi và lưu CSDL.
- **VietMap GL JS 6.0.1**: hiển thị bản đồ nền trên frontend bằng key **public tile** riêng.
- **Google Maps URLs**: mở chỉ đường khi người dùng bấm nút.
- VietMap geocoding/địa chỉ hiện có vẫn giữ nguyên. Không khôi phục Geoapify hoặc location service cũ cho Nearby.
- Frontend và AI đọc POI từ **CSDL HomeSpace**, không gọi TomTom để quét mỗi lần xem trang hoặc chat.
- Không trộn tiện ích xung quanh với amenities/nội thất nằm bên trong phòng.

Workspace: `D:/Workspace/homespace`. Các repo liên quan: `hs-core-api`, `hs-ai-service`, `hs-web-app`, `hs-admin-portal`, `hs-infra`. Folder hạ tầng hiện tại là **hs-infra**, không dùng tên đường dẫn hs-infrastructure cũ.

## 2. Quyết định quan trọng về quota

**Một lượt fetch Nearby thành công = một HTTP request Nearby**, gộp 10 categorySet, bán kính 2 km, tối đa 100 kết quả. Không có vòng lặp theo nhóm hoặc theo trang.

| Tình huống | Hành vi hiện tại |
|---|---|
| Listing mới được PUBLISHED, active, chưa hết hạn, có tọa độ hợp lệ | Tạo job để fetch Nearby một lần |
| Listing đang PUBLISHED đổi vị trí | Vô hiệu liên kết/bằng chứng vị trí cũ của riêng listing; tạo lượt fetch cho vị trí mới |
| Sửa tiêu đề, giá, mô tả; vị trí giữ nguyên | Không fetch lại snapshot đã hoàn tất |
| Ẩn rồi đăng lại cùng vị trí, cùng scope đã quét | Không fetch lại chỉ vì publish thêm lần nữa |
| Xem tin, đổi tab bản đồ/danh sách, lọc nhóm, chuyển trang | Đọc CSDL; không gọi TomTom |
| AI tìm phòng hoặc tư vấn Nearby | Đọc API Core/CSDL; không gọi TomTom |
| Qua 24 giờ, restart Core; vị trí và cấu hình giữ nguyên | Không tự fetch lại job đã hoàn tất |
| Response 0 kết quả, ít hơn 100, thiếu một số nhóm, hoặc có ID lặp | Lưu phần hợp lệ; không gọi bù |
| Request bị lỗi có thể retry | Giữ cơ chế retry/quota; có thể có thêm HTTP request do lỗi |

### Hai ngoại lệ vận hành phải nói rõ

1. Worker có **đối soát bù** các tin public chưa từng quét và tín hiệu thay đổi vị trí bị mất, kể cả tin chèn bằng SQL seed. Đây là phát hiện công việc chưa làm, không phải tự làm mới theo thời gian. Seed 300 tin public chưa có Nearby có thể tạo khoảng **300 request Nearby**, cộng catalog và retry.
2. Scope job gồm tọa độ, bán kính và phiên bản mapping/fingerprint categorySet + result limit. Chủ động đổi scope có thể tạo job mới. Backend admin còn API enqueue/force retry; giao diện admin Nearby đã ẩn. Không tự gọi API quản trị hoặc đổi scope để làm mới toàn bộ dữ liệu.

### Request phụ `poiCategories.json`

- `GET https://api.tomtom.com/search/2/poiCategories.json?language=en-US&key=<backend-key>` lấy danh mục/quan hệ cha–con, không lấy địa điểm quanh listing.
- Chỉ được lấy khi đang xử lý job và cache danh mục chưa có/hết hạn. Không có cron riêng tự gọi endpoint này.
- Cache thành công trong bộ nhớ **24 giờ, dùng chung giữa các listing trong một instance Core**. Restart mất cache; nhiều instance có cache riêng.
- Bình thường khi cache còn hiệu lực: một listing mới tốn **1 Nearby**. Khi cache chưa có: có thể tốn **1 catalog + 1 Nearby**.
- Không nhầm TTL cache danh mục này với việc quét lại Nearby sau 24 giờ. **Không tự quét lại Nearby sau 24 giờ.**

## 3. Request TomTom đã chốt

```http
GET https://api.tomtom.com/search/2/nearbySearch/.json
    ?key=<backend-key>
    &lat=<listing.latitude>
    &lon=<listing.longitude>
    &radius=2000
    &limit=100
    &ofs=0
    &countrySet=VN
    &categorySet=7372,7377,7321,7326,7332005,9361009,7315,7328,9942002,9362
```

- Chỉ lấy `ofs=0`, kể cả `summary.totalResults` lớn hơn 100.
- Trả 40 kết quả thì xử lý 40; trả 0 thì hoàn tất lượt đó. Kết quả lỗi, ngoài bán kính hoặc trùng ID có thể làm số lưu ít hơn số nhận.
- Không gọi thêm để có đủ 100 POI, đủ các nhóm, đủ trường học/siêu thị, hoặc để bù ID bị trùng.
- Con số 100 là giới hạn **thu thập từ provider**. Con số 10 là **phân trang đọc CSDL cho FE**. Không được đánh đồng.
- `results[].id` nhận diện địa điểm; `results[].poi.categorySet[].id` nhận diện danh mục. Hai loại ID khác nhau.

## 4. Phân loại 10 mã thành 7 nhóm

| categorySet | Tiện ích | Nhóm HomeSpace |
|---|---|---|
| 7372 | Trường học | EDUCATION |
| 7377 | Đại học / Cao đẳng | EDUCATION |
| 7321 | Bệnh viện | HEALTHCARE |
| 7326 | Nhà thuốc | HEALTHCARE |
| 7332005 | Siêu thị | SHOPPING |
| 9361009 | Cửa hàng tiện lợi | SHOPPING |
| 7315 | Nhà hàng / Quán ăn | FOOD_DRINK |
| 7328 | Ngân hàng | FINANCE |
| 9942002 | Trạm xe buýt | TRANSPORT |
| 9362 | Công viên / Giải trí | RECREATION |

- Một POI có thể có nhiều mã và thuộc nhiều nhóm; không nhân bản POI theo nhóm.
- Mã con được đối chiếu bằng graph cha–con thật từ POI Categories, **không suy diễn bằng tiền tố chuỗi số hoặc tên POI**.
- Giữ mã và metadata nguồn để đối chiếu. Mã chưa xác minh có thể được lưu nhưng không tự đoán nhóm; coverage có thể PARTIAL.
- Mapping hiện loại các nhánh `9362003` và `9375` khỏi việc gán nhóm không phù hợp.
- SPORTS còn trong enum/dictionary để tương thích nhưng không nằm trong scope 10 mã và không hiện nút lọc trên FE. Không kết luận khu vực không có gym khi API trả NOT_REQUESTED.

## 5. Workflow backend

1. Lưu/đổi trạng thái listing và địa chỉ trong transaction nghiệp vụ hiện có.
2. Khi listing thành PUBLISHED hoặc cập nhật địa chỉ của listing public, phát `ScanChanged(listingId)`. Listener sau commit chỉ đánh thức worker, không chặn HTTP publish bằng request TomTom.
3. Worker gom tín hiệu trùng, gọi `ensure`, đối soát bù khi cần và claim job từ PostgreSQL. Job có khóa snapshot, lease token, heartbeat và chống claim trùng.
4. Kiểm tra lại listing public, địa chỉ hợp lệ và location hash. Job vị trí cũ bị SUPERSEDED, không ghi kết quả cũ vào vị trí mới.
5. Lấy graph danh mục từ cache hoặc request phụ khi cần. Tạo/resume một scan run cho cả query gộp.
6. Nếu phản hồi của run đã lưu trước lúc crash, hoàn tất từ CSDL; không gọi Nearby thêm. Nếu chưa lưu, gọi đúng một request Nearby rồi kiểm tra và ghi atomic.
7. Upsert POI/source, phân loại nhóm, tạo quan hệ listing–POI và tính khoảng cách riêng cho listing.
8. Hoàn tất run/job. SUCCESS/PARTIAL đã có phản hồi không được xếp lại chỉ vì `next_attempt_at` đã qua.
9. FE/AI đọc lại dữ liệu đã lưu, không phát sinh scan từ API đọc.

Worker hiện poll theo `nearby.poll-delay-ms=5000`, đối soát bù khoảng 60 giây/lượt, mỗi batch tối đa 25 tin và xử lý một job mỗi tick. **Tick/đối soát không đồng nghĩa mỗi lần đều gọi TomTom.**

### Khi đổi địa chỉ

- Location hash hiện dựa trên ID địa chỉ + latitude + longitude; cập nhật nội dung nhưng giữ nguyên snapshot vị trí không tạo lượt fetch mới.
- Chỉ xóa liên kết mang hash cũ của listing đang đổi trong `listing_nearby_places`; vô hiệu job/bằng chứng cũ của listing đó.
- Giữ `nearby_places`, `nearby_place_sources` và liên kết của listing khác.
- Với kết quả mới: POI đã có thì dùng lại/upsert; POI chưa có thì tạo; sau đó ánh xạ listing–POI theo vị trí mới.
- Đổi về địa chỉ từng dùng cũng phải xử lý lại sau lần thay đổi vị trí, không tái dùng mù quáng job bị SUPERSEDED.
- Kiểm tra lease/hash trong transaction ngăn response đang bay từ vị trí cũ ghi lại quan hệ sai.

## 6. CSDL: 7 bảng dùng chung

| Bảng | Vai trò / khóa quan trọng |
|---|---|
| nearby_places | POI chuẩn hóa dùng chung: UUID nội bộ, tên, tọa độ, địa chỉ và position_revision |
| nearby_place_sources | Metadata nguồn; `results.id` → external_id; unique(provider, api_version, external_id); category IDs, classifications, địa chỉ JSON nguồn |
| nearby_categories | Dictionary nhóm HomeSpace, có SPORTS để tương thích |
| nearby_place_categories | N–N POI ↔ nhóm; lưu phiên bản mapping |
| listing_nearby_places | N–N listing ↔ POI; PK(listing_id, place_id); khoảng cách, location hash, position revision, evidence_run_id |
| nearby_scan_jobs | Hàng đợi theo listing + location hash + radius + mapping/scope version; trạng thái, attempts, lease |
| nearby_scan_runs | Bằng chứng một query gộp: requested_category_ids + requested_groups, tâm, radius, response counters, coverage |

- Source identity hiện là `(TOMTOM, V2, external_id)`. Không chống trùng chỉ bằng tên hoặc tọa độ.
- Unique constraint và advisory lock chống trùng khi nhiều listing/worker cùng nhận một POI.
- `results[].dist` phụ thuộc tâm của request, không phải thuộc tính cố định của POI. Backend tính lại Haversine theo từng listing và lưu trên quan hệ; `distanceType=STRAIGHT_LINE`.
- POI lưu tọa độ độ chính xác 7 chữ số thập phân; so sánh vị trí sau chuẩn hóa để tránh tăng position_revision do nhiễu độ chính xác provider.
- Khi POI dùng chung đổi tọa độ/revision, không dùng khoảng cách/bằng chứng cũ như vẫn chính xác.
- Không lưu key, URL có key hoặc toàn bộ raw response vào log. Dùng các field nguồn đã chọn thay cho raw_payload tràn lan.

### Giữ dữ liệu, không TTL tự làm mới

- Cấu hình hiện tại `nearby.retention-hours=0`.
- Nguồn và bằng chứng Nearby được giữ để đọc CSDL; timestamp expiry cũ được bỏ qua trong chế độ này.
- Purge không xóa POI/source do hết thời gian khi retention bằng 0.
- API danh sách, summary, tìm địa điểm đích và predicate lọc AI đều phải áp dụng nhất quán; tránh chỉ sửa FE rồi AI vẫn mất dữ liệu sau 24 giờ.
- Trường expiry vẫn có trong schema để tương thích. Không cần SQL fix hoặc tự fetch lại để dùng dữ liệu cũ còn trong CSDL.
- Nếu người vận hành chủ động đặt retention dương, TTL đọc/purge lại có hiệu lực, nhưng không tự tạo job fetch mới chỉ do hết hạn.

## 7. Địa chỉ và coverage

Địa chỉ POI hiển thị:

```text
[streetNumber + " " + streetName], municipality, countrySubdivision
```

Bỏ thành phần thiếu. Không dùng `freeformAddress` hoặc `municipalitySubdivision` làm fallback vì có thể chứa địa chỉ hành chính cũ. `source_address` giữ JSON nguồn; API dựng lại địa chỉ từ JSON cho cả dữ liệu đã lưu.

| Trạng thái | Cách hiểu |
|---|---|
| COMPLETE_PROVIDER_RESPONSE | Đã lấy hết tập kết quả provider báo cáo cho query đó; không chứng minh mọi tiện ích thực tế đều được biết |
| LIMITED_PROVIDER_RESPONSE | Chỉ lấy trang đầu theo giới hạn 100; không gọi trang sau |
| PARTIAL | Có phần dữ liệu/bằng chứng chưa đủ, không hợp lệ hoặc chưa xác minh |
| NOT_READY | Chưa có bằng chứng phù hợp |
| NOT_REQUESTED | Nhóm chưa được quét trong scope |
| STALE | Bằng chứng vị trí/quan hệ đã cũ |

`knownCount=0` nghĩa là không thấy trong snapshot đã thu thập, **không đủ để kết luận toàn khu vực không có tiện ích**. Không gọi thêm để lấp nhóm 0. Đọc coverage mới nhất theo run, không để run cũ đầy đủ che một snapshot mới bị giới hạn.

## 8. Cấu hình và key

Nghiệp vụ/vận hành nằm trong:
`D:/Workspace/homespace/hs-core-api/hs-api-service/src/main/resources/application.properties`.

```properties
nearby.sync-enabled=true
nearby.query-enabled=true
nearby.tomtom.license-approved=true
nearby.tomtom.license-policy-id=homespace-tomtom-poi-v1
nearby.tomtom.api-key=${TOMTOM_API_KEY}
nearby.tomtom.base-url=https://api.tomtom.com
nearby.tomtom.category-set=7372,7377,7321,7326,7332005,9361009,7315,7328,9942002,9362
nearby.tomtom.result-limit=100
nearby.default-radius-m=2000
nearby.scan-radius-m=2000
nearby.public-page-size=10
nearby.max-radius-m=5000
nearby.retention-hours=0
nearby.max-attempts=4
nearby.requests-per-minute=40
nearby.requests-per-day=2000
nearby.requests-per-month=20000
nearby.poll-delay-ms=5000
nearby.purge-delay-ms=3600000
```

- Thuộc tính bắt buộc, không thêm fallback cấu hình trong Java hoặc placeholder properties. Thiếu/sai cấu hình phải lỗi startup.
- Chỉ key bí mật đặt trong `.env` backend: `TOMTOM_API_KEY=`. Không chép key thật vào prompt, source, Postman collection hay log.
- Frontend dùng `NEXT_PUBLIC_VIETMAP_MAP_API_KEY=` cho public tile; không tái dùng key geocoding bí mật của backend.
- license-policy-id là mã chính sách nội bộ HomeSpace, không phải ID lấy từ TomTom Console hay API key.
- Redis giữ ngân sách request chung giữa các instance: cửa sổ trượt 60 giây/ngày/tháng. Catalog cũng dùng cùng ngân sách.
- 429 xử lý Retry-After; quota wait không tiêu hết attempts nghiệp vụ. Lỗi retry thông thường có mức max-attempts; không hứa mọi trường hợp chỉ có đúng một HTTP request kể cả khi lỗi.
- AI có properties riêng: `nearby.query-enabled=true`, `nearby.default-radius-m=2000`. Không đưa lại cờ nghiệp vụ vào `.env`.
- Khi dev muốn giữ dữ liệu đã có mà không fetch các tin seed chưa quét: chủ động đặt `nearby.sync-enabled=false`, giữ query-enabled=true, rồi restart Core. Không tự sửa cờ này nếu người dùng chưa yêu cầu.

## 9. API Core và payload

Các URL dưới đây dùng prefix `/api/v1` qua hệ thống hiện tại. Controller Java khai báo phần `/public/...` hoặc `/admin/...`.

```http
GET /api/v1/public/listings/{listingId}/nearby-places?radiusMeters=2000&page=1&size=10
GET /api/v1/public/listings/{listingId}/nearby-places?radiusMeters=2000&groups=EDUCATION&page=1&size=10
POST /api/v1/public/listings/ai/nearby-summary
GET /api/v1/public/listings/ai/nearby-places/search?keyword=<tên địa điểm>
POST /api/v1/public/listings/ai/nearby-places/{placeId}/listings?radiusMeters=2000
POST /api/v1/public/listings/ai/search
```

Ví dụ body summary, thay UUID bằng listing public có thật trong CSDL:

```json
{
  "listingIds": ["<listing-uuid-1>", "<listing-uuid-2>"],
  "radiusMeters": 2000,
  "groups": ["EDUCATION", "SHOPPING"],
  "nearestPerGroup": 1,
  "targetPlaceId": null
}
```

- `nearby-summary` là batch summary ngắn, không trả toàn bộ 100 POI của mỗi listing cho LLM.
- Endpoint danh sách trả `enabled`, `items`, `total`, `page`, `size`, `coverage` trong `ApiResponse.result`; page bắt đầu từ 1.
- Backend dùng public-page-size khi thiếu size và cap size ở mức cấu hình hiện tại 10; LIMIT/OFFSET dùng cùng kích thước sau cap.
- Tìm listing có thể truyền `nearby: {placeId hoặc group, radiusMeters}` cùng các filters/sort/limit hiện có; Core lọc trước count/order/LIMIT.
- API đọc và chat không phụ thuộc provider client, không được biến thành trigger fetch.
- Backend admin vẫn có list/enqueue/cancel job. UI quản trị Nearby đã ẩn; URL `/operations/nearby` chuyển về Tổng quan. Không tự phục hồi màn hình này.

## 10. Frontend đã chốt

- Khối **Tiện ích xung quanh** nằm dưới **Mô tả chi tiết** của listing.
- Hai tab: **Bản đồ** đứng trước và mặc định; **Danh sách** đứng sau.
- Phạm vi FE cố định **2 km**; không có selector 3/5 km. Mỗi trang **10 địa điểm**, chung bộ lọc/trang giữa hai tab.
- Chuyển tab không gọi lại API danh sách chỉ vì đổi chế độ xem. Đổi nhóm reset về trang 1; request cũ phải bị cancel/không ghi đè dữ liệu mới.
- Map chỉ vẽ POI thuộc trang hiện tại, không tải toàn bộ các trang chỉ để có thêm marker.
- Ghim listing màu xanh. Mỗi POI có một ghim số tương ứng **thứ tự trong danh sách**: trang 1 là 1–10, trang 2 là 11–20.
- **Không gom các POI gần nhau thành ghim số lượng như “2”**. Đã bỏ cách này vì gây nhầm số thứ tự.
- Khi chồng nhau, tách nhãn bằng offset pixel và đường nối tới điểm thật; giữ nguyên tọa độ POI cho marker anchor, popup và chỉ đường.
- Ghim đang chọn được highlight và đưa lên trên. Chọn danh sách ↔ ghim phải cùng ID, đúng số/tên/màu; zoom/resize không đổi ID hoặc đánh lại sai số.
- **Đã bỏ bản đồ Google iframe ở cột phải của listing.** Cột phải giữ thông tin/chức năng chủ nhà.
- Nút **“Chỉ đường đến bài đăng” nằm ngay dưới bản đồ tiện ích ở giữa**. Khi thiếu key bản đồ nhưng tọa độ listing hợp lệ, vẫn có thể mở chỉ đường.
- Component AddressMapPreview vẫn dùng cho Settings/Profile/Admin; không xóa component dùng chung chỉ vì listing không còn dùng.
- VietMap GL được tải phía client qua dynamic import/ssr:false; giữ cleanup map, marker, popup, observer và listener.
- Giữ xử lý AbortError đúng cho SDK 6.0.1 khi teardown; không catch/nuốt mọi lỗi. Lỗi tile/quota phải hiển thị fallback và nút thử lại thủ công.

### Hai luồng Google Maps riêng biệt

1. **Đến listing**: vị trí hiện tại thiết bị → tọa độ listing. Dùng helper `currentLocationDirectionsUrl`, bỏ tham số origin; có api=1, destination=lat,lng, dir_action=navigate. Google Maps xử lý vị trí/quyền truy cập; không lấy địa chỉ Settings, không truyền chuỗi “Your location” vào origin, không yêu cầu đăng nhập HomeSpace.
2. **Đến tiện ích**: tọa độ listing → tọa độ POI. Dùng helper `nearbyDirectionsUrl(origin, destination)`, truyền origin và destination tường minh. Áp dụng cả danh sách và popup. Không lấy vị trí tài khoản/thiết bị làm origin cho luồng này.

Không tạo URL với tọa độ thiếu, sai kiểu, NaN hoặc ngoài miền hợp lệ. Không điền tọa độ mặc định khi thiếu dữ liệu.

## 11. AI tư vấn thuê phòng

- Tìm phòng bằng ngôn ngữ tự nhiên trước, lọc giá/diện tích/loại phòng/số người/tiện nghi và các tiêu chí trong Core, áp dụng LIMIT tại DB.
- Giữ số lượng tìm phòng linh động theo yêu cầu khách; **không áp giới hạn 3 cho toàn bộ chức năng tìm kiếm**.
- Khi khách hỏi tiện ích quanh các phòng đang xem, tool `get_listing_nearby_places` đọc shortlist đã biết, không tự mở rộng sang một bộ phòng khác.
- Tool `find_listings_near_place` phục vụ tìm bộ phòng mới theo địa điểm/nhóm tiện ích, cùng tiêu chí giá/diện tích khác; resolve địa điểm từ kho POI Core.
- Summary giới hạn tối đa 20 listing và còn chịu cap cấu hình; `nearestPerGroup=1`. Chỉ sau khi chọn kết quả mới đọc detail **tối đa 3 listing** để tư vấn Nearby.
- Mặc định 2 km. Nếu khách hỏi 5 km, truyền bán kính đó cho API đọc trong giới hạn 100–5000 m; dataset chỉ quét 2 km không được trình bày là phủ đủ 5 km, và không tự gọi TomTom để bù.
- Trường/nơi làm việc cụ thể cần xác định đúng địa điểm/cơ sở. Nhiều cơ sở hoặc chưa đủ dữ liệu thì hỏi rõ; không thay trường khách học bằng trường ngoại ngữ gần nhất.
- Ưu tiên theo nhu cầu thực tế: sinh viên → đúng trường/cơ sở, ăn uống/đi lại/mua sắm; người đi làm → nơi làm/đi lại/mua sắm; gia đình → trường con/y tế/công viên/siêu thị; làm từ xa → sinh hoạt thuận tiện. Chỉ hỏi thông tin còn thiếu có ảnh hưởng quyết định, không bắt khách làm bảng khảo sát persona.
- Snapshot LIMITED chỉ cho phép so sánh bằng chứng dương ở các nhóm có thể đối chiếu chung; nêu giới hạn mẫu. Không phạt một listing như chắc chắn không có siêu thị chỉ vì nhóm đó không nằm trong 100 kết quả.
- Giữ `rankingSupported`, `limitedSelection`, `comparisonGroups`, coverage và STRAIGHT_LINE trong evidence cần thiết.
- Không suy đường chim bay thành thời gian/quãng đường đi xe, chất lượng trường, độ an toàn hoặc độ yên tĩnh.
- Memory hội thoại giữ scope listing IDs/thứ tự, tiêu chí, radius và target reference; đọc lại dữ liệu hiện tại khi tư vấn, tránh dùng lại prose/POI facts cũ như bằng chứng mới.

## 12. Source để tiếp tục làm việc

### Backend Core

Root module: `D:/Workspace/homespace/hs-core-api/hs-listing-service/src/main/java/com/hs/listing/nearby/`.

- `NearbyWorker.java`: sự kiện sau commit, scheduler, một query, retry/resume.
- `NearbyRepository.java`: enqueue/idempotency/lease, source upsert, N–N, thay vị trí, retention/purge.
- `TomTomNearbyClient.java`: HTTP, tham số, cache catalog, parser response, lỗi provider.
- `NearbyCatalog.java` và `NearbyAddress.java`: phân loại và dựng địa chỉ hiển thị.
- `NearbyQueryService.java`: API đọc, summary/coverage, tìm target và predicate lọc listing.
- `NearbyBudget.java`, `NearbySettings.java`, `NearbyTypes.java`, `model/`: ngân sách, cấu hình và schema Java.
- Mapping JSON: `D:/Workspace/homespace/hs-core-api/hs-listing-service/src/main/resources/nearby/tomtom-v2-category-mapping.json`.
- Hook publish/địa chỉ: `D:/Workspace/homespace/hs-core-api/hs-listing-service/src/main/java/com/hs/listing/service/ListingStatusService.java` và `ListingService.java` cùng thư mục.
- Public controller: `D:/Workspace/homespace/hs-core-api/hs-api-service/src/main/java/com/hs/api/controller/publish/NearbyPlacesController.java`.
- Admin controller: `D:/Workspace/homespace/hs-core-api/hs-api-service/src/main/java/com/hs/api/controller/admin/NearbyScanAdminController.java`.

### AI

- `D:/Workspace/homespace/hs-ai-service/src/homespace_ai/application/nearby_listing_advice.py`.
- `D:/Workspace/homespace/hs-ai-service/src/homespace_ai/clients/listing_tool_planner.py`.
- `D:/Workspace/homespace/hs-ai-service/src/homespace_ai/tools/listings.py`.
- `D:/Workspace/homespace/hs-ai-service/src/homespace_ai/application.properties`.

### Frontend

Root: `D:/Workspace/homespace/hs-web-app/`.

- `components/rent/RentDetailView.tsx`: vị trí khối Nearby, không còn sidebar map.
- `components/nearby/NearbyPlacesPanel.tsx`: tab/lọc/page, danh sách và nút chỉ đường đến listing.
- `components/nearby/NearbyMap.tsx`: lifecycle SDK, trạng thái nền bản đồ và legend.
- `components/nearby/nearby-map-controller.ts`: ghim, giãn nhãn, popup, lựa chọn, cleanup.
- `components/nearby/nearby-map.css`: marker/đường nối/popup.
- `services/nearby.service.ts`, `types/nearby.type.ts`: phạm vi 2000 m, trang 10 mục, contract API.
- `lib/nearby-directions.ts`, `lib/nearby-presentation.ts`: hai loại URL chỉ đường, màu/khoảng cách/radius ring.
- Đọc `AGENTS.md` và tài liệu Next đi kèm node_modules trước khi sửa Next/React.

### Tài liệu và Postman

Root: `D:/Workspace/homespace/hs-infra/postman/tomtom/`.

- `README_NEARBY_PLACES.md`: hướng dẫn/schema/API/kiểm thử.
- `HOMESPACE_AI_AGENT_TOMTOM_CATEGORYSET_MAPPING_ADDENDUM.md`: quyết định query gộp và catalog tham khảo.
- `HomeSpace_TomTom_CategorySet_FullCatalog_Test.postman_collection.json`: folder 00 — HomeSpace có query production gộp.
- `HomeSpace_Nearby_Places_Core.postman_collection.json`: kiểm thử API Core qua Gateway.
- Các prompt khảo sát ban đầu có đề xuất đã cũ; không áp lại cơ chế 8 request, quét lại TTL hay gom marker số lượng.

## 13. Kiểm thử và nguyên tắc khi sửa tiếp

- Không chạy Postman Runner/live TomTom chỉ để kiểm thử, tránh tốn quota; dùng fixture/fake provider.
- Core có test cho query gộp một request, limit=100, nhóm rỗng/ID trùng, resume sau crash, N–N, đổi địa chỉ/đổi lại địa chỉ cũ, quota, pagination, đọc AI và giữ snapshot sau 30 ngày/restart.
- Web có test số ghim 1–10/11–20, nhiều điểm trùng tọa độ, chọn đúng ghim/popup/URL, tab/page, teardown AbortError, hai luồng chỉ đường và việc bỏ sidebar map.
- Checkpoint đã xác nhận trong phiên: 63 test backend cho lifecycle/AI; 12 test cấu hình/API/PostgreSQL liên quan khi đổi trang lên 10; lần cập nhật UI cuối có 42 test Web, TypeScript và ESLint qua. Đây là checkpoint lịch sử; thay đổi sau đó cần kiểm thử lại phần bị ảnh hưởng.
- Lệnh Web từ repo hs-web-app:

```powershell
node --test tests/listing-furnishings.test.cjs tests/nearby-map.test.cjs tests/nearby-directions.test.cjs tests/address-map-preview.test.cjs
npx tsc --noEmit
npx eslint components/rent/RentDetailView.tsx components/nearby/NearbyPlacesPanel.tsx components/nearby/NearbyMap.tsx components/nearby/nearby-map-controller.ts
```

- Core dùng Maven profile `isolated-build` để không đụng output IDE. PostgreSQL integration phải là DB test riêng tên `hs_nearby_test`, Redis test cũng riêng; không trỏ các test create-drop vào DB HomeSpace. Tạo môi trường test đúng rồi mới bật opt-in `HS_NEARBY_TEST_PG_URL` / `HS_NEARBY_TEST_REDIS_PORT`.
- Schema do Java/JPA quản lý. **Không tạo SQL migration/fix mới cho Nearby. Không tự drop DB của người dùng.** Nếu cần thay đổi schema không tương thích, giải thích rõ và để người dùng quyết định thao tác DB thực tế.
- Giữ thay đổi không liên quan của người dùng; không tự reset, commit hoặc push chỉ vì đọc memory này.

## 14. Cách bắt đầu một yêu cầu tiếp theo

Đọc yêu cầu mới → xác định phần BE/AI/FE liên quan → đối chiếu source và dữ liệu đang có → tái sử dụng module hiện tại → sửa đúng phạm vi được giao → kiểm thử phần bị ảnh hưởng → báo ngắn gọn kết quả và cách áp dụng. Không coi bản memory là lệnh tự chạy backfill, gọi TomTom, thay quota hoặc xây lại tính năng.
