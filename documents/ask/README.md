# Kiểm thử AI tư vấn chọn phòng theo nhu cầu thật

Bộ này kiểm tra **AI có giúp khách chọn được phòng phù hợp không**, không phải khách biết sẵn một tin rồi hỏi giá/diện tích/mã căn.

- [100 lời nhờ tư vấn của khách](AI_RENTER_QUESTIONS.md): chỉ copy dòng **Hỏi**.
- [Kỳ vọng dành cho người chấm](AI_LISTING_TOOL_TEST_QUESTIONS.md): nhu cầu phải hiểu, cách tư vấn, bằng chứng và memory.
- [SQL đối chiếu chỉ đọc](AI_LISTING_TEST_ORACLES.sql): kiểm tra khả năng đáp ứng ở CSDL, không phải danh sách “phòng tốt nhất” cố định.
- [Memory / prompt bàn giao AI Agent](AI_AGENT_MEMORY_HANDOFF.md): ngữ cảnh lỗi tra cứu503, bằng chứng, việc đã kiểm tra và yêu cầu xử lý tiếp; không chứa secret hoặc xác nhận lỗi đã được sửa.

## Ví dụ đúng loại tình huống

> Mình học gần Đại học Công nghiệp TP.HCM, ở một mình, có xe máy. Mỗi tháng chỉ lo được 3 triệu rưỡi cả phòng, điện nước với tiền xe. Bạn giúp mình chọn chỗ nào đỡ áp lực tiền bạc được không?

AI cần hiểu **tổng ngân sách**, hỏi phần quan trọng còn thiếu, tìm vài phương án rồi nói vì sao hợp/không hợp và phải đánh đổi gì. Không phải chỉ chuyển câu thành filter rồi gửi card.

> Mình có thể dành 4 triệu rưỡi cho chỗ ở mỗi tháng nhưng muốn chừa lại 500 nghìn phòng phát sinh...

AI cần hiểu mức muốn chi là4 triệu, không tự lấy hết4,5 triệu để chọn phòng đẹp hơn.

## Chạy ngắn gọn

1. Hệ thống đã chạy và có seed300 tin; đăng nhập người thuê có quyền dùng AI. Không tự seed/reset CSDL để chạy tài liệu.
2. **L001–L060:** mỗi tình huống mở chat mới. Khách chưa chọn sẵn tin, không gửi link/UUID và không thêm25 tin nhắn chuẩn bị như bản trước.
3. **L061–L100:** một khách **Linh**, một chat,40 lượt tuần tự. Linh mới đi làm,1người1xe,4,5triệu **tổng chi**; thêm mèo, cân nhắc2người2xe rồi quay về ở riêng. Toàn bộ hành trình vẫn là tìm phòng trọ, không chuyển ngẫu nhiên qua các loại nhà.
4. Chỉ gửi lời khách, không gửi kỳ vọng/đáp án. Ghi ID/thứ tự shortlist và tên “phòng A” từ **kết quả AI thực tế** vào sổ ngoài chat. Nếu AI chưa tạo một shortlist/alias thì câu hỏi phụ thuộc ghi BLOCKED, không tự chèn tin giả.
5. Chấm riêng: hiểu nhu cầu, hỏi đúng chỗ, ứng viên đạt điều kiện, lý do/đánh đổi, tính tiền trung thực và nhớ context. Không chọn đúng nhu cầu mà chỉ trả đủ số card thì chưa đạt.

Hỏi thêm là đúng khi khách chưa nói khu vực/ngân sách là tiền phòng hay tổng chi. Hỏi lại mọi điều đã kể hoặc tự nới điều kiện quan trọng là lỗi. “Không có đủ lựa chọn” có thể là đáp án đúng; cần giải thích vướng ở đâu và hỏi khách muốn thay đổi gì, không chỉ trả rỗng.

## Kiểm tra file hoặc xuất cho runner

Từ `D:\Workspace\homespace\hs-infrastructure`:

```powershell
node scripts/validate-ai-listing-questions.mjs
node scripts/validate-ai-listing-questions.mjs --json
```

Script chỉ đọc file, không gọi model/API, không kết nối hoặc ghi CSDL.

JSON **schema v3**: `mode=needs_based_room_consultation`,100 case. Runner tạo chat riêng cho từng `independent-Lxxx`; toàn bộ `linh-room-journey-40` chung một `conversationId`, không chạy song song. `requiresStages`/`captureStage` là hướng dẫn cho sổ chấm bên ngoài, không nhét vào prompt. Nếu mốc cần có chưa tồn tại thì BLOCKED câu phụ thuộc và ghi nguyên nhân. Gửi duy nhất `prompt`, không gửi `expected`.

Bản v3 **thay thế** bản v2 có25 bước gửi link trước. Đủ100 câu chuẩn là100 tin nhắn khách; nếu tiếp tục hỏi đáp làm rõ ngoài kịch bản thì ghi riêng, không tính thành các case chuẩn đã tự động PASS.

## Đối chiếu và giới hạn

- Seed có300 tin nhưng chỉ100 ROOM. Phòng trọ ở Gò Vấp43,An Nhơn39,Hạnh Thông18,city12. Giá thuê từ2,2–4,5triệu,phí/sức chứa/nội quy khác nhau. Không nhầm tổng tin cả ba loại hình với tổng phòng trọ.
- SQL chỉ là kiểm tra giả định chi phí/ứng viên đủ một số điều kiện đã khai báo, không chứng minh cách âm,sạch,an ninh,đi học bao nhiêu phút hoặc chủ sẽ nhận mèo.
- Với tổng chi tháng,phải tính điện,nước,mạng,phí người/xe và khoản đã gồm giá theo đúng đơn vị. Ước tính có giả định,không phải hóa đơn/trọn gói; cách chia đồng hồ chung cần xác nhận.
- Không khóa một UUID làm đáp án “phù hợp nhất”. Xếp hạng khác nhau vẫn có thể đạt nếu tôn trọng điều kiện cứng,có căn cứ và giải thích đánh đổi theo chính khách đó.
- Giới hạn kết quả mặc định5,cap cấu hình mặc định20; nhu cầu2/3/10 phải linh động. Không kéo cả nghìn detail để AI lọc.
- Tại thời điểm soạn,AI chỉ nạp8 message gần nhất. Lượt quay lại “phòng A” kiểm tra memory dài thật; mất context mà xin làm rõ là an toàn nhưng chưa đạt memory.
- **Chưa chạy100 câu bằng model.** Script PASS chỉ chứng minh tài liệu hợp lệ. Không tự gọi provider tính phí hoặc thay đổi nghiệp vụ thuê phòng.

Các bộ [hợp đồng](AI_CONTRACT_TOOL_TEST_QUESTIONS.md) và [lịch xem](AI_APPOINTMENT_TOOL_TEST_QUESTIONS.md) được giữ riêng, cần fixture nghiệp vụ riêng và không nằm trong100 tình huống tư vấn chọn phòng này.
