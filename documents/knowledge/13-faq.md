---
document_id: hs-knowledge-faq
title: Câu hỏi thường gặp HomeSpace
audience: [tenant, landlord, public]
visibility: public
status: draft
version: 0.2.0
locale: vi-VN
last_reviewed: 2026-10-16
---

# Câu hỏi thường gặp HomeSpace

## Tin đăng của tôi đang ở trạng thái nào?

Trạng thái hiện tại là thông tin realtime. Hãy kiểm tra trang quản lý tin hoặc yêu cầu AI tra cứu API sau khi xác thực; tài liệu hướng dẫn không thể xác định trạng thái của một tin cụ thể.

## Tôi đã gửi yêu cầu thuê, vậy nhà đã là của tôi chưa?

Chưa thể kết luận chỉ từ việc gửi yêu cầu. Hãy theo dõi trạng thái trong ứng dụng và hoàn thành các bước được hiển thị. Hợp đồng và các thỏa thuận giữa các bên xác định điều kiện thuê.

## Tôi đã chuyển khoản nhưng yêu cầu vẫn chưa cập nhật?

Giữ chứng từ, kiểm tra thông tin thanh toán và trạng thái trên ứng dụng. Việc bạn báo đã chuyển khoản chưa có nghĩa là người nhận đã xác nhận nhận được tiền. Nếu đã gửi chứng từ nhưng chưa có kết quả, dùng kênh hỗ trợ chính thức. Khi bạn đã đăng nhập, AI có thể đọc trạng thái khoản thanh toán thuộc hợp đồng của bạn để giải thích.

## Lịch xem nhà đã được xác nhận chưa?

Chỉ trạng thái trên hệ thống mới xác nhận lịch. Tra cứu lịch hẹn trong ứng dụng hoặc qua API sau khi đăng nhập.

## Tôi có thể thay đổi nội dung tin sau khi gửi duyệt không?

Khả năng chỉnh sửa phụ thuộc trạng thái tin và thao tác đang được bật. Mở trang quản lý tin để xem lựa chọn hiện có.

## HomeSpace có phải ví điện tử không?

Theo mô hình hiện được rà soát, HomeSpace hỗ trợ luồng chuyển khoản theo hướng dẫn của yêu cầu thanh toán và không phải ví điện tử. Cần product owner xác nhận nội dung này trước khi công bố chính thức.

## AI có thể đọc hợp đồng riêng của tôi không?

Có, nhưng chỉ khi bạn đã đăng nhập và chỉ với hợp đồng mà tài khoản của bạn là một bên (chủ nhà hoặc người thuê). AI đọc dữ liệu từ hệ thống ở mỗi câu hỏi, không lấy từ kho tài liệu dùng chung, và không đọc giấy tờ tùy thân hay thông tin tài khoản ngân hàng trong hợp đồng. Khách chưa đăng nhập không xem được hợp đồng cá nhân. Hợp đồng riêng không được đưa vào kho RAG dùng chung.

## AI trả lời thế nào khi tôi có nhiều hợp đồng?

AI sẽ liệt kê ngắn gọn các hợp đồng và hỏi bạn chọn hợp đồng nào (ví dụ “hợp đồng thứ 2” hoặc nêu số hợp đồng) thay vì tự đoán. Số lượng hợp đồng được tính trên toàn bộ hợp đồng của bạn, không chỉ phần đang hiển thị trên màn hình. Hợp đồng gia hạn và phụ lục không được đếm thành hợp đồng riêng.

## AI có ký, sửa, gia hạn hoặc chấm dứt hợp đồng giúp tôi được không?

Không. AI chỉ đọc và giải thích. AI không ký, không sửa điều khoản, không gửi hay chấp thuận gia hạn, không chấm dứt hợp đồng, không xác nhận thanh toán hay hoàn cọc và không thay đổi dữ liệu. Bạn thực hiện các thao tác này trên trang hợp đồng trong HomeSpace.

## Tại sao AI không thấy hợp đồng của người khác hoặc hợp đồng không phải của tôi?

HomeSpace chỉ cho phép đọc hợp đồng của chính tài khoản đang đăng nhập. Hợp đồng của tài khoản khác không hiển thị, dù bạn biết số hợp đồng hoặc mã nội bộ. Nếu bạn là một bên của hợp đồng nhưng đang dùng tài khoản khác, hãy đăng nhập đúng tài khoản.

## Hợp đồng đã ký đủ có nghĩa là đã bắt đầu thuê không?

Không nhất thiết. “Đã ký đủ”, “đang có hiệu lực”, “đang trong thời hạn thuê”, “đã hết thời hạn thuê”, “đã chấm dứt” và “đã tất toán” là các trạng thái khác nhau. Ví dụ hợp đồng có thể đã ký đủ nhưng chưa đến ngày bắt đầu thuê.

## Ngày kết thúc hợp đồng là ngày nào?

HomeSpace dùng ngày kết thúc không bao gồm: ngày thuê cuối cùng là ngày liền trước ngày kết thúc. Ví dụ ngày kết thúc 16/01/2027 thì ngày thuê cuối cùng là 15/01/2027.

## Phụ lục nào đang áp dụng cho hợp đồng của tôi?

Phụ lục đang áp dụng là phụ lục đã ký đủ và có ngày hiệu lực không muộn hơn ngày hiện tại. Phụ lục đã ký nhưng chưa tới ngày hiệu lực là “sắp áp dụng”; phụ lục đang chờ ký, bị từ chối, bị thay thế hoặc đã rút không phải điều khoản hiện hành. Khi đã đăng nhập, AI có thể đọc và phân biệt các trạng thái này cho hợp đồng của bạn.

## Gia hạn xong thì hợp đồng đã dài thêm chưa?

Chưa. Yêu cầu gia hạn được chủ nhà duyệt chỉ tạo thỏa thuận gia hạn để hai bên ký. Thời hạn thuê chỉ dài thêm khi thỏa thuận gia hạn được ký và áp dụng.

## Tôi cần hỗ trợ người thật khi nào?

Khi gặp tranh chấp tiền, nghi ngờ lừa đảo, lộ thông tin, lỗi KYC, hợp đồng có nội dung chưa hiểu hoặc câu trả lời không có trong hướng dẫn, hãy chuyển tới kênh hỗ trợ HomeSpace.

> Bổ sung FAQ dựa trên các câu hỏi hỗ trợ thực tế và chỉ duyệt sau khi câu trả lời được chủ sản phẩm xác nhận.
