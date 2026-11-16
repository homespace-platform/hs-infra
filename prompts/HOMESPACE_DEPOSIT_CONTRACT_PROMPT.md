# HOMESPACE — PROMPT TẠO 03 MẪU WORD HỢP ĐỒNG ĐẶT CỌC / GIỮ CHỖ THUÊ

## NHIỆM VỤ THỰC HIỆN NGAY — KHÔNG CẦN NGỮ CẢNH BÊN NGOÀI

Bạn nhận đúng file này, không có lịch sử trò chuyện, mã nguồn hoặc dữ liệu khách hàng. Hãy tạo mới **đúng 03 mẫu Word (.docx) chưa điền dữ liệu**, tên file ở I.3, đủ nội dung VII và khác biệt VIII. Thực hiện ngay bằng công cụ tạo file nếu có; trả ba liên kết tải thực tế cùng báo cáo kiểm tra IX. Không yêu cầu repository, API, prompt hợp đồng thuê, Word cũ, ảnh CCCD hay thông tin giao dịch để bắt đầu.

- HomeSpace là nền tảng cho thuê bất động sản. Bên A là bên cho thuê/nhận cọc, Bên B là người thuê/đặt cọc. `HOUSE`, `APARTMENT`, `ROOM` lần lượt là nhà nguyên căn, căn hộ chung cư, phòng trọ. HomeSpace không nhận hoặc giữ tiền thay các bên.
- “Snapshot” là bản dữ liệu được hệ thống chốt và lưu tại thời điểm giao dịch; “backend/Core API” là phần mềm điền mẫu sau này. “KYC” là danh tính được VNPT eKYC xác minh. Những từ này chỉ giải thích nguồn, không yêu cầu AI truy cập hoặc lập trình hệ thống.
- D2 là tên bộ marker của **hợp đồng đặt cọc**, độc lập bộ marker hợp đồng thuê. Catalog IV trong file này là danh sách đầy đủ được phép dùng; không cần biết bộ thuê V3 và không thêm marker chỉ vì thấy hợp đồng khác sử dụng.
- Placeholder là văn bản giữ nguyên cho thư viện poi-tl thay sau, không phải Word merge field hoặc câu hỏi cần AI điền. Giữ chính xác `{{` / `}}`, dấu chấm, chữ hoa/thường và `#`. Không dùng Jinja, vòng lặp, if/else, `${...}`, marker tự đặt hoặc dấu chấm làm chỗ trống. Ví dụ trong lời hướng dẫn không phải dữ liệu điền vào hợp đồng.
- Giữ đủ tám marker KYC trong phần thông tin **mỗi bên**, kể cả ngày/nơi cấp hoặc hết hạn có thể chưa có giá trị. Liên hệ và ngân hàng là nguồn riêng; không thay danh tính KYC bằng hồ sơ tự nhập. Số CCCD/tài khoản là chuỗi giữ số 0 đầu; ngày hết hạn có thể là “Không thời hạn”. Không in điểm khuôn mặt hoặc kết quả kiểm tra kỹ thuật KYC vào hợp đồng.
- Áp dụng quy tắc II–V cho nội dung VI–VIII. Catalog IV quyết định tên marker; IV.4 quyết định tập marker phải có trong mỗi mẫu; VII–VIII quyết định vị trí và câu chữ. Các điều kiện dữ liệu trước phát hành do phần mềm kiểm tra, **không phải yêu cầu có dữ liệu thật trước khi AI tạo mẫu**.
- Ngày, tiền, bằng chữ, thời hạn và điều kiện động được phần mềm cung cấp. Không lấy ngày hiện tại, không điền giá trị minh họa, không tự tính hạn/phạt hoặc suy thông tin còn thiếu. Giữ marker nguyên dạng trong mẫu, kể cả trường có thể trống sau kết xuất.
- Chỉ đưa chính văn hợp đồng tiếng Việt và marker vào DOCX. Không chép hướng dẫn kỹ thuật, tên bảng dữ liệu, checklist, URL, báo cáo hoặc giả định kiểm thử vào chính văn. Không viết code backend hoặc tạo thêm tài liệu/phiên bản hợp đồng đã điền.
- Nếu không thể tạo file hoặc xem bố cục, nêu đúng giới hạn; không tạo liên kết tải giả hoặc báo đã render/kiểm thử HomeSpace khi chưa làm. Chưa truy cập backend không cản trở việc tạo mẫu bằng marker.

## I. BỐI CẢNH NGHIỆP VỤ CẦN PHẢN ÁNH TRONG MẪU

### 1. Luồng thực tế: cọc xuất hiện TRƯỚC hợp đồng thuê

Luồng nhận nhà sau ngày hiện tại:

~~~text
Khách đồng ý điều kiện giữ chỗ và gửi yêu cầu thuê (PENDING)
→ Chủ nhà chấp nhận (ACCEPTED), listing RESERVED; chụp Listing snapshot
→ Tạo PaymentRequest loại RESERVATION_DEPOSIT: chỉ tiền cọc
→ Khách chuyển thẳng vào tài khoản chủ nhà và báo chuyển kèm chứng từ
→ Chủ nhà xác nhận nhận đủ (CONFIRMED); sổ cọc ghi nhận HELD
→ Xuất văn bản cọc từ snapshot độc lập → chủ nhà ký số → người thuê ký số cọc
→ Chờ tới ngày bắt đầu thuê mới mở INITIAL: chỉ tiền thuê tháng đầu
→ Xác nhận đủ tiền tháng đầu, hệ thống tạo bản nháp hợp đồng thuê
→ Hoàn thiện bản nháp → chủ nhà ký → người thuê ký hợp đồng thuê
~~~

Nhận nhà ngay trong ngày: HomeSpace tạo **INITIAL gộp tiền tháng đầu + cọc**, không tạo RESERVATION_DEPOSIT riêng. Sau xác nhận khoản gộp, phải tách đúng dòng DEPOSIT để xuất văn bản cọc; đồng thời luồng hợp đồng thuê có thể chuẩn bị bản nháp. Hai bên ký đủ văn bản cọc rồi mới ký hợp đồng thuê, kể cả hai bước diễn ra cùng ngày.

Ba DOCX D2 chỉ dùng cho hồ sơ có số tiền cọc theo yêu cầu thuê đã chốt lớn hơn 0 và phần cọc thực nhận đã được hai bên xác nhận, khớp với hồ sơ. Không cần đặt cọc và cọc 0 đồng cùng đi theo luồng hợp đồng thuê. Hệ thống bỏ qua lập và ký hợp đồng cọc, không phát sinh hoàn hay khấu trừ cọc. Khoản INITIAL chỉ có tiền thuê, kể cả khi đã CONFIRMED, không phải nguồn phát hành hợp đồng cọc. Không tạo mẫu D2 riêng cho cọc 0. Đây là quy tắc chọn mẫu của hệ thống, không in vào chính văn D2.

**Thời điểm phần mềm phát hành văn bản đã điền:** sau khi chủ nhà xác nhận khoản có cọc dương, giao dịch được commit. Chỉ gửi yêu cầu thuê, tạo QR, upload ảnh hoặc người thuê báo chuyển chưa đủ để phát hành bản xác nhận đã nhận cọc.

### 2. Văn bản đang cần tạo là gì?

Một thỏa thuận đặt cọc/giữ chỗ gắn với **yêu cầu thuê đã được chấp nhận** và **phần cọc đã được hai bên xác nhận**, nhằm chuẩn bị giao kết hợp đồng thuê và thực hiện việc nhận tài sản theo các điều kiện đã thỏa thuận.

Ở giai đoạn này có thể **chưa tồn tại Contract/ContractRevision**. Vì vậy:

- Không yêu cầu số/ngày hợp đồng thuê đã ký, không viết “căn cứ hợp đồng thuê số ... đã ký”.
- Ngày bắt đầu, thời hạn và giá thuê là điều kiện dự kiến/theo yêu cầu đã chấp nhận; không tuyên bố chỉ vì đóng cọc mà hợp đồng thuê đã có đủ chữ ký hoặc tài sản đã bàn giao.
- Khi hợp đồng thuê được ký sau đó, khoản cọc này được liên kết và ghi nhận một lần; không thu lại, không tự hoàn ngay sau ký, không tự chuyển thành tiền tháng đầu.
- Chỉ dẫn chiếu nội dung hồ sơ giữ chỗ đã được chấp thuận. Hợp đồng thuê tương lai chưa tồn tại không thể là nguồn duy nhất để định nghĩa cách xử lý cọc trước ký.

### 3. Ba file đầu ra

| Loại hình | Tên file |
| --- | --- |
| HOUSE | HomeSpace_01_Hop_Dong_Dat_Coc_Nha_Nguyen_Can.docx |
| APARTMENT | HomeSpace_02_Hop_Dong_Dat_Coc_Can_Ho_Chung_Cu.docx |
| ROOM | HomeSpace_03_Hop_Dong_Dat_Coc_Phong_Tro.docx |

Tên trên văn bản: **HỢP ĐỒNG ĐẶT CỌC THUÊ NHÀ NGUYÊN CĂN / CĂN HỘ CHUNG CƯ / PHÒNG TRỌ** tương ứng.

Phụ đề: *Ghi nhận tiền cọc giữ chỗ theo yêu cầu thuê được chấp nhận và thỏa thuận chuẩn bị giao kết hợp đồng thuê.*

### 4. HomeSpace, tiền và chữ ký

- Bên A là bên cho thuê/nhận cọc; Bên B là người thuê/đặt cọc. HomeSpace không phải bên nhận cọc hoặc bên bảo lãnh.
- Tiền chuyển trực tiếp từ B sang tài khoản A. HomeSpace tạo VietQR/hướng dẫn, lưu chứng từ và xác nhận do các bên khai báo; không nhận/giữ tiền, không xác minh ngân hàng ghi Có/ghi Nợ.
- Snapshot tài khoản người trả ở giao dịch là **tài khoản đăng ký nhận hoàn**. Không suy nó chính là tài khoản thực tế đã chuyển tiền; ảnh chuyển khoản cũng không tự chứng minh điều đó.
- Tiền CONFIRMED và văn bản được ký là hai trạng thái riêng. Xác nhận tiền, checkbox điều kiện giữ chỗ hoặc chữ ký trên hợp đồng thuê tương lai không tự trở thành hai chữ ký trên đúng file cọc này.
- Yêu cầu đã chốt: **xuất file cọc sau xác nhận tiền và hai bên ký số riêng văn bản cọc trước khi ký thuê**. Không buộc ký cọc xong mới được ghi nhận tiền đã nhận. Tiền, việc ký cọc và việc ký thuê là ba trạng thái riêng.
- File đã xuất nhưng chưa có hai chữ ký đúng nội dung chỉ được gắn “đã lập/chờ ký”, không ghi “đã ký đủ”. Workflow cọc phải có metadata/hash của chính PDF cọc, không dùng chữ ký hợp đồng thuê để thay thế và không thay đổi lịch sử nhận tiền.
- Ngày lập văn bản, ngày chấp nhận yêu cầu, thời điểm báo chuyển, xác nhận tiền và thời điểm ký là các sự kiện riêng. DOCX dùng **ngày lập**, không dùng ngày ký tương lai.

## II. NGUỒN DỮ LIỆU VÀ CÁC KHÁI NIỆM DÙNG TRONG ĐẶC TẢ

AI không cần truy vấn các nguồn này. Phần mềm HomeSpace sẽ cung cấp giá trị cho marker từ các bản dữ liệu đã chốt:

| Nhóm thông tin | Nguồn và ý nghĩa |
| --- | --- |
| Hai bên | Danh tính KYC đã xác thực của chủ nhà/người thuê; điện thoại/email là thông tin liên hệ |
| Tài sản | Tin đăng được lưu khi chủ nhà chấp nhận yêu cầu: loại hình, địa chỉ, diện tích, số căn/phòng, phạm vi thuê |
| Điều kiện thuê | Yêu cầu thuê được chấp nhận: ngày bắt đầu/kết thúc dự kiến, số tháng, số người/xe và giá/cọc đã chốt |
| Giao dịch | Khoản chuyển đã được người thuê báo và chủ nhà xác nhận nhận đủ; gồm riêng phần thuê và phần cọc |
| Ngân hàng | Bản lưu tài khoản chủ nhà nhận tiền và tài khoản người thuê đăng ký nhận hoàn; không lấy tài khoản thay đổi về sau |
| Điều kiện giữ chỗ | Toàn văn thỏa thuận đã được chấp thuận, phiên bản và thời điểm chấp thuận; không thay bằng chính sách mới |
| Văn bản cọc | Số văn bản/ngày lập riêng; không dùng số/ngày ký hợp đồng thuê tương lai |

Tên trạng thái trong mô tả: `PENDING` = đang chờ, `ACCEPTED` = yêu cầu được chủ nhà chấp nhận, `CONFIRMED` = hai bên đã xác nhận khoản chuyển, `HELD` = hệ thống ghi nhận cọc do chủ nhà giữ. `RESERVATION_DEPOSIT` là khoản chỉ thu cọc; `INITIAL` là khoản ban đầu có thể gộp tiền thuê kỳ đầu và cọc. `RENT` / `DEPOSIT` lần lượt là phần tiền thuê / phần cọc trong giao dịch. Đây là khái niệm giải thích nguồn, không phải câu chữ kỹ thuật để in vào hợp đồng.

### Nguồn danh tính bắt buộc: KYC đã xác thực

- Họ tên pháp lý, CCCD, ngày sinh, giới tính, thường trú, ngày cấp, ngày hết hạn và nơi cấp của cả hai bên lấy từ `user_kyc_details` gắn đúng user ID đã xác minh. Không lấy các trường này từ tên hiển thị, ngày sinh/địa chỉ tự nhập trong profile hoặc `renterName` của yêu cầu thuê.
- Chụp dữ liệu KYC vào snapshot khi lập văn bản. Không tự thay dữ liệu của hợp đồng đã ký khi profile/KYC về sau thay đổi; không để người dùng sửa thủ công danh tính qua bản nháp/phụ lục.
- Các trường ngày/nơi cấp hoặc hết hạn chưa được nhà cung cấp trả về phải để trống, không suy đoán. Giá trị ngày hết hạn như “Không thời hạn” phải giữ đúng kết quả KYC.
- Điện thoại/email là thông tin liên hệ; ngân hàng giữ đúng snapshot giao dịch. Điểm so khớp khuôn mặt và kết quả kiểm tra kỹ thuật lưu tại hồ sơ KYC, không in vào phần định danh trên hợp đồng.

## III. QUY TẮC SNAPSHOT, TIỀN VÀ HẠN

### 1. Bản dữ liệu bất biến

Tài sản, điều kiện thuê, danh tính KYC, tài khoản và sự kiện tiền được phần mềm chụp lại cho văn bản cọc. Mẫu chỉ chứa marker, không tự lấy hồ sơ/tin đăng hiện tại để sửa lịch sử. Không suy tư cách sở hữu, giấy ủy quyền, ngày/nơi cấp hoặc thường trú từ địa chỉ tài sản/địa chỉ liên hệ. Thiếu dữ liệu thực tế phải được xử lý trước khi hệ thống phát hành, không điền giả vào mẫu.

### 2. Phân biệt phần cọc với tổng giao dịch

- Với khoản chỉ thu cọc, phần thuê có thể là 0; với khoản gộp, tổng giao dịch gồm phần thuê và phần cọc. Chỉ `depositPayment.confirmedAmountNumber` là cọc đã được xác nhận; không dùng tổng giao dịch làm tiền cọc.
- Ví dụ để hiểu quy tắc, **không điền vào mẫu**: tổng 12 triệu = thuê 8 triệu + cọc 4 triệu; văn bản ghi cọc 4 triệu và vẫn thể hiện tổng 12 triệu/phần thuê 8 triệu bằng các marker riêng.
- Nghĩa vụ cọc theo hồ sơ (`deposit.amountNumber`) và cọc thực nhận (`depositPayment.confirmedAmountNumber`) có ý nghĩa khác nhau. Phần mềm đối chiếu chúng trước phát hành; AI không tự sửa hoặc tính giá trị.
- Không mô tả góp cọc nhiều đợt/xác nhận một phần như tính năng sẵn có. Văn bản ghi nhận khoản đã xác nhận, không yêu cầu chuyển lại cọc. Hồ sơ miễn cọc/cọc 0 không dùng ba mẫu D2 này.

### 3. Ngày lập, thời điểm xác nhận và các hạn

- Ngày lập văn bản không phải ngày ký. Ngày chấp nhận yêu cầu, chấp thuận điều kiện, báo chuyển và xác nhận tiền là các sự kiện riêng.
- Ngày thuê được phần mềm cấp theo `dd/MM/yyyy`; sự kiện có ngày/giờ dùng `dd/MM/yyyy HH:mm:ss` theo giờ Việt Nam (`Asia/Ho_Chi_Minh`). Không dùng đồng hồ AI hoặc tự tính từ ngày nhận cọc.
- Hạn thanh toán/ký có thể chưa phát sinh khi lập cọc. Giữ `depositAgreement.nextStepsText` đúng một lần để phần mềm đưa vào đoạn hoàn chỉnh theo nhánh vào ngay/vào sau. Không viết cứng số phút/ngày, tự tạo deadline hoặc coi thời hạn chuyển khoản trước xác nhận là ngày cọc đã nhận tự hết hiệu lực.

### 4. Điều kiện giữ chỗ và xử lý trước ký

- Đặt `depositAgreement.reservationTerms` đúng một lần, ở đoạn riêng. Phần mềm cấp toàn văn điều kiện đã được chấp thuận, gồm nghĩa vụ tháng đầu/ký, thông báo, phản hồi/đối soát, xử lý cọc và nghĩa vụ hoàn tiền thuê nếu có.
- Không viết lại hoặc bổ sung chế tài bên cạnh marker; không áp quy tắc hóa đơn quá hạn 5 ngày của hợp đồng thuê đang thực hiện vào cọc trước ký.
- Không tự coi hết đếm ngược là mất cọc; không giữ toàn bộ giao dịch gộp thay vì chỉ phần cọc; không coi lỗi hệ thống/thiếu mẫu là lỗi người thuê. Các bên xử lý theo thỏa thuận hợp lệ, chứng cứ và pháp luật, không có quyền tự cưỡng chế tài sản chỉ vì phần mềm ghi nhận trạng thái.
- Hủy/hoàn/khấu trừ sau này không xóa chứng cứ tiền đã nhận. Yêu cầu hoàn không đồng nghĩa người thuê đã nhận tiền. Không tự khẳng định số bồi thường hoặc backend tự tính phạt gấp đôi.

## IV. CATALOG PLACEHOLDER D2 — HỢP ĐỒNG DỮ LIỆU CHO WORD

### 1. Quy ước

Chỉ marker trong hai bảng dưới được phép nằm trong DOCX. Catalog D2 dưới đây gồm **56 mã**: 38 mã dùng chung về hai bên/tài sản/điều kiện thuê và 18 mã riêng về hồ sơ cọc. Đây là toàn bộ danh mục cần biết cho nhiệm vụ này; không dùng marker hoặc checklist hợp đồng thuê.

Tiền đã có VNĐ; rent.amountNumber đã có /tháng. Không nối thêm đơn vị. Bằng chữ do backend sinh từ cùng giá trị số; tài khoản là chuỗi. Tất cả marker một-run, không gõ nhãn “null”, “N/A” hoặc dấu chấm thủ công.

### 2. Danh tính, tài sản và điều kiện thuê — 38 mã

Tên tương thích V3 không có nghĩa đã có data model cọc. Các giá trị dưới phải được builder D2 map từ nguồn ở mục II–III.

| Marker | Nguồn/ý nghĩa trong mẫu cọc |
| --- | --- |
| {{landlord.fullName}} | Họ tên thật bên cho thuê, chụp tại lập hồ sơ cọc |
| {{landlord.idNumber}} | Số CCCD từ KYC đã xác thực — bắt buộc |
| {{landlord.permanentAddress}} | Nơi thường trú từ KYC đã xác thực — bắt buộc |
| {{landlord.birthDate}} | Ngày sinh từ KYC đã xác thực — bắt buộc |
| {{landlord.gender}} | Giới tính từ KYC đã xác thực — bắt buộc |
| {{landlord.issueDate}} | Ngày cấp CCCD từ KYC đã xác thực — để trống nếu KYC không trả về |
| {{landlord.expirationDate}} | Ngày hết hạn CCCD từ KYC đã xác thực — để trống nếu KYC không trả về |
| {{landlord.issuePlace}} | Nơi cấp CCCD từ KYC đã xác thực — để trống nếu KYC không trả về |
| {{landlord.phone}} | Liên hệ Bên A |
| {{landlord.bankAccountHolder}} | Tên chủ tài khoản Bên A nhận tiền, từ bản lưu giao dịch |
| {{landlord.bankAccountNumber}} | Số tài khoản Bên A nhận tiền, giữ số 0 đầu |
| {{landlord.bankName}} | Ngân hàng Bên A nhận tiền |
| {{tenant.fullName}} | Họ tên pháp lý từ KYC đã xác thực của người thuê |
| {{tenant.idNumber}} | Số CCCD từ KYC đã xác thực — bắt buộc |
| {{tenant.permanentAddress}} | Nơi thường trú từ KYC đã xác thực — bắt buộc |
| {{tenant.birthDate}} | Ngày sinh từ KYC đã xác thực — bắt buộc |
| {{tenant.gender}} | Giới tính từ KYC đã xác thực — bắt buộc |
| {{tenant.issueDate}} | Ngày cấp CCCD từ KYC đã xác thực — để trống nếu KYC không trả về |
| {{tenant.expirationDate}} | Ngày hết hạn CCCD từ KYC đã xác thực — để trống nếu KYC không trả về |
| {{tenant.issuePlace}} | Nơi cấp CCCD từ KYC đã xác thực — để trống nếu KYC không trả về |
| {{tenant.phone}} | Điện thoại liên hệ người thuê đã lưu |
| {{tenant.bankAccountHolder}} | Tên chủ tài khoản Bên B đăng ký nhận hoàn, từ bản lưu giao dịch |
| {{tenant.bankAccountNumber}} | Số tài khoản Bên B đăng ký nhận hoàn, giữ số 0 đầu |
| {{tenant.bankName}} | Ngân hàng Bên B đăng ký nhận hoàn |
| {{tenant.occupantCount}} | Số người dự kiến đã đăng ký |
| {{tenant.motorbikeCount}} | Xe máy đăng ký, 0 hợp lệ |
| {{tenant.carCount}} | Ô tô đăng ký, 0 hợp lệ |
| {{property.propertyType}} | Loại hình tiếng Việt từ Listing snapshot |
| {{property.fullAddress}} | Địa chỉ tài sản thực tế tại snapshot, không phải địa chỉ cá nhân |
| {{property.areaText}} | Diện tích thuê đã format m² |
| {{property.unitNumber}} | Bắt buộc riêng APARTMENT/ROOM; HOUSE bỏ dòng này |
| {{lease.startDateText}} | Ngày bắt đầu thuê dự kiến/đã được chấp nhận |
| {{lease.endDateText}} | Ngày cuối dự kiến, tính theo kỳ thuê |
| {{lease.durationMonths}} | Số tháng, không lặp diễn giải |
| {{rent.amountNumber}} | Giá tháng đã chốt ở hồ sơ; đã kèm VNĐ/tháng |
| {{rent.amountWords}} | Bằng chữ của cùng giá tháng |
| {{deposit.amountNumber}} | Nghĩa vụ cọc của hồ sơ; đã kèm VNĐ |
| {{deposit.amountWords}} | Bằng chữ nghĩa vụ cọc |

### 3. Hồ sơ và giao dịch cọc — 18 mã

| Marker | Nguồn dữ liệu |
| --- | --- |
| {{depositAgreement.number}} | Số riêng ổn định của văn bản cọc; phần mềm cấp, không dùng số hợp đồng thuê |
| {{depositAgreement.issuedAtText}} | Ngày giờ lập văn bản cọc đã được phần mềm chốt, không phải ngày ký |
| {{depositAgreement.reservationTerms}} | Toàn văn điều kiện giữ chỗ đã chấp thuận, khóa version/hash, in đúng một lần |
| {{depositAgreement.nextStepsText}} | Đoạn hoàn chỉnh theo nhánh vào ngay/vào sau và mốc thật/quy tắc tại snapshot; đủ thông tin mở tháng đầu và bước ký, không giả deadline chưa phát sinh |
| {{rentalRequest.reference}} | Mã tham chiếu yêu cầu thuê được phần mềm cấp; không tự tạo hoặc rút gọn |
| {{rentalRequest.acceptedAtText}} | Thời điểm chủ nhà chấp nhận yêu cầu thuê, theo giờ Việt Nam |
| {{rentalRequest.policyVersion}} | Phiên bản điều kiện giữ chỗ đã được chấp thuận |
| {{rentalRequest.policyAcceptedAtText}} | Thời điểm người thuê chấp thuận điều kiện giữ chỗ, không phải thời điểm ký văn bản cọc |
| {{depositPayment.typeText}} | Nhãn theo payment nguồn: “Cọc giữ chỗ” hoặc “Khoản ban đầu gồm tiền thuê và cọc” |
| {{depositPayment.totalAmountNumber}} | totalAmount của payment nguồn CONFIRMED, đã format VNĐ |
| {{depositPayment.rentComponentAmountNumber}} | Tổng RENT của payment nguồn, 0 VNĐ khi chỉ cọc |
| {{depositPayment.confirmedAmountNumber}} | Tổng DEPOSIT của payment nguồn đã xác nhận; không phải toàn khoản gộp |
| {{depositPayment.confirmedAmountWords}} | Bằng chữ phần cọc đã xác nhận |
| {{depositPayment.payerReportedAt}} | Thời điểm người thuê báo chuyển trên hệ thống, không phải thời gian ngân hàng thực hiện |
| {{depositPayment.payeeConfirmedAt}} | Thời điểm chủ nhà xác nhận đã nhận đủ giao dịch |
| {{depositPayment.confirmedAt}} | Thời điểm hệ thống ghi nhận hoàn tất xác nhận hai bên |
| {{depositPayment.transferReference}} | Nội dung VietQR của payment nguồn; với INITIAL là mã giao dịch gộp chứa cọc, không tự gọi là một lần chuyển cọc riêng |
| {{#depositOptionalInfoTable}} | Bảng 2 cột “Thông tin bổ sung | Giá trị ghi nhận”, dữ liệu có thì thêm hàng, không có thì backend bỏ cả marker/đoạn |

Bảng tùy chọn chỉ được chứa dòng có nguồn:
- Email liên hệ nếu có. Các trường CCCD/ngày/nơi cấp đã có marker danh tính KYC riêng, không lặp lại ở bảng tùy chọn.
- Địa chỉ profile của từng bên phải ghi **“Địa chỉ liên hệ theo hồ sơ”**; chỉ ghi thường trú nếu được xác minh đúng ý nghĩa.
- Tầng/phạm vi thuê/mã tin đăng từ snapshot tài sản khi có.
- Mã tham chiếu ngân hàng khi đã có nguồn khai báo thật, ghi rõ “do bên giao dịch cung cấp”.
- Không chèn QR có URL hết hạn, ảnh chứng từ, UUID storage, branch ID, số chỗ xe toàn chi nhánh, kinh độ/vĩ độ hoặc tiện ích xung quanh vào hợp đồng.

Marker bảng đặt thành đoạn riêng; backend tạo TableRenderData tương ứng. Không dùng section/loop/if tag hoặc bảng hàng trống mà renderer hiện chưa đăng ký. Phần mềm bỏ đoạn bảng nếu không có dòng; AI chỉ đặt marker nguyên dạng, không viết mã xử lý và không tự dựng hàng dữ liệu.

### 4. Tập bắt buộc của từng mẫu

- HOUSE: toàn bộ marker ở mục IV.2 **trừ property.unitNumber**, cộng toàn bộ marker mục IV.3.
- APARTMENT và ROOM: toàn bộ marker cả hai bảng.
- Không in marker thuộc contract.*, payment.initial.*, meters.*, deposit.description, các bảng thuê V3 hoặc namespace không có trong hai bảng D2. Điều kiện cọc trước ký phải lấy reservationTerms thay vì đoạn mặc định hậu bàn giao của V3.
- Không thêm placeholder chữ ký/ngày ký cọc: ngày lập đã có, sự kiện ký thực tế xử lý ngoài nội dung được ký.

Mẫu HOUSE phải có **55 mã duy nhất** (mọi mã catalog trừ `property.unitNumber`); APARTMENT/ROOM mỗi mẫu phải có **56 mã duy nhất**. Cả sáu marker ngày/nơi cấp/hết hạn của hai bên vẫn phải có trong mẫu dù giá trị có thể trống khi điền. Đây là bộ bắt buộc của **mẫu**. Field tùy chọn bên trong bảng có thể vắng. Gate dữ liệu giao dịch phải kiểm tra thêm danh tính, địa chỉ/tư cách pháp lý cần thiết; việc một field optional trong catalog kỹ thuật không kết luận nó optional về pháp lý.

## V. QUY TẮC TẠO FILE WORD VÀ CHỮ KÝ

1. A4 dọc; lề trái/phải 2,5 cm, trên 3 cm, dưới 2,5 cm. Header/Footer cách mép 1,25 cm.
2. Times New Roman, thân 12 pt, giãn dòng 1,15, sau đoạn 4 pt; điều khoản 13 pt đậm (trước 8, sau 4 pt); tên hợp đồng 16 pt đậm căn giữa.
3. Header nhỏ 8–9 pt màu xám, chỉ nhận diện. Quốc hiệu/tiêu ngữ trong body trang đầu, không đặt trong Header. Đặt PAGE field đúng Footer nếu dùng số trang.
4. Giãn cách bằng paragraph spacing, không chèn hàng loạt dòng trống/space/tab; không shape, text box, bảng lồng. Tiêu đề đi cùng đoạn tiếp; bảng không cắt hàng, lặp hàng tiêu đề.
5. Mỗi placeholder nằm nguyên trong **một w:r**; không tách dấu ngoặc, namespace hoặc tên field. Có thể có nhiều w:t trong cùng run nhưng toàn marker phải trong cùng run; không ghép hai run để giả đạt.
6. Bảng tĩnh dùng để trình bày các bên/tiền/mốc được phép, có dữ liệu marker đầy đủ; bảng tùy chọn chỉ có marker IV.3 ở một paragraph riêng.
7. DOCX này không có trang ký, khung ký hoặc dòng chấm. Backend nối đúng một trang ký SMARTCA riêng cho envelope cọc. DOCX không tự tạo thêm trang ký và không dùng envelope hợp đồng thuê để ký thay.
8. Một bản xuất chưa ký không được chèn ảnh/chữ ký của hợp đồng thuê, không thêm tuyên bố “đã ký SMARTCA”. Bản PDF ký riêng phải có hash/version và chữ ký ràng buộc đúng nội dung, không chỉnh sau ký.
9. Nội dung điều khoản, marker là chính văn. Không in bảng mapping source, báo cáo kiểm thử, “D2 cần triển khai”, các dòng hướng dẫn “nếu có dữ liệu” hoặc checklist vào hợp đồng.
10. Sau tạo Word: kiểm tra XML, render thật và xem từng trang. Không tự nhận đã render nếu công cụ không làm được; báo giới hạn trong câu trả lời, không giả file tải.
11. `depositAgreement.reservationTerms`, `depositAgreement.nextStepsText` và thông tin liên hệ có thể nhận nhiều dòng. Bật tùy chọn Word **Không giãn khoảng cách trên dòng kết thúc bằng Shift+Enter** (`word/settings.xml` → `w:compat/w:doNotExpandShiftReturn`, giá trị `true`). Khi căn đều hai lề, dòng ngắn kết thúc bằng ngắt dòng mềm vẫn phải giữ khoảng trắng bình thường. Thử kết xuất với cả đoạn dài và nhiều dòng ngắn; không dùng Distributed hoặc thêm dấu cách/Tab để chữa lỗi kéo giãn.

## VI. LỆNH THỰC THI CHO CHATGPT TẠO WORD

Ba DOCX D2 chỉ dùng cho hồ sơ có số tiền cọc theo yêu cầu thuê đã chốt lớn hơn 0 và phần cọc thực nhận đã được hai bên xác nhận, khớp với hồ sơ. Không cần đặt cọc và cọc 0 đồng cùng đi theo luồng hợp đồng thuê. Hệ thống bỏ qua lập và ký hợp đồng cọc, không phát sinh hoàn hay khấu trừ cọc. Khoản INITIAL chỉ có tiền thuê, kể cả khi đã CONFIRMED, không phải nguồn phát hành hợp đồng cọc. Không tạo mẫu D2 riêng cho cọc 0. Đây là quy tắc chọn mẫu của hệ thống, không in vào chính văn D2.

Bạn là người thiết kế mẫu Word cho HomeSpace. Hãy dùng toàn bộ đặc tả này để **tạo mới hoàn toàn 03 file DOCX tải được** ở mục I.3, không chỉ trả Markdown.

Đây là **mẫu hợp đồng cọc/giữ chỗ sau khi đã xác nhận tiền, trước khi hoàn tất ký hợp đồng thuê**, cho HOUSE/APARTMENT/ROOM. Trong mẫu dùng placeholder đúng catalog D2; không điền tên, tiền, tài khoản, ngày hoặc chính sách giả.

Hãy soạn mỗi file thành một văn bản đầy đủ, có thông tin các bên, tài sản, điều kiện thuê dự kiến, số tiền, xác nhận chuyển khoản, điều kiện giữ chỗ, quyền/nghĩa vụ, xử lý tiếp theo, hoàn/đối soát và chứng cứ điện tử theo dàn ý VII–VIII. Mỗi DOCX đứng độc lập; không viết “như mẫu nhà nguyên căn”.

Phân biệt nghĩa vụ cọc và phần cọc đã xác nhận, tổng giao dịch và phần tiền thuê; xuất file không tạo nghĩa vụ chuyển tiền lần hai. Không đặt điều kiện cần có hợp đồng thuê đã ký. Không gọi ngày lập là ngày ký, không coi file đã xuất tự có chữ ký của hai bên.

Nội dung điều kiện/next steps dùng đúng marker, không tự thêm số ngày, mức phạt cọc, thời hạn bàn giao hoặc phụ phí. HomeSpace không giữ tiền. Không khẳng định pháp luật tự động cho phép giữ cọc/cưỡng chế.

Thực hiện kỹ thuật và kiểm thử mục V, IX. Trả 03 link file, báo cáo marker/missing/unknown/run/render **trong câu trả lời**, và phân biệt kiểm tra mẫu với kiểm thử tích hợp HomeSpace. Không yêu cầu chủ dự án đưa thêm mẫu hợp đồng để bắt đầu thiết kế.

## VII. DÀN Ý CHÍNH VĂN CHUNG — ÁP DỤNG ĐẦY ĐỦ CHO TỪNG DOCX

### Mở đầu và các bên

- Quốc hiệu, tiêu ngữ; tên đúng loại hình ở I.3; phụ đề ghi cọc giữ chỗ theo yêu cầu đã chấp nhận.
- Số văn bản {{depositAgreement.number}}; **Ngày lập văn bản: {{depositAgreement.issuedAtText}}**.
- Căn cứ thỏa thuận giữ chỗ và nhu cầu thuê, Bộ luật Dân sự 2015; Luật Nhà ở 2023 trong phạm vi áp dụng và Luật Giao dịch điện tử 2023 cùng các sửa đổi còn hiệu lực. Không chép dài luật hoặc dẫn “hợp đồng thuê đã ký”.
- Bên A: {{landlord.fullName}}, CCCD {{landlord.idNumber}}, ngày sinh {{landlord.birthDate}}, giới tính {{landlord.gender}}, thường trú {{landlord.permanentAddress}}, ngày cấp {{landlord.issueDate}}, hết hạn {{landlord.expirationDate}}, nơi cấp {{landlord.issuePlace}}, điện thoại {{landlord.phone}}. Tài khoản nhận tiền: chủ tài khoản {{landlord.bankAccountHolder}}, số {{landlord.bankAccountNumber}}, ngân hàng {{landlord.bankName}}.
- Bên B: {{tenant.fullName}}, CCCD {{tenant.idNumber}}, ngày sinh {{tenant.birthDate}}, giới tính {{tenant.gender}}, thường trú {{tenant.permanentAddress}}, ngày cấp {{tenant.issueDate}}, hết hạn {{tenant.expirationDate}}, nơi cấp {{tenant.issuePlace}}, điện thoại {{tenant.phone}}. Tài khoản đăng ký nhận hoàn: {{tenant.bankAccountHolder}}, số {{tenant.bankAccountNumber}}, ngân hàng {{tenant.bankName}}.
- Đặt {{#depositOptionalInfoTable}} một lần tại đoạn riêng sau thông tin các bên; backend mở rộng thành thông tin đã có.

### Điều 1. Hồ sơ giữ chỗ, tài sản và điều kiện thuê dự kiến

1. Yêu cầu thuê tham chiếu {{rentalRequest.reference}}, chủ nhà chấp nhận lúc {{rentalRequest.acceptedAtText}}.
2. Loại hình {{property.propertyType}}, tài sản tại {{property.fullAddress}}, diện tích {{property.areaText}}. Với APARTMENT/ROOM in riêng số căn/phòng {{property.unitNumber}}; HOUSE không có dòng này.
3. Thời hạn dự kiến {{lease.durationMonths}} tháng, từ {{lease.startDateText}} đến hết {{lease.endDateText}}; giá tháng {{rent.amountNumber}}, bằng chữ {{rent.amountWords}}.
4. Số người đăng ký {{tenant.occupantCount}}, xe máy {{tenant.motorbikeCount}}, ô tô {{tenant.carCount}}. Đăng ký xe không tự xác nhận quyền/số chỗ xe độc quyền hoặc miễn phí.
5. Các thông tin ghi nhận điều kiện thuê được chấp nhận để giữ chỗ/chuẩn bị hợp đồng; việc nhận cọc chưa xác nhận đã bàn giao và chưa thay kết quả ký hợp đồng thuê.

### Điều 2. Số tiền cọc và phần thanh toán đã được xác nhận

1. Nghĩa vụ cọc theo hồ sơ: {{deposit.amountNumber}}, bằng chữ {{deposit.amountWords}}.
2. Phần cọc Bên A đã xác nhận nhận: {{depositPayment.confirmedAmountNumber}}, bằng chữ {{depositPayment.confirmedAmountWords}}.
3. Giao dịch nguồn loại {{depositPayment.typeText}}; tổng tiền {{depositPayment.totalAmountNumber}}, trong đó phần thuê tháng đầu {{depositPayment.rentComponentAmountNumber}}, phần cọc là số ở khoản 2.
4. Chỉ phát hành bản “đã nhận đủ cọc” sau kiểm tra số phần cọc khớp nghĩa vụ. Văn bản không yêu cầu trả lại khoản cọc đã nhận hoặc phát sinh thêm một lần cọc.
5. Chi phí điện/nước/dịch vụ không được coi đã trả nếu giao dịch không có; không đưa ước tính tháng vào phần cọc hoặc tiền đã nhận.

### Điều 3. Chuyển khoản trực tiếp và lịch sử xác nhận

1. Tiền được chuyển trực tiếp cho Bên A theo tài khoản giao dịch đã nêu. Tài khoản Bên B là nơi nhận hoàn đăng ký, không là xác nhận tài khoản nguồn thực chuyển.
2. Nội dung chuyển khoản {{depositPayment.transferReference}}. Bên B báo chuyển trên hệ thống lúc {{depositPayment.payerReportedAt}}; Bên A xác nhận nhận đủ giao dịch lúc {{depositPayment.payeeConfirmedAt}}; HomeSpace ghi nhận hoàn tất xác nhận lúc {{depositPayment.confirmedAt}}.
3. Đây là xác nhận của các bên; HomeSpace cung cấp hướng dẫn/VietQR và lưu chứng từ, không nhận/giữ tiền và không thay ngân hàng xác nhận ghi Có/ghi Nợ.
4. Sai lệch cần đối soát bằng chứng từ; không coi upload ảnh hoặc thời gian báo chuyển là chứng nhận ngân hàng. Thay tài khoản cần thông báo/xác nhận hợp lệ, không sửa hồi tố file đã lập.

### Điều 4. Điều kiện giữ chỗ đã chấp thuận và xử lý trước thuê

1. Người thuê đã chấp thuận điều kiện giữ chỗ phiên bản {{rentalRequest.policyVersion}} lúc {{rentalRequest.policyAcceptedAtText}}. Đây là mốc consent điều kiện, không tự là thời điểm ký file này.
2. Đặt **{{depositAgreement.reservationTerms}} đúng một lần** ở paragraph riêng. Backend cấp toàn văn áp dụng gồm điều kiện, thông báo, phản hồi/đối soát, xử lý cọc và tách nghĩa vụ hoàn tiền thuê; ChatGPT không tự viết thêm mức phạt/xóa quyền phản đối.
3. Các bên phối hợp xử lý theo thỏa thuận có căn cứ và pháp luật; không tự tịch thu toàn bộ giao dịch hoặc cưỡng chế nhận tài sản. Thiếu mẫu/lỗi hệ thống hoặc chưa cung cấp bản có thể xem/ký không tự thành lỗi của người thuê.
4. Nếu chủ nhà từ chối/không thể thực hiện giao tài sản hoặc việc ký/bàn giao không diễn ra do lỗi bên nào, việc hoàn và trách nhiệm được xác định theo thỏa thuận hợp lệ, chứng cứ và pháp luật; không mặc định mọi rủi ro thuộc Bên B.

### Điều 5. Thanh toán tháng đầu, giao kết thuê và chuyển tiếp cọc

1. Đặt **{{depositAgreement.nextStepsText}} đúng một lần** ở paragraph riêng. Đoạn backend phân biệt vào ngay/vào sau, khoản tháng đầu đã trả/chưa mở/chờ trả tại snapshot và bước ký tương ứng.
2. Khi đã ký thuê, số cọc này được ghi nhận liên kết một lần vào hồ sơ thuê; không thu lại và không mặc định hoàn ngay chỉ do ký xong. Chuyển sang cọc bảo đảm trong kỳ thuê theo điều khoản được hai bên giao kết hợp lệ, không tự áp hồi tố văn bản mới.
3. Cọc không tự bù tiền tháng đầu hoặc chi phí khác. Thay điều kiện/ngày bắt đầu cần xác nhận và phiên bản bổ sung, không viết lại lịch sử nhận tiền.
4. Văn bản không xác nhận tài sản đã bàn giao hoặc người thuê có quyền dọn vào trước khi hoàn thành điều kiện thực tế.

### Điều 6. Quyền, nghĩa vụ và hoàn tiền

1. Bên A cung cấp thông tin trung thực, bảo đảm tư cách cho thuê hợp pháp, giữ đúng tài sản theo hồ sơ còn hiệu lực và phối hợp chuẩn bị giao kết/bàn giao theo thỏa thuận.
2. Bên B khai báo trung thực, kiểm tra thông tin thụ hưởng, tuân thủ điều kiện đã chấp thuận và phối hợp đối soát. Không suy thêm nội quy sinh hoạt/tiện ích/phí từ loại nhà.
3. Hủy/không tiếp tục trước khi thuê xử lý theo Điều 4 và quyết định/thỏa thuận có căn cứ. Sau khi thuê, quyết toán/hoàn cọc theo hợp đồng thuê đã giao kết hợp lệ và thực tế bàn giao; văn bản này không tự đặt số ngày hoàn hay khoản khấu trừ mới.
4. Bên A chuyển phần phải hoàn trực tiếp vào tài khoản nhận hoàn đã thỏa thuận; xác nhận đã hoàn chỉ sau sự kiện chuyển/nhận theo quy trình. Yêu cầu hoàn hoặc lời hứa hoàn không đồng nghĩa đã trả tiền.
5. Tranh chấp/khấu trừ/hoàn phát sinh sau không xóa chứng cứ cọc đã nhận trong tài liệu này.

### Điều 7. Sửa đổi, tranh chấp và giá trị ghi nhận điện tử

1. Văn bản ghi nhận hồ sơ giữ chỗ và các xác nhận tiền, không tự thay hợp đồng thuê cần được giao kết sau đó; không tự cho thuê phát sinh hiệu lực chỉ vì có file.
2. Sửa đổi phải được xác nhận đúng thẩm quyền và lưu lịch sử. Bất đồng được thương lượng, đối soát; không giải quyết được có thể yêu cầu cơ quan/Tòa án có thẩm quyền theo pháp luật.
3. Giá trị của thông điệp dữ liệu/hành vi chấp thuận/chữ ký được xác định theo chứng cứ và quy định áp dụng. Ngày lập, consent điều kiện, nhận tiền và ký đúng văn bản được lưu riêng; không khẳng định tự có chữ ký số của hai bên.
4. Kết thúc DOCX tại điều này; không thêm khu vực ký hoặc ảnh chữ ký. Không ghi cố định “đã ký đầy đủ/đã được HomeSpace bảo lãnh”.

## VIII. ĐIỀU CHỈNH RIÊNG CHO 03 MẪU

Áp dụng toàn bộ VII vào từng file, viết trôi chảy thành chính văn; không sao chép các chỉ dẫn kiểm thử.

### HOUSE — nhà nguyên căn

- Tên đúng nhà nguyên căn. Điều 1 xác định căn nhà và diện tích/phạm vi thực tế; không có unitNumber bắt buộc.
- Không tự cho rằng toàn bộ đất, nhiều tầng, quyền kinh doanh hoặc gara đều được cho thuê. Phạm vi có dữ liệu nằm trong bảng bổ sung; thiếu không tự hứa.
- Điều 6 nêu quyền cho thuê đúng tài sản và không giao trùng quyền thuê trái thỏa thuận giữ chỗ; không khẳng định sở hữu/không thế chấp khi chưa xác minh.
- Không chèn phí quản lý chung cư, quyền sử dụng công cộng hoặc giờ giới nghiêm của dãy trọ.

### APARTMENT — căn hộ chung cư

- Điều 1 có số căn {{property.unitNumber}} và loại hình {{property.propertyType}}, địa chỉ cụ thể; tên dự án/tầng nếu có nguồn nằm trong địa chỉ/bảng bổ sung.
- Không đánh đồng cả tòa/chung cư với căn hộ; không lấy tên PropertyBranch làm tên pháp lý tài sản.
- Điều 6 không mặc định bao gồm phí quản lý, thẻ xe, thẻ cư dân, hồ bơi/gym hoặc chỗ đậu xe trong tiền cọc. Mọi quyền/chi phí phải có dữ liệu/thỏa thuận phù hợp.
- Ghi giữ chỗ cho đúng căn xác định, không bảo đảm quyền sở hữu đối với phần chung.

### ROOM — phòng trọ

- Điều 1 bắt buộc số phòng {{property.unitNumber}}, loại hình {{property.propertyType}} và địa chỉ cụ thể.
- Khoản cọc của đúng phòng, không đồng nghĩa thuê cả dãy/tòa, khu bếp/sân/phòng chung trở thành diện tích riêng.
- Điều 6 không tự thêm cấm thú cưng/khách qua đêm, 22 giờ đóng cửa, phụ phí người/xe hay cọc điện nước; nội quy chỉ theo dữ liệu đã được thỏa thuận.
- Việc đóng cọc không xác nhận WC riêng, nội thất bàn giao hoặc giờ tự do nếu hồ sơ không có bằng chứng.

## IX. KIỂM THỬ VÀ CỔNG BÀN GIAO

### 1. Word do ChatGPT phải tự kiểm tra

- Đủ 03 file đúng tên, mở được; mỗi file là văn bản độc lập đầy đủ VII và khác biệt VIII.
- Trích marker từ document/header/footer XML theo paragraph rồi đối chiếu catalog IV. RequiredByCategory - detected rỗng; detected - catalog rỗng.
- Mọi marker trong một run; reservationTerms, nextStepsText và bảng tùy chọn mỗi marker đúng một lần.
- APARTMENT/ROOM có unitNumber; HOUSE không yêu cầu. Không có contract number/ngày ký thuê, signing placeholder, bảng điện/nước/nội thất hoặc thuật ngữ kỹ thuật nội bộ in trong Word.
- Không có câu khẳng định “hợp đồng thuê đã ký trước khi cọc”, tiền thuộc HomeSpace, tự xác minh ngân hàng, tự mất cọc do hết 60 phút, hóa đơn quá hạn 5 ngày, thanh toán một lần cọc nữa hoặc ngày ký giả.
- Render thử với dữ liệu tổng hợp **chỉ trong bản test tách biệt**, có địa chỉ/tên dài, tài khoản số 0 đầu, phần thuê 0 và phần thuê dương. Không thay mẫu đầu ra bằng hợp đồng điền data test.
- Quan sát mọi trang PDF/preview: lề, bảng, tiêu đề, marker dài, không trang trắng/tràn, không trang ký trùng. Nếu chưa render thật, nêu chưa kiểm tra.
- Trong câu trả lời: link 3 DOCX + marker phát hiện/thiếu/lạ/run lỗi/render thực tế. Không đính báo cáo vào hợp đồng.

### 2. Cách báo cáo kết quả — chỉ trong câu trả lời bàn giao

Báo riêng từng file: loại hình, tên/link file thật, số marker duy nhất, danh sách thiếu, mã ngoài catalog, marker bị lặp, lỗi một-run, kết quả xem bố cục hoặc “chưa kiểm chứng”. Không chỉ tự nhận “đã đủ”.

- `expected = catalog IV.2 + IV.3`, riêng HOUSE loại `property.unitNumber`.
- `missing = expected - detected`, `unknown = detected - catalog`: đều phải rỗng. HOUSE 55 mã; APARTMENT/ROOM 56 mã. Không dùng tổng số thay cho kiểm tra tập mã.
- `depositAgreement.reservationTerms`, `depositAgreement.nextStepsText`, `#depositOptionalInfoTable` mỗi marker đúng một lần, ở đoạn riêng. KYC phải đủ tám marker mỗi bên trong phần thông tin các bên.
- Đọc chính file DOCX cuối như ZIP: kiểm tra `word/document.xml`, `word/header*.xml`, `word/footer*.xml`, gồm paragraph trong ô bảng. Trích marker theo từng đoạn, không nối hai đoạn để tạo marker giả; kiểm tra nguyên marker trong một `w:r`. Marker giao dịch chỉ đặt trong thân tài liệu, không giấu ở header/footer hoặc checklist.
- Nếu công cụ hỗ trợ, dùng dữ liệu tổng hợp trên bản test tách biệt để thử tên/địa chỉ dài, ngân hàng có số 0 đầu, ngày hết hạn “Không thời hạn”, ngày/nơi cấp trống, phần thuê 0 và phần thuê dương. Giữ nguyên marker trong ba mẫu cuối bàn giao.
- Kiểm tra ZIP/XML và xem bố cục không chứng minh đã chạy poi-tl, phát hành, thanh toán hoặc ký số thật. Chỉ báo những kiểm tra đã thực hiện; không yêu cầu viết backend, khởi chạy HomeSpace hoặc sửa cấu hình để hoàn thành nhiệm vụ tạo mẫu.

### Nguồn pháp luật để người rà soát kiểm tra (không in URL/checklist vào DOCX)

- [Bộ luật Dân sự số 91/2015/QH13 — Cổng Chính phủ](https://vanban.chinhphu.vn/default.aspx?docid=183188&pageid=27160), đối chiếu Điều 328 về đặt cọc và các quy định liên quan.
- [Luật Giao dịch điện tử số 20/2023/QH15 — Bộ Khoa học và Công nghệ](https://mst.gov.vn/van-ban-phap-luat/24987.htm), kiểm tra cả sửa đổi đang có hiệu lực tại ngày áp dụng.
- Luật Nhà ở 2023 và các sửa đổi hiện hành trong phạm vi cho thuê/bàn giao/chấm dứt. Không dùng cơ chế xử lý quá hạn trong kỳ thuê làm căn cứ tự động giữ cọc trước khi giao kết.

Đặc tả này không chứng nhận mẫu đã được luật sư thẩm định. Việc rà soát chính ở đây là tương thích luồng, nguồn dữ liệu và khả năng render; điều khoản chế tài/hiệu lực cần được đối chiếu tình huống và pháp luật trước phát hành thực tế.
