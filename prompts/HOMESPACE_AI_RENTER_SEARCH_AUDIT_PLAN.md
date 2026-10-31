# HomeSpace — Rà soát AI tư vấn tìm nhà/phòng và kế hoạch cải thiện

Ngày rà soát: 29/10/2026. Đây là kết quả đọc source và kiểm thử, **chưa triển khai các thay đổi nghiệp vụ bên dưới**.

Mốc source: `hs-core-api@41f397c`, `hs-ai-service@6e360d1`, `hs-web-app@fd06842`.

## 1. Kết luận

Hệ thống đã có nền tảng tool calling và bộ lọc SQL khá rộng. Thang máy đã tìm được bằng `amenity.ELEVATOR=true`; sức chứa, giá, WC, nội thất và nhiều điều kiện khác cũng đã có field riêng. Không cần tạo một tool mới cho từng tiện ích.

Tuy nhiên, chưa thể cam kết AI giữ đúng mọi nhu cầu của người thuê. Những chỗ cần sửa trước là: hỏi bổ sung có trạng thái, không tự bỏ điều kiện bắt buộc, nhớ bộ tiêu chí qua nhiều lượt, thống nhất tìm theo Nearby, và hoàn thiện danh mục field cùng bằng chứng khớp điều kiện.

## 2. Luồng hiện tại và phần cần giữ

Luồng chính: `/agent/ask` → `ListingAsk` → `ListingToolPlanner` → `ListingTools` → Core SQL / chi tiết / kho Nearby → AI diễn giải và trả thẻ tin đăng.

Năm loại tool đã có:

| Tool | Chức năng |
|---|---|
| `search_listings` | Tìm tập tin mới bằng điều kiện SQL trước LIMIT |
| `get_listing_detail` | Đọc lại một tin đang công khai |
| `get_listing_details` | Đọc nhóm tin đã biết để so sánh / tư vấn |
| `find_listings_near_place` | Tìm tập tin mới gần địa điểm cụ thể hoặc một nhóm POI |
| `get_listing_nearby_places` | Đọc bằng chứng Nearby của nhóm tin đang chọn |

Core có `/public/listings/ai/fields`, `/public/listings/ai/search` và các API Nearby. SQL có kiểm tra active, PUBLISHED, hết hạn; dùng giá trị tham số và giới hạn ID trả về. AI chặn ID do model bịa ra, đọc lại chi tiết hiện tại và giữ thứ tự tin trong hội thoại. Các cơ chế này cần tiếp tục giữ.

Không tải cả 1.000 tin trong một phường cho model xử lý. Chat đọc kho Nearby trong CSDL, **không gọi TomTom để tìm phòng**. Giữ quyết định đã chốt: một scan lấy tối đa 100 POI trong 2 km bằng categorySet gộp, không phân trang nhà cung cấp, không quét lại định kỳ sau 24 giờ. Thiếu dữ liệu phải được báo là chưa biết.

Nguồn chính:

- [Điều phối AI](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/application/use_cases/listing_ask.py:65)
- [Định nghĩa tool](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/clients/listing_tool_planner.py:25)
- [Bộ lọc Core](D:/Workspace/homespace/hs-core-api/hs-listing-service/src/main/java/com/hs/listing/service/AiListingSearchService.java:53)
- [API Core](D:/Workspace/homespace/hs-core-api/hs-api-service/src/main/java/com/hs/api/controller/publish/PublicListingController.java:39)

## 3. Các vấn đề đã xác định từ source

### P1 — Thiếu khu vực vẫn có thể tìm trên toàn quốc

`resolve_location_filters` chỉ kiểm tra địa danh được đề cập, không bắt buộc một phạm vi tìm kiếm. Nếu model gọi search với `amenity.ELEVATOR=true`, luồng vẫn thực thi dù khách chưa nói muốn thuê ở đâu.

Đã tái hiện offline bằng planner có đầu ra giả lập và các hàm chuẩn hóa/điều phối thật: “Tôi cần tìm phòng có thang máy” dẫn đến một lần gọi search với elevator + ROOM, không có khu vực.

Sửa: nếu chưa có khu vực đáng tin từ lượt hiện tại hoặc trạng thái đã xác nhận thì hỏi “Bạn muốn thuê ở khu vực nào?”. Một trường/cơ sở đã xác định duy nhất có thể cung cấp phạm vi; khách chủ động chọn toàn quốc cũng hợp lệ. Không tự lấy thành phố trên header hoặc địa chỉ account làm ý định tìm kiếm nếu khách chưa xác nhận.

[Nguồn resolver](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/application/listing_location.py:38), [điểm thực thi](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/application/use_cases/listing_ask.py:117).

### P1 — Tự nới cả điều kiện bắt buộc khi không có kết quả

`ListingAsk` thử bỏ tối đa hai filter ngoài danh sách được bảo vệ. Thang máy, số người, WC, nội thất và chính sách đều có thể bị bỏ. Sau đó nhánh thay thế còn có thể bỏ loại nhà, đường hoặc giá. Hệ thống có thông báo kết quả đã nới điều kiện, nhưng chưa có sự đồng ý của khách cho việc thay đổi yêu cầu đó.

Đã tái hiện offline: “bắt buộc có thang máy, cho 3 người” → search rỗng → bỏ `amenity.ELEVATOR` → trả một thẻ tin. Đây là hành vi đang tồn tại, không phải lỗi test ngẫu nhiên. Test hiện tại còn ghi nhận cơ chế tự nới này.

Sửa: điều kiện khách nói rõ mặc định là hard constraint; chỉ xếp hạng theo preference. Không có kết quả thì hỏi muốn thay đổi điều kiện nào. Kết quả thay thế chỉ mở khi khách yêu cầu/chấp nhận và phải tách với kết quả khớp đủ.

[Nhánh nới filter](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/application/use_cases/listing_ask.py:123), [nhánh thay thế](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/application/use_cases/listing_ask.py:292).

### P1 — Bộ nhớ chưa lưu bộ tiêu chí tìm phòng

API chỉ đưa tám message gần nhất vào xử lý. `listingContext` thông thường chỉ có version và danh sách ID; không lưu giá, sức chứa, khu vực, thang máy hay câu hỏi đang chờ trả lời. Vì vậy sau khoảng bốn lượt trao đổi, yêu cầu đầu tiên có thể ra khỏi ngữ cảnh. Nearby có lưu nhóm/bán kính/target riêng, nhưng không thay thế bộ tiêu chí thuê.

Sửa: lưu `RenterSearchState` đã được kiểm tra, gồm constraints, preferences, missing/ambiguous fields, pending clarification, scope IDs và lịch sử thay đổi tiêu chí. Chỉ thay field khách thực sự sửa. Vẫn đọc lại giá/trạng thái tin từ Core; không dùng memory làm cache sự thật của tin đăng.

[History API](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/api/v1/agent_ask.py:50), [context hiện tại](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/application/listing_context.py:97).

### P1 — Tìm gần trường còn hai điểm bỏ sót

1. Planner vừa hướng dẫn đưa tên trường vào `keyword`, vừa hướng dẫn dùng `find_listings_near_place` khi bật Nearby. Nhánh chuẩn hóa cũ vẫn tạo keyword từ “gần …”. Vì thế tin có POI phù hợp nhưng không nhắc trường trong tiêu đề/mô tả có thể không được tìm ra.
2. SQL tìm gần một địa điểm yêu cầu có dòng `listing_nearby_places` của chính tin đó. Với giới hạn 100 kết quả, trường có thể đã tồn tại trong kho và nằm trong 2 km nhưng không thuộc 100 POI liên kết với tin. Trong khi API summary đã tính khoảng cách đến target trực tiếp bằng tọa độ.

Sửa: thống nhất nhánh Nearby, chặn/reroute search dùng keyword cho yêu cầu khoảng cách đến trường cụ thể. Với target có nguồn/tọa độ hợp lệ, dùng khoảng cách từ tọa độ listing đến target để lọc và xếp hạng; không bắt buộc target phải lọt vào mẫu 100 của listing. Khi tên trường có nhiều cơ sở phải hỏi lại. Nếu kho chưa có target thì báo chưa xác định được, không lấy một trường khác thay thế và không tự gọi thêm TomTom.

Với tìm theo nhóm chung như siêu thị, bằng chứng liên kết vẫn có ích; không có POI trong mẫu không chứng minh ngoài thực tế không có. Search cần trả chẩn đoán coverage/unknown, không chỉ total=0.

[Prompt mâu thuẫn](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/clients/listing_tool_planner.py:275), [hướng dẫn Nearby](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/clients/listing_tool_planner.py:327), [SQL relation](D:/Workspace/homespace/hs-core-api/hs-listing-service/src/main/java/com/hs/listing/nearby/NearbyQueryService.java:163).

### P1 — Đề xuất Nearby chọn top 3 trước khi áp điều kiện thuê mới

Luồng Nearby xếp hạng bằng khoảng cách, cắt ba tin rồi mới đọc chi tiết. Tool này chưa có bộ điều kiện thuê thông thường. Nếu sau khi xem mười phòng khách đổi thành ba người ở, dưới 5 triệu và gần IUH, ba phòng gần nhất có thể không đủ sức chứa; phòng thứ tư phù hợp đã bị loại khỏi dữ liệu gửi cho model. Prompt nhắc model không chọn phòng vi phạm có thể giảm trả sai, nhưng không cứu được ứng viên bị bỏ sớm.

Sửa: áp lại hard constraints trong Core, giới hạn trong scope ID đang xem, rồi mới xếp hạng Nearby và lấy tối đa ba tin để tư vấn.

[Nguồn](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/application/nearby_listing_advice.py:80).

### P1/P2 — Catalog field chưa đủ ngữ nghĩa và chưa đủ coverage

`/ai/fields` chỉ trả tên → kiểu, không có nhãn/alias tiếng Việt, enum, đơn vị, loại nhà áp dụng, operators và ý nghĩa dữ liệu thiếu. Model phải đoán nhiều enum; Core chấp nhận TEXT không hợp lệ rồi trả rỗng.

Khoảng trống có thể chỉ ra cụ thể:

- Ba policy INTEGER bị loại khỏi registry: `propertyInspectionNotice`, `noticeDaysBeforeTermination`, `depositRefundDays`. Những điều kiện “báo trước 24 giờ”, “hoàn cọc trong 7 ngày” hiện không lọc được đúng.
- Catalog nội thất có `RANGE_HOOD`, `MICROWAVE`, `SHOE_CABINET`, `WATER_TANK_PUMP`, nhưng registry theo mã thiếu quantity/condition cho bốn mã này. Generic item_code vẫn tìm được sự tồn tại; không nên nói toàn bộ món đồ đó hoàn toàn không tìm được.
- Registry policy lấy defaults tĩnh, còn listing dùng definitions trong CSDL; thay đổi catalog không tự thành filter AI.
- Mỗi filter trên bảng con tạo EXISTS riêng; nhiều điều kiện về cùng món nội thất có thể khớp các dòng khác nhau. Cần ràng buộc cùng item.

Sửa: mở rộng catalog hiện có và bộ compiler có whitelist, không đưa SQL/column tùy ý cho model. Trả metadata có version và giá trị hợp lệ lấy từ catalog hệ thống. Bổ sung numeric policy với so sánh số thật, không so chuỗi alphabet.

[Field registry](D:/Workspace/homespace/hs-core-api/hs-listing-service/src/main/java/com/hs/listing/service/AiListingSearchService.java:178), [INTEGER bị bỏ](D:/Workspace/homespace/hs-core-api/hs-listing-service/src/main/java/com/hs/listing/service/AiListingSearchService.java:211), [catalog nội thất](D:/Workspace/homespace/hs-core-api/hs-listing-service/src/main/java/com/hs/listing/config/ListingReferenceDataInitializer.java:71).

## 4. Đối chiếu các phần trên một bài đăng

| Phần khách nhìn thấy | Khả năng hiện tại | Phần cần làm rõ/bổ sung |
|---|---|---|
| Tiêu đề, mô tả, địa chỉ | TEXT + keyword title/description/address | Keyword chưa tìm mọi bảng; không dùng thay filter tiện ích hoặc bằng chứng khoảng cách |
| Điểm nổi bật | Chủ yếu computed từ loại tin, số ảnh/video | Không phải kho nội dung độc lập; tránh thiết kế thêm bảng highlights không cần thiết |
| Giá, diện tích | Có field số | Kiểm tra đơn vị, currency, giá theo người hay theo phòng |
| Phòng trọ & sinh hoạt | Hầu hết field có filter: WC/bếp/cửa sổ/ban công/gác/lối đi/giờ giấc/đồng hồ/số người/xe | Enum, null semantics, aliases và category phải được cung cấp cho planner |
| Nhà nguyên căn, căn hộ | Các field vật lý chính có filter | Occupancy scoped theo loại nhà; chưa có OR biểu diễn chấp nhận nhiều loại một cách chính xác |
| Bảng chi phí tháng | Có filter amount/included/billing_method/unit theo loại phí | Chưa có tổng chi phí tất định theo người/xe và định mức điện/nước |
| Giá & điều kiện thuê | Có cọc, kỳ trả, thời hạn tối thiểu, ngày nhận nhà… | Lọc ngày theo yêu cầu và tách giá thuê khỏi tổng chi phí / chi phí ban đầu |
| Chính sách & nội quy | Permission/text có; INTEGER thiếu | Không đồng nhất ALLOWED và APPROVAL_REQUIRED; thêm ba policy số |
| Tiện ích tòa nhà | Có ELEVATOR/WIFI/GYM… và custom amenity | Không dùng keyword; gym trong tòa nhà khác gym gần nhà |
| Nội thất bàn giao | Có mã, tên và phần lớn quantity/condition | Đồng bộ live catalog và ràng buộc điều kiện cùng item |
| Lịch xem | Có ngày trong tuần và khung giờ | Không suy ra lịch hẹn cụ thể còn trống từ lịch tiếp khách |
| Nearby | Có target/category/distance từ CSDL | Một predicate nearby; chưa biểu diễn đồng thời nhiều địa điểm/nhóm với bán kính khác nhau |

Ví dụ ánh xạ chính xác:

| Nhu cầu | Predicate / phân biệt |
|---|---|
| Thang máy | `amenity.ELEVATOR eq true` |
| Ba người ở | `room.max_occupants gte 3` với ROOM |
| WC riêng | `room.restroom_type eq PRIVATE` |
| Ra vào tự do | `room.access_hours_type eq FLEXIBLE` |
| Không chung lối đi | `room.access_type eq PRIVATE` |
| Ban công riêng | `room.balcony_type eq PRIVATE`, không chỉ has_balcony |
| Được nuôi mèo | `policy.petPolicy.value eq ALLOWED`; cần xin phép là `APPROVAL_REQUIRED` |
| Máy lạnh bàn giao trong phòng | Nội thất AIR_CONDITIONER; không tự đồng nhất với tiện ích chung |
| Gần đúng Đại học Công nghiệp | Resolve đúng cơ sở → POI target và khoảng cách, không dựa vào câu quảng cáo |

Nguồn hiển thị: [RentDetailView](D:/Workspace/homespace/hs-web-app/components/rent/RentDetailView.tsx:212), [các section field](D:/Workspace/homespace/hs-web-app/lib/rent-detail-sections.ts:196).

## 5. Luồng đích cho yêu cầu của người thuê

Ví dụ: “Tôi cần phòng trọ gần trường Đại học Công nghiệp dưới 5 triệu cho 3 người”.

1. Trích xuất ROOM, ngưỡng giá, sức chứa ≥3, target trường; giữ nguyên nguồn yêu cầu. Phân biệt “dưới” với “tối đa” theo quy ước so sánh được chốt, có test đúng tại biên 5 triệu.
2. Xác định đúng trường/cơ sở trong kho. Nếu nhiều kết quả, hỏi cơ sở; lưu toàn bộ tiêu chí còn lại trong pending state để khách chỉ cần trả lời “cơ sở Nguyễn Văn Bảo”. Không yêu cầu khách gõ lại ngân sách/số người.
3. Áp mặc định Nearby 2 km đã công khai. Nếu khách nói 500 m thì dùng 500 m. Nếu hỏi 5 km, nêu giới hạn dữ liệu 2 km; không hứa đã quét đủ 5 km hoặc tự quét bổ sung.
4. Core áp toàn bộ điều kiện thuê và vị trí trước LIMIT. Với yêu cầu “gần nhất”, sort theo khoảng cách đến đúng target trên toàn tập hợp lệ trước LIMIT, không lấy tin mới nhất rồi mới chọn gần nhất trong trang đó.
5. Core trả số lượng có giới hạn, tổng khớp, bằng chứng theo từng điều kiện và coverage. Model không được nhìn toàn bộ một phường.
6. AI giải thích ngắn lý do phù hợp. Nếu tư vấn chọn phòng, đưa tối đa ba gợi ý đã qua hard filters; nếu khách chỉ muốn xem mười tin thì vẫn dùng số lượng xem linh động theo giới hạn hệ thống.
7. Không có kết quả: cho biết đang thiếu dữ liệu hay không có tin khớp; hỏi khách muốn thay đổi điều kiện nào. Không tự bỏ yêu cầu.

Trường hợp “cần phòng có thang máy”: chỉ hỏi phần quan trọng còn thiếu, trước hết khu vực. Khi khách trả lời “Hạnh Thông, HCM” phải hợp nhất với elevator đã lưu. Không bắt khách hoàn thành một bảng hỏi dài về persona nếu họ đã cung cấp đủ nhu cầu tìm kiếm.

## 6. Kế hoạch triển khai bám vào module hiện có

### Đợt 1 — Khóa tính đúng và quản lý hội thoại

- Thêm typed plan outcome: SEARCH / CLARIFY / DETAIL / COMPARE; clarification chứa missing/ambiguous fields và tiêu chí đã hiểu. Hiện tại model không gọi function thì text hỏi bổ sung bị bỏ, thay bằng câu hỏi chung.
- Lưu search state độc lập với lịch sử tám message, có provenance lượt nói, overrides và pending question. Giữ scope/ordinal references hiện có.
- Gate thiếu địa điểm; chặn tự nới hard filters; phân biệt lỗi tool với không có kết quả.
- Gỡ mâu thuẫn keyword/Nearby; ép đường đi đúng cho named target khi Nearby bật.
- Áp hard constraints trước xếp hạng Nearby; cho phép Core lọc lại trong scope IDs.

Điểm sửa chính: `listing_tool_planner.py`, `listing_ask.py`, `listing_location.py`, `listing_context.py`, `agent_ask.py`, repository hội thoại, `nearby_listing_advice.py`. Schema state cần validate phía ứng dụng; model không tự ghi trạng thái chưa kiểm tra.

### Đợt 2 — Hoàn thiện contract Core và bằng chứng kết quả

- Catalog có metadata và enum/units/category/operators/null semantics; đồng bộ policy/nội thất từ catalog hệ thống. Bổ sung ba policy số và các field thiếu đã xác định.
- Named-target spatial predicate và distance sort, diagnostics coverage/unknown; target aliases/campus và giới hạn địa lý cho resolver.
- Ràng buộc cùng item cho nội thất/phí; hỗ trợ OR có cấu trúc và nhiều Nearby predicates, với độ sâu/số lượng điều kiện bị giới hạn.
- Bổ sung ngày nhận nhà, giá theo người/phòng và tính các phí cố định. Điện/nước theo dùng thực tế chỉ tính khi có giả định được khách xác nhận.
- Trả matched evidence gọn theo đúng filter được yêu cầu. Preview đang bị giới hạn 4 KB/tin có thể bỏ description/policies/furnishings; không tăng lên tải full mọi tin để giải quyết.
- Cursor/excludeIds cho “mười tin khác”, tránh lặp. Chỉ thiết kế/index sau khi có query plan và số đo trên dữ liệu test; chưa có bằng chứng đo để kết luận query hiện tại chậm.

Điểm sửa chính: DTO/catalog/compiler `AiListingSearchService`, `NearbyQueryService`, listing projection và các contract `ListingTools`. Tận dụng năm tool hiện tại, mở rộng arguments/response có version; không tạo hàng chục tool theo field.

### Đợt 3 — Kiểm thử hội thoại thực tế và đo chất lượng

- Mỗi câu có expected plan/criteria/clarification và tập ID đủ điều kiện xác định; không chấm chỉ vì câu trả lời nghe hợp lý.
- Ba lớp: unit chuẩn hóa + contract; PostgreSQL với toàn bộ bảng con/POI; eval model thật trên corpus người đi thuê. Chỉ lớp cuối mới chứng minh khả năng hiểu ngôn ngữ của model.
- Case mới phải có test fail trên hành vi cũ và pass sau sửa, nhất là missing location, hard constraints, memory >8 messages và exact campus.
- Kiểm tra payload giới hạn, số Core call, latency và lý do loại từng phòng. Không phát sinh TomTom khi hỏi chat.
- Không tự chạy model trả phí hoặc gọi POI thật trong bộ offline/CI.

## 7. Bộ tình huống nghiệm thu tối thiểu

| Câu / hội thoại | Hành vi bắt buộc |
|---|---|
| “Tôi cần phòng có thang máy” | Hỏi khu vực; chưa search không có phạm vi |
| Trả lời tiếp “Hạnh Thông, HCM” | Giữ elevator, bổ sung ward/city; không hỏi lại tiêu chí cũ |
| “An Nhơn dưới 5 triệu, 3 người, có thang máy, được nuôi mèo” | AND đủ tiêu chí; sức chứa ≥3; pet ALLOWED |
| “Gần Đại học Công nghiệp, dưới 5 triệu, 3 người” | Resolve campus → khoảng cách thực → SQL trước LIMIT |
| Target nằm trong 2 km, có trong kho nhưng không trong 100 link của tin | Không loại chỉ vì thiếu link target; vẫn cần tọa độ/nguồn target hợp lệ |
| “Gần IUH và siêu thị trong 500 m” | Hai điều kiện vị trí độc lập; không biến thành một category bất kỳ |
| “Phòng trọ hoặc căn hộ, ở 3 người” | OR đúng hai loại và occupancy đúng loại; không mở sang mọi loại nhà |
| “Nhất định có WC riêng” nhưng không có tin | Không tự bỏ WC; hỏi khách có muốn đổi gì |
| Sau 6 lượt: “Giữ yêu cầu cũ, tăng ngân sách lên 5 triệu” | Chỉ sửa ngân sách; còn khu vực/sức chứa/thang máy |
| “Trong các phòng trên, giờ 3 người ở, gần IUH nên chọn phòng nào?” | Lọc lại sức chứa trong scope trước chọn top 3 |
| “Tổng mỗi tháng tối đa 5 triệu cho 3 người, 2 xe” | Phân biệt rent và tổng; hỏi lượng điện/nước nếu cần tổng chính xác |
| “Có phòng đầu tháng sau vào ở, thuê 3 tháng được không?” | Chuẩn hóa ngày theo timezone; min lease không vượt 3; available date hợp lệ |
| “Có 2 giường còn tốt” | Quantity/condition của đúng món; không khớp hai dòng khác nhau |
| “Chủ nhà báo trước 24 giờ, hoàn cọc trong 7 ngày” | Numeric policy thực; không bỏ filter không hỗ trợ |
| “Không ghi nuôi mèo thì chắc được nhỉ?” | Chưa khai báo ≠ được phép; không kết luận ALLOWED |
| “Có gym trong tòa nhà” / “gần gym” | Amenity khác Nearby; SPORTS chưa thu thập thì báo thiếu dữ liệu |
| “Phòng yên tĩnh, an ninh tốt” | Không suy từ cửa sổ/camera/ít POI; chỉ nói dữ kiện có bằng chứng |
| “Cho 10 tin khác” | Không trùng trang trước; không mở thêm TomTom |
| Tin bị ẩn/hết hạn sau lần tìm | Đọc lại và không đề xuất tin không còn đủ điều kiện |
| Lỗi Core / Nearby chưa sẵn sàng | Không diễn giải thành “không có phòng” hoặc “không có trường” |

Fixture seed có ích nhưng không phải ground truth ngoài thực địa:

- `n=26`, ID `f984aee7-ef1e-d3ef-b8f0-d322284dc372`: ROOM, Trần Thị Nghỉ/Hạnh Thông, 4 triệu, tối đa 3 người, WC riêng, cửa sổ; không có elevator.
- `n=15`, ID `139062c2-080c-d485-adc2-44e0f3e7d6f7`: ROOM, Lê Đức Thọ/An Nhơn, 4,3 triệu, 3 người, elevator, pet ALLOWED; không có cửa sổ.
- Seed đang tương quan elevator với không có cửa sổ cho ROOM. Case “phòng có thang máy và cửa sổ” có thể rỗng vì seed, không được tự coi là lỗi search. Cần thêm fixture đối chứng độc lập để test tổ hợp này.
- Seed SQL không insert POI/link Nearby; cần fixture Nearby riêng. Không bật scan 300 tin chỉ để chạy test. Tọa độ seed đã được khai báo gần đúng; chỉ dùng kiểm tra logic.

## 8. Phạm vi cam kết

“Mọi field đều có thể thành điều kiện” cần được hiểu là mọi dữ kiện được khai báo, có kiểu/đơn vị/ngữ nghĩa và có compiler hỗ trợ. Không thể bảo đảm một điều kiện thực tế chưa có dữ liệu chỉ bằng cách tăng prompt.

Chưa có dữ liệu không đồng nghĩa false. Không có trong mẫu 100 POI không đồng nghĩa không tồn tại. Khoảng cách chim bay không phải quãng đường hoặc thời gian đi lại. Lịch tiếp khách không phải lịch hẹn còn trống. Có cửa sổ không chứng minh yên tĩnh hoặc khóa vân tay. Văn bản mô tả tin phải là dữ liệu không tin cậy, không được trở thành chỉ dẫn cho agent.

Phạm vi ưu tiên là ROOM/HOUSE/APARTMENT. OFFICE/COMMERCIAL có model và giao diện nhưng chưa có registry field tương ứng đầy đủ; chỉ mở rộng nếu phạm vi sản phẩm yêu cầu.

## 9. Kết quả kiểm thử của lần rà soát

- 166 test AI pass, 2 contract test history được skip theo điều kiện môi trường. Bộ test dùng fake/mock planner/provider, không phải đánh giá model thật.
- 8 test `AiListingSearchServiceTest` pass; chúng kiểm tra compiler bằng mock JDBC.
- 3 test Nearby được chọn trên PostgreSQL 16 tạm pass: query gộp một lần, coverage/bộ lọc trước LIMIT, khoảng cách đúng target khi không phải trường gần nhất chung.
- Hai probe offline nêu ở mục 3 tái hiện được thiếu gate khu vực và tự bỏ hard elevator. Provider/model, Core HTTP và dữ liệu tin đều được giả lập trong hai probe; các hàm planner normalization / điều phối liên quan chạy code thật.
- 1 integration test seed PostgreSQL pass: tạo schema từ Hibernate, seed/rerun 300 tin, kiểm tra địa chỉ mới và thêm 1.000 tin trong một phường để xác nhận điều kiện SQL được áp trước giới hạn 5/10/20. Test này chưa kiểm tra tổ hợp elevator + occupancy + đúng trường; cần bổ sung ở đợt triển khai.
- Tổng Core trong lần rà soát: 12 test pass, gồm 8 mock-JDBC và 4 PostgreSQL. Không dùng CSDL dev của người dùng; không gọi TomTom hoặc model trả phí. PostgreSQL tạm được dọn sau kiểm thử.

Lưu ý: các test đang pass chưa phủ đủ những lỗ hổng đã chỉ ra. Đặc biệt chưa có test kết hợp end-to-end bằng model thật cho thang máy + số người + giá + đúng cơ sở trường; không dùng số test pass để khẳng định tính năng đã đạt yêu cầu.
