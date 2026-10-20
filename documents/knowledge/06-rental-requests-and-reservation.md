---
document_id: hs-knowledge-rental-request
title: Yêu cầu thuê và quy trình giữ chỗ
audience: [tenant, landlord]
visibility: public
status: draft
version: 0.1.0
locale: vi-VN
last_reviewed: null
---

# Yêu cầu thuê và quy trình giữ chỗ

## Gửi yêu cầu thuê

Sau khi xem tin và trao đổi các điều kiện, người thuê có thể gửi yêu cầu thuê qua ứng dụng nếu tin và tài khoản đủ điều kiện. Chủ nhà xem yêu cầu rồi chấp nhận hoặc từ chối trong hệ thống. Người thuê có thể hủy yêu cầu khi trạng thái hiện tại cho phép.

## Khi chủ nhà chấp nhận

Khi chủ nhà chấp nhận, tin chuyển sang giữ chỗ và mở khoản thanh toán đầu tiên. Hạn thanh toán giữ chỗ bắt đầu từ lúc chấp nhận, khác với hạn chờ chủ nhà phản hồi yêu cầu. Các yêu cầu thuê khác vẫn chờ, không tự được chấp nhận. Lịch xem nhà chưa bị hủy chỉ vì một lượt giữ chỗ ngắn hạn; khi tài sản được cho thuê chính thức, hệ thống xử lý các lịch liên quan.

Nếu ngày bắt đầu thuê là hôm nay, khoản chuyển đầu tiên gồm tiền cọc và tiền thuê tháng đầu. Nếu ngày bắt đầu còn ở tương lai, chỉ mở tiền cọc; khi cọc được chủ nhà xác nhận, phòng tiếp tục được giữ đến bước nhận nhà. Tiền tháng đầu được mở vào ngày bắt đầu thuê; không thu lại cọc. Chủ nhà có thể chuẩn bị bản nháp sau khi cọc đã được xác nhận, nhưng chỉ mở ký khi đã đến ngày thuê và tiền tháng đầu đã được xác nhận.

## Đề nghị nhận nhà và bắt đầu hợp đồng sớm

Sau khi cọc đã được xác nhận và chưa mở tiền tháng đầu/chưa bắt đầu ký, người thuê có thể đề nghị một ngày bắt đầu sớm hơn. Chủ nhà xem ngày cũ, ngày mới và các ảnh hưởng rồi quyết định. Ngày đề nghị phải từ hôm nay, trước ngày đã thống nhất và phù hợp khả năng bàn giao/chỗ xe. Chấp nhận sẽ đổi cả ngày bắt đầu thuê, ngày kết thúc và các kỳ hóa đơn, giữ số tháng và đơn giá đã chốt. Ví dụ bắt đầu 25/10 thay cho 01/11 thì kỳ thuê tính từ 25/10; không phải ký 25/10 rồi vẫn chờ 01/11. Đề nghị bị từ chối, rút hoặc hết hạn không làm mất khoản cọc và ngày thuê cũ.

## Đối soát và hủy trước khi ký

Đã báo chuyển tiền khác với đã được xác nhận nhận tiền. Quá hạn xác nhận hoặc có tranh chấp thì hồ sơ cần đối soát và phòng tiếp tục được giữ; không tự mở phòng cho giao dịch mới. Nếu chưa bắt đầu ký, người thuê có thể đề nghị hủy và hoàn tiền. Chủ nhà đồng ý sau khi đối soát sẽ tạo nghĩa vụ hoàn từng khoản thực nhận. Người trả thực hiện chuyển khoản, người nhận xác nhận nhận đủ; tạo nghĩa vụ hoàn không có nghĩa tiền đã được chuyển. Không tự tịch thu cọc do quá hạn ký. Quá hạn hoàn tất ký, chủ nhà có thể mở lại hạn sau khi kiểm tra hồ sơ; thời điểm chữ ký thực tế vẫn được giữ đúng.

Người dùng cần xem kỹ số tiền, mục đích thanh toán và hướng dẫn trên màn hình trước khi chuyển khoản. Yêu cầu thuê chưa đồng nghĩa với hợp đồng đã có hiệu lực hoặc quyền sở hữu/thuê đã hoàn tất.

## Khi yêu cầu hết hạn hoặc bị hủy

Nếu thời hạn giữ chỗ kết thúc hoặc yêu cầu bị hủy, tình trạng bất động sản và khoản tiền liên quan phải được kiểm tra bằng dữ liệu giao dịch hiện hành. AI không được dựa vào tài liệu này để khẳng định một khoản tiền đã được hoàn hay một yêu cầu cụ thể còn hiệu lực.

> Mốc giữ chỗ mặc định hiện được cấu hình khoảng 60 phút trong môi trường đã rà soát; giá trị có thể thay đổi theo cấu hình. Không trả lời một thời hạn cụ thể nếu chưa xác nhận cấu hình production.
