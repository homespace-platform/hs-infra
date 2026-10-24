---
document_id: hs-knowledge-support-escalation
title: Liên hệ hỗ trợ và chuyển câu hỏi cho nhân viên
audience: [tenant, landlord, public]
visibility: public
status: draft
version: 0.2.0
locale: vi-VN
last_reviewed: 2026-10-16
---

# Liên hệ hỗ trợ và chuyển câu hỏi cho nhân viên

AI nên đề nghị chuyển nhân viên hỗ trợ khi:

- Người dùng báo mất tiền, giao dịch sai, tranh chấp hoặc dấu hiệu lừa đảo.
- Tài khoản có dấu hiệu bị chiếm quyền, lộ OTP hoặc dữ liệu nhạy cảm.
- Kết quả KYC, kiểm duyệt, thanh toán, lịch hẹn hoặc hợp đồng cần được giải quyết cho một hồ sơ cụ thể nhưng API không cung cấp đủ dữ liệu/quyền.
- Người dùng yêu cầu khiếu nại hoặc xem xét lại quyết định.
- Tài liệu RAG không có câu trả lời, nội dung mâu thuẫn hoặc chính sách vẫn ở trạng thái nháp.

## Phân biệt bốn tình huống khi hỏi về hợp đồng

1. **AI trả lời được:** câu hỏi về dữ liệu hợp đồng của chính tài khoản đang đăng nhập (trạng thái, thời hạn, điều khoản, phụ lục, hóa đơn, cọc) và hệ thống đọc được. AI giải thích và nêu thời điểm đọc.
2. **Thiếu quyền hoặc thiếu dữ liệu:** tài khoản không phải một bên của hợp đồng, chưa đăng nhập, hoặc hệ thống không có thông tin được hỏi. AI nói rõ giới hạn, không đoán. Với hợp đồng không thuộc tài khoản, hãy đăng nhập đúng tài khoản hoặc nhờ bên liên quan.
3. **Lỗi dịch vụ:** hệ thống tạm thời không đọc được. AI nói rõ là chưa đọc được và đề nghị thử lại sau; đây không phải là “không có hợp đồng”. Nếu lỗi kéo dài, dùng mục Hỗ trợ trong ứng dụng.
4. **Cần người có thẩm quyền xử lý:** tranh chấp tiền cọc hoặc khoản khấu trừ, tranh chấp nội dung hoặc hiệu lực hợp đồng, nghi giả mạo chữ ký, yêu cầu pháp lý. AI không phân xử, không kết luận đúng sai và đề nghị chuyển nhân viên hỗ trợ; nếu cần tư vấn pháp lý, hãy tham khảo chuyên gia phù hợp.

Khi chuyển tiếp, chỉ thu thập thông tin tối thiểu cần thiết, ví dụ mã yêu cầu/tin đăng/số hợp đồng và mô tả ngắn. Không yêu cầu mật khẩu, OTP, toàn bộ số thẻ/tài khoản hoặc giấy tờ tùy thân trong chatbox.

Hiện chưa điền email, số điện thoại, thời gian phản hồi hay SLA hỗ trợ vì cần HomeSpace xác nhận kênh thực tế. Agent không được tự bịa thông tin liên hệ, thời hạn phản hồi, quy trình trọng tài hay cơ chế tự động chuyển người thật; khi chưa có cấu hình, hướng dẫn người dùng vào mục Hỗ trợ trong ứng dụng.
