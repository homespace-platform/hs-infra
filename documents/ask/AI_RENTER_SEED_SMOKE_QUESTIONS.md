# Câu hỏi test nhanh AI tìm phòng trên seed hiện tại

Số tin kỳ vọng được đếm trực tiếp (chỉ đọc) trên `homespace_core` ngày 29/10/2026: 300 tin công khai ở
Hạnh Thông (49), An Nhơn (109), Gò Vấp (142). Phòng trọ trong seed giá 2,2–4,5 triệu; căn hộ từ 5,25 triệu;
nhà nguyên căn từ 10 triệu. Trợ lý mặc định hiển thị 5 tin, nên "kỳ vọng" là **tổng số tin khớp**; mọi thẻ
hiển thị phải thỏa hết điều kiện.

Cách test:
- Mỗi câu ở mục A–D dùng **một cuộc trò chuyện mới**. Tiêu chí được nhớ trong cùng cuộc trò chuyện, nên hỏi
  nối tiếp sẽ cộng dồn điều kiện của câu trước.
- Mục E là một cuộc trò chuyện nhiều lượt, gửi lần lượt.
- Lưu ý về seed: **không tin nào vừa có thang máy vừa có cửa sổ**, và không có siêu thị trong dữ liệu tiện ích
  xung quanh. Câu nào ghép các điều kiện này thì rỗng là đúng.

## A. Tìm có kết quả

| # | Câu hỏi | Kỳ vọng |
|---|---|---|
| A1 | Tìm phòng trọ ở Hạnh Thông, TP.HCM, giá dưới 4 triệu. | 12 tin, đều là phòng trọ < 4.000.000 |
| A2 | Mình cần thuê ở Hạnh Thông, Hồ Chí Minh, cho ba người, không quá 4 triệu, WC riêng và có cửa sổ. | 3 tin; không có điều kiện "gần trường" nào |
| A3 | Căn hộ ở An Nhơn, HCM có thang máy, tối đa 10 triệu. | 23 tin |
| A4 | Phòng trọ ở Gò Vấp có gác lửng, WC riêng, dưới 4 triệu. | 3 tin |
| A5 | Nhà nguyên căn ở Gò Vấp tối đa 15 triệu, ít nhất 3 phòng ngủ. | 13 tin |
| A6 | Phòng ở An Nhơn cho nuôi thú cưng, tối đa 4 triệu. | 9 tin; chỉ "cho phép", không tính "cần xin phép" |
| A7 | Phòng trọ ở Gò Vấp giờ giấc tự do, có ban công riêng. | 19 tin |
| A8 | Phòng trọ ở Hạnh Thông được gửi xe máy miễn phí. | khoảng 8 tin (phí giữ xe máy đã gồm trong tiền phòng) |
| A9 | Căn hộ ở Hạnh Thông có hồ bơi. | 1 tin |
| A10 | Phòng trọ ở An Nhơn rộng từ 25 m2, dưới 4 triệu rưỡi. | 19 tin |
| A11 | Phòng ở Gò Vấp dọn vào được ngay, dưới 4 triệu. | 9 tin |
| A12 | Phòng trọ hoặc căn hộ ở An Nhơn cho 3 người, dưới 6 triệu. | 16 tin; không có nhà nguyên căn |
| A13 | Phòng trọ ở An Nhơn hoàn cọc trong vòng 7 ngày. | 21 tin |
| A14 | Phòng trọ ở Gò Vấp cho khách ở qua đêm. | 19 tin |
| A15 | Cho mình xem 10 phòng trọ ở Gò Vấp dưới 4 triệu. | hiển thị 10 trên tổng 31 tin |

## B. Địa điểm mốc và tiện ích xung quanh

| # | Câu hỏi | Kỳ vọng |
|---|---|---|
| B1 | Tìm phòng trọ gần IUH dưới 4 triệu. | Hỏi chọn 1 trong 2 điểm "Đại học Công nghiệp TP.HCM", không tìm ngay. Trả lời "điểm thứ nhất" thì tìm trong 2 km: 59 tin, vẫn giữ < 4 triệu |
| B2 | Phòng trọ trong vòng 1 km quanh Trường Đại Học Công Nghiệp Thành Phố Hồ Chí Minh, dưới 4 triệu. | 21 tin, sắp theo khoảng cách đường chim bay |
| B3 | Phòng trọ ở Hạnh Thông có cửa hàng tiện lợi trong vòng 1 km. | 18 tin |
| B4 | Phòng trọ ở An Nhơn gần bệnh viện trong 1 km. | 7 tin; nhà thuốc không được tính là bệnh viện |
| B5 | Phòng trọ ở Gò Vấp gần bệnh viện trong 1 km. | 0 tin; phải nói là **chưa có dữ liệu**, không nói "không có bệnh viện" |
| B6 | Phòng trọ ở An Nhơn gần siêu thị trong 500 m. | 0 tin, kèm số tin chưa đủ dữ liệu; không lấy cửa hàng tiện lợi thay siêu thị |
| B7 | Tìm phòng ở Hạnh Thông gần phòng gym. | Tìm theo khu vực và báo gym gần nhà chưa có dữ liệu; không lọc "gym trong tòa nhà" |

## C. Phải hỏi lại

| # | Câu hỏi | Kỳ vọng |
|---|---|---|
| C1 | Tìm phòng có thang máy. | Hỏi khu vực, chưa tìm. Trả lời "Gò Vấp, HCM" thì tìm, vẫn giữ thang máy |
| C2 | Phòng trọ ở An Nhơn từ 5 đến 4 triệu. | Hỏi chốt khoảng giá, không tự đảo |
| C3 | Ở Hạnh Thông có nước tính theo khối, đơn giá tối đa 25 nghìn không? | Tìm theo đơn giá nước (seed 12–21 nghìn/m³), **không** lọc tiền thuê ≤ 25 nghìn |

## D. Rỗng phải trung thực

| # | Câu hỏi | Kỳ vọng |
|---|---|---|
| D1 | Phòng trọ ở Gò Vấp có thang máy và có cửa sổ. | 0 tin; liệt kê điều kiện đang giữ, hỏi muốn bỏ điều kiện nào; không tự nới |
| D2 | Phòng trọ ở Hạnh Thông dưới 2 triệu. | 0 tin; không đưa tin giá cao hơn |
| D3 | Làm sao để đặt lịch xem phòng? | Trả lời hướng dẫn (nhánh hỗ trợ), không tìm phòng |

## E. Một cuộc trò chuyện nhiều lượt

| Lượt | Câu hỏi | Kỳ vọng |
|---|---|---|
| E1 | Tìm phòng trọ ở Gò Vấp, HCM dưới 4 triệu. | 31 tin |
| E2 | Chỉ giữ phòng có WC riêng. | 21 tin; vẫn Gò Vấp, < 4 triệu |
| E3 | Tăng ngân sách lên tối đa 4 triệu rưỡi. | 32 tin; vẫn WC riêng |
| E4 | Phòng số 2 có máy lạnh không? | Chỉ đọc phòng số 2, không đổi bộ lọc |
| E5 | So sánh phòng 1 và phòng 3 về giá, WC và đồ có sẵn. | Bảng so sánh 2 phòng đang hiển thị |
| E6 | Cho mình xem thêm tin khác. | 5 tin mới, không lặp |
| E7 | Bỏ yêu cầu WC riêng. | Quay lại Gò Vấp, ≤ 4,5 triệu, không còn WC riêng |
| E8 | Bắt đầu lại, tìm căn hộ ở An Nhơn có thang máy. | 38 tin; không còn điều kiện cũ |
