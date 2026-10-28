# PROMPT CHO AI AGENT — KHẢO SÁT VÀ ĐỀ XUẤT TÍCH HỢP KHO TIỆN ÍCH XUNG QUANH HOMESPACE

> Vai trò: Senior Software Architect / Backend Engineer / Database Architect / Geospatial Engineer.
>
> Dự án: **HomeSpace — nền tảng đăng tin và tìm nhà/phòng cho thuê có AI hỗ trợ bằng ngôn ngữ tự nhiên**.
>
> **CHẾ ĐỘ THỰC HIỆN BAN ĐẦU: AUDIT → THIẾT KẾ → ĐỀ XUẤT. KHÔNG TỰ Ý SỬA CODE, MIGRATE DB, GỌI API CÓ PHÍ, HAY CHẠY BACKFILL TRƯỚC KHI TÔI PHÊ DUYỆT THIẾT KẾ.**

## 0. Mục tiêu và nguyên tắc không được vi phạm

Tôi muốn phát triển tính năng: khi một bài đăng HomeSpace được **đăng thành công** và đã có địa chỉ + `latitude/longitude`, hệ thống xử lý không đồng bộ việc tìm tiện ích xung quanh theo 8 nhóm nghiệp vụ. Dữ liệu tiện ích phải có khả năng tái sử dụng giữa nhiều bài đăng, chống trùng, có quan hệ nhiều-nhiều, và cho phép tra cứu hai chiều: *bài đăng → tiện ích*, *tiện ích → bài đăng*. Sau đó, AI HomeSpace trả lời từ CSDL/nguồn dữ liệu thích hợp thay vì gọi API POI cho mỗi lượt chat; giao diện có thể render marker trên Vietmap và mở chỉ đường trên Google Maps.

**Quan trọng:** Đây là mô tả mục tiêu, **KHÔNG có nghĩa tôi đã xác nhận cấu trúc thực tế của source code hoặc giấy phép cho phép sao chép dữ liệu POI TomTom vào DB**. Trước khi đề xuất thay đổi, Agent phải:

1. Đọc đầy đủ source/repository/workspace thực tế. Không đoán stack, ORM, bảng bài đăng, cột khóa chính, lifecycle đăng tin, kiến trúc AI, message broker hay cache.
2. Tìm và ưu tiên **tái sử dụng module/bảng/cấu hình đã có**. Không tạo module trùng chức năng Vietmap/Geocoding/AI của hệ thống hiện tại.
3. Nêu bằng chứng mọi kết luận kiến trúc theo đường dẫn file, class/function, migration hoặc schema hiện có. Nếu không thấy, ghi `CHƯA XÁC MINH`, không tự bịa.
4. Không làm ảnh hưởng luồng đăng bài hiện tại. Đồng bộ POI phải có thể retry, idempotent, chạy riêng biệt sau transaction đăng bài.
5. **RÀO CHẮN PHÁP LÝ BẮT BUỘC:** xác minh điều khoản TomTom áp dụng cho key/gói cụ thể về (a) lưu POI bền vững, (b) cache kết quả phục vụ nhiều người dùng, (c) tạo database thứ cấp, (d) sử dụng POI với AI và bản đồ Vietmap, (e) ghi nhận attribution. Nếu chưa có quyền, không triển khai lưu vĩnh viễn `raw_payload`, địa chỉ, tọa độ hay metadata TomTom vào kho dùng chung. Trình bày hai phương án: **A — khi có quyền lưu trữ**; **B — khi không có quyền** (POI dataset có giấy phép phù hợp như OSM/Overture, TomTom chỉ dùng theo các giới hạn được phép). Không được giả định `free API key` tương đương quyền lưu dữ liệu.
6. Dùng **response thực tế** dưới đây làm fixture tham chiếu, không tự nghĩ ra field của TomTom hoặc khẳng định tất cả field luôn có.
7. Chỉ đưa kế hoạch triển khai trước; chờ phê duyệt rõ ràng mới chuyển sang code/migration.

## 1. Dữ liệu tham chiếu đã kiểm thử bằng Postman (TomTom Search API V2)

Endpoint đang thử:

```http
GET https://api.tomtom.com/search/2/nearbySearch/.json
  ?key={{TOMTOM_API_KEY}}
  &lat={{lat}}
  &lon={{lon}}
  &radius={{radius}}
  &limit={{limit}}
  &ofs=0
  &countrySet=VN
  &categorySet=7372,7377
```

Các mã `categorySet` này **chỉ là ví dụ nhóm giáo dục**, không phải toàn bộ 8 nhóm. Danh mục chuẩn phải tra qua `GET /search/2/poiCategories.json` hoặc file catalog Postman; không tự sáng tác ID category.

**Summary thật từ response người dùng cung cấp:**

```json
{
  "queryType": "NEARBY",
  "queryTime": 20,
  "numResults": 5,
  "offset": 0,
  "totalResults": 100,
  "fuzzyLevel": 1,
  "geoBias": { "lat": 10.8209195, "lon": 106.6872986 }
}
```

**Một POI thật, lấy nguyên giá trị từ mẫu:**

```json
{
  "type": "POI",
  "id": "SVxbmlJ-f0i3GNli51c41A",
  "score": 99.9758071899,
  "dist": 24.193703,
  "info": "search:ta:704007000015959-VN",
  "poi": {
    "name": "Trường Ngoại Ngữ-Tin Học Quốc Tế Thái Bình Dương",
    "categorySet": [{ "id": 7372010 }],
    "categories": ["language school", "school"],
    "classifications": [{
      "code": "SCHOOL",
      "names": [
        { "nameLocale": "en-US", "name": "language school" },
        { "nameLocale": "en-US", "name": "school" }
      ]
    }]
  },
  "address": {
    "streetNumber": "8",
    "streetName": "Đường Nguyễn Văn Bảo",
    "municipalitySubdivision": "Phường 4",
    "municipality": "Hạnh Thông",
    "countrySubdivision": "Hồ Chí Minh",
    "countrySubdivisionName": "Hồ Chí Minh",
    "countrySubdivisionCode": "SG",
    "postalCode": "71423",
    "countryCode": "VN",
    "country": "Việt Nam",
    "countryCodeISO3": "VNM",
    "freeformAddress": "Số 8, Đường Nguyễn Văn Bảo, Phường 4, Hồ Chí Minh, Hồ Chí Minh, 71423",
    "localName": "Hồ Chí Minh"
  },
  "position": { "lat": 10.821082, "lon": 106.687152 },
  "viewport": {
    "topLeftPoint": { "lat": 10.82198, "lon": 106.68624 },
    "btmRightPoint": { "lat": 10.82018, "lon": 106.68807 }
  },
  "entryPoints": [{
    "type": "main",
    "position": { "lat": 10.82112, "lon": 106.68724 }
  }]
}
```

**Tất cả 5 POI trong mẫu (để Agent viết unit test bằng dữ liệu có thật):**

| `results[].id` | `poi.name` | `poi.categorySet` | `dist` (m) | `position.lat` | `position.lon` |
|---|---|---|---:|---:|---:|
| `SVxbmlJ-f0i3GNli51c41A` | Trường Ngoại Ngữ-Tin Học Quốc Tế Thái Bình Dương | `7372010` | 24.193703 | 10.821082 | 106.687152 |
| `K2X_D_ae7Iv3GkKNXtxhxQ` | Trung Tâm Tin Học Ngoại Ngữ Dương Hùng Mạnh | `7372010` | 28.075152 | 10.820742 | 106.687481 |
| `qGyQP9zeugpguorbq2yxwg` | Trường Ngoại Ngữ Ngọc Nam | `7372010` | 49.667827 | 10.820516 | 106.687104 |
| `PD2I_Oe3mWp_DaqB618XFQ` | Bồi Dưỡng Văn Hóa | `7372` | 57.278134 | 10.820466 | 106.687050 |
| `BIyEIsLrvlMYnezZQI7ZPg` | Trường Tiểu Học Dân Lập Bán Trú-Nội Trú Nhựt Tân | `7372005` | 63.251334 | 10.821474 | 106.687168 |

Ghi nhớ các ngoại lệ đã **thực sự xuất hiện trong mẫu**:
- POI `Bồi Dưỡng Văn Hóa` thiếu `address.streetNumber`; các field lồng nhau phải nullable/an toàn khi parse.
- `summary.numResults=5` nhưng `summary.totalResults=100`: **KHÔNG** kết luận đã quét hết phạm vi; phải nhận biết khả năng còn trang khác và trạng thái coverage chưa hoàn tất.
- `dist` là mét **từ tâm request hiện tại**, nên không thuộc tính cố định của POI. Không đặt `dist` trong bảng tiện ích toàn cục.
- `score` là điểm **xếp hạng kết quả của truy vấn**, không phải rating/độ tin cậy 99% của POI.
- `results[].id` là mã tham chiếu địa điểm trong **chỉ mục TomTom**, có thể biến đổi qua đợt cập nhật hoặc giữa V2/V3. Không dùng làm PK nghiệp vụ HomeSpace.
- Tên và đơn vị hành chính trong TomTom có thể cũ; không tự động thay thế địa chỉ bài đăng đã được xác nhận bằng chuỗi địa chỉ POI.

**Nguồn đính kèm để đối chiếu nếu có trong workspace**: `Pasted text(4).txt` (full V2 response), `HomeSpace_TomTom_CategorySet_FullCatalog_Test.postman_collection.json`, `HomeSpace_VIETMAP_Postman_Collection(1).json`, `HomeSpace_Address_API_Gateway.postman_collection.json`. Nếu các file này không tồn tại trong repository Agent đang chạy, chỉ dùng snapshot trên; nêu rõ chưa đọc được file gốc và yêu cầu cung cấp thay vì tự suy đoán.

**Cấu trúc khả dĩ khác từ tài liệu V2 — chỉ xử lý khi API thực sự trả:** `poi.phone`, `poi.url`, `brands`, `openingHours`, `dataSources.geometry.id`, `relatedPois`, `viewport`, `entryPoints`, `mapcodes`, v.v. Đây là field tùy chọn; viết parser bảo toàn field chưa biết theo chính sách lưu trữ dữ liệu được phép.

## 2. Đầu tiên: AUDIT KIẾN TRÚC THỰC TẾ (PHẢI LÀM)

Khảo sát **tất cả repository/service của HomeSpace** đang có quyền truy cập. Không chỉ xem một README. Ưu tiên dùng công cụ `rg`, tìm entities/migrations/controllers/services/DTOs/config/routes/tests/CI; không tự đoán từ tên dự án.

Trả lời có dẫn file và class/function:

1. Công nghệ từng service (backend, frontend, database, ORM, cache, queue, scheduler, AI); repo nào là nơi phù hợp triển khai.
2. Bảng/entity thực tế của **bài đăng**: tên thật, ID type (UUID/BIGINT/...), cột `latitude`, `longitude`, địa chỉ, trạng thái draft/published/approved/rejected, nghiệp vụ tạo/cập nhật/xóa/hủy bài đăng; xác định transaction và event sau khi công khai bài.
3. Luồng Vietmap hiện tại: cách lấy/tự xác minh địa chỉ, nơi cất API key, có module chung nào tính tọa độ/địa lý không.
4. Module tích hợp AI hiện tại: ai gọi tìm bài đăng, Tool Calling/MCP/RAG đã có hay chưa, DTO hay tool nào có thể mở rộng, luồng authorization.
5. CSDL thực tế: Postgres + PostGIS hay MySQL/khác; migration convention, index support, foreign key, cascade policy, soft delete, đa tenant nếu có.
6. Queue/task thực tế: RabbitMQ/Kafka/Bull/Redis/SQS/cron/outbox/không có; retry, backoff, dead letter, log/monitoring. Chọn giải pháp **ít xâm lấn và hợp hệ thống nhất**.
7. Bảng `amenities`/`places`/`facilities`/`nearby` đã có hay chưa; không tạo trùng một mô hình dữ liệu đang tồn tại.
8. Luồng deployment, secret management, feature flags, integration test, testcontainers/test DB.
9. Quyền sử dụng TomTom gói hiện tại: **bằng chứng** về lưu trữ lâu dài/hiển thị trên nền Vietmap/AI. Nếu chưa có, đánh dấu **BLOCKER về dữ liệu**; vẫn trình bày schema kỹ thuật ở dạng đề xuất, không đưa dữ liệu TomTom vào kho vĩnh viễn.

**Bắt buộc xuất bảng `Hiện có / Bằng chứng file:line / Thiếu / Tác động / Đề xuất tái sử dụng`.** Phải phân biệt sự thật tìm được với đề xuất của Agent.

## 3. Đề xuất mô hình domain và CSDL — PHẢI CHỜ AUDIT RỒI MỚI CHỐT

Đây là **mô hình khởi tạo để phản biện**, không phải yêu cầu tạo đúng tên bảng sau khi xem repo. Dùng tên/entity thật của hệ thống nếu đã có; chỉ tạo bảng cần thiết.

### 3.1. `amenities` — thực thể POI chuẩn hóa, dùng chung

Đề xuất field; Agent phải trả bảng **column/type/null/default/index/source/giải thích** và ERD:

- `id` PK nội bộ, type phù hợp convention hiện có.
- `name`, `normalized_name`, `primary_category_code` (nếu domain cần nhóm chính), `address_text`, `address_components` có kiểm soát nguồn dữ liệu.
- `latitude`, `longitude`; spatial `location` + spatial index **chỉ nếu DB hỗ trợ**, VD `GEOGRAPHY(Point,4326)` trên PostGIS; nếu không, nêu giải pháp tương thích ORM/DB hiện có.
- `phone`, `website`, `business_status` (`UNKNOWN` mặc định), `verification_status` (`UNVERIFIED` mặc định), `verified_at`, `created_at`, `updated_at`.
- Có thể thêm `entry_points`, `viewport`, `opening_hours` hoặc JSON/child table khi **được phép lưu** và có use case; không tạo hàng chục cột rỗng không cần thiết.
- Trường trạng thái từ provider `UNKNOWN` mặc định, không tự suy ra `OPERATIONAL` chỉ vì API trả về.

### 3.2. `amenity_sources` — ánh xạ provider/external ID

- `id`, `amenity_id` FK, `provider` (`TOMTOM`, `VIETMAP`, `OSM`,...), `api_version` (`V2`, `V3`...), `external_id`, `external_info`, `source_category_ids` (0..N), `source_classifications`, `first_seen_at`, `last_seen_at`, optional `raw_payload` **chỉ nếu giấy phép cho phép**.
- Index/unique tối thiểu `(provider, api_version, external_id)`; ưu tiên khoá unique này hơn tên/lat/lon. `external_id` chưa phải xác nhận 2 phiên bản là cùng địa điểm.
- Ánh xạ nhiều bản ghi source vào cùng `amenity_id` sau quá trình entity resolution có thể audit/rollback.

### 3.3. `amenity_categories` + `amenity_category_links`

8 nhóm nghiệp vụ HomeSpace **đề xuất**: `EDUCATION`, `HEALTHCARE`, `SHOPPING`, `FOOD_DRINK`, `FINANCE`, `TRANSPORT`, `RECREATION`, `SPORTS`.

- Danh mục **nội bộ** khác mã phân loại TomTom (`7372`, `7377002`,...). Tạo mapping riêng từ mã category provider → 8 nhóm, có version và ưu tiên mã cụ thể.
- Một POI có thể thuộc nhiều nhóm: link N–N và `PRIMARY KEY (amenity_id, category_id)`.
- Đọc catalog mã từ TomTom POI Categories; không hardcode rằng 8 nhóm map chính xác vào đúng 8 ID.
- Nêu cách quản trị nhóm hiển thị UI/AI và cập nhật mapping khi catalog thay đổi.

### 3.4. `listing_amenities` — quan hệ N–N giữa bài đăng và tiện ích

- `listing_id` FK **dùng đúng bảng/type hiện có**, `amenity_id` FK, unique/PK `(listing_id, amenity_id)`.
- `straight_distance_m` (độ dài từ **tọa độ bài đăng hiện hành**), `road_distance_m` optional, `travel_duration_s` optional, `travel_mode` optional, `last_calculated_at`, `listing_location_version` hoặc phương án loại liên kết cũ khi địa chỉ đổi.
- `dist` TomTom từ truy vấn A không tái sử dụng cho bài đăng B. Tính lại Haversine/PostGIS theo vị trí từng bài; khoảng cách đường đi chỉ tính theo Vietmap Matrix/Route khi cần và được phép.
- Phải có index `(amenity_id, listing_id)` để truy vấn ngược tiện ích → các bài đăng, ngoài PK `(listing_id, amenity_id)`.

### 3.5. `amenity_scan_areas` / `poi_sync_runs` (tên cuối theo convention)

Cần metadata kiểm chứng độ bao phủ, không chỉ lưu POI:

- Vùng/tâm quét hoặc cell ID; `radius_m`, `category_group(s)`, `provider`, `api_version`, `requested_limit`, `offsets/next_page`, `returned_count`, `total_results_reported`, `is_complete`/`coverage_status`, `scan_started_at`, `scan_finished_at`, `expires_at`, `error_code`, `retry_count`, `listing_id`/idempotency key nếu thích hợp.
- `numResults < totalResults` trong sample là dấu hiệu **chưa lấy đủ trang kết quả**; không được hiển thị 'đã kiểm kê hết trường học' và không suy ra không có nhóm khác.
- Bài B gần A **không chắc** được bao phủ hết do hai hình tròn lệch tâm. Nếu cache/quét vùng được pháp lý cho phép, thiết kế kiểm tra coverage hình học và nhóm category trước khi reuse. Không đánh dấu complete chỉ vì `200 OK`.
- Có thể tách `poi_sync_jobs`/`outbox` nếu hệ thống đã có queue/job framework; đừng tạo bảng dư.

### 3.6. Nguyên tắc lưu đầy đủ các field nhưng không sai domain

Yêu cầu trình bày **bảng mapping cho toàn bộ field** từ `summary` và `results[]` (bao gồm nested). Gán mỗi field vào một trong:

- `GLOBAL_AMENITY`: thuộc POI lâu dài (`poi.name`, `position`, address, optional contact...).
- `PROVIDER_SOURCE`: external id, `poi.categorySet`, `poi.classifications`, `info`, metadata nguồn.
- `LISTING_RELATION`: `dist` nếu đã tính/kiểm tra, nhưng phải tính lại từ listing, không copy chung.
- `SCAN_RUN_ONLY`: `summary`, `queryTime`, `geoBias`, `score`, số lượng/offset và telemetry truy vấn (không coi score là chất lượng).
- `OPTIONAL_OR_CONDITIONAL`: `entryPoints`, `viewport`, `openingHours`, `relatedPois`, `dataSources`, các field thiếu/nullable.
- `NOT_PERSISTABLE_WITHOUT_PERMISSION`: nội dung TomTom nếu quyền lưu không được xác nhận.

Có thể lưu schema mở rộng qua `JSONB` **chỉ sau legal gate**; không dùng `JSONB` để tránh thiết kế relational/index cần thiết. Chuẩn hóa địa chỉ mới riêng; không sửa các string provider raw theo cảm tính.

## 4. Quy trình tạo bài đăng → tự động tìm tiện ích

Đề xuất sequence diagram theo hệ thống thực tế:

1. Chủ nhà tạo bài đăng, chọn địa chỉ có tọa độ; backend validate lat [-90,90], lon [-180,180]. **Chỉ kích hoạt theo sự kiện phù hợp với lifecycle thực tế** (ví dụ `PUBLISHED`/approved), không mặc định draft cũng gọi API.
2. Transaction ghi bài đăng commit thành công → publish event/outbox `LISTING_LOCATION_PUBLISHED` với `listingId`, `locationVersion`, lat, lon; đồng bộ không chặn request tạo bài.
3. Worker xét feature flag `NEARBY_AMENITIES_SYNC_ENABLED`, quyền lưu dữ liệu và quota; lấy lock/idempotency key. Không tiết lộ API key TomTom tới frontend hoặc log.
4. Kiểm tra dữ liệu POI hợp pháp đang tồn tại và vùng coverage; quyết định scan/bổ sung/làm mới. Nếu provider dữ liệu TomTom không được phép lưu, worker **không được** âm thầm upsert data TomTom; dùng nguồn lưu hợp pháp khác hoặc chuyển sang yêu cầu runtime theo giấy phép.
5. Gọi Nearby V2 theo danh sách mã category có kiểm thử; chia theo 8 nhóm khi nhóm gộp làm mất POI vì `limit=100`. Có pagination (`ofs`, `limit`) với tiêu chí dừng và ceiling quota, có phát hiện `totalResults > numResults`, cap và lỗi từng phần.
6. Parse/validate, map category, chuẩn hóa, lọc trùng trong từng response, resolve external ID trong DB. Nếu POI đã tồn tại, không nhân bản row; nếu provider đổi ID cần heuristic và cơ chế duyệt/rollback, không gộp tự động chỉ vì tọa độ trùng.
7. Tạo/upsert `listing_amenities` riêng cho listing hiện tại; tính khoảng cách theo tọa độ listing (chỉ đường chim bay), không lấy `dist` của A cho B.
8. Ghi sync status `PENDING/RUNNING/PARTIAL/SUCCESS/FAILED/STALE`, metric, audit; retry backoff + jitter đối với lỗi tạm thời, không retry vô hạn khi key hết quota/không có quyền.
9. Khi bài đăng thay đổi tọa độ: dùng locationVersion để vô hiệu job cũ, xóa/thay liên kết bị stale trong transaction phù hợp rồi sync vùng mới. Khi bài đăng xóa/hủy: unlink theo lifecycle; không tự xóa POI dùng chung còn FK từ bài khác.
10. Khi không gọi được provider, bài đăng vẫn hoạt động bình thường; AI/UI thể hiện tình trạng dữ liệu không sẵn có, không phát biểu 'không có tiện ích'.

Phân tích các tình huống race: hai listing cùng tạo cùng lúc, job chạy lại, duplicate message, API timeout sau khi đã ghi một phần, migration dở, thay vị trí khi job đang quét, POI đã đổi tên/đóng cửa, quota exhausted.

## 5. API nội bộ và AI Tool Calling

Đừng tự đặt route tên thật nếu repo đã có. Đề xuất hợp đồng API và chỉ rõ controller/service/domain hợp lý:

- `GET .../listings/{id}/nearby-amenities?radiusMeters=...&categories=...`: trả nhóm POI, `distanceMeters`, nguồn/tình trạng kiểm chứng, `coverageStatus`, thời điểm quét, pagination.
- `GET .../amenities/{id}/listings?maxDistanceMeters=...`: tìm các bài đăng quanh một tiện ích; filter điều kiện giá/trạng thái bài đăng/quyền xem.
- `GET .../amenities/{id}`: lấy thông tin địa điểm (theo quyền/giấy phép), không expose dữ liệu raw provider không cần thiết.
- Endpoint/job nội bộ cho admin retry/rescan/reclassify nếu phù hợp authorization.

AI: tận dụng tool registry đã có nếu có; đề xuất `find_listings_near_amenity`, `get_listing_nearby_amenities`, `find_listings_by_amenity_category`, tham số rõ ràng, DTO có `distanceType=STRAIGHT_LINE` hay `ROAD`, coverage và freshness. Không cần tự tích hợp LLM mới. AI phải phân biệt 'không tìm thấy trong dữ liệu hiện tại' và 'không có ngoài thực tế'. Khi người dùng cần chỉ đường dùng Google Maps URL tạo từ lat/lon (không yêu cầu thêm Places request).

Frontend: kiểm tra map component Vietmap hiện hữu, dùng marker trực tiếp từ danh sách POI sau khi được phép sử dụng; icon theo 8 nhóm, popup tên/khoảng cách, clustering khi nhiều điểm, circle bán kính, nút mở Google Maps, loading/partial/stale states. Không tái tạo bản đồ mới nếu hệ thống đã có.

## 6. Hệ thống vận hành, hiệu năng, bảo mật

- Bảo mật TomTom key server-side; request timeout, circuit breaker, retry có giới hạn, concurrency limit, log không lộ key/PII.
- Dự trù cost: số tin/ngày × số category/calls/pages × retry; lưu cap theo ngày, xử lý 429/quota, bật kill switch.
- Chỉ khi giấy phép cho phép: cache/reuse theo `provider + geo-cell/coverage + category + apiVersion + radius + freshness`, và chiến lược invalidation. Không coi cache shared giữa nhiều người dùng là mặc nhiên được phép.
- Spatial DB: nếu PostgreSQL+PostGIS, gợi ý GiST + ST_DWithin trên geography, ST_Distance; nếu không, giải pháp tận dụng DB hiện có với bounding box + Haversine; không tự bật extension khi chưa xác định môi trường/migration.
- Index FK, unique, batch-upsert/chunk để tránh N+1, pagination server-side, metrics `poi_scan_duration`, `poi_found_count`, `poi_dedup_rate`, `queue_lag`, `quota_usage`, `coverage_complete_rate`.
- Kiểm tra chính sách sử dụng tên/logo/attribution TomTom và hiển thị POI lên nền Vietmap. Không hứa dữ liệu nhà cung cấp cập nhật đúng hiện trạng.
- Nếu được phép lưu: chính sách TTL/refetch và chứng cứ `last_verified_at`; nếu không được phép: đề xuất dùng OSM/Overture với nghĩa vụ license phù hợp và mô tả migration từ source.

## 7. Test và tiêu chí chấp nhận

Tạo **test plan** trước, dùng fixture JSON ở §1, không gọi API live trong unit test. Sau khi được duyệt mới thực hiện:

1. Parser với 5 POI, thiếu field (`streetNumber`), category nhiều nhãn, 1 POI nhiều category IDs, không có `entryPoints`/`viewport`/phone.
2. `numResults=5`, `totalResults=100`: phải đánh dấu `PARTIAL`/incomplete, không báo full coverage.
3. Cùng external ID xuất hiện trong 2 scan: chỉ một `amenity_sources` hợp lệ và một `amenities` (nếu nhận diện đúng); hai rows `listing_amenities` khác nhau.
4. Hai bài đăng khác tọa độ → khoảng cách khác nhau; không reuse `dist` của request khác.
5. Hai provider/V2–V3 khác ID chỉ merge khi matching có cơ sở; gắn nhãn `POTENTIAL_DUPLICATE` nếu không chắc.
6. Đồng thời 2 job và retry 3 lần không tạo duplicate nhờ unique+transaction.
7. Bài đăng xóa/di dời, job cũ đến muộn, stale relation, POI bị cập nhật địa chỉ.
8. Các lỗi 401/403/429/5xx/timeout, kết quả rỗng, kết quả bị cap limit=100, hết quota. Không làm fail API tạo tin.
9. Test truy vấn ngược tiện ích → bài đăng, status/ACL, khoảng cách đúng, integration test DB và chỉ số index.
10. Bảo mật key, data retention compliance test, trạng thái disable/feature flag; không seed POI TomTom vào production khi chưa có quyền.

## 8. Định dạng đầu ra bắt buộc (TRẢ VỀ TRƯỚC KHI CODE)

Hãy viết **một báo cáo thiết kế có dẫn chứng source**, theo thứ tự:

1. **Executive summary:** chốt kiến trúc ưu tiên và 2–3 rủi ro quan trọng nhất.
2. **Source audit:** bảng `Thành phần / File:line / Hiện trạng / Tái sử dụng hay tạo mới / Mức tin cậy`.
3. **Luồng hiện tại** tạo bài đăng, lưu vị trí, gọi AI, hiển thị map; sequence diagram Mermaid nếu hữu ích.
4. **Thiết kế đề xuất:** ERD Mermaid, list bảng/quan hệ/khóa/index/constraint/type **khớp DB hiện có**. Cho bảng mapping **đầy đủ** JSON TomTom → DB/metadata/not stored.
5. **Phân tích dedup** (same provider ID, cross-version, cross-provider, human review) + ví dụ bài A/B.
6. **Thuật toán và lifecycle sync:** tạo/duyệt/cập nhật/xóa bài, phân trang/limit, vùng quét, retry/idempotency, job trạng thái, refresh.
7. **API contracts, DTOs, AI tools, Frontend Vietmap**, mẫu request/response ở mức đề xuất.
8. **Phương án pháp lý A/B**: nếu TomTom cho phép persistent store và nếu không cho phép; phần chưa rõ phải ghi rõ, kèm link/điều khoản cần xác nhận.
9. **Kế hoạch triển khai theo phase**: Phase 0 audit+license; Phase 1 DB/migration; Phase 2 worker/provider; Phase 3 query/AI/map; Phase 4 tests/backfill/monitoring; đánh dấu phase nào bị chặn.
10. **Danh sách file cụ thể cần sửa/tạo** trong source hiện tại, tác động backward-compatibility, migration/rollback plan, test cases và chỉ tiêu nghiệm thu.
11. **Các câu hỏi thật sự còn thiếu để tôi quyết định**, tối đa 5 câu, ưu tiên những điều không thể suy ra bằng cách đọc source.

**DỪNG lại sau bản đề xuất** và hỏi tôi xác nhận phương án. Chỉ sau khi tôi chấp thuận, mới được sửa code. Mọi implementation phải theo convention hiện có, có migration, test, logging và README; không thay đổi chức năng đang chạy mà chưa có kế hoạch tương thích.

## 9. Tài liệu kỹ thuật để kiểm chứng

- TomTom Search V2 Nearby: https://docs.tomtom.com/search-api/documentation/search-service/nearby-search
- TomTom Search V2 POI Categories: https://docs.tomtom.com/search-api/documentation/poi-categories-service/poi-categories
- TomTom Developer Terms: https://docs.tomtom.com/legal/terms-and-conditions (cần đọc điều khoản có hiệu lực với gói thực tế, nếu trang yêu cầu JS thì tìm bản pháp lý từ cổng TomTom/đơn hợp đồng)
- Vietmap Route V4: https://maps.vietmap.vn/docs/map-api/route-version/route-v4/
- Vietmap Matrix V4: https://maps.vietmap.vn/docs/map-api/matrix-version/matrix-v4/
- Vietmap GL JS: https://maps.vietmap.vn/docs/sdk-web-gl/overview/

**Kết quả mong muốn cuối cùng: một đề xuất có thể đưa vào HomeSpace hiện có, không phải code/sơ đồ mang tính giả định. Chỉ ra rõ cái gì đã đọc từ source, cái gì suy từ Postman và cái gì chỉ là phương án thiết kế.**
