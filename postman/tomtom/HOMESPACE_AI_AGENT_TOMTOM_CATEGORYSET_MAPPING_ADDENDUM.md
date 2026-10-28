# PHỤ LỤC PROMPT CHO AI AGENT — TOMTOM `categorySet` V2 → 8 NHÓM TIỆN ÍCH HOMESPACE

> **Mục đích:** Đây là tài liệu bổ sung cho `HOMESPACE_AI_AGENT_NEARBY_AMENITIES_ARCHITECTURE_PROMPT.md`, không thay thế tài liệu chính. Dùng để đọc, kiểm tra, chuẩn hóa và đề xuất mapping danh mục TomTom Search V2 cho kho POI dùng chung của HomeSpace. **Giai đoạn hiện tại: khảo sát và đề xuất, chưa viết code hay migrate.**
>
> **Nguồn duy nhất cho bảng mã trong tài liệu này:** file người dùng cung cấp `HomeSpace_TomTom_CategorySet_DanhMucThamKhao(2).csv`; giữ nguyên ID, tên tiếng Anh, nhãn parent/child, mã cha và nguồn tài liệu. Tổng cộng **119 ID riêng biệt: 103 parent và 16 child** thuộc **11 nhóm nguồn**. Đây là **tập tham khảo, KHÔNG phải toàn bộ catalog chính thức của TomTom**.

## A. Lệnh giao việc cho Agent

Bạn là AI Agent thực hiện tư vấn kiến trúc cho HomeSpace. Hãy đọc tài liệu chính và phụ lục này theo thứ tự, sau đó khảo sát repository và schema thực tế. Nhiệm vụ của bạn là thiết kế **category taxonomy + provider mapping** để phục vụ một POI dùng lại ở nhiều bài đăng, truy vấn được cả bài đăng → tiện ích và tiện ích → bài đăng, không nhân bản POI chỉ vì nhiều listing cùng vùng.

**Tuyệt đối không tự ý triển khai:** Không sửa source, chạy migration, seed DB, backfill, chạy Postman Runner, gửi request TomTom tốn quota hoặc tự kích hoạt worker trước khi người dùng phê duyệt. Mọi kết luận liên quan source hiện hữu cần trích dẫn đường dẫn file/class/migration; phần chưa rõ phải ghi `CHƯA XÁC MINH`.

## B. Các kết luận đã biết và điều KHÔNG được suy diễn

| Nội dung | Đã biết từ dữ liệu / Quy tắc |
|---|---|
| `results[].id` | Là ID cho một POI theo TomTom V2; không phải mã danh mục, cũng không bảo đảm bất biến mãi mãi. |
| `results[].poi.categorySet[].id` | Là **một hay nhiều mã danh mục** của địa điểm. Một POI có thể mang mã con cụ thể như `7372010` hoặc `7377002`. |
| `results[].dist` | Khoảng cách từ điểm truy vấn ở lần tìm đó, không phải thuộc tính cố định của POI; không đưa vào bảng tiện ích dùng chung. |
| `results[].score` | Điểm xếp hạng tìm kiếm, không phải đánh giá chất lượng hoặc độ xác thực của POI. |
| `summary.numResults` và `summary.totalResults` | Phải quản lý trạng thái bao phủ, offset/limit, dấu hiệu trang chưa lấy hết; không suy ra `200 OK` đồng nghĩa scan đầy đủ. |
| CSV này | Có 119 mã tham khảo; **không bảo đảm bao gồm mọi mã TomTom trả về**. Mã thiếu phải được xử lý an toàn, không bỏ POI. |
| 8 nhóm HomeSpace | Là taxonomy nghiệp vụ do HomeSpace **đề xuất**, không đồng nhất với 11 nhãn `Nhóm` trong CSV hoặc với phân loại chính thức của TomTom. |
| `parent`/`child` | Là quan hệ danh mục của provider; không suy luận mã cha bằng `startsWith()` hay cắt 4 chữ số khi chưa có parent relation đã xác minh. |
| Pháp lý | **Chưa xác minh** gói TomTom cho phép persist/caching dài hạn hoặc hiển thị trên Vietmap; phải kiểm tra điều khoản sử dụng trước mọi kế hoạch lưu nội dung provider vào DB. |

**Trường hợp thiếu catalog đã thấy:** JSON Nearby V2 từng có `7372010` (language school), `7372005` (primary school) và `7377002` (college/university), trong khi **ba ID này không có trong CSV đính kèm**. Do đó thuật toán mapping không được chỉ dựa vào 119 mã tĩnh. Nếu API catalog xác nhận quan hệ cha, dùng quan hệ đó để suy ra nhóm; nếu không, trả `UNMAPPED` và đưa vào danh sách review. Không tự khẳng định ý nghĩa các mã ngoài nguồn bằng cách nhìn prefix.

## C. Tám nhóm nghiệp vụ HomeSpace — phương án GỢI Ý, chờ source audit và duyệt

> Bảng sau là **đề xuất ánh xạ**, không phải định nghĩa chính thức từ TomTom. Mỗi ID phải được đối chiếu qua catalog API và response thực tế trước khi đưa vào mapping vận hành. Việc gán cho nhóm nào còn phụ thuộc phạm vi nghiệp vụ người thuê nhà mà source đang định nghĩa.

| HomeSpace code | Ý nghĩa nghiệp vụ | ID gợi ý xuất hiện trong CSV (parent/child) |
|---|---|---|
| `EDUCATION` | Trường, đại học, thư viện | `7372`, `7377`, `9913` |
| `HEALTHCARE` | Bệnh viện, nhà thuốc, phòng khám/bác sĩ, y tế khẩn cấp | `7321`, `7326`, `9373`, `9374`, `9663`, `9956`, `7391` |
| `SHOPPING` | Siêu thị, cửa hàng, trung tâm mua sắm, chợ | `7332`, `7332005`, `9361`, `9361009`, `7373`, `7327` |
| `FOOD_DRINK` | Nhà hàng, quán cà phê, trà, dịch vụ ăn uống | `7315`, `9376`, `7315015`, `9376002`, `9376003`, `9376004`, `9376005`, `9376006`, `9376007` |
| `FINANCE` | Ngân hàng, ATM | `7328`, `7397` |
| `TRANSPORT` | Giao thông công cộng, đỗ xe, trạm xăng/sạc | `9942`, `9942002`, `9942003`, `9942004`, `9942005`, `7311`, `7309`, `7369`, `7313`, `7380` |
| `RECREATION` | Công viên, rạp phim, bảo tàng, vui chơi | `9362`, `9362008`, `7342`, `7317`, `7318`, `7319`, `9378`, `9900`, `9902`, `9927`, `7376` |
| `SPORTS` | Sân vận động, bể bơi, thể thao | `7305`, `7320`, `7338`, `7374`, `9369`, `9911`, `9371` |

**Quy tắc biên:** Không gán toàn bộ nhóm CSV `Doanh nghiệp & dịch vụ` vào `FINANCE`; chỉ mã `Bank/ATM` thích hợp. `Veterinarian (9375)` là thú y, không tự gộp vào nhóm y tế con người. `Cemetery (9362003)` có parent `Park & Recreation Area (9362)` trong CSV nhưng không nên tự gắn `RECREATION` vào các nghĩa trang khi giới thiệu tiện ích sống. `Residential Accommodations/Hotel` là POI tham khảo, không đương nhiên thuộc 8 nhóm. Phần còn lại = `UNMAPPED` hoặc `NOT_IN_SCOPE`, có thống kê và cơ chế review.

**Chồng nhóm:** Nếu một POI có nhiều category IDs, tổng hợp thành tập category nội bộ có khả năng **N–N**; không ghi đè theo item cuối. Nếu taxonomy nghiệp vụ chỉ muốn một `primary_category`, Agent phải đề xuất thêm trường `priority` hoặc phương pháp chọn nhóm chính có thể audit và không làm mất nhóm phụ.

## D. Danh mục mã tham khảo — TOÀN BỘ 119 dòng từ CSV

Các mã trong bảng được **sao chép từ CSV người dùng tải lên**, không phải đã gọi live API. `Đề xuất nhóm` chỉ là gợi ý của tài liệu này (`—` = chưa mapping), còn tất cả 5 cột trước là dữ liệu nguồn. `Nguồn`: **V** = tài liệu vector map TomTom; **N** = tài liệu Nearby Search. Đường dẫn đầy đủ ở mục cuối.

### Doanh nghiệp & dịch vụ (14 mã)

| ID | Tên tiếng Anh (nguyên văn CSV) | Cấp | Mã cha | Đề xuất nhóm HomeSpace | Nguồn |
|---|---|---|---|---|---|
| `7328` | Bank | `parent` | — | FINANCE | V |
| `7335` | Agriculture Business | `parent` | — | — | V |
| `7378` | Business Park | `parent` | — | — | V |
| `7388` | Courier Drop Box | `parent` | — | — | V |
| `7391` | Emergency Medical Service | `parent` | — | HEALTHCARE | V |
| `7397` | ATM | `parent` | — | FINANCE | V |
| `9156` | Manufacturing Facility | `parent` | — | — | V |
| `9157` | Research Facility | `parent` | — | — | V |
| `9158` | Media Facility | `parent` | — | — | V |
| `9160` | Exchange | `parent` | — | — | V |
| `9352` | Company | `parent` | — | — | V |
| `9377` | Exhibition & Convention Center | `parent` | — | — | V |
| `9382` | Commercial Building | `parent` | — | — | V |
| `9383` | Industrial Building | `parent` | — | — | V |

### Du lịch & tín ngưỡng (5 mã)

| ID | Tên tiếng Anh (nguyên văn CSV) | Cấp | Mã cha | Đề xuất nhóm HomeSpace | Nguồn |
|---|---|---|---|---|---|
| `7316` | Tourist Information Office | `parent` | — | — | V |
| `7337` | Scenic/Panoramic View | `parent` | — | — | V |
| `7339` | Place of Worship | `parent` | — | — | V |
| `7376` | Tourist Attraction | `parent` | — | RECREATION | V |
| `7339008` | Pagoda | `child` | `7339` | — | V |

### Giao thông công cộng (14 mã)

| ID | Tên tiếng Anh (nguyên văn CSV) | Cấp | Mã cha | Đề xuất nhóm HomeSpace | Nguồn |
|---|---|---|---|---|---|
| `7308` | Helipad | `parent` | — | — | V |
| `7352` | Ferry Terminal | `parent` | — | — | V |
| `7366` | Frontier Crossing | `parent` | — | — | V |
| `7380` | Railroad Station | `parent` | — | TRANSPORT | V |
| `7383` | Airport | `parent` | — | — | V |
| `7389` | Access Gateway | `parent` | — | — | V |
| `9159` | Port/Warehouse Facility | `parent` | — | — | V |
| `9935` | Mountain Pass | `parent` | — | — | V |
| `9942` | Public Transportation Stop | `parent` | — | TRANSPORT | V |
| `9955` | Checkpoint | `parent` | — | — | V |
| `9942002` | Bus Stop | `child` | `9942` | TRANSPORT | V |
| `9942003` | Taxi Stand | `child` | `9942` | TRANSPORT | V |
| `9942004` | Streetcar Stop | `child` | `9942` | TRANSPORT | V |
| `9942005` | Coach Stop | `child` | `9942` | TRANSPORT | V |

### Giáo dục & công cộng (18 mã)

| ID | Tên tiếng Anh (nguyên văn CSV) | Cấp | Mã cha | Đề xuất nhóm HomeSpace | Nguồn |
|---|---|---|---|---|---|
| `7301` | Traffic Service Center | `parent` | — | — | V |
| `7322` | Police Station | `parent` | — | — | V |
| `7324` | Post Office | `parent` | — | — | V |
| `7365` | Embassy | `parent` | — | — | V |
| `7367` | Government Office | `parent` | — | — | V |
| `7372` | School | `parent` | — | EDUCATION | V |
| `7377` | College/University | `parent` | — | EDUCATION | V |
| `7392` | Fire Station/Brigade | `parent` | — | — | V |
| `9150` | Primary Resource/Utility | `parent` | — | — | V |
| `9151` | Transport Authority/Vehicle Registration | `parent` | — | — | V |
| `9152` | Non Governmental Organization | `parent` | — | — | V |
| `9153` | Welfare Organization | `parent` | — | — | V |
| `9154` | Prison/Correctional Facility | `parent` | — | — | V |
| `9363` | Courthouse | `parent` | — | — | V |
| `9388` | Military Installation | `parent` | — | — | V |
| `9389` | Native Reservation | `parent` | — | — | V |
| `9913` | Library | `parent` | — | EDUCATION | V |
| `9932` | Public Amenity | `parent` | — | — | V |

### Giải trí & văn hóa (18 mã)

| ID | Tên tiếng Anh (nguyên văn CSV) | Cấp | Mã cha | Đề xuất nhóm HomeSpace | Nguồn |
|---|---|---|---|---|---|
| `7302` | Trail System | `parent` | — | — | V |
| `7317` | Museum | `parent` | — | RECREATION | V |
| `7318` | Theater | `parent` | — | RECREATION | V |
| `7319` | Cultural Center | `parent` | — | RECREATION | V |
| `7341` | Casino | `parent` | — | — | V |
| `7342` | Movie Theater | `parent` | — | RECREATION | V |
| `7347` | Marina | `parent` | — | — | V |
| `7349` | Winery | `parent` | — | — | V |
| `7363` | Community Center | `parent` | — | — | V |
| `9362` | Park & Recreation Area | `parent` | — | RECREATION | V |
| `9378` | Leisure Center | `parent` | — | RECREATION | V |
| `9379` | Nightlife | `parent` | — | — | V |
| `9900` | Entertainment | `parent` | — | RECREATION | V |
| `9902` | Amusement Park | `parent` | — | RECREATION | V |
| `9927` | Zoo, Arboreta & Botanical Garden | `parent` | — | RECREATION | V |
| `9937` | Club & Association | `parent` | — | — | V |
| `9362003` | Cemetery | `child` | `9362` | — | V |
| `9362008` | National Park | `child` | `9362` | RECREATION | V |

### Lưu trú & mua sắm (10 mã)

| ID | Tên tiếng Anh (nguyên văn CSV) | Cấp | Mã cha | Đề xuất nhóm HomeSpace | Nguồn |
|---|---|---|---|---|---|
| `7303` | Residential Accommodations | `parent` | — | — | V |
| `7304` | Vacation Rental | `parent` | — | — | V |
| `7314` | Hotel/Motel | `parent` | — | — | V |
| `7327` | Department Store | `parent` | — | SHOPPING | V |
| `7332` | Market | `parent` | — | SHOPPING | V |
| `7360` | Camping Ground | `parent` | — | — | V |
| `7373` | Shopping Center | `parent` | — | SHOPPING | V |
| `9361` | Shop | `parent` | — | SHOPPING | V |
| `7332005` | Supermarkets & Hypermarkets | `child` | `7332` | SHOPPING | N |
| `9361009` | Convenience Store | `child` | `9361` | SHOPPING | N |

### Thể thao (9 mã)

| ID | Tên tiếng Anh (nguyên văn CSV) | Cấp | Mã cha | Đề xuất nhóm HomeSpace | Nguồn |
|---|---|---|---|---|---|
| `7305` | Adventure Sports Venue | `parent` | — | SPORTS | V |
| `7320` | Sports Center | `parent` | — | SPORTS | V |
| `7338` | Swimming Pool | `parent` | — | SPORTS | V |
| `7374` | Stadium | `parent` | — | SPORTS | V |
| `9357` | Beach | `parent` | — | — | V |
| `9360` | Ice Skating Rink | `parent` | — | — | V |
| `9369` | Tennis Court | `parent` | — | SPORTS | V |
| `9371` | Water Sport | `parent` | — | SPORTS | V |
| `9911` | Golf Course | `parent` | — | SPORTS | V |

### Tự nhiên (1 mã)

| ID | Tên tiếng Anh (nguyên văn CSV) | Cấp | Mã cha | Đề xuất nhóm HomeSpace | Nguồn |
|---|---|---|---|---|---|
| `8099` | Geographic Feature | `parent` | — | — | V |

### Y tế (7 mã)

| ID | Tên tiếng Anh (nguyên văn CSV) | Cấp | Mã cha | Đề xuất nhóm HomeSpace | Nguồn |
|---|---|---|---|---|---|
| `7321` | Hospital | `parent` | — | HEALTHCARE | V |
| `7326` | Pharmacy | `parent` | — | HEALTHCARE | V |
| `9373` | Doctor | `parent` | — | HEALTHCARE | V |
| `9374` | Dentist | `parent` | — | HEALTHCARE | V |
| `9375` | Veterinarian | `parent` | — | — | V |
| `9663` | Health Care Service | `parent` | — | HEALTHCARE | V |
| `9956` | Emergency Room | `parent` | — | HEALTHCARE | V |

### Ô tô & di chuyển (14 mã)

| ID | Tên tiếng Anh (nguyên văn CSV) | Cấp | Mã cha | Đề xuất nhóm HomeSpace | Nguồn |
|---|---|---|---|---|---|
| `7309` | Electric Vehicle Station | `parent` | — | TRANSPORT | V |
| `7310` | Repair Facility | `parent` | — | — | V |
| `7311` | Gas Station | `parent` | — | TRANSPORT | V |
| `7312` | Rent-a-Car Facility | `parent` | — | — | V |
| `7313` | Parking Garage | `parent` | — | TRANSPORT | V |
| `7358` | Truck Stop | `parent` | — | — | V |
| `7359` | Weigh Station | `parent` | — | — | V |
| `7368` | Motoring Organization Office | `parent` | — | — | V |
| `7369` | Open Parking Area | `parent` | — | TRANSPORT | V |
| `7375` | Toll Gate | `parent` | — | — | V |
| `7395` | Rest Area | `parent` | — | — | V |
| `9155` | Car Wash | `parent` | — | — | V |
| `9910` | Automotive Dealer | `parent` | — | — | V |
| `9930` | Rent-a-Car-Parking | `parent` | — | — | V |

### Ẩm thực (9 mã)

| ID | Tên tiếng Anh (nguyên văn CSV) | Cấp | Mã cha | Đề xuất nhóm HomeSpace | Nguồn |
|---|---|---|---|---|---|
| `7315` | Restaurant | `parent` | — | FOOD_DRINK | V |
| `9376` | Café/Pub | `parent` | — | FOOD_DRINK | V |
| `7315015` | Pizza (example category) | `child` | `7315` | FOOD_DRINK | N |
| `9376002` | Café | `child` | `9376` | FOOD_DRINK | V |
| `9376003` | Pub | `child` | `9376` | FOOD_DRINK | V |
| `9376004` | Internet Café | `child` | `9376` | FOOD_DRINK | V |
| `9376005` | Tea House | `child` | `9376` | FOOD_DRINK | V |
| `9376006` | Coffee Shop | `child` | `9376` | FOOD_DRINK | V |
| `9376007` | Microbrewery | `child` | `9376` | FOOD_DRINK | V |

## E. Thiết kế dữ liệu danh mục và quan hệ — ĐỀ XUẤT để Agent đối chiếu với CSDL thật

Không khẳng định hệ thống đã có hoặc cần đúng các bảng dưới đây. Agent trước tiên kiểm tra Entity/ORM/schema, migrations, indexing, enums, seeders, event model hiện hữu và tên bảng category/amenity đã tồn tại. Chỉ khi chưa có chức năng tương đương mới đề xuất thay đổi:

| Thành phần gợi ý | Trường/constraint quan trọng | Mục đích |
|---|---|---|
| `provider_poi_categories` (hoặc bảng hiện hữu) | `provider`, `api_version`, `external_category_id` dạng TEXT, `name_en`, `parent_external_id`, `level`, `source_url`, `validation_status`, `last_checked_at`, unique `(provider, api_version, external_category_id)` | Catalog mã/quan hệ cha-con, quản lý phiên bản/độ tin cậy. |
| `amenity_categories` | `id`, `code` unique, `display_name_vi`, `is_enabled`, `display_order` | Tám nhóm HomeSpace độc lập provider. |
| `provider_category_mappings` | `provider_category_id`, `home_category_id`, `mapping_status`, `mapping_version`, `priority`, `reviewed_at`, unique theo cặp phù hợp | CategorySet → nhóm HomeSpace; cho phép nhiều nhóm/ID. |
| `amenity_source_category_links` | `amenity_source_id`, `provider_category_id`, unique `(amenity_source_id, provider_category_id)` | Một POI theo provider có nhiều mã gốc; không mất mã khi provider cập nhật. |
| `amenity_category_links` | `amenity_id`, `home_category_id`, unique `(amenity_id, home_category_id)` | POI dùng chung xuất hiện ở một hoặc nhiều nhóm nội bộ. |
| `amenities`, `amenity_sources`, `listing_amenities`, `amenity_scan_areas` | Theo tài liệu chính; liên kết source → POI → listing, không nhân bản theo listing | Phục vụ tìm kiếm hai chiều và lưu khoảng cách đúng theo từng cặp listing–POI. |

**Mối liên hệ category trong response:** Lấy `results[].poi.categorySet[]` và map mã về danh mục provider; lưu đủ danh sách mã nguồn **khi quyền lưu cho phép**; dùng parent relation verified để suy ra HomeSpace groups. `poi.categories[]`/`poi.classifications[]` là thuộc tính provider cần phân biệt với danh mục nội bộ, không dùng chuỗi tiếng Anh để thay cho ID khi ID có sẵn. `results[].id` để ở `amenity_sources.external_id`, không dùng mã category làm ID POI.

**Bắt buộc xử lý 4 trạng thái mapping:** `VERIFIED` (mã/cấp/nhóm đã đối chiếu), `PROPOSED` (CSV/gợi ý), `UNMAPPED` (chưa biết nhóm), `REJECTED/OUT_OF_SCOPE` (không hiển thị). Agent cần đề xuất cách chỉnh mapping không làm mất lịch sử, kèm version/audit hoặc cách tương đương trong stack hiện hữu.

## F. Quy trình Agent bắt buộc thực hiện (AUDIT → THIẾT KẾ, KHÔNG CODE)

1. **Đọc tài liệu chính và toàn bộ source có liên quan:** xác định chính xác module đăng bài, status công khai/duyệt, bảng tiện ích/category hiện hữu, stack DB/ORM, worker/queue, AI tool registry, map Vietmap. Trích dẫn file và symbol khi nêu hiện trạng.
2. **Đọc CSV này như dữ liệu đầu vào không đáng tin tuyệt đối:** kiểm đếm 119 mã, 103 parent, 16 child; kiểm trùng ID, mọi child có parent nằm trong CSV; lưu metadata nguồn. Không tự thêm ID vào CSV bằng suy đoán.
3. **Đề xuất xác minh catalog chính thức:** khi được phép, gọi riêng `GET /search/2/poiCategories.json?key=...&language=en-US` để kiểm tra danh sách, quan hệ cha-con và tên; so sánh với CSV và sample JSON. Không chạy live request trong phase audit nếu không được chấp thuận.
4. **Lập báo cáo đối chiếu 3 tập:** `CSV tham khảo` vs `poiCategories API thật` vs `categorySet IDs thực tế trong response POI`; ghi các ID mới, ID không còn, đổi tên/parent, chưa thể xác minh. Lưu `7372010`, `7372005`, `7377002` vào bộ trường hợp đối chiếu.
5. **Đánh giá 8 mapping gợi ý:** đưa từng mã vào `EDUCATION`, `HEALTHCARE`, `SHOPPING`, `FOOD_DRINK`, `FINANCE`, `TRANSPORT`, `RECREATION`, `SPORTS` hoặc `OUT_OF_SCOPE`. Đưa lý do khi mã có nghĩa mơ hồ; không dựa vào `Nhóm` CSV để map cả loạt.
6. **Đề xuất schema tối thiểu/không trùng:** không giả định tên bảng và ORM; so sánh lựa chọn (a) bảng category độc lập, (b) config mapping versioned nếu hiện tại đã có taxonomy, đánh đổi migrate, index, audit, query performance.
7. **Thiết kế worker dùng chung:** khi listing đủ điều kiện được công khai, scan phạm vi và nhóm theo config; trang `limit/offset` phải có coverage metadata; xử lý quota, timeout, retry, `PARTIAL`; dedup POI theo ID nguồn và entity resolution an toàn; sync `listing_amenities` riêng cho từng bài đăng. Không gọi 119 request khi có thể gộp category hợp lý, đồng thời không coi gộp lớn và `limit=100` là quét đủ.
8. **Thiết kế query/AI/UI:** tìm tiện ích quanh bài, tìm bài ngược từ tiện ích, lọc nhóm/category, hiển thị marker Vietmap, bấm ra Google Maps để chỉ đường; báo rõ `distanceType`, `coverageStatus`, `lastCheckedAt`. Không suy ra POI còn hoạt động chỉ từ kết quả search.
9. **Kiểm tra license gate:** điều khoản TomTom áp dụng cho persist/cache, secondary POI DB, reuse nhiều listing, hiển thị lên bản đồ Vietmap, attribution. Nếu chưa xác minh/không cho phép, không seed hay persist dữ liệu POI TomTom; đưa ra phương án dùng dữ liệu POI có giấy phép phù hợp, chẳng hạn OSM/Overture theo đúng nghĩa vụ license.
10. **Trả bản đề xuất có tiêu chí nghiệm thu/rollback và dừng chờ phê duyệt.**

## G. Những test cases Agent phải viết trong test plan (không chạy lúc audit)

| Case | Kỳ vọng |
|---|---|
| ID `7372` thuộc EDUCATION; `7372010` không có trong CSV | Không vứt POI; đối chiếu catalog/API/quan hệ parent đã xác minh, nếu không thì `UNMAPPED`. |
| POI có categorySet `[7372,7377]` | Không duplicate POI; map category theo nhiều nhãn nếu phù hợp. |
| ID parent `9362` vs child `9362003` Cemetery | Không mặc định nghĩa trang là công viên vui chơi; override/loại trừ mã con. |
| `9375` Veterinarian | Không tự đánh dấu HEALTHCARE (bệnh viện cho người) nếu HomeSpace không mở rộng tới tiện ích thú y. |
| Một POI thuộc `7372` gần 2 bài A/B | Một tiện ích vật lý nếu match, 2 liên kết N–N, 2 khoảng cách khác nhau. |
| V2 `results[].id` đổi hoặc V3 có ID khác | Không tự gộp chỉ theo tọa độ, tạo ứng viên review để tránh merge nhầm. |
| `numResults=5` và `totalResults=100` | Scan status = PARTIAL/INCOMPLETE cho đến khi kiểm chứng đủ trang hoặc giới hạn. |
| Request gộp nhiều category trả đủ 100 | Không phát biểu đã bao phủ hết bán kính; có pagination/split khi hợp lý. |
| `200 OK` và không có kết quả | Không suy luận ngoài thực tế không tồn tại tiện ích; UI/AI ghi thiếu dữ liệu phù hợp/không tìm thấy ở nguồn hiện tại. |
| Thiếu `entryPoints`, `phone`, `address`, category, dữ liệu địa chỉ cũ | Parse nullable và không làm lỗi job; phân biệt đã xác minh với raw provider. |
| Concurrent jobs, retry, stale listing coords, quota error | Idempotent, không nhân bản POI/relations, rollback/retry có giới hạn, không ảnh hưởng tạo tin. |
| Chưa có quyền persist TomTom | Tắt lưu nguồn TomTom bền vững; không có `raw_payload` vĩnh viễn; phương án thay thế hợp lệ. |

## H. Định dạng đầu ra bắt buộc của AI Agent

Trả **một bản đề xuất, không phải bản code** gồm:

1. Bảng **source audit** `file/class/line → hiện trạng → tái sử dụng/tạo mới → chưa rõ`.
2. **Category catalog reconciliation**: 119 mã CSV, catalog chính thức (nếu đã kiểm), mã thấy trong sample, mâu thuẫn/chưa rõ, số verified/proposed/unmapped.
3. **Bảng mapping từng mã sang 8 nhóm**, thể hiện parent/child, ngoại lệ/override và khả năng một mã nhiều nhóm; lý do với mã chưa map.
4. **ERD + DB migration proposal** phù hợp schema thật; nêu rõ unique key, index, cách chống trùng, data provenance và security/license gate.
5. **Luồng sync + trạng thái coverage + chi phí/quota**, kể cả hai bài đăng có vùng scan chồng nhau và giới hạn `limit=100`.
6. **Các hợp đồng API và AI tool** để truy vấn POI theo listing và tìm listing theo POI, kèm GeoJSON/marker payload Vietmap.
7. **Test plan**, file cần sửa/thêm, kế hoạch migration/rollback và các vấn đề pháp lý phải quyết định trước khi code.
8. **Đề xuất lựa chọn tối ưu**, câu hỏi thực sự không suy ra được từ source; **dừng chờ người dùng duyệt**.

## I. Nguồn tài liệu và lưu ý đối chiếu

- **File nguồn chính:** `HomeSpace_TomTom_CategorySet_DanhMucThamKhao(2).csv` (119 dòng, không phải toàn bộ TomTom).
- **Prompt kiến trúc gốc:** `HOMESPACE_AI_AGENT_NEARBY_AMENITIES_ARCHITECTURE_PROMPT.md`.
- **Ví dụ response thực tế:** `Pasted text(4).txt` nếu có trong workspace của Agent; không tự tạo dữ liệu POI giả nếu file không hiện diện.
- **V — Map vector category reference (theo CSV):** https://docs.tomtom.com/map-display-api/documentation/tomtom-maps/v1/vector/content
- **N — Nearby Search reference (theo CSV):** https://docs.tomtom.com/search-api/documentation/search-service/nearby-search
- **TomTom POI Categories endpoint:** `GET https://api.tomtom.com/search/2/poiCategories.json?key=...&language=en-US` (cần test theo key, không mặc định mọi ID trong CSV đều hiện diện).
- **TomTom Terms:** https://docs.tomtom.com/legal/terms-and-conditions (cần kiểm điều khoản đúng gói/tài khoản).

**Chốt:** Không triển khai chức năng chỉ dựa vào CSV tĩnh; dùng CSV làm danh sách test/gợi ý, xác minh dữ liệu nguồn trước khi seed/mapping, thực hiện source audit trước khi thiết kế thực thi. Không lưu lâu dài POI TomTom nếu chưa xác nhận quyền. **Chỉ báo cáo và đề xuất, không sửa hệ thống nếu chưa có phê duyệt.**
