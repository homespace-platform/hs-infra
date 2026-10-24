---
document_id: hs-knowledge-appointments
title: Đặt và quản lý lịch xem nhà
audience: [tenant, landlord]
visibility: public
status: draft
version: 0.2.0
locale: vi-VN
last_reviewed: 2026-10-16
---

# Đặt và quản lý lịch xem nhà

Người thuê chọn tin đăng, xem các khung giờ còn khả dụng và gửi yêu cầu đặt lịch. Chủ nhà có thể xử lý yêu cầu bằng các thao tác được cung cấp, ví dụ chấp nhận hoặc từ chối. Người dùng theo dõi kết quả và lịch hiện tại trong ứng dụng.

## Ai làm được gì

- **Người thuê** gửi yêu cầu xem nhà, có thể gửi đề xuất đổi giờ và có thể hủy lịch của mình. Chỉ người thuê mới gửi được đề xuất đổi giờ.
- **Chủ nhà** xem các yêu cầu gửi tới tin của mình, chấp nhận hoặc từ chối yêu cầu, quyết định đề xuất đổi giờ và có thể hủy lịch theo thao tác ứng dụng cung cấp. Chủ nhà không đặt lịch xem chính tin của mình.
- Một người thuê chỉ có một lịch đang hoạt động cho mỗi tin đăng tại một thời điểm.
- Việc kiểm tra xác minh danh tính (KYC) được thực hiện khi người thuê gửi yêu cầu đặt lịch; xem chi tiết ở tài liệu tài khoản và xác minh.

Một tài khoản có thể vừa là chủ nhà của tin này vừa là người thuê khi xem tin khác. Khi đó, mỗi lịch hiển thị theo đúng vai trò của bạn trong lịch đó.

## Trạng thái của lịch

| Trạng thái | Ý nghĩa |
|---|---|
| Chờ xác nhận | Người thuê đã gửi yêu cầu, chủ nhà chưa quyết định. |
| Đã xác nhận | Chủ nhà đã chấp nhận. Đây là lịch hiện tại của buổi xem. |
| Bị từ chối | Chủ nhà từ chối yêu cầu. |
| Đã hủy | Người thuê hoặc chủ nhà đã hủy. Lý do hủy, nếu có, do người nhập. |
| Đã hoàn thành | Buổi xem đã qua và hệ thống ghi nhận hoàn thành. Trạng thái này không chứng minh người thuê đã thực sự đến xem. |
| Hết hạn | Yêu cầu không còn hiệu lực theo cơ chế tự cập nhật của hệ thống. |

Trạng thái được lưu và thời điểm của buổi xem là hai thông tin khác nhau. Một lịch có thể đã qua giờ hẹn nhưng hệ thống chưa kịp cập nhật trạng thái; lịch như vậy không còn được coi là sắp diễn ra.

## Thời gian hiện tại và thời gian đề xuất

Khi người thuê đề xuất đổi giờ, thời gian đề xuất chỉ là đề nghị chờ chủ nhà quyết định. Lịch hiện tại vẫn giữ nguyên cho tới khi chủ nhà chấp nhận. Ứng dụng chỉ lưu đề xuất đang chờ; lịch sử các lần đổi giờ trước đó không được lưu, nên không thể xem lại.

## Nhiều yêu cầu cho cùng một khung giờ

Nhiều người thuê có thể gửi yêu cầu cho cùng một khung giờ của một tin. Số yêu cầu trong khung giờ chỉ là số yêu cầu đã gửi, không phải sức chứa, và không có nghĩa khung giờ đã đầy. Chủ nhà quyết định từng yêu cầu.

## Thay đổi hoặc hủy lịch

Nếu cần đổi hoặc hủy, hãy sử dụng thao tác tương ứng trên lịch hẹn và kiểm tra trạng thái sau khi gửi. Việc đặt lịch chỉ được xác nhận khi hệ thống hiển thị kết quả tương ứng; không coi một lời đề nghị qua chat là lịch đã được xác nhận.

Một lịch có thể tự kết thúc hoặc bị cập nhật nếu tin đăng thay đổi trạng thái. Trạng thái và thời gian cụ thể của lịch hẹn là dữ liệu realtime, cần truy vấn theo quyền của người dùng.

Trước buổi xem, hai bên nên xác nhận lại thời gian và địa điểm bằng kênh liên lạc phù hợp. Không chuyển tiền chỉ để “giữ lịch” trừ khi có quy trình thanh toán chính thức được hiển thị trên HomeSpace.

## Trợ lý AI và lịch xem nhà

Khi đã đăng nhập, trợ lý AI có thể **đọc và giải thích** lịch xem nhà thuộc tài khoản của bạn, ở cả hai vai trò người thuê và chủ nhà:

- đếm và liệt kê lịch theo trạng thái, theo ngày (hôm nay, ngày mai, tuần này, tuần sau, cuối tuần, tháng này) hoặc theo tin đăng;
- cho biết lịch sắp tới gần nhất, lịch đang chờ xác nhận, lịch có đề xuất đổi giờ;
- giải thích một lịch cụ thể: thời gian hiện tại, thời gian đề xuất, trạng thái, và vì sao một thao tác có thể chưa làm được;
- cho biết một tin đăng nhận xem nhà vào ngày nào và các khung giờ nào còn có thể gửi yêu cầu.

Trợ lý AI **không** đặt, chấp nhận, từ chối, đổi, hủy hay hoàn thành lịch, và không gửi thông báo thay bạn. Mọi thao tác thực hiện trên trang lịch xem nhà trong ứng dụng; trợ lý chỉ mở đúng lịch để bạn thao tác. Trợ lý không đọc lịch của tài khoản khác, không hiển thị thông tin liên hệ của bên kia và không đoán số liệu. Khách chưa đăng nhập không tra cứu được lịch cá nhân, nhưng vẫn hỏi được quy trình chung ở tài liệu này.

Số liệu trợ lý nêu là ảnh chụp tại thời điểm đọc; trang lịch xem nhà luôn hiển thị trạng thái mới nhất. Nếu hệ thống tạm thời không đọc được dữ liệu, trợ lý sẽ báo là chưa đọc được thay vì nói bạn không có lịch. Nếu bạn thực sự không có lịch nào khớp, trợ lý sẽ nói không có kết quả.

> Thời hạn hủy, thời gian tự hết hạn và chính sách vắng mặt cần được product owner xác nhận trước khi công bố.
