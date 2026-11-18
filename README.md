# HomeSpace Infra

Thư mục hạ tầng: `D:\Workspace\homespace\hs-infra`. Các service khác nằm cùng cấp trong workspace.

## Chạy Docker

```powershell
cd D:\Workspace\homespace\hs-infra
docker compose up -d --wait
```

`docker-compose.yml` chạy local với đủ hạ tầng, pgAdmin, RedisInsight và Kafka UI. Điền `.env` theo `.env.example` trước khi chạy. Các cổng local lắng nghe trên `127.0.0.1`, volume dùng tên cố định để tiếp tục sử dụng dữ liệu đã có. Chỉ cần một phần thì nêu tên service, ví dụ `docker compose up -d postgres mongodb`.

`compose.production.yml` chạy production với cùng 11 service. Trên Dokploy, chọn `./compose.production.yml` và dán nội dung `.env.dokploy` vào tab **Environment**. Xem [hướng dẫn Dokploy](deploy/dokploy.md#deploy-hạ-tầng-trước).

```powershell
docker compose --env-file .env.dokploy -f compose.production.yml config --quiet
docker compose --env-file .env.dokploy -f compose.production.yml up -d --wait
```

Khi cập nhật cấu hình topic trên Kafka đã có dữ liệu, chạy lại bước khởi tạo sau khi broker sẵn sàng:

```powershell
docker compose run --rm --no-deps kafka-topics
```

Lệnh này tạo các topic còn thiếu bằng `--if-not-exists`, gồm `KAFKA_NEWS_TOPIC` (mặc định `homespace.news.events.v1`) và `KAFKA_NEWS_DLT_TOPIC` (mặc định `homespace.news.events.dlt.v1`), mỗi topic có 1 partition, 1 replica, không cần reset volume. Triển khai Core consumer của topic news trước khi đổi News sang `KAFKA_NEWS_TOPIC`; Core mở rộng người nhận và gửi sang topic notification hiện có. DLT riêng lưu lỗi sự kiện nguồn do Core xử lý.

**Backlog từ deployment News cũ:** News có thể đã gửi `NEWS_PUBLISHED` với `recipients: []` vào topic notification và đánh dấu `publicationSentAt`; đổi cấu hình không tự gửi lại các bản ghi này.

1. Xác định đúng các source record cũ còn được Kafka giữ lại (hoặc bản sao lưu nguyên gốc), theo khoảng triển khai và tọa độ topic/partition/offset. Chỉ chọn `NEWS_PUBLISHED` có `recipients: []`; DLT chỉ chứa tọa độ/hash, không chứa payload để replay.
2. Sau khi cả Core consumer và notification consumer mới sẵn sàng, operator được cấp quyền dùng Kafka UI hoặc broker producer đã được duyệt để gửi nguyên envelope sang `KAFKA_NEWS_TOPIC`, key là `data.newsId`. Giữ nguyên `eventId: news_<newsId>`, `occurredAt`, `recipients: []` và `data` (kể cả slug cũ). Script `hs-notification-service/scripts/kafka-publish.cjs` dùng validator của notification đích, nên không dùng cho source envelope có người nhận rỗng.
3. Kiểm tra consumer lag, DLT và feed sau replay. Giữ nguyên `eventId` giúp deduplicate các người nhận đã có thông báo theo `(recipientId, sourceEventId)`; Core chọn người dùng đang active lúc replay, không tái tạo audience lịch sử. Không reset Kafka offsets hay xóa hàng loạt `publicationSentAt` của bài cũ: thao tác đó có thể gửi lại tin lịch sử hoặc dùng slug đã đổi. Nếu source record đã hết retention và không có bản sao nguyên gốc, cần đối soát thủ công; không tự dựng lại từ trạng thái bài hiện tại.

Từ `hs-ai-service`, lệnh tương ứng để chạy PostgreSQL AI và MongoDB:

```powershell
docker compose -f ..\hs-infra\docker-compose.yml up -d postgres-ai mongodb
```

## Kiểm tra seed và tài liệu test

Chạy từ thư mục `hs-infra`:

```powershell
node scripts/build-listings-seed.mjs --check
node --test scripts/build-listings-seed.test.mjs
node scripts/validate-ai-listing-questions.mjs
node scripts/validate-vietmap-poi-postman.mjs
```

Các lệnh kiểm tra trên không chạy seed vào CSDL. Hướng dẫn seed: [postgres/seed/README.md](postgres/seed/README.md). Hướng dẫn hợp đồng cọc: [documents/DEPOSIT_AGREEMENT_ADMIN_GUIDE.md](documents/DEPOSIT_AGREEMENT_ADMIN_GUIDE.md).
