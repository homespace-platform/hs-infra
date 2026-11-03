---
document_id: hs-knowledge-rental-workflows
title: Xử lý trước thuê, biên bản nhận nhà và chấm dứt sớm theo thỏa thuận
audience: [tenant, landlord, admin]
visibility: public
status: draft
version: 0.1.0
locale: vi-VN
last_reviewed: 2026-11-03
---

# Cọc đã nhận nhưng chưa hoàn tất ký

Mở mục “Xử lý cọc và ký trước khi thuê” trong hồ sơ yêu cầu thuê. Tenant hoặc landlord gửi đề nghị kèm lý do/chứng cứ, bên kia phản hồi. Nhánh mới hoàn toàn bộ tiền thực nhận; chưa ký không tự bị tịch thu cọc. Hạn phản hồi mặc định 48 giờ, có cấu hình; hạn cụ thể phải đọc từ hồ sơ hiện tại. Chủ nhà chỉ kết thúc sau hạn bằng thao tác riêng khi đã liên hệ khách, phòng chưa bàn giao/đã nhận lại đầy đủ và cam kết hoàn toàn bộ tiền. Hết giờ không tự xử lý tiền.

Chữ ký đang xử lý, kết quả ký chưa rõ hoặc khoản chuyển đang đối soát phải được kiểm tra trước khi giải phóng phòng. Tạo nghĩa vụ hoàn chưa phải đã trả tiền; người nhận phải xác nhận thực nhận ở mục thanh toán. HĐ cọc, HĐ thuê và các chứng từ đã có được giữ riêng.

# Khiếu nại và tiếp tục thuê

Khi báo vấn đề từ đề nghị, biên bản nhận nhà hoặc thỏa thuận chấm dứt, hệ thống chụp đúng phiên bản nguồn và chứng cứ đã gắn, gồm chứng cứ của bên còn lại, để HomeSpace xem khi tiếp nhận. Bằng chứng mới chỉ upload nhưng chưa gắn vào hồ sơ không tự được chia sẻ.

Hai bên trao đổi; khi không thống nhất hoặc hết SLA thì chuyển HomeSpace theo quyền trong hồ sơ. Admin tiếp nhận, yêu cầu bổ sung và kết luận có lịch sử. Đóng khiếu nại không tự nhận tiền, xóa nợ hoặc đồng ý tiếp tục thuê.

Nếu vẫn muốn tiếp tục hồ sơ trước thuê sau khi khiếu nại được giải quyết, chọn “Đề nghị tiếp tục thuê / ký”; bên còn lại chọn “Đồng ý tiếp tục thuê / ký”. Hệ thống kiểm tra lại nguồn, thanh toán và chữ ký trước khi mở bước tiếp theo. Không cần lập rồi rút một đề nghị hủy khác. Thời hạn thanh toán đã quá hạn phải được chủ nhà mở lại/đối soát qua thao tác thanh toán hợp lệ; không ghi lùi ngày thuê hoặc nhận tiền giả.

# Biên bản nhận nhà

Chủ nhà lập sau HĐ thuê đã ký đủ, ghi ngày giờ thực tế, số chìa khóa, hiện trạng, tài sản/số lượng/tình trạng, ảnh/PDF và công tơ. Hai bên xem và xác nhận đúng bản. Sửa nội dung tạo bản mới, giữ lịch sử. Có thể báo không bàn giao/sai hiện trạng từ mục này để mở khiếu nại.

Chữ ký HĐ thuê không thay bằng chứng đã trao chìa khóa. Ngày nhận thực tế không tự đổi ngày thuê/hóa đơn. Công tơ trong biên bản là bằng chứng đối chiếu, không tự ghi đè công tơ đã dùng để ký/phát hành hóa đơn.

# Chấm dứt sớm dù không có nợ

Tenant hoặc landlord gửi đề nghị, ghi ngày kết thúc, lý do, cách trả nhà và khoản hoàn tiền thuê theo từng nguồn thực nhận. Bên kia đồng ý, từ chối hoặc gửi bản thay thế. Chưa đồng ý thì chưa chốt ngày kết thúc. Phụ lục/gia hạn đang chờ và chênh lệch cọc chưa đối soát phải xử lý trước.

Ngày kết thúc không bao gồm ngày đó. Ví dụ kết thúc ngày 20/12 thì ngày thuê cuối là 19/12. Hai lựa chọn tiền thuê kỳ cuối:

- Trọn kỳ đã bắt đầu: tính trọn kỳ; khoản hoàn khác ghi riêng và hai bên đồng ý.
- Theo ngày: đơn giá tháng × số ngày thuê / số ngày thực tế của kỳ thuê, làm tròn đến đồng. Kỳ neo theo ngày bắt đầu HĐ, không mặc định là tháng dương lịch. Phải xác định đúng nguồn đã thực nhận; khoản hoàn gồm phần chưa sử dụng được Core tính và ghi đủ vào thỏa thuận. Nếu chưa có tiền thực nhận/phạm vi nguồn chưa rõ, đối soát hóa đơn gốc trước. Không sửa hóa đơn đã phát hành hoặc hoàn khoản tiền chưa nhận. Phí cố định khác, điện/nước theo HĐ/hóa đơn, không tự chia theo ngày.

Đến ngày trả nhà, hai bên xác nhận thực tế. Sau đó hoàn tất hóa đơn cuối, khoản hoàn thuê đã thỏa thuận và quyết toán cọc. Cọc không tự mất toàn bộ vì chấm dứt sớm. Chưa đủ hai xác nhận trả nhà hoặc còn khiếu nại chấm dứt thì chưa chốt cọc. Listing/xe và nghĩa vụ tiền được kiểm soát theo tiến trình; đã trả nhà chưa có nghĩa đã hoàn tiền.

# PDF và lượt ký riêng

Mục “PDF & chữ ký SmartCA riêng” tạo bản PDF từ đúng nội dung biên bản/thỏa thuận đang xem. PDF cũ vẫn tra cứu được nhưng không ký/áp dụng thay bản nguồn mới. Có thể tải PDF để đối chiếu. Khi cấu hình SmartCA và người ký có chứng thư phù hợp, chủ nhà ký trước, người thuê ký sau; hệ thống kiểm chứng đủ chữ ký và PDF cuối trước khi ghi nhận.

Chữ ký của HĐ gốc không được dùng thay lượt ký văn bản riêng. Ký biên bản nhận nhà ghi nhận xác nhận đối với nội dung giao/nhận thực tế của văn bản; ký thỏa thuận chấm dứt ghi nhận thỏa thuận, chưa thay xác nhận trả nhà hay thực nhận tiền. Không có ký giả trong chế độ thử nghiệm. Chưa có sandbox/chứng thư thì chỉ chuẩn bị văn bản và kiểm thử kỹ thuật, không tuyên bố đã nghiệm thu ký thật.

# AI và nguồn dữ liệu

Hỏi cách làm/quy trình dùng tài liệu này. Hỏi “biên bản HĐ của tôi đã xác nhận chưa”, “hồ sơ của tôi đã tiếp tục ký được chưa” hoặc “đã hoàn cọc chưa” phải đọc Core theo tài khoản đang đăng nhập. Tool `get_contract_workflows` chỉ đọc tiến trình của HĐ đã xác định; không tự ký, chấp thuận, xác nhận tiền, sửa hạn hay phán quyết tranh chấp. Dùng trạng thái closure/receipt để kết luận hoàn tất tiền, không suy diễn từ RETURNED hoặc từ PDF.

Hệ thống thông báo đang được xây riêng, không nằm trong thay đổi này. Không hứa đã gửi thông báo, SMS/email hay nhắc hạn khi không có dữ liệu giao nhận thực tế.
