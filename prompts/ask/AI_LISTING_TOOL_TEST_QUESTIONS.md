# 100 tình huống khách nhờ AI tư vấn chọn phòng

Đây là bộ kiểm thử **tư vấn lựa chọn**, không phải bộ hỏi đáp thông số tin đăng. Khách chưa chọn sẵn phòng; AI cần hiểu hoàn cảnh, làm rõ nhu cầu, tìm ứng viên, cân nhắc đánh đổi và giúp chọn phòng đáng đi xem. Không có bước gửi sẵn link/UUID, không ép khách biết loại bảng, tên field hoặc mã hành chính.

- **L001–L060:** 60 khách/tình huống độc lập; mở chat mới cho từng tình huống.
- **L061–L100:** một khách tên **Linh** trong một cuộc hội thoại 40 lượt, từ lúc chưa rõ nhu cầu tới shortlist đi xem. Linh chỉ tìm phòng trọ; không chuyển ngẫu nhiên qua nhà nguyên căn/căn hộ để kiểm tra field.
- Chỉ gửi dòng **Câu hỏi** vào AI. Các mục **Kỳ vọng**, **Ngữ cảnh cần có**, **Ghi nhận** và dữ liệu đối chiếu dành cho người chấm, không đưa vào prompt hay tự tạo lịch sử trợ lý.
- Đây là **đặc tả chưa chạy qua model**, không phải báo cáo đã đạt. Chỉ kiểm tra cấu trúc tài liệu không chứng minh AI tư vấn tốt.

Bản chỉ có lời khách: `AI_RENTER_QUESTIONS.md`.

## Nguồn dữ liệu và giới hạn thực tế

Đã đọc bộ seed `postgres/seed/listings_seed_hcm.sql` cùng `homespace_seed_300_duong_govap.json`. Snapshot có 300 tin: 100 ROOM, 100 APARTMENT, 100 HOUSE; bộ này tập trung vào **100 ROOM**, không coi 300 tin đều là phòng trọ.

<!-- seed-sql-sha256: 9ddf01ade35edde8fa02f7e7195c95183266d832e0204ad1d67b4bed1c01014e -->
<!-- seed-json-sha256: bc0e704f21e4a089109418836da9b38ec39d701094707633a1d669d57f72678d -->

| Địa bàn mới tại TP.HCM (`city_id=12`) | ward_id | ROOM |
| --- | --- | ---: |
| Phường Gò Vấp | 24588 | 43 |
| Phường An Nhơn | 24332 | 39 |
| Phường Hạnh Thông | 24076 | 18 |

- Giá ROOM trong snapshot từ 2,2 tới 4,5 triệu/phòng/tháng **chưa mặc nhiên bao gồm mọi phí**. Chính sách xe FREE/PAID/NONE, sức chứa, WC/bếp, giờ ra vào, nội thất và chính sách nuôi thú cưng khác nhau giữa các tin.
- Seed cọc 1 tháng, thuê tối thiểu 3 tháng, trả theo tháng. Khách chỉ muốn thuê 2 tháng cần được báo không đáp ứng, không được sửa điều kiện để có kết quả.
- Tọa độ chỉ là **điểm tham chiếu gần đúng trên đường**. Chưa có cơ sở chứng minh đúng nhà, đi bộ 10 phút, trong 1 km, gần trường/siêu thị, cách âm, khu an toàn, phòng sạch hay ánh sáng thực tế. Không biến điều khách cần thành đặc tính chắc chắn của tin.
- Số nhà/ref_id/thời điểm xác minh thiếu thì NULL. Ảnh mẫu dùng chung không chứng minh nội thất/hiện trạng thực tế.
- SQL đối chiếu chỉ đọc: `AI_LISTING_TEST_ORACLES.sql`. Đó là bằng chứng cho người chấm, **không phải dữ liệu để nhét toàn bộ vào context AI** và không phải bảng đáp án “phòng tốt nhất”.
- Nếu CSDL khác snapshot, đối chiếu hiện trạng; không tự seed/reset, không cố bám một ID hoặc số lượng đã không còn đúng.

## Cách chấm một câu tư vấn

Một câu trả lời tốt đi theo **hiểu nhu cầu → hỏi phần còn thiếu → tìm đúng phạm vi → so vài phương án → giải thích nên chọn và đánh đổi → nói rõ việc cần xác minh**. Không cần máy móc đủ sáu bước ở mỗi lượt hỏi tiếp.

1. **Hiểu tiền của khách.** Phân biệt thu nhập, tiền thuê thuần, tổng chi tháng, tổng chung/mỗi người và tiền vào ở (cọc/trả trước). Không coi tổng4 triệu là tiền phòng4 triệu cộng phí.
2. **Hiểu hoàn cảnh và ưu tiên.** Người/xe,WC,nuôi mèo,giờ về,ngày vào/thời hạn là điều kiện có thể quyết định khả năng ở. “Thích”, “cũng được”, “không cần” là mong muốn/nhượng bộ, không đồng loạt thành bộ lọc cứng. Khi chưa rõ phải hỏi, không tự nới.
3. **Tư vấn dựa trên tin thật.** Nêu vài ứng viên có căn cứ, mỗi ứng viên có lý do hợp, điểm phải chấp nhận và khoản/thông tin chưa biết. Chỉ trả card đúng filter nhưng không giúp chọn thì chưa đạt mục tiêu tư vấn.
4. **Tính tổng trung thực.** Dùng charge/đơn vị/included chính xác; chưa biết tiêu thụ thì hỏi hoặc nêu kịch bản có giả định, không làm số ước tính thành giá trọn gói. Phí theo phòng/tháng một lần, theo người/xe nhân đúng số lượng; phí thiếu không tự bằng0.
5. **Không làm việc ngoài quyền.** Chọn phòng đáng xem không phải chốt thuê/giữ chỗ/đặt lịch/xác nhận cọc. Không tự nhận đã liên hệ chủ nhà hoặc đã thanh toán.
6. **Tối ưu tra cứu.** Query điều kiện cứng trước LIMIT, lấy IDs/tổng và số detail hữu hạn theo yêu cầu/cap; không tải cả phường cho model lọc. Mặc định5, cap cấu hình mặc định20; khi khách xin2/3/10 thì linh động. Không ép shortlist phải đủ số bằng cách thêm tin sai.
7. **Đánh giá trong phạm vi đã xem.** Có thể chọn “đáng xem nhất trong các phương án vừa tìm”; không tự gọi là tốt nhất toàn thị trường nếu công cụ chỉ khảo sát một tập hữu hạn. Không yêu cầu AI chọn cùng một UUID cố định khi nhiều phương án cùng hợp.

## A. 60 tình huống độc lập — AI giúp tìm và chọn, không đưa sẵn tin

Mỗi tình huống bắt đầu từ chat mới. Hỏi làm rõ đúng phần quan trọng còn thiếu được tính là đáp ứng bước tư vấn, không tự coi đó là lỗi vì chưa có card ngay. Khi kiểm thử tiếp các nhánh hỏi thêm, ghi nguyên câu trả lời thực của khách/người kiểm thử; không gọi phần mở rộng này là đã nằm sẵn trong 100 câu chuẩn.

## Người thuê kể hoàn cảnh

### L001 — Lần đầu tìm trọ, chưa biết cần nói gì
- Câu hỏi: `Mình sắp lên TP.HCM đi làm, lần đầu tự thuê trọ nên hơi rối. Bạn giúp mình tìm phòng phù hợp được không, mình nên bắt đầu từ đâu?`
- Kỳ vọng: Nhận vai trò tư vấn, hỏi ngắn gọn khu vực đi làm, ngân sách là tiền phòng hay tổng chi, số người/xe và ngày cần vào. Không tung danh sách ngẫu nhiên hoặc tự đặt ngân sách, phường, tiện ích thay khách.

### L002 — Sinh viên cần phòng trong tổng chi có hạn
- Câu hỏi: `Mình học gần Đại học Công nghiệp TP.HCM, ở một mình, có xe máy. Mỗi tháng chỉ lo được 3 triệu rưỡi cả phòng, điện nước với tiền xe. Bạn giúp mình chọn chỗ nào đỡ áp lực tiền bạc được không?`
- Kỳ vọng: Hiểu <=3,5 triệu là tổng chi chỗ ở, không phải giá thuê thuần. Hỏi/đề xuất giả định tiêu thụ rõ ràng rồi tìm ROOM nhận1 người/1xe; nêu vài lựa chọn cùng tổng ước tính và khoản chưa biết. Chưa có công cụ khoảng cách thì không cam kết gần trường trong bán kính/thời gian cụ thể.

### L003 — Hai bạn chia tiền, cần phân biệt ngân sách từng người
- Câu hỏi: `Tụi mình hai bạn nữ muốn ở chung quanh phường An Nhơn, TP.HCM, mỗi người góp tối đa 2 triệu cả điện nước. Muốn có WC riêng và để được hai xe máy, bạn tư vấn vài phòng đáng xem giúp tụi mình nha.`
- Kỳ vọng: Quy đổi tổng ngân sách hai người <=4 triệu/tháng, không tìm phòng2 triệu rồi nhân đôi phí sai đơn vị. Điều kiện cứng:2 người,2xe,WC riêng,An Nhơn; xếp hạng theo tổng chi dự kiến và giải thích. Không suy tin chỉ nhận nữ nếu không có dữ liệu.

### L004 — Gia đình nhỏ cần sự phù hợp, không chỉ rẻ
- Câu hỏi: `Hai vợ chồng mình có bé nhỏ, muốn kiếm phòng ở phường Hạnh Thông, TP.HCM. Tổng chi ở mỗi tháng cố được 5 triệu, cần WC riêng và có chỗ nấu ăn. Mình nên chọn phòng kiểu nào cho hợp?`
- Kỳ vọng: Ưu tiên sức chứa>=3,WC riêng,bếp có thể sử dụng và ngân sách tổng; hỏi tuổi bé/nhu cầu riêng khi cần, không mặc nhiên bỏ qua trẻ trong sức chứa. So sánh lựa chọn thực tế, không ép chuyển sang căn hộ đắt hơn hoặc tự coi studio chắc chắn phù hợp.

### L005 — Lương thấp, không biến toàn bộ thu nhập thành tiền thuê
- Câu hỏi: `Mình mới đi làm lương khoảng 8 triệu, một người một xe máy, muốn ở phường Gò Vấp, TP.HCM. Mình chưa biết nên dành bao nhiêu cho chỗ ở để còn tiền ăn với đi lại, bạn giúp mình tính rồi chọn vài phòng nhé.`
- Kỳ vọng: 8 triệu là thu nhập, không là ngân sách thuê. Hỏi các chi phí cố định/số tiền muốn để dành và đề xuất phương án dự trù có giả định; chỉ tìm/chọn theo ngân sách được thống nhất, không áp tỷ lệ tài chính như quy tắc bắt buộc hoặc quyết thay khả năng chi trả của khách.

### L006 — Đi làm ca tối, rẻ không đủ
- Câu hỏi: `Mình làm ca tối, thường hơn 11 giờ mới về, muốn thuê phòng ở An Nhơn, TP.HCM, một người một xe. Tổng tiền ở tối đa 4 triệu. Bạn giúp mình chọn chỗ không bị kẹt giờ đóng cửa với.`
- Kỳ vọng: Lọc khả năng ở1 người/1xe,đúng An Nhơn và chi phí tổng. Đối chiếu access_hours_type và nội quy giờ yên tĩnh; không coi giờ giữ yên tĩnh là giờ khóa cổng, không mặc định mọi FLEXIBLE đồng nghĩa không cần xác nhận cách ra vào ban đêm.

### L007 — Làm việc tại nhà
- Câu hỏi: `Mình làm việc ở nhà phần lớn thời gian, tìm trọ phường Gò Vấp, TP.HCM, một người, có xe máy, khoảng 4 triệu rưỡi cả điện nước. Cần chỗ đặt bàn làm việc, có ánh sáng và mạng ổn. Bạn chọn giúp mình vài phòng hợp hơn là chỉ phòng rẻ nhất.`
- Kỳ vọng: Tách ngân sách tổng khỏi giá thuê; kiểm tra diện tích,cửa sổ,nội thất bàn nếu có,phí internet. Wi-Fi không chứng minh tốc độ/độ ổn định,diện tích không chứng minh bố trí vừa bàn; nói rõ điều cần hỏi/kiểm tra khi xem phòng, không bịa cách âm hay tốc độ mạng.

### L008 — Người dễ khó chịu với phòng bí
- Câu hỏi: `Mình ở một mình, thuê trọ quanh Hạnh Thông, TP.HCM, tiền phòng tối đa 4 triệu. Mình chịu không nổi phòng bí, WC phải riêng; rộng vừa thôi cũng được. Bạn ưu tiên giúp mình mấy phòng thoáng nhé.`
- Kỳ vọng: Ngân sách4 triệu là tiền phòng; WC riêng là cứng,ưu tiên has_window/ban công đã khai báo. Không tự thêm diện tích tối thiểu; cửa sổ không đủ để cam kết thông gió thực tế. Đưa lý do hợp/điểm phải kiểm tra, không chỉ trả card.

### L009 — Nuôi mèo là điều kiện quyết định
- Câu hỏi: `Mình có một bé mèo, ở một mình với một xe máy, muốn thuê trọ ở phường An Nhơn, TP.HCM, tổng chi không quá 4 triệu rưỡi. Bạn tìm giúp chỗ nào cho nuôi thật sự, mình không muốn tới lúc dọn vào mới bị từ chối.`
- Kỳ vọng: Kiểm tra petPolicy và ghi chú riêng,khả năng nhận người/xe,chi phí tổng. ALLOWED khác APPROVAL_REQUIRED; phương án cần xin phép phải ghi rõ chưa đạt yêu cầu chắc chắn, không chỉ dựa tiện ích/thông tin chưa khai báo. Không cam kết chủ sẽ đồng ý.

### L010 — Chuyển vào gấp
- Câu hỏi: `Mình phải trả phòng cũ cuối tuần này, đang cần trọ ở phường Gò Vấp, TP.HCM, một người một xe, tổng chi tối đa 4 triệu. Bạn giúp mình ưu tiên những chỗ có thể dọn vào sớm với.`
- Kỳ vọng: Ghi ngày chạy để hiểu cuối tuần; kiểm tra available_from theo ngày hiện tại,không coi tin đang đăng là vào ngay. Gợi ý phù hợp ngân sách/người/xe và hướng dẫn xác nhận bàn giao với chủ; không tự đặt/chốt phòng.

## Cân đối tiền thuê và tổng chi

### L011 — Tiền thuê thấp nhưng sợ phụ phí
- Câu hỏi: `Mình muốn ở phường Gò Vấp, TP.HCM, một người một xe. Tổng mỗi tháng chỉ có 4 triệu. Bạn giúp mình chọn phòng tính ra rẻ thật, chứ mình sợ thấy giá phòng thấp mà thêm phí lại đội lên.`
- Kỳ vọng: Tìm trong khu vực,so tiền thuê+các charge chưa gồm theo giả định tiêu thụ công khai; không cộng đôi included_in_rent hoặc coi phí thiếu là0. Xếp hạng theo tổng dự kiến, không chỉ price_amount; hỏi tiêu thụ khi cần.

### L012 — Tiền ban đầu ít
- Câu hỏi: `Mình đang có đúng 6 triệu để chuyển trọ, gồm cọc với tiền phải đóng ban đầu. Muốn ở một mình quanh An Nhơn, TP.HCM, có xe máy. Bạn giúp mình xem chọn phòng nào vào ở được mà không hụt tiền?`
- Kỳ vọng: 6 triệu là tiền vào ở,không phải chi hàng tháng. Hỏi thêm ngân sách duy trì; tính cọc theo deposit_type+chu kỳ trả+phí ban đầu có dữ liệu,không cộng phí tiêu thụ chưa đến hạn như chắc chắn phải nộp trước. Nêu phần chưa biết/chưa xác nhận,không bảo đủ khi tổng có thể vượt.

### L013 — Thu nhập tháng ít tháng nhiều
- Câu hỏi: `Mình làm tự do, tháng thu nhập cao tháng thấp. Ở một mình, muốn tìm phòng Gò Vấp, TP.HCM, cố giữ tổng tiền ở dưới 3 triệu rưỡi. Bạn tư vấn phương án nào dễ duy trì hơn giúp mình.`
- Kỳ vọng: Tôn trọng ngưỡng tổng<3,5 triệu; ưu tiên gánh nặng thường xuyên và biến động điện/nước thay vì chỉ tiện ích. Không lấy thu nhập không ổn định để suy khả năng trả thêm; hỏi mức dùng và giữ khoản đệm như lựa chọn, không lời khuyên tài chính chắc chắn.

### L014 — Mùa nóng dùng nhiều điện
- Câu hỏi: `Mình tìm phòng ở Hạnh Thông, TP.HCM, một người một xe, muốn có máy lạnh. Tổng cả tháng không quá 4 triệu rưỡi nhưng mùa nóng mình bật máy lạnh nhiều. Bạn giúp mình chọn phòng nào ít rủi ro vượt tiền nhất?`
- Kỳ vọng: Kiểm tra có máy lạnh từ dữ liệu,phí điện và included; chưa biết kWh thì hỏi hoặc so ít nhất hai mức tiêu thụ minh bạch. Không hứa tổng cố định4,5 triệu chỉ vì tiền phòng thấp; không suy công suất/tiết kiệm điện khi không có thông số.

### L015 — Một người dùng điện nước ít
- Câu hỏi: `Mình chỉ về phòng buổi tối, một người một xe. Muốn ở An Nhơn, TP.HCM, tổng chi tối đa 3 triệu rưỡi. Phòng có điện nước tính riêng có thể lợi hơn phòng giá trọn gói không, bạn giúp mình chọn theo tin đang có nhé?`
- Kỳ vọng: So sánh theo billing_method/charge thực tế,không giả rằng có giá trọn gói trong seed hoặc tự tính gói. Hỏi/ghi giả định tiêu thụ thấp; có thể chỉ có phương án trả riêng thì nói rõ, không bịa đối thủ để tư vấn.

### L016 — Giá thuê chưa phải ngân sách tổng
- Câu hỏi: `Mình tìm phòng ở phường Gò Vấp, TP.HCM, một người một xe, riêng tiền phòng mình chịu được tới 3 triệu. Điện nước tính thêm được nhưng bạn tính giúp để mình biết thật sự tháng phải bỏ ra bao nhiêu rồi chọn phòng.`
- Kỳ vọng: Giá thuê<=3 triệu là ràng buộc; tổng được tính thêm,không áp trần tổng3 triệu. Nêu tiền thuê và phụ phí tách riêng,kèm giả định tiêu thụ; so phương án theo chi phí thực,không tự tăng tiền thuê để đổi tiện ích.

### L017 — Giữ tiền dự phòng
- Câu hỏi: `Mình có thể dành 4 triệu rưỡi cho chỗ ở mỗi tháng nhưng muốn chừa lại 500 nghìn phòng phát sinh. Ở một người một xe tại An Nhơn, TP.HCM, bạn chọn giúp phòng nào hợp với mức chi mình muốn giữ nhé.`
- Kỳ vọng: Hiểu mục tiêu chi thường xuyên<=4 triệu,khả năng dự phòng500 nghìn không tự động là ngân sách cho thuê. Đề xuất trong mục tiêu trước; nếu không có thì xin phép trước khi dùng phần dự phòng,không im lặng chọn giá sát4,5 triệu chưa phí.

### L018 — Hai người chia nhưng phí tính theo đơn vị khác
- Câu hỏi: `Hai đứa mình mỗi người góp 2 triệu rưỡi cho chỗ ở, có hai xe máy, muốn ở Gò Vấp, TP.HCM. Bạn giúp tìm phòng rồi tính thử chia ra mỗi người hết bao nhiêu cả tiền xe với điện nước.`
- Kỳ vọng: Tổng ngân sách<=5 triệu; sức chứa>=2 và xe>=2. Tiền phòng/phí tháng tính một lần theo phòng,phí người nhân2,phí xe nhân2,năng lượng theo giả định; sau đó chia2. Không nhân đôi mọi khoản hoặc bỏ phí xe thứ hai.

### L019 — Muốn giảm tiền mà chưa biết bỏ gì
- Câu hỏi: `Một người một xe, ở Hạnh Thông, TP.HCM, tổng chi tối đa 4 triệu. Mình thích phòng rộng, có máy lạnh, WC riêng nhưng sợ không đủ tiền. Bạn giúp mình xem nên nhượng bộ cái nào trước, mình không muốn tự chọn bừa.`
- Kỳ vọng: Hỏi/nhận thứ tự ưu tiên,phân biệt mong muốn với bắt buộc; tìm bằng chứng phương án trước khi tư vấn giảm tiện ích. Không tự bỏ WC riêng hoặc tăng tổng tiền vì suy khách có thể nhượng bộ; đưa vài đánh đổi cụ thể và xin khách chọn.

### L020 — Muốn so vài mức ngân sách
- Câu hỏi: `Mình ở một mình một xe ở An Nhơn, TP.HCM. Nếu tổng tiền ở 3 triệu rưỡi so với 4 triệu rưỡi thì khác được những gì? Bạn cho mình vài phòng tiêu biểu mỗi mức để mình quyết có nên cố thêm không.`
- Kỳ vọng: So cùng nhu cầu/ngữ cảnh và giả định phí,phân nhóm theo tổng<=3,5/<=4,5 triệu; nêu lợi ích thực từ tin được chọn. Không khẳng định mọi phòng đắt hơn đều tốt hơn hoặc lấy phòng vượt4,5 triệu; không tải toàn bộ tin để model tự lọc.

## Chọn theo sinh hoạt hằng ngày

### L021 — Cửa sổ quan trọng hơn nội thất
- Câu hỏi: `Mình một người một xe, muốn ở phường Gò Vấp, TP.HCM, tổng chi tối đa 4 triệu. Mình chấp nhận tự mua đồ, nhưng phòng phải có cửa sổ. Bạn giúp chọn những phòng đáng đi xem nhất nhé.`
- Kỳ vọng: Cửa sổ là cứng,nội thất là có thể thiếu; không loại toàn bộ UNFURNISHED hoặc bỏ cửa sổ để lấy FULLY_FURNISHED. Tính tổng phí có giả định và nêu khoản sắm đồ ban đầu chưa có giá.

### L022 — Có xe, không nhận xe là loại
- Câu hỏi: `Mình thấy nhiều phòng rẻ nhưng đi làm bắt buộc có xe máy. Tìm trọ ở An Nhơn, TP.HCM, một người một xe, tổng không quá 4 triệu; bạn chỉ giúp mình mấy phòng ở được cả người lẫn xe nha.`
- Kỳ vọng: Kiểm tra parking_policy khác NONE và sức chứa xe>=1 cùng max_occupants>=1. Không coi không có dòng phí là FREE,không đẩy khách sang gửi ngoài như đã giải quyết khi khách chưa đồng ý; so chi phí gồm xe.

### L023 — Không muốn leo gác
- Câu hỏi: `Mình tìm phòng cho mẹ ở Hạnh Thông, TP.HCM, mẹ ở một mình, không có xe, tiền phòng tối đa 4 triệu. Mẹ ngại leo gác và muốn có cửa sổ, bạn chọn giúp phòng phù hợp cho mẹ với.`
- Kỳ vọng: ROOM,không gác,có cửa sổ,tối đa4 triệu tiền thuê; không tự bắt buộc có xe. Hỏi khả năng leo cầu thang/tầng cần ở,không suy không gác là tầng trệt hay đảm bảo phù hợp sức khỏe.

### L024 — Nấu ăn thường xuyên
- Câu hỏi: `Mình nấu cơm gần như mỗi ngày, muốn trọ một mình ở Gò Vấp, TP.HCM, có xe máy, tổng chi tối đa 4 triệu rưỡi. WC phải riêng, bếp chung cũng được miễn nấu được, bạn giúp mình chọn.`
- Kỳ vọng: WC riêng là cứng;bếp PRIVATE hoặc SHARED được chấp nhận,NONE không đạt. Không biến 'bếp chung cũng được' thành bắt buộc bếp riêng; kiểm tra nội quy nấu và phí đã ghi,không đảm bảo thiết bị bếp khi không có.

### L025 — Ăn ngoài, có thể bỏ bếp
- Câu hỏi: `Mình ít nấu ăn, chỉ cần phòng riêng sạch, có WC riêng để đi làm. Một người một xe, ở An Nhơn, TP.HCM, tổng không quá 3 triệu rưỡi. Nếu không có bếp mà tiết kiệm hơn thì mình chịu, bạn chọn giúp nhé.`
- Kỳ vọng: Không thêm bếp như điều kiện cứng; giữ WC riêng,sức chứa,xe,địa bàn và tổng. Có thể chọn kitchen_type=NONE nhưng ghi rõ đánh đổi; sạch là cần kiểm tra,không xác minh từ ảnh mẫu.

### L026 — Nhà có em bé, không tự bảo chứng an toàn
- Câu hỏi: `Hai vợ chồng mình với em bé muốn thuê phòng Hạnh Thông, TP.HCM, tổng tiền ở tối đa 5 triệu. Mình muốn chỗ thông thoáng, có WC riêng, nấu ăn được; bạn chọn giúp rồi chỉ mình cần kiểm tra gì khi đi xem.`
- Kỳ vọng: Tính nhu cầu3 người,nấu được,WC riêng,tổng<=5 triệu; thoáng có thể ưu tiên cửa sổ nhưng không suy an toàn cho trẻ. Nêu kiểm tra thực tế lan can/ổ điện/thoát hiểm như việc cần kiểm tra,không chứng nhận an toàn hay chủ chấp nhận em bé nếu không có thông tin.

### L027 — Ở ghép ba người, sức chứa là bắt buộc
- Câu hỏi: `Ba đứa mình tính thuê chung một phòng ở Gò Vấp, TP.HCM, mỗi người góp tối đa 1 triệu rưỡi cả điện nước. Có hai xe máy, muốn WC riêng; bạn giúp xem có phương án nào sống được chứ đừng chỉ chia giá phòng cho ba.`
- Kỳ vọng: Tổng<=4,5 triệu,người>=3,xe>=2,WC riêng. Không lấy phòng sức chứa1–2 rồi chia tiền cho3; so tổng phí người/xe/tiêu thụ và diện tích có dữ liệu,không tự cam kết đủ chỗ bố trí giường.

### L028 — Làm ca xoay
- Câu hỏi: `Mình làm ca xoay nên có tuần đi sớm, có tuần gần nửa đêm mới về. Một người một xe, cần trọ An Nhơn, TP.HCM, tổng không quá 4 triệu rưỡi. Bạn giúp chọn chỗ giờ giấc phù hợp, đừng chỉ nhìn tiền phòng.`
- Kỳ vọng: Ưu tiên giờ đi lại FLEXIBLE,kiểm tra mô tả/nội quy,xe và tổng phí; CURFEW có thể không phù hợp,không tự đổi giờ khách. Điều chưa biết về cổng/chủ cùng nhà phải nêu cần xác nhận.

### L029 — Cần yên tĩnh để học
- Câu hỏi: `Mình ôn thi buổi tối, ở một mình một xe, muốn thuê trọ phường Gò Vấp, TP.HCM, tổng chi tối đa 4 triệu. Bạn giúp chọn phòng có cơ sở để ưu tiên yên tĩnh, mình không cần nhiều đồ đẹp.`
- Kỳ vọng: Dựa nội quy giờ yên tĩnh và thông tin tin,không biến chính sách thành bằng chứng không có tiếng ồn thực tế. Không xếp ảnh đẹp/nội thất cao hơn nhu cầu học; nêu cần nghe/kiểm tra thực địa vào giờ tối.

### L030 — Chưa có đồ đạc, so tổng tiền bắt đầu
- Câu hỏi: `Mình mới đi làm chưa có giường tủ, một người một xe, muốn thuê phòng ở Hạnh Thông, TP.HCM, tổng tiền ở tối đa 4 triệu rưỡi. Phòng trống rẻ hơn có chắc lợi không? Bạn giúp mình cân với phòng có sẵn đồ.`
- Kỳ vọng: So danh sách nội thất bàn giao thực tế và chi phí thuê/charge; không suy từ ảnh. Tách tiền sắm đồ khỏi chi phí tháng,khi chưa có giá đồ thì hỏi hoặc đánh dấu dự toán do khách chọn; không khẳng định phòng trống luôn rẻ tổng thể.

## Tư vấn vị trí trong giới hạn dữ liệu

### L031 — Gần trường nhưng không có bán kính đáng tin
- Câu hỏi: `Mình học ở Đại học Công nghiệp TP.HCM, tìm trọ một người một xe, tổng tiền ở tối đa 4 triệu. Mình muốn đi học tiện hơn, bạn giúp chọn vài khu hoặc phòng nên xem trước được không?`
- Kỳ vọng: Hỏi/xác nhận khu vực/thời gian đi lại khách chấp nhận; có thể đề xuất ứng viên có dữ liệu địa chỉ phù hợp nhưng không đoán vài phút/bán kính. Nêu chưa có geospatial xác minh; không từ chối toàn bộ hỗ trợ chọn phòng chỉ vì chưa tính được khoảng cách.

### L032 — Có tuyến đường cụ thể
- Câu hỏi: `Mình làm trên đường Quang Trung, TP.HCM, muốn thuê trọ trên đường này cho dễ tìm. Một người một xe, tổng không quá 4 triệu, WC riêng là được. Bạn chọn giúp vài phòng rồi nói điểm đáng cân nhắc.`
- Kỳ vọng: Lọc street+city,ROOM,người/xe,WC riêng và ngân sách tổng; không tự suy phường vì đường đi qua nhiều khu. So theo tin thật,không gán số nhà NULL hoặc hứa sát nơi làm khi chưa biết địa chỉ công ty.

### L033 — Chọn giữa hai phường
- Câu hỏi: `Mình đang phân vân An Nhơn với Hạnh Thông ở TP.HCM, ở một mình một xe, tổng tiền ở tối đa 4 triệu. Mình coi trọng WC riêng và phòng thoáng hơn nội thất. Bạn giúp so vài lựa chọn hai bên để mình dễ quyết.`
- Kỳ vọng: Tìm ứng viên ở cả hai phường được khách cho phép,so trên cùng ràng buộc và ưu tiên; không gộp hai phường thành AND hoặc tự chuyển sang Gò Vấp. Chọn lý do dựa tin cụ thể,không kết luận một phường an ninh/ồn hơn khi không có dữ liệu.

### L034 — Địa giới cũ nói theo thói quen
- Câu hỏi: `Mình quen gọi chung là quận Gò Vấp, TP.HCM, muốn kiếm trọ một người một xe tổng không quá 4 triệu. Giờ đổi tên phường mình không rành, bạn giúp mình khoanh khu dễ tìm phòng với.`
- Kỳ vọng: Không đồng nhất quận cũ với phường Gò Vấp mới. Hỏi mốc/đường gần chỗ đi làm hoặc trình bày các phường seed như lựa chọn cần khách xác nhận; vẫn giữ ngân sách/người/xe,không làm khó khách bằng mã hành chính.

### L035 — Không nhất thiết sát chỗ làm
- Câu hỏi: `Mình làm gần đường Nguyễn Oanh, TP.HCM, trọ một người một xe, tổng tối đa 4 triệu. Không nhất thiết sát công ty, mình muốn chỗ thoáng và WC riêng hơn. Bạn giúp chọn theo ưu tiên đó nhé.`
- Kỳ vọng: Khách cho phép cân đối vị trí nhưng chưa cho đi bất kỳ tỉnh/phường; hỏi phạm vi nếu thiếu,không bắt buộc keyword Nguyễn Oanh như điều kiện cứng. Ưu tiên thoáng/WC riêng có bằng chứng,không bịa khoảng cách đi làm.

### L036 — Rất cần đi bộ nhưng hệ thống chưa đo được
- Câu hỏi: `Mình không có xe, muốn đi bộ tới Đại học Công nghiệp TP.HCM trong khoảng 10 phút, tổng tiền ở tối đa 3 triệu rưỡi. Bạn giúp mình chọn phòng nào thật sự hợp, mình sợ thuê xong lại phải tốn tiền xe.`
- Kỳ vọng: 10 phút đi bộ là yêu cầu vị trí quan trọng,chưa có route/POI và tọa độ seed gần đúng thì không gắn nhãn đạt. Hỏi địa chỉ/mốc và đề nghị kiểm tra tuyến thực tế; có thể đưa phương án chờ xác minh vị trí,không coi chúng là đã thỏa tất cả yêu cầu hoặc tự thay bằng có xe.

### L037 — Thiếu tên khu vực
- Câu hỏi: `Mình cần phòng gần chỗ làm, yên tĩnh, một người một xe và tổng tiền ở không quá 4 triệu. Bạn giúp mình chọn chỗ ổn nha.`
- Kỳ vọng: Hỏi chỗ làm ở thành phố/khu vực/đường nào trước khi tìm; không giả TP.HCM hoặc lấy phường từ chat khác. Giữ các nhu cầu đã có,hỏi vừa đủ thay vì buộc khách trả lời toàn bộ checklist.

### L038 — Đi hai nơi khác nhau
- Câu hỏi: `Hai chị em mình một người học gần Đại học Công nghiệp, một người làm đường Quang Trung ở TP.HCM, có hai xe máy, tổng chỗ ở tối đa 5 triệu. Bạn giúp chọn phương án cân bằng cho cả hai, đừng chỉ tiện cho một người.`
- Kỳ vọng: Người>=2,xe>=2,tổng<=5 triệu; hỏi địa chỉ/mức đi lại chấp nhận để cân bằng. Không lấy trung điểm hay ước phút chính xác từ điểm demo làm kết luận; so ứng viên với hai nhu cầu,không chỉ tối ưu người đầu tiên.

### L039 — Điều kiện xa gần chỉ là ưu tiên
- Câu hỏi: `Mình muốn trọ quanh An Nhơn, TP.HCM, một người một xe, tổng tối đa 4 triệu rưỡi. Gần siêu thị thì tốt nhưng không bắt buộc, WC riêng mới là quan trọng. Bạn giúp chọn vài phòng hợp nhất.`
- Kỳ vọng: Giữ An Nhơn/WC riêng/ngân sách/người/xe là cứng,siêu thị là mềm. Không lọc sạch tin vì không có POI,không bịa siêu thị/khoảng cách; giải thích ưu tiên và điểm cần kiểm tra.

### L040 — Chỉ một địa bàn nhưng chưa có ứng viên
- Câu hỏi: `Mình chỉ thuê ở phường Thủ Đức, TP.HCM, một người một xe, tổng tối đa 4 triệu. Nếu hiện chưa có phòng thì tư vấn mình bước tiếp theo nhé, đừng đưa phòng ở khu khác như thể đúng nhu cầu.`
- Kỳ vọng: Seed chưa có tin phường này,giữ địa bàn và nói rõ. Có thể hỏi khách có muốn mở rộng phạm vi/đổi thời gian tìm,không tự bỏ ward hoặc giả ứng viên Gò Vấp là Thủ Đức; vẫn tư vấn lựa chọn tiếp theo thay vì chỉ NO_RESULTS cụt.

## Giúp cân nhắc và nhượng bộ

### L041 — Biết mình không thể có tất cả
- Câu hỏi: `Mình ở một người một xe, muốn trọ Gò Vấp, TP.HCM. Tổng không quá 3 triệu rưỡi mà mình lại thích WC riêng, bếp riêng, máy lạnh với phòng rộng. Bạn giúp mình nhìn thực tế nên ưu tiên gì, cái nào có thể bỏ bớt.`
- Kỳ vọng: Giúp phân loại ưu tiên,hỏi điều tuyệt đối không bỏ trước khi nới; đối chiếu ứng viên thực tế,không tự cam kết có đủ tiện ích với tổng thấp. Không biến mọi từ 'thích' thành điều kiện cứng hoặc cứ tăng ngân sách.

### L042 — Không có thì không được tự tăng tiền
- Câu hỏi: `Một người một xe, cần trọ An Nhơn, TP.HCM, WC riêng. Tổng tiền ở của mình chốt tối đa 3 triệu, không thể thêm. Bạn chọn giúp phương án thật sự trong tiền, không có thì nói mình nên tính lại nhu cầu nào.`
- Kỳ vọng: Trần tổng3 triệu là cứng,tính phí có giả định; thiếu tin thì giải thích ràng buộc gây khó và xin phép đổi điều còn có thể đổi. Không trả phòng tiền thuê3 triệu cộng phí như đạt tổng3 triệu,không đề xuất giá cao thành lựa chọn phù hợp.

### L043 — Bếp chung là chấp nhận được
- Câu hỏi: `Hai người hai xe, muốn trọ Hạnh Thông, TP.HCM, tổng tối đa 4 triệu rưỡi, WC phải riêng. Bếp riêng thì thích nhưng chung cũng được. Bạn giúp chọn phương án cân bằng giữa tiền với sinh hoạt.`
- Kỳ vọng: Không khóa bếp PRIVATE nếu SHARED chấp nhận; loại NONE khi không đáp ứng nhu cầu nấu. Người>=2,xe>=2,WC riêng,trần tổng4,5 triệu; so ưu/nhược phương án,không nới ngưỡng người/xe để đủ danh sách.

### L044 — Nội thất không phải thứ quan trọng nhất
- Câu hỏi: `Một người một xe, tìm trọ Gò Vấp, TP.HCM, tiền phòng tối đa 3 triệu rưỡi. Mình cần WC riêng với cửa sổ, còn giường tủ máy lạnh mình tự lo được. Bạn giúp chọn đúng thứ mình cần, đừng ưu tiên đồ đẹp.`
- Kỳ vọng: Tiền thuê<=3,5 triệu,WC riêng+cửa sổ là cứng,nội thất không bắt buộc. Đề xuất theo ưu tiên này với bằng chứng,mô tả phụ phí và chi phí sắm đồ chưa biết; không chọn phòng kín đầy nội thất chỉ vì nhiều tiện ích.

### L045 — Giữ thú cưng, nhượng bộ diện tích
- Câu hỏi: `Mình một người một xe có mèo, muốn ở An Nhơn, TP.HCM, tổng tiền ở tối đa 4 triệu rưỡi. Phòng nhỏ hơn cũng được, nhưng không thể đem mèo gửi chỗ khác. Bạn giúp mình chọn theo thứ tự đó.`
- Kỳ vọng: Giữ yêu cầu nuôi mèo và người/xe/ngân sách; diện tích có thể mềm,không tự đặt min20m². APPROVAL_REQUIRED cần xác nhận,NOT_ALLOWED không khớp; không khuyên bỏ mèo như đã được khách chấp nhận.

### L046 — Chỗ đỗ hai xe trước nội thất
- Câu hỏi: `Hai đứa mình đi làm hai ca nên cần hai xe, trọ Gò Vấp, TP.HCM, tổng tối đa 4 triệu rưỡi. Không có sẵn đồ cũng được nhưng không thể thiếu chỗ hai xe. Bạn giúp chọn vài chỗ sống được với lịch này.`
- Kỳ vọng: Kiểm tra người>=2 vàxe>=2 là cứng,không lấy phòng nhận1xe rồi bảo luân phiên. Hỏi ca về/giờ cần ra vào nếu chưa rõ; không tự coi UNFURNISHED là không phù hợp,phí xe hai chiếc tính đúng.

### L047 — Tự hỏi nên ở chung hay riêng
- Câu hỏi: `Mình với bạn đang tính mỗi người ở phòng riêng hay thuê chung một phòng tại An Nhơn, TP.HCM. Tổng hai đứa lo được 5 triệu cả phí, có hai xe, bạn giúp mình xem hai cách đó có khả thi không rồi tư vấn.`
- Kỳ vọng: So phương án một phòng sức chứa>=2/xe>=2 và hai phòng phù hợp từng người trên tổng chung5 triệu; không coi mỗi phòng5 triệu. Dùng ứng viên thật hoặc nêu thiếu dữ liệu/không có phương án,không tự hứa có hai phòng cùng tòa/tầng nếu không biết.

### L048 — Ở tạm nhưng seed yêu cầu thuê dài hơn
- Câu hỏi: `Mình chỉ ở TP.HCM hai tháng để thực tập, một người một xe, muốn quanh Hạnh Thông và tổng tối đa 4 triệu. Bạn giúp chọn phòng mà không bị mắc thời hạn thuê lâu hơn.`
- Kỳ vọng: Đọc minimum_lease_months; seed tối thiểu3 tháng nên không gắn nhãn đủ2 tháng. Tư vấn cần hỏi chủ/chọn sản phẩm thuê ngắn hạn,không tự rút thời hạn hay nói chủ chắc chắn đồng ý. Không trả tin giá hợp nhưng bỏ qua ràng buộc quan trọng.

### L049 — Ngày vào ở chưa cố định
- Câu hỏi: `Mình được báo chuyển việc sang TP.HCM nhưng chưa chốt ngày bắt đầu, dự kiến đầu tháng sau. Một người một xe, tổng tiền ở 4 triệu rưỡi, muốn An Nhơn. Bạn giúp mình chọn trước vài phương án mà chưa phải chốt vội.`
- Kỳ vọng: Dùng thời gian tương đối theo ngày chạy và ghi chưa chốt; có thể shortlist hợp nhu cầu,đọc available_from nhưng không giữ chỗ/đặt cọc. Hỏi khoảng ngày phù hợp và cảnh báo cần kiểm tra lại giá/tình trạng,không khẳng định còn trống tới tháng sau.

### L050 — Sợ phát sinh khi xem phòng
- Câu hỏi: `Mình lần đầu tự thuê, một người một xe, cần trọ phường Gò Vấp, TP.HCM, tổng tối đa 4 triệu. Bạn giúp chọn vài phòng rồi chỉ mình những khoản hoặc điều gì cần hỏi chủ để khỏi thuê xong mới biết không hợp.`
- Kỳ vọng: Đề xuất ứng viên có căn cứ kèm câu hỏi gắn thiếu sót thật:phí,cọc,đơn vị tính,xe,giờ giấc,bàn giao/ngày vào; không chỉ đưa checklist chung hoặc tuyên bố không phát sinh. Không thay việc xác minh/hợp đồng của các bên.

## Giúp khách ra quyết định

### L051 — Khách muốn ít lựa chọn nhưng giải thích sâu
- Câu hỏi: `Mình ở một người một xe, muốn trọ An Nhơn, TP.HCM, tổng tối đa 4 triệu, WC riêng. Bạn đừng gửi nhiều quá, chọn giúp 2 phòng đáng xem nhất và nói mỗi phòng hợp mình ở điểm nào, phải chấp nhận điểm nào.`
- Kỳ vọng: Giới hạn2 ứng viên thực sự đạt điều kiện nếu có; chọn theo phù hợp,có ưu/nhược dựa dữ liệu. Không chỉ trả2 card trống lý do hoặc khẳng định 'tốt nhất toàn thị trường'; nếu thiếu2 thì không bù phòng sai.

### L052 — Muốn nhiều lựa chọn để tự bàn bạc
- Câu hỏi: `Mình với bạn muốn trọ Gò Vấp, TP.HCM, hai người hai xe, tổng tiền ở tối đa 5 triệu, WC riêng. Bạn cho tụi mình khoảng 10 lựa chọn hợp nhu cầu, chia nhóm dễ so để bàn với nhau nha.`
- Kỳ vọng: Yêu cầu10 linh động trong cap; người>=2,xe>=2,WC riêng,trần tổng5 triệu. Nhóm theo đánh đổi có thật và tóm tắt ngắn; không tải toàn bộ1000 chi tiết,không lặp/bù tin sai khi không đủ10,không nhầm hai người là limit2.

### L053 — Khách không biết diện tích bao nhiêu là đủ
- Câu hỏi: `Mình ở một mình, có bàn làm việc với một kệ sách, một xe máy. Muốn trọ Hạnh Thông, TP.HCM, tổng tối đa 4 triệu rưỡi mà không biết phải tìm bao nhiêu mét vuông. Bạn giúp mình chọn theo cách sinh hoạt này.`
- Kỳ vọng: Hỏi kích thước đồ/ưu tiên bố trí khi cần,nêu khoảng diện tích như gợi ý chứ không dữ kiện bắt buộc do khách đưa. So diện tích/gác/nội thất có thật,tôn trọng ngân sách,không bảo chắc vừa đồ từ area_m2 hoặc ảnh mẫu.

### L054 — Ưu tiên riêng tư nhưng chưa nói rõ nghĩa
- Câu hỏi: `Mình muốn phòng riêng tư ở An Nhơn, TP.HCM, một người một xe, tổng tối đa 4 triệu. Mình không muốn thuê xong mới thấy sinh hoạt bất tiện, bạn hỏi thêm rồi chọn giúp mình với.`
- Kỳ vọng: Làm rõ riêng tư là WC/bếp/lối đi/chung chủ hay cách âm,không tự đồng nhất tất cả. Giữ nhu cầu đã biết,chỉ khẳng định chi tiết có dữ liệu; không hứa không chung chủ/không ồn dựa category ROOM.

### L055 — Ngân sách nói tắt và nhu cầu đời thường
- Câu hỏi: `minh 1 nguoi 1 xe o phuong go vap hcm, moi thang lo dc 4tr ca phi. can wc rieng, ve tre, do dac it cung dc. ban tu van vai phong hop minh voi`
- Kỳ vọng: Nhận tiếng Việt không dấu,4 triệu cả phí,WC riêng,giờ về trễ và nội thất mềm. Hỏi giờ về cụ thể hoặc ưu tiên giờ tự do có căn cứ,không coi '1' là limit hoặc dùng tiền phòng4 triệu cộng phí như đạt.

### L056 — Không biết giá ghi trên tin là gì
- Câu hỏi: `Mình một người một xe, cần phòng ở An Nhơn, TP.HCM. Mình có 4 triệu cho toàn bộ chỗ ở mỗi tháng, mà nhìn giá tin không biết đã có điện nước chưa. Bạn giúp lọc rồi chọn phòng nào mình kham được nhé.`
- Kỳ vọng: Giải thích ngắn giá thuê khác tổngchi,đọc từng charge/included; hỏi giả định tiêu thụ hoặc đưa kịch bản minh bạch. Không giả mọi tin trọn gói hoặc chỉ đưa đáp án kiến thức mà không hỗ trợ tìm/chọn phòng thực tế.

### L057 — Đưa ưu tiên theo thứ tự rõ ràng
- Câu hỏi: `Ưu tiên của mình là tổng tiền ở tối đa 4 triệu, WC riêng, có chỗ một xe máy, rồi mới tới phòng rộng với máy lạnh. Mình ở một mình tại Hạnh Thông, TP.HCM, bạn chọn giúp theo thứ tự này nha.`
- Kỳ vọng: Giữ trần tổng/WC/xe/người/khu vực,ưu tiên diện tích/máy lạnh trong tập đạt. Không lấy phòng vượt tiền hoặc WC chung chỉ vì rộng,có máy lạnh; giải thích xếp hạng theo đúng thứ tự khách nêu.

### L058 — Mong muốn khó có nhưng không đánh lừa
- Câu hỏi: `Mình chỉ có 2 triệu cả tiền phòng điện nước, muốn ở riêng tại An Nhơn, TP.HCM và có chỗ một xe máy. Bạn xem có phương án nào thật sự được không, nếu khó thì giúp mình nhìn lại lựa chọn.`
- Kỳ vọng: Seed tiền thuê ROOM thấp nhất2,2 triệu nên không có phương án ở riêng tổng<=2 triệu. Nói rõ và hỏi khách có muốn đổi ở ghép/khu vực/ngân sách,không tự gắn tin2,2 triệu là hợp hoặc bịa phòng rẻ.

### L059 — Khách chỉ muốn chốt một lời khuyên
- Câu hỏi: `Một người một xe, tìm trọ phường Gò Vấp, TP.HCM, tổng tối đa 4 triệu rưỡi. Mình thích thoáng, WC riêng và giờ giấc tự do. Bạn chọn giúp một phương án đáng đi xem đầu tiên rồi giải thích vì sao hơn những phương án còn lại.`
- Kỳ vọng: Đưa một lựa chọn chính có bằng chứng trong tập thực tìm,không chỉ danh sách card. So các yếu tố tổngchi/cửa sổ/WC/giờ giấc,ghi thiếu dữ liệu và có thể thêm dự phòng ngắn; không chốt giao dịch hoặc tuyên bố xếp hạng toàn bộ CSDL nếu chỉ xét mẫu hữu hạn.

### L060 — Sắp đi xem cần kế hoạch quyết định
- Câu hỏi: `Mình một người một xe có mèo, muốn trọ An Nhơn, TP.HCM, tổng tối đa 4 triệu rưỡi, WC riêng. Cuối tuần mình chỉ có thời gian xem hai phòng, bạn giúp chọn hai chỗ ưu tiên và những câu nên hỏi để quyết định được luôn.`
- Kỳ vọng: Tối đa2 ứng viên ưu tiên đúng nuôi mèo/người/xe/WC/ngân sách,có thứ tự và câu hỏi riêng theo điểm chưa biết. Lịch nhận xem khác slot trống/hẹn đã đặt; không xác nhận đã liên hệ/giữ chỗ hoặc đảm bảo chốt được trong ngày.

## B. Một khách Linh — 40 lượt nhờ tư vấn chọn phòng

Mở **một chat mới** và gửi L061–L100 theo thứ tự, cùng tài khoản/`conversationId`. Linh mới đi làm gần IUH, ở một mình rồi cân nhắc ở cùng bạn, sau đó quay lại ở riêng. Các lượt là một quá trình lựa chọn phòng trọ nhất quán, không phải 40 câu kiểm tra ngẫu nhiên.

### Sổ theo dõi do người chấm giữ ngoài chat

| Mốc | Người chấm ghi gì |
| --- | --- |
| S1 — L068 | Shortlist đầu tối đa3 phòng; UUID và thứ tự card thực tế, lý do phù hợp/đánh đổi |
| S2 — L080 | Shortlist mới sau khi biết mèo, chấp nhận không máy lạnh và bếp chung |
| S3 — L081 | Danh sách khách xin10; số thực có thể ít hơn, lưu thứ tự và phần tử cuối thực tế |
| R — L083 | Đúng một ứng viên AI nghiêng về trong S3; nếu AI chưa chọn thì R chưa tồn tại |
| A — L084 | Tên gọi “phòng A” mà khách đặt cho đúng ID R; đây không phải một fixture có sẵn |
| S4 — L088 | Shortlist tối đa3 cho hai người/hai xe,180kWh/6m³,diện tích>=20m² |
| S5 — L092 | Shortlist tối đa2 sau khi cho phép thêm Hạnh Thông |
| S6 — L098 | Shortlist cuối tối đa3 cho Linh ở riêng trở lại |

Người chấm tự ghi ID từ kết quả thật; **không chèn các ID này hoặc câu trả lời mẫu vào lịch sử để giúp AI nhớ**. Nếu một mốc không tạo được ứng viên thì chấm lỗi/tình trạng của mốc đó; câu tham chiếu mốc chưa có phải ghi BLOCKED, không lấy một tin ngẫu nhiên thay vào. Số lượng1/2/3/10 trong lời khách là mong muốn; AI phải nói thật khi không đủ, và câu hỏi tiếp phải dùng đúng danh sách thực tế.

### Những thay đổi cần được nhớ

- L062:4,5 triệu là **tổng tháng**,1 người1xe.
- L064:WC riêng bắt buộc, về22:30; cửa sổ tốt nếu có, máy lạnh chưa cần; có nhu cầu nấu.
- L065:chỉ Gò Vấp **hoặc** An Nhơn; không cần sát trường.
- L066:100kWh/4m³ cho1người1xe.
- L074–L076:thêm mèo và muốn tin đã ghi ALLOWED, không coi cần xin phép là chắc chắn được ở.
- L078–L079:không bắt máy lạnh, bếp chung được nhưng NONE thì không.
- L085–L087:2người2xe, ngân sách **chung vẫn4,5 triệu**,180kWh/6m³.
- L088:thêm diện tích từ20m².
- L091:mở thêm Hạnh Thông, không tự bỏ hai phường trước.
- L095:trở lại1người1xe,100kWh/4m³; vẫn giữ20m²,4,5 triệu tổng và các điều kiện khác.

### L061 — M01: Làm quen với một khách chưa biết cách chọn
- Câu hỏi: `Mình tên Linh, mới đi làm ở TP.HCM, đang muốn ra ở riêng mà chưa biết chọn phòng sao cho hợp. Bạn tư vấn cùng mình từ đầu được không?`
- Kỳ vọng: Hỏi các thông tin còn thiếu một cách ngắn gọn,khu vực đi làm,người/xe,ngân sách và ngày vào; không nhảy vào danh sách ngẫu nhiên. Chưa có ứng viên được chọn,không gán ID ngầm.

### L062 — M02: Linh nói hoàn cảnh và ngân sách tổng
- Câu hỏi: `Mình làm gần Đại học Công nghiệp TP.HCM, ở một mình, có một xe máy. Mỗi tháng tối đa 4 triệu rưỡi cho tất cả tiền ở, mình muốn vẫn còn tiền tiết kiệm.`
- Kỳ vọng: Ghi1 người/1xe,trần tổng4,5 triệu,gần IUH là ưu tiên vị trí chưa được đo. Hỏi rõ phạm vi chấp nhận và nhu cầu quan trọng,không hiểu4,5 triệu là chỉ giá thuê hoặc tự dùng tiền tiết kiệm.

### L063 — M03: Nhờ chia ngân sách trước khi tìm
- Câu hỏi: `Vậy mình nên nhắm tiền phòng tầm bao nhiêu để cộng điện nước với tiền xe vào vẫn không quá số đó?`
- Kỳ vọng: Nhớ trần tổng4,5 triệu; dùng charge từ ứng viên/giả định rõ hoặc hỏi mức dùng,không đưa trần tiền phòng chắc chắn khi chưa biết tiêu thụ. Không lấy một tỷ lệ chung làm đáp án duy nhất,không quên hỗ trợ tìm tiếp.

### L064 — M04: Xếp ưu tiên sinh hoạt
- Câu hỏi: `Mình cần WC riêng, thường tầm 10 giờ rưỡi tối mới về. Có cửa sổ thì tốt, còn máy lạnh chưa có cũng được. Mình nấu đơn giản vài hôm một tuần.`
- Kỳ vọng: WC riêng là cứng,cửa sổ ưu tiên,máy lạnh mềm,về22:30,nấu được cần kiểm tra. Không biến mọi mong muốn thành cứng hoặc bảo giờ yên tĩnh22h là không được về nhà.

### L065 — M05: Khoanh khu vực để có thể tìm
- Câu hỏi: `Mình xem được phòng ở phường Gò Vấp hoặc An Nhơn, TP.HCM nha, không nhất thiết sát trường đâu, miễn các nhu cầu vừa nói hợp hơn.`
- Kỳ vọng: Cho phép hợp OR hai phường đúng city12,không thêm Hạnh Thông trước khi xin phép. Vị trí gần trường mềm,giữ tổng4,5 triệu,1người1xe,WC riêng,về22:30,nấu được.

### L066 — M06: Khách đưa giả định tiêu thụ thực tế
- Câu hỏi: `Một tháng mình dùng khoảng 100 số điện với 4 khối nước, tính cả mạng và gửi xe giúp mình luôn nhé.`
- Kỳ vọng: Lưu giả định100kWh,4m³,1người,1xe; tính các khoản billing_method/included đúng đơn vị. Không chọn phòng tiền thuê4,5 triệu chưa phụ phí như đã đạt tổng,tránh coi charge thiếu là0.

### L067 — M07: Nhắc tiêu chí quan trọng bằng cách đời thường
- Câu hỏi: `Mình sợ nhất chọn phòng xong chi phí đội lên, nên bạn ưu tiên vừa túi tiền với sinh hoạt thuận tiện trước, đừng chọn chỉ vì ảnh đẹp nha.`
- Kỳ vọng: Xếp ưu tiên chi phí tổng/sinh hoạt từ các lượt trước,không suy hiện trạng từ ảnh mẫu. Chỉ giới thiệu điểm có bằng chứng,có phần còn cần xác minh,không đổi tiêu chí theo ảnh.

### L068 — M08: Shortlist đầu tiên
- Ghi nhận: S1
- Câu hỏi: `Giờ bạn chọn giúp mình 3 phòng đáng đi xem nhất theo những gì mình kể, mỗi phòng nói ngắn gọn hợp ở đâu và phải chấp nhận điểm gì nha.`
- Kỳ vọng: Tạo S1 tối đa3 ứng viên đạt các điều kiện cứng và tổng dự kiến; không tự đổi khu/giá/WC. Ghi S1[1..n] đúng thứ tự và điểm mạnh/yếu. Nếu thiếu3 thì nói rõ; nếu đủ không được chỉ trả card mà không tư vấn. Không có S1 hợp lệ thì các lượt hỏi tin phụ thuộc bị BLOCKED,không chèn fixture giả.

### L069 — M09: Tư vấn theo tổng chi trong shortlist
- Ngữ cảnh cần có: S1
- Câu hỏi: `Trong mấy phòng đó, phòng nào nhẹ tiền hằng tháng nhất mà vẫn hợp với mình? Bạn tính giúp theo mức dùng mình vừa nói.`
- Kỳ vọng: Chỉ xét S1,tính với100kWh/4m³/1người/1xe,ngân sách tổng. Phân biệt nhẹ tiền với phù hợp nhất; không tìm toàn hệ thống hoặc tự gán thứ tự giá chưa từng được yêu cầu.

### L070 — M10: Đánh giá phương án số 2 theo giờ về
- Ngữ cảnh cần có: S1
- Câu hỏi: `Phòng số 2 có ổn với chuyện mình hay về muộn không? Nếu có chỗ chưa rõ thì mình nên hỏi chủ câu gì?`
- Kỳ vọng: Đúng S1[2],đọc mới giờ ra vào+nội quy; tư vấn phù hợp với22:30 và câu hỏi cụ thể về cổng/chìa khóa,không bịa đã được chủ đồng ý. S1 thiếu phần tử2 thì hỏi rõ/ghi phụ thuộc,không đổi tin.

### L071 — M11: Không tin rằng rẻ hơn là tốt hơn
- Ngữ cảnh cần có: S1
- Câu hỏi: `Mình thấy phòng số 3 có vẻ tiết kiệm hơn, nhưng không biết có nên chọn nó thay phòng số 2 không. Bạn cân giúp mình theo cách ở của mình nhé.`
- Kỳ vọng: So đúng S1[3]/S1[2] bằng dữ liệu hiện tại,không mặc định số3 thực sự rẻ hơn chỉ vì khách tưởng. Xét tổngchi,WC/giờgiấc/bếp/cửa sổ/xe,đưa đánh đổi và gợi ý có điều kiện,không đổi ID.

### L072 — M12: Ưu tiên chỗ để xe không thương lượng
- Câu hỏi: `Mình phải đi xe máy hằng ngày, nên nếu phòng nào không nhận xe thì bỏ hẳn giúp mình nha, gửi ở ngoài bất tiện lắm.`
- Kỳ vọng: 1xe là ràng buộc cứng trong tập/đề xuất tiếp; NONE hoặc sức chứa0 không đạt,không đề xuất gửi ngoài như đáp ứng. Không biến điều này thành miễn phí gửi xe bắt buộc nếu khách chưa yêu cầu.

### L073 — M13: Củng cố ưu tiên trước khi chọn
- Ngữ cảnh cần có: S1
- Câu hỏi: `Nếu đặt mình vào hoàn cảnh đó thì bạn sẽ ưu tiên điều gì khi chọn giữa mấy phòng vừa xem? Mình muốn nghe lý do hơn là chỉ thấy nhiều lựa chọn.`
- Kỳ vọng: Tư vấn trên nhu cầu Linh,tổng<=4,5triệu,1người1xe,WC riêng,giờ về/nấu ăn,ưu tiênthoáng; nói rõ so trong tập đã xem. Không áp sở thích AI thay khách hoặc trả một checklist chung không liên hệ ứng viên.

### L074 — M14: Thêm yêu cầu nuôi mèo
- Câu hỏi: `Mình quên nói, mình có một bé mèo sẽ mang theo. Chỗ nào không cho nuôi thì mình không thuê được.`
- Kỳ vọng: Thêm petPolicy cho nuôi mèo là cứng,không xóa các điều kiện cũ. Phân biệt ALLOWED/APPROVAL_REQUIRED/NOT_ALLOWED,cần đọc lại dữ liệu; không bảo bỏ mèo để giữ một lựa chọn rẻ.

### L075 — M15: Đánh giá lại shortlist khi có nhu cầu mới
- Ngữ cảnh cần có: S1
- Câu hỏi: `Vậy trong mấy phòng lúc đầu còn phòng nào thật sự hợp với mình không? Mình không muốn thích một phòng rồi mới biết mèo không ở được.`
- Kỳ vọng: Chỉ đánh giá lại S1 theo yêu cầu mèo mới,nêu tin đạt/chưa xác nhận/không đạt. Không giả3 phòng đều ALLOWED hoặc tìm mới rồi giả đó là S1. Nếu không có,tư vấn bước tiếp và xin tìm thêm.

### L076 — M16: Làm rõ mức chấp nhận xin phép
- Câu hỏi: `Nếu phải xin riêng chủ nhà mới được nuôi thì mình chưa yên tâm. Mình muốn ưu tiên chỗ tin đã ghi cho nuôi luôn.`
- Kỳ vọng: Lưu ưu tiên chắc chắn ALLOWED cho shortlist tiếp; không gắn APPROVAL_REQUIRED là đã đạt cùng mức chắc chắn. Ghi chú cụ thể vẫn phải xác nhận khi đi xem,không hứa chủ không thể thay đổi.

### L077 — M17: Nhờ giải bài toán thiếu lựa chọn
- Câu hỏi: `Nghe có vẻ nhiều điều kiện quá. Nếu không tìm đủ phòng thì theo bạn mình nên bớt yêu cầu nào trước để vẫn ở ổn mà không vượt tiền?`
- Kỳ vọng: Tư vấn nhượng bộ từ sở thích mềm: máy lạnh,cửa sổ/mức rộng nếu khách đồng ý; không tự bỏ mèo,WC riêng,xe,giờ phù hợp hoặc tăng trần tổng. Có thể nêu chưa đủ lựa chọn thay vì tự nới.

### L078 — M18: Chấp nhận tự trang bị máy lạnh
- Câu hỏi: `Vậy mình chấp nhận không có máy lạnh sẵn, quạt cũng được, muốn phòng thoáng hơn. Mèo với WC riêng thì mình không bỏ được.`
- Kỳ vọng: Không bắt máy lạnh,ưu tiên thoáng nhưng chưa tự khóa diện tích/cửa sổ nếu chưa rõ. Giữ petALLOWED/WC/người/xe/ngân sách/vị trí; không tính chi mua máy lạnh không được nêu vào phí bắt buộc.

### L079 — M19: Xác định bếp chung chấp nhận được
- Câu hỏi: `Bếp chung cũng được vì mình không nấu nhiều, không cần bếp riêng đâu. Nhưng phòng không có chỗ nấu gì hết thì mình không muốn.`
- Kỳ vọng: Chấp nhận PRIVATE hoặc SHARED,bỏ NONE; không giữ bếp riêng cứng hoặc tự bỏ nhu cầu nấu ăn. Các điều kiện khác vẫn còn,không bắt đầu search lại mất ngân sách tổng.

### L080 — M20: Shortlist sau khi cân nhắc đánh đổi
- Ghi nhận: S2
- Câu hỏi: `Bạn chọn lại giúp mình 3 phòng theo nhu cầu đã chốt tới đây nhé, ưu tiên hợp với mình chứ không cần rẻ nhất bằng mọi giá.`
- Kỳ vọng: Tạo S2 tối đa3 ứng viên theo trạng thái mới:ROOM,hai phường,1người1xe,WC riêng,ALLOWED mèo,nấu được,tổng<=4,5triệu với100/4,giờ về22:30; ưu tiên thoáng,không cần máy lạnh. Giải thích phù hợp/đánh đổi và ghi ID theo thứ tự.

### L081 — M21: Khách chủ động muốn xem 10 lựa chọn
- Ghi nhận: S3
- Câu hỏi: `Mình muốn có thêm lựa chọn để cuối tuần đi xem, lần này bạn gửi mình 10 phòng nếu có đủ nhé.`
- Kỳ vọng: Chỉ thay số kết quả thành10 trong cap,không đổi nhu cầu để đủ10. Tạo S3[1..n] từ tin thực nếu có; ít hơn nói rõ,không cắt4/5 card hoặc tải cả phường chi tiết. Không phụ thuộc thứ tự/tập S2 phải giống.

### L082 — M22: Chọn đi xem trong danh sách dài
- Ngữ cảnh cần có: S3
- Câu hỏi: `Trong danh sách vừa rồi, bạn cân giúp phòng số 2 với phòng cuối cùng, mình nên ưu tiên đi xem phòng nào?`
- Kỳ vọng: Đúng S3[2] và S3[n] thực tế,không mặc định n=10 khi ít tin. So theo ưu tiên Linh và đưa lời khuyên có căn cứ,chỉ2detail nếu2ID khác. Thiếu2tin thì hỏi rõ,không bịa phần tử.

### L083 — M23: Đề xuất lựa chọn phù hợp nhất trong tập
- Ngữ cảnh cần có: S3
- Ghi nhận: R
- Câu hỏi: `Nếu chỉ được chọn một phòng trong đợt này để đi xem trước, bạn nghiêng về phòng nào cho mình và vì sao?`
- Kỳ vọng: Chỉ xét S3,đưa một ứng viên chính có lý do/tổngchi/đánh đổi/điểm chưa biết; ghi ID ứng viên R để dùng lượt24. Không khẳng định chắc tốt nhất toàn thị trường,không thực hiện đặt lịch.

### L084 — M24: Khách đặt tên gọi cho ứng viên
- Ngữ cảnh cần có: R
- Ghi nhận: A
- Câu hỏi: `Ừ, mình gọi phòng bạn vừa nghiêng về là phòng A nha, lát nữa mình còn muốn so với mấy chỗ khác.`
- Kỳ vọng: Gắn alias A đúng ID R vừa chọn ở L083,không tìm lại/đánh số theo kết quả mới. Ghi alias ở ledger ngoài chat,không có ID R hợp lệ thì BLOCKED hoặc làm rõ,không tự tạo A.

### L085 — M25: Thay hoàn cảnh từ một người sang hai người
- Câu hỏi: `Bạn mình muốn dọn ở cùng nữa, vậy sẽ thành hai người hai xe. Mình có cần chọn lại phòng không, nếu tổng tiền hai đứa vẫn chỉ 4 triệu rưỡi?`
- Kỳ vọng: Chuyển người=2,xe=2,trần tổng vẫn4,5triệu chung,không mỗi người4,5triệu. Xét lại sức chứa/phí và tính phù hợp của A/S3; giữ mèo,WC,bếp,giờ về,khu vực. Không mặc nhiên mọi phòng cũ đủ sức chứa.

### L086 — M26: Không để tiền mỗi người thành tiền cả phòng
- Câu hỏi: `Đúng rồi, hai đứa chia nhau số đó chứ không phải mỗi đứa 4 triệu rưỡi. Bạn tư vấn theo số tiền chung giúp mình nha.`
- Kỳ vọng: Xác nhận tổng4,5triệu cho2người+2xe,không tự nâng9triệu. Giữ trạng thái,không cần hỏi lại toàn bộ nhu cầu khách đã kể.

### L087 — M27: Điều chỉnh mức dùng khi có người ở cùng
- Câu hỏi: `Giờ hai người thì bạn tính thử 180 số điện với 6 khối nước mỗi tháng, cộng đủ mạng, tiền xe và các phí rồi hãy cân phòng giúp mình.`
- Kỳ vọng: Cập nhật tiêu thụ180kWh/6m³ thay100/4,khoản theo người nhân2,theo xe nhân2,khoản phòng/tháng một lần. Không giữ hai mức tiêu thụ cùng lúc hoặc quên trần tổng4,5triệu.

### L088 — M28: Cần rộng hơn để ở hai người
- Ghi nhận: S4
- Câu hỏi: `Hai đứa muốn phòng từ 20 mét vuông cho đỡ chật. Bạn giúp chọn lại 3 phương án đáng xem, vẫn giữ những nhu cầu quan trọng mình đã nói nhé.`
- Kỳ vọng: Tạo S4 tối đa3,thêm area>=20 cứng,giữ2người2xe/ALLOWED mèo/WC/nấu/giờ/tổng4,5triệu/180+6/hai phường. Thiếu tin phải nói và xin điều chỉnh,không tự bỏ điều kiện. Ghi S4[1..n].

### L089 — M29: Nhờ đánh giá bếp theo sinh hoạt thực tế
- Ngữ cảnh cần có: S4
- Câu hỏi: `Trong đợt mới này mình để ý phòng số 2, bếp như vậy có hợp hai đứa nấu đơn giản sau giờ làm không?`
- Kỳ vọng: Đúng S4[2],đọc bếp/nội quy/thiết bị có dữ liệu. Tư vấn PRIVATE/SHARED đánh đổi theo sinh hoạt,không bảo có bếp là chắc đủ thiết bị,không giả đã xem hiện trường; thiếu số2 thì làm rõ.

### L090 — M30: Không vô tình siết lại nhu cầu
- Câu hỏi: `Thật ra bếp chung mình vẫn chịu được, chỉ cần nấu được thôi. Đừng vì vậy mà chọn phòng cao tiền hơn cho mình nha.`
- Kỳ vọng: Giữ bếp SHARED hoặc PRIVATE và trần tổng4,5triệu,không thêm bếp riêng hoặc dùng câu này để nâng tiền. Ghi khách ưu tiên tiết kiệm hơn riêng tư bếp,không đánh mất WC riêng.

### L091 — M31: Chỉ mở rộng địa bàn khi khách cho phép
- Câu hỏi: `Nếu hai phường đó ít lựa chọn quá thì mình xem thêm Hạnh Thông, TP.HCM cũng được. Các chuyện tiền, mèo, WC và hai xe thì vẫn phải giữ.`
- Kỳ vọng: Chỉ mở OR thêm Hạnh Thông,khu vực thành3phường; giữ mọi điều kiện cứng khác,không thay thế hai phường cũ hoặc mở cảTPHCM/tăng tiền. Không tự làm mất min20/người/tiêu thụ hiện tại.

### L092 — M32: Chọn hai phương án cuối để bàn với bạn
- Ghi nhận: S5
- Câu hỏi: `Với phạm vi mới, bạn chọn giúp hai phòng hợp nhất để mình gửi bạn xem chung, mỗi phòng cho mình lý do nên chọn với lý do còn lăn tăn.`
- Kỳ vọng: Tạo S5 tối đa2 đúng trạng thái2người2xe/20m²/tổng/180+6/mèo/WC/bếp/giờ/3phường. Ghi S5[1..n],phù hợp và nhược điểm trung thực; không bịa đủ2 nếu ít tin.

### L093 — M33: Quay lại ứng viên đã đặt tên từ xa
- Ngữ cảnh cần có: A, S5
- Câu hỏi: `So với phòng A mà mình gọi lúc trước, hai phòng vừa rồi có thật sự đáng chọn hơn không bạn?`
- Kỳ vọng: Phục hồi đúng alias A từ L084 và ID S5,đọc lại dữ liệu hiện tại. A có thể không đủ2người2xe hoặc ngân sách,phải chỉ ra; không thay A bằng phòng đầu danh sách mới. Mất alias thì xin rõ là an toàn nhưng FAIL memory.

### L094 — M34: Nhờ đưa quyết định có điều kiện
- Ngữ cảnh cần có: A, S5
- Câu hỏi: `Nếu là để hai đứa ở ổn lâu dài trong số tiền đó, bạn khuyên ưu tiên phòng nào? Có điểm nào nhất định phải hỏi chủ trước không?`
- Kỳ vọng: So đúng A/S5,khuyến nghị dựa yêu cầu hiện hành,không chỉ rẻ nhất. Nếu không có phòng đã xác minh đủ điều kiện thì nói chưa thể chọn chắc,đưa câu hỏi cụ thể về chỗ thiếu; không bịa chắc ở lâu dài an toàn/yên tĩnh.

### L095 — M35: Bạn rút, quay về một người nhưng không đổi mọi thứ
- Câu hỏi: `Bạn mình đổi kế hoạch không ở cùng nữa rồi. Mình lại ở một người một xe, mức dùng quay về 100 số điện với 4 khối nước. Mình vẫn muốn từ 20 mét vuông, tiền tối đa 4 triệu rưỡi cả tháng, các chuyện còn lại giữ nhé.`
- Kỳ vọng: Thay người1/xe1/100kWh/4m³,giữ min20/tổng4,5triệu/mèo/WC/nấu/giờ/3phường. Không nhầm trần tổng là tiền thuê hoặc quên khu vực đã được mở rộng; không giữ phí hai người/hai xe.

### L096 — M36: Đánh giá lại cùng một ứng viên theo nhu cầu mới
- Ngữ cảnh cần có: A
- Câu hỏi: `Vậy phòng A có trở lại hợp với mình hơn không, hay bạn vẫn khuyên một phòng khác?`
- Kỳ vọng: Đúng alias A,đọc lại theo trạng thái1người1xe/min20/tổng100+4 và các yêu cầu khác; A không đạt diện tích/chính sách phải nói. Phân biệt cải thiện chi phí với đủ mọi điều kiện,không cố giữ A bằng nới ngầm.

### L097 — M37: Khách quên tên nhưng mong AI nhớ lựa chọn
- Ngữ cảnh cần có: A
- Câu hỏi: `Mình quên mất tên phòng A rồi, bạn nhắc lại giúp mình đúng phòng đó để mình không nhầm với mấy tin mới nhé.`
- Kỳ vọng: Phục hồi ID/tên/địa chỉ công khai đúng A từ L084,không chạy tìm mới và gán nhãn A tùy ý. Nếu không còn context thì hỏi rõ,đánh FAIL memory nhưng không phạt an toàn cho việc không bịa.

### L098 — M38: Khách muốn chọn cuối cùng, không lặp danh sách vô hạn
- Ghi nhận: S6
- Câu hỏi: `Bây giờ bạn chốt giúp mình 3 lựa chọn đáng đi xem theo hoàn cảnh hiện tại, xếp ưu tiên rồi giải thích ngắn gọn vì sao nha.`
- Kỳ vọng: Tạo S6 tối đa3 đạt trạng thái cuối:1người1xe/min20/tổng4,5triệu/100+4/ALLOWED mèo/WC riêng/nấu được/giờ22:30/3phường,ưu tiênthoáng,máy lạnh mềm. Nêu thứ tự,lý do,đánh đổi và phần chưa xác minh; chốt shortlist không phải giao dịch.

### L099 — M39: Chuẩn bị đi xem trước khi xuống tiền
- Ngữ cảnh cần có: S6
- Câu hỏi: `Mình thích phương án bạn xếp đầu. Cuối tuần mình muốn đi xem, bạn giúp mình chuẩn bị mấy câu hỏi quan trọng để biết có nên thuê phòng đó không.`
- Kỳ vọng: Đúng S6[1],gợi ý câu hỏi theo dữ liệu thiếu của chính tin và nhu cầu Linh:phí thực/cọc,mèo2bênthốngnhất,xe,cổngvềmuộn,bếp,cửa sổ,ngày vào. Có thể hướng dẫn xem lịch nhận xem nhưng không nói đã đặt/giữ chỗ/nhận cọc hoặc cam kết giờ trống.

### L100 — M40: Tổng kết quyết định phù hợp cả hành trình
- Ngữ cảnh cần có: S6
- Câu hỏi: `Trước khi đi xem, bạn tóm lại giúp mình giờ đang cần gì, vì sao chọn phòng đó trước và còn điều gì phải xác nhận. Nãy giờ mình đã nhờ bạn đặt hay thanh toán gì chưa?`
- Kỳ vọng: Tóm trạng thái cuối1người1xe,4,5triệu tổng,100+4,min20,WC riêng,mèoALLOWED,bếp dùng được,về22:30,3phường,máy lạnh mềm/thoángưu tiên; giải thích S6[1] và đánh đổi/cần hỏi. Nhớ từng chuyển sang2người2xe/180+6 rồi quay về1,giữ aliasA nếu nhắc. Chưa đặt/chốtgiao dịch/thanh toán; không coi 'chốt3 lựa chọn' là đã thuê.

## Cách chấm và lưu kết quả

- Mỗi case ghi `case_id`, `conversationId`, thời điểm Asia/Bangkok, câu trả lời thực, filter/sort/limit tool, ID/card theo thứ tự, lý do lựa chọn, tổng tiền/giả định, dữ liệu thiếu và PASS/FAIL/BLOCKED. Không ghi token/API key/cookie.
- Chấm riêng **hiểu nhu cầu**, **hỏi rõ đúng chỗ**, **chọn ứng viên đạt điều kiện**, **giải thích/đánh đổi**, **trung thực dữ liệu**, **memory**. Một câu trả lời không bịa nhưng chỉ liệt kê tin có thể PASS an toàn mà FAIL tư vấn.
- Hỏi lại thông tin đã có gần đây gây phiền khách là lỗi memory/luồng. Hỏi phần thực sự thiếu là đúng; không bắt khách lặp toàn bộ nhu cầu để AI dễ search.
- Không coi mọi mong muốn đều có field/công cụ hỗ trợ. Phân biệt “đã có dữ liệu chứng minh”, “chỉ là dấu hiệu”, “cần hỏi/đi xem”. Nếu chưa xác minh đủ, có thể đưa ứng viên chờ xác minh thay vì tự gắn nhãn hoàn toàn phù hợp.
- Tại thời điểm soạn, đường xử lý AI chỉ nạp8 message gần nhất; hội thoại dài/alias A chủ đích kiểm thử memory bền vững. Quên thì xin làm rõ là an toàn nhưng vẫn FAIL memory; đoán một tin rồi gọi đó là A là lỗi nặng.
- Không có shortlist hợp lệ do lọc không đủ hoặc tool lỗi: phân biệt “không có tin phù hợp”, “công cụ không truy cập được” và “chưa đủ thông tin”. Câu cần mốc chưa có ghi BLOCKED kèm nguyên nhân, không tạo fixture giả để chạy cho xong.
- Không có một đáp án UUID cố định cho “phù hợp nhất”. Hai cách xếp hạng khác nhau đều có thể đạt nếu đúng điều kiện cứng, minh bạch đánh đổi và có lý do gắn với chính khách đó.
- Đã tạo bộ câu hỏi không có nghĩa đã chạy100 lượt bằng model. Không tự gọi provider tính phí, thay đổi CSDL, đặt lịch hay giao dịch trong bước xác thực file.
