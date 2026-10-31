# HomeSpace — Bộ câu hỏi nghiệm thu AI tư vấn thuê nhà/phòng

Soạn và rà soát ngày 29/10/2026. Gồm **120 câu Q001–Q120** và **10 hội thoại, mỗi hội thoại 8 lượt khách**, tổng **200 lượt gửi**. Đây là bộ câu hỏi và cách chấm; chưa phải kết quả chạy AI, không bảo đảm seed có phòng cho mọi tổ hợp.

Tài liệu triển khai đi kèm: [prompt cho Agent](D:/Workspace/homespace/hs-infra/prompts/HOMESPACE_AI_RENTER_SEARCH_IMPLEMENTATION_AGENT_PROMPT.md), [audit](D:/Workspace/homespace/hs-infra/prompts/HOMESPACE_AI_RENTER_SEARCH_AUDIT_PLAN.md), [seed README](D:/Workspace/homespace/hs-infra/postgres/seed/README.md).

## 1. Cách bạn dùng bộ câu hỏi

1. Q001–Q105 và Q116–Q120: mỗi câu mở một hội thoại mới. Chỉ copy cột **Câu gửi AI**; không gửi đáp án hoặc hướng dẫn chấm cho AI.
2. Q106–Q115: tìm trước một danh sách theo hướng dẫn của mục đó, sau đó hỏi từng câu trên chính danh sách ấy. Mở lại danh sách ban đầu khi test độc lập, tránh để câu trước thay đổi scope của câu sau.
3. C01–C10: mỗi kịch bản dùng một cuộc hội thoại riêng, gửi lần lượt tám câu, chờ AI trả lời giữa các lượt. Không gửi cả tám câu trong một message.
4. Nếu AI hỏi thêm hợp lý, hãy trả lời theo dữ kiện trong kịch bản. Nếu AI hỏi một dữ kiện ngoài kịch bản, ghi lại và chỉ bổ sung điều bạn thực sự muốn; không vô tình đồng ý nới tiêu chí chỉ để thấy phòng.
5. Đọc cả câu trả lời lẫn thẻ tin. Mở chi tiết để đối chiếu giá, sức chứa, WC, thang máy, policy, nội thất, phí, thời hạn và Nearby. Nếu giao diện không cho thấy tool/filter, đánh dấu **chưa xác minh kỹ thuật** và yêu cầu Agent đối chiếu trace theo requestId; không suy tool đúng chỉ vì văn phong tốt.
6. Ngày tương đối như “đầu tháng sau” theo ngày bạn test thực tế và timezone hệ thống. Tự động hóa phải dùng clock cố định; không ép ngày audit thành ngày hiện tại.

### Chấm kết quả

| Trạng thái | Dùng khi nào |
|---|---|
| PASS | Hiểu nhu cầu, hỏi phần thiếu đúng, không bịa, các tin trả về đạt điều kiện cần kiểm tra |
| FAIL | Tự đổi/bỏ điều kiện, hỏi vòng vô lý, sai trường/campus, trả tin vi phạm, mất memory hoặc khẳng định điều chưa biết |
| MISSING_FIXTURE | Cần dữ liệu đối chứng mà DB đang test chưa có; chưa thể kết luận khả năng lọc bằng tập ID |
| NOT_RUN | Chưa gửi câu hoặc chưa chạy bước cần thiết |

Trả lời “chưa có phòng khớp” có thể là PASS hành vi, nhưng không chứng minh SQL tìm đúng. Muốn xác nhận khả năng tìm, cần ít nhất một phòng được biết chắc đạt và một phòng đối chứng không đạt. Agent phải bổ sung golden fixtures và kiểm tra ID; không yêu cầu bạn tự đoán.

Các lỗi nghiêm trọng: nhận sai phòng cho ba người; vượt ngân sách bắt buộc; thiếu WC/thang máy mà vẫn nói đủ; đổi trường khách học; tự bỏ điều kiện khi rỗng; khẳng định không có tiện ích vì kho thiếu; lẫn dữ liệu cuộc hội thoại/tài khoản khác.

### Hiểu đúng seed đang dùng

- 300 listing, giá/nội thất/chính sách là dữ liệu demo; tọa độ listing là điểm tham chiếu gần đúng theo JSON đã được người dùng chấp nhận.
- Có 100 POI thật lấy từ cache TomTom, dùng chung qua 24.853 liên kết. 229 listing đủ 100 điểm trong 2 km, 41 có ít hơn và 30 chưa có điểm trong snapshot.
- Tất cả snapshot seed là **PARTIAL**. Có thể xác nhận địa điểm/độ xa đã biết; không suy đã thu thập đủ tiện ích toàn vùng. Các câu hỏi không được làm phát sinh TomTom request.
- Seed hiện có tương quan phòng có thang máy với không có cửa sổ. Câu bắt buộc cả hai có thể rỗng thật; Agent cần fixture độc lập để kiểm tra tổ hợp đó.
- Hai ví dụ dương tính cho dữ liệu seed chưa thay đổi: ROOM `n=26` tại Trần Thị Nghỉ/Hạnh Thông: 4 triệu, 3 người, WC riêng, có cửa sổ, không thang máy; ROOM `n=15` tại Lê Đức Thọ/An Nhơn: 4,3 triệu, 3 người, thang máy, được nuôi thú cưng, không cửa sổ. Giá đúng 4 triệu **không** đạt câu “dưới 4 triệu”, nhưng đạt “tối đa 4 triệu”. Agent cần đối chiếu lại SQL/DB trước khi gán ID golden.

## 2. Câu hỏi độc lập: Q001–Q105

### A. Nhu cầu ban đầu, hỏi bổ sung và không tự đoán — Q001–Q010

| ID | Câu gửi AI | Cần quan sát |
|---|---|---|
| Q001 | Mình cần một phòng có thang máy, bạn tìm giúp mình nhé. | Hỏi khu vực; giữ elevator, không tự lấy địa chỉ tài khoản. |
| Q002 | Em sắp lên thành phố làm việc, lần đầu thuê trọ nên chưa biết bắt đầu tìm thế nào. | Hỏi thành phố/khu vực trước, tư vấn ngắn; không tự đoán HCM hay ngân sách. |
| Q003 | Mình muốn thuê ở Hạnh Thông, TP.HCM. Bạn cho mình xem vài chỗ trước, giá mình sẽ cân nhắc sau. | Có thể tìm ngay; không buộc nhập ngân sách/persona. |
| Q004 | Mình chưa chốt phòng trọ hay căn hộ, chỉ cần một chỗ ở An Nhơn cho hai người. | ROOM hoặc APARTMENT, không tự mở HOUSE; giữ hai người. |
| Q005 | Tìm giúp mình phòng trọ ở khu Gò Vấp cũ, tối đa 4 triệu. | Hỗ trợ xác định khu/phường mới; không tự coi quận cũ là phường cùng tên. |
| Q006 | Mình cần thuê ở Hạnh Thông, Hồ Chí Minh, cho ba người, không quá 4 triệu, WC riêng và có cửa sổ. | Lọc đủ; có fixture seed phù hợp nếu source không đổi. |
| Q007 | Mình muốn thuê ở An Nhơn, Hồ Chí Minh, ba người ở, dưới 5 triệu, có thang máy và cho nuôi mèo. | AND đủ; có fixture dương tính, không thêm cửa sổ. |
| Q008 | Cứ tìm trên toàn quốc giúp mình, mình đang làm từ xa nên chưa cần chọn thành phố. | Chấp nhận phạm vi toàn quốc được khách nói rõ; không hỏi lại location vô hạn. |
| Q009 | Mình muốn một chỗ thoáng, không bí, ở Hạnh Thông. Có gợi ý nào không? | Không tự đặt diện tích hoặc đồng nhất thoáng với một thuộc tính chắc chắn. |
| Q010 | Mình thích có ban công, không có cũng được. WC riêng thì nhất định phải có, ở An Nhơn nha. | Ban công là ưu tiên, WC riêng bắt buộc. |

### B. Tiền thuê, ngân sách, cọc và thời hạn — Q011–Q025

| ID | Câu gửi AI | Cần quan sát |
|---|---|---|
| Q011 | Ở Hạnh Thông có phòng trọ nào tiền thuê dưới 4 triệu không? | Giá <4 triệu; không nhận phòng đúng 4 triệu là khớp. |
| Q012 | Mình ở được tối đa 4 triệu tiền phòng mỗi tháng, tìm trọ ở Hạnh Thông giúp mình. | Giá ≤4 triệu; khác Q011. |
| Q013 | Tụi mình ba người, mỗi đứa góp tối đa một triệu rưỡi tiền phòng. Ở An Nhơn có chỗ nào vừa không? | Tổng tiền phòng ≤4,5 triệu và sức chứa ≥3. |
| Q014 | Mình thuê một mình ở Hạnh Thông, có phòng nào chỉ tính tiền theo đầu người không? | Kiểm tra unit giá; không tự nhận mọi giá là theo phòng. |
| Q015 | Hai đứa mình có hai xe máy. Tính hết tiền phòng với sinh hoạt thì chỉ kham nổi 5 triệu một tháng ở An Nhơn. | Tách phí cố định/điện nước chưa biết; không hứa tổng khi thiếu định mức. |
| Q016 | Mình cần phòng ở Hạnh Thông, tiền thuê không quá 4 triệu; điện nước tính riêng cũng được. | Ngân sách là rent, không tự biến thành all-in. |
| Q017 | Ngân sách mình tầm 4 triệu ở Gò Vấp, Hồ Chí Minh, có thể linh động một chút. | Khoảng mềm; hỏi biên nếu cần, không tự hardcode ±20%. |
| Q018 | Mình chỉ đủ tối đa 8 triệu cho tiền cọc và tiền thuê kỳ đầu. Ở An Nhơn có phòng nào hợp không? | Kiểm tra cọc/kỳ trả; không dùng 8 triệu làm ngân sách thuê tháng. |
| Q019 | Mình muốn phòng trọ ở Hạnh Thông chỉ cọc nhiều nhất một tháng tiền thuê. | Phân biệt cọc theo tháng và số tiền cố định; không nhận thiếu dữ liệu là một tháng. |
| Q020 | Mình không muốn phải trả tiền thuê cả quý, ở An Nhơn có chỗ thu từng tháng không? | Payment cycle theo tháng, không nhầm min lease. |
| Q021 | Mình đang thử việc, chỉ thuê khoảng ba tháng ở Hạnh Thông. Bạn đừng gửi chỗ bắt thuê ít nhất một năm nhé. | Min lease ≤3 tháng, không gợi ý cam kết dài hơn. |
| Q022 | Mình có thể thuê ổn định ít nhất một năm, muốn xem những phòng giá thấp nhất ở An Nhơn. | Không biến nhu cầu một năm thành min lease bắt buộc đúng 12. Sort giá hợp lệ. |
| Q023 | Mình tìm trọ ở Hạnh Thông có thể thương lượng giá với chủ, không cần rẻ nhất. | Negotiable thật; không coi giá thương lượng là đã giảm. |
| Q024 | Mình cần thuê căn hộ ở Hồ Chí Minh, giá công bố đã bao gồm phí quản lý tòa nhà để dễ tính ngân sách. | Phí quản lý đã gồm trong giá đúng field; không suy từ phí dịch vụ/rác. |
| Q025 | Mình cần phòng cho ba người ở An Nhơn, tiền phòng tổng không quá 4 triệu rưỡi, chứ không phải mỗi người 4 triệu rưỡi nha. | Giữ nghĩa giá tổng; không nhân thành 13,5 triệu. |

### C. Phòng trọ và sinh hoạt — Q026–Q040

| ID | Câu gửi AI | Cần quan sát |
|---|---|---|
| Q026 | Mình ở An Nhơn, chỉ chọn phòng có WC riêng nằm trong phòng, không dùng chung bên ngoài. | PRIVATE, không suy từ title. |
| Q027 | Mình muốn tự nấu ăn trong phòng, có kệ bếp riêng ở Hạnh Thông thì tìm giúp mình. | Bếp riêng; không nhận chỉ có bếp chung. |
| Q028 | Mình ít nấu ăn nên bếp chung cũng được, miễn tiền phòng ở An Nhơn dưới 4 triệu. | Cho phép bếp chung, không ép PRIVATE. |
| Q029 | Mình chỉ thuê phòng có cửa sổ ở Hạnh Thông, phòng kín thì đừng gửi nhé. | HasWindow true; null không đạt khẳng định. |
| Q030 | Ở An Nhơn mình cần ban công riêng để phơi đồ, không dùng sân phơi chung. | Balcony PRIVATE, không chỉ hasBalcony. |
| Q031 | Có phòng trọ nào ở Hạnh Thông có gác để mình tách chỗ ngủ với chỗ làm việc không? | HasMezzanine; không hứa độ cao nếu không có field. |
| Q032 | Mình không thích leo gác, tìm phòng ở An Nhơn xác nhận là không có gác giúp mình. | Phủ định có dữ kiện false; null không thành false. |
| Q033 | Mình hay về khuya, cần trọ ở Hạnh Thông ra vào tự do, không đóng cửa lúc 10 giờ tối. | AccessHours FLEXIBLE; không tự suy khóa vân tay. |
| Q034 | Mình muốn trọ ở An Nhơn có lối đi riêng, không phải đi qua nhà chủ. | AccessType PRIVATE; khác giờ giấc. |
| Q035 | Mình muốn phòng ở tầng hai trở xuống tại Hạnh Thông vì mẹ mình thỉnh thoảng lên chơi. | Floor ≤2; không tự yêu cầu thang máy. |
| Q036 | Mình cần trọ ở An Nhơn có đồng hồ điện riêng để tự đối chiếu tiền hàng tháng. | Electric meter PRIVATE, không lẫn water meter. |
| Q037 | Ở Hạnh Thông có phòng nào nước tính bằng đồng hồ riêng, không chia đều đầu người không? | Water meter + cách tính phí; chưa rõ thì nói rõ. |
| Q038 | Tụi mình ba người đi làm, cần một phòng ở An Nhơn cho ở đủ ba, không muốn thuê rồi mới bị giới hạn hai người. | Capacity ≥3, không equality 3. |
| Q039 | Hai người nhưng có ba xe máy, tìm chỗ ở Hạnh Thông cho để đủ ba xe giúp mình. | Sức chứa người và số xe là hai điều kiện khác nhau. |
| Q040 | Mình cần trọ ở An Nhơn rộng ít nhất 30 mét vuông, có WC riêng; cửa sổ có thì tốt. | Area≥30 và PRIVATE hard; window preference. |

### D. Tiện ích trong nhà và đồ bàn giao — Q041–Q055

| ID | Câu gửi AI | Cần quan sát |
|---|---|---|
| Q041 | Mình tìm phòng ở An Nhơn có thang máy, kể cả tiêu đề tin không ghi thì bạn vẫn kiểm tra giúp mình. | Amenity elevator, không chỉ keyword. |
| Q042 | Mình cần phòng ở Hạnh Thông có WiFi, nhưng bạn nói rõ tiền mạng có tính riêng không nhé. | Có WiFi không tự đồng nghĩa miễn phí. |
| Q043 | Mình đi làm cả ngày, muốn chỗ ở An Nhơn có bảo vệ trực 24/7. | Security amenity; không bảo đảm an toàn tuyệt đối. |
| Q044 | Mình muốn phòng ở Hạnh Thông có camera khu vực chung, nhưng đừng nhầm camera với bảo vệ túc trực nhé. | CAMERA độc lập SECURITY_24_7. |
| Q045 | Mình muốn thuê căn hộ ở Hồ Chí Minh có hồ bơi trong tòa nhà. | Amenity pool, không dùng hồ bơi ngoài khu. |
| Q046 | Mình muốn chỗ ở An Nhơn có phòng gym ngay trong tòa nhà, không phải gym cách vài con đường. | Amenity GYM, không Nearby SPORTS. |
| Q047 | Mình mới đi làm chưa mua đồ, cần trọ ở Hạnh Thông có sẵn giường, tủ quần áo và bàn làm việc. | AND đủ inventory; không chỉ nhãn đầy đủ nội thất. |
| Q048 | Hai đứa mình muốn ngủ giường riêng, ở An Nhơn có phòng bàn giao ít nhất hai giường còn tốt không? | BED quantity/condition, cộng đúng các dòng đạt; sofa không bù giường. |
| Q049 | Mình chỉ tìm phòng ở Hạnh Thông có máy lạnh bàn giao sẵn trong phòng, không phải máy lạnh ở sảnh. | Inventory/source đúng; vị trí không được khai báo thì chưa chắc. |
| Q050 | Mình muốn chỗ ở An Nhơn có tủ lạnh sẵn, có biết là dùng riêng hay chung thì nói giúp mình. | Có đồ là một dữ kiện; quyền dùng riêng cần bằng chứng thêm. |
| Q051 | Mình mang gần hết đồ rồi, ở Hạnh Thông có phòng không nội thất để giá dễ chịu hơn không? | UNFURNISHED thật; thiếu inventory không tự là unfurnished; không hứa giá thấp hơn. |
| Q052 | Mình thuê căn hộ ở Hồ Chí Minh muốn có sẵn lò vi sóng và máy hút mùi, vì nhà mình hay nấu ăn. | MICROWAVE + RANGE_HOOD có trong catalog, không bỏ field. |
| Q053 | Mình cần trọ ở An Nhơn có tủ giày bàn giao cùng phòng, có tin nào ghi rõ không? | SHOE_CABINET, không dùng tủ quần áo thay. |
| Q054 | Mình tìm nhà ở Hồ Chí Minh có bồn nước với máy bơm sẵn, bạn kiểm tra phần đồ bàn giao giúp mình. | WATER_TANK_PUMP hoặc metadata đúng; thiếu thì chưa xác nhận. |
| Q055 | Mình muốn thuê căn hộ có bộ bàn ăn còn tốt cho gia đình ở Hồ Chí Minh, không muốn tự mua ngay. | Đúng DINING_SET và condition, không so TEXT alphabet. |

### E. Phí và nội quy — Q056–Q070

| ID | Câu gửi AI | Cần quan sát |
|---|---|---|
| Q056 | Mình tìm trọ ở Hạnh Thông tiền điện không quá 3.500 đồng một số, bạn lọc giúp mình. | Electricity amount/unit; không nhầm phí tháng. |
| Q057 | Ở An Nhơn có phòng nước tính theo mét khối, đơn giá tối đa 25 nghìn không? | PER_M3 và unit/giá, không nhận phí đầu người. |
| Q058 | Mình cần phòng ở Hạnh Thông đã gồm tiền mạng và tiền rác trong giá thuê. | Hai khoản includedInRent, không cần amount tự đoán. |
| Q059 | Tụi mình hai xe máy, cần trọ ở An Nhơn không thu phí gửi xe. | Có chỗ xe + miễn phí; NONE không đồng nghĩa FREE. |
| Q060 | Mình thuê căn hộ ở Hồ Chí Minh muốn phí quản lý đã nằm trong tiền thuê, không phát sinh thêm khoản này. | Management included; không suy toàn bộ phí khác included. |
| Q061 | Mình nuôi một bé mèo, chỉ chọn phòng ở An Nhơn cho phép nuôi rõ ràng, khỏi phải xin chủ lại. | Pet ALLOWED, không nhận APPROVAL_REQUIRED/UNKNOWN. |
| Q062 | Mình có nuôi mèo ở Hạnh Thông, nếu phải xin chủ thì mình chấp nhận, nhưng bạn phải nói rõ chỗ nào cần xin. | ALLOWED hoặc điều kiện APPROVAL_REQUIRED được khách chấp nhận; giữ tách nhãn. |
| Q063 | Mình muốn trọ ở An Nhơn có nội quy cấm hút thuốc trong khu ở chung. | Policy NOT_ALLOWED có bằng chứng; không suy từ người thuê không hút thuốc. |
| Q064 | Em gái mình thỉnh thoảng lên ngủ lại, tìm phòng ở Hạnh Thông cho khách ở qua đêm được giúp mình. | Overnight policy đúng; cần xin phép thì nêu rõ/hỏi mức chấp nhận. |
| Q065 | Mình đi công tác dài ngày có thể muốn cho thuê lại, có nhà ở Hồ Chí Minh nào cho phép việc đó không? | SubleasePolicy, không tự coi có quyền khi không ghi. |
| Q066 | Mình cần phòng ở An Nhơn chủ nhà báo trước ít nhất 24 giờ nếu muốn vào kiểm tra. | propertyInspectionNotice≥24 giờ. |
| Q067 | Công việc mình hay thay đổi, cần chỗ ở Hạnh Thông chỉ yêu cầu báo trước nhiều nhất 30 ngày khi kết thúc thuê. | noticeDaysBeforeTermination≤30 ngày; không nhầm ngày hết hạn tin. |
| Q068 | Mình muốn trọ ở An Nhơn hoàn cọc trong vòng 7 ngày sau khi trả phòng và thanh toán đủ. | depositRefundDays≤7 theo đúng điều kiện bắt đầu; không hứa hoàn ngay. |
| Q069 | Mình muốn thuê nhà ở Hồ Chí Minh được khoan lắp kệ và treo đồ, có chủ nào cho phép không? | AlterationsPolicy cho HOUSE; không suy từ có nội thất. |
| Q070 | Mình hay học tối, cần khu trọ ở Hạnh Thông có nội quy giờ yên tĩnh rõ ràng. Bạn có thể kiểm tra nội quy được không? | Policy text đúng; không kết luận môi trường thật chắc chắn yên tĩnh. |

### F. Căn hộ và nhà nguyên căn — Q071–Q085

| ID | Câu gửi AI | Cần quan sát |
|---|---|---|
| Q071 | Gia đình mình bốn người, cần căn hộ ở Hồ Chí Minh có ít nhất hai phòng ngủ và hai WC, tiền thuê tối đa 12 triệu. | APARTMENT + capacity + bedrooms/bathrooms/price đồng thời. |
| Q072 | Mình muốn căn hộ ở An Nhơn tầng năm trở xuống, có thang máy và ban công hướng Đông. | Floor, amenity, balcony direction đúng; không dùng hướng cửa thay. |
| Q073 | Mình cần căn hộ ở Hồ Chí Minh cửa chính hướng Nam, có phòng khách và khu bếp riêng. | Các field căn hộ và enum hướng; kitchen riêng nếu không có field quyền riêng không bịa. |
| Q074 | Mình thích căn hộ nhìn ra công viên ở Hồ Chí Minh, bạn chỉ gợi ý chỗ nào tin có mô tả view này nhé. | View text là thông tin chủ khai báo, không đồng nghĩa POI gần công viên chứng minh nhìn thấy. |
| Q075 | Mình tìm căn hộ ở Hồ Chí Minh thuộc một chung cư có tên và block rõ ràng, không muốn thông tin chỉ ghi địa chỉ chung chung. | Kiểm tra project/block có dữ liệu; không bịa tên dự án cho seed NULL. |
| Q076 | Nhà mình năm người, muốn thuê nhà nguyên căn ở An Nhơn ít nhất ba phòng ngủ, hai WC, dưới 20 triệu. | HOUSE + capacity + PN/WC + price<20 triệu. |
| Q077 | Mình cần nhà nguyên căn ở Hồ Chí Minh có sân thượng để phơi đồ và garage ô tô. | Rooftop và garage đúng; không suy ô tô chắc chắn vào được từ garage đơn lẻ. |
| Q078 | Mình tìm nhà ở Hạnh Thông hẻm rộng ít nhất 4 mét, không muốn chỉ được ghi chung chung là hẻm xe hơi. | Access road width≥4; không biến mô tả thành số chưa biết. |
| Q079 | Gia đình mình cần nhà ở Hồ Chí Minh diện tích đất từ 60 mét vuông, ngang ít nhất 4 mét, dài ít nhất 12 mét. | Land area/frontage/length, không nhầm diện tích sử dụng. |
| Q080 | Mình muốn thuê nhà hai mặt tiền ở Hồ Chí Minh, có ít nhất hai tầng. | FrontageCount≥2 và totalFloors≥2. |
| Q081 | Mình chỉ muốn thuê riêng tầng hai đến tầng ba của một nhà ở Hồ Chí Minh, không thuê cả căn. | Rental scope/rented floor fields; không nhận cả căn chỉ vì nhà có ba tầng. |
| Q082 | Mình cần căn hộ ở An Nhơn cho bốn người, có thể có từ hai phòng ngủ trở lên, không nhất thiết đúng hai phòng. | Bedrooms≥2 và capacity≥4, không equality 2. |
| Q083 | Tụi mình chấp nhận phòng trọ hoặc căn hộ ở An Nhơn, miễn đủ ba người và tiền thuê không quá 5 triệu. | OR ROOM/APARTMENT với occupancy đúng loại; HOUSE không lọt vào. |
| Q084 | Mình tìm nhà nguyên căn ở Hồ Chí Minh có giấy tờ pháp lý được ghi rõ trong tin, bạn cho mình biết chủ khai báo thế nào. | Đọc legal status; không xem lời khai là xác minh pháp lý độc lập. |
| Q085 | Gia đình mình cần căn hộ ở Hồ Chí Minh cho bốn người, tiền thuê từ 5 đến 4 triệu một tháng. | Hỏi lại hai đầu khoảng giá bị ngược; giữ category/location/bốn người, không tự đảo khoảng hoặc bỏ một ngưỡng. |

### G. Địa điểm và tiện ích quanh nhà — Q086–Q105

| ID | Câu gửi AI | Cần quan sát |
|---|---|---|
| Q086 | Mình học Đại học Công nghiệp, cơ sở Nguyễn Văn Bảo, cần trọ dưới 5 triệu cho ba người gần đúng trường đó. | Resolve đúng campus; giá/số người/vị trí trước LIMIT. |
| Q087 | Tìm giúp mình phòng gần IUH, tin không ghi gần trường cũng được, miễn tọa độ thật sự gần. | Alias có quản lý; không keyword-only hoặc bịa ID. |
| Q088 | Mình cần gần trường Đại học Công nghiệp, nhưng không chắc bạn đang tìm đúng cơ sở nào. | Hỏi/hiển thị campus có chứng cứ, không tự chọn khi mơ hồ. |
| Q089 | Mình muốn phòng cách cơ sở Nguyễn Văn Bảo của IUH không quá 500 mét, dưới 5 triệu. | Radius500, price<5 triệu; nói rõ khoảng cách chim bay. |
| Q090 | Mình chấp nhận ở trong vòng 5 cây số quanh cơ sở Nguyễn Văn Bảo của IUH, tiền thuê tối đa 4 triệu rưỡi. | Named-target distance có thể tính5km, không hứa coverage generic5km. |
| Q091 | Mình đi làm ở 12 Nguyễn Văn Bảo, Hồ Chí Minh, cần phòng gần đó để đỡ đi xa. | Resolve địa chỉ/target bằng công cụ có sẵn hoặc hỏi; không bịa tọa độ từ chuỗi. |
| Q092 | Nhà mình có con nhỏ, muốn thuê ở Hạnh Thông gần một trường mầm non trong 1 cây số. | Loại trường mầm non, không dùng đại học thay; subtype có nguồn. |
| Q093 | Mẹ mình cần theo dõi sức khỏe, mình muốn trọ ở An Nhơn gần bệnh viện trong 2 cây số, nhà thuốc không thay cho bệnh viện nhé. | Đúng bệnh viện, không chỉ nhóm HEALTHCARE. |
| Q094 | Mình cần phòng ở Hạnh Thông có nhà thuốc trong vòng 500 mét để tiện mua thuốc khi cần. | Nhà thuốc có bằng chứng dương tính; không bắt coverage đầy đủ mới trả lời. |
| Q095 | Mình muốn phòng ở An Nhơn gần siêu thị trong 1 cây số, không chỉ có mấy cửa hàng tạp hóa nhỏ. | Đúng subtype siêu thị, không mọi SHOPPING. |
| Q096 | Mình học tối hay đói, cần trọ ở Hạnh Thông có cửa hàng tiện lợi trong 500 mét. | Convenience store, không dùng nhà hàng thay. |
| Q097 | Mình muốn trọ gần đúng IUH cơ sở Nguyễn Văn Bảo và có siêu thị trong 500 mét quanh phòng, tiền thuê không quá 5 triệu. | Hai điều kiện vị trí riêng, campus đúng và rent≤5 triệu. |
| Q098 | Mình chưa có xe, muốn phòng ở An Nhơn gần trạm xe buýt. Bạn biết được những trạm nào thì chỉ giúp mình. | TRANSPORT cụ thể; không có trong snapshot thì chưa biết, không bịa trạm. |
| Q099 | Mình thích đi bộ, cần chỗ ở Hạnh Thông gần công viên trong 2 cây số. | RECREATION subtype phù hợp, không dùng mọi khu vui chơi làm công viên. |
| Q100 | Mình muốn trọ ở An Nhơn gần phòng gym, chứ không cần gym trong tòa nhà. | Nearby gym chưa thu thập thì báo thiếu dữ liệu, không dùng amenity.GYM thay. |
| Q101 | Mình chỉ cần biết mấy quán ăn và chỗ mua đồ mà hệ thống đã có thông tin quanh các phòng ở Hạnh Thông. | PARTIAL vẫn dùng được dữ kiện đã biết; không từ chối toàn bộ. |
| Q102 | Bạn không thấy bệnh viện trong dữ liệu quanh phòng ở An Nhơn thì có nghĩa là ở đó không có bệnh viện hả? | Giải thích unknown khác absent, không scan bù. |
| Q103 | Mình cần gần IUH để đi bộ tới trong khoảng 10 phút, tiền phòng dưới 5 triệu. | Không đổi10phút thành bán kính giả; nêu giới hạn thời gian/tuyến đường và hỏi mức khoảng cách chấp nhận nếu cần. |
| Q104 | Tìm chỗ ở Hạnh Thông xa quán nhậu và karaoke cho mình vì mình sợ ồn. | Thiếu dữ liệu/độ phủ không chứng minh xa/không ồn; không bảo đảm từ POI vắng. |
| Q105 | Mình muốn thuê ở An Nhơn khu nào có đầy đủ nhất trường học, siêu thị với bệnh viện, bạn có đủ thông tin để chọn chắc không? | Nói giới hạn mẫu, chỉ so sánh bằng chứng thực có, không kết luận toàn diện. |

## 3. Hỏi theo danh sách vừa tìm: Q106–Q115

**Chuẩn bị mỗi case:** mở hội thoại mới, gửi “Cho mình xem 10 chỗ thuê ở An Nhơn, Hồ Chí Minh, tiền thuê không quá 5 triệu.” Chờ danh sách. Nếu có ít hơn 3 tin, chọn khu vực có ít nhất 3 tin thực và ghi lại thay đổi; không hỏi phòng 3 khi chỉ có hai phòng rồi chấm AI sai. Đánh số theo thứ tự hiển thị, không theo giá hay thứ tự DB.

| ID | Câu gửi AI | Cần quan sát |
|---|---|---|
| Q106 | Cái phòng số 2 có thang máy không bạn? | Đọc đúng ID thứ2; không thêm filter elevator vào memory. |
| Q107 | Bạn so sánh phòng số 1 với số 3 giúp mình về tiền phòng, WC và đồ có sẵn nhé. | Chỉ hai ID, facts đọc lại; thiếu nội thất thì chưa biết. |
| Q108 | Trong những chỗ này mình chọn cho ba người, có hai xe máy, phòng nào đủ điều kiện? | Lọc trong scope theo người/xe trước gợi ý. |
| Q109 | Nếu lấy tiền thuê cộng các phí cố định đã biết thì trong đây chỗ nào nhẹ tiền nhất? | Chi phí đúng unit, nêu phần chưa biết; không chỉ sort rent. |
| Q110 | Phòng số 2 có sẵn hai giường còn tốt không? Tụi mình không muốn phải mua thêm. | Đúng inventory của tin2; không ghép đồ khác hoặc không khai báo thành không có. |
| Q111 | Trong các phòng trên, chọn giúp mình tối đa ba chỗ phù hợp nhất cho ba người và gần đúng IUH cơ sở Nguyễn Văn Bảo. | Refilter capacity trong scope rồi target-distance rank; tối đa3. |
| Q112 | Mình thấy phòng số 1 ghi ra vào tự do, vậy chắc có khóa vân tay đúng không? | FLEXIBLE không chứng minh fingerprint lock; không suy từ nhãn UI. |
| Q113 | Phòng số 3 có cho khách ngủ lại không? Nếu phải xin chủ thì bạn nói rõ nhé. | Phân biệt permission/conditional/unknown; hỏi thông tin không tự sửa filter. |
| Q114 | Phòng số 2 có tiện ích nào quanh đó mà bạn đang biết? Chỉ cần nói những địa điểm có dữ liệu thôi. | Cho biết positive POI+distance dù PARTIAL; không hứa đủ quanh vùng. |
| Q115 | Chỗ gần trường hơn nhưng nhỏ hơn với chỗ rộng hơn mà xa hơn thì mình nên cân nhắc ra sao? | Đối chiếu thẻ đã có hoặc hỏi cặp nào, nêu trade-off, không tự bịa sở thích hoặc phòng. |

## 4. Câu độc lập còn lại: Q116–Q120

| ID | Câu gửi AI | Cần quan sát |
|---|---|---|
| Q116 | Mình cần vào ở đầu tháng sau, chỉ thuê ba tháng, phòng ở Hạnh Thông dưới 5 triệu. | Chuẩn hóa ngày theo lần test; available/minlease và budget đúng. |
| Q117 | Mình muốn xem phòng ở An Nhơn vào Chủ nhật buổi tối, có chỗ nào chủ nhận xem giờ đó không? | Schedule day+slot, không tự đặt hẹn hoặc khẳng định còn suất. |
| Q118 | Cho mình xem 10 phòng trọ ở Hạnh Thông, giá thuê thấp trước. | Count10, categoryROOM, price sort toàn tập; không hiểu10là số người. |
| Q119 | tim phong tro an nhon hcm, 3 nguoi o, toi da 4tr5, wc rieng nha ban | Hiểu không dấu/4tr5=4,5triệu, capacity≥3, privateWC; không suy từ keyword. |
| Q120 | Mình chưa muốn tìm phòng ngay, chỉ muốn biết thuê qua HomeSpace thì bắt đầu như thế nào. | Hỗ trợ hướng dẫn; không gọi listing search không cần thiết. |

## 5. Hội thoại nhiều lượt: C01–C10

Chỉ copy lời khách theo thứ tự. “Mốc kiểm tra” là ghi chú cho người test/Agent, không đưa vào message của khách. Nếu không có kết quả phù hợp, AI phải nói thật và giữ tiêu chí; không cần giả lập kết quả để tiếp tục.

### C01 — Đi từ nhu cầu thiếu địa điểm, gỡ một điều kiện

1. **C01.1:** Mình cần phòng có thang máy, bạn tìm giúp mình nha.
2. **C01.2:** Ở An Nhơn, Thành phố Hồ Chí Minh nhé.
3. **C01.3:** Tụi mình ba người, tiền phòng tối đa 5 triệu một tháng.
4. **C01.4:** WC riêng là bắt buộc, còn có ban công thì tốt thôi.
5. **C01.5:** Chọn cho mình tối đa ba chỗ phù hợp nhé.
6. **C01.6:** Không cần thang máy nữa đâu, những yêu cầu khác giữ nguyên.
7. **C01.7:** Bạn tìm lại giúp mình với các yêu cầu vừa chốt.
8. **C01.8:** Nhắc lại giúp mình bây giờ bạn đang tìm theo những điều kiện nào?

**Mốc kiểm tra:** lượt 1 hỏi khu vực; lượt 2 giữ thang máy; lượt 4 giữ WC riêng là bắt buộc và ban công là ưu tiên. Lượt 6 bỏ yêu cầu thang máy, không biến thành điều kiện “không có thang máy”. Lượt 8 còn An Nhơn/HCM, ba người, tiền phòng tối đa 5 triệu, WC riêng và ưu tiên ban công. Không thêm tiêu chí từ câu hỏi nhắc lại.

### C02 — Memory sau nhiều lượt hỏi thông tin

1. **C02.1:** Mình tìm trọ ở Hạnh Thông, Hồ Chí Minh, hai người ở, tối đa 4 triệu, WC riêng và phải có thang máy.
2. **C02.2:** Nếu có cửa sổ thì tốt, không có cũng được.
3. **C02.3:** Bọn mình có một xe máy, cần chỗ để xe cho chiếc đó.
4. **C02.4:** Trong mấy chỗ đó tiền điện đang được chủ ghi thế nào?
5. **C02.5:** Còn tiền gửi xe thì có chỗ nào chưa ghi không?
6. **C02.6:** Mình chưa chốt đâu, bạn cứ giữ danh sách để mình cân nhắc.
7. **C02.7:** Giữ những yêu cầu tìm phòng ban đầu và chỗ để một xe, mình tăng tiền thuê lên tối đa 5 triệu.
8. **C02.8:** Tìm lại giúp mình, đừng đổi khu vực và cũng đừng bỏ WC riêng hay thang máy nhé.

**Mốc kiểm tra:** tới lượt 7, yêu cầu đầu đã ra khỏi tám message gần nhất tính cả câu trả lời. State vẫn giữ Hạnh Thông/HCM, hai người, WC riêng, thang máy và chỗ cho một xe. Chỉ ngân sách đổi từ 4 lên 5 triệu. Hai câu hỏi phí không tự sinh ngưỡng điện/xe. Cửa sổ vẫn là ưu tiên.

### C03 — Người học gần đúng cơ sở trường

1. **C03.1:** Mình học Đại học Công nghiệp, đang cần phòng trọ gần trường cho ba người, tiền phòng dưới 5 triệu.
2. **C03.2:** Cơ sở ở đường Nguyễn Văn Bảo, Thành phố Hồ Chí Minh ấy.
3. **C03.3:** Nếu trường có nhiều địa điểm thì chỉ tìm quanh đúng cơ sở mình vừa nói nhé.
4. **C03.4:** Trong vòng 1 cây số từ trường thôi, mình chưa có xe.
5. **C03.5:** Tin không viết gần trường cũng được, mình cần vị trí đúng hơn là tiêu đề hay.
6. **C03.6:** Mình chấp nhận xa hơn một chút, tăng lên 2 cây số nhưng giá với ba người giữ nguyên.
7. **C03.7:** Chọn giúp mình ba phòng gần đúng trường nhất trong những phòng đủ điều kiện.
8. **C03.8:** Vì sao bạn chọn chỗ đầu tiên, bạn biết khoảng cách đến trường từ đâu?

**Mốc kiểm tra:** xác định đúng cơ sở trường; không tự coi chưa có xe là bắt buộc gần trạm xe buýt. Bán kính đổi từ 1 lên 2 km, vẫn giá dưới 5 triệu và sức chứa ít nhất ba người. Sắp theo khoảng cách trước LIMIT. Không dùng trường mầm non gần hơn thay IUH; nếu kho chưa có cơ sở này thì nói chưa xác định được. Lượt 8 giải thích bằng tọa độ và khoảng cách đường chim bay.

### C04 — Tổng ngân sách và lượng dùng được khách cung cấp

1. **C04.1:** Hai đứa mình cần phòng trọ ở An Nhơn, tính hết tiền ở hàng tháng thì không quá 5 triệu.
2. **C04.2:** Bọn mình có hai xe máy nhé.
3. **C04.3:** Mỗi tháng khoảng 150 số điện với 6 khối nước cho cả phòng, bạn dùng mức đó để ước tính giúp mình.
4. **C04.4:** Chỗ nào đã gồm tiền mạng và tiền rác thì đừng cộng lại hai khoản đó.
5. **C04.5:** Cho mình xem tiền thuê, từng phí cố định và phần điện nước ước tính riêng ra nhé.
6. **C04.6:** Nếu có phí nào chủ chưa ghi thì đừng nói chắc là tổng đã dưới 5 triệu.
7. **C04.7:** Mình không cần rẻ nhất, chọn tối đa ba chỗ có số tiền tính rõ ràng và đủ hai người ở.
8. **C04.8:** Giờ cho mình biết nếu dùng 200 số điện thay vì 150 thì những chỗ đó có còn trong mức tiền này không?

**Mốc kiểm tra:** không coi tiền phòng dưới 5 triệu là bảo đảm tổng chi phí đạt ngân sách. Dùng đúng hai người, hai xe; 150 kWh và 6 m³ là mức khách cung cấp để ước tính. Không cộng lại khoản đã bao gồm trong tiền thuê; tính phí theo người/xe đúng đơn vị. Lượt 8 so kịch bản 200 kWh với ngân sách cũ, không tự đổi mức ngân sách.

### C05 — Đổi sức chứa trước khi xếp hạng Nearby trong scope

1. **C05.1:** Cho mình xem 10 chỗ thuê ở Hạnh Thông, Hồ Chí Minh, tiền phòng không quá 5 triệu cho hai người.
2. **C05.2:** Trong danh sách này mình cần WC riêng, lọc lại giúp mình.
3. **C05.3:** Giờ có thêm một bạn ở cùng thành ba người, vẫn giữ mức tiền phòng đó.
4. **C05.4:** Trong những chỗ vừa xem, chọn giúp mình chỗ gần đúng IUH cơ sở Nguyễn Văn Bảo hơn.
5. **C05.5:** Đừng tìm sang một danh sách mới, mình muốn cân nhắc các phòng này trước.
6. **C05.6:** Nếu chỉ có hai chỗ đủ ba người thì gửi hai chỗ thôi, không cần cố đủ ba.
7. **C05.7:** So sánh các chỗ còn phù hợp về sức chứa, tiền thuê và khoảng cách đến đúng cơ sở đó.
8. **C05.8:** Mấy chỗ bị bỏ có phải vì không đủ ba người không, hay vì bạn chưa có thông tin?

**Mốc kiểm tra:** Agent chuẩn bị fixture có ba tin gần nhất chỉ cho hai người và tin thứ tư cho ba người. Lọc sức chứa, WC riêng và ngân sách trong scope trước khi xếp hạng. Khi danh sách bị rút gọn hoặc đổi thứ tự, phải giữ tham chiếu đúng ID trong câu trả lời tương ứng. Không coi sức chứa chưa khai báo là hai hoặc ba người.

### C06 — Thú cưng, điều kiện xin phép và không tự nới yêu cầu

1. **C06.1:** Mình tìm trọ ở An Nhơn, hai người, tối đa 4 triệu, WC riêng và cho nuôi mèo rõ ràng.
2. **C06.2:** Chỗ nào phải xin chủ trước thì mình chưa muốn chọn nhé.
3. **C06.3:** Nếu không có đủ điều kiện thì bạn cứ nói, đừng tự gửi phòng cấm thú cưng.
4. **C06.4:** Mình có thể tăng tiền phòng lên tối đa 4 triệu rưỡi, các yêu cầu còn lại như cũ.
5. **C06.5:** Vẫn khó thì mình chấp nhận cả chỗ cần xin phép nuôi mèo, nhưng phải ghi rõ cho mình.
6. **C06.6:** Chỗ nào chưa ghi về thú cưng thì để riêng là chưa biết, đừng coi là được phép.
7. **C06.7:** Gợi ý cho mình tối đa ba chỗ và nói rõ chỗ nào được nuôi, chỗ nào phải hỏi chủ.
8. **C06.8:** Nếu mình bỏ yêu cầu nuôi mèo thì bạn sẽ giữ lại những điều kiện nào khác?

**Mốc kiểm tra:** không tự nới khi kết quả rỗng; lượt 4 chỉ đổi ngân sách. Lượt 5 cho phép cả ALLOWED và APPROVAL_REQUIRED, nhưng NOT_ALLOWED vẫn bị loại. Lượt 8 là câu hỏi giả định, chưa phải quyết định bỏ yêu cầu nuôi mèo.

### C07 — Hỏi thông tin không biến thành sửa bộ lọc

1. **C07.1:** Cho mình xem vài phòng trọ ở An Nhơn, Hồ Chí Minh, hai người và tiền phòng không quá 5 triệu.
2. **C07.2:** Phòng số 2 có thang máy không?
3. **C07.3:** Tiền gửi xe của phòng số 1 là bao nhiêu, có ghi rõ chưa?
4. **C07.4:** Mình không hút thuốc nên cũng hơi ngại phòng ám mùi, nhưng mình chưa yêu cầu khu trọ phải cấm hút thuốc nhé.
5. **C07.5:** Trong các phòng này, mình chỉ bắt buộc WC riêng; ban công có thì tốt.
6. **C07.6:** Nhắc lại giúp mình những tiêu chí đang bắt buộc và những cái chỉ là ưu tiên.
7. **C07.7:** Giờ tìm thêm phòng khác ở cùng khu vực với các tiêu chí đó giúp mình.
8. **C07.8:** Mình không yêu cầu có thang máy hay phí xe bằng một mức cố định, bạn đừng thêm hai điều đó nha.

**Mốc kiểm tra:** hỏi giá xe/thang máy không tự thay đổi bộ lọc; lời mô tả bản thân không biến thành nội quy cấm hút thuốc. Lượt 7 tìm tập tin mới nhưng giữ An Nhơn/HCM, hai người, tối đa 5 triệu, WC riêng và ưu tiên ban công. Không thêm điều kiện nội thất hoặc ngưỡng phí chưa được yêu cầu.

### C08 — Reload, chuyển chủ đề và tiếp tục đúng cuộc hội thoại

1. **C08.1:** Mình tìm phòng trọ ở Hạnh Thông, Hồ Chí Minh, tối đa 4 triệu, hai người, phải có WC riêng và thang máy.
2. **C08.2:** Ghi nhận thêm là mình cần chỗ để một xe máy nhé.
3. **C08.3:** Chưa chốt, mình hỏi chút: HomeSpace hướng dẫn người thuê liên hệ xem phòng thế nào?
4. **C08.4:** Mình sẽ tự liên hệ sau, bây giờ chưa cần đặt lịch giúp mình.
5. **C08.5:** Quay lại nhu cầu tìm phòng lúc đầu, bạn nhắc lại các tiêu chí đã nhận giúp mình.
6. **C08.6:** Mình tăng tiền phòng lên 5 triệu, những cái khác vẫn vậy.
7. **C08.7:** Tìm tiếp phòng phù hợp với các yêu cầu mình vừa giữ lại nhé.
8. **C08.8:** Trong những lựa chọn mới, ưu tiên giúp mình chỗ nào có cửa sổ, không có thì vẫn được.

**Thao tác ngoài câu hỏi:** sau lượt 2, reload trang và mở lại đúng cuộc hội thoại. Nếu thuận tiện, kiểm tra restart AI mà không xóa kho hội thoại. Sau lượt 4, có thể mở chat khác hỏi nhu cầu khác rồi quay lại chat này.

**Mốc kiểm tra:** câu hướng dẫn sản phẩm không trở thành lệnh tìm phòng/đặt lịch. Bộ tiêu chí đã xác nhận không bị xóa do chuyển chủ đề. Scope kết quả có thể được ngưng khi đổi chủ đề, nhưng khi khách nói “quay lại” phải khôi phục đúng tiêu chí đã lưu và đọc dữ liệu mới. Không lẫn chat hoặc tài khoản.

### C09 — Đổi loại nhà, khu vực và reset có chủ ý

1. **C09.1:** Mình cần phòng trọ ở Hạnh Thông, hai người, tiền phòng tối đa 4 triệu, WC riêng và có gác.
2. **C09.2:** Mình muốn thử xem căn hộ thay phòng trọ, ngân sách tăng lên tối đa 8 triệu.
3. **C09.3:** Hai người vẫn như cũ; căn hộ có bếp và WC riêng là được, không cần gác nữa.
4. **C09.4:** Mình đổi khu vực sang An Nhơn, Thành phố Hồ Chí Minh nhé.
5. **C09.5:** Có ít nhất một phòng ngủ riêng thì tốt, nếu là studio bạn nói rõ để mình cân nhắc.
6. **C09.6:** Thôi mình bắt đầu lại hoàn toàn, bỏ các yêu cầu thuê nhà vừa rồi nhé.
7. **C09.7:** Lần này mình tìm nhà nguyên căn ở Hồ Chí Minh cho gia đình năm người, tối đa 18 triệu, cần ba phòng ngủ.
8. **C09.8:** Nhắc lại yêu cầu hiện tại giúp mình, đừng dùng ngân sách 4 hay 8 triệu lúc trước nữa.

**Mốc kiểm tra:** đổi ROOM sang APARTMENT không kéo field gác/phòng trọ sang căn hộ. Nếu còn mâu thuẫn thì hỏi đúng phần cần làm rõ. Một phòng ngủ là ưu tiên vì khách vẫn chấp nhận studio. Reset xóa bộ lọc, target, phân trang và scope cũ. Lượt 7–8 chỉ còn nhà nguyên căn tại Hồ Chí Minh cho năm người, tối đa 18 triệu và ít nhất ba phòng ngủ; không giữ ngầm An Nhơn.

### C10 — Snapshot Nearby chưa đủ và không thổi phồng kết luận

1. **C10.1:** Cho mình xem vài phòng trọ ở Hạnh Thông, Hồ Chí Minh, tiền phòng tối đa 5 triệu cho hai người.
2. **C10.2:** Mấy phòng đó quanh nhà có quán ăn hay chỗ mua đồ nào mà hệ thống đang biết không?
3. **C10.3:** Chỉ dựa trên những địa điểm đã có thông tin thì phòng nào có chỗ mua đồ gần hơn?
4. **C10.4:** Có nhà thuốc gần không? Bệnh viện thì bạn kiểm tra riêng giúp mình, đừng coi hai cái là một.
5. **C10.5:** Bạn không có dữ liệu bệnh viện tức là thực tế quanh đó không có bệnh viện à?
6. **C10.6:** Mình muốn xem trong 5 cây số, nhưng đừng gọi thêm dịch vụ bên ngoài chỉ để trả lời nhé.
7. **C10.7:** Quay lại đúng IUH cơ sở Nguyễn Văn Bảo, nếu bạn biết tọa độ trường thì so khoảng cách từ các phòng đến trường trong 5 cây số giúp mình.
8. **C10.8:** Bạn có thể chọn tối đa ba phòng dựa trên những gì đã biết và nói rõ điều gì bạn chưa xác minh được không?

**Mốc kiểm tra:** PARTIAL vẫn dùng được bằng chứng về địa điểm đã biết. Điểm gần nhất trong snapshot chưa chắc gần nhất ngoài thực tế; nhà thuốc khác bệnh viện. Không đủ coverage nhóm trong 5 km thì nói rõ và không quét bù. Với đúng target có tọa độ hợp lệ, vẫn tính được khoảng cách trong 5 km. Gợi ý tối đa ba phòng đạt điều kiện bắt buộc, không thêm phòng sai cho đủ số. Không khẳng định đang hoạt động, đi bộ mười phút hoặc yên tĩnh chỉ từ POI.

## 6. Những kiểm tra cần Agent làm, người dùng không cần giả làm câu hỏi thuê

Đây là kiểm thử kỹ thuật riêng. Không nhét SQL, tên field, lỗi giả hay chỉ dẫn tấn công vào bộ câu hỏi thuê thật rồi coi đó là trải nghiệm bình thường.

| Nhóm | Bằng chứng Agent phải cung cấp |
|---|---|
| Query dày | 1.000 tin/phường; mọi điều kiện trước LIMIT; số detail reads và bytes bị giới hạn |
| Memory | >8message, reload/restart, hai request cùng lúc, hai account, hội thoại legacy; không lẫn/ghi đè state |
| Data thay đổi | Tin ẩn/hết hạn/đổi giá/đổi tọa độ giữa search và detail; card/evidence phản ánh lại đúng |
| Core/provider lỗi | Core timeout/4xx/5xx, enum sai, tool plan sai, không có target, quota provider; lỗi không thành “không có phòng” |
| Nearby | Target trong kho nhưng không trong link100, subtype đúng, PARTIALpositive vs UNKNOWNnegative, coverage cũ không che snapshot mới |
| Đồ/phí nhiều dòng | Hai dòng BED tốt, mỗi dòng quantity=1, đạt tổng ít nhất 2; BED hỏng và SOFA tốt không được ghép để đạt. Các phí OTHER phải cùng dòng tên/amount phù hợp. |
| Bảo vệ agent | Instruction trong description/POIname là dữ liệu; không bỏ filter, lộ key hoặc truy xuất hội thoại người khác |
| Không phát sinh TomTom | Spy/mock + network guard trong offline; manual chat chỉ đọc CSDL, không tạo scan job mới |
| Contract | Planner/state/serializer/DTO/compiler/projection không bỏ OR, scope, radius, category subtype hoặc cursor |

## 7. Mẫu ghi kết quả và bản bàn giao cần yêu cầu AI IDE

| ID | Ngày/model/dataset | PASS/FAIL/MISSING_FIXTURE/NOT_RUN | Conversation/requestId | Tin và dữ kiện đã đối chiếu | Sai lệch / bước tái hiện |
|---|---|---|---|---|---|
| Ví dụ: Q001 | Điền khi chạy | NOT_RUN | — | — | — |
| Ví dụ: C02.7 | Điền khi chạy | NOT_RUN | — | — | — |

Agent chuyển baseline thành corpus có expected plan/criteria/evidence trong tests/eval hiện có và giữ ID gốc. Người dùng chỉ phải gõ lời người thuê, đọc kết quả và đối chiếu; Agent chịu trách nhiệm golden fixtures và trace tool/SQL.

Không báo đã kiểm chứng model thật nếu mới chạy mock. Không điền sẵn PASS hoặc tự sửa câu hỏi khó để kết quả trông đẹp. Bộ này phủ các nhóm nghiệp vụ đã biết, không thay lời cam kết hiểu mọi câu tiếng Việt hay biết mọi tiện ích ngoài đời.
