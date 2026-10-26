# Test tiện ích quanh listing bằng Vietmap

## Chạy nhanh

1. Import lại `HomeSpace_VIETMAP_Postman_Collection.json` và chọn environment `HomeSpace - VIETMAP Trial` hiện có. Điền `apikey` của bạn trong environment, không đưa key vào collection/Git.
2. Mở collection → **Variables**, đặt:
   - `poi_center_lat`, `poi_center_lng`: tọa độ của cùng một listing trong CSDL. Tọa độ mặc định chỉ là ví dụ Trần Phú, không phải listing của bạn.
   - `poi_radius_m`: ví dụ `1000` = 1 km.
   - `poi_text`: từ khóa tùy ý cho request 12, ví dụ `siêu thị`.
3. Mở folder **04. POI quanh listing - test thủ công**, Send một request **12–17**: tùy chọn, siêu thị, trường học, bệnh viện, gym hoặc cửa hàng tiện lợi.
4. Xem mảng response. Đặt `poi_result_index` trong Variables: `0` = kết quả đầu, `1` = kết quả thứ hai... Sau đó Send **18 Place POI** để lấy tọa độ kết quả được chọn.
5. Xem **Test Results**, Postman Console hoặc các biến collection được sinh ra: `poi_lat`, `poi_lng`, `poi_distance_m`, `poi_within_radius`, `poi_detail`. Khoảng cách tính theo đường chim bay; POI ngoài bán kính sẽ báo test thất bại.

Đổi index rồi Send 18 để kiểm tra POI khác. Đổi tọa độ/bán kính thì phải Send lại 12–17 trước. Nếu có biến `poi_*` cùng tên trong environment, chúng sẽ ưu tiên hơn collection; xóa biến trùng để tránh dùng nhầm giá trị.

Không cần sửa backend, không thay các biến `lat`, `lng`, `ref_id`, `origin`, `destination` của 11 request cũ. Script không tự gửi thêm request. **Không chạy Runner**: mỗi Send có thể tiêu tốn quota, đặc biệt Place cho từng kết quả.

## Đọc kết quả đúng

- Autocomplete dùng `text` (ít nhất 2 ký tự), `layers=POI`, `circle_center=lat,lng`, `circle_radius` theo mét. `display_type=1` ưu tiên địa chỉ mới sau sáp nhập. `focus` chỉ hỗ trợ xếp hạng gần tâm.
- Mỗi lần trả **tối đa 10 gợi ý** theo truy vấn, không phải toàn bộ tiện ích hoặc bảo đảm 10 địa điểm gần nhất. Không có kết quả không có nghĩa khu vực không có tiện ích. Thử tên thương hiệu như `Co.opmart`, `Bách Hóa Xanh` hoặc đổi bán kính; cần đánh giá độ bao phủ trước khi dùng để chấm điểm phòng.
- `distance` trong response Autocomplete có đơn vị **km**. Request 18 dùng Place lấy `lat/lng`, tự tính lại khoảng cách mét từ listing để kiểm tra bán kính; không phải quãng đường/thời gian di chuyển. Muốn đo đường đi, dùng request 05/06 hiện có, nhập `origin=lat,lng` của listing và `destination=poi_lat,poi_lng` (thay bằng giá trị thực).
- `cats` mặc định **tắt**. Chỉ điền `poi_cats` và bật tham số này sau khi có mã danh mục chính thức. Không dùng tên tiếng Việt làm mã. Danh mục từ link tài liệu hiện chuyển sang đăng nhập Microsoft nên chưa xác minh mã cho từng nhóm; các request có sẵn dùng từ khóa, không giả lập mã category.
- `401`: kiểm tra API key. `423`: kiểm tra quota/quyền API trong console Vietmap. Lỗi HTTP, JSON không hợp lệ hoặc kết quả rỗng sẽ không giữ lựa chọn POI cũ cho bước Place.

Tài liệu đối chiếu ngày 23/10/2026: [Autocomplete v4](https://maps.vietmap.vn/docs/map-api/autocomplete-version/autocomplete-v4/), [Place v4](https://maps.vietmap.vn/docs/map-api/place-v4/), [Route v4](https://maps.vietmap.vn/docs/map-api/route-version/route-v4/), [Matrix v4](https://maps.vietmap.vn/docs/map-api/matrix-version/matrix-v4/).

## Kiểm tra file offline

Từ thư mục `hs-infra`:

```powershell
node scripts/validate-vietmap-poi-postman.mjs
```

Lệnh này chỉ kiểm tra JSON và chạy script Postman bằng response giả lập; không gọi Vietmap, không đọc key, không tốn quota. Kiểm thử API thực tế: tự Send theo các bước trên.
