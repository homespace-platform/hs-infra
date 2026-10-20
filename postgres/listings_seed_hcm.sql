-- HomeSpace: 2.520 tin đăng mẫu tại Thành phố Hồ Chí Minh cho thử nghiệm tìm kiếm AI.
-- Bổ sung 60 tin cho 10 địa điểm nổi bật (6 tin/địa điểm): tổng cộng 2.580 tin.
-- Giữ nguyên 2.520 tin gốc và 50 tin đã bổ sung (2521–2570); thêm 10 phòng trọ (2571–2580).
-- Chạy trên homespace_core bằng pgAdmin (Query Tool).
-- Chỉ dành cho local/dev. 168 phường/xã/đặc khu trong postman/location/hochiminh.txt
-- mỗi địa bàn có đúng 15 tin: 5 nhà nguyên căn, 5 căn hộ, 5 phòng trọ.
-- Nguồn không chứa quận/huyện. Để có đúng 2.580 tin, hãy chạy trên database sạch;
-- file này không xóa các tin seed cũ đã được tạo bằng ID khác.
-- Sau khi tạo lại CSDL: khởi động Core để tạo bảng, bootstrap ADMIN và catalog,
-- rồi chỉ chạy file này. Phần schema phụ lục/loại thanh toán đã gộp ngay bên dưới.
-- Không cần chạy file sửa bổ sung. ID được tạo xác định, các bản ghi được upsert.
-- Chạy lại sẽ đồng bộ lại tiện ích/nội thất của đúng các ID seed, không đụng tin thật.
-- Mỗi loại hình/địa bàn có đủ mẫu đầy đủ, cơ bản, một phần và không nội thất.
-- Tin thuộc tài khoản bootstrap username=homespace (role ADMIN trong DB local hiện tại).
-- Ảnh: dùng đúng 3 object S3 do người dùng cung cấp; cả 3 ảnh được gắn vào mỗi tin.
-- Mã/tên tỉnh và phường/xã/đặc khu lấy nguyên nguồn; số nhà/tên đường là dữ liệu giả lập,
-- KHÔNG phải địa chỉ đã xác minh hoặc tọa độ thật.

BEGIN;

-- Đồng bộ schema phụ lục trong cùng file và cùng transaction với seed.
-- Không ghi đè hợp đồng, hóa đơn hoặc giao dịch thanh toán hiện có.
ALTER TABLE public.monthly_invoices ADD COLUMN IF NOT EXISTS rent_period_start date;
ALTER TABLE public.monthly_invoices ADD COLUMN IF NOT EXISTS rent_period_end_exclusive date;
ALTER TABLE public.deposit_records ADD COLUMN IF NOT EXISTS retained_amount numeric(15,2);
-- ddl-auto=update không luôn cập nhật CHECK của enum đã tồn tại.
ALTER TABLE public.payment_requests DROP CONSTRAINT IF EXISTS payment_requests_type_check;
ALTER TABLE public.payment_requests ADD CONSTRAINT payment_requests_type_check CHECK
  (type IN ('RESERVATION_DEPOSIT','INITIAL','MONTHLY_RENT','UTILITY','OTHER_CHARGE','DEPOSIT_REFUND','INITIAL_PAYMENT_REFUND','DEPOSIT_ADJUSTMENT'));

CREATE TEMP TABLE hs_seed_config ON COMMIT DROP AS
SELECT u.id AS owner_id
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE u.active IS TRUE AND upper(r.name) = 'ADMIN'
  AND lower(u.username) = 'homespace'
LIMIT 1;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM hs_seed_config) THEN
        RAISE EXCEPTION 'Không tìm thấy users.active=true có role ADMIN. Hãy seed tài khoản trước khi chạy.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM amenities WHERE active IS TRUE)
       OR NOT EXISTS (SELECT 1 FROM furnishing_items WHERE active IS TRUE) THEN
        RAISE EXCEPTION 'Thiếu catalog amenities/furnishing_items. Hãy khởi động listing service để seed catalog trước.';
    END IF;
END $$;

-- BEGIN HCM LOCATION DATA: generated from postman/location/hochiminh.txt
-- The source has wards/communes/special zones, not district-level objects.
CREATE TEMP TABLE hs_seed_places ON COMMIT DROP AS
SELECT p.place_id, '79'::text AS province_code,
       'Thành phố Hồ Chí Minh'::text AS province_name,
       p.ward_code, p.ward_name, p.place_type,
       p.ward_name AS location_label
FROM (VALUES
    (1, '25747', 'Phường Thủ Dầu Một', 'ward'),
    (2, '25750', 'Phường Phú Lợi', 'ward'),
    (3, '25760', 'Phường Bình Dương', 'ward'),
    (4, '25768', 'Phường Phú An', 'ward'),
    (5, '25771', 'Phường Chánh Hiệp', 'ward'),
    (6, '25777', 'Xã Dầu Tiếng', 'commune'),
    (7, '25780', 'Xã Minh Thạnh', 'commune'),
    (8, '25792', 'Xã Long Hoà', 'commune'),
    (9, '25807', 'Xã Thanh An', 'commune'),
    (10, '25813', 'Phường Bến Cát', 'ward'),
    (11, '25819', 'Xã Trừ Văn Thố', 'commune'),
    (12, '25822', 'Xã Bàu Bàng', 'commune'),
    (13, '25837', 'Phường Chánh Phú Hoà', 'ward'),
    (14, '25840', 'Phường Long Nguyên', 'ward'),
    (15, '25843', 'Phường Tây Nam', 'ward'),
    (16, '25846', 'Phường Thới Hoà', 'ward'),
    (17, '25849', 'Phường Hoà Lợi', 'ward'),
    (18, '25858', 'Xã Phú Giáo', 'commune'),
    (19, '25864', 'Xã Phước Thành', 'commune'),
    (20, '25867', 'Xã An Long', 'commune'),
    (21, '25882', 'Xã Phước Hoà', 'commune'),
    (22, '25888', 'Phường Tân Uyên', 'ward'),
    (23, '25891', 'Phường Tân Khánh', 'ward'),
    (24, '25906', 'Xã Bắc Tân Uyên', 'commune'),
    (25, '25909', 'Xã Thường Tân', 'commune'),
    (26, '25912', 'Phường Vĩnh Tân', 'ward'),
    (27, '25915', 'Phường Bình Cơ', 'ward'),
    (28, '25920', 'Phường Tân Hiệp', 'ward'),
    (29, '25942', 'Phường Dĩ An', 'ward'),
    (30, '25945', 'Phường Tân Đông Hiệp', 'ward'),
    (31, '25951', 'Phường Đông Hoà', 'ward'),
    (32, '25966', 'Phường Lái Thiêu', 'ward'),
    (33, '25969', 'Phường Thuận Giao', 'ward'),
    (34, '25975', 'Phường An Phú', 'ward'),
    (35, '25978', 'Phường Thuận An', 'ward'),
    (36, '25987', 'Phường Bình Hoà', 'ward'),
    (37, '26506', 'Phường Vũng Tàu', 'ward'),
    (38, '26526', 'Phường Tam Thắng', 'ward'),
    (39, '26536', 'Phường Rạch Dừa', 'ward'),
    (40, '26542', 'Phường Phước Thắng', 'ward'),
    (41, '26545', 'Xã Long Sơn', 'commune'),
    (42, '26560', 'Phường Bà Rịa', 'ward'),
    (43, '26566', 'Phường Long Hương', 'ward'),
    (44, '26572', 'Phường Tam Long', 'ward'),
    (45, '26575', 'Xã Ngãi Giao', 'commune'),
    (46, '26584', 'Xã Xuân Sơn', 'commune'),
    (47, '26590', 'Xã Bình Giã', 'commune'),
    (48, '26596', 'Xã Châu Đức', 'commune'),
    (49, '26608', 'Xã Kim Long', 'commune'),
    (50, '26617', 'Xã Nghĩa Thành', 'commune'),
    (51, '26620', 'Xã Hồ Tràm', 'commune'),
    (52, '26632', 'Xã Xuyên Mộc', 'commune'),
    (53, '26638', 'Xã Bàu Lâm', 'commune'),
    (54, '26641', 'Xã Hoà Hội', 'commune'),
    (55, '26647', 'Xã Hoà Hiệp', 'commune'),
    (56, '26656', 'Xã Bình Châu', 'commune'),
    (57, '26659', 'Xã Long Điền', 'commune'),
    (58, '26662', 'Xã Long Hải', 'commune'),
    (59, '26680', 'Xã Đất Đỏ', 'commune'),
    (60, '26686', 'Xã Phước Hải', 'commune'),
    (61, '26704', 'Phường Phú Mỹ', 'ward'),
    (62, '26710', 'Phường Tân Hải', 'ward'),
    (63, '26713', 'Phường Tân Phước', 'ward'),
    (64, '26725', 'Phường Tân Thành', 'ward'),
    (65, '26728', 'Xã Châu Pha', 'commune'),
    (66, '26732', 'Đặc khu Côn Đảo', 'special_zone'),
    (67, '26737', 'Phường Tân Định', 'ward'),
    (68, '26740', 'Phường Sài Gòn', 'ward'),
    (69, '26743', 'Phường Bến Thành', 'ward'),
    (70, '26758', 'Phường Cầu Ông Lãnh', 'ward'),
    (71, '26767', 'Phường An Phú Đông', 'ward'),
    (72, '26773', 'Phường Thới An', 'ward'),
    (73, '26782', 'Phường Tân Thới Hiệp', 'ward'),
    (74, '26785', 'Phường Trung Mỹ Tây', 'ward'),
    (75, '26791', 'Phường Đông Hưng Thuận', 'ward'),
    (76, '26800', 'Phường Linh Xuân', 'ward'),
    (77, '26803', 'Phường Tam Bình', 'ward'),
    (78, '26809', 'Phường Hiệp Bình', 'ward'),
    (79, '26824', 'Phường Thủ Đức', 'ward'),
    (80, '26833', 'Phường Long Bình', 'ward'),
    (81, '26842', 'Phường Tăng Nhơn Phú', 'ward'),
    (82, '26848', 'Phường Phước Long', 'ward'),
    (83, '26857', 'Phường Long Phước', 'ward'),
    (84, '26860', 'Phường Long Trường', 'ward'),
    (85, '26876', 'Phường An Nhơn', 'ward'),
    (86, '26878', 'Phường An Hội Đông', 'ward'),
    (87, '26882', 'Phường An Hội Tây', 'ward'),
    (88, '26884', 'Phường Gò Vấp', 'ward'),
    (89, '26890', 'Phường Hạnh Thông', 'ward'),
    (90, '26898', 'Phường Thông Tây Hội', 'ward'),
    (91, '26905', 'Phường Bình Lợi Trung', 'ward'),
    (92, '26911', 'Phường Bình Quới', 'ward'),
    (93, '26929', 'Phường Bình Thạnh', 'ward'),
    (94, '26944', 'Phường Gia Định', 'ward'),
    (95, '26956', 'Phường Thạnh Mỹ Tây', 'ward'),
    (96, '26968', 'Phường Tân Sơn Nhất', 'ward'),
    (97, '26977', 'Phường Tân Sơn Hoà', 'ward'),
    (98, '26983', 'Phường Bảy Hiền', 'ward'),
    (99, '26995', 'Phường Tân Hoà', 'ward'),
    (100, '27004', 'Phường Tân Bình', 'ward'),
    (101, '27007', 'Phường Tân Sơn', 'ward'),
    (102, '27013', 'Phường Tây Thạnh', 'ward'),
    (103, '27019', 'Phường Tân Sơn Nhì', 'ward'),
    (104, '27022', 'Phường Phú Thọ Hoà', 'ward'),
    (105, '27028', 'Phường Phú Thạnh', 'ward'),
    (106, '27031', 'Phường Tân Phú', 'ward'),
    (107, '27043', 'Phường Đức Nhuận', 'ward'),
    (108, '27058', 'Phường Cầu Kiệu', 'ward'),
    (109, '27073', 'Phường Phú Nhuận', 'ward'),
    (110, '27094', 'Phường An Khánh', 'ward'),
    (111, '27097', 'Phường Bình Trưng', 'ward'),
    (112, '27112', 'Phường Cát Lái', 'ward'),
    (113, '27139', 'Phường Xuân Hoà', 'ward'),
    (114, '27142', 'Phường Nhiêu Lộc', 'ward'),
    (115, '27154', 'Phường Bàn Cờ', 'ward'),
    (116, '27163', 'Phường Hoà Hưng', 'ward'),
    (117, '27169', 'Phường Diên Hồng', 'ward'),
    (118, '27190', 'Phường Vườn Lài', 'ward'),
    (119, '27211', 'Phường Hoà Bình', 'ward'),
    (120, '27226', 'Phường Phú Thọ', 'ward'),
    (121, '27232', 'Phường Bình Thới', 'ward'),
    (122, '27238', 'Phường Minh Phụng', 'ward'),
    (123, '27259', 'Phường Xóm Chiếu', 'ward'),
    (124, '27265', 'Phường Khánh Hội', 'ward'),
    (125, '27286', 'Phường Vĩnh Hội', 'ward'),
    (126, '27301', 'Phường Chợ Quán', 'ward'),
    (127, '27316', 'Phường An Đông', 'ward'),
    (128, '27343', 'Phường Chợ Lớn', 'ward'),
    (129, '27349', 'Phường Phú Lâm', 'ward'),
    (130, '27364', 'Phường Bình Phú', 'ward'),
    (131, '27367', 'Phường Bình Tây', 'ward'),
    (132, '27373', 'Phường Bình Tiên', 'ward'),
    (133, '27418', 'Phường Chánh Hưng', 'ward'),
    (134, '27424', 'Phường Bình Đông', 'ward'),
    (135, '27427', 'Phường Phú Định', 'ward'),
    (136, '27439', 'Phường Bình Hưng Hoà', 'ward'),
    (137, '27442', 'Phường Bình Tân', 'ward'),
    (138, '27448', 'Phường Bình Trị Đông', 'ward'),
    (139, '27457', 'Phường Tân Tạo', 'ward'),
    (140, '27460', 'Phường An Lạc', 'ward'),
    (141, '27475', 'Phường Tân Hưng', 'ward'),
    (142, '27478', 'Phường Tân Thuận', 'ward'),
    (143, '27484', 'Phường Phú Thuận', 'ward'),
    (144, '27487', 'Phường Tân Mỹ', 'ward'),
    (145, '27496', 'Xã Tân An Hội', 'commune'),
    (146, '27508', 'Xã An Nhơn Tây', 'commune'),
    (147, '27511', 'Xã Nhuận Đức', 'commune'),
    (148, '27526', 'Xã Thái Mỹ', 'commune'),
    (149, '27541', 'Xã Phú Hoà Đông', 'commune'),
    (150, '27544', 'Xã Bình Mỹ', 'commune'),
    (151, '27553', 'Xã Củ Chi', 'commune'),
    (152, '27559', 'Xã Hóc Môn', 'commune'),
    (153, '27568', 'Xã Đông Thạnh', 'commune'),
    (154, '27577', 'Xã Xuân Thới Sơn', 'commune'),
    (155, '27592', 'Xã Bà Điểm', 'commune'),
    (156, '27595', 'Xã Tân Nhựt', 'commune'),
    (157, '27601', 'Xã Vĩnh Lộc', 'commune'),
    (158, '27604', 'Xã Tân Vĩnh Lộc', 'commune'),
    (159, '27610', 'Xã Bình Lợi', 'commune'),
    (160, '27619', 'Xã Bình Hưng', 'commune'),
    (161, '27628', 'Xã Hưng Long', 'commune'),
    (162, '27637', 'Xã Bình Chánh', 'commune'),
    (163, '27655', 'Xã Nhà Bè', 'commune'),
    (164, '27658', 'Xã Hiệp Phước', 'commune'),
    (165, '27664', 'Xã Cần Giờ', 'commune'),
    (166, '27667', 'Xã Bình Khánh', 'commune'),
    (167, '27673', 'Xã An Thới Đông', 'commune'),
    (168, '27676', 'Xã Thạnh An', 'commune')
) AS p(place_id, ward_code, ward_name, place_type);
-- END HCM LOCATION DATA

-- Địa điểm tìm kiếm, không phải cấp hành chính mới. Gắn vào mã phường có trong nguồn.
-- Địa chỉ các tin này vẫn là dữ liệu giả lập, không xác nhận khoảng cách tới địa điểm.
CREATE TEMP TABLE hs_seed_featured_places ON COMMIT DROP AS
SELECT 168 + f.featured_no AS place_id, p.province_code, p.province_name,
       p.ward_code, p.ward_name, p.place_type, f.location_label
FROM (VALUES
    (1, 'ĐH Quốc gia TP.HCM Thủ Đức', '25951'),
    (2, 'ĐH Công nghiệp TP.HCM (IUH) · Gò Vấp', '26884'),
    (3, 'ĐH Bách khoa TP.HCM', '27169'),
    (4, 'Chợ Bến Thành', '26743'),
    (5, 'Landmark 81', '26956'),
    (6, 'Thủ Đức', '26824'),
    (7, 'Thủ Dầu Một', '25747'),
    (8, 'VSIP Bình Dương', '25987'),
    (9, 'Vũng Tàu', '26506'),
    (10, 'Phú Mỹ', '26704')
) AS f(featured_no, location_label, ward_code)
JOIN hs_seed_places p ON p.ward_code=f.ward_code;

CREATE TEMP TABLE hs_seed_rows ON COMMIT DROP AS
WITH inputs AS (
    SELECT ((p.place_id - 1) * 15 + slot.slot_no)::int AS n,
           slot.slot_no AS local_slot, p.*
    FROM hs_seed_places p
    CROSS JOIN generate_series(1,15) AS slot(slot_no)
    UNION ALL
    SELECT (2520 + (p.place_id - 169) * 5 + slot.slot_no)::int AS n,
           (ARRAY[1,2,6,7,11])[slot.slot_no] AS local_slot, p.*
    FROM hs_seed_featured_places p
    CROSS JOIN generate_series(1,5) AS slot(slot_no)
    UNION ALL
    -- Giữ nguyên công thức/ID của 50 tin trước; mỗi địa điểm thêm một phòng trọ riêng.
    SELECT (2571 + p.place_id - 169)::int AS n, 12 AS local_slot, p.*
    FROM hs_seed_featured_places p
), numbered AS (
    SELECT p.*,
           CASE WHEN local_slot <= 5 THEN 'HOUSE'
                WHEN local_slot <= 10 THEN 'APARTMENT'
                ELSE 'ROOM' END AS category,
           get_byte(decode(md5('hs-seed-price-' || n::text), 'hex'), 0) AS price_var,
           get_byte(decode(md5('hs-seed-area-' || n::text), 'hex'), 0) AS area_var,
           get_byte(decode(md5('hs-seed-extra-' || n::text), 'hex'), 0) AS extra_var,
           (ARRAY['Không gian được bố trí gọn gàng','Thông tin giá và phí được tách riêng',
                  'Có thể trao đổi ngày nhận nhà','Có nhiều khung giờ hẹn xem',
                  'Điều kiện thuê được ghi rõ trong tin',
                  'Có thể xem chi tiết trang thiết bị bàn giao'])[n % 6 + 1] AS selling_point
    FROM inputs p
), props AS (
    SELECT *,
           CASE (local_slot - 1) % 5
             WHEN 0 THEN 'FULLY_FURNISHED'
             WHEN 1 THEN 'BASIC'
             WHEN 2 THEN 'PARTIALLY_FURNISHED'
             WHEN 3 THEN 'UNFURNISHED'
             ELSE CASE WHEN category='APARTMENT' THEN 'LUXURY' ELSE 'FULLY_FURNISHED' END
           END AS furnishing_status,
           CASE category
             WHEN 'HOUSE' THEN CASE local_slot
               WHEN 1 THEN format('Cho thuê nhà nguyên căn %s phòng ngủ tại %s', 2 + n % 4, ward_name)
               WHEN 2 THEN format('Nhà nguyên căn %s tầng, %s phòng ngủ ở %s', 2 + n % 4, 2 + n % 4, ward_name)
               WHEN 3 THEN format('Cho thuê nhà %s phòng ngủ%s tại %s', 2 + n % 4,
                   CASE WHEN n % 4 = 0 THEN ', có gara'
                        ELSE format(', %s tầng', 2 + n % 4) END, ward_name)
               WHEN 4 THEN format('Cho thuê nhà nguyên căn %s mét vuông, %s phòng ngủ tại %s',
                   65 + area_var % 150 + (n % 4) * 0.5, 2 + n % 4, ward_name)
               ELSE format('Cho thuê nhà nguyên căn %s phòng ngủ, %s tầng ở %s',
                   2 + n % 4, 2 + n % 4, ward_name)
             END
             WHEN 'APARTMENT' THEN CASE local_slot
               WHEN 6 THEN format('Cho thuê căn hộ %s phòng ngủ tại %s', 1 + n % 3, ward_name)
               WHEN 7 THEN format('Căn hộ tầng %s, %s phòng ngủ ở %s', 2 + n % 20, 1 + n % 3, ward_name)
               WHEN 8 THEN format('Cho thuê căn hộ %s phòng ngủ, ban công hướng %s tại %s',
                   1 + n % 3, (ARRAY['Đông Nam','Đông Bắc','Tây Nam','Tây Bắc'])[(n % 4)+1], ward_name)
               WHEN 9 THEN format('Căn hộ %s phòng ngủ, diện tích %s mét vuông tại %s',
                   1 + n % 3, 30 + area_var % 95 + (n % 4) * 0.5, ward_name)
               ELSE format('Cho thuê căn hộ %s phòng ngủ, đầy đủ nội thất tại %s',
                   1 + n % 3, ward_name)
             END
             ELSE CASE local_slot
               WHEN 11 THEN format('Cho thuê phòng trọ %s mét vuông tại %s',
                   15 + area_var % 30 + (n % 4) * 0.5, ward_name)
               WHEN 12 THEN format('Phòng trọ %s tại %s',
                   CASE WHEN n % 4 <> 1 THEN 'có ban công'
                        WHEN n % 5 <> 0 THEN 'có cửa sổ'
                        ELSE format('tầng %s', n % 5) END, ward_name)
               WHEN 13 THEN format('Cho thuê phòng trọ %s tại %s',
                   CASE WHEN n % 3 = 0 THEN 'có gác lửng'
                        WHEN n % 4 <> 0 THEN 'WC riêng'
                        ELSE format('tầng %s', n % 5) END, ward_name)
               WHEN 14 THEN format('Phòng trọ %s, tối đa %s người tại %s',
                   CASE WHEN n % 7 = 0 THEN format('tầng %s', n % 5)
                        ELSE 'có chỗ gửi xe máy' END, 1 + n % 3, ward_name)
               ELSE format('Cho thuê phòng trọ %s mét vuông, %s tại %s',
                   15 + area_var % 30 + (n % 4) * 0.5,
                   CASE WHEN n % 4 <> 1 THEN 'có ban công'
                        WHEN n % 3 = 0 THEN 'có gác lửng'
                        ELSE format('tầng %s', n % 5) END, ward_name)
             END
           END AS title,
           (CASE category
             WHEN 'HOUSE' THEN 'Nhà nguyên căn phù hợp gia đình hoặc nhóm đi làm. '
             WHEN 'APARTMENT' THEN 'Căn hộ riêng tư với không gian sinh hoạt độc lập. '
             ELSE 'Phòng trọ phù hợp sinh viên hoặc người đi làm. '
           END) || selling_point || '. Khu vực hành chính: ' || ward_name ||
           ', ' || province_name || '. ' ||
           (ARRAY['Có thể trao đổi thêm về thời điểm bàn giao.',
                  'Các khoản phí và điều kiện thuê được ghi theo từng mục.',
                  'Nên đặt lịch xem để kiểm tra không gian thực tế.',
                  'Số nhà và đường là dữ liệu mẫu, không dùng để định vị thực tế.'])[(extra_var % 4)+1]
           AS description,
           CASE category WHEN 'HOUSE' THEN 65 + area_var % 150 + (n % 4) * 0.5
                         WHEN 'APARTMENT' THEN 30 + area_var % 95 + (n % 4) * 0.5
                         ELSE 15 + area_var % 30 + (n % 4) * 0.5 END::numeric(12,2) AS area_m2,
           CASE category
             WHEN 'HOUSE' THEN 7000000 + (n % 4) * 2000000 + (price_var % 100) * 180000
             WHEN 'APARTMENT' THEN 4500000 + (n % 3) * 1800000 + (price_var % 100) * 110000
             WHEN 'ROOM' THEN CASE WHEN n % 11 = 0
                   THEN 900000 + (price_var % 45) * 30000
                   ELSE 1400000 + (price_var % 95) * 40000 END
           END::numeric(18,2) AS price_amount,
           current_date + (extra_var % 75) AS available_from,
           CASE WHEN n % 5 = 0 THEN 'FIXED_AMOUNT' ELSE 'MONTH_COUNT' END AS deposit_type,
           CASE WHEN n % 5 = 0 THEN
             (CASE category WHEN 'HOUSE' THEN 6000000 + (n % 8)*1000000
                            WHEN 'APARTMENT' THEN 4000000 + (n % 6)*750000
                            ELSE 1500000 + (n % 7)*250000 END)::numeric(18,2)
           END AS deposit_amount,
           CASE WHEN n % 5 = 0 THEN NULL ELSE 1 + (n % 3) END AS deposit_months,
           CASE WHEN category='ROOM' AND n % 11 = 0 THEN 'PERSON_MONTH'
                WHEN category='ROOM' THEN 'ROOM_MONTH' ELSE 'MONTH' END AS price_unit,
           3 AS min_lease_months,
           CASE WHEN n % 7 = 0 THEN 'NONE'
                WHEN n % 3 = 0 THEN 'PAID' ELSE 'FREE' END AS room_parking_policy,
           CASE WHEN n % 7 = 0 THEN 0 ELSE 1 + (n % 3) END AS room_max_vehicles,
           (n % 4 = 0) AS house_has_garage
    FROM numbered
)
SELECT p.*, c.owner_id,
       md5('homespace-hcm-200-listing-v2-' || p.n::text)::uuid AS listing_id,
       ('P' || lpad(n::text, 4, '0')) AS room_code,
       (ARRAY['Góc đọc sách','Sân phơi chung','Không gian làm việc',
              'Khu để xe có mái che','Ban công đón gió','Sảnh sinh hoạt chung',
              'Khu vực cây xanh','Tủ nhận hàng'])[(extra_var % 8)+1] AS extra_amenity
FROM props p CROSS JOIN hs_seed_config c;

-- Chỉ bổ sung nhãn tìm kiếm cho 60 tin mới; không đổi tiêu đề/mô tả của tin gốc.
-- Tên địa điểm nằm trực tiếp trong tiêu đề Listing, KHÔNG dùng thay tên phường/địa chỉ.
UPDATE hs_seed_rows
SET title=replace(title, ward_name, 'khu vực ' || location_label),
    description=description || ' Địa điểm tìm kiếm: ' || location_label ||
        '. Tin mẫu thử nghiệm, không phải địa chỉ hoặc khoảng cách đã xác minh.'
WHERE n BETWEEN 2521 AND 2580;

-- Chỉ dọn chi tiết lỗi thời gắn với chính những ID seed này; không đụng tin thật.
DELETE FROM listing_house_details d USING hs_seed_rows s
WHERE d.listing_id=s.listing_id::text AND s.category<>'HOUSE';
DELETE FROM listing_apartment_details d USING hs_seed_rows s
WHERE d.listing_id=s.listing_id::text AND s.category<>'APARTMENT';
DELETE FROM listing_room_details d USING hs_seed_rows s
WHERE d.listing_id=s.listing_id::text AND s.category<>'ROOM';
DELETE FROM listing_charges c USING hs_seed_rows s
WHERE c.listing_id=s.listing_id::text AND (
    (c.charge_type='MOTORBIKE_PARKING' AND s.category='ROOM'
        AND s.room_parking_policy='NONE')
    OR (c.charge_type='CAR_PARKING' AND
        (s.category='ROOM' OR (s.category='HOUSE' AND NOT s.house_has_garage)
         OR (s.category='APARTMENT' AND s.n % 5 <> 0)))
);

-- Listing core: publication is set directly to PUBLISHED so public search/AI can retrieve these records.
INSERT INTO listings (
    id, owner_id, branch_id, title, description, category, status, status_reason,
    status_changed_at, status_changed_by, submitted_at, published_at, expires_at,
    version, available_from, area_m2, price_amount, currency, price_unit, negotiable,
    deposit_type, deposit_amount, deposit_months, payment_cycle, minimum_lease_months,
    management_fee_included, vat_included, max_motorbike_count, max_car_count,
    view_count, active, created_at, updated_at, created_by, updated_by
)
SELECT listing_id::text, owner_id, NULL, title, description, category, 'PUBLISHED', 'Seed dữ liệu thử nghiệm AI',
       now(), owner_id, now(), now(), now() + interval '180 days', 0, available_from,
       area_m2, price_amount, 'VND', price_unit, (n % 3 = 0), deposit_type, deposit_amount,
       deposit_months, 'MONTHLY', min_lease_months, (category='ROOM' OR n % 4 = 0), (n % 13 = 0),
       CASE WHEN category = 'ROOM' THEN room_max_vehicles ELSE 1 + (n % 4) END,
       CASE WHEN category = 'HOUSE' AND house_has_garage THEN 1 + (n % 2)
            WHEN category = 'APARTMENT' AND n % 5 = 0 THEN 1 ELSE 0 END,
       0, true, now() - (n || ' hours')::interval, now(), owner_id, owner_id
FROM hs_seed_rows
ON CONFLICT (id) DO UPDATE SET
    owner_id=excluded.owner_id, title=excluded.title, description=excluded.description,
    category=excluded.category, status='PUBLISHED', published_at=now(),
    expires_at=now() + interval '180 days', available_from=excluded.available_from,
    area_m2=excluded.area_m2, price_amount=excluded.price_amount, currency=excluded.currency,
    price_unit=excluded.price_unit, negotiable=excluded.negotiable, deposit_type=excluded.deposit_type,
    deposit_amount=excluded.deposit_amount, deposit_months=excluded.deposit_months,
    payment_cycle=excluded.payment_cycle, minimum_lease_months=excluded.minimum_lease_months,
    management_fee_included=excluded.management_fee_included, vat_included=excluded.vat_included,
    max_motorbike_count=excluded.max_motorbike_count, max_car_count=excluded.max_car_count,
    active=true, updated_at=now(), updated_by=excluded.updated_by;

-- Mã và tên địa bàn khớp chính xác nguồn location. Số nhà/đường chỉ là dữ liệu mẫu.
INSERT INTO addresses (
    id, user_id, listing_id, branch_id, province_code, province_name, ward_code, ward_name,
    street_line, full_address, active, created_at, updated_at, created_by, updated_by
)
SELECT md5('homespace-hcm-200-address-v2-' || n::text)::uuid::text,
       NULL, listing_id::text, NULL, province_code, province_name,
       ward_code, ward_name,
       format('%s/%s đường %s', 10 + n % 180, 1 + extra_var % 45,
              (ARRAY['Nguyễn Trãi','Lê Lợi','Hùng Vương','Trần Hưng Đạo',
                     'Phan Đình Phùng','Nguyễn Văn Trỗi','Hai Bà Trưng','Lê Văn Việt',
                     'Cách Mạng Tháng Tám','Điện Biên Phủ','Nguyễn Thị Minh Khai',
                     'Phạm Văn Đồng'])[(n % 12)+1]),
       format('%s/%s đường %s, %s, %s', 10 + n % 180, 1 + extra_var % 45,
              (ARRAY['Nguyễn Trãi','Lê Lợi','Hùng Vương','Trần Hưng Đạo',
                     'Phan Đình Phùng','Nguyễn Văn Trỗi','Hai Bà Trưng','Lê Văn Việt',
                     'Cách Mạng Tháng Tám','Điện Biên Phủ','Nguyễn Thị Minh Khai',
                     'Phạm Văn Đồng'])[(n % 12)+1], ward_name, province_name),
       true, now(), now(), owner_id, owner_id
FROM hs_seed_rows
ON CONFLICT (listing_id) DO UPDATE SET
    province_code=excluded.province_code, province_name=excluded.province_name,
    ward_code=excluded.ward_code, ward_name=excluded.ward_name,
    street_line=excluded.street_line, full_address=excluded.full_address,
    active=true, updated_at=now(), updated_by=excluded.updated_by;

-- HOUSE-specific fields.
INSERT INTO listing_house_details (
    listing_id, land_area_m2, frontage_width_m, length_m, access_road_width_m, frontage_count,
    total_floors, bedroom_count, bathroom_count, living_room_count, kitchen_count, has_rooftop,
    has_garage, access_type, max_occupants, max_vehicles, furnishing_status, legal_status,
    rental_scope_description, rented_floor_from, rented_floor_to
)
SELECT listing_id::text, area_m2 + 8 + (n % 4) * 3, 4 + (n % 4) * 0.5, 14 + (n % 7),
       3 + (n % 5) * 0.5, 1 + (n % 2), 2 + (n % 4), 2 + (n % 4), 1 + (n % 3),
       1 + (n % 2), 1, n % 3 = 0, house_has_garage,
       CASE WHEN n % 3 = 0 THEN 'HẺM XE HƠI' ELSE 'ĐƯỜNG NỘI BỘ' END,
       2 * (2 + (n % 4)), 1 + (n % 4),
       furnishing_status,
       CASE n % 3 WHEN 0 THEN 'Sổ hồng riêng' WHEN 1 THEN 'Giấy tờ hợp lệ, trao đổi khi xem nhà' ELSE 'Hợp đồng sở hữu được cung cấp khi xem nhà' END,
       'Cho thuê toàn bộ nhà', 1, 2 + (n % 4)
FROM hs_seed_rows WHERE category='HOUSE'
ON CONFLICT (listing_id) DO UPDATE SET land_area_m2=excluded.land_area_m2,
    frontage_width_m=excluded.frontage_width_m, length_m=excluded.length_m,
    access_road_width_m=excluded.access_road_width_m, frontage_count=excluded.frontage_count,
    total_floors=excluded.total_floors, bedroom_count=excluded.bedroom_count,
    bathroom_count=excluded.bathroom_count, living_room_count=excluded.living_room_count,
    kitchen_count=excluded.kitchen_count, has_rooftop=excluded.has_rooftop,
    has_garage=excluded.has_garage, access_type=excluded.access_type,
    max_occupants=excluded.max_occupants, max_vehicles=excluded.max_vehicles,
    furnishing_status=excluded.furnishing_status, legal_status=excluded.legal_status,
    rental_scope_description=excluded.rental_scope_description,
    rented_floor_from=excluded.rented_floor_from, rented_floor_to=excluded.rented_floor_to;

-- APARTMENT-specific fields.
INSERT INTO listing_apartment_details (
    listing_id, project_name, building_block, unit_code, floor_number, building_total_floors,
    bedroom_count, bathroom_count, living_room_count, kitchen_count, furnishing_status,
    main_door_direction, balcony_direction, view_description, max_occupants, legal_status
)
SELECT listing_id::text,
       'Tòa căn hộ tại ' || ward_name,
       (ARRAY['Block A','Block B','Tháp 1','Tháp 2','Block C','Tòa Đông','Tòa Tây'])[(n % 7)+1],
       'A' || (100 + n)::text, 2 + (n % 20), 25 + (n % 20),
       1 + (n % 3), 1 + (n % 2), 1, 1,
       furnishing_status,
       (ARRAY['Đông','Tây','Nam','Bắc'])[(n % 4)+1],
       (ARRAY['Đông Nam','Đông Bắc','Tây Nam','Tây Bắc'])[(n % 4)+1],
       (ARRAY['View thành phố','View cây xanh','View sân nội khu','View quảng trường',
              'View nội khu yên tĩnh','View thoáng không bị chắn'])[(n % 6)+1],
       2 * (1 + (n % 3)), CASE WHEN n % 2 = 0 THEN 'Sổ hồng' ELSE 'Hợp đồng mua bán' END
FROM hs_seed_rows WHERE category='APARTMENT'
ON CONFLICT (listing_id) DO UPDATE SET project_name=excluded.project_name,
    building_block=excluded.building_block, unit_code=excluded.unit_code,
    floor_number=excluded.floor_number, building_total_floors=excluded.building_total_floors,
    bedroom_count=excluded.bedroom_count, bathroom_count=excluded.bathroom_count,
    living_room_count=excluded.living_room_count, kitchen_count=excluded.kitchen_count,
    furnishing_status=excluded.furnishing_status, main_door_direction=excluded.main_door_direction,
    balcony_direction=excluded.balcony_direction, view_description=excluded.view_description,
    max_occupants=excluded.max_occupants, legal_status=excluded.legal_status;

-- ROOM-specific fields.
INSERT INTO listing_room_details (
    listing_id, room_code, floor_number, restroom_type, kitchen_type, has_window,
    balcony_type, has_balcony, has_mezzanine, furnishing_status, access_type,
    access_hours_type, electric_meter_type, water_meter_type, max_occupants,
    max_vehicles, parking_policy
)
SELECT listing_id::text, room_code, n % 5,
       CASE WHEN n % 4 = 0 THEN 'SHARED' ELSE 'PRIVATE' END,
       CASE n % 3 WHEN 0 THEN 'PRIVATE' WHEN 1 THEN 'SHARED' ELSE 'NONE' END,
       n % 5 <> 0, CASE WHEN n % 4 = 0 THEN 'SHARED' WHEN n % 4 = 1 THEN 'NONE' ELSE 'PRIVATE' END,
       n % 4 <> 1, n % 3 = 0,
       furnishing_status,
       CASE WHEN n % 5 = 0 THEN 'SHARED' ELSE 'PRIVATE' END,
       CASE WHEN n % 6 = 0 THEN 'CURFEW' ELSE 'FLEXIBLE' END,
       CASE WHEN n % 3 = 0 THEN 'SHARED' ELSE 'PRIVATE' END,
       CASE WHEN n % 4 = 0 THEN 'SHARED' ELSE 'PRIVATE' END,
       1 + (n % 3), room_max_vehicles, room_parking_policy
FROM hs_seed_rows WHERE category='ROOM'
ON CONFLICT (listing_id) DO UPDATE SET room_code=excluded.room_code,
    floor_number=excluded.floor_number, restroom_type=excluded.restroom_type,
    kitchen_type=excluded.kitchen_type, has_window=excluded.has_window,
    balcony_type=excluded.balcony_type, has_balcony=excluded.has_balcony,
    has_mezzanine=excluded.has_mezzanine, furnishing_status=excluded.furnishing_status,
    access_type=excluded.access_type, access_hours_type=excluded.access_hours_type,
    electric_meter_type=excluded.electric_meter_type, water_meter_type=excluded.water_meter_type,
    max_occupants=excluded.max_occupants, max_vehicles=excluded.max_vehicles,
    parking_policy=excluded.parking_policy;

-- Monthly charges: electricity, water, management, internet, garbage/service, and parking.
WITH charge_seed AS (
    SELECT s.*, v.charge_type, v.billing_method, v.amount, v.unit, v.included, v.custom_name, v.sort_order
    FROM hs_seed_rows s
    CROSS JOIN LATERAL (VALUES
      ('ELECTRICITY','PER_KWH',(2800 + (s.price_var % 11)*125)::numeric,'kWh',false,NULL::text,1),
      ('WATER','PER_M3',(12000 + (s.area_var % 13)*750)::numeric,'m³',false,NULL::text,2),
      ('MANAGEMENT','PER_MONTH',(CASE WHEN s.category='ROOM' OR s.n % 4=0 THEN 0
           ELSE 100000 + (s.extra_var % 9)*35000 END)::numeric,'tháng',
           s.category='ROOM' OR s.n % 4=0,NULL::text,3),
      ('INTERNET','PER_MONTH',(CASE WHEN s.n % 6=0 THEN 0 ELSE 60000 + (s.price_var % 8)*15000 END)::numeric,
           'tháng',s.n % 6=0,NULL::text,4),
      ('SERVICE_OR_GARBAGE','PER_PERSON_MONTH',(CASE WHEN s.n % 11=0 THEN 0
           ELSE 15000 + (s.area_var % 9)*5000 END)::numeric,'người/tháng',s.n % 11=0,NULL::text,5),
      ('MOTORBIKE_PARKING','PER_VEHICLE_MONTH',(CASE
           WHEN s.category='HOUSE' OR (s.category='ROOM' AND s.room_parking_policy='FREE')
                OR (s.category='APARTMENT' AND s.n % 4=0) THEN 0
           ELSE 50000 + (s.extra_var % 10)*10000 END)::numeric,'xe/tháng',
           s.category='HOUSE' OR (s.category='ROOM' AND s.room_parking_policy='FREE')
                OR (s.category='APARTMENT' AND s.n % 4=0),NULL::text,6),
      ('CAR_PARKING','PER_VEHICLE_MONTH',(CASE WHEN s.category='APARTMENT'
           THEN 350000 + (s.price_var % 9)*75000 ELSE 0 END)::numeric,
           'xe/tháng',s.category='HOUSE',NULL::text,7)
    ) AS v(charge_type,billing_method,amount,unit,included,custom_name,sort_order)
    WHERE NOT (s.category='ROOM' AND s.room_parking_policy='NONE'
               AND v.charge_type='MOTORBIKE_PARKING')
      AND NOT (v.charge_type='CAR_PARKING' AND
               (s.category='ROOM' OR (s.category='HOUSE' AND NOT s.house_has_garage)
                OR (s.category='APARTMENT' AND s.n % 5 <> 0)))
)
INSERT INTO listing_charges (
    id, listing_id, charge_type, billing_method, amount, currency, unit, included_in_rent,
    custom_name, description, sort_order, active, created_at, updated_at, created_by, updated_by
)
SELECT md5('homespace-hcm-200-v2-charge-' || n::text || '-' || sort_order::text)::uuid::text,
       listing_id::text, charge_type, billing_method, amount, 'VND', unit, included,
       custom_name, CASE charge_type
         WHEN 'ELECTRICITY' THEN 'Tính theo đồng hồ điện và đơn giá ghi trong hợp đồng.'
         WHEN 'WATER' THEN 'Tính theo đồng hồ nước và đơn giá ghi trong hợp đồng.'
         ELSE 'Khoản phí tham khảo mỗi tháng; xác nhận với chủ nhà khi xem.' END,
       sort_order, true, now(), now(), owner_id, owner_id
FROM charge_seed
ON CONFLICT (id) DO UPDATE SET charge_type=excluded.charge_type,
    billing_method=excluded.billing_method, amount=excluded.amount, currency=excluded.currency,
    unit=excluded.unit, included_in_rent=excluded.included_in_rent,
    custom_name=excluded.custom_name, description=excluded.description,
    sort_order=excluded.sort_order, active=true, updated_at=now(), updated_by=excluded.updated_by;

-- Amenities chosen from the live catalog, constrained to categories supported by each amenity.
-- Reconcile associations on rerun; otherwise removed catalog items/changed scenarios linger.
DELETE FROM listing_amenities a USING hs_seed_rows s WHERE a.listing_id=s.listing_id::text;
WITH amenity_seed AS (
    SELECT s.*, a.code
    FROM hs_seed_rows s
    CROSS JOIN LATERAL unnest(ARRAY[
       'WIFI',
       'ELEVATOR','PARKING','SECURITY_24_7','CAMERA',
       'SWIMMING_POOL','GYM'
    ]) AS chosen(code)
    JOIN amenities a ON a.code=chosen.code AND a.active IS TRUE
    JOIN amenity_categories ac ON ac.amenity_id=a.id AND ac.category=s.category
    WHERE CASE chosen.code
      WHEN 'WIFI' THEN s.n % 11 <> 0
      WHEN 'ELEVATOR' THEN s.category='APARTMENT' OR s.n % 5 = 0
      WHEN 'PARKING' THEN s.category <> 'ROOM' OR s.room_parking_policy <> 'NONE'
      WHEN 'SECURITY_24_7' THEN s.n % 3 = 0
      WHEN 'CAMERA' THEN s.n % 4 = 0
      WHEN 'SWIMMING_POOL' THEN s.n % 13 = 0
      WHEN 'GYM' THEN s.n % 7 = 0
      ELSE false END
)
INSERT INTO listing_amenities (listing_id, amenity_id)
SELECT DISTINCT listing_id::text, a.id
FROM amenity_seed x JOIN amenities a ON a.code=x.code
ON CONFLICT DO NOTHING;

-- Policies are independent from amenities and selected from the active backend catalog.
-- Supports additions to the category catalog without maintaining a policy list in this seed.
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM listing_policy_definitions WHERE active=true) THEN
        RAISE EXCEPTION 'Thiếu danh mục chính sách. Khởi động Core để ListingPolicyInitializer tạo catalog trước khi seed.';
    END IF;
END $$;
WITH policy_seed AS (
    SELECT s.listing_id, s.n, d.*,
           CASE d.value_type
             WHEN 'PERMISSION' THEN (ARRAY['ALLOWED','NOT_ALLOWED','APPROVAL_REQUIRED'])[1 + (get_byte(decode(md5(s.n::text || d.code),'hex'),0) % 3)]
             WHEN 'INTEGER' THEN greatest(coalesce(d.minimum_value,0),least(coalesce(d.maximum_value,180),
                 CASE d.code WHEN 'propertyInspectionNotice' THEN CASE WHEN s.n % 3=0 THEN 48 ELSE 24 END
                     WHEN 'noticeDaysBeforeTermination' THEN CASE WHEN s.n % 4=0 THEN 45 ELSE 30 END
                     WHEN 'depositRefundDays' THEN CASE WHEN s.n % 3=0 THEN 7 ELSE 15 END
                     ELSE coalesce(d.minimum_value,0) END))::text
             WHEN 'TEXT' THEN CASE d.code
                 WHEN 'buildingRulesPolicy' THEN 'Đăng ký cư trú, giữ vệ sinh hành lang và tuân thủ hướng dẫn an toàn tòa nhà. Không để đồ chắn lối thoát hiểm.'
                 WHEN 'sharedAmenitiesPolicy' THEN 'Giữ vệ sinh không gian chung; sử dụng theo khung giờ và tình trạng vận hành thực tế. Nội quy áp dụng cho tài sản thuê này.'
                 WHEN 'quietHoursPolicy' THEN CASE WHEN s.n % 2=0 THEN 'Giữ yên tĩnh từ 22:00 đến 06:00; không tổ chức tụ tập gây ồn trong khu trọ.' ELSE 'Giữ yên tĩnh từ 23:00 đến 06:00; khách qua đêm theo chính sách lưu trú đã công bố.' END
                 ELSE 'Quy định do chủ nhà công bố cho tài sản thuê: phối hợp thông báo và giữ gìn khu vực sử dụng.' END
             ELSE NULL END AS policy_value,
           CASE WHEN d.value_type='PERMISSION' THEN CASE d.code
               WHEN 'petPolicy' THEN 'Xác nhận với chủ nhà khu vực nuôi, vệ sinh và trách nhiệm thiệt hại trước khi nhận phòng.'
               WHEN 'smokingPolicy' THEN 'Không hút thuốc tại khu vực có nguy cơ cháy nổ hoặc ảnh hưởng người xung quanh.'
               WHEN 'subleasePolicy' THEN 'Đăng ký người ở thực tế; mọi chấp thuận phải được hai bên ghi nhận bằng văn bản.'
               WHEN 'overnightGuestPolicy' THEN 'Đăng ký lưu trú theo quy định; không vượt giới hạn người ở của tài sản.'
               WHEN 'alterationsPolicy' THEN 'Không tự tác động kết cấu; ghi nhận phương án cải tạo và hoàn trả hiện trạng.'
               ELSE 'Ghi nhận điều kiện cụ thể với chủ nhà trước khi thực hiện.' END ELSE '' END AS note
    FROM hs_seed_rows s JOIN listing_policy_definition_categories dc ON dc.category=s.category
    JOIN listing_policy_definitions d ON d.code=dc.policy_code AND d.active=true
    WHERE d.code NOT LIKE 'latePayment%' AND d.code NOT IN ('listingPolicies','paymentDueDay','paymentCycle','depositAmount','bankAccountNumber','bankAccountHolder','overdueLandlordTerminationAfterFiveDays')
)
INSERT INTO listing_policy_values(id,listing_id,policy_code,policy_value,note)
SELECT md5(listing_id::text || ':policy:' || code),listing_id::text,code,policy_value,
       CASE WHEN value_type='PERMISSION' AND policy_value='NOT_ALLOWED'
            THEN 'Không áp dụng quyền này. Nếu cần thay đổi, hai bên phải ghi nhận thỏa thuận phù hợp.'
            WHEN value_type='PERMISSION' AND policy_value='APPROVAL_REQUIRED'
            THEN 'Cần chủ nhà chấp thuận bằng văn bản trước khi thực hiện. ' || note
            ELSE note END
FROM policy_seed WHERE policy_value IS NOT NULL
ON CONFLICT(listing_id,policy_code) DO UPDATE SET policy_value=excluded.policy_value,note=excluded.note;

-- Furnishing inventory snapshots for all furnished listings.
-- Use the category's live catalog, not a hardcoded subset (previously missed 4 items).
-- FULL/LUXURY include the whole supported catalog; BASIC/PARTIAL take ordered subsets.
-- Do not manufacture an inventory for a listing explicitly advertised as UNFURNISHED.
DELETE FROM listing_furnishing_assets f USING hs_seed_rows s WHERE f.listing_id=s.listing_id::text;
WITH furnishing_seed AS (
    SELECT s.*, fi.code, fi.id AS furnishing_item_id, fi.catalog_order AS sort_order,
           CASE WHEN get_byte(decode(md5(s.n::text || fi.code), 'hex'), 0) % 9=0 THEN 'BRAND_NEW'
                WHEN get_byte(decode(md5(s.n::text || fi.code), 'hex'), 0) % 4=0 THEN 'NORMAL'
                ELSE 'GOOD' END AS handover_condition
    FROM hs_seed_rows s
    CROSS JOIN LATERAL (
        SELECT f.id,f.code,row_number() OVER (ORDER BY f.sort_order,f.code)::int AS catalog_order,
               count(*) OVER () AS catalog_count
        FROM furnishing_items f
        JOIN furnishing_item_categories fc ON fc.furnishing_item_id=f.id AND fc.category=s.category
        WHERE f.active IS TRUE
    ) fi
    WHERE s.furnishing_status<>'UNFURNISHED'
      AND (s.furnishing_status IN ('FULLY_FURNISHED','LUXURY')
        OR fi.catalog_order<=CASE WHEN s.furnishing_status='BASIC' THEN 3
                                 ELSE greatest(4,(fi.catalog_count+1)/2) END)
)
INSERT INTO listing_furnishing_assets (
    id, listing_id, furnishing_item_id, item_code, asset_name, quantity,
    handover_condition, condition_note, sort_order
)
SELECT md5('homespace-hcm-200-v2-furnishing-' || fs.n::text || '-' || fs.code)::uuid::text,
       listing_id::text, furnishing_item_id, fs.code, fi.name,
       CASE WHEN fs.code IN ('CURTAIN','LIGHTING') THEN 1 + fs.n % 3 ELSE 1 END,
       handover_condition, 'Dữ liệu kiểm thử; tình trạng thực tế cần xác nhận khi bàn giao.', fs.sort_order
FROM furnishing_seed fs JOIN furnishing_items fi ON fi.id=fs.furnishing_item_id
ON CONFLICT (id) DO UPDATE SET furnishing_item_id=excluded.furnishing_item_id,
    item_code=excluded.item_code, asset_name=excluded.asset_name, quantity=excluded.quantity,
    handover_condition=excluded.handover_condition, condition_note=excluded.condition_note,
    sort_order=excluded.sort_order;

-- Equipment-like amenity tags must reflect actual handover assets, never a separate random draw.
INSERT INTO listing_amenities (listing_id,amenity_id)
SELECT f.listing_id,a.id FROM listing_furnishing_assets f
JOIN hs_seed_rows s ON s.listing_id::text=f.listing_id
JOIN amenities a ON a.code=f.item_code AND a.active IS TRUE
JOIN amenity_categories ac ON ac.amenity_id=a.id AND ac.category=s.category
WHERE f.item_code IN ('AIR_CONDITIONER','WATER_HEATER','REFRIGERATOR','WASHING_MACHINE')
ON CONFLICT DO NOTHING;

-- Custom amenity / free-text utility field from the form.
INSERT INTO listing_custom_amenities (id, listing_id, name)
SELECT md5('homespace-hcm-200-v2-custom-' || n::text)::uuid::text,
       listing_id::text, extra_amenity
FROM hs_seed_rows
ON CONFLICT (id) DO UPDATE SET name=excluded.name;

-- Viewing availability: mix weekdays and morning/afternoon/evening slots.
DELETE FROM listing_viewing_days d USING hs_seed_rows s WHERE d.listing_id=s.listing_id::text;
DELETE FROM listing_viewing_slots v USING hs_seed_rows s WHERE v.listing_id=s.listing_id::text;
INSERT INTO listing_viewing_days (listing_id, day_of_week)
SELECT listing_id::text, day_name
FROM hs_seed_rows s
CROSS JOIN LATERAL unnest(ARRAY['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY']) AS d(day_name)
WHERE d.day_name='SATURDAY' OR (get_byte(decode(md5(n::text || d.day_name), 'hex'), 0) % 3) <> 0
ON CONFLICT DO NOTHING;

INSERT INTO listing_viewing_slots (listing_id, viewing_slot)
SELECT listing_id::text, slot_name
FROM hs_seed_rows s
CROSS JOIN LATERAL unnest(ARRAY['MORNING','AFTERNOON','EVENING']) AS v(slot_name)
WHERE v.slot_name='AFTERNOON' OR (get_byte(decode(md5(n::text || v.slot_name), 'hex'), 0) % 4) <> 0
ON CONFLICT DO NOTHING;

-- Demo: 3 shared S3 images (unique object_key) attached to every listing.
WITH media_seed AS (
    SELECT s.*, m.media_order, m.file_name, m.sample_url,
           md5('homespace-seed-s3-object-' || m.media_order::text)::uuid::text AS storage_id,
           md5('homespace-hcm-200-v2-media-' || s.n::text || '-' || m.media_order::text)::uuid::text AS media_id
    FROM hs_seed_rows s
    CROSS JOIN (VALUES
      (1, '1.jpg', 'https://homespace-dev-files-v4.s3.ap-southeast-1.amazonaws.com/1.jpg'),
      (2, '2.jpg', 'https://homespace-dev-files-v4.s3.ap-southeast-1.amazonaws.com/2.jpg'),
      (3, '3.jpg', 'https://homespace-dev-files-v4.s3.ap-southeast-1.amazonaws.com/3.jpg')
    ) AS m(media_order, file_name, sample_url)
)
INSERT INTO storage_objects (
    id, original_name, object_key, bucket_name, content_type, size_bytes, checksum, extension,
    owner_id, reference_type, reference_id, purpose, visibility, status,
    active, created_at, updated_at, created_by, updated_by
)
SELECT storage_id, file_name,
       file_name, 'homespace-dev-files-v4',
       'image/jpeg', 1000000, md5(file_name), 'jpg', owner_id, NULL, NULL,
       'LISTING_IMAGE', 'PUBLIC', 'READY', true, now(), now(), owner_id, owner_id
FROM (SELECT DISTINCT storage_id, file_name, sample_url, owner_id, media_order FROM media_seed) media_seed
ON CONFLICT (id) DO UPDATE SET original_name=excluded.original_name,
    object_key=excluded.object_key, bucket_name=excluded.bucket_name, content_type=excluded.content_type,
    size_bytes=excluded.size_bytes, checksum=excluded.checksum, extension=excluded.extension,
    owner_id=excluded.owner_id, reference_type=excluded.reference_type,
    reference_id=excluded.reference_id, purpose=excluded.purpose,
    visibility=excluded.visibility, status='READY', active=true, updated_at=now(), updated_by=excluded.updated_by;

WITH media_seed AS (
    SELECT s.*, m.media_order, m.file_name, m.sample_url,
           md5('homespace-seed-s3-object-' || m.media_order::text)::uuid::text AS storage_id,
           md5('homespace-hcm-200-v2-media-' || s.n::text || '-' || m.media_order::text)::uuid::text AS media_id
    FROM hs_seed_rows s
    CROSS JOIN (VALUES
      (1, '1.jpg', 'https://homespace-dev-files-v4.s3.ap-southeast-1.amazonaws.com/1.jpg'),
      (2, '2.jpg', 'https://homespace-dev-files-v4.s3.ap-southeast-1.amazonaws.com/2.jpg'),
      (3, '3.jpg', 'https://homespace-dev-files-v4.s3.ap-southeast-1.amazonaws.com/3.jpg')
    ) AS m(media_order, file_name, sample_url)
)
INSERT INTO listing_media (
    id, listing_id, storage_object_id, media_type, sort_order, is_cover, media_url,
    active, created_at, updated_at, created_by, updated_by
)
SELECT media_id, listing_id::text, storage_id, 'IMAGE', media_order - 1,
       media_order = 1, sample_url, true, now(), now(), owner_id, owner_id
FROM media_seed
ON CONFLICT (id) DO UPDATE SET listing_id=excluded.listing_id,
    storage_object_id=excluded.storage_object_id, media_type=excluded.media_type,
    sort_order=excluded.sort_order, is_cover=excluded.is_cover, media_url=excluded.media_url,
    active=true, updated_at=now(), updated_by=excluded.updated_by;

-- Quick summary before commit; the temp seed table is dropped by COMMIT.
DO $$
BEGIN
    IF (SELECT count(*) FROM hs_seed_places) <> 168
       OR (SELECT count(DISTINCT ward_code) FROM hs_seed_places) <> 168
       OR EXISTS (SELECT 1 FROM hs_seed_places WHERE province_code <> '79') THEN
        RAISE EXCEPTION 'Nguồn TP.HCM phải có 168 mã phường/xã/đặc khu duy nhất';
    END IF;
    IF (SELECT count(*) FROM hs_seed_rows WHERE n BETWEEN 1 AND 2520) <> 2520
       OR (SELECT count(*) FROM hs_seed_rows) <> 2580
       OR (SELECT count(DISTINCT listing_id) FROM hs_seed_rows) <> 2580 THEN
        RAISE EXCEPTION 'Seed phải giữ 2.520 tin gốc và thêm 60 tin mới, không trùng ID';
    END IF;
    IF (SELECT count(*) FROM hs_seed_featured_places) <> 10
       OR (SELECT count(DISTINCT location_label) FROM hs_seed_featured_places) <> 10
       OR EXISTS (
           SELECT 1 FROM hs_seed_featured_places p
           LEFT JOIN hs_seed_rows s ON s.place_id=p.place_id
           GROUP BY p.place_id
           HAVING count(s.n) <> 6 OR count(DISTINCT s.title) <> 6
               OR count(*) FILTER (WHERE s.category='HOUSE') <> 2
               OR count(*) FILTER (WHERE s.category='APARTMENT') <> 2
               OR count(*) FILTER (WHERE s.category='ROOM') <> 2
       ) OR EXISTS (
           SELECT 1 FROM hs_seed_rows WHERE n > 2520
           AND (strpos(title, location_label)=0 OR strpos(description, location_label)=0)
       ) THEN
        RAISE EXCEPTION 'Phải bổ sung đúng 6 tin cho mỗi địa điểm nổi bật (2 nhà, 2 căn hộ, 2 phòng trọ)';
    END IF;
    IF EXISTS (
        SELECT 1 FROM hs_seed_places p
        LEFT JOIN hs_seed_rows s ON s.place_id=p.place_id
        GROUP BY p.place_id HAVING count(s.n) <> 15
    ) THEN
        RAISE EXCEPTION 'Mỗi phường/xã/đặc khu phải có đúng 15 tin';
    END IF;
    IF EXISTS (
        SELECT 1 FROM hs_seed_places p
        CROSS JOIN (VALUES ('HOUSE'), ('APARTMENT'), ('ROOM')) AS expected(category)
        LEFT JOIN hs_seed_rows s ON s.place_id=p.place_id AND s.category=expected.category
        GROUP BY p.place_id, expected.category
        HAVING count(s.n) <> 5 OR count(DISTINCT s.title) <> 5
    ) THEN
        RAISE EXCEPTION 'Mỗi địa bàn phải có đúng 5 tiêu đề khác nhau cho từng loại hình';
    END IF;
    IF (
        SELECT count(*) FROM listings l
        JOIN hs_seed_rows s ON s.listing_id::text=l.id
        WHERE l.active IS TRUE AND l.status='PUBLISHED'
    ) <> 2580 OR (
        SELECT count(*) FROM addresses a
        JOIN hs_seed_rows s ON s.listing_id::text=a.listing_id
        WHERE a.active IS TRUE
    ) <> 2580 THEN
        RAISE EXCEPTION 'Seed chưa tạo đủ 2.580 tin và địa chỉ đang hoạt động';
    END IF;
    IF EXISTS (
        SELECT 1 FROM hs_seed_rows s
        JOIN addresses a ON a.listing_id=s.listing_id::text
        WHERE a.province_code<>s.province_code OR a.province_name<>s.province_name
           OR a.ward_code<>s.ward_code OR a.ward_name<>s.ward_name
           OR a.full_address NOT LIKE '%' || s.ward_name || ', ' || s.province_name
           OR (s.n <= 2520 AND s.title NOT LIKE '%' || s.ward_name || '%')
           OR (s.n > 2520 AND (strpos(s.title, 'khu vực ' || s.location_label)=0
               OR strpos(s.title, s.ward_name)>0))
    ) THEN
        RAISE EXCEPTION 'Tiêu đề/địa chỉ seed không khớp mã và tên địa bàn TP.HCM';
    END IF;
    IF EXISTS (
        SELECT 1 FROM hs_seed_rows s
        JOIN listings l ON l.id=s.listing_id::text
        WHERE l.price_amount<=0 OR l.area_m2<=0
           OR (l.category='ROOM' AND l.price_unit NOT IN ('ROOM_MONTH','PERSON_MONTH'))
           OR (l.category<>'ROOM' AND l.price_unit<>'MONTH')
           OR (l.max_motorbike_count=0 AND l.category<>'ROOM')
    ) THEN
        RAISE EXCEPTION 'Giá, diện tích, đơn vị giá hoặc sức chứa xe không hợp lý';
    END IF;
    IF EXISTS (
        SELECT 1 FROM hs_seed_rows s
        LEFT JOIN listing_room_details r ON r.listing_id=s.listing_id::text AND s.category='ROOM'
        LEFT JOIN listing_house_details h ON h.listing_id=s.listing_id::text AND s.category='HOUSE'
        LEFT JOIN listing_apartment_details ap ON ap.listing_id=s.listing_id::text AND s.category='APARTMENT'
        WHERE (s.category='ROOM' AND (r.listing_id IS NULL OR r.max_occupants < 1
                       OR r.has_balcony <> (r.balcony_type <> 'NONE')))
           OR (s.category='HOUSE' AND (h.listing_id IS NULL OR h.max_occupants < 1
                       OR h.rented_floor_from <> 1 OR h.rented_floor_to <> h.total_floors))
           OR (s.category='APARTMENT' AND (ap.listing_id IS NULL OR ap.max_occupants < 1
                       OR ap.floor_number > ap.building_total_floors))
    ) THEN
        RAISE EXCEPTION 'Chi tiết loại hình hoặc sức chứa không hợp lệ';
    END IF;
    IF EXISTS (
        SELECT 1 FROM hs_seed_rows s
        JOIN listing_room_details r ON r.listing_id=s.listing_id::text
        JOIN listings l ON l.id=s.listing_id::text
        WHERE s.category='ROOM' AND (
            (r.parking_policy='NONE' AND r.max_vehicles<>0) OR
            (r.parking_policy IN ('FREE','PAID') AND r.max_vehicles<=0) OR
            l.max_motorbike_count<>r.max_vehicles
        )
    ) THEN
        RAISE EXCEPTION 'Số xe và chính sách gửi xe của phòng trọ không nhất quán';
    END IF;
    IF EXISTS (
        SELECT 1 FROM hs_seed_rows s
        JOIN listing_room_details r ON r.listing_id=s.listing_id::text
        LEFT JOIN listing_charges c ON c.listing_id=s.listing_id::text
            AND c.charge_type='MOTORBIKE_PARKING' AND c.active IS TRUE
        WHERE s.category='ROOM' AND (
            (r.parking_policy='NONE' AND c.id IS NOT NULL) OR
            (r.parking_policy='FREE' AND (c.id IS NULL OR NOT c.included_in_rent OR c.amount<>0)) OR
            (r.parking_policy='PAID' AND (c.id IS NULL OR c.included_in_rent OR c.amount<=0))
        )
    ) THEN
        RAISE EXCEPTION 'Phí gửi xe phòng trọ không khớp chính sách';
    END IF;
    IF EXISTS (
        SELECT 1 FROM hs_seed_rows s
        LEFT JOIN listing_house_details h ON h.listing_id=s.listing_id::text
        LEFT JOIN listing_apartment_details a ON a.listing_id=s.listing_id::text
        LEFT JOIN listing_room_details r ON r.listing_id=s.listing_id::text
        WHERE coalesce(h.furnishing_status,a.furnishing_status,r.furnishing_status,'')<>s.furnishing_status
           OR (s.furnishing_status='UNFURNISHED' AND EXISTS (
               SELECT 1 FROM listing_furnishing_assets f WHERE f.listing_id=s.listing_id::text))
           OR (s.furnishing_status<>'UNFURNISHED' AND NOT EXISTS (
               SELECT 1 FROM listing_furnishing_assets f WHERE f.listing_id=s.listing_id::text))
           OR (s.furnishing_status IN ('FULLY_FURNISHED','LUXURY') AND EXISTS (
               SELECT 1 FROM furnishing_items fi
               JOIN furnishing_item_categories fc ON fc.furnishing_item_id=fi.id AND fc.category=s.category
               WHERE fi.active IS TRUE AND NOT EXISTS (
                   SELECT 1 FROM listing_furnishing_assets f
                   WHERE f.listing_id=s.listing_id::text AND f.furnishing_item_id=fi.id)))
    ) THEN
        RAISE EXCEPTION 'Trạng thái nội thất không khớp danh mục bàn giao hoặc thiếu catalog nội thất của loại hình';
    END IF;
    IF EXISTS (
        SELECT 1 FROM hs_seed_rows s
        JOIN listing_furnishing_assets f ON f.listing_id=s.listing_id::text
        LEFT JOIN furnishing_items fi ON fi.id=f.furnishing_item_id AND fi.active IS TRUE
        LEFT JOIN furnishing_item_categories fc ON fc.furnishing_item_id=fi.id AND fc.category=s.category
        WHERE fi.id IS NULL OR fc.furnishing_item_id IS NULL OR f.item_code<>fi.code
           OR f.asset_name IS DISTINCT FROM fi.name OR f.quantity<1 OR f.sort_order<1
           OR f.handover_condition NOT IN ('BRAND_NEW','GOOD','NORMAL') OR nullif(btrim(f.condition_note),'') IS NULL
    ) THEN
        RAISE EXCEPTION 'Nội thất thiếu tên/số lượng/tình trạng hoặc không thuộc catalog của loại hình';
    END IF;
    IF EXISTS (
        SELECT 1 FROM hs_seed_rows s
        JOIN listing_amenities la ON la.listing_id=s.listing_id::text
        JOIN amenities a ON a.id=la.amenity_id
        WHERE NOT a.active OR a.code='PETS_ALLOWED' OR NOT EXISTS (
            SELECT 1 FROM amenity_categories ac WHERE ac.amenity_id=a.id AND ac.category=s.category)
          OR (a.code IN ('AIR_CONDITIONER','WATER_HEATER','REFRIGERATOR','WASHING_MACHINE') AND NOT EXISTS (
            SELECT 1 FROM listing_furnishing_assets f WHERE f.listing_id=s.listing_id::text AND f.item_code=a.code))
    ) THEN
        RAISE EXCEPTION 'Tiện ích sai loại hình, chứa thú cưng hoặc thiết bị không có trong nội thất bàn giao';
    END IF;
    IF EXISTS (
        SELECT 1 FROM hs_seed_rows s CROSS JOIN (VALUES
            ('ELECTRICITY'),('WATER'),('MANAGEMENT'),('INTERNET'),('SERVICE_OR_GARBAGE')) required(code)
        WHERE NOT EXISTS (SELECT 1 FROM listing_charges c WHERE c.listing_id=s.listing_id::text
            AND c.charge_type=required.code AND c.active IS TRUE)
    ) OR EXISTS (
        SELECT 1 FROM hs_seed_rows s JOIN listing_charges c ON c.listing_id=s.listing_id::text
        WHERE c.amount<0 OR c.currency<>'VND' OR (c.included_in_rent AND c.amount<>0)
           OR nullif(btrim(c.unit),'') IS NULL OR c.billing_method IS NULL
    ) THEN
        RAISE EXCEPTION 'Thiếu phí sinh hoạt hoặc đơn giá/đơn vị phí không hợp lệ';
    END IF;
    IF EXISTS (
        SELECT 1 FROM (VALUES ('HOUSE'),('APARTMENT'),('ROOM')) expected(category)
        WHERE NOT EXISTS (SELECT 1 FROM listing_policy_definition_categories dc
            JOIN listing_policy_definitions d ON d.code=dc.policy_code AND d.active IS TRUE
            WHERE dc.category=expected.category)
    ) OR EXISTS (
        SELECT 1 FROM hs_seed_rows s
        JOIN listing_policy_definition_categories dc ON dc.category=s.category
        JOIN listing_policy_definitions d ON d.code=dc.policy_code AND d.active IS TRUE
        LEFT JOIN listing_policy_values v ON v.listing_id=s.listing_id::text AND v.policy_code=d.code
        WHERE nullif(btrim(v.policy_value),'') IS NULL
           OR (d.value_type='PERMISSION' AND v.policy_value NOT IN ('ALLOWED','NOT_ALLOWED','APPROVAL_REQUIRED'))
           OR (d.value_type='INTEGER' AND (CASE WHEN v.policy_value ~ '^\d+$' THEN
               v.policy_value::numeric<coalesce(d.minimum_value,0)
               OR v.policy_value::numeric>coalesce(d.maximum_value,2147483647) ELSE true END))
    ) THEN
        RAISE EXCEPTION 'Thiếu chính sách trong catalog của loại hình hoặc giá trị chính sách không hợp lệ';
    END IF;
    IF EXISTS (
        SELECT 1 FROM hs_seed_rows s JOIN listings l ON l.id=s.listing_id::text
        WHERE l.available_from IS NULL OR l.payment_cycle IS NULL OR l.minimum_lease_months<1
           OR (l.deposit_type='MONTH_COUNT' AND (l.deposit_months IS NULL OR l.deposit_months<1))
           OR (l.deposit_type='FIXED_AMOUNT' AND (l.deposit_amount IS NULL OR l.deposit_amount<=0))
           OR NOT EXISTS (SELECT 1 FROM listing_viewing_days d WHERE d.listing_id=l.id)
           OR NOT EXISTS (SELECT 1 FROM listing_viewing_slots v WHERE v.listing_id=l.id)
           OR (SELECT count(*) FROM listing_media m WHERE m.listing_id=l.id AND m.active IS TRUE)<>3
           OR (SELECT count(*) FROM listing_media m WHERE m.listing_id=l.id AND m.active IS TRUE AND m.is_cover)<>1
           OR NOT EXISTS (SELECT 1 FROM listing_custom_amenities a WHERE a.listing_id=l.id AND nullif(btrim(a.name),'') IS NOT NULL)
    ) THEN
        RAISE EXCEPTION 'Thiếu điều kiện thuê, lịch xem nhà, 3 ảnh/ảnh bìa hoặc tiện ích tùy chỉnh';
    END IF;
END $$;

SELECT category, status, count(*) AS listing_count
FROM listings WHERE id IN (SELECT listing_id::text FROM hs_seed_rows)
GROUP BY category, status ORDER BY category;

SELECT s.category,s.furnishing_status,count(DISTINCT s.listing_id) AS listings,
       count(f.id) AS handover_assets
FROM hs_seed_rows s LEFT JOIN listing_furnishing_assets f ON f.listing_id=s.listing_id::text
GROUP BY s.category,s.furnishing_status ORDER BY s.category,s.furnishing_status;

SELECT count(DISTINCT province_code) AS province_count,
       count(DISTINCT ward_code) AS ward_count,
       count(*) AS seeded_listing_count
FROM hs_seed_rows;

SELECT location_label, count(*) AS added_listing_count
FROM hs_seed_rows WHERE n > 2520
GROUP BY location_label ORDER BY location_label;

COMMIT;
