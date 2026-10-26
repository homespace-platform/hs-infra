# HomeSpace Infra

Thư mục hạ tầng: `D:\Workspace\homespace\hs-infra`. Các service khác nằm cùng cấp trong workspace.

## Chạy Docker

```powershell
cd D:\Workspace\homespace\hs-infra
docker compose -f docker-infra.yml up -d --wait
docker compose -f docker-obs.yml up -d
```

Lệnh thứ hai chạy các công cụ pgAdmin, RedisInsight và Kafka UI sau khi hạ tầng đã sẵn sàng. Các đường dẫn volume tương đối được tính từ thư mục `hs-infra`. Volume dữ liệu và network đã có tên cố định trong Compose.

Từ `hs-ai-service`, lệnh tương ứng để chạy PostgreSQL AI và MongoDB:

```powershell
docker compose -f ..\hs-infra\docker-infra.yml up -d postgres-ai mongodb
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
