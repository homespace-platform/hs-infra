# Hợp đồng cọc — hướng dẫn chạy và quản trị

## 1. Kết quả và nguyên tắc

- Có cọc dương: **mỗi bên ký hai văn bản riêng**: hợp đồng cọc, sau đó hợp đồng thuê. Mỗi văn bản: chủ nhà ký trước, khách thuê ký sau trên cùng PDF.
- Nhận nhà sau: xác nhận cọc → ký cọc → đến ngày bắt đầu thuê, thanh toán tháng đầu → ký thuê.
- Nhận nhà ngay: xác nhận khoản gộp → ký cọc → ký thuê. Văn bản cọc chỉ ghi phần `DEPOSIT`, không coi toàn bộ khoản gộp là tiền cọc.
- Miễn cọc 0 đồng: không lập chứng nhận đã nhận tiền cọc; chỉ có hợp đồng thuê.
- Ký đủ hợp đồng cọc **không** chuyển listing thành RENTED, không hoàn tất yêu cầu thuê và không phát sinh hóa đơn thuê hàng tháng.
- Tiền đã xác nhận không bị đảo hoặc yêu cầu chuyển lại vì lỗi mẫu, PDF, lưu file hay chữ ký. Không tự mất cọc do hết hạn ký cọc.

## 2. Chạy lần đầu

1. Backend: cấu hình PostgreSQL, storage, Gotenberg và SmartCA như luồng hợp đồng thuê hiện có. Dùng `JPA_DDL_AUTO=update` cho môi trường phát triển hiện tại; không cần drop CSDL. Backend thêm `deposit_agreements`, cột loại mẫu và snapshot điều kiện giữ chỗ. Migration bỏ ràng buộc cũ một mẫu/loại nhà, thay bằng một mẫu/**loại văn bản + loại nhà**. Với môi trường dùng `validate`, cần triển khai migration schema trước khi khởi động, không đổi sang `update` tùy tiện trên production.
2. Build backend trong `D:/Workspace/homespace/hs-core-api`:

   ```powershell
   mvn -Pisolated-build -pl hs-api-service -am compile -DskipTests
   ```

   Khởi động lại `hs-api-service` bằng cách chạy hiện tại của dự án. Không cần service mới.
3. Chạy hai frontend:

   ```powershell
   # D:/Workspace/homespace/hs-admin-portal
   npm run dev
   # D:/Workspace/homespace/hs-web-app
   npm run dev
   ```

4. Admin → **Hợp đồng & đặt cọc** → chọn **Hợp đồng đặt cọc** → **Mẫu Word & phiên bản** → **Tạo mẫu cho loại còn thiếu**. Nhập tên, chọn HOUSE / APARTMENT / ROOM và **upload file Word thủ công**, như mẫu hợp đồng thuê. Lặp lại cho các loại nhà cần sử dụng.
5. Mở từng mẫu, kiểm tra mã trường, **xem thử** rồi **phát hành phiên bản**. Upload chỉ tạo DRAFT, không tự phát hành hoặc ghi đè mẫu đã có. Mẫu thuê cũ được giữ nguyên.

Các file Word gốc để admin chọn upload nằm tại:

`D:/Workspace/homespace/hs-infra/documents/deposit-contract-template/`

Backend không đóng gói file Word và không đọc trực tiếp thư mục này khi chạy. Mẫu được upload lên storage, CSDL lưu thông tin mẫu/phiên bản; backend kết xuất từ phiên bản đã phát hành. Khi sửa Word, upload phiên bản mới vào mẫu hiện có ở admin, xem thử và phát hành; không cần build lại backend.

## 3. Dữ liệu và quản lý mẫu

- Chọn loại văn bản trước khi dùng **Từ điển mã trường**. Thuê dùng catalog V3; cọc dùng D2: HOUSE 41 mã, APARTMENT/ROOM 42 mã, thêm số căn/phòng.
- Không dùng Word thuê cho cọc hoặc ngược lại. Marker phải đúng và nằm nguyên trong một run Word. Khối điều kiện giữ chỗ, hướng dẫn bước tiếp và bảng bổ sung chỉ xuất hiện một lần.
- Mỗi loại nhà cần đúng một mẫu cọc hệ thống đang hoạt động với phiên bản hiện hành PUBLISHED.
- Văn bản cọc lấy tài sản từ snapshot lúc chấp nhận yêu cầu, tiền và tài khoản từ giao dịch đã xác nhận, thông tin hai bên từ hồ sơ. Tài khoản nhận hoàn không đồng nghĩa tài khoản đã thực tế chuyển tiền.
- Tên, điện thoại, tài khoản hai bên, địa chỉ/diện tích và số căn/phòng bắt buộc phải đủ. Thiếu thì bổ sung dữ liệu thật trước khi tạo; không điền dữ liệu giả. CCCD/email/địa chỉ liên hệ và các thông tin bổ sung chỉ in khi có nguồn. Ký SmartCA vẫn cần CCCD/KYC/chứng thư phù hợp theo quy tắc hiện có.
- Mã cọc bắt đầu `DC-`. Snapshot D2, hash, payment nguồn và phiên bản Word được lưu riêng, không chỉnh trực tiếp qua API sửa hợp đồng thuê. Retry không tạo thêm hồ sơ cọc cho cùng yêu cầu/payment.
- Đổi profile hoặc phát hành mẫu mới không thay văn bản cọc đã chụp. Thỏa thuận đổi ngày nhận nhà qua luồng sẵn có có lịch sử riêng; không viết lại PDF cọc cũ để giả làm nội dung ban đầu.
- Hồ sơ thuê mới lưu toàn văn, phiên bản và hash điều kiện giữ chỗ đã đồng ý. UI tải điều kiện từ backend, không tự hard-code văn bản đồng ý.

## 4. Người dùng ký và tải tài liệu ở đâu?

Ngay trên thẻ **Yêu cầu thuê** của chủ nhà hoặc khách thuê, bấm **Xem HĐ cọc** để mở modal PDF trong ứng dụng; bấm **Ký / theo dõi HĐ cọc** để vào hồ sơ ký. Khối **Hợp đồng đặt cọc** trong chi tiết yêu cầu thuê / **Đặt cọc & nhận nhà** vẫn dùng được.

Trong mục **Hợp đồng cho thuê / đi thuê**, mỗi hồ sơ chỉ có một thẻ chính: chưa có HĐ thuê thì hiển thị HĐ cọc; khi có HĐ thuê thì ưu tiên HĐ thuê và giữ nút **Xem HĐ cọc** riêng. Trong chi tiết HĐ thuê cũng có nút này. Nếu bản nháp HĐ thuê chưa có PDF, nút xem mở HĐ cọc kèm thông báo rõ loại tài liệu; HĐ thuê đã ký luôn yêu cầu đúng PDF ký đủ hai bên, không lấy bản nháp thay thế.

Các nút xem dùng chung modal PDF hiện có (phóng to, chuyển trang, tải xuống); không tự mở tab chứa URL storage. URL tải vẫn là URL có hạn do backend kiểm tra quyền và cấp khi người dùng bấm xem.

1. Chủ nhà xác nhận nhận đủ khoản cọc hoặc khoản gộp.
2. Backend thử tạo hồ sơ/PDF sau khi xác nhận tiền đã commit; job nhận nhà thử lại nếu có lỗi tạm thời.
3. Hai bên xem PDF. Chủ nhà chọn chứng thư và xác nhận trong app SmartCA; khách ký tiếp PDF đã có chữ ký chủ nhà.
4. Tải **hợp đồng cọc đã ký** tại cùng khối. Khi ký đủ, bước ký thuê mới được mở theo ngày vào và điều kiện thanh toán vốn có.

Admin xem hồ sơ và các PDF tại **Hồ sơ & tài liệu đã ký**, chọn loại **Hợp đồng đặt cọc**. Trạng thái `ACTIVE` ở envelope cọc nghĩa là **đã ký đủ hai bên**, không phải đã bắt đầu thuê.

## 5. Cấu hình và lỗi thường gặp

Giữ chế độ `homespace.signature.mode=SMARTCA`, kết nối VNPT, storage và Gotenberg đã dùng cho hợp đồng thuê. Không thêm API key vào source. `rental.deposit-signing-hours=48` trong Core application.properties là cửa sổ khách ký cọc tính từ khi chữ ký chủ nhà được xác minh; cửa sổ ký thuê độc lập. Mỗi bên cần tự phê duyệt hai giao dịch ký cho hai PDF.

| Hiện tượng | Xử lý |
| --- | --- |
| Tiền xác nhận nhưng chưa có văn bản | Kiểm tra mẫu PUBLISHED đúng loại nhà; bấm **Kiểm tra / tạo lại tài liệu cọc** để xem thiếu dữ liệu gì, hoặc chờ job thử lại |
| Thiếu bản chụp tài sản / dữ liệu giao dịch không khớp | Đối soát hồ sơ; không lấy listing hiện tại hay tổng khoản gộp để tự thay lịch sử |
| PDF không sẵn sàng | Kiểm tra Gotenberg/storage; retry PDF từ snapshot đã có, không thu tiền lần nữa |
| Không có chứng thư | Kiểm tra CCCD, KYC và chứng thư SmartCA đúng người ký |
| Provider đã ký nhưng PDF chưa hoàn tất | Theo dõi polling/embedding/retry có sẵn; không tạo giao dịch mới khi kết quả cũ chưa rõ |
| Hết hạn khách ký cọc | Chủ nhà dùng **Mở lại hạn ký cọc**; không tự kết luận mất cọc |
| Đang ký/chưa rõ kết quả mà muốn hủy | Đối soát chữ ký trước; không hủy khi còn giao dịch chữ ký chưa xác định |

Nếu hồ sơ được hủy/hoàn tiền theo luồng hai bên thỏa thuận, tài liệu cọc đã ký vẫn giữ nguyên để tra cứu, không bị sửa/xóa hay coi là hợp đồng thuê đang chạy.

## 6. API cho kiểm thử

Các đường dẫn dưới có prefix `/api/v1`; qua gateway dùng cơ chế đăng nhập hiện tại, không giả mạo user header:

| Method | Đường dẫn | Mục đích |
| --- | --- | --- |
| GET | `/rental-requests/reservation-policy` | Toàn văn/version điều kiện giữ chỗ cho UI |
| GET | `/rental-requests/{id}/deposit-agreement` | Hồ sơ cọc, tài liệu, khả năng ký và lý do bị chặn; chỉ hai bên hồ sơ |
| GET | `/contracts?includeDepositFallback=true&role=LANDLORD` | Danh sách hồ sơ theo vai trò, ưu tiên HĐ thuê; dùng `TENANT` cho khách thuê, lọc và phân trang ở backend |
| GET | `/contracts/by-rental-request/{id}?includeDepositFallback=true` | Tài liệu chính của yêu cầu thuê; HĐ cọc là phương án hiển thị khi chưa có HĐ thuê đọc được |
| POST | `/rental-requests/{id}/deposit-agreement/prepare` | Tạo/thử lại snapshot hoặc PDF; không xác nhận tiền |
| POST | `/rental-requests/{id}/deposit-agreement/reopen-signing` | Chủ nhà mở lại hạn khách ký |
| GET | `/admin/contract-template-fields?documentKind=DEPOSIT` | Catalog D2 |
| GET | `/admin/contract-templates?documentKind=DEPOSIT` | Mẫu cọc |
| GET | `/admin/contracts?documentKind=DEPOSIT` | Hồ sơ cọc |

Ký sử dụng API `/contracts/{depositAgreementContractId}/signatures/...` có sẵn. **Không dùng ID hợp đồng thuê để ký thay tài liệu cọc.**

`includeDepositFallback` mặc định `false`: API danh sách cũ và `billableOnly=true` vẫn chỉ trả HĐ thuê; HĐ cọc không xuất hiện trong luồng hóa đơn. Không có thay đổi schema hoặc yêu cầu seed/drop CSDL cho phần giao diện này. Cần restart backend đã build và tải lại frontend.

## 7. Checklist nghiệm thu live

- Cọc riêng ngày tương lai: hai bên ký cọc, listing vẫn RESERVED, chưa có tiền thuê bị thu lại.
- Khoản gộp: PDF phân biệt tổng chuyển / RENT / DEPOSIT; ký cọc xong mới ký thuê, không thu cọc lần hai.
- Cọc 0: không có văn bản nhận cọc giả.
- Thiếu mẫu hoặc lỗi PDF: tiền vẫn CONFIRMED; sửa nguyên nhân và retry không nhân bản hồ sơ.
- Sai người / chưa đủ KYC / chưa xác nhận tiền: không được ký.
- Khách ký cọc quá hạn: chặn bắt đầu ký mới, chủ nhà mở lại được; chữ ký provider đã hoàn tất phải được đối soát, không bỏ mất.
- Ký cọc không kích hoạt listing, parking hoặc hóa đơn; chỉ hợp đồng thuê ký đủ mới kích hoạt các bước đó.
- PDF cọc và thuê đều tải được, mỗi PDF có đúng hai chữ ký của hai bên; bản cũ không thay đổi khi cập nhật mẫu.

Unit test và render DOCX không thay thế nghiệm thu PDF/chữ ký số thật với VNPT. Không tự chạy thanh toán hay ký thật khi chỉ build/test source.
