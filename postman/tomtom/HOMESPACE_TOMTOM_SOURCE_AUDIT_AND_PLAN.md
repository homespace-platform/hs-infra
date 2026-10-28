# HomeSpace — Khảo sát source và đề xuất kho tiện ích xung quanh

Ngày khảo sát: 27/10/2026 (Asia/Bangkok). Trạng thái: ĐỀ XUẤT, CHƯA TRIỂN KHAI.

Cập nhật 28/10/2026: module đã được triển khai trong source; theo yêu cầu mới nhất,
đồng bộ và truy vấn bật sẵn, tự quét tin công khai có tọa độ, không cần mốc kích hoạt.
Hướng dẫn hiện hành: [README_NEARBY_PLACES.md](README_NEARBY_PLACES.md).
Theo yêu cầu dựng lại CSDL của người dùng: schema Nearby do entity JPA/Hibernate quản lý;
file SQL tạo bảng đã bỏ, không cần chạy migration thủ công. Java khởi tạo 8 nhóm nội bộ.
Quy ước cấu hình mới: nghiệp vụ/vận hành Nearby nằm trong properties với giá trị tường minh,
không fallback; .env của nhóm TomTom chỉ giữ API key. license-policy-id là mã nội bộ HomeSpace tự đặt.
Phần dưới giữ nguyên kết quả khảo sát tại thời điểm 27/10; live provider/backfill chưa chạy.

Tài liệu này thực hiện yêu cầu AUDIT → THIẾT KẾ trong prompt và phụ lục TomTom.
Chỉ tạo báo cáo Markdown này. Không sửa source chạy thật, migration, seed, cấu hình key;
không chạy test hệ thống, Postman Runner, API TomTom/LLM hay backfill trong lượt khảo sát.
Các kiểm đếm JSON/CSV chỉ đọc file. Kết luận runtime DB, gói/quota/license chưa có bằng chứng
được ghi CHƯA XÁC MINH. Không diễn giải tên tài liệu hay API key trống thành quyền sử dụng.

## 1. Kết luận kiến trúc ưu tiên

Đặt domain Nearby Places trong hs-core-api/hs-listing-service; controller ở hs-api-service.
Không tạo lại location service, không chuyển POI ingestion sang AI Service, không thay geocoding Vietmap.
Tạo kho địa điểm dùng chung và quan hệ listing–place, quét nền khi tin đủ điều kiện công khai.
AI tiếp tục tìm phòng bằng tool hiện có, sau đó đọc các truy vấn POI đã lưu để tư vấn, tối đa 3
lựa chọn đề xuất mặc định; số tin tìm kiếm 5/10/20 theo nhu cầu vẫn giữ linh động.

Ba điều chỉnh bắt buộc so với tên/schema gợi ý trong prompt:

1. amenities, amenity_categories, listing_amenities đã tồn tại cho tiện nghi của căn/phòng.
   Không đổi nghĩa hoặc nhét POI TomTom vào các bảng này: dữ liệu còn phục vụ hợp đồng/snapshot.
   Dùng tên nearby_places, nearby_categories, listing_nearby_places để tránh va chạm.
2. Core đang khai báo PostgreSQL 16 thường, chưa thấy PostGIS trong image/init/dependencies.
   Phase đầu chạy được bằng bounding box + Haversine; PostGIS là nâng cấp được xét riêng.
3. Frontend hiện có Google Maps iframe, chưa có bản đồ Vietmap GL đa marker.
   Vietmap geocoding đang dùng không đồng nghĩa SDK bản đồ đã tích hợp.

Rủi ro chính: quyền persist/reuse TomTom chưa xác minh; coverage không đầy đủ nếu chỉ lấy 100 kết quả;
tọa độ seed hiện là điểm tham chiếu gần đúng nên không dùng chứng nhận khoảng cách đến từng căn nhà.

## 2. Source audit — hiện có / bằng chứng / thiếu / tác động / tái sử dụng

Mức tin cậy CAO bên dưới nghĩa là đã đối chiếu file, không có nghĩa đã kiểm tra deployment đang chạy.

| Thành phần / hiện có | Bằng chứng file:line / symbol | Thiếu hoặc chưa rõ | Tác động | Đề xuất tái sử dụng / độ tin cậy |
|---|---|---|---|---|
| Core Maven đa module, Spring Boot 4.1.0, Java 21, JPA/Hibernate | [Core pom](D:/Workspace/homespace/hs-core-api/pom.xml:5), [Listing pom](D:/Workspace/homespace/hs-core-api/hs-listing-service/pom.xml:31) | Chưa có Nearby domain | Có thể đặt cùng transaction/database của listing | Package com.hs.listing.nearby, không thêm microservice; CAO |
| Gateway và Discovery Java 21/Spring Boot | [Gateway pom](D:/Workspace/homespace/hs-gateway-server/pom.xml:5), [Discovery pom](D:/Workspace/homespace/hs-discovery-server/pom.xml:5) | Không có route POI đang hoạt động sau khi gỡ provider cũ | API mới phải theo Gateway auth hiện tại | Dùng public/admin prefixes hiện có; CAO |
| Web Next.js 16.3 + React; admin React/Vite | [Web package](D:/Workspace/homespace/hs-web-app/package.json), [Admin package](D:/Workspace/homespace/hs-admin-portal/package.json) | Chưa có Vietmap GL dependency | Multi-marker cần thêm SDK/client component | Giữ form/profile và iframe hiện có; CAO |
| Chat/News là NestJS + Mongo/Mongoose, có Eureka module | [Chat module](D:/Workspace/homespace/hs-chat-service/src/app.module.ts:3), [News module](D:/Workspace/homespace/hs-news-service/src/app.module.ts:3) | Không sở hữu listing transaction | Không nên đặt kho POI tại đây | Không thay đổi hai service này; CAO |
| AI FastAPI/Python 3.12, OpenAI tool planner, RAG, SQLAlchemy/Alembic | [AI package](D:/Workspace/homespace/hs-ai-service/pyproject.toml), [AI pipeline](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/api/v1/agent_ask.py:86), [AI migrations](D:/Workspace/homespace/hs-ai-service/migrations/versions/93c564133fbd_create_knowledge_tables.py) | Chưa có tool đọc Nearby store | AI không truy cập Core DB trực tiếp | Mở rộng ListingTools qua Gateway; CAO |
| listings PK chuỗi UUID varchar(36), không phải PostgreSQL uuid | [Listing](D:/Workspace/homespace/hs-core-api/hs-listing-service/src/main/java/com/hs/listing/model/Listing.java:24); UUID sinh trong prePersist | Không có location revision riêng trên listing | FK mới phải khớp varchar(36) | ID POI cùng convention; CAO |
| Mười trạng thái, chỉ PUBLISHED là tin tìm kiếm công khai | [ListingStatus](D:/Workspace/homespace/hs-core-api/hs-listing-service/src/main/java/com/hs/listing/model/constant/ListingStatus.java), [AI search](D:/Workspace/homespace/hs-core-api/hs-listing-service/src/main/java/com/hs/listing/service/AiListingSearchService.java:55) | Chưa có event POI | Không scan draft hay pending review | Hook chuyển vào PUBLISHED, đồng thời lọc active/expires_at khi đọc; CAO |
| User tạo/sửa tin là transaction và gửi duyệt; admin có cập nhật giữ nguyên status | [ListingService.upsert](D:/Workspace/homespace/hs-core-api/hs-listing-service/src/main/java/com/hs/listing/service/ListingService.java:53), [updateByAdmin](D:/Workspace/homespace/hs-core-api/hs-listing-service/src/main/java/com/hs/listing/service/ListingService.java:123) | Chỉ hook tạo tin sẽ bỏ sót admin sửa tọa độ tin đang PUBLISHED | Cần cả status hook và address-change hook | Sau upsertAddress phát tín hiệu; worker đọc lại dữ liệu sau commit; CAO |
| ListingStatusService.change tập trung lưu status/history | [change](D:/Workspace/homespace/hs-core-api/hs-listing-service/src/main/java/com/hs/listing/service/ListingStatusService.java:203) | Chưa thấy published event/outbox cho POI | Nhiều đường tái công khai: duyệt, bỏ ẩn, hết giữ chỗ, kết thúc hợp đồng | Hook tập trung và idempotent; CAO |
| Địa chỉ tách listing_addresses; một dòng/listing | [ListingAddress](D:/Workspace/homespace/hs-core-api/hs-listing-service/src/main/java/com/hs/listing/model/ListingAddress.java:7) | Dữ liệu demo có thể thiếu provider identity | Không dùng user address làm tâm quét cho listing | Lấy listing_addresses active; CAO |
| AddressFields có numeric(10,7), @Version Long, city/ward mới | [AddressFields](D:/Workspace/homespace/hs-core-api/hs-common-service/src/main/java/com/hs/common/persistence/AddressFields.java:11) | @Version còn đổi khi sửa ghi chú, không chỉ đổi vị trí | Dùng row version đơn thuần có thể quét lại không cần thiết | Thêm fingerprint tọa độ cho job/relation; CAO |
| Vietmap backend lấy data_new, không fallback data_old | [VietmapService](D:/Workspace/homespace/hs-core-api/hs-common-service/src/main/java/com/hs/common/location/VietmapService.java:88) | Không có TomTom provider hiện tại | Không ghi địa giới TomTom đè địa chỉ mới | Giữ Vietmap làm nguồn địa chỉ listing; CAO |
| Listing copy địa chỉ từ branch/saved user address khi upsert | [upsertAddress](D:/Workspace/homespace/hs-core-api/hs-listing-service/src/main/java/com/hs/listing/service/ListingService.java:608) | Branch update hiện đồng bộ charges, không thấy đồng bộ lại snapshot listing_addresses | Nếu quét theo branch mới sẽ lệch tọa độ tin đang lưu | ListingAddress là nguồn có thẩm quyền; quyết định propagation riêng; CAO |
| amenities là catalog code/name và danh mục HOUSE/APARTMENT/ROOM | [Amenity](D:/Workspace/homespace/hs-core-api/hs-listing-service/src/main/java/com/hs/listing/model/Amenity.java:10), [WIFI/ELEVATOR/GYM initializer](D:/Workspace/homespace/hs-core-api/hs-listing-service/src/main/java/com/hs/listing/config/ListingReferenceDataInitializer.java:32) | Không có tọa độ POI | Dùng lại bảng gây lẫn tiện nghi bên trong và tiện ích xung quanh | Giữ nguyên; Nearby domain riêng; CAO |
| listing_amenities là @ManyToMany của listing | [Listing.amenities](D:/Workspace/homespace/hs-core-api/hs-listing-service/src/main/java/com/hs/listing/model/Listing.java:119) | Quan hệ hiện tại không có khoảng cách | Không được migrate quan hệ này sang POI | Tạo listing_nearby_places; CAO |
| BaseEntity hỗ trợ audit timestamps và active | [BaseEntity](D:/Workspace/homespace/hs-core-api/hs-common-service/src/main/java/com/hs/common/persistence/BaseEntity.java:19) | Chưa thấy tenant_id trên các entity đã đọc | owner_id không tương đương multi-tenant isolation | Reuse audit; POI công khai dùng chung, ACL listing vẫn giữ; CAO |
| PostgreSQL 16-alpine, Redis 7, Kafka có trong infra | [Compose](D:/Workspace/homespace/hs-infra/docker-infra.yml:5), [Redis](D:/Workspace/homespace/hs-infra/docker-infra.yml:75), [Kafka](D:/Workspace/homespace/hs-infra/docker-infra.yml:113) | Chưa xác minh extension runtime; chưa có Core POI queue | Không tự bật PostGIS hay dựa vào Kafka chỉ vì container tồn tại | DB jobs + scheduler phase đầu; CAO cho cấu hình, CHƯA XÁC MINH runtime |
| Kafka listener đồng bộ Keycloak user | [UserSyncConsumer](D:/Workspace/homespace/hs-core-api/hs-user-service/src/main/java/com/hs/user/event/consumer/UserSyncConsumer.java:37) | Chưa thấy generic Core outbox/Kafka publisher/retry DLT cho listing | Không có sẵn durable POI pipeline | Không bắt buộc thêm Kafka ở phase đầu; CAO trong phạm vi đã tìm |
| Core có scheduler và post-commit async + sweep trong hợp đồng | [EnableScheduling](D:/Workspace/homespace/hs-core-api/hs-api-service/src/main/java/com/hs/HsApiServiceApplication.java:14), [AutomaticContractDrafts](D:/Workspace/homespace/hs-core-api/hs-contract-service/src/main/java/com/hs/contract/service/AutomaticContractDrafts.java:27) | Executor/worker POI cần pool riêng | Không dùng chung pool render hợp đồng | Tái dùng mô thức, không tái dùng lớp nghiệp vụ; CAO |
| AI ingestion có job lease/heartbeat/SKIP LOCKED | [JobRepository](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/repositories/job_repo.py:77), [Worker](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/knowledge/ingestion/worker.py:21) | Đây là knowledge jobs trong DB AI, không phải job POI Core | Không kéo Core DB vào Python ingestion | Port mô thức lease sang Core, không dùng bảng knowledge jobs; CAO |
| Core cấu hình ddl-auto từ env, startup migrations sửa CHECK; AI có Alembic riêng | [Properties](D:/Workspace/homespace/hs-core-api/hs-api-service/src/main/resources/application.properties:40), [Status migration](D:/Workspace/homespace/hs-core-api/hs-listing-service/src/main/java/com/hs/listing/config/ListingStatusSchemaMigration.java:23) | Chưa thấy Flyway/Liquibase Core | Không thể giả định có migration framework | Nearby dùng entity JPA + Java initializer theo quyết định dựng lại CSDL; CAO |
| Tool tìm phòng lọc server-side và giới hạn detail | [Core query](D:/Workspace/homespace/hs-core-api/hs-listing-service/src/main/java/com/hs/listing/service/AiListingSearchService.java:55), [ListingTools](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/tools/listings.py:29) | Chưa có spatial predicates | Không lấy 1.000 tin/phường cho LLM | Mở rộng compiler filter/EXISTS đã có; CAO |
| Listing scope/memory đã tách khỏi facts và đọc lại live | [scoped_selection](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/application/listing_context.py:55) | Cần intent đọc POI trong scope | Không tìm lại nhóm khác khi hỏi phòng nào gần trường hơn | Giữ selectionScope/thứ tự, thêm tool đọc batch; CAO |
| AI đang chặn map/radius requests và chỉ khai báo 3 listing tools | [Map guard](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/application/use_cases/listing_ask.py:34), [Registry](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/clients/listing_tool_planner.py:60) | Thêm tool mà không sửa guard sẽ không được gọi | Phải sửa đồng bộ route, schema, dispatcher, prompt khi được duyệt | Feature flag bảo toàn luồng hiện tại; CAO |
| Bản đồ iframe Google, không thấy Vietmap GL trong dependencies | [AddressMapPreview](D:/Workspace/homespace/hs-web-app/components/address/AddressMapPreview.tsx:11), [LocationMapExplorer](D:/Workspace/homespace/hs-web-app/components/home/LocationMapExplorer.tsx:222) | Chưa có lớp multi-marker | Không thể reuse iframe để tự vẽ 100 marker | NearbyMap client component mới, reuse wrapper/theme, giữ iframe profile; CAO |
| Admin route có ADMIN guard; AI kiểm Gateway secret | [Admin controller](D:/Workspace/homespace/hs-core-api/hs-api-service/src/main/java/com/hs/api/controller/admin/ListingAdminController.java:23), [AI security](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/core/security.py:20) | Endpoint POI/admin mới cần auth tests | Raw payload/key không được public | Theo ApiResponse, Gateway, ADMIN hiện có; CAO |
| Test DB opt-in, metrics endpoint sẵn có | [Postgres test](D:/Workspace/homespace/hs-core-api/hs-listing-service/src/test/java/com/hs/listing/service/seed/ListingSeedPostgresTest.java:41), [AI test gate](D:/Workspace/homespace/hs-ai-service/tests/integration/conftest.py:9), [Metrics](D:/Workspace/homespace/hs-core-api/hs-api-service/src/main/resources/application.properties:108) | Chưa có test/metric POI | Test phải dùng fixture, DB test riêng | Reuse opt-in conventions, Micrometer/Prometheus; CAO |
| Seed có coordinateAccuracy=approximate_from_user_map và street_reference_point | [Seed fixture](D:/Workspace/homespace/hs-infra/postgres/seed/listings_seed_hcm.sql:37) | Không phải tọa độ đã xác minh của số nhà | Kết quả gần tiện ích chỉ demo; không đánh giá độ chính xác thực địa | Tách accuracy/nguồn và test thêm điểm thật được chọn; CAO |
| License/quota của key cụ thể | Chỉ thấy environment template key trống; không có bằng chứng entitlement được cung cấp | Persist/shared cache/secondary DB/AI/Vietmap/attribution chưa xác minh | Chặn ingestion TomTom vào kho bền vững | Gate cấu hình và xác nhận điều khoản; CHƯA XÁC MINH |
| Production CI/CD, backup, PostGIS permissions | Chưa xác minh môi trường production; workspace manifests không chứng minh triển khai | Cần người vận hành xác nhận trước rollout | Không coi compose local là topology production | Pilot feature-off, migration review; CHƯA XÁC MINH |

## 3. Luồng hiện tại và điểm gắn mới

Hiện tại: user upsert → validation → attach nội dung/catalog → applySubmission(DRAFT/PENDING_REVIEW)
→ lưu listing/address → trả kết quả. Admin duyệt qua ListingStatusService.change để PUBLISHED.
Admin sửa nội dung có thể giữ PUBLISHED, vì vậy chỉ lắng nghe thay đổi status là chưa đủ.
Địa chỉ branch/user được copy thành snapshot listing_addresses; query đọc snapshot đó.

Đề xuất phát tín hiệu chỉ có listingId; handler sau commit đọc lại state + tọa độ cuối cùng,
không dùng tọa độ bắt sớm trước upsertAddress. Tin ẩn/hết hạn/giữ chỗ/đã thuê không xuất hiện
trong các query tư vấn thuê mới. Chưa thấy API hard-delete listing trong phạm vi code đã khảo sát;
cleanup mới phải theo lifecycle thực tế, không tự thêm nghiệp vụ xóa.

~~~mermaid
sequenceDiagram
    actor Owner as Chủ nhà
    participant Core as ListingService / StatusService
    participant DB as PostgreSQL Core
    participant Sweep as Post-commit + reconciliation
    participant Worker as Nearby worker
    participant Provider as Provider được phép
    participant AI as AI ListingTools

    Owner->>Core: Gửi tin / Admin duyệt công khai
    Core->>DB: Transaction listing + address + status/history
    DB-->>Core: Commit
    Core-->>Owner: Kết quả hiện tại
    Core-->>Sweep: Event sau commit (chỉ là tín hiệu)
    Sweep->>DB: Enqueue idempotent bằng transaction riêng
    Note over Sweep,DB: Sweep định kỳ tìm published location chưa có job/coverage, bù tín hiệu bị mất
    Worker->>DB: Claim job + lease
    Worker->>Provider: Nearby theo nhóm + offset, ngoài transaction DB dài
    Provider-->>Worker: POI + summary
    Worker->>DB: Upsert POI/source + quan hệ + coverage
    AI->>Core: Truy vấn nhóm listing đã chọn
    Core->>DB: Lọc/khoảng cách/tổng hợp có limit
    DB-->>AI: Evidence ngắn, freshness và coverage
~~~

Đây là queue DB có reconciliation, không gọi nó là transactional outbox atomic nếu job được insert
sau commit. Event sau commit riêng lẻ không đủ bền vững. Sweep phải có watermark/cursor + overlap,
dựa vào listing/address hiện hành và job unique, không chỉ dựa vào timestamp listing tạo ban đầu.
Nếu sau này cần Kafka, thêm outbox chuẩn trong transaction + publisher riêng sau khi có nhu cầu tải.

## 4. Đối chiếu Postman và catalog

| Tập đã đọc | Kết quả kiểm tra chỉ đọc | Hệ quả |
|---|---|---|
| Postman_42_Requests | Đúng 42 request; V2 Nearby/Search, V3 Discover, routing, traffic, map tiles; không có response body đã lưu | Chỉ chọn Nearby V2 và POI Categories V2 cho adapter khởi động; không chạy cả collection cho mỗi listing |
| FullCatalog_Test | 12 request, gồm catalog + thử đơn/gộp + các nhóm minh họa | Tên full catalog không có nghĩa danh mục đã được tải/xác minh |
| Environment | Key trống; lat=10.8274681, lon=106.6875169, radius=2000, limit=100 | Postman 2 km không phải mặc định nghiệp vụ 3 km; phải tách config |
| CSV | 119 ID unique, 103 parent, 16 child, 11 nhãn nguồn; không thiếu parent trong CSV | Có thể dùng làm bảng review, chưa làm catalog vận hành |
| JSON Nearby 5 POI trong prompt | Có id, categorySet, position, dist, địa chỉ; một streetNumber bị thiếu; 5/100 kết quả | Fixture tham chiếu, chưa phải fixture JSON đầy đủ đã lưu trong Postman |
| Catalog API trả theo key thực tế | CHƯA GỌI trong audit | Không có đối chiếu runtime để gắn VERIFIED |
| Full V2 response Pasted text(4).txt | Không tìm thấy đúng file trong thư mục Postman đã khảo sát | Dùng 5 POI snapshot; không bịa các trường còn lại |
| Địa chỉ gateway/Vietmap Postman | Có file tương ứng trong postman/vietmap, tên không hoàn toàn giống prompt | Tiếp tục reuse address API, không thay TomTom geocoding |

Tài liệu TomTom xác nhận Nearby không cần từ khóa, categorySet có thể gộp nhiều ID theo điều kiện OR,
limit tối đa 100 mỗi trang và dist dùng mét. ID POI được mô tả ổn định khi vị trí/thuộc tính/phân loại
không đổi, nên vẫn phải có khóa nội bộ và provenance. V2 còn được hỗ trợ; hãng gợi ý Places Search
cho tích hợp mới. Với Postman đang được chọn, đề xuất adapter V2 riêng trước, không trộn V2/V3 IDs.
[Nguồn Nearby V2](https://docs.tomtom.com/search-api/documentation/search-service/nearby-search).

POI Categories cung cấp ID, tên, childCategoryIds, synonyms. Chỉ dùng quan hệ cha–con được
đối chiếu từ catalog; không cắt 4 chữ số ID để tự suy ra cha.
[Nguồn catalog](https://docs.tomtom.com/search-api/documentation/poi-categories-service/poi-categories).

Khác biệt cụ thể của hai bộ Postman:
- FullCatalog đang gộp SPORTS/RECREATION và đưa LƯU TRÚ vào nhóm thứ tám; cần chuẩn hóa về 8 nhóm nghiệp vụ.
- HEALTHCARE ở nhóm mẫu thiếu 7391 so với phụ lục; TRANSPORT thiếu 7309 và vài mã con.
- SHOPPING gửi cả parent lẫn child có thể trùng cùng POI; dedup không dựa vào số lần xuất hiện.
- Có trường học ngoại ngữ/tiểu học trong sample: EDUCATION không có nghĩa gần đúng đại học khách học.
- Không coi category labels tiếng Anh hoặc source group của CSV là taxonomy HomeSpace.

Đối chiếu 3 tập hiện tại: 119 mã tham khảo, chưa có bản catalog runtime, 3 mã quan sát trong
5-POI snapshot là 7372010 / 7372 / 7372005. Phụ lục còn nhắc 7377002 nhưng mã này không nằm
trong 5 dòng snapshot. Cả 7372010, 7372005, 7377002 đều không nằm trong CSV.
Số mapping khởi động: VERIFIED runtime=0; PROPOSED=55; OUT_OF_SCOPE đề xuất=64.
Ba mã ngoài CSV giữ UNMAPPED cho đến khi xác minh catalog; không loại POI và không suy cha bằng prefix.

### 4.1. Tám nhóm khởi động — chỉ là mapping đề xuất

| Nhóm | Mã xuất hiện trong CSV | Số mã |
|---|---|---:|
| EDUCATION | 7372,7377,9913 | 3 |
| HEALTHCARE | 7321,7326,9373,9374,9663,9956,7391 | 7 |
| SHOPPING | 7332,7332005,9361,9361009,7373,7327 | 6 |
| FOOD_DRINK | 7315,9376,7315015,9376002,9376003,9376004,9376005,9376006,9376007 | 9 |
| FINANCE | 7328,7397 | 2 |
| TRANSPORT | 9942,9942002,9942003,9942004,9942005,7311,7309,7369,7313,7380 | 10 |
| RECREATION | 9362,9362008,7342,7317,7318,7319,9378,9900,9902,9927,7376 | 11 |
| SPORTS | 7305,7320,7338,7374,9369,9911,9371 | 7 |

Danh sách trên là registry versioned, chưa phải kết quả xác minh API. Một POI có nhiều mã nguồn
được hợp thành nhiều nhóm; số đếm POI mỗi nhóm dùng DISTINCT place_id.
Mã con cụ thể/exclusion thắng mã cha. Giữ riêng trạng thái mã provider và quyết định mapping nghiệp vụ.

### 4.2. Mapping đủ 119 mã

Tất cả tên, ID, level và parent dưới đây giữ theo CSV. PROPOSED là chưa verified runtime;
OUT_OF_SCOPE cũng là quyết định nghiệp vụ đề xuất, không phải provider báo mã không hợp lệ.
Các mã chưa bật vẫn được lưu trong catalog review nếu quyền sử dụng catalog cho phép.

| ID | Tên gốc CSV | Cấp | Cha trong CSV | HomeSpace group | Trạng thái | Lý do / ngoại lệ |
|---|---|---|---|---|---|---|
| 7328 | Bank | parent | — | FINANCE | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 7335 | Agriculture Business | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7378 | Business Park | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7388 | Courier Drop Box | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7391 | Emergency Medical Service | parent | — | HEALTHCARE | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 7397 | ATM | parent | — | FINANCE | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 9156 | Manufacturing Facility | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 9157 | Research Facility | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 9158 | Media Facility | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 9160 | Exchange | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 9352 | Company | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 9377 | Exhibition & Convention Center | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 9382 | Commercial Building | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 9383 | Industrial Building | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7316 | Tourist Information Office | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7337 | Scenic/Panoramic View | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7339 | Place of Worship | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7376 | Tourist Attraction | parent | — | RECREATION | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 7339008 | Pagoda | child | 7339 | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7308 | Helipad | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7352 | Ferry Terminal | parent | — | — | OUT_OF_SCOPE (đề xuất) | Bến phà có thể phục vụ đi lại; mở sau khi xác nhận nhu cầu khu vực. |
| 7366 | Frontier Crossing | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7380 | Railroad Station | parent | — | TRANSPORT | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 7383 | Airport | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7389 | Access Gateway | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 9159 | Port/Warehouse Facility | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 9935 | Mountain Pass | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 9942 | Public Transportation Stop | parent | — | TRANSPORT | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 9955 | Checkpoint | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 9942002 | Bus Stop | child | 9942 | TRANSPORT | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 9942003 | Taxi Stand | child | 9942 | TRANSPORT | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 9942004 | Streetcar Stop | child | 9942 | TRANSPORT | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 9942005 | Coach Stop | child | 9942 | TRANSPORT | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 7301 | Traffic Service Center | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7322 | Police Station | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7324 | Post Office | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7365 | Embassy | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7367 | Government Office | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7372 | School | parent | — | EDUCATION | PROPOSED | School là nhóm rộng; không đồng nhất trường ngoại ngữ/tiểu học với đúng đại học khách học. |
| 7377 | College/University | parent | — | EDUCATION | PROPOSED | Đại học/cao đẳng; vẫn phải khớp đúng tên trường/cơ sở người thuê yêu cầu. |
| 7392 | Fire Station/Brigade | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 9150 | Primary Resource/Utility | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 9151 | Transport Authority/Vehicle Registration | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 9152 | Non Governmental Organization | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 9153 | Welfare Organization | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 9154 | Prison/Correctional Facility | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 9363 | Courthouse | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 9388 | Military Installation | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 9389 | Native Reservation | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 9913 | Library | parent | — | EDUCATION | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 9932 | Public Amenity | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7302 | Trail System | parent | — | — | OUT_OF_SCOPE (đề xuất) | Đường mòn có thể hữu ích cho vận động; để mở rộng sau, chưa vào mapping khởi động. |
| 7317 | Museum | parent | — | RECREATION | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 7318 | Theater | parent | — | RECREATION | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 7319 | Cultural Center | parent | — | RECREATION | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 7341 | Casino | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7342 | Movie Theater | parent | — | RECREATION | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 7347 | Marina | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7349 | Winery | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7363 | Community Center | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 9362 | Park & Recreation Area | parent | — | RECREATION | PROPOSED | Mã cha rộng; bắt buộc override 9362003 và kiểm tra catalog con. |
| 9378 | Leisure Center | parent | — | RECREATION | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 9379 | Nightlife | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 9900 | Entertainment | parent | — | RECREATION | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 9902 | Amusement Park | parent | — | RECREATION | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 9927 | Zoo, Arboreta & Botanical Garden | parent | — | RECREATION | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 9937 | Club & Association | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 9362003 | Cemetery | child | 9362 | — | OUT_OF_SCOPE (đề xuất) | Nghĩa trang; override loại trừ, không kế thừa RECREATION từ 9362. |
| 9362008 | National Park | child | 9362 | RECREATION | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 7303 | Residential Accommodations | parent | — | — | OUT_OF_SCOPE (đề xuất) | Địa điểm lưu trú tham khảo, không phải bài đăng HomeSpace. |
| 7304 | Vacation Rental | parent | — | — | OUT_OF_SCOPE (đề xuất) | Vacation rental không thay thế kho listing HomeSpace. |
| 7314 | Hotel/Motel | parent | — | — | OUT_OF_SCOPE (đề xuất) | Khách sạn không nằm trong tiện ích sinh hoạt ưu tiên của phase đầu. |
| 7327 | Department Store | parent | — | SHOPPING | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 7332 | Market | parent | — | SHOPPING | PROPOSED | Market là nhóm rộng; không tự gọi mọi kết quả là siêu thị. |
| 7360 | Camping Ground | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7373 | Shopping Center | parent | — | SHOPPING | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 9361 | Shop | parent | — | SHOPPING | PROPOSED | Mã cha Shop rộng; khi cần cửa hàng tiện lợi phải ưu tiên mã con đã xác minh. |
| 7332005 | Supermarkets & Hypermarkets | child | 7332 | SHOPPING | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 9361009 | Convenience Store | child | 9361 | SHOPPING | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 7305 | Adventure Sports Venue | parent | — | SPORTS | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 7320 | Sports Center | parent | — | SPORTS | PROPOSED | Sports Center; không khẳng định mọi kết quả là phòng gym nếu thiếu phân loại cụ thể. |
| 7338 | Swimming Pool | parent | — | SPORTS | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 7374 | Stadium | parent | — | SPORTS | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 9357 | Beach | parent | — | — | OUT_OF_SCOPE (đề xuất) | Bãi biển có thể là giải trí; để mở rộng theo khu vực sau. |
| 9360 | Ice Skating Rink | parent | — | — | OUT_OF_SCOPE (đề xuất) | Sân trượt băng có thể vào SPORTS; đề xuất scope tối thiểu hiện chưa bật. |
| 9369 | Tennis Court | parent | — | SPORTS | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 9371 | Water Sport | parent | — | SPORTS | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 9911 | Golf Course | parent | — | SPORTS | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 8099 | Geographic Feature | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7321 | Hospital | parent | — | HEALTHCARE | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 7326 | Pharmacy | parent | — | HEALTHCARE | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 9373 | Doctor | parent | — | HEALTHCARE | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 9374 | Dentist | parent | — | HEALTHCARE | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 9375 | Veterinarian | parent | — | — | OUT_OF_SCOPE (đề xuất) | Thú y; không đồng nhất với y tế cho người. Có thể mở nhãn thú cưng ở phase sau. |
| 9663 | Health Care Service | parent | — | HEALTHCARE | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 9956 | Emergency Room | parent | — | HEALTHCARE | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 7309 | Electric Vehicle Station | parent | — | TRANSPORT | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 7310 | Repair Facility | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7311 | Gas Station | parent | — | TRANSPORT | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 7312 | Rent-a-Car Facility | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7313 | Parking Garage | parent | — | TRANSPORT | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 7358 | Truck Stop | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7359 | Weigh Station | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7368 | Motoring Organization Office | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7369 | Open Parking Area | parent | — | TRANSPORT | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 7375 | Toll Gate | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7395 | Rest Area | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 9155 | Car Wash | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 9910 | Automotive Dealer | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 9930 | Rent-a-Car-Parking | parent | — | — | OUT_OF_SCOPE (đề xuất) | Chưa thuộc phạm vi tiện ích ưu tiên của 8 nhóm; không xóa mã nguồn, có thể review sau. |
| 7315 | Restaurant | parent | — | FOOD_DRINK | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 9376 | Café/Pub | parent | — | FOOD_DRINK | PROPOSED | Nhóm rộng gồm Café/Pub; mã con cụ thể phải thắng mã cha khi cần lọc quán cà phê. |
| 7315015 | Pizza (example category) | child | 7315 | FOOD_DRINK | PROPOSED | Giữ mã theo CSV/tài liệu Nearby; nhãn CSV ghi example, cần đối chiếu catalog. |
| 9376002 | Café | child | 9376 | FOOD_DRINK | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 9376003 | Pub | child | 9376 | FOOD_DRINK | PROPOSED | Pub thuộc ăn uống theo nghĩa danh mục; không dùng làm chứng cứ khu vực yên tĩnh. |
| 9376004 | Internet Café | child | 9376 | FOOD_DRINK | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 9376005 | Tea House | child | 9376 | FOOD_DRINK | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 9376006 | Coffee Shop | child | 9376 | FOOD_DRINK | PROPOSED | Phù hợp nghĩa nghiệp vụ của nhóm; chờ đối chiếu catalog Search V2. |
| 9376007 | Microbrewery | child | 9376 | FOOD_DRINK | PROPOSED | Microbrewery thuộc FOOD_DRINK; không mặc định phù hợp mọi người thuê. |

## 5. Schema tối thiểu được đề xuất

Phase đầu: 7 bảng mới. Catalog/mapping provider là JSON/YAML versioned được review trong Git,
không tạo ngay giao diện/bảng quản trị taxonomy. Cấu hình phải chứa provider/apiVersion/id/name/
parent/category groups/validationStatus/source/checkedAt/mappingVersion và danh sách override.
Khi cần admin chỉnh mapping, chuyển sang provider_poi_categories + provider_category_mappings
và source-category links bằng migration riêng; không chôn mapping trong code if/else.

Các bảng mới không thay amenities/amenity_categories/listing_amenities. Source content và
địa chỉ/tọa độ TomTom chỉ được ghi khi gate quyền lưu tương ứng đã được xác nhận.

~~~mermaid
erDiagram
    listings ||--o{ listing_nearby_places : near
    nearby_places ||--o{ listing_nearby_places : serves
    nearby_places ||--o{ nearby_place_sources : identified_by
    nearby_places ||--o{ nearby_place_categories : classified
    nearby_categories ||--o{ nearby_place_categories : groups
    listings ||--o{ nearby_scan_jobs : schedules
    nearby_scan_jobs ||--o{ nearby_scan_runs : executes
    nearby_scan_runs ||--o{ listing_nearby_places : supports
~~~

Dưới đây N=NOT NULL, Y=nullable. varchar(36) UUID chuỗi theo Listing hiện có; Instant → timestamptz.
Các table/entity thích hợp reuse audit/active theo BaseEntity; bảng composite links có timestamp riêng.

### 5.1. nearby_places — canonical place

| Column | Type / null / default | Index / constraint | Nguồn và lý do |
|---|---|---|---|
| id | varchar(36), N, UUID nội bộ | PK | Không dùng ID TomTom làm PK nghiệp vụ |
| name | varchar(500), N | — | poi.name từ source ưu tiên, có provenance |
| normalized_name | varchar(500), N | B-tree cho equality/prefix | Chuẩn hóa phục vụ tìm tên/dedup candidates, không chứng minh cùng địa điểm |
| latitude / longitude | numeric(10,7), N | CHECK range; composite bbox index | position từ source được phép; không lấy entryPoint thay canonical mà không ghi nhận |
| address_text | text, Y | — | address.freeformAddress; thiếu vẫn cho ingest khi có tên + tọa độ hợp lệ |
| preferred_source_id | varchar(36), Y | FK sau insert source, không cascade delete place | Chọn source có kiểm soát, không hòa trộn attribution mất dấu |
| position_revision | bigint, N, 0 | — | Đổi tọa độ POI phải vô hiệu khoảng cách đã cache |
| business_status | varchar(30), N, UNKNOWN | CHECK enum | Không suy OPERATIONAL chỉ vì có kết quả search |
| verification_status | varchar(30), N, UNVERIFIED | CHECK enum | Verification nghiệp vụ, khác fetched_at |
| verified_at | timestamptz, Y | — | Chỉ có khi có bằng chứng xác minh |
| created/updated/audit/active | theo BaseEntity | active filter | Không hard-delete POI đang được nhiều listing dùng |

Phone/website/opening hours/viewport để trong source optional JSONB trước nếu được phép và chưa có query.
Không tạo hàng chục cột canonical rỗng. Chỉ promote phone/website sang cột khi use case đọc/lọc rõ.
PostGIS geography(Point,4326) + GiST là phương án nâng cấp riêng; chưa thêm extension trong phase này.

### 5.2. nearby_place_sources — provenance và identity provider

| Column | Type / null / default | Index / constraint | Nguồn và lý do |
|---|---|---|---|
| id / place_id | varchar(36), N | PK / FK nearby_places | Nhiều source có thể trỏ một physical place sau review |
| provider / api_version | varchar(30/16), N | UNIQUE cùng external_id | TOMTOM/V2 tách TOMTOM/V3 |
| external_id | text, N | UNIQUE(provider,api_version,external_id) | results.id |
| external_info | text, Y | — | results.info, không thay khóa unique |
| category_ids | text[], N, empty | GIN chỉ khi có query cần thiết | Toàn bộ poi.categorySet IDs, không ép bigint nghiệp vụ |
| classifications / category_labels | jsonb, Y | Không index toàn JSON mặc định | poi.classifications / poi.categories |
| source_address / optional_metadata | jsonb, Y | — | Địa chỉ raw provider, entryPoints, viewport/contact nếu có và được phép |
| first_seen_at / last_seen_at | timestamptz, N | last_seen_at | Thời điểm thu thập, không là verified_at |
| license_policy_id / attribution | text, N / Y | — | Tham chiếu chính sách được phê duyệt và nghĩa vụ hiển thị |
| content_expires_at | timestamptz, Y | expiry index | Hạn lưu/refetch theo quyền, không hardcode TTL được phép |
| raw_payload | CHƯA TẠO cột mặc định | Chỉ bổ sung nếu có nhu cầu + quyền | Không dùng raw JSON như cách lách retention |

Nếu chính sách không cho giữ field nào thì loại field đó khỏi ingestion/schema thực thi.
Không lưu key, URL có query key, response lỗi đầy đủ, hoặc raw vào log/job/Mongo/LLM tracing.

### 5.3. nearby_categories + nearby_place_categories

| Table.column | Type / null / default | Constraint | Ý nghĩa |
|---|---|---|---|
| nearby_categories.code | varchar(30), N | PK | 8 code ổn định nội bộ |
| display_name_vi / display_order / enabled | varchar(100) N / int N / boolean N true | — | Nhãn và thứ tự UI |
| nearby_place_categories.place_id, category_code | varchar(36), varchar(30), N | Composite PK; FK 2 phía | N–N, không nhân đôi POI |
| mapping_version / classified_at | varchar(50), timestamptz, N | index(category_code,place_id) | Reclassify có phiên bản |
| evidence_source_ids | jsonb, N | Không expose raw public | Biết source nào chứng minh nhãn; suy lại khi source hết hạn/bị gỡ |

Một mã provider có thể được map nhiều group trong tương lai; nhiều IDs của cùng POI hợp bằng tập.
Không có primary_category ở phase đầu để tránh mất nhãn phụ. Category enum mới không dùng ListingCategory.

### 5.4. listing_nearby_places — khoảng cách theo cặp

| Column | Type / null / default | Index / constraint | Ý nghĩa |
|---|---|---|---|
| listing_id / place_id | varchar(36), N | Composite PK; FK | N–N và chống trùng cặp |
| straight_distance_m | numeric(12,3), N | CHECK >=0; index(listing_id,straight_distance_m,place_id) | Tính từ tọa độ listing hiện tại và canonical POI |
| listing_location_hash | varchar(64), N | — | Hash lat/lon chuẩn hóa cùng address identity |
| place_position_revision | bigint, N | — | So với nearby_places.position_revision |
| last_calculated_at | timestamptz, N | — | Tính lại khi một đầu di chuyển |
| evidence_run_id | varchar(36), Y | FK scan run | Quan hệ có bằng chứng lần quét; không đồng nghĩa full coverage |

Bắt buộc index ngược(place_id,straight_distance_m,listing_id).
Hard-delete có kiểm soát: link/job theo listing có thể ON DELETE CASCADE; xóa source/place không cascade
sang listing. Soft-hide/RESERVED/RENTED chỉ làm query không trả listing, không xóa POI chung.
Road distance/travel duration/travel mode chưa tạo trong MVP; khi thêm phải kèm provider/mode/time/expiry.
Haversine không được gắn nhãn ROAD hoặc quy đổi tự động thành số phút.

### 5.5. nearby_scan_jobs — durable queue có reconciliation

| Column | Type / null / default | Index / constraint | Ý nghĩa |
|---|---|---|---|
| id / listing_id | varchar(36), N | PK / FK | Một công việc cho một snapshot tọa độ |
| location_hash / policy_version / mapping_version | varchar(64/50/50), N | UNIQUE cùng listing_id và requested_radius_m | Idempotency snapshot + policy; retry cập nhật job hiện hữu |
| requested_radius_m | int, N | CHECK >0 | Không nhầm km/m |
| status | varchar(24), N, PENDING | CHECK enum | PENDING/RUNNING/PARTIAL/SUCCESS/RETRY_WAIT/FAILED/CANCELLED/SUPERSEDED |
| attempts / next_attempt_at | int N 0 / timestamptz N | index(status,next_attempt_at) | Backoff + retry ceiling |
| lease_owner / lease_until / heartbeat_at | text Y / timestamptz Y / timestamptz Y | claim bằng FOR UPDATE SKIP LOCKED | Phục hồi worker crash; completion phải kiểm lease token |
| last_error_code | varchar(80), Y | — | Mã đã sanitize, không giữ provider body có key |
| created_at / updated_at | timestamptz, N | — | Vận hành/audit |

Refresh sau expiry là requeue có audit/generation của job logical hiện hữu hoặc tạo generation mới có khóa
unique rõ; không chèn vô hạn job cùng snapshot. Phiên bản mapping thay đổi có thể chỉ reclassify từ source
được phép đang có, không bắt buộc gọi provider lại. Không tái dùng executor render/ký hợp đồng.

### 5.6. nearby_scan_runs — metadata theo nhóm/vùng, thay scan_areas table riêng ở MVP

| Column | Type / null / default | Index / constraint | Ý nghĩa |
|---|---|---|---|
| id / job_id | varchar(36), N | PK / FK | Mỗi lần thử một nhóm tạo run metadata |
| provider / api_version / category_group / mapping_version | text, N | index phủ truy vấn coverage | Không dùng coverage nhóm này cho nhóm khác |
| center_lat / center_lon / radius_m | numeric(10,7)/int, N | bbox/center lookup | Hình tròn request, không chỉ geocell string |
| requested_category_ids | text[], N | — | Chụp filter thực tế |
| page_size / next_offset / pages_fetched / returned_count / unique_count | int, N | CHECK >=0 | Nhận biết pagination và trùng kết quả |
| total_results_reported | int, Y | — | Báo cáo của provider, không đếm thực địa |
| page_summaries | jsonb, N, empty | Không chứa POI payload | offset/numResults/queryTime/fuzzyLevel/geoBias theo trang |
| coverage_status / stopped_reason | varchar(40), N / text Y | CHECK enum | PENDING/PARTIAL/COMPLETE_PROVIDER_RESPONSE/FAILED/STALE/UNKNOWN |
| started_at / finished_at / expires_at | timestamptz N / Y / Y | expiry index | Freshness + retention policy |
| request_count / error_code | int N 0 / text Y | — | Quota và phân tích chi phí, không lưu full request URL |

Run giữ tâm/nhóm/bán kính/freshness, đủ làm coverage-area record khi đủ điều kiện.
Khi tải lớn mới tách nearby_scan_areas để tổng hợp nhiều run/cell và tăng tốc coverage union.
Run SUCCESS không chứng minh dữ liệu đầy đủ ngoài thực tế hoặc POI đang hoạt động.

## 6. Mapping đầy đủ response tham chiếu → nơi lưu / không lưu

Tất cả ô dưới đây là thiết kế conditional theo quyền. GLOBAL/SOURCE/LINK không được persist
nội dung TomTom khi chưa có quyền; cả derivatives như khoảng cách/source-derived labels cũng cần
được xét trong chính sách. Job operational metadata chỉ giữ tối thiểu được phép.

| JSON path (mọi trường trong snapshot) | Loại | Đích đề xuất / xử lý |
|---|---|---|
| summary.queryType | SCAN_RUN_ONLY | page_summaries.queryType, kiểm NEARBY |
| summary.queryTime | SCAN_RUN_ONLY | Telemetry milliseconds theo schema provider; không phải thời gian đi lại |
| summary.numResults | SCAN_RUN_ONLY | Count trang, đối chiếu length(results) |
| summary.offset | SCAN_RUN_ONLY | Cursor/offset trang đã đọc |
| summary.totalResults | SCAN_RUN_ONLY | total_results_reported; không coi là kiểm kê thực địa |
| summary.fuzzyLevel | SCAN_RUN_ONLY | page_summaries; không phải confidence/rating |
| summary.geoBias.lat, summary.geoBias.lon | SCAN_RUN_ONLY | Tâm truy vấn, đối chiếu request; không ghi đè tọa độ listing |
| results[] container | OPTIONAL_OR_CONDITIONAL | Parse từng POI; thiếu/malformed không suy ra coverage COMPLETE |
| results[].type | PROVIDER_SOURCE / validation | Chỉ POI; không dùng nhầm address result làm trường học |
| results[].id | PROVIDER_SOURCE | external_id, unique theo provider/version |
| results[].score | SCAN_RUN_ONLY | Không dùng xếp hạng chất lượng; có thể bỏ sau xử lý để giảm lưu trữ |
| results[].dist | LISTING_RELATION / SCAN_RUN_ONLY | Giá trị từ tâm request; tham chiếu debug có TTL nếu được phép; relation dùng Haversine tính lại |
| results[].info | PROVIDER_SOURCE | external_info |
| results[].poi.name | GLOBAL_AMENITY | nearby_places.name + source provenance |
| results[].poi.categorySet[].id | PROVIDER_SOURCE | category_ids[] nguyên gốc; map bằng registry versioned |
| results[].poi.categories[] | PROVIDER_SOURCE | category_labels; không dùng thay ID khi ID có |
| results[].poi.classifications[].code | PROVIDER_SOURCE | classifications JSONB |
| results[].poi.classifications[].names[].nameLocale | PROVIDER_SOURCE | Giữ locale cùng tên |
| results[].poi.classifications[].names[].name | PROVIDER_SOURCE | Giữ label, không suy parent bằng chuỗi |
| results[].address.streetNumber | PROVIDER_SOURCE, nullable | source_address.streetNumber; POI Bồi Dưỡng Văn Hóa thiếu field này vẫn hợp lệ |
| results[].address.streetName | PROVIDER_SOURCE | source_address.streetName |
| results[].address.municipalitySubdivision | PROVIDER_SOURCE | Địa giới provider, có thể cũ |
| results[].address.municipality | PROVIDER_SOURCE | Không ép thành Vietmap cityId/wardId |
| results[].address.countrySubdivision | PROVIDER_SOURCE | Giữ raw |
| results[].address.countrySubdivisionName | PROVIDER_SOURCE | Giữ raw |
| results[].address.countrySubdivisionCode | PROVIDER_SOURCE | Giữ raw |
| results[].address.postalCode | PROVIDER_SOURCE | Chuỗi, không số học |
| results[].address.countryCode | PROVIDER_SOURCE | Kiểm VN, nhưng không bịa địa chỉ khi thiếu |
| results[].address.country | PROVIDER_SOURCE | Giữ raw |
| results[].address.countryCodeISO3 | PROVIDER_SOURCE | Giữ raw |
| results[].address.freeformAddress | GLOBAL_AMENITY + PROVIDER_SOURCE | address_text canonical theo preferred source và raw source_address |
| results[].address.localName | PROVIDER_SOURCE | Giữ raw nếu có |
| results[].position.lat, results[].position.lon | GLOBAL_AMENITY | latitude/longitude; cần đủ cặp và range hợp lệ |
| results[].viewport.topLeftPoint.lat/lon | OPTIONAL_OR_CONDITIONAL | optional_metadata.viewport, không tạo polygon coverage từ viewport |
| results[].viewport.btmRightPoint.lat/lon | OPTIONAL_OR_CONDITIONAL | Tương tự, không là bounds vùng quét |
| results[].entryPoints[].type | OPTIONAL_OR_CONDITIONAL | optional_metadata.entryPoints; không đoán main khi thiếu |
| results[].entryPoints[].position.lat/lon | OPTIONAL_OR_CONDITIONAL | Tọa độ lối vào, khác canonical position |
| poi.phone / poi.url / poi.brands nếu tương lai có | OPTIONAL_OR_CONDITIONAL | Source metadata có validate/sanitize; chỉ lưu trường thực sự trả |
| poi.openingHours / dataSources.geometry.id / relatedPois / mapcodes nếu có | OPTIONAL_OR_CONDITIONAL | Không tự gọi thêm details/geometry để làm đầy; chỉ thêm khi có use case + entitlement |
| field mới chưa biết | OPTIONAL_OR_CONDITIONAL | Parser bỏ qua an toàn hoặc metadata allowlist có quyền; không mặc định raw_payload vĩnh viễn |
| toàn bộ content nguồn TomTom và bản dẫn xuất | NOT_PERSISTABLE_WITHOUT_PERMISSION | Policy gate trước DB/cache/log/AI history/backup; field allowlist theo hợp đồng |

Thiếu tên hoặc thiếu tọa độ hợp lệ: quarantine/skip có reason; không tạo lat/lon=0.
Thiếu số nhà/điện thoại/giờ mở cửa: null, không điền dữ liệu giả.

## 7. Dedup, khoảng cách, reuse và stale data

Same provider/version/external ID: unique source key là cơ chế chính. Upsert source và canonical trong
transaction ngắn; unique conflict phải rollback việc tạo place mới rồi tìm lại source thắng cuộc, tránh orphan.
Duplicate trong một response/page hoặc nhiều nhóm chỉ tạo một source/place và một link mỗi cặp.

ID khác nhưng tên/tọa độ gần nhau chỉ là POTENTIAL_DUPLICATE. Không merge tự động trường học khác
cơ sở, cửa hàng cạnh nhau hay nhiều tầng trong cùng tòa nhà. Cross-version V2/V3 và cross-provider phải
qua entity-resolution/review riêng, có bảng/log merge audit nếu mở chức năng merge. Không xóa source gốc.

Ví dụ A/B cùng đường: một bệnh viện P có một place nội bộ; link A–P và B–P có khoảng cách khác nhau.
Không dùng dist của truy vấn A cho B. Nếu POI đổi vị trí, tăng position_revision và tính lại những link
liên quan; query không dùng cached distance có revision sai. Nếu listing đổi tọa độ, hash mới làm job cũ
SUPERSEDED; worker kiểm hash cả trước fetch và trước commit link.

Reuse coverage đầy đủ chỉ khi đủ nhóm/mapping/provider/version/freshness và điều kiện:
distance(centerA, centerB) + requestedRadiusB <= scannedRadiusA.
Hai vòng tròn 3 km lệch tâm không bao phủ nhau. Có thể reuse POI đã biết như bằng chứng dương,
nhưng không suy ra phần vùng chưa quét là trống. Muốn giảm request theo vùng ở phase sau, quét cell
có margin đủ bao toàn bộ truy vấn 3 km và quản lý pagination/coverage, không chỉ cache bằng geohash.

Khoảng cách: bounding box giảm ứng viên rồi Haversine lọc chính xác radius. Không dùng độ chênh lat/lon
làm mét và không lẫn thứ tự lat/lon; GeoJSON/Vietmap SDK dùng [longitude,latitude].
Nếu triển khai PostGIS sau, phải có migration extension/column/GiST/test phù hợp môi trường vận hành,
không suy hỗ trợ chỉ từ tên PostgreSQL.

## 8. Worker, coverage và quota

Lifecycle:
- DRAFT/PENDING_REVIEW/REJECTED: không gọi provider.
- Chuyển vào PUBLISHED: post-commit enqueue/sweep theo location hash.
- Admin sửa tọa độ tin còn PUBLISHED: enqueue lại; đổi ghi chú không làm đổi geo hash.
- User sửa tin thường gửi duyệt lại: chỉ quét khi được công khai lại.
- RESERVED/RENTED/RENTED_EXTERNALLY/HIDDEN/VIOLATION/EXPIRED hoặc inactive:
  ngừng job không còn cần thiết, query thuê mới không trả tin; dữ liệu POI chung không bị xóa.
- Re-publish cùng tọa độ: reuse link/fresh coverage hợp lệ; không gọi lại chỉ vì nhận event trùng.
- Thay branch address: không tự suy tọa độ listing đã thay khi snapshot listing_addresses chưa đổi.
- Refresh TTL theo giấy phép và cấu hình; revoke license → chặn đọc nguồn đó, purge theo chính sách
  cả cache, source, canonical field dẫn xuất, AI history/tracing và backup retention được kiểm soát.

Worker lấy lease trong transaction ngắn, gọi network ngoài transaction đó, ghi batch trong transaction ngắn.
Lease expiry không cho worker cũ ghi đè worker mới. Hash/revision không khớp thì bỏ kết quả stale.
Không kéo queue processing vào HTTP publish hoặc dùng một transaction giữ khóa suốt 8 request.

Pagination từng nhóm:
1. Bắt đầu ofs=0, page size=100 theo adapter; normalize countrySet=VN và radius bằng mét.
2. Đối chiếu summary.offset/numResults với trang thực tế; tính next offset, tổng raw và unique.
3. Lấy tiếp khi còn kết quả được báo. Chặn page lặp, offset không tiến, tổng bất nhất.
4. Đặt page/request budget để tránh vòng vô hạn. Hết budget/429/lỗi một phần → PARTIAL và stoppedReason.
5. COMPLETE_PROVIDER_RESPONSE chỉ là lấy hết tập provider báo trong filter đã định; không là quét hết thực địa.
6. Nhóm dày đặc không được che mất nhóm hiếm: ưu tiên quét riêng 8 nhóm hoặc split mã cụ thể,
   thay vì gửi 55 mã một request rồi lấy 100 gần nhất và coi như xong.
7. 5/100 trong snapshot phải PARTIAL. Trang rỗng hoặc thiếu một nhóm không chứng minh không có tiện ích.

Config đề xuất (giá trị vận hành thử, không phải giới hạn TomTom đã xác minh):
- nearby.sync-enabled=false và nearby.query-enabled=false trong properties trước khi schema/license sẵn sàng.
- TOMTOM_API_KEY trống trong template/backend example; key thật chỉ nằm secret backend khi được duyệt.
- NEARBY_DEFAULT_RADIUS_M=3000; khách hỏi 5000 phải được xử lý đúng coverage, không clamp về 3000.
- NEARBY_SCAN_RADIUS_M=3000 giữ mặc định hiện muốn; có thể duyệt prefetch 5000 để chat 5 km đọc sẵn.
- Với query vượt vùng đã quét: trả known coverage + PARTIAL/NOT_READY; request đọc không gọi provider.
  Job mở rộng do chính sách nền hoặc admin/UI thao tác rõ ràng, hợp nhất bằng idempotency; không loop mỗi chat.
- Worker 1–2 concurrent jobs lúc pilot; rate ceiling ứng dụng ví dụ 40 request/phút toàn hệ thống,
  phải được cấu hình theo quota thật. Không lấy giới hạn Geoapify cũ làm quota TomTom.
- 429 tôn trọng Retry-After nếu có, backoff+jitter; timeout/5xx retry hữu hạn; 401/403/invalid key tạm dừng
  provider, không retry dồn. Redis token bucket/DB quota reservation phải áp dụng xuyên nhiều instance.
- Daily/monthly cap, circuit breaker, kill switch; hết budget còn cho phép đọc dữ liệu còn quyền/freshness.

Chi phí planning: số tâm cần fetch × tổng số trang từng nhóm × số lượt refresh + retry;
không phải số lượt chat × số listing × 42 request. 300 listing × 8 trang đầu = 2.400 request tối thiểu
nếu không reuse; với cap ứng dụng 40/phút cần ít nhất 60 phút riêng phần network allocation, chưa kể
paging/retry. Không chạy bulk300 khi chưa có budget được duyệt. Không hứa 3 km luôn chỉ cần 8 request.

Metrics bổ sung trên actuator/Prometheus: queue_lag, claim/retry, request_count theo endpoint/status,
coverage theo nhóm, returned/unique/linked counts, stale_discard, duration, quota_reserved/used.
Log chỉ jobId/listingId/hash/category/status/elapsed/errorClass; không key/full URL/full payload.

## 9. API, AI tools và UI — hợp đồng đề xuất

Đây là route mới được đề xuất, chưa tồn tại. Dùng envelope ApiResponse/PageResponse như Core hiện có.
Public chỉ trả tin PUBLISHED+active+chưa hết hạn, không owner PII/private address note/raw provider.

| API qua Gateway | Mục đích / limit |
|---|---|
| GET /api/v1/public/listings/{id}/nearby-places?radiusMeters=3000&groups=EDUCATION,SHOPPING&page=1&size=20 | Listing → POI; whitelist groups/radius/size, nguồn + attribution + coverage |
| POST /api/v1/public/listings/ai/nearby-summary | Batch known listing IDs, tối đa theo cap cấu hình (hiện default 20); nearest tối đa 3/nhóm, không full POI |
| GET /api/v1/public/nearby-places?keyword=...&page=1&size=10 | Tìm đúng địa điểm/cơ sở trong kho được phép; ambiguity trả candidates |
| POST /api/v1/public/nearby-places/{id}/listings/search | Place → listing, typed price/area/category/ward filters, maxDistanceMeters, sort, limit |
| POST /api/v1/admin/listings/{id}/nearby-scans | Enqueue/rescan được ADMIN bảo vệ; có idempotency/budget, không chạy đồng bộ |
| GET /api/v1/admin/nearby-scans | Trạng thái, quota, lỗi sanitize, retry/cancel có kiểm soát |

Payload đọc batch tối thiểu:
~~~json
{
  "listingIds": ["<listing-uuid-1>", "<listing-uuid-2>"],
  "radiusMeters": 3000,
  "groups": ["EDUCATION", "SHOPPING"],
  "nearestPerGroup": 3
}
~~~

Response DTO (tên đề xuất): listingId, locationHash, radiusRequestedMeters, radiusCoveredMeters,
groups[].code, groups[].knownCount, groups[].nearest[{placeId,name,distanceMeters,distanceType}],
groups[].coverageStatus, dataAsOf, expiresAt, sourceAttributions, limitations.
knownCount là số distinct place đã biết trong phạm vi, không là tổng số tiện ích ngoài thực tế.
Giữ freshness/coverage theo nhóm, không chỉ một boolean chung cho cả listing.

GeoJSON map dùng FeatureCollection/Point, coordinates=[lon,lat], properties chỉ placeId/name/groupCodes/
distanceMeters/distanceType/source/attribution. Tâm listing và circle là lớp riêng.
Không đưa results[].score, URL key hay toàn bộ source_address/raw vào payload marker.

### 9.1. AI: giữ luồng hiện có, mở rộng theo từng giai đoạn

1. Giữ search_listings / get_listing_detail / get_listing_details cho tìm phòng và đọc facts.
2. Bổ sung get_listing_nearby_places(listingIds,radiusMeters,groups,nearestPerGroup) chỉ đọc DB.
   Known IDs phải thuộc selectionScope; hỏi phòng số 2 phải đúng thứ tự đã lưu.
3. Khi cần tìm phòng quanh đúng một địa điểm, bổ sung find_listings_near_place(placeQuery/knownPlaceId,
   maxDistanceMeters, filters, limit). Server resolve địa điểm; trả AMBIGUOUS_TARGET nếu nhiều cơ sở,
   không để LLM đoán UUID/tọa độ/trường học.
4. Tìm theo nhóm tiện ích chung có thể là nearbyCriteria typed trong search_listings compiler:
   EXISTS listing_nearby_places JOIN nearby_place_categories, lọc khoảng cách trước LIMIT.
   Chưa thêm tool trùng chức năng find_listings_by_category ngay khi chưa có nhu cầu rõ.
5. Khi mở Nearby query flag, thay MAP_EVIDENCE_REQUEST guard từ chặn toàn bộ sang định tuyến tool này;
   đồng thời cập nhật schema strict/dispatcher/grounding prompt/gateway permissions/tests.
   Feature-off phải giữ hành vi an toàn hiện tại. Không chỉ thêm tên tool rồi để guard chặn từ trước.
6. Tổng hợp SQL trả nearest/count/coverage ngắn cho shortlist (5/10/20 tùy khách), không nhồi toàn bộ POI
   của 1.000 tin vào prompt. Đề xuất cuối mặc định tối đa 3 tin; API tìm kiếm vẫn linh động theo số khách yêu cầu.
7. Không bắt người dùng chọn một trong 4 persona nếu nhu cầu đã rõ. Sinh viên hỏi đúng trường/cơ sở;
   đi làm hỏi nơi làm; gia đình hỏi tuổi con/trường ưu tiên; làm xa hỏi điều kiện yên tĩnh nhưng POI không
   chứng minh độ ồn. Chỉ hỏi thiếu thông tin thực sự ảnh hưởng quyết định.
8. Điều kiện cứng (giá, sức chứa, nội quy, loại phòng, đúng trường nếu bắt buộc) được DB lọc trước.
   Gần siêu thị/gym là tín hiệu bổ sung theo ưu tiên; không lấy mật độ quán ăn làm điểm chất lượng chung.
9. Khi so A/B, cùng radius/category/freshness comparability; dữ liệu thiếu là UNKNOWN, không là 0 điểm.
   Server tạo evidence/reasons và ranking giải thích được; LLM diễn đạt, không bịa rating/distance.
10. Không tuyên bố đi học 5 phút từ Haversine; muốn ROAD/duration mở tích hợp Vietmap route riêng có
    quota/permission. Khách yêu cầu gần IUH không được đề xuất tốt nhất chỉ vì có trường ngoại ngữ 24 m.
11. Conversation Mongo chỉ lưu references/preferences cần thiết và câu trả lời được policy cho phép.
    Quyền lưu trong DB không tự cho quyền gửi POI vào LLM hoặc giữ câu trả lời vĩnh viễn; cần xét đầy đủ.

### 9.2. Frontend

Phase đầu đặt khối “Tiện ích xung quanh” ở chi tiết tin, không làm form nhập địa chỉ phức tạp trở lại.
Tab 8 nhóm, 3 km mặc định, đổi 5 km có trạng thái coverage; liệt kê tên/khoảng cách chim bay/nguồn/ngày đọc.
Thiếu dữ liệu hiển thị “chưa có đủ dữ liệu”, không hiện “không có trường học”.

Vietmap GL là component mới khi được duyệt: dynamic/client-only, marker/popup/circle và clustering,
theo đúng version SDK đã kiểm ở thời điểm code. Reuse design tokens/wrapper, giữ iframe profile hiện có.
Không dùng backend Vietmap key làm key browser; nếu dùng SDK cần key trình duyệt có hạn chế domain.
[Vietmap GL docs](https://maps.vietmap.vn/docs/sdk-web-gl/overview/) hỗ trợ marker/popup; không chứng minh
workspace đã có SDK hoặc entitlement map.

“Mở chỉ đường” dùng Google Maps URL từ tọa độ hợp lệ, không thêm Places request.
Không dựng lại địa chỉ listing từ raw TomTom address; địa chỉ mới vẫn do Vietmap.
Admin phase đầu chỉ trạng thái scan/retry/cancel; quản trị mapping qua versioned registry trước.

## 10. License gate — hai phương án, chưa có kết luận theo gói

Trang [TomTom Terms](https://docs.tomtom.com/legal/terms-and-conditions) đã được mở và URL Developer cũ
redirect về đây. Bản nội dung công khai qua công cụ đọc chỉ hiển thị khung trang, chưa lấy được văn bản
điều khoản đủ để đối chiếu gói/key của HomeSpace. Không dùng điều khoản website tiêu dùng hoặc bản
đăng lại bên thứ ba thay cho hợp đồng Maps API của tài khoản.

Cần bằng chứng áp dụng cho: persist POI/coords/address; shared multi-user cache; secondary database;
hiển thị trên Vietmap; gửi vào LLM + lưu hội thoại; attribution/TTL/purge/backup; quyền catalog/dẫn xuất.
Chưa xác nhận mục nào chỉ từ API gọi được. Đây là BLOCKER cho ingest TomTom bền vững, không phải
kết luận TomTom chắc chắn cấm mọi triển khai.

A — có quyền phù hợp bằng văn bản: bật adapter TomTom theo allowlist fields, TTL, attribution và
permitted uses đã chốt; source-level policy trên DB/cache/AI/UI. Chỉ bật scan sau khi Hibernate tạo schema và chốt quota pilot.

B — không có quyền hoặc chưa xác minh: tắt persist/query content TomTom; không giữ raw/source/POI vào
kho chung hoặc làm đường vòng qua cache/Mongo. Giữ thiết kế provider-neutral, dùng nguồn cho phép
lưu như OSM hoặc từng nguồn Places của Overture sau khi kiểm nghĩa vụ cụ thể.
OSM dùng ODbL và yêu cầu attribution/các nghĩa vụ database tương ứng
([OSM license](https://www.openstreetmap.org/copyright)).
Overture Places có nhiều nguồn với license khác nhau; phải giữ provenance/notice theo release/source,
không gọi toàn bộ Overture là một license duy nhất
([Overture attribution](https://docs.overturemaps.org/attribution/)).
Không nhập nội dung TomTom hạn chế vào dataset mở để hợp thức hóa.
Runtime TomTom nếu được phép là phương án riêng, không đáp ứng đầy đủ mục tiêu kho dùng chung khi không
có quyền persist; không tự đổi hướng này mà không duyệt.

## 11. Kế hoạch triển khai, file dự kiến và nghiệm thu

| Phase | Công việc / file cụ thể dự kiến | Gate / tiêu chí |
|---|---|---|
| 0 — Audit + quyền dữ liệu | Báo cáo này; bổ sung full Nearby fixture và catalog response được phép; versioned mapping proposal | Đã kiểm file/cấu trúc; chưa xác minh catalog runtime/license/quota |
| 1 — Schema + domain | hs-listing-service/src/main/java/com/hs/listing/nearby/model và repository; entity JPA + NearbyCategoryInitializer; config mapping versioned trong resources/nearby | Chốt 7 bảng, FKs varchar(36), indexes, PostgreSQL thường; Hibernate tạo schema trên CSDL mới, không dùng SQL tạo bảng riêng |
| 2 — Jobs/provider | nearby/provider/TomTomNearbyClient, parser, nearby/service/NearbySyncService, scheduler/worker/job service; hook ListingStatusService.change + ListingService.upsertAddress/updateByAdmin | Chỉ chạy sau quyền dữ liệu; after-commit + durable job + sweep; không chặn publish |
| 3 — Query/AI | Nearby query service, controllers ở hs-api-service, DTO ApiResponse; mở rộng AiListingSearchService typed predicates; AI tools/listings.py, clients/listing_tool_planner.py, application/use_cases/listing_ask.py, clients/generative.py, core/config.py | Feature flag; strict tools, scope, filters trước LIMIT, coverage/freshness/source grounding |
| 3b — UI/admin | hs-web-app/components/nearby/NearbyPlacesPanel.tsx + NearbyMap.tsx (mới), components/rent/RentDetailView.tsx, service/types tương ứng; admin scan view; Gateway security config/tests | SDK/browser key và quyền mixed-map xác nhận; không đổi profile/address flow |
| 4 — Test/pilot | nearby parser/job/query tests; Core Postgres opt-in tests; AI route/planner/scope tests; Gateway authorization; docs vận hành | Offline fixtures → test DB → vài listing thật có tọa độ kiểm tra → mới duyệt backfill |
| 4b — Rollout | application.properties/.env.example chỉ thêm placeholder/flags, docker-infra thay đổi chỉ khi cần; monitor docker-obs/metrics | Kill switch, cap quota, schema sẵn trước bật feature, không tự backfill300 |

Core chưa có Flyway/Liquibase được xác minh. Không tạo ngầm Alembic migration của AI để thay Core DB.
Theo quyết định hiện tại, người dùng sẽ dựng lại CSDL: field/FK/unique/index/default/check của Nearby
được khai báo trong Java entity và kiểm thử với schema Hibernate tạo. Không có file SQL Nearby riêng.
Nếu chốt PostGIS sau thì đó là một quyết định hạ tầng khác.

Test plan sau khi duyệt, chưa tạo/chạy ở audit:
- Parse đúng 5 POI đã cung cấp, thiếu streetNumber/contact/entryPoints; unknown category an toàn.
- 7372010/7372005/7377002 ngoài CSV → UNMAPPED/review, không đoán cha.
- Một source nhiều category → một POI, nhiều group; parent 9362 không làm Cemetery thành công viên.
- Thú y không bị tính là bệnh viện cho người; Hotel không thành listing HomeSpace.
- 5/100 → PARTIAL; 100 kết quả gộp không mặc định đủ 8 nhóm; page lặp/offset sai/tổng thay đổi → an toàn.
- Same external ID hai scan, hai job đồng thời, retry sau ghi một phần → không duplicate/orphan.
- A/B chung POI có hai khoảng cách; hash địa chỉ listing và revision POI thay đổi không trả link stale.
- Trùng tên/trùng tọa độ khác cơ sở hoặc V2/V3 khác ID không auto-merge.
- Worker crash/mất lease/sự kiện sau commit bị mất → sweep phục hồi; không khóa HTTP publish.
- Provider 401/403/429/5xx/timeout → retry/cap/circuit breaker đúng, không ảnh hưởng publish.
- Feature-off/license revoked → không provider calls, không persist/cache/log/Mongo/LLM content ngoài quyền.
- Query ngược place → published active listings, typed filters trước limit, không lộ private/owner data.
- 1.000 listing một phường, user cần 10 → DB giới hạn trước detail; Nearby summary chỉ batch nhóm cần.
- Hội thoại tìm 10 → phòng số 2 → so 10 → hỏi đúng trường → 5 km vượt coverage → giữ scope và nói giới hạn.
- Map/GeoJSON kiểm lon/lat, circle 3000/5000 m, attribution, partial/stale state; không suy thời gian đi lại.
- Opt-in integration chỉ DB test riêng; quota live test nhỏ cần ngân sách và quyền, không chạy trên seed tự động.

Chỉ tiêu nghiệm thu đề xuất:
1. Không có outbound POI request trong HTTP publish hay mỗi lượt chat.
2. Published success không bị lỗi provider ảnh hưởng; mất wakeup được sweep bù trong chu kỳ đã cấu hình.
3. Unique source/link, lease/hash/revision race tests đạt; indexes được EXPLAIN trên fixture tải đại diện.
4. Mặc định 3 km, yêu cầu 5 km không bị lặng lẽ đổi bán kính; thiếu coverage được thể hiện.
5. Tool chọn đúng lookup/search/scoped comparison; recommendation có dữ kiện và không quá 3 lựa chọn mặc định.
6. Không dùng seed approximate để tuyên bố khoảng cách đúng đến số nhà.
7. Provider rights/field retention/AI forwarding/attribution được ghi nhận trước pilot.

Rollback:
- Tắt sync/query flags và gỡ UI/tool khai báo theo phiên bản tương thích; luồng tìm phòng cũ vẫn chạy.
- Worker dừng claim, xử lý lease; không bỏ bảng đang có worker ghi.
- Tắt worker/query khi rollback app. Ở môi trường dev hiện tại, người dùng dựng lại CSDL và Hibernate tự tạo schema từ entity.
- License revoke dùng purge theo source/canonical provenance và invalidate group/link/AI retention;
  không xóa các trường nguồn khác được phép, không ảnh hưởng bảng tiện nghi cũ.
- Sau khi quota/fixture/pilot được duyệt mới backfill theo batch có checkpoint; không tự seed POI.

## 12. Những quyết định thực sự còn thiếu

1. Có điều khoản/hợp đồng TomTom cho phép lưu kho POI, shared reuse, AI và Vietmap không?
   Cần nội dung/quyền áp dụng, không cần gửi API key vào chat.
2. Bán kính thu thập nền: giữ 3 km và xử lý mở rộng có kiểm soát, hay prefetch 5 km để trả yêu cầu 5 km ngay?
   Đề xuất UI/AI vẫn mặc định 3 km; đây là quyết định chi phí/coverage, không đổi đơn vị.
3. Quota/ngân sách theo key và tốc độ refresh cho pilot là bao nhiêu?
   Đề xuất chưa bật backfill300, giới hạn ứng dụng cấu hình được thay vì suy từ provider cũ.

Các lựa chọn còn lại có thể mặc định: Core package riêng, 7 bảng mới, PostgreSQL hiện có,
mapping versioned trước admin editor, worker DB + reconciliation, không sửa address flow.

Dừng ở bản thiết kế này theo prompt. Chưa có code/migration/test/POI API call được thực hiện trong lượt audit.

