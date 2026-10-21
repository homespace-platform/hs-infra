---
document_id: hs-knowledge-rental-request
title: Yêu cầu thuê và quy trình giữ chỗ
audience: [tenant, landlord]
visibility: public
status: draft
version: 0.2.0
locale: vi-VN
last_reviewed: 2026-10-21
---

# Yêu cầu thuê và quy trình giữ chỗ

## Gửi yêu cầu thuê

Sau khi xem tin và trao đổi các điều kiện, người thuê có thể gửi yêu cầu thuê qua ứng dụng nếu tin và tài khoản đủ điều kiện. Chủ nhà xem yêu cầu rồi chấp nhận hoặc từ chối trong hệ thống. Người thuê có thể hủy yêu cầu khi trạng thái hiện tại cho phép.

Yêu cầu thuê mới bắt buộc người thuê chủ động tích **Tôi đã đọc và đồng ý điều kiện giữ chỗ** trước khi gửi. Checkbox không tích sẵn; cả giao diện và API đều chặn nếu chưa đồng ý. Hệ thống lưu phiên bản điều kiện và thời điểm đồng ý. Đồng ý không có nghĩa chủ nhà tự động giữ cọc: vẫn phải đủ điều kiện vi phạm, thông báo cuối cùng, thời hạn phản hồi và đối soát. Hồ sơ cũ chưa có đồng ý không được tự gán đồng ý hoặc áp dụng hồi tố.

## Khi chủ nhà chấp nhận

Khi chủ nhà chấp nhận, tin chuyển sang giữ chỗ và mở khoản thanh toán đầu tiên. Hạn thanh toán giữ chỗ bắt đầu từ lúc chấp nhận, khác với hạn chờ chủ nhà phản hồi yêu cầu. Các yêu cầu thuê khác vẫn chờ, không tự được chấp nhận. Lịch xem nhà chưa bị hủy chỉ vì một lượt giữ chỗ ngắn hạn; khi tài sản được cho thuê chính thức, hệ thống xử lý các lịch liên quan.

Nếu ngày bắt đầu thuê là hôm nay, khoản chuyển đầu tiên gồm tiền cọc và tiền thuê tháng đầu. Nếu ngày bắt đầu còn ở tương lai, chỉ mở tiền cọc; khi cọc được chủ nhà xác nhận, phòng tiếp tục được giữ đến bước nhận nhà. Tiền tháng đầu được mở vào ngày bắt đầu thuê; không thu lại cọc. Chủ nhà có thể chuẩn bị bản nháp sau khi cọc đã được xác nhận, nhưng chỉ mở ký khi đã đến ngày thuê và tiền tháng đầu đã được xác nhận.

## Đề nghị nhận nhà và bắt đầu hợp đồng sớm

Sau khi cọc đã được xác nhận và chưa mở tiền tháng đầu/chưa bắt đầu ký, người thuê có thể đề nghị một ngày bắt đầu sớm hơn. Chủ nhà xem ngày cũ, ngày mới và các ảnh hưởng rồi quyết định. Ngày đề nghị phải từ hôm nay, trước ngày đã thống nhất và phù hợp khả năng bàn giao/chỗ xe. Chấp nhận sẽ đổi cả ngày bắt đầu thuê, ngày kết thúc và các kỳ hóa đơn, giữ số tháng và đơn giá đã chốt. Ví dụ bắt đầu 25/10 thay cho 01/11 thì kỳ thuê tính từ 25/10; không phải ký 25/10 rồi vẫn chờ 01/11. Đề nghị bị từ chối, rút hoặc hết hạn không làm mất khoản cọc và ngày thuê cũ.

## Đối soát và hủy trước khi ký

Khi chưa báo chuyển hoặc nhận tiền, cả người thuê và chủ nhà có thể bấm **Hủy yêu cầu** ở danh sách hoặc chi tiết, kể cả sau khi chủ nhà đã chấp nhận. Không cần chờ hết hạn giữ chỗ. Hệ thống hủy nghĩa vụ chưa trả, giải phóng chỗ xe và trả tin đăng về trạng thái phù hợp điều kiện hiển thị. Yêu cầu còn chờ duyệt bị hủy không làm mất lượt giữ chỗ của người khác. Tiền cọc bằng 0 là miễn cọc, không phải đã chuyển tiền.

Nếu đã chuyển/nhận tiền ngoài hệ thống, không dùng hủy nhanh dù chưa cập nhật chứng từ: cần báo chuyển hoặc yêu cầu đối soát. Đã báo chuyển, xác nhận tiền, chứng từ bị từ chối/tranh chấp hoặc kết quả ký chưa rõ đều chặn hủy nhanh. AI không suy ra tiền đã hoàn hay phòng đã mở chỉ từ việc người dùng nói muốn hủy; cần kiểm tra kết quả thao tác thực tế.

Hủy có thỏa thuận cũng có thể thực hiện sau khi chủ nhà đã ký nhưng người thuê chưa ký: người thuê gửi đề nghị và chủ nhà đồng ý hoàn từng khoản thực nhận. Chữ ký một bên không bị xóa khỏi lịch sử. Nếu chữ ký người thuê đã có, hai bên đã ký đủ hoặc provider đang xử lý/chưa rõ kết quả, cần đối soát trước; không dùng hủy hồ sơ nhận nhà để bỏ qua kết quả ký.

Đã báo chuyển tiền khác với đã được xác nhận nhận tiền. Quá hạn xác nhận hoặc có tranh chấp thì hồ sơ cần đối soát và phòng tiếp tục được giữ; không tự mở phòng cho giao dịch mới. Nếu chưa bắt đầu ký, người thuê có thể đề nghị hủy và hoàn tiền. Chủ nhà đồng ý sau khi đối soát sẽ tạo nghĩa vụ hoàn từng khoản thực nhận. Người trả thực hiện chuyển khoản, người nhận xác nhận nhận đủ; tạo nghĩa vụ hoàn không có nghĩa tiền đã được chuyển. Không tự tịch thu cọc do quá hạn ký. Quá hạn hoàn tất ký, chủ nhà có thể mở lại hạn sau khi kiểm tra hồ sơ; thời điểm chữ ký thực tế vẫn được giữ đúng.

Người dùng cần xem kỹ số tiền, mục đích thanh toán và hướng dẫn trên màn hình trước khi chuyển khoản. Yêu cầu thuê chưa đồng nghĩa với hợp đồng đã có hiệu lực hoặc quyền sở hữu/thuê đã hoàn tất.

## Khi yêu cầu hết hạn hoặc bị hủy

Trường hợp đã xác nhận cọc nhưng quá hạn trả tháng đầu hoặc quá hạn ký do người thuê có nhánh xử lý riêng. Chỉ áp dụng nếu người thuê đã chủ động đồng ý điều kiện `RESERVATION_DEFAULT_V1` trước thanh toán, chủ nhà có văn bản sẵn sàng và lỗi quá hạn thuộc người thuê. Hạn ký riêng của người thuê bắt đầu sau chữ ký SmartCA thành công của chủ nhà, không tính lúc chủ nhà còn đang chuẩn bị.

Chủ nhà gửi thông báo cuối cùng và mở thêm ít nhất 24 giờ để người thuê thanh toán/ký hoặc phản hồi. Không tự giữ cọc khi vừa hết hạn. Sau thời hạn, chủ nhà phải xác nhận đã thông báo và chưa bàn giao mới có thể chốt hủy, giữ 100% cọc thực nhận. Tiền thuê đã nhận phải tạo nghĩa vụ hoàn riêng; không giữ cả tiền thuê cùng cọc. Đang báo chuyển, tranh chấp, có phản hồi hoặc chưa rõ kết quả ký đều chặn giữ cọc để đối soát. Hồ sơ không có thỏa thuận giữ cọc không được áp dụng hồi tố. Tin chỉ trở lại hiển thị nếu còn đủ điều kiện đăng; lịch sử tiền/chứng từ không bị xóa.

Đây là mô tả nghiệp vụ phần mềm, không phải kết luận pháp lý hay xác nhận một người cụ thể mất cọc. AI không thực hiện chốt giữ cọc và không suy ra kết quả từ việc im lặng; phải xem trạng thái thực tế hoặc hướng dẫn mở tiến trình nhận nhà.

Nếu thời hạn giữ chỗ kết thúc hoặc yêu cầu bị hủy, tình trạng bất động sản và khoản tiền liên quan phải được kiểm tra bằng dữ liệu giao dịch hiện hành. AI không được dựa vào tài liệu này để khẳng định một khoản tiền đã được hoàn hay một yêu cầu cụ thể còn hiệu lực.

> Mốc giữ chỗ mặc định hiện được cấu hình khoảng 60 phút trong môi trường đã rà soát; giá trị có thể thay đổi theo cấu hình. Không trả lời một thời hạn cụ thể nếu chưa xác nhận cấu hình production.
