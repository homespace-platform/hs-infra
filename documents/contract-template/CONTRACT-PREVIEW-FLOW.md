# Luồng kết xuất và xác nhận tài liệu hợp đồng

## Nguyên nhân đã xử lý

Kết xuất Word/PDF là tác vụ đồng bộ gồm tải mẫu, render, chuyển PDF và lưu Storage.
Gateway từng áp dụng TimeLimiter 6 giây như API Core thông thường: trả 503 trong khi Core
vẫn hoàn tất và commit file. Refresh trang vì thế thấy PDF đã tạo dù lần bấm đầu báo lỗi.

## Luồng hiện tại

1. Chủ nhà lưu công tơ/điều khoản vào revision. Core kiểm tra quyền, trạng thái DRAFT và completeness.
2. POST `/api/v1/contracts/{id}/previews` dùng circuit breaker riêng, timeout 90 giây;
   Axios chờ 95 giây. API khác vẫn dùng timeout hiện tại (Core 6 giây).
3. Core khóa hàng contract trong transaction, đối chiếu fingerprint của revision,
   các snapshot, template version, signature mode và phiên bản renderer. Cùng dữ liệu
   đã có kết quả READY thì trả lại tài liệu, không chuyển PDF/upload thêm.
4. Word nhận các chính sách đã lưu qua `contract.specialTerms`, cùng phí chậm thanh toán,
   công tơ và các bảng. Không tự áp dụng mặc định mới cho thỏa thuận lịch sử.
5. Gotenberg có connect timeout 5 giây/read timeout 45 giây (cấu hình qua
   `contract.gotenberg.connect-timeout-seconds` và `contract.gotenberg.read-timeout-seconds`).
   SmartCA bắt buộc có PDF và trang ký trước khi upload. INTERNAL giữ fallback DOCX có sẵn.
6. Sau khi commit, bản PREVIEW cũ cùng revision được đánh dấu STALE; tài liệu SIGNED không bị ghi đè.
7. Nếu mất mạng/502/503/504, frontend hiển thị “Đang kiểm tra kết quả…” và chỉ GET
   `/api/v1/contracts/{id}/preview-status` tối đa 20 lần, cách nhau 3 giây.
   Không tự POST lại. Chỉ READY đúng revision mới được báo thành công.
   `result: null` nghĩa là chưa xác nhận được kết quả, không phải đã thất bại.
8. Gửi hợp đồng nội bộ/chủ nhà ký SmartCA phải dùng fingerprint hiện tại. Người thuê
   tiếp tục ký chính PDF SIGNED_LANDLORD, không kết xuất lại bản đã ký.

## Triển khai

- Restart Core API và Gateway; cập nhật/restart frontend để nhận endpoint và timeout mới.
- Có cột nullable `contract_documents.render_fingerprint` mới. Với `ddl-auto=update`,
  Hibernate bổ sung cột khi Core khởi động. Nếu môi trường dùng `validate`/`none`, chạy
  `postgres/contract_preview_render_fingerprint.sql` trước khi triển khai Core.
- Bản nháp đã kết xuất trước thay đổi chưa có fingerprint: kết xuất lại một lần trước khi ký.
  Không sửa/xóa PDF đã ký hoặc cuộc ký đang chờ xác nhận.
- Không thay mẫu Word đã phát hành hàng loạt; mẫu dùng `{{contract.specialTerms}}` sẽ nhận
  thêm các chính sách snapshot. Mẫu thiếu placeholder này trong khi có điều khoản sẽ bị chặn.
- Khi thay đổi quy tắc renderer sau này, tăng version trong `ContractPreviewIdentity`.

## Kiểm thử thủ công sau restart

- Lưu công tơ/điều khoản, kết xuất; chờ spinner và mở PDF/Word kiểm tra số liệu.
- Bấm kết xuất lại: giữ nguyên document ID; không tạo thêm cặp file.
- Sửa công tơ/điều khoản: ký bị khóa đến khi kết xuất revision mới.
- Mất phản hồi sau khi Core xử lý: giao diện đối soát, nhận kết quả mà không cần F5.
- Gotenberg không hoạt động trong SMARTCA: báo lỗi thật, không coi DOCX là PDF hợp lệ.
- Người thuê/hợp đồng ACTIVE không được kết xuất lại; PDF đã ký không thay đổi.

## Phạm vi

Luồng này chưa chuyển sang queue/job nền: transaction khóa contract được giữ trong thời gian
kết xuất. Nếu Storage bị treo lâu hơn ngân sách, frontend vẫn báo trạng thái chưa xác định.
Upload Storage không cùng transaction với PostgreSQL; lỗi Storage/DB sau upload vẫn cần
cơ chế cleanup orphan của Storage. Không coi timeout là lệnh hủy tác vụ Core.
