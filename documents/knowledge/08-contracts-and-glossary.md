---
document_id: hs-knowledge-contracts
title: Quy trình hợp đồng và giải thích thuật ngữ
audience: [tenant, landlord]
visibility: public
status: draft
version: 0.2.0
locale: vi-VN
last_reviewed: 2026-10-16
---

# Quy trình hợp đồng

Quy trình hợp đồng trên HomeSpace có thể gồm chuẩn bị hồ sơ, chọn mẫu phù hợp, điền thông tin các bên, rà soát nội dung, tải lên tài liệu liên quan và ký. Các bước thực tế phụ thuộc cấu hình hợp đồng và lựa chọn ký được bật cho giao dịch.

Cách ký phụ thuộc cấu hình của hệ thống. Khi bật ký số VNPT SmartCA, chủ nhà gửi yêu cầu ký trước, rồi người thuê ký; mỗi bên xác nhận trên ứng dụng VNPT SmartCA chứ không xác nhận ký nội bộ trong HomeSpace. Khi chạy luồng ký nội bộ, các bên xác nhận ngay trên HomeSpace. Phụ lục sửa đổi hợp đồng cần cấu hình ký SmartCA được bật. Người dùng cần kiểm tra tên các bên, địa chỉ thuê, giá, tiền đặt cọc, thời hạn, trách nhiệm, phụ lục và các khoản phí trước khi ký. Không ký nếu còn nội dung sai hoặc chưa hiểu; liên hệ bên còn lại hoặc chuyên gia phù hợp để được giải thích.

## Thuật ngữ thường gặp

Trong luồng nhận nhà mới, bản nháp có thể được chuẩn bị sau khi xác nhận cọc. Ký chính thức chỉ mở từ ngày bắt đầu thuê đã thống nhất và sau khi xác nhận tiền tháng đầu. Đề nghị “nhận nhà và bắt đầu hợp đồng sớm” được chủ nhà chấp nhận sẽ đổi ngày thuê và kỳ hóa đơn sang ngày mới; không giữ nguyên ngày thuê cũ. Ngày lập văn bản là ngày kết xuất, khác với thời điểm chữ ký thực tế của từng bên; không ghi lùi chữ ký khi xử lý muộn. Các hợp đồng/gia hạn/phụ lục đã ký trước hoặc có ngày áp dụng riêng vẫn cần đối chiếu đúng ngày hiệu lực.

- **Bên cho thuê:** cá nhân/tổ chức cho thuê bất động sản theo hợp đồng.
- **Bên thuê:** cá nhân/tổ chức thuê bất động sản theo hợp đồng.
- **Tiền thuê:** khoản tiền thuê theo kỳ được ghi trong hợp đồng; thời điểm và phương thức trả phụ thuộc thỏa thuận.
- **Tiền đặt cọc:** khoản tiền và mục đích được quy định cụ thể trong hợp đồng. Không suy ra điều kiện hoàn/trừ cọc nếu điều khoản không nêu rõ.
- **Thời hạn thuê:** khoảng thời gian thuê được hai bên thỏa thuận và ghi trong hợp đồng.
- **Biên bản bàn giao:** tài liệu ghi nhận tình trạng nhà, tài sản và chỉ số liên quan tại thời điểm bàn giao nếu các bên sử dụng.
- **Chữ ký điện tử:** cách ký được cung cấp qua hệ thống hoặc nhà cung cấp ký tích hợp; hiệu lực và điều kiện áp dụng phải căn cứ tài liệu pháp lý được phê duyệt.
- **Phụ lục:** văn bản sửa đổi một số điều khoản của hợp đồng đang thực hiện, chỉ có giá trị khi hai bên đã ký đủ và đến ngày hiệu lực của phụ lục.

## Ba mốc thời gian khác nhau của một hợp đồng

Một hợp đồng có ba mốc thường bị nhầm với nhau:

1. **Thời điểm ký:** lúc các bên hoàn tất chữ ký. Ký đủ chưa có nghĩa là thời hạn thuê đã bắt đầu.
2. **Thời điểm hiệu lực của hợp đồng/phụ lục:** hợp đồng đã ký đủ ở trạng thái “Đang có hiệu lực”; phụ lục chỉ áp dụng từ **ngày hiệu lực ghi trên phụ lục**, dù đã ký trước đó.
3. **Thời gian thuê thực tế:** từ ngày bắt đầu thuê (ngày nhận nhà) đến hết thời hạn thuê.

Vì vậy cần phân biệt: *đã ký đủ*, *đang có hiệu lực*, *đang trong thời hạn thuê*, *đã hết thời hạn thuê*, *đã chấm dứt* và *đã tất toán*. Hợp đồng có thể đã ký đủ nhưng chưa đến ngày bắt đầu thuê; có thể đã hết thời hạn thuê nhưng chưa tất toán tiền cọc và chi phí cuối kỳ. Nhãn trạng thái có thể được hệ thống cập nhật chậm hơn thời điểm hết thời hạn một khoảng ngắn; khi đó thông tin ngày tháng là căn cứ chính.

## Ngày kết thúc và ngày thuê cuối cùng

HomeSpace tính **ngày kết thúc không bao gồm**: đó là ngày đầu tiên *không còn* thuộc thời hạn thuê. **Ngày thuê cuối cùng là ngày liền trước ngày kết thúc.** Ví dụ thuê 3 tháng từ 16/10/2026: ngày kết thúc (không bao gồm) là 16/01/2027 và ngày thuê cuối cùng là 15/01/2027. Số ngày còn lại tính cả ngày hôm nay và dừng ở ngày thuê cuối cùng.

## Phụ lục: hiện hành, sắp áp dụng và đã bị thay thế

Điều khoản đang áp dụng tại một ngày là điều khoản trong hợp đồng gốc hoặc trong **phụ lục đã ký đủ có ngày hiệu lực không muộn hơn ngày đó** (nếu có nhiều phụ lục thì phụ lục có ngày hiệu lực gần nhất). Phụ lục được tạo sau cùng chưa chắc là phụ lục đang áp dụng.

Ví dụ: hợp đồng gốc từ 16/10/2026; phụ lục 1 hiệu lực 16/11/2026; phụ lục 2 đã ký đủ nhưng hiệu lực 16/12/2026. Ngày 16/11/2026 điều khoản hiện hành là của phụ lục 1 và phụ lục 2 mới chỉ là “sắp áp dụng”. Từ đúng ngày 16/12/2026 phụ lục 2 mới áp dụng.

Các trạng thái thường gặp của một phụ lục:

- **Đang thương lượng hoặc chờ phản hồi:** chưa phải điều khoản hiện hành.
- **Đã duyệt, chờ ký:** chưa đủ chữ ký nên chưa có giá trị áp dụng.
- **Đã ký đủ, chờ đến ngày hiệu lực:** là điều khoản sắp áp dụng.
- **Đang áp dụng:** là phụ lục hiện hành tại ngày xem.
- **Đã bị thay thế, bị từ chối, đã rút hoặc hết hạn:** không phải điều khoản hiện hành.

Hóa đơn đã phát hành giữ nguyên số liệu tại thời điểm phát hành; phụ lục có hiệu lực sau đó không làm thay đổi hóa đơn cũ.

## Gia hạn hợp đồng

Gia hạn do **người thuê** gửi yêu cầu trong khoảng 30 ngày cuối trước ngày kết thúc thuê; ứng dụng hiển thị thời hạn chính xác. Chủ nhà xem xét. Khi được chấp thuận, HomeSpace tạo một **thỏa thuận gia hạn riêng** để hai bên ký; hợp đồng hiện tại **chưa được kéo dài** cho tới khi thỏa thuận gia hạn được ký và áp dụng. Yêu cầu gia hạn được duyệt nhưng chưa ký không làm thời hạn thuê dài thêm.

Một số tình huống có thể làm chưa thể gửi yêu cầu, ví dụ chưa đến hoặc đã quá cửa sổ gia hạn, hợp đồng không còn hiệu lực, đang có phụ lục chờ hoàn tất, đang có đề nghị chấm dứt hoặc đã có yêu cầu gia hạn cho kỳ đó. Điều kiện thực tế được hệ thống kiểm tra lại tại thời điểm bạn thao tác.

## Trợ lý AI có thể giải thích gì về hợp đồng của bạn?

Khi bạn **đã đăng nhập**, trợ lý có thể đọc dữ liệu hợp đồng của **chính tài khoản bạn** (với vai trò chủ nhà hoặc người thuê) để trả lời các câu hỏi như: bạn có bao nhiêu hợp đồng, hợp đồng nào sắp hết hạn, hợp đồng đã ký đủ chưa, điều khoản và giá đang áp dụng, nội thất và các khoản phí, phụ lục hiện hành hay sắp áp dụng, điều kiện gia hạn lúc này, tình trạng hóa đơn, tiền cọc và hoàn cọc.

Giới hạn quan trọng:

- Trợ lý **chỉ đọc và giải thích**. Trợ lý không ký, không sửa điều khoản, không gửi hay chấp thuận gia hạn, không xác nhận thanh toán và không thay đổi dữ liệu. Muốn thực hiện, bạn thao tác trên trang hợp đồng của HomeSpace.
- Trợ lý chỉ thấy hợp đồng mà tài khoản đang đăng nhập là một bên. Hợp đồng của tài khoản khác không hiển thị dù biết số hợp đồng. Khách chưa đăng nhập không xem được hợp đồng cá nhân.
- Dữ liệu được đọc lại từ hệ thống ở mỗi câu hỏi và kèm thời điểm đọc. Nếu bạn có nhiều hợp đồng, trợ lý sẽ hỏi bạn chọn hợp đồng nào thay vì đoán.
- Khi hệ thống không đọc được dữ liệu, trợ lý sẽ nói rõ là chưa đọc được; trợ lý không đoán và không điền “0 hợp đồng”.
- Câu trả lời giải thích nội dung hợp đồng, không khẳng định tính hợp pháp và không thay thế tư vấn pháp lý. Thông tin về khả năng gia hạn chỉ mang tính tham khảo; hệ thống kiểm tra lại khi bạn thao tác.

## Khi cần giải thích hợp đồng cụ thể

Câu hỏi về nội dung hợp đồng của bạn được trả lời từ dữ liệu hợp đồng mà tài khoản của bạn được quyền xem, không phải từ kho tri thức dùng chung. Hướng dẫn chung (ví dụ quy trình ký hay gia hạn) được lấy từ tài liệu này. Nếu một câu hỏi cần cả hai, phần dữ liệu riêng của bạn và phần hướng dẫn chung được trình bày tách nhau. Nếu cần phân tích tài liệu do người dùng tải lên, xử lý trong phạm vi tài liệu đó và quyền của đúng người dùng; không đưa tài liệu riêng vào kho RAG dùng chung.

> Mẫu, điều khoản, các loại hợp đồng hỗ trợ và quy trình ký cần được rà soát cùng bộ phận pháp lý trước khi duyệt. Nội dung ở trên là bản làm việc đã đối chiếu với hành vi của hệ thống nhưng chưa được product owner hoặc pháp lý phê duyệt.
