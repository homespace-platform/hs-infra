# PROMPT TRIỂN KHAI CHO AI AGENT — HOMESPACE AI TƯ VẤN TÌM PHÒNG

## 1. Nhiệm vụ và cách sử dụng prompt

Bạn là Senior Engineer phụ trách triển khai AI tư vấn tìm nhà/phòng cho khách thuê HomeSpace. Khi người dùng giao thực hiện prompt này, hãy đọc source, triển khai, kiểm thử và bàn giao kết quả cụ thể. Không chỉ viết lại kế hoạch hoặc sửa vài dòng system prompt rồi báo hoàn thành.

Tài liệu kế hoạch bắt buộc:

- [HOMESPACE_AI_RENTER_SEARCH_AUDIT_PLAN.md](D:/Workspace/homespace/hs-infra/prompts/HOMESPACE_AI_RENTER_SEARCH_AUDIT_PLAN.md)
- [HOMESPACE_NEARBY_MEMORY_PROMPT.md](D:/Workspace/homespace/hs-infra/prompts/HOMESPACE_NEARBY_MEMORY_PROMPT.md)
- [AI_RENTER_MANUAL_ACCEPTANCE_QUESTIONS.md](D:/Workspace/homespace/hs-infra/documents/ask/AI_RENTER_MANUAL_ACCEPTANCE_QUESTIONS.md) — bộ câu hỏi nghiệm thu người thuê do người dùng sẽ test trực tiếp.
- [README seed hiện tại](D:/Workspace/homespace/hs-infra/postgres/seed/README.md) — dữ liệu Nearby offline đã được bổ sung sau lần audit.

File AUDIT_PLAN là bằng chứng hiện trạng và định hướng. File này chuyển kế hoạch thành yêu cầu triển khai và nghiệm thu. Không coi những số test pass trong audit là kết quả kiểm thử của lần triển khai mới.

Source đã được audit ở các mốc `hs-core-api@41f397c`, `hs-ai-service@6e360d1`, `hs-web-app@fd06842`. Trước khi sửa phải đọc lại source hiện tại và diff, vì source có thể đã thay đổi. Nếu phát hiện khác biệt, ghi rõ và điều chỉnh điểm sửa; giữ mục tiêu nghiệp vụ. Chỉ hỏi người dùng khi thật sự thiếu quyết định làm thay đổi phạm vi hoặc kết quả.

Rà soát bổ sung ngày 29/10/2026: seed mới đã nhúng 100 POI thật dùng chung và 300 snapshot offline PARTIAL. Hãy dùng thông tin cập nhật ở file seed/README thay cho nhận định cũ rằng seed chưa có Nearby. Không diễn giải prompt này thành bảo đảm mọi câu hỏi ngoài khả năng dữ liệu đều có phòng trả về.

## 2. Kết quả người dùng cần

Khách có thể nói nhu cầu thuê bằng ngôn ngữ tự nhiên. Hệ thống hiểu điều kiện, hỏi lại phần quan trọng còn thiếu, lọc bằng dữ liệu có thật trong CSDL và tư vấn các phòng đủ điều kiện.

Ví dụ chính:

> Tôi cần tìm phòng trọ gần trường Đại học Công nghiệp dưới 5 triệu cho 3 người.

Tin không bắt buộc có chữ “Đại học Công nghiệp” trong tiêu đề/mô tả. Nếu kho có đúng cơ sở trường và tọa độ tin phù hợp thì phải tìm được bằng dữ liệu vị trí. Đồng thời phải giữ ROOM, giá và sức chứa trước khi giới hạn kết quả.

Ví dụ hỏi bổ sung:

> Khách: Tôi cần phòng có thang máy.
>
> AI: Bạn muốn thuê ở khu vực nào?
>
> Khách: Hạnh Thông, TP.HCM.

Lượt tiếp theo phải giữ `amenity.ELEVATOR=true`, thêm khu vực đã xác định rồi mới tìm. Không bắt khách gõ lại thang máy; không tự thêm ngân sách hoặc số người.

Chất lượng không được đo chỉ bằng câu trả lời nghe tự nhiên. Tool, tiêu chí SQL, tập ID và bằng chứng trả lời phải đúng.

## 3. Phạm vi và những quyết định phải giữ

Workspace: `D:/Workspace/homespace`.

| Repo | Phạm vi công việc |
|---|---|
| `hs-ai-service` | Hiểu ý định, chuẩn hóa, hỏi bổ sung, memory, gọi tool, tư vấn và kiểm chứng đầu ra |
| `hs-core-api` | Catalog field, compiler điều kiện, tìm vị trí, projection bằng chứng, pagination và validation |
| `hs-web-app` | Chỉ sửa tích hợp chat nếu API/state mới cần; tái sử dụng thẻ tin và component hiện có |
| `hs-infra` | Tài liệu, corpus và hướng dẫn chạy; seed hiện có dùng làm nguồn fixture |

Ưu tiên ROOM/HOUSE/APARTMENT. Không tự mở rộng OFFICE/COMMERCIAL, thay provider, xây lại toàn bộ AI stack hoặc thiết kế lại giao diện.

Các ràng buộc bắt buộc:

1. Dùng các tool hiện có làm nền: `search_listings`, `get_listing_detail`, `get_listing_details`, `find_listings_near_place`, `get_listing_nearby_places`. Mở rộng contract có version nếu cần; không tạo một tool cho mỗi field.
2. Core lọc điều kiện trong CSDL trước LIMIT. Không lấy toàn bộ tin trong phường để model tự lọc.
3. Chat, xem chi tiết, lọc nhóm Nearby và phân trang không được gọi TomTom. Không thêm scan-on-read, gọi bù nhóm, pagination provider hoặc tự làm mới sau 24 giờ.
4. Thu thập Nearby giữ mặc định 2 km, `limit=100`, `ofs=0`, một request Nearby gộp categorySet: `7372,7377,7321,7326,7332005,9361009,7315,7328,9942002,9362`. Không thay fingerprint để vô tình quét lại toàn bộ tin. Giữ cơ chế publish/đổi vị trí/reconcile/retry hiện có theo memory Nearby.
5. Giữ kho POI dùng chung, chống trùng ID và quan hệ nhiều–nhiều. Không xóa POI cũ chỉ vì một listing đổi địa chỉ.
6. Không khôi phục Geoapify/location service cũ. Không đổi nguồn địa chỉ mới sau sáp nhập. Giữ bản đồ VietMap, phân trang Nearby FE 10 mục và UI hiện có.
7. Không tạo SQL migration/fix cho thay đổi này. Nếu cần schema mới trong Core, cập nhật Java/JPA mapping; test bằng schema Hibernate trên CSDL tạm. Người dùng tự quyết định drop/reseed CSDL của họ, Agent không được tự drop CSDL dev.
8. Dùng kho hội thoại hiện có cho search state. Không tạo thêm một storage stack chỉ để lưu memory.
9. Key thật chỉ ở backend `.env`/secret config. Cấu hình nghiệp vụ mới đặt trong properties và validate khi khởi động theo quy ước dự án. Không tự thêm fallback che cấu hình thiếu, không in key vào log/tài liệu/test output.
10. Giữ phân quyền, ownership hội thoại, giới hạn public listing và kiểm tra active/PUBLISHED/chưa hết hạn. Không để state hoặc ID do client/model gửi vượt quyền truy cập.
11. Không reset/restore/ghi đè thay đổi ngoài phạm vi, không tự commit/push/deploy. Đọc `AGENTS.md` áp dụng cho từng thư mục trước khi sửa.

## 4. Đọc source theo luồng thật trước khi sửa

Đọc đầy đủ hai tài liệu ở mục 1, sau đó theo các điểm vào sau. Nếu đường dẫn đã đổi, tìm implementation mới; không kết luận file không tồn tại là tính năng chưa có.

AI:

- [agent_ask.py](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/api/v1/agent_ask.py)
- [listing_ask.py](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/application/use_cases/listing_ask.py)
- [listing_tool_planner.py](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/clients/listing_tool_planner.py)
- [tools/listings.py](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/tools/listings.py)
- [listing_context.py](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/application/listing_context.py)
- [listing_location.py](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/application/listing_location.py)
- [nearby_listing_advice.py](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/application/nearby_listing_advice.py)
- [listing_evidence.py](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/application/listing_evidence.py)
- [listing_limits.py](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/application/listing_limits.py)
- [conversation_repo.py](D:/Workspace/homespace/hs-ai-service/src/homespace_ai/repositories/conversation_repo.py)

Core/frontend/dữ liệu:

- [AiListingSearchService.java](D:/Workspace/homespace/hs-core-api/hs-listing-service/src/main/java/com/hs/listing/service/AiListingSearchService.java)
- [AiListingSearchRequest.java](D:/Workspace/homespace/hs-core-api/hs-listing-service/src/main/java/com/hs/listing/dto/request/AiListingSearchRequest.java)
- [NearbyQueryService.java](D:/Workspace/homespace/hs-core-api/hs-listing-service/src/main/java/com/hs/listing/nearby/NearbyQueryService.java)
- [PublicListingController.java](D:/Workspace/homespace/hs-core-api/hs-api-service/src/main/java/com/hs/api/controller/publish/PublicListingController.java)
- [NearbyPlacesController.java](D:/Workspace/homespace/hs-core-api/hs-api-service/src/main/java/com/hs/api/controller/publish/NearbyPlacesController.java)
- [ListingPolicyCatalog.java](D:/Workspace/homespace/hs-core-api/hs-listing-service/src/main/java/com/hs/listing/config/ListingPolicyCatalog.java)
- [ListingReferenceDataInitializer.java](D:/Workspace/homespace/hs-core-api/hs-listing-service/src/main/java/com/hs/listing/config/ListingReferenceDataInitializer.java)
- [RentDetailView.tsx](D:/Workspace/homespace/hs-web-app/components/rent/RentDetailView.tsx)
- [rent-detail-sections.ts](D:/Workspace/homespace/hs-web-app/lib/rent-detail-sections.ts)
- [listings_seed_hcm.sql](D:/Workspace/homespace/hs-infra/postgres/seed/listings_seed_hcm.sql)

Đọc thêm model/enum/service/catalog và test liên quan khi lần theo các field. Báo ngắn hiện trạng và thứ tự xử lý, rồi triển khai; không dừng lại chỉ để đưa một bản plan mới.

## 5. Các yêu cầu triển khai có mã để nghiệm thu

### R01 — Catalog field có ngữ nghĩa và kiểm tra giá trị

- Mở rộng contract field discovery có version. Giữ tương thích hoặc cập nhật đồng bộ tất cả caller tìm thấy trong source; không âm thầm đổi shape gây lỗi tool.
- Metadata tối thiểu: mã field, nhãn/alias tiếng Việt, kiểu, operators hợp lệ, đơn vị, category áp dụng, enum code + nhãn, nguồn dữ liệu và ý nghĩa null/thiếu.
- Phân biệt field tìm được, field computed, field chỉ để hiển thị và điều kiện chưa có bằng chứng. Bất kỳ điều kiện khách nêu phải được ánh xạ, hỏi lại hoặc báo không hỗ trợ; không âm thầm bỏ.
- Lấy code/enum từ định nghĩa và catalog hệ thống; không tiếp tục giữ danh sách policy/nội thất riêng bị lệch với CSDL. Cache có version/invalidation phù hợp khi catalog đổi; không truy vấn mọi catalog trên từng dòng listing.
- SQL mapping/operator vẫn do server kiểm soát. Model không được cung cấp tên bảng/cột/SQL tùy ý. Giá trị dùng bind parameters.
- Core từ chối enum sai, field sai, operator sai, số/ngày sai bằng lỗi có cấu trúc; không biến thành total=0. Không tạo retry vô hạn khi model lập kế hoạch sai.

### R02 — Phủ dữ liệu của một tin và các trường đang thiếu

Tạo ma trận `field → source → filter/operator → unit/enum → evidence → test` cho các phần trong AUDIT_PLAN mục 4: tiêu đề/mô tả/địa chỉ, giá/diện tích, chi tiết ROOM/HOUSE/APARTMENT, chi phí, điều kiện thuê, policy, amenities/custom amenities, nội thất, lịch xem và Nearby.

Phải sửa các thiếu sót đã xác định:

- Policy INTEGER: `propertyInspectionNotice` theo giờ, `noticeDaysBeforeTermination` và `depositRefundDays` theo ngày; so sánh số thật. Giá trị thiếu hoặc không hợp lệ không được coi là 0.
- Nội thất `RANGE_HOOD`, `MICROWAVE`, `SHOE_CABINET`, `WATER_TANK_PUMP` phải có khả năng lọc quantity/condition tương ứng; kiểm tra catalog hiện tại còn mã nào khác.
- Enum permission đủ `ALLOWED`, `NOT_ALLOWED`, `APPROVAL_REQUIRED`. Có điều kiện xin phép không được trình bày như cho phép chắc chắn.
- Thang máy dùng `amenity.ELEVATOR`, WC riêng dùng `room.restroom_type=PRIVATE`, ra vào tự do dùng `room.access_hours_type=FLEXIBLE`, ban công riêng dùng `room.balcony_type=PRIVATE`, ba người dùng sức chứa `>=3`.
- Gym trong tòa nhà khác gym gần nhà; máy lạnh bàn giao trong phòng khác tiện ích chung. `has_window=true` không chứng minh phòng yên tĩnh hoặc có khóa vân tay.
- “Điểm nổi bật” hiện computed, không tự tạo thêm bảng nội dung riêng. Lịch tiếp khách không chứng minh một lịch hẹn cụ thể còn trống.
- Dữ liệu không khai báo phải giữ UNKNOWN. Không có row amenity/furniture chỉ chứng minh không được khai báo trong dữ liệu; không khẳng định thực tế không có.

### R03 — Plan có kết quả hỏi bổ sung rõ ràng

- Plan phải phân biệt SEARCH, CLARIFY, DETAIL/COMPARE và nhánh hỗ trợ/RAG hiện có. Có thể dùng schema/hàm nội bộ thích hợp; không bắt buộc biến mọi bước thành external tool.
- CLARIFY chứa trường đang thiếu/mơ hồ, câu hỏi, các lựa chọn hợp lệ nếu có và các tiêu chí đã hiểu. Validate dữ liệu trước khi lưu.
- Thiếu phạm vi tìm kiếm thì chưa gọi search. Phạm vi có thể là tỉnh/phường/địa chỉ đủ rõ, target POI duy nhất hoặc lựa chọn toàn quốc được khách nói rõ.
- Không tự lấy địa chỉ account/thành phố trên header làm nhu cầu của khách. Nếu muốn dùng thông tin đó, phải hỏi xác nhận.
- “Gần IUH” đã resolve duy nhất có thể đủ xác định địa điểm, không bắt buộc khách nhập phường thêm. Tên trùng/cơ sở chưa rõ phải hỏi lại.
- Chỉ hỏi phần cần thiết cho truy vấn đúng. Không ép persona, ngân sách, số người hoặc mọi field thành bắt buộc nếu khách chưa đặt điều kiện đó và phạm vi đã đủ.
- Không thêm điều kiện loại nhà chỉ vì khách là sinh viên/người đi làm, hoặc nói chung “chỗ ở/phòng”. Nếu chưa chốt loại hình thì tìm trong phạm vi nhà ở được hỗ trợ hoặc hỏi khi nó làm thay đổi cách hiểu; “phòng trọ” mới là ROOM rõ ràng.
- Nếu câu hỏi đã đủ phạm vi và điều kiện để tìm, hãy tìm và đưa lựa chọn hữu ích; không trì hoãn bằng một chuỗi câu hỏi ngân sách/persona/tiện ích không cần thiết. Mỗi lượt ưu tiên hỏi một hoặc hai điều quan trọng nhất còn thiếu.
- “Thoáng”, “yên tĩnh”, “an ninh tốt” không được tự biến thành con số hoặc boolean chưa được khách đồng ý. Có thể hỏi cụ thể cửa sổ/ban công hoặc ghi nhận là preference chưa đủ bằng chứng.
- Nếu model trả lời bằng câu hỏi mà không có function call, không được đánh mất câu hỏi có ý nghĩa rồi thay bằng một câu hỏi chung không liên quan. Chuẩn hóa về CLARIFY có kiểm tra.
- Phát hiện điều kiện mâu thuẫn trong cùng lượt, như khoảng tiền “từ 5 đến 4 triệu”, trước khi search. Hỏi khách chốt đúng phần mâu thuẫn; giữ các điều kiện không liên quan, không tự đảo ngưỡng hoặc bỏ một vế. Phân biệt với lượt sau chủ động thay ngân sách cũ bằng ngân sách mới.

### R04 — State tiêu chí bền qua hội thoại

Thiết kế `RenterSearchState` có version, lưu trong kho hội thoại hiện có. Tối thiểu gồm:

- Constraints theo kiểu dữ liệu và hard/preference; nguồn từ lượt nói nào.
- Phạm vi địa lý đã xác nhận; target POI/cơ sở đã resolve và phạm vi khoảng cách.
- Những điều kiện chưa hỗ trợ, thiếu dữ liệu hoặc đang mâu thuẫn.
- Pending clarification và tiêu chí liên quan đang chờ khách trả lời.
- Scope ID đang hiển thị, thứ tự tham chiếu và dữ liệu phân trang/loại trừ cần thiết.
- Version/update information để không ghi đè state mới hơn khi các request cùng hội thoại chạy đồng thời; tận dụng cơ chế repository hiện có.

Quy tắc merge:

- Khách trả lời một câu hỏi ngắn thì điền đúng slot; không cần gõ lại cả nhu cầu.
- “Tăng ngân sách lên 5 triệu” chỉ sửa ngân sách; “bỏ yêu cầu thang máy” mới bỏ elevator; “giữ yêu cầu cũ, đổi sang An Nhơn” giữ các điều kiện khác.
- “Không cần thang máy” là bỏ yêu cầu về thang máy, không phải bắt buộc tìm nhà không có thang máy. Phân biệt lời khách mô tả bản thân với nội quy họ yêu cầu, chẳng hạn “mình không hút thuốc” không tự thành filter cấm hút thuốc.
- Phân biệt xem thông tin và sửa tiêu chí: “phòng số 2 có thang máy không?”, “phí xe phòng này bao nhiêu?” chỉ đọc sự thật của tin, không thêm elevator/giá xe vào search state. “Chỉ giữ phòng có thang máy” mới là lệnh lọc. Câu tham khảo “nếu thêm người thì sao?” không tự đổi số người cho các lượt sau trừ khi khách xác nhận đang đổi nhu cầu.
- Yêu cầu bắt đầu lại/xóa bộ lọc phải reset đúng phạm vi. Khi đổi loại nhà khiến field cũ không còn phù hợp, phát hiện xung đột và hỏi lại phần quan trọng; không áp field ROOM cho APARTMENT hoặc âm thầm làm mất yêu cầu.
- Không dùng giá/trạng thái trong state thay cho sự thật hiện tại. Chỉ cache ý định/tham chiếu; đọc lại listing đang công khai trước khi trả lời.
- Tương thích hội thoại cũ chỉ có listingIds; không tự dựng các tiêu chí đã mất từ văn bản của AI.
- Bộ nhớ phải sống qua reload/restart theo storage hiện có, tách biệt giữa account và cuộc hội thoại. Test dài hơn cửa sổ tám message.

### R05 — Hard constraints không được tự nới

- Điều kiện khách nói rõ mặc định là bắt buộc. Từ “ưu tiên”, “nếu được”, “có thì tốt” mới là preference theo ngữ cảnh; không biến preference thành filter loại hết tin.
- Bỏ các đường tự nới filter khi empty result, bao gồm cả nhánh thay thế category/street/budget nếu chưa được khách cho phép.
- Khi không có kết quả, phân biệt không khớp dữ liệu đã biết, chưa đủ coverage, tiêu chí chưa được hỗ trợ và lỗi tool. Hỏi khách muốn đổi điều kiện nào; không trả tin vi phạm dưới nhãn khớp đủ.
- Khi khách cho phép nới, lưu thay đổi và chỉ nới đúng phần được đồng ý. Có thể trình bày alternative riêng nếu khách yêu cầu, kèm các tiêu chí chưa đạt.
- Trước khi tạo card/gợi ý, kiểm tra lại toàn bộ hard criteria trong Core. Mọi card được gắn “phù hợp” phải có bằng chứng đủ; model không được tự quyết định bỏ một yêu cầu.

### R06 — Named landmark phải đi qua dữ liệu vị trí

- Gỡ hướng dẫn mâu thuẫn keyword/Nearby trong planner và nhánh normalize. Khi Nearby bật, yêu cầu khoảng cách đến trường/bệnh viện cụ thể phải resolve target và dùng truy vấn vị trí.
- Keyword vẫn dùng cho nhu cầu văn bản phù hợp, nhưng không chứng minh gần một địa điểm. Không tìm chữ IUH trong title/description để thay thế khoảng cách.
- Resolver hỗ trợ tên tiếng Việt có/không dấu, alias phổ biến được quản lý trong hệ thống, địa lý và cơ sở. Không để model bịa UUID/tọa độ. Alias mơ hồ phải trả candidates; không tự nhận một campus là đúng.
- Khi khách chọn một candidate, dùng ID do Core trả và kiểm tra lại candidate còn hợp lệ. Không để câu trả lời ngắn làm mất giá/số người/thang máy.
- Với named target có tọa độ và nguồn hợp lệ, lọc bằng khoảng cách từ tọa độ listing tới target mà không đòi target phải nằm trong 100 POI liên kết của listing. Tái sử dụng cách tính distance/điều kiện hợp lệ của query summary nếu phù hợp.
- Giữ active/nguồn/license/position revision và tính hợp lệ tọa độ; không tái sử dụng distance của địa chỉ listing cũ.
- Không có target trong kho: báo chưa xác định được và hỏi thêm; không chuyển sang trường gần nhất bất kỳ, không tự gọi provider.
- “Gần nhất” phải sort theo target distance trên toàn bộ tập đã đạt hard filters trước LIMIT, có tie-break ổn định; không chọn từ một trang tin mới nhất rồi nói gần nhất toàn bộ.

### R07 — Coverage và nhiều điều kiện Nearby

- Named target distance từ hai tọa độ hợp lệ là bằng chứng khoảng cách đến đúng điểm đó. Đây không phải bằng chứng đã thu thập đủ các tiện ích trong vùng.
- Generic group cần bằng chứng POI phù hợp từ kho. Trả coverage/unknown diagnostics thay vì chỉ total=0. Không có siêu thị trong mẫu 100 không đủ kết luận thực tế không có siêu thị.
- PARTIAL/LIMITED không vô hiệu bằng chứng dương tính: POI đã có tọa độ/nguồn hợp lệ và nằm trong radius vẫn có thể được nêu hoặc dùng cho điều kiện “có siêu thị trong 500 m”. Phân biệt EXISTS có bằng chứng với NOT EXISTS/toàn diện chưa biết. Không ép coverage COMPLETE cho mọi truy vấn và không đổi nhãn dữ liệu seed để làm test pass.
- Có thể đối chiếu các khoảng cách có bằng chứng giữa các phòng trong scope, nói rõ giới hạn mẫu. Chỉ nói “gần hơn tới địa điểm X đã xác định” khi chứng minh được; không suy “phòng có nhiều tiện ích nhất toàn khu”, “không có bệnh viện” hoặc “nhóm này tiện lợi nhất” từ các mẫu không đầy đủ. Nhóm thiếu dữ liệu không bị chấm điểm như thực tế không có.
- Mặc định 2 km; chấp nhận bán kính nhỏ hơn khi khách nói rõ. Yêu cầu tới 5 km đọc dữ liệu hiện có và nêu giới hạn coverage; không scan bù. Có thể tính khoảng cách tới một named target ngoài 2 km nếu có tọa độ hợp lệ, nhưng không nói đã quét đủ POI trong 5 km.
- Hỗ trợ nhiều predicate riêng: “gần đúng IUH trong 2 km VÀ có siêu thị trong 500 m”; mỗi predicate có target/group/radius và bằng chứng riêng.
- Không dùng một nhóm EDUCATION bất kỳ thay cho đúng trường của khách. SPORTS/gym chưa thu thập phải báo NOT_REQUESTED/UNKNOWN; không nói không có gym.
- Phân biệt nhóm rộng và loại POI khách yêu cầu: “bệnh viện” không được khớp chỉ vì có nhà thuốc trong HEALTHCARE; “siêu thị” không tự đồng nhất cửa hàng tiện lợi trong SHOPPING; đại học không phải mầm non trong EDUCATION. Khi cần loại cụ thể, lọc bằng category ID/quan hệ cha–con có bằng chứng từ nguồn, truyền được predicate này qua toàn bộ tool/Core/evidence; không suy từ tiền tố số hay tên POI. Thiếu metadata phân loại thì hỏi/báo chưa biết.
- Khoảng cách phải có đơn vị và loại STRAIGHT_LINE. Không suy thời gian đi lại hoặc tuyến đường thực.

### R08 — Compiler biểu diễn đúng tổ hợp điều kiện

- Hỗ trợ AND/OR có cấu trúc, giới hạn số điều kiện/độ sâu/payload. Validation và compilation do server kiểm soát, không nhận raw SQL.
- “Phòng trọ hoặc căn hộ, ở 3 người” phải giới hạn đúng hai category, với occupancy theo bảng tương ứng; không bỏ category thành mọi loại nhà và không AND hai bảng chi tiết loại nhà khác nhau.
- Các thuộc tính của cùng đồ/phí phải ràng buộc cùng đối tượng. Không để tên món A, quantity của món B và condition của món C tạo thành một match.
- “Ít nhất 2 giường còn tốt”: xác định số lượng các item BED có condition đáp ứng trong cùng listing; nếu có nhiều dòng BED thì tổng quantity của các dòng đủ điều kiện, không tính đồ khác hoặc dòng hỏng. Condition dùng code/ý nghĩa catalog, không so chuỗi alphabet. Ghi rõ mapping chất lượng được dùng và test các trường hợp đối chứng.
- Nhiều phí OTHER phải có định danh/điều kiện cùng row phù hợp. Không dùng một dòng OTHER tên A nhưng amount ở dòng B để đạt điều kiện.
- Không coi null là false/0/miễn phí. Negative predicate phải có semantics rõ: chưa khai báo khác xác nhận không có. Khi dữ liệu không chứng minh một hard negative constraint, không gọi đó là match chắc chắn.

### R09 — Giá, tổng chi phí, ngày và thời hạn thuê

- Đơn vị tiền thuê phải được hiểu trước khi so sánh: phòng/tháng, người/tháng hoặc loại unit khác. Không so raw amount giữa các unit khác nhau rồi xếp rẻ nhất.
- Chốt mapping ngôn ngữ và có test boundary: “dưới X” là `<X`; “tối đa/không quá X” là `<=X`; “ít nhất X” là `>=X`. Dùng decimal cho tiền.
- “Tầm/khoảng X” không được âm thầm dùng biên 20% như một hard constraint. Ghi nhận preference hoặc hỏi khoảng khách chấp nhận khi cần giới hạn chính xác.
- “Tiền phòng tối đa 5 triệu” khác “tổng chi phí mỗi tháng tối đa 5 triệu”. Tính các phí cố định với số người/xe thực đã biết; không tính trùng khoản includedInRent.
- Điện/nước theo mức dùng, phí chưa khai báo, VAT chưa rõ hoặc giá thương lượng: báo giả định/unknown. Muốn tổng chính xác thì hỏi lượng dùng/điều kiện thiếu; không bảo đảm all-in dưới ngân sách khi còn phí chưa biết.
- Phân biệt tiền thuê tháng, cọc, khoản trả ban đầu, chu kỳ thanh toán và thời hạn thuê tối thiểu. Dùng field có thật, không tạo công thức sai nghĩa nghiệp vụ.
- Ngày tương đối lấy thời điểm request và timezone cấu hình; không hardcode ngày audit. Lọc ngày có thể vào ở và min lease theo yêu cầu khách; hỏi lại ngày mơ hồ làm thay đổi kết quả.

### R10 — Tư vấn trong scope và chọn tối đa 3 phòng

- “Trong các phòng trên…” giới hạn trong scope ID đã hiển thị. Chỉ tìm tập mới khi khách yêu cầu hoặc đồng ý mở rộng; không trộn thứ tự tham chiếu phòng 1/2/3.
- Nếu khách đổi số người/giá/tiện ích đồng thời hỏi Nearby, Core phải lọc lại tất cả hard criteria trong scope trước khi rank.
- Không cắt ba phòng gần nhất trước rồi mới phát hiện chúng không đủ điều kiện. Phòng thứ tư phù hợp phải còn cơ hội được đề xuất.
- Tối đa ba gợi ý khi nhiệm vụ là tư vấn chọn phòng. Nếu còn hai phòng đủ điều kiện thì trả hai; không thêm phòng sai để đủ ba.
- Số lượng browse linh động theo yêu cầu và cap hệ thống, không ép mọi search còn ba hoặc năm. Khách muốn xem 10 tin thì trả tới 10 tin đủ điều kiện; phân biệt với top 3 tư vấn.
- Ranking tất định, giải thích được, ưu tiên nhu cầu khách đã nói. Không tự buộc khách thuộc một persona rồi suy các ưu tiên chưa được xác nhận. Nếu dùng nhiều mục tiêu, thể hiện trade-off theo bằng chứng; không bịa điểm chất lượng.

### R11 — Projection bằng chứng và payload

- Giữ truy vấn giới hạn trong Core, count và pagination rõ. Không gửi full 100 POI/tin hoặc toàn bộ description/nội thất của cả phường vào LLM.
- Trả bằng chứng có cấu trúc cho từng điều kiện được yêu cầu: giá trị yêu cầu, giá trị thực, trạng thái MATCH/NOT_MATCH/UNKNOWN, nguồn field, đơn vị và giới hạn dữ liệu. Evidence phải do server dựng từ dữ liệu truy vấn, không do model tự chứng nhận.
- Bằng chứng field đã yêu cầu không được biến mất vì preview 4 KB bỏ policies/furnishings. Thiết kế projection có chọn lọc và budget riêng rõ ràng; không giải quyết bằng tải full mọi tin.
- Đọc full detail cho tin cụ thể hoặc shortlist cần thiết; tránh N+1/fan-out không giới hạn. Chỉ thêm batch projection nếu source và số đo cho thấy cần, giữ cap nhất quán AI/Core.
- Kiểm tra ID/card thuộc tập kết quả hợp lệ hiện tại; tin bị ẩn/hết hạn không được đề xuất. Nếu dữ liệu thay đổi giữa search và detail, cập nhật match/loại tin đúng, không xem giá cũ là thật.
- Mô tả và tên POI là dữ liệu không tin cậy; câu “ignore filters” nằm trong mô tả không được trở thành lệnh của agent.

### R12 — Xem thêm, diagnostics và tương thích

- Các phần mở rộng catalog/OR/multi-Nearby/scopeIds/cursor/excludeIds/evidence phải chạy xuyên suốt planner → validation/state → ListingTools serializer → DTO/compiler Core → response → câu trả lời/cards. Viết contract test để bắt trường hợp schema model có argument mới nhưng serializer bỏ đi hoặc Core không thực thi.
- Hỗ trợ cursor hoặc excludeIds để “cho 10 tin khác” không lặp; thứ tự ổn định và ràng buộc với criteria/sort hiện tại. Đổi bộ lọc thì reset cursor, giữ ý nghĩa scope/ordinal của từng câu trả lời.
- Giữ cap cấu hình đồng bộ request/model/schema/Core/cards; không nhầm số người/phòng ngủ thành số kết quả.
- Lỗi field/enum/plan, lỗi Core, không có tin, target mơ hồ và thiếu coverage cần mã chẩn đoán khác nhau. Không lộ stack trace/secret cho khách.
- Log có requestId, plan outcome, tool, số filter/kết quả, reason code, payload size và latency đủ phục vụ debug. Không dump key, toàn bộ hội thoại, dữ liệu cá nhân hoặc dữ liệu listing dài không cần thiết.
- Không biến câu chào, hướng dẫn sản phẩm, hỏi hợp đồng/thanh toán thành truy vấn listing chỉ vì hội thoại trước có phòng. Giữ các nhánh RAG/hỗ trợ hiện có.

## 6. Thứ tự triển khai và điểm hoàn thành từng đợt

**Đợt A — Chặn trả sai và giữ nhu cầu:** R03/R04/R05, thống nhất R06, và lọc lại trước top 3 của R10. Có thể bổ sung tối thiểu contract Core cần cho scope. Viết regression fail trước/pass sau cho các lỗi audit. Không coi xong đợt này là xong toàn bộ nhiệm vụ.

**Đợt B — Hoàn thiện truy vấn và evidence:** R01/R02/R06/R07/R08/R09/R11/R12 và hoàn chỉnh R10. Cập nhật caller/tests đồng bộ. Chạy PostgreSQL với dữ liệu đối chứng, đo query/payload trước khi đề xuất index. Không thêm hạ tầng vector/search engine mới chỉ để né compiler còn thiếu field.

**Đợt C — Nghiệm thu hành vi:** chạy test offline, integration, corpus và hướng dẫn eval thật; kiểm tra lại quota không bị ảnh hưởng; cập nhật hướng dẫn. Mọi R01–R12 phải có bằng chứng hoặc được đánh dấu chưa hoàn thành, không che bằng lời “đã tối ưu”.

## 7. Dữ liệu kiểm thử và các case bắt buộc

### Fixture

- Dùng PostgreSQL tạm, schema tạo từ mapping Java; tuyệt đối không hướng create-drop/TRUNCATE vào CSDL dev. Test name/URL phải có guard nhận diện database thử nghiệm.
- Provider TomTom và planner/model được fake trong suite offline. Chặn đường ra provider để một test vô tình không thể tiêu quota thật.
- Fixture listing phải có đối chứng: cùng title nhưng khác elevator/occupancy/policy/fee; khác title nhưng đúng POI; các loại ROOM/HOUSE/APARTMENT; các field null.
- Fixture POI: đúng IUH, một trường khác gần hơn, nhiều cơ sở cùng tên, target ngoài bán kính, target trong kho nhưng không thuộc 100 link của tin, incomplete/limited/zero-group snapshot, địa chỉ listing đã đổi.
- Seed 300 tin chỉ hỗ trợ kiểm tra logic. Không bật Core/worker với CSDL dev rồi gây scan 300 tin trong quá trình chạy test. Các test integration chỉ nạp fixture Nearby giả lập.
- Seed hiện tại đã có `nearby_places_tomtom_snapshot.json` và dữ liệu nhúng trong SQL: 100 POI thật, 24.853 liên kết, 300 job terminal PARTIAL đúng fingerprint; 229 listing có 100 điểm, 41 có 1–99, 30 chưa có điểm. Cả ba trường hợp đều là replay không gọi provider, không phải 300 response TomTom mới. Đọc code/README và giữ nguyên tính chất này.
- Tách dữ liệu manual hiện có và golden fixture: có thể dùng snapshot thật này cho smoke test; test tự động phải có fixture đối chứng độc lập cho địa điểm thiếu, nhiều campus, các trạng thái coverage và đủ/không đủ điều kiện. Không suy rằng 30 tin thiếu POI là 30 khu vực không có tiện ích.
- Không sửa seed đại trà để làm test dễ pass. Seed có tương quan elevator với không có cửa sổ; tạo fixture riêng cho tổ hợp elevator + window để chứng minh compiler đúng.

### Ma trận nghiệm thu tối thiểu

| ID | Tình huống | Assert bắt buộc |
|---|---|---|
| T01 | Chỉ hỏi phòng có thang máy | CLARIFY khu vực; search chưa được gọi |
| T02 | Trả lời tiếp Hạnh Thông, HCM | Merge elevator + ward/city thật; không mất tiêu chí |
| T03 | Đủ địa điểm/giá/3 người/thang máy | SQL AND đúng; mọi ID đạt; không dùng keyword thay elevator |
| T04 | Ngưỡng “dưới 5 triệu” / “tối đa 5 triệu” | Phân biệt tin giá đúng 5 triệu |
| T05 | Bắt buộc WC riêng/elevator nhưng rỗng | Không tự retry bỏ hard filter; hỏi phần muốn đổi |
| T06 | Khách cho phép bỏ elevator | Chỉ bỏ elevator, giữ giá/số người/địa điểm |
| T07 | Hơn 8 message, chỉ tăng ngân sách | State giữ toàn bộ tiêu chí khác qua API/repository |
| T08 | Hai user/hai hội thoại; hội thoại cũ | Không lẫn state; legacy IDs vẫn hoạt động |
| T09 | Tìm gần đúng IUH, title không có IUH | Đi qua target tọa độ; trả tin đúng địa lý |
| T10 | Hai cơ sở trường, khách chọn một | CLARIFY rồi resolve ID thật; giữ giá và số người |
| T11 | Trường khác gần hơn IUH | Không dùng nearest EDUCATION thay IUH |
| T12 | Target trong kho, không có listing-target link | Vẫn khớp khi tọa độ trong radius, nguồn hợp lệ |
| T13 | Gần IUH 2 km và siêu thị 500 m | Hai predicates độc lập, thiếu một không đạt |
| T14 | Limited100 không có group, hỏi 5 km hoặc gần gym | UNKNOWN/coverage đúng; không provider call; không kết luận không có |
| T15 | 10 phòng, 3 phòng gần nhất không đủ 3 người | Lọc trước rank; phòng thứ tư đủ điều kiện có thể được chọn |
| T16 | “ROOM hoặc APARTMENT cho 3 người” | OR đúng category + occupancy, HOUSE không lọt vào |
| T17 | Policy báo trước/hoàn cọc số | Numeric operators đúng, null/invalid không thành 0 |
| T18 | Hai giường tốt và các món đối chứng | Hai dòng BED 1/GOOD đạt; GOOD + MINOR_DAMAGE không đạt; BED hỏng + SOFA tốt không ghép chéo; ba giường tốt vẫn đạt >=2 |
| T19 | Bốn mã furniture thiếu trong audit | Tồn tại/quantity/condition đúng theo catalog |
| T20 | Pet ALLOWED / APPROVAL_REQUIRED / thiếu | Không đánh đồng; chỉ ALLOWED đạt yêu cầu cho phép chắc chắn |
| T21 | Gym trong nhà / gần gym, balcony riêng/chung | Chọn đúng nguồn field, không suy theo keyword |
| T22 | Tổng 5 triệu, 3 người, 2 xe | Unit/phí included/unknown và giả định tính đúng |
| T23 | Ngày vào đầu tháng sau, thuê 3 tháng | Clock cố định, timezone đúng, available/min lease đúng |
| T24 | Phòng trọ/căn hộ/nhà có cùng unit khác nhau | Ngân sách và occupancy không so sai nghĩa |
| T25 | 1.000 tin cùng phường, xin 5/10/20 tin | Filter trước LIMIT; chỉ trả bounded evidence/detail reads |
| T26 | Top 3 tư vấn vs xem 10 tin | Không lẫn giới hạn, không thêm phòng sai để đủ số |
| T27 | “Cho 10 tin khác”, đổi criteria, “phòng 2” | Không lặp, reset cursor đúng, ordinal không trôi |
| T28 | Tin đổi giá/ẩn/hết hạn sau search | Không trả card/gợi ý sai dữ liệu mới |
| T29 | Enum/field/operator/model plan sai; Core lỗi | Error riêng, không NO_RESULTS giả, không bỏ điều kiện |
| T30 | Mô tả chứa chỉ dẫn phá filter; câu hỏi hỗ trợ | Không làm theo dữ liệu chèn lệnh; routing hỗ trợ giữ đúng |
| T31 | Target hợp lệ cách tin 3 km, không có link; khách hỏi 5 km | Tính/lọc đúng named target; không provider call; không hứa đủ coverage nhóm trong 5 km |
| T32 | Contract mới từ catalog tới cards | Không mất metadata/OR/multi-Nearby/scope/pagination/evidence qua các lớp; version/argument không hỗ trợ phải bị từ chối rõ |
| T33 | Hỏi “phòng số 2 có thang máy không?” rồi tìm tiếp | Chỉ đọc detail; không tự thêm filter elevator vào state |
| T34 | Snapshot PARTIAL có siêu thị thật trong 500 m | Có thể xác nhận EXISTS/so sánh khoảng cách có chứng cứ; không phủ nhận mọi dữ kiện vì chưa COMPLETE |
| T35 | Nhu cầu đủ rõ nhưng không nêu persona/ngân sách | Tìm hữu ích; không buộc trả lời bảng hỏi không liên quan |
| T36 | Khách cần bệnh viện/siêu thị/đại học, dữ liệu chỉ có nhà thuốc/cửa hàng tiện lợi/mầm non | Không dùng nhóm rộng để nhận nhầm loại cụ thể; metadata nguồn quyết định và giữ UNKNOWN khi thiếu |
| T37 | Khoảng giá hoặc tiêu chí bắt buộc cùng lượt mâu thuẫn | CLARIFY phần xung đột, giữ các tiêu chí khác; không tự bỏ, đảo ngưỡng hoặc gán lỗi hệ thống |

Mỗi test phải assert đầu ra phù hợp lớp của nó: plan/criteria, SQL params và kết quả thực, state được persist, evidence, cards, số call/payload. Không chỉ assert câu trả lời chứa từ “thang máy”.

### Corpus đánh giá ngôn ngữ tự nhiên

- Dùng bộ [AI_RENTER_MANUAL_ACCEPTANCE_QUESTIONS.md](D:/Workspace/homespace/hs-infra/documents/ask/AI_RENTER_MANUAL_ACCEPTANCE_QUESTIONS.md) làm baseline: 120 câu độc lập/theo scope và 10 hội thoại × 8 lượt khách = 200 lượt test. Không thay bằng câu hỏi kỹ thuật hoặc chỉ giao ngược lại cho người dùng tự soạn.
- Từ baseline tạo corpus đủ 200 lượt trong cấu trúc tests/eval hiện có, giữ mapping ID về câu gốc và đủ 10 hội thoại; bổ sung input/state/fixture/expected và adapter cần thiết. Có thể chạy bộ smoke nhỏ khi sửa và bộ đầy đủ khi nghiệm thu; không cần tạo 200 unit test giống nhau chỉ để đủ số. Lượt chưa chạy phải giữ NOT_RUN, không xóa câu khó khỏi corpus.
- Có không dấu, viết tắt IUH/HCM, tiền “tr/củ”, phủ định, sửa yêu cầu, preference, nhiều điều kiện, hỏi chưa đủ và câu đời thường.
- Mỗi case có ID, fixture, input/history/state, expected outcome/tool, required/forbidden constraints, expected clarification, eligible/ineligible IDs khi xác định được và limitations cần nêu.
- Lưu trong cấu trúc tests/eval hiện có sau khi tìm trong repo; không tự tạo một framework đánh giá lớn nếu chưa cần.
- Chấm riêng độ đúng tool/criteria, tỷ lệ vi phạm hard constraint, hỏi bổ sung, memory, target campus, coverage honesty, latency/payload và gọi provider. Với golden offline, không chấp nhận card vi phạm hard constraint; không có TomTom call.
- Với manual test trên seed, không cam kết câu nào cũng có tin. Câu trả lời rỗng chỉ bị coi sai khi dữ liệu fixture/current DB có tin chứng minh đạt mà hệ thống bỏ sót, hoặc AI tự bỏ điều kiện/bịa lý do. Đánh dấu thiếu fixture riêng; không gộp thiếu dữ liệu với lỗi model.
- Báo kết quả theo từng ID, model/version/cấu hình, thời điểm request, dataset fingerprint, trạng thái pass/fail/missing-fixture/not-run và các tool/filter thực chạy. Không nhét expected answer/golden filter vào user message của live model rồi tuyên bố model tự hiểu đúng.

## 8. Chạy kiểm thử và xác nhận giới hạn

- Chạy unit/contract liên quan AI, Core compiler và Nearby; thêm regression có ý nghĩa cho các yêu cầu mới. Cập nhật test cũ đang mong đợi tự nới hard filters, không giữ hành vi cũ chỉ để xanh test.
- Chạy PostgreSQL integration thật cho tổ hợp elevator + occupancy + giá + POI, child-row conditions, policy số, OR, pagination, unknown và dữ liệu dày.
- Dùng Maven profile `isolated-build` nếu vẫn có trong source để tách output khỏi IDE. Dùng Python `.venv` hiện có. Đọc điều kiện môi trường/property bắt buộc của từng test trước khi chạy; không đoán rồi trỏ về CSDL dev.
- Nếu sửa frontend thì đọc hướng dẫn Next.js theo repo, chạy typecheck/lint/test phù hợp. Không thay component Nearby/map khi không cần.
- Chạy các check cần thiết, sửa lỗi trong phạm vi rồi chạy lại phần liên quan. Ghi command và kết quả thật; test skipped không được tính là pass.
- Không chạy eval model trả phí hay dùng key thật như một phần offline/CI. Chuẩn bị runner opt-in và hướng dẫn chạy riêng. Nếu người dùng chưa yêu cầu chạy model thật thì ghi rõ phần đó chưa chạy; không giả lập rồi nói đã chứng minh khả năng hiểu ngôn ngữ thật.
- Không dùng chất lượng địa chỉ demo làm chứng minh độ chính xác địa lý ngoài thực tế.

## 9. Tài liệu phải bàn giao

1. Code triển khai có cấu trúc theo module hiện có; contract/catalog/state có version, enum và compatibility rõ.
2. Ma trận coverage field và ma trận R01–R12 → file sửa → test → kết quả → phần còn thiếu.
3. Corpus câu hỏi/hội thoại và bảng kết quả theo ID liên kết bộ manual đã cấp; kèm expected criteria/evidence và hướng dẫn người dùng chạy lại bằng giao diện chat. Không ghi đè file câu hỏi khác đang có thay đổi của người dùng, đặc biệt `documents/ask/AI_LISTING_TOOL_TEST_QUESTIONS.md`.
4. Hướng dẫn ngắn cách chạy offline tests, PostgreSQL test và model eval opt-in, các cấu hình nghiệp vụ mới nếu có. Dùng tên/path `hs-infra` hiện tại.
5. Hướng dẫn hành vi chat: khi nào hỏi, khi nào search, khi nào chỉ so sánh scope, khi nào báo thiếu Nearby, khi nào đề xuất tối đa ba tin.

Không xóa/ghi lại audit như thể lỗi chưa từng tồn tại. Nếu cần cập nhật tài liệu audit, ghi trạng thái đã khắc phục và bằng chứng ở phần riêng để người sau còn truy vết.

## 10. Quy tắc báo hoàn thành

Chỉ báo hoàn thành toàn bộ khi R01–R12 đã được triển khai trong phạm vi này và có kiểm chứng tương ứng. Không dùng câu “đã tối ưu AI” thay cho bằng chứng.

Tách rõ hai trạng thái: **hoàn thành triển khai và kiểm thử offline** có thể đạt khi người dùng chưa yêu cầu chạy model thật; **đã nghiệm thu khả năng hiểu ngôn ngữ của model thật** chỉ được báo sau eval opt-in có kết quả. Không giữ công việc ở trạng thái chờ chỉ vì chưa chạy eval trả phí, cũng không dùng test mock để tuyên bố NLU đã được nghiệm thu.

Báo cáo cuối cần nói rõ:

- Thay đổi hành vi cụ thể của người thuê và nguyên nhân đã sửa.
- Những file/module chính; link tài liệu coverage/test.
- Command đã chạy, pass/fail/skip và môi trường PostgreSQL tạm.
- Case mẫu elevator thiếu khu vực, hội thoại dài, IUH + giá + 3 người và re-rank sau đổi nhu cầu.
- Payload/call vẫn được giới hạn, không phát sinh TomTom trong chat/test offline, workflow fetch Nearby không bị thay đổi ngoài phạm vi.
- Eval model thật đã chạy hay chưa; các hạn chế còn lại, không được tuyên bố “hiểu mọi nhu cầu” khi dữ liệu chưa chứng minh.

Nếu thiếu runtime/cấu hình hoặc điều kiện ngoài phạm vi khiến chưa kiểm thử được, hoàn thành phần độc lập, ghi rõ kiểm tra chưa chạy và lý do. Không tuyên bố xanh, không bỏ qua yêu cầu khó, không đánh dấu hoàn thành các mục chưa làm.
