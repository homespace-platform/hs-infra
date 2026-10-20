---
document_id: hs-knowledge-payments
title: Hướng dẫn thanh toán và xử lý sự cố
audience: [tenant, landlord]
visibility: public
status: draft
version: 0.2.0
locale: vi-VN
last_reviewed: 2026-10-16
---

# Hướng dẫn thanh toán và xử lý sự cố

HomeSpace hiện hỗ trợ luồng thanh toán chuyển khoản trực tiếp theo thông tin và hướng dẫn hiển thị cho từng yêu cầu thanh toán. Người dùng cần kiểm tra người nhận, số tiền, nội dung chuyển khoản và thời hạn trước khi thực hiện.

Sau khi chuyển tiền, người dùng có thể gửi minh chứng thanh toán qua ứng dụng nếu yêu cầu có hỗ trợ. Bên có trách nhiệm xác nhận sẽ kiểm tra chứng từ và cập nhật trạng thái trên hệ thống. Trạng thái thực tế của khoản thanh toán phải lấy từ API; RAG chỉ giải thích các bước chung.

## Phạm vi: tài liệu này nói gì và không nói gì

Tài liệu này giải thích **quy trình chung**. Nó không cho biết hóa đơn, số tiền, hạn thanh toán hay trạng thái thanh toán của một hợp đồng cụ thể. Những thông tin đó là dữ liệu cá nhân thay đổi theo thời gian: khi bạn đã đăng nhập, trợ lý AI đọc chúng từ hệ thống cho đúng hợp đồng của bạn và nêu rõ thời điểm đọc. AI chỉ đọc và giải thích; AI không xác nhận chuyển khoản, không chuyển tiền và không thay đổi trạng thái thanh toán.

## Các loại khoản thanh toán trong một hợp đồng

- **Tiền cọc giữ chỗ:** nếu ngày vào ở còn trong tương lai, được thu riêng sau khi chủ nhà chấp nhận. Chỉ được xem là đã nhận khi chủ nhà xác nhận; cọc bằng không không cần chuyển khoản 0 đồng.
- **Tiền thuê tháng đầu:** mở vào ngày bắt đầu thuê, sau bước xác nhận cọc; không cộng lại khoản cọc đã trả. Trường hợp bắt đầu thuê ngay có thể gộp cọc và tháng đầu trong một khoản chuyển. Mỗi khoản giữ mã chuyển và chứng từ riêng; hóa đơn định kỳ không thu lại tháng đầu.
- **Hóa đơn định kỳ:** hóa đơn theo từng kỳ thuê. Mỗi hóa đơn có tiền thuê của kỳ, chi phí phát sinh (ví dụ điện, nước, dịch vụ) và có thể có phí chậm thanh toán. Tiền thuê trả trước cho kỳ sau và chi phí đã phát sinh của kỳ trước là hai khoản khác nhau, dù có thể nằm trong cùng một hóa đơn.
- **Quyết toán cuối hợp đồng:** khi kết thúc thuê, các chi phí cuối kỳ, khoản khấu trừ (nếu có) và tiền cọc được tính trong bước tất toán. Có thể phát sinh khoản hoàn cọc cho người thuê hoặc khoản người thuê còn phải trả.

## Báo đã chuyển khoản không phải là đã nhận tiền

Trạng thái thanh toán có nhiều bước. **Người trả báo đã chuyển khoản** chỉ là bước người trả cung cấp thông tin; khoản tiền chỉ được xem là đã nhận khi **người nhận xác nhận**. Cùng nguyên tắc áp dụng cho hoàn cọc: “đã báo chuyển hoàn” khác với “người thuê đã xác nhận nhận được”. AI không tự xác nhận hộ ai và không kết luận đã nhận tiền chỉ vì có báo chuyển khoản.

## Số liệu của hóa đơn đã phát hành

Mỗi hóa đơn lưu lại mức giá, phí và điều khoản **tại thời điểm phát hành** cho từng kỳ. Khi có phụ lục hoặc thay đổi chính sách về sau, hóa đơn đã phát hành không bị tính lại theo mức mới. Khoản nợ được chuyển sang hóa đơn kỳ sau chỉ được tính ở hóa đơn nhận khoản chuyển, không cộng hai lần.

## Tiền đặt cọc và hoàn cọc

Tiền cọc có các trạng thái như đang giữ, đã khấu trừ một phần, đã hoàn hoặc đã tất toán. Số tiền được hoàn phụ thuộc điều khoản hợp đồng và biên bản tất toán đã được hai bên chấp thuận. Không suy ra mức hoàn nếu điều khoản không nêu rõ. AI không bảo đảm hoàn cọc, không xác nhận hoàn cọc đã được chuyển và không thay đổi khoản khấu trừ.

## Nếu thanh toán có vấn đề

- Nếu đã chuyển tiền nhưng trạng thái chưa đổi, giữ lại chứng từ và kiểm tra lại sau thời gian xử lý được ứng dụng thông báo.
- Nếu nhập sai thông tin, chuyển sai số tiền hoặc giao dịch bị ngân hàng từ chối, liên hệ ngân hàng và kênh hỗ trợ HomeSpace; không tự gửi thêm tiền để “xác minh”.
- Nếu chứng từ bị từ chối, đọc lý do hiển thị, gửi lại chứng từ hợp lệ nếu thao tác được cho phép hoặc liên hệ hỗ trợ.
- Không đăng công khai ảnh chứng từ có số tài khoản, số dư hoặc dữ liệu cá nhân.

HomeSpace là nền tảng hỗ trợ luồng giao dịch, không phải ví điện tử theo thông tin triển khai hiện tại. Không khẳng định HomeSpace đang giữ tiền, đã hoàn tiền hoặc bảo đảm hoàn tiền nếu không có chính sách đã duyệt và dữ liệu giao dịch xác thực.

> Phí, hạn xử lý, quy trình hoàn/hủy và đầu mối giải quyết tranh chấp cần được product owner/finance xác nhận trước khi đưa vào câu trả lời chính thức.
