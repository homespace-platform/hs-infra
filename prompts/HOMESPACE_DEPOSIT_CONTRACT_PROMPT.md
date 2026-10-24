# HOMESPACE — PROMPT TẠO 03 MẪU WORD HỢP ĐỒNG ĐẶT CỌC / GIỮ CHỖ THUÊ

**Phiên bản D2 — đối chiếu source ngày 24/10/2026.** Thay thế nội dung D1, đặc biệt giả định sai “ký hợp đồng thuê trước rồi mới đặt cọc”.

**Cách dùng:** Gửi **toàn bộ file này** cho ChatGPT có khả năng tạo file Word. Đầu ra là 03 file DOCX mẫu chứa placeholder cho poi-tl, chưa điền dữ liệu giao dịch. Tài liệu tự chứa đủ ngữ cảnh để soạn mẫu; ChatGPT tạo Word không cần truy cập repository hay CONTRACT_PROMPT.md.

**Cập nhật triển khai 24/10/2026:** catalog D2 và luồng cọc ký riêng đã được bổ sung trong source. Mọi hồ sơ có cọc dương đều ký hai văn bản: cọc trước, thuê sau; mỗi văn bản có chữ ký chủ nhà và khách thuê. Miễn cọc 0 đồng không phát sinh văn bản nhận cọc. Xem `../documents/DEPOSIT_AGREEMENT_ADMIN_GUIDE.md` để chạy và nghiệm thu. Phần review “đã có/phần thiếu” dưới đây ghi lại mốc trước triển khai, không phải báo cáo kiểm thử live. Không yêu cầu AI tạo Word viết code hoặc tự điền dữ liệu thiếu.

## I. NGHIỆP VỤ ĐÃ ĐỐI CHIẾU VỚI HOMESPACE

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

Cọc bằng 0: backend có thể tự ghi CONFIRMED để ghi nhận miễn thanh toán. Đây **không phải** giao dịch chuyển cọc 0 đồng; không xuất văn bản “đã nhận tiền cọc” trong bộ mẫu này.

**Thời điểm kích hoạt mong muốn:** sau khi chủ nhà xác nhận khoản có cọc dương, giao dịch được commit. Chỉ gửi yêu cầu thuê, tạo QR, upload ảnh hoặc người thuê báo chuyển chưa đủ để phát hành bản xác nhận đã nhận cọc.

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

## II. KẾT QUẢ REVIEW: DỮ LIỆU ĐÃ CÓ VÀ PHẦN THIẾU

Mục này dành cho người tích hợp và ChatGPT hiểu nguồn; **không chép vào thân Word**.

| Nội dung | Source hiện có | Kết luận |
| --- | --- | --- |
| Hồ sơ thuê, hai user ID, ngày vào, số tháng, người/xe | RentalRequest | Đã có; liên kết chính khi chưa có hợp đồng thuê |
| Chấp nhận và điều kiện giữ chỗ | acceptedAt; reservationPolicyVersion; reservationPolicyAcceptedAt | Đã có version/thời điểm; chưa thấy snapshot toàn văn/hash điều kiện đồng ý |
| Tài sản đã chốt | RentalRequest.listingSnapshot, chụp ở acceptRentalRequest | Có loại hình, fullAddress, area, unitNumber, floor, chi tiết, phí/chính sách; không lấy Listing live để ghi lại lịch sử |
| Giá/cọc đã tính cho hồ sơ | effectiveMonthlyRent hoặc monthlyRentPrice; depositAmount; costBreakdownSnapshot | Có; ưu tiên số đã chốt ở hồ sơ/giao dịch, không lấy giá hiện tại của Listing |
| Tách tiền thuê/cọc | PaymentRequest.type; PaymentLineItem.type RENT/DEPOSIT và amount | Đã có; không cần giả định backend chỉ lưu tổng gộp |
| Sổ cọc | DepositRecord.initialPaymentRequestId, originalAmount, heldAmount, receivedConfirmedAt, status | Có; tên initialPaymentRequestId còn trỏ RESERVATION_DEPOSIT ở luồng tách; phải follow ID, không suy PaymentType từ tên cột |
| Chuyển khoản và xác nhận | PaymentRequest.transferReference, payerReportedAt, payeeConfirmedAt, confirmedAt, status | Có; là khai báo/xác nhận hệ thống, không phải chứng nhận ngân hàng |
| Tài khoản nhận và nhận hoàn | payeeBankAccountSnapshot / payerBankAccountSnapshot | Có snapshot đủ bankName/accountNumber/accountHolderName; giữ số 0 đầu |
| CCCD và thông tin chủ nhà | User.cccd, firstName/lastName, phone/email | Có nguồn nhưng có thể thiếu; chưa được đóng băng riêng cho hồ sơ cọc |
| Tên/điện thoại/email người thuê | RentalRequest.renterName/renterPhone/renterEmail | Đã lưu; không tự thay bằng profile mới khác người đại diện |
| Địa chỉ cá nhân | user_addresses.display | Có địa chỉ profile; chưa chứng minh đây là địa chỉ thường trú pháp lý |
| Mã giao dịch ngân hàng | PaymentRequest/PaymentEvidence.bankTransactionReference | Có cột nhưng reportTransfer hiện ghi evidence reference null; không bắt buộc in nếu thực tế chưa thu thập |
| Mã tài liệu cọc/ngày lập/snapshot bất biến | Chưa thấy entity và mapping riêng | Cần bổ sung, không lấy mã hợp đồng thuê để giả làm mã cọc |
| Lịch mở tiền tháng đầu, hạn ký | PaymentRequest.opensAt/dueAt/contractDueAt; onboarding; config | Có quy tắc và một số mốc phát sinh sau; cần chụp thành nextStepsText đúng thời điểm, không tạo deadline tương lai giả |
| Xuất/lưu file cọc trước Contract | ContractDocument hiện bắt buộc contractId + revisionId + templateVersionId | Chưa dùng trực tiếp được khi Contract chưa có; cần thiết kế document/snapshot gắn rentalRequest/payment độc lập |
| Catalog/render/template cọc | ContractFieldCatalog/ContractRenderService hiện là thuê V3 | Chưa hỗ trợ namespace D2; phải thêm bộ riêng/chọn document kind, không áp toàn bộ required fields thuê V3 cho cọc |
| Ký riêng tài liệu cọc | Luồng SMARTCA đang gắn hợp đồng/revision thuê | Chưa xác nhận có luồng ký cọc độc lập; không coi đã tích hợp |

### Nguồn source đã đối chiếu

Các đường dẫn dưới đều tương đối từ D:/Workspace/homespace/hs-core-api/:

- hs-listing-service/src/main/java/com/hs/listing/service/RentalRequestService.java
- hs-listing-service/src/main/java/com/hs/listing/dto/request/CreateRentalRequest.java
- hs-listing-service/src/main/java/com/hs/listing/model/RentalRequest.java
- hs-listing-service/src/main/java/com/hs/listing/dto/snapshot/ListingSnapshotDto.java
- hs-payment-service/src/main/java/com/hs/payment/adapter/RentalPaymentLifecycleAdapter.java
- hs-payment-service/src/main/java/com/hs/payment/service/PaymentRequestService.java
- hs-payment-service/src/main/java/com/hs/payment/model/PaymentRequest.java, PaymentLineItem.java, DepositRecord.java, PaymentEvidence.java
- hs-contract-service/src/main/java/com/hs/contract/service/RentalOnboardingService.java
- hs-contract-service/src/main/java/com/hs/contract/service/AutomaticContractDrafts.java
- hs-contract-service/src/main/java/com/hs/contract/service/impl/ContractServiceImpl.java
- hs-contract-service/src/main/java/com/hs/contract/service/engine/ContractFieldCatalog.java, ContractDataBuilder.java, ContractRenderService.java
- hs-contract-service/src/main/java/com/hs/contract/model/ContractDocument.java

## III. QUY TẮC SNAPSHOT, TIỀN VÀ HẠN

### 1. Snapshot ở thời điểm xác nhận cọc

- Tài sản dùng Listing snapshot tại lúc chủ nhà chấp nhận; điều kiện thuê lấy RentalRequest và lịch đổi ngày được hai bên duyệt tới thời điểm snapshot.
- Tiền/tài khoản dùng PaymentRequest + line items liên kết DepositRecord; không dùng profile ngân hàng mới.
- Danh tính người thuê dùng thông tin đại diện trong RentalRequest; chủ nhà/CCCD/liên hệ bổ sung đọc từ nguồn xác minh và **chụp ngay lúc lập snapshot cọc**, lưu capturedAt. Không gọi đây là dữ liệu đã được chụp lúc gửi yêu cầu nếu thực tế chưa chụp.
- Hàm ContractDataBuilder có fallback tên “Chủ nhà (Bên A)”, “Người thuê (Bên B)”, unitNumber “Toàn bộ căn” và địa chỉ profile gán vào permanentAddress. Không coi các giá trị fallback là đã đủ dữ liệu hợp đồng cọc. APARTMENT/ROOM cần mã căn/phòng thật; tên và tư cách các bên phải đủ kiểm tra.
- Không suy ngày cấp/nơi cấp CCCD, giấy chứng nhận sở hữu, giấy ủy quyền, địa chỉ thường trú từ địa chỉ profile. Nếu cần về pháp lý, thu thập/xác minh trước phát hành.
- Văn bản lịch sử bất biến: không sửa khi heldAmount giảm vì hoàn/giữ cọc, Listing/profile đổi hoặc bắt đầu thuê được đổi sau đó. Lưu bổ sung/đính chính có version và xác nhận phù hợp.

### 2. Tách khoản cọc khỏi tổng thanh toán

Chọn payment nguồn bằng DepositRecord.initialPaymentRequestId và kiểm tra rentalRequestId, payer/payee, hướng TENANT_TO_LANDLORD, currency VND và trạng thái.

- RESERVATION_DEPOSIT: chỉ DEPOSIT, RENT = 0; totalAmount phải khớp cọc.
- INITIAL gộp khi vào ngay: tổng dòng DEPOSIT là phần cọc, tổng RENT là tháng đầu; tổng hai phần khớp totalAmount trong flow hiện tại.
- INITIAL chỉ thu tháng đầu sau cọc riêng: **không phải** nguồn xác nhận cọc mới.
- Giá trị tiền cọc đã nhận lấy allocation DEPOSIT của **payment CONFIRMED**, đối chiếu DepositRecord.originalAmount và nghĩa vụ RentalRequest.depositAmount tại snapshot. Không lấy toàn bộ totalAmount hoặc heldAmount hiện tại làm số cọc lịch sử.
- Ví dụ nghiệp vụ kiểm thử: total 12 triệu = RENT 8 triệu + DEPOSIT 4 triệu; hợp đồng cọc ghi cọc **4 triệu**, đồng thời nêu tổng chuyển 12 triệu và phần thuê 8 triệu để tránh nhầm.
- Backend hiện xác nhận “đã nhận đủ” toàn PaymentRequest, chưa thấy API xác nhận một số tiền thực nhận tùy ý hoặc ledger nhiều đợt cọc một phần. Không tự mô tả khả năng góp cọc/partial payment đã có. Chuyển thiếu/thừa/nhiều lần cần đối soát hoặc thiết kế allocation riêng.
- Zero không đồng nghĩa null; chỉ xuất mẫu nhận cọc nếu nghĩa vụ và phần cọc được xác nhận đều dương, khớp bằng giá trị số, không so chuỗi đã format.

### 3. Hạn theo config và sự kiện, không viết cứng trên Word

Source hiện có các mặc định cấu hình: giữ chỗ 60 phút, cửa sổ xác nhận chuyển 24 giờ, tiền tháng đầu khi vào sau mở đầu ngày vào ở và có cửa sổ 24 giờ, cửa sổ ký 48 giờ, thông báo cuối tối thiểu 24 giờ. Đây là **mặc định source**, không phải hằng số viết trực tiếp vào DOCX.

- Hạn chuyển dùng dueAt của chính payment. holdExpiresAt/dueAt trước xác nhận không có nghĩa cọc đã xác nhận tự hết hiệu lực sau 60 phút.
- Với vào sau: nếu chưa tới ngày thuê thì INITIAL/contractDueAt có thể chưa tồn tại. nextStepsText mô tả quy tắc đã chốt và mốc mở từ moveInDate theo Asia/Ho_Chi_Minh; không giả giờ xác nhận hoặc hạn ký thực tế.
- Hạn tiền thuê có thể được mở lại khi đối soát; hạn ký phía người thuê có thể được cập nhật sau chủ nhà ký/thông báo cuối. Snapshot chỉ ghi sự kiện có thật hoặc quy tắc có nguồn; không khẳng định mọi hạn đều tính từ lúc nhận cọc.
- Ngày cuối dự kiến = moveInDate.plusMonths(leaseMonths).minusDays(1); tránh lặp “12 tháng (12 tháng)”.
- Ngày/giờ sự kiện: dd/MM/yyyy HH:mm:ss theo Asia/Ho_Chi_Minh. Ngày thuê: dd/MM/yyyy. Không lấy thời gian tạo file Word mẫu hoặc đồng hồ ChatGPT.
- Ngày lập văn bản là generatedAt được đóng băng, không phải ký. Chữ ký thật nằm trong audit/metadata của luồng ký cọc; không sửa PDF sau ký để điền ngày ký.

### 4. Điều kiện giữ chỗ và xử lý trước ký

Source ghi consent RESERVATION_DEFAULT_V1 trước yêu cầu thuê; UI đang giải thích khả năng chủ nhà giữ 100% cọc thực nhận khi người thuê vi phạm nghĩa vụ tháng đầu hoặc ký, sau thông báo cuối ít nhất 24 giờ. Backend có nhánh FIRST_RENT/TENANT_SIGNING, phản đối và xử lý riêng tiền thuê đã nhận.

**Đây là hành vi sản phẩm cần phản ánh đúng nguồn, không phải kết luận rằng mọi điều kiện đều mặc nhiên hợp pháp.** Điều 328 BLDS phân biệt bảo đảm giao kết/thực hiện; điều kiện phạt cọc, lỗi của mỗi bên và tranh chấp cần được rà soát trước dùng thực tế.

Bắt buộc nội dung reservationTerms được backend cấp từ **toàn văn điều kiện thật đã được người thuê chấp nhận và chủ nhà áp dụng**, có version/hash/sự kiện chấp thuận:

- Không tự mất cọc ngay khi countdown hết hoặc tự áp quy tắc quá hạn hóa đơn 5 ngày của hợp đồng thuê đang thực hiện.
- FIRST_RENT: có cọc dương thực nhận, nghĩa vụ tiền thuê tháng đầu đã mở và quá hạn, đúng consent, không còn khoản/chữ ký đang đối soát.
- TENANT_SIGNING: có bản hợp đồng chủ nhà đã ký và cung cấp cho khách, đủ điều kiện ký, hết hạn ký thật; không phạt khách vì hệ thống thiếu mẫu, render lỗi hoặc chưa có văn bản để xem/ký.
- Thông báo cuối phải có thời gian phản hồi theo policy (backend ít nhất 24 giờ), khách có quyền phản đối/đối soát và cơ hội hoàn thành nghĩa vụ theo nhánh thực tế. Khi đã có phản đối/receipt/chữ ký chưa rõ thì không coi đủ điều kiện giữ cọc.
- Hoàn tất vi phạm trước thuê là thao tác có điều kiện của chủ nhà sau xác nhận đã thông báo và tài sản không bị chiếm giữ; không là quyền tự cưỡng chế thu hồi.
- Tiền thuê đã xác nhận phải tách khỏi cọc và có nghĩa vụ hoàn riêng khi áp dụng nhánh giữ cọc. Không ghi “giữ toàn bộ tiền đã chuyển”.
- Hủy do hai bên đồng ý đi qua quyết định/đối soát và nghĩa vụ hoàn; tạo yêu cầu hoàn không chứng minh tiền đã về tài khoản khách.
- Trường hợp lỗi phía chủ nhà, từ chối giao tài sản hoặc không thể ký/bàn giao: phải giải quyết hoàn/trách nhiệm theo thỏa thuận hợp lệ và pháp luật; không tự coi người thuê vi phạm. Không bịa số bồi thường hay khẳng định backend đã tự tính phạt gấp đôi.

Chỉ version + timestamp hiện có chưa thay toàn văn/hash và liên kết chấp thuận. Nếu chưa truy được nội dung được chấp thuận, báo thiếu dữ liệu thỏa thuận; không lấy một policy mới ở thời điểm render áp hồi tố. Word chỉ giữ marker reservationTerms một lần, không chép cứng toàn bộ policy vào từng mẫu.

## IV. CATALOG PLACEHOLDER D2 — HỢP ĐỒNG DỮ LIỆU CHO WORD

### 1. Quy ước

Chỉ marker trong hai bảng dưới được phép nằm trong DOCX. Catalog thuê V3 có 64 mã, nhưng mẫu cọc **chỉ dùng tập con dưới đây cộng marker mới D2**. Không chạy bộ required của hợp đồng thuê lên mẫu cọc, không thêm marker chỉ để đủ 64.

Tiền đã có VNĐ; rent.amountNumber đã có /tháng. Không nối thêm đơn vị. Bằng chữ do backend sinh từ cùng giá trị số; tài khoản là chuỗi. Tất cả marker một-run, không gõ nhãn “null”, “N/A” hoặc dấu chấm thủ công.

### 2. Tập mã tái sử dụng có trong catalog thuê V3

Tên tương thích V3 không có nghĩa đã có data model cọc. Các giá trị dưới phải được builder D2 map từ nguồn ở mục II–III.

| Marker | Nguồn/ý nghĩa trong mẫu cọc |
| --- | --- |
| {{landlord.fullName}} | Họ tên thật bên cho thuê, chụp tại lập hồ sơ cọc |
| {{landlord.phone}} | Liên hệ Bên A |
| {{landlord.bankAccountHolder}} | payeeBankAccountSnapshot.accountHolderName |
| {{landlord.bankAccountNumber}} | payeeBankAccountSnapshot.accountNumber |
| {{landlord.bankName}} | payeeBankAccountSnapshot.bankName |
| {{tenant.fullName}} | Đại diện đặt cọc từ renterName đã lưu |
| {{tenant.phone}} | renterPhone |
| {{tenant.bankAccountHolder}} | payerBankAccountSnapshot.accountHolderName — tài khoản nhận hoàn đăng ký |
| {{tenant.bankAccountNumber}} | payerBankAccountSnapshot.accountNumber |
| {{tenant.bankName}} | payerBankAccountSnapshot.bankName |
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

### 3. Marker mới D2 — backend CHƯA hỗ trợ catalog/render cọc

| Marker | Nguồn cần mapping/bổ sung |
| --- | --- |
| {{depositAgreement.number}} | Số riêng ổn định của tài liệu cọc; cấp/lưu mới, không dùng contract.number |
| {{depositAgreement.issuedAtText}} | Ngày giờ lập bản cọc từ snapshot.generatedAt, không phải ngày ký |
| {{depositAgreement.reservationTerms}} | Toàn văn điều kiện giữ chỗ đã chấp thuận, khóa version/hash, in đúng một lần |
| {{depositAgreement.nextStepsText}} | Đoạn hoàn chỉnh theo nhánh vào ngay/vào sau và mốc thật/quy tắc tại snapshot; đủ thông tin mở tháng đầu và bước ký, không giả deadline chưa phát sinh |
| {{rentalRequest.reference}} | Mã tham chiếu yêu cầu thuê; hiện có thể biểu diễn nguyên RentalRequest.id, không tự tạo mã rút gọn có thể trùng |
| {{rentalRequest.acceptedAtText}} | RentalRequest.acceptedAt theo giờ Việt Nam |
| {{rentalRequest.policyVersion}} | reservationPolicyVersion |
| {{rentalRequest.policyAcceptedAtText}} | reservationPolicyAcceptedAt; là chấp thuận điều kiện giữ chỗ, không phải đã ký file cọc |
| {{depositPayment.typeText}} | Nhãn theo payment nguồn: “Cọc giữ chỗ” hoặc “Khoản ban đầu gồm tiền thuê và cọc” |
| {{depositPayment.totalAmountNumber}} | totalAmount của payment nguồn CONFIRMED, đã format VNĐ |
| {{depositPayment.rentComponentAmountNumber}} | Tổng RENT của payment nguồn, 0 VNĐ khi chỉ cọc |
| {{depositPayment.confirmedAmountNumber}} | Tổng DEPOSIT của payment nguồn đã xác nhận; không phải toàn khoản gộp |
| {{depositPayment.confirmedAmountWords}} | Bằng chữ phần cọc đã xác nhận |
| {{depositPayment.payerReportedAt}} | PaymentRequest.payerReportedAt: lúc báo chuyển trên hệ thống, không là thời gian ngân hàng thực hiện |
| {{depositPayment.payeeConfirmedAt}} | PaymentRequest.payeeConfirmedAt |
| {{depositPayment.confirmedAt}} | PaymentRequest.confirmedAt: thời điểm hoàn tất ghi nhận |
| {{depositPayment.transferReference}} | Nội dung VietQR của payment nguồn; với INITIAL là mã giao dịch gộp chứa cọc, không tự gọi là một lần chuyển cọc riêng |
| {{#depositOptionalInfoTable}} | Bảng 2 cột “Thông tin bổ sung | Giá trị ghi nhận”, dữ liệu có thì thêm hàng, không có thì backend bỏ cả marker/đoạn |

**Một marker mới không đồng nghĩa một cột mới:** nhiều marker chỉ format từ dữ liệu đang có; số tài liệu/snapshot/hash/registry điều kiện và storage workflow mới cần bổ sung.

Bảng tùy chọn chỉ được chứa dòng có nguồn:
- CCCD của từng bên, email liên hệ; không tự thêm ngày/nơi cấp.
- Địa chỉ profile của từng bên phải ghi **“Địa chỉ liên hệ theo hồ sơ”**; chỉ ghi thường trú nếu được xác minh đúng ý nghĩa.
- Tầng/phạm vi thuê/mã tin đăng từ snapshot tài sản khi có.
- Mã tham chiếu ngân hàng khi đã có nguồn khai báo thật, ghi rõ “do bên giao dịch cung cấp”.
- Không chèn QR có URL hết hạn, ảnh chứng từ, UUID storage, branch ID, số chỗ xe toàn chi nhánh, kinh độ/vĩ độ hoặc tiện ích xung quanh vào hợp đồng.

Marker bảng đặt thành đoạn riêng; backend tạo TableRenderData tương ứng. Không dùng section/loop/if tag hoặc bảng hàng trống mà renderer hiện chưa đăng ký. Renderer D2 phải bỏ toàn đoạn nếu không có dòng; ChatGPT chỉ tạo marker, không tự viết mã xử lý.

### 4. Tập bắt buộc của từng mẫu

- HOUSE: toàn bộ marker ở mục IV.2 **trừ property.unitNumber**, cộng toàn bộ marker mục IV.3.
- APARTMENT và ROOM: toàn bộ marker cả hai bảng.
- Không in marker thuộc contract.*, payment.initial.*, meters.*, deposit.description, các bảng thuê V3 hoặc namespace không có trong hai bảng D2. Điều kiện cọc trước ký phải lấy reservationTerms thay vì đoạn mặc định hậu bàn giao của V3.
- Không thêm placeholder chữ ký/ngày ký cọc: ngày lập đã có, sự kiện ký thực tế xử lý ngoài nội dung được ký.

Đây là bộ bắt buộc của **mẫu**. Field tùy chọn bên trong bảng có thể vắng. Gate dữ liệu giao dịch phải kiểm tra thêm danh tính, địa chỉ/tư cách pháp lý cần thiết; việc một field optional trong catalog kỹ thuật không kết luận nó optional về pháp lý.

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

## VI. LỆNH THỰC THI CHO CHATGPT TẠO WORD

Bạn là người thiết kế mẫu Word cho HomeSpace. Hãy dùng toàn bộ đặc tả này để **tạo mới hoàn toàn 03 file DOCX tải được** ở mục I.3, không chỉ trả Markdown.

Đây là **mẫu hợp đồng cọc/giữ chỗ sau khi đã xác nhận tiền, trước khi hoàn tất ký hợp đồng thuê**, cho HOUSE/APARTMENT/ROOM. Trong mẫu dùng placeholder đúng catalog D2; không điền tên, tiền, tài khoản, ngày hoặc chính sách giả.

Hãy soạn mỗi file thành một văn bản đầy đủ, có thông tin các bên, tài sản, điều kiện thuê dự kiến, số tiền, xác nhận chuyển khoản, điều kiện giữ chỗ, quyền/nghĩa vụ, xử lý tiếp theo, hoàn/đối soát và chứng cứ điện tử theo dàn ý VII–VIII. Mỗi DOCX đứng độc lập; không viết “như mẫu nhà nguyên căn”.

Phân biệt nghĩa vụ cọc và phần cọc đã xác nhận, tổng giao dịch và phần tiền thuê; xuất file không tạo nghĩa vụ chuyển tiền lần hai. Không đặt điều kiện cần có hợp đồng thuê đã ký. Không gọi ngày lập là ngày ký, không coi file đã xuất tự có chữ ký của hai bên.

Nội dung điều kiện/next steps dùng đúng marker, không tự thêm số ngày, mức phạt cọc, thời hạn bàn giao hoặc phụ phí. HomeSpace không giữ tiền. Không khẳng định pháp luật tự động cho phép giữ cọc/cưỡng chế.

Thực hiện kỹ thuật và kiểm thử mục V, IX. Trả 03 link file, báo cáo marker/missing/unknown/run/render **trong câu trả lời**, và nhắc marker D2 cần backend mapping. Không yêu cầu chủ dự án đưa thêm mẫu hợp đồng để bắt đầu thiết kế.

## VII. DÀN Ý CHÍNH VĂN CHUNG — ÁP DỤNG ĐẦY ĐỦ CHO TỪNG DOCX

### Mở đầu và các bên

- Quốc hiệu, tiêu ngữ; tên đúng loại hình ở I.3; phụ đề ghi cọc giữ chỗ theo yêu cầu đã chấp nhận.
- Số văn bản {{depositAgreement.number}}; **Ngày lập văn bản: {{depositAgreement.issuedAtText}}**.
- Căn cứ thỏa thuận giữ chỗ và nhu cầu thuê, Bộ luật Dân sự 2015; Luật Nhà ở 2023 trong phạm vi áp dụng và Luật Giao dịch điện tử 2023 cùng các sửa đổi còn hiệu lực. Không chép dài luật hoặc dẫn “hợp đồng thuê đã ký”.
- Bên A: {{landlord.fullName}}, điện thoại {{landlord.phone}}. Tài khoản nhận tiền: chủ tài khoản {{landlord.bankAccountHolder}}, số {{landlord.bankAccountNumber}}, ngân hàng {{landlord.bankName}}.
- Bên B: {{tenant.fullName}}, điện thoại {{tenant.phone}}. Tài khoản đăng ký nhận hoàn: {{tenant.bankAccountHolder}}, số {{tenant.bankAccountNumber}}, ngân hàng {{tenant.bankName}}.
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
- Trong câu trả lời: link 3 DOCX + marker phát hiện/thiếu/lạ/run lỗi/render thực tế + lưu ý cần mapping D2. Không đính báo cáo vào hợp đồng.

### 2. Ca nghiệm thu tích hợp backend sau này

| Ca | Kết quả cần có |
| --- | --- |
| Vào sau, RESERVATION_DEPOSIT 4 triệu CONFIRMED, chưa có Contract | Xuất cọc 4 triệu; không cần contractId/revision thuê |
| Vào ngay, INITIAL 12 triệu: RENT 8 + DEPOSIT 4 | Chỉ xác nhận cọc 4, tổng 12, thuê 8; không xuất hai văn bản cọc |
| Đã có cọc riêng, INITIAL tháng đầu được xác nhận sau | Không sinh thêm cọc hoặc tăng số cọc đã nhận |
| Mới PENDING/ACCEPTED/QR/TRANSFER_REPORTED hoặc receipt DISPUTED/REJECTED | Không phát hành bản “đã nhận đủ”; trạng thái tiền không bị đổi để ép render |
| Cọc miễn 0 được auto CONFIRMED | Không tạo biên nhận tiền đã chuyển |
| Chuyển thiếu/thừa/nhiều đợt chưa có allocation được xác nhận | Chờ đối soát, không giả số thực nhận hoặc hỗ trợ góp cọc |
| Phần DEPOSIT không khớp request/originalAmount/tổng giao dịch | Chặn phát hành và báo field/reconciliation issue |
| Thiếu CCCD/liên hệ pháp lý hoặc tư cách theo gate sản phẩm/pháp lý | Chỉ rõ phần cần bổ sung; không bịa hoặc coi catalog optional là miễn yêu cầu pháp lý |
| APARTMENT/ROOM thiếu mã căn/phòng, builder fallback “Toàn bộ căn” | Báo thiếu định danh tài sản thật |
| Mã ngân hàng không có, có địa chỉ profile nhưng chưa chứng minh thường trú | Bỏ dòng ngân hàng; địa chỉ mang nhãn liên hệ đúng nguồn |
| Thiếu full policy/hash/version mapping | Không áp văn bản mới hồi tố hoặc coi consent checkbox là ký PDF |
| Chưa mở tháng đầu/chưa có hạn ký | nextStepsText dùng quy tắc có nguồn, không in null/ngày ký giả |
| Render/storage lỗi sau xác nhận tiền | Tiền vẫn CONFIRMED; tạo retry độc lập có idempotency |
| Hai callback hoặc người dùng tải lại cùng lúc | Một snapshot/tài liệu cho cùng payment có cọc và version; không thu thêm |
| Profile/Listing/config thay đổi; heldAmount sau này về 0 | Tải lại đúng snapshot gốc, không đổi số tiền/địa chỉ/chính sách lịch sử |
| Đề nghị bắt đầu sớm được duyệt sau khi đã lập cọc | Văn bản bổ sung có lịch sử, không sửa bản cũ hoặc thu cọc lại |
| Cọc đã lập nhưng chưa ký riêng hoặc ký provider lỗi | Không gắn “đã ký”; không đảo tiền về chưa trả |
| Hủy/giữ cọc/hoàn tiền về sau | Theo nghĩa vụ/quyết định thực tế, không xóa bản nhận tiền gốc |

## X. GHI CHÚ TÍCH HỢP CHO ĐỘI BACKEND — KHÔNG IN VÀO WORD

Phần này để triển khai sau khi nhận 3 mẫu Word, không phải yêu cầu ChatGPT viết code trong lượt tạo mẫu.

1. Thêm document kind/catalog D2, template/version riêng cho 3 loại hình. Giữ bộ thuê V3 và required thuê tách khỏi cọc; đăng ký 18 marker mới ở IV.3, map lại 24 marker tái sử dụng. Số lượng chỉ hỗ trợ review, tập key là chuẩn.
2. Tạo snapshot cọc gắn rentalRequestId, sourcePaymentRequestId, depositRecordId, capturedAt/generatedAt, schemaVersion, templateVersionId, identity/property/rental/payment/bank snapshots và nội dung consent+hash/version. Contract/rentalRevision link để nullable tới khi hợp đồng thuê được tạo.
3. Có số tài liệu cọc và idempotency dựa payment nguồn chứa cọc + document kind + snapshot/version; không sinh số mới mỗi lượt tải. Không lấy ContractDocument đang bắt buộc Contract làm cớ tạo hợp đồng thuê giả trước thời điểm.
4. Trigger sau commit receipt CONFIRMED có cọc dương; job/retry không được rollback xác nhận tiền. Hook hiện AutomaticContractDrafts chỉ chuẩn bị **hợp đồng thuê** khi đủ điều kiện, không là chứng cứ đã có xuất tài liệu cọc.
5. UI chỉ hai bên/quyền hỗ trợ hợp lệ tải file private; link tạm thời không là nội dung hợp đồng. Lưu trạng thái generating/ready/failed và lịch sử, không gọi tài liệu ready là signed.
6. Luồng ký cọc đã chốt bắt buộc với cọc dương: scope document riêng, audit/evidence, một trang ký SMARTCA, chữ ký gắn đúng hash và các bên; không dùng signature request của hợp đồng thuê. Hai bên ký cọc trước rồi ký thuê; tiền nhận vẫn được ghi nhận độc lập.
7. Các số tiền/xác nhận ngân hàng chỉ đọc; xác thực completeness, quyền và currency/line allocation trước render. Snapshot thiếu không tự lấy fallback “0 VNĐ” hoặc “Chủ nhà (Bên A)” làm dữ liệu thật.
8. Chốt/thẩm định nội dung điều kiện giữ chỗ trước áp production; chứng minh nội dung khách đã được xem và chấp thuận. Không thêm chế tài mới ở file xuất sau khi tiền đã chuyển.
9. Sau thuê, liên kết khoản cọc cũ sang Contract; chuyển/hoàn/khấu trừ qua ledger đúng nghiệp vụ, không tạo cọc mới vì ký/xuất.
10. Chạy tests và báo phần source-only/mock/live riêng. Hoàn thành 3 file mẫu, render backend và ký số là ba mức nghiệm thu khác nhau.

### Nguồn pháp luật để người rà soát kiểm tra (không in URL/checklist vào DOCX)

- [Bộ luật Dân sự số 91/2015/QH13 — Cổng Chính phủ](https://vanban.chinhphu.vn/default.aspx?docid=183188&pageid=27160), đối chiếu Điều 328 về đặt cọc và các quy định liên quan.
- [Luật Giao dịch điện tử số 20/2023/QH15 — Bộ Khoa học và Công nghệ](https://mst.gov.vn/van-ban-phap-luat/24987.htm), kiểm tra cả sửa đổi đang có hiệu lực tại ngày áp dụng.
- Luật Nhà ở 2023 và các sửa đổi hiện hành trong phạm vi cho thuê/bàn giao/chấm dứt. Không dùng cơ chế xử lý quá hạn trong kỳ thuê làm căn cứ tự động giữ cọc trước khi giao kết.

Đặc tả này không chứng nhận mẫu đã được luật sư thẩm định. Việc rà soát chính ở đây là tương thích luồng, nguồn dữ liệu và khả năng render; điều khoản chế tài/hiệu lực cần được đối chiếu tình huống và pháp luật trước phát hành thực tế.
