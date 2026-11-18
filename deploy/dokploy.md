# Triển khai HomeSpace trên Vercel, AWS EC2 và Dokploy

Hai frontend chạy trên Vercel. Backend, Keycloak và hạ tầng dữ liệu chạy trên một EC2 do Dokploy quản lý. GitHub Actions build image và đẩy lên Docker Hub. Dokploy đọc phiên bản image từ `hs-infra` và pull image đã build.

Triển khai hạ tầng và công cụ giám sát bằng [`compose.production.yml`](../compose.production.yml). Chạy local bằng [`docker-compose.yml`](../docker-compose.yml) với `.env`, chạy production dùng `.env.dokploy`. Cả hai file có đủ 11 service. Hai tệp [`Dockerfile.keycloak`](../Dockerfile.keycloak) và [workflow Keycloak](../.github/workflows/publish-keycloak.yml) đóng gói realm, theme và provider để publish qua Docker Hub. Sau khi hạ tầng đạt kiểm tra, bổ sung image backend vào cùng Compose service rồi deploy hai frontend.

**Trình tự:** [Tạo EC2 và DNS](#1-chọn-ec2-và-chuẩn-bị-dns) → [Cài Dokploy](#2-cài-dokploy) → [Build và publish image](#3-publish-image-lên-docker-hub) → [Deploy backend](#4-cấu-hình-backend-trong-docker-compose) → [Deploy Vercel](#5-deploy-frontend-trên-vercel) → [Kiểm thử và đưa vào sử dụng](#6-kiểm-tra-trước-khi-mở-truy-cập).

## 1. Chọn EC2 và chuẩn bị DNS

### Tạo instance trong AWS Console

1. Đăng nhập AWS Console. Ở bộ chọn Region góc trên bên phải, chọn **Asia Pacific (Singapore)** (`ap-southeast-1`). Vào **EC2 → Instances → Launch instances**.
2. Trong **Name and tags**, nhập `homespace-production`. Trong **Application and OS Images (Amazon Machine Image)**, chọn **Ubuntu Server 24.04 LTS**, nhà phát hành **Canonical**, kiến trúc **64-bit (x86)**.
3. Trong **Instance type**, tìm **`m7i-flex.xlarge` (4 vCPU, 16 GiB RAM)** để chạy toàn bộ stack trên một máy. Nếu dựng thử với tải thấp, chọn **`m7i-flex.large` (2 vCPU, 8 GiB)**. Với 8 GiB, đo RAM và số lần restart khi chạy đủ service, tạo PDF và deploy lại. Có thể dừng instance rồi đổi loại máy nếu cần thêm tài nguyên.
4. Trong **Key pair (login)**, chọn **Create new key pair**. Đặt tên `homespace-ec2`, chọn **RSA**, định dạng **`.pem`** cho OpenSSH, rồi lưu tệp tải về. Dùng cùng key này ở bước SSH.
5. Trong **Network settings → Edit**, chọn default VPC nếu đang dùng mạng mặc định. Chọn subnet công khai và đặt **Auto-assign public IP → Enable**. Với VPC tự tạo, đối chiếu trong **VPC → Subnets → Route table** rằng subnet có tuyến `0.0.0.0/0` đến Internet Gateway.
6. Tại **Firewall (security groups)**, chọn **Create security group**, đặt tên `homespace-ec2-sg`. Thêm đúng các inbound bên dưới. Giữ outbound mặc định để tải image và kết nối các nhà cung cấp qua HTTPS.

| Type | Port | Source |
| --- | --- | --- |
| SSH | `22` | **My IP** (`/32`) |
| HTTP | `80` | `0.0.0.0/0` |
| HTTPS | `443` | `0.0.0.0/0` |

7. Trong **Configure storage**, sửa root volume thành **100 GiB**, type **gp3**, bật **Encrypted**. Giữ cổng quản trị `3000`, database, Kafka, Eureka và các cổng service nội bộ ở mạng riêng.
8. Trong **Advanced details → Metadata options**, đặt **IMDSv2** thành **Required** nếu tùy chọn xuất hiện. Kiểm tra lại AMI, cấu hình máy và tổng chi phí dự kiến trong **Summary**, sau đó chọn **Launch instance → View all instances**. Chọn instance vừa tạo, chờ trạng thái `Running` và các **Status checks** đều qua.

### Gắn Elastic IP

1. Trong menu EC2, chọn **Network & Security → Elastic IPs → Allocate Elastic IP address**. Dùng địa chỉ từ pool Amazon, chọn **Allocate**.
2. Chọn IP vừa tạo, vào **Actions → Associate Elastic IP address**. Chọn **Resource type → Instance**, chọn `homespace-production`, chọn private IP chính của instance và bấm **Associate**.
3. Quay lại **Instances → homespace-production → Details**, kiểm tra **Public IPv4 address** đã là Elastic IP. Ghi lại giá trị này cho các chỗ có `ELASTIC_IP` ở dưới. AWS tính phí public IPv4.

[Tạo EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-launch-parameters.html) · [Thông số M7i](https://aws.amazon.com/ec2/instance-types/m7i/) · [Đổi loại instance](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/change-instance-type-of-ebs-backed-instance.html) · [Elastic IP](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html)

### Tạo DNS cho backend

| Subdomain | DNS | Đích |
| --- | --- | --- |
| `homespace.nvminh162.id.vn` | Bản ghi Vercel cung cấp | `hs-web-app` |
| `homespace-admin.nvminh162.id.vn` | Bản ghi Vercel cung cấp | `hs-admin-portal` |
| `homespace-api.nvminh162.id.vn` | `A` → Elastic IP | Gateway, cổng container `8080`, path `/` |
| `homespace-auth.nvminh162.id.vn` | `A` → Elastic IP | Keycloak, cổng container `8080`, path `/` |
| `homespace-notify.nvminh162.id.vn` | `A` → Elastic IP | Notification, cổng container `8085`, path `/socket.io` |
| `homespace-dokploy.nvminh162.id.vn` | `A` → Elastic IP | Trang quản trị Dokploy và điểm nhận webhook GitHub qua HTTPS |

1. Đăng nhập trang quản lý DNS của `nvminh162.id.vn` và mở zone của domain này. Dùng **Add record** bốn lần cho `homespace-api`, `homespace-auth`, `homespace-notify`, `homespace-dokploy`.
2. Mỗi bản ghi đặt **Type `A`**, **Name** là tên tương đối bên trên, **Value** là Elastic IP, **TTL** khoảng 300 giây nếu nhà cung cấp cho chọn. Nếu DNS đang dùng Cloudflare, chọn **DNS only** trong lần thiết lập HTTPS đầu tiên. Hai bản ghi Vercel làm ở bước 5 sau khi có target chính xác.
3. Trên Windows PowerShell, kiểm tra bốn host đều trả về đúng IP. Nếu vừa sửa một bản ghi cũ, đợi cache hết hạn và kiểm tra lại.

   ```powershell
   'api','auth','notify','dokploy' | ForEach-Object {
       Resolve-DnsName "homespace-$_.nvminh162.id.vn" -Type A |
           Select-Object Name, IPAddress
   }
   ```

**Kết quả cần thấy:** EC2 `Running`, trạng thái kiểm tra đạt, bốn bản ghi backend trỏ cùng Elastic IP. [Thiết lập domain trên Vercel](https://vercel.com/docs/domains/set-up-custom-domain)

## 2. Cài Dokploy

1. Từ PowerShell trên máy cá nhân, SSH bằng tệp `.pem` tải về. Đổi giá trị IP và đường dẫn tệp theo máy bạn.

   ```powershell
   $ec2Ip = 'THAY_BANG_ELASTIC_IP'
   $keyPath = "$env:USERPROFILE\Downloads\homespace-ec2.pem"
   ssh -i $keyPath "ubuntu@$ec2Ip"
   ```

   Nếu SSH timeout, kiểm tra IP đang dùng, rule TCP `22` trong Security Group và public route của subnet. Nếu báo sai quyền key, kiểm tra rule quyền truy cập file `.pem` trên Windows và dùng user `ubuntu` của AMI.
2. Trên EC2, kiểm tra dung lượng và cài Dokploy bằng trình cài chính thức. Kiểm tra Docker Swarm và các service sau khi trình cài kết thúc.

   ```bash
   df -h /
   free -h
   curl -fsSL https://dokploy.com/install.sh | sudo sh
   sudo docker service ls
   sudo docker ps
   ```

3. Mở PowerShell thứ hai trên máy cá nhân để truy cập lần đầu qua SSH tunnel. Giữ cửa sổ này mở khi đăng nhập bằng `127.0.0.1`.

   ```powershell
   $ec2Ip = 'THAY_BANG_ELASTIC_IP'
   $keyPath = "$env:USERPROFILE\Downloads\homespace-ec2.pem"
   ssh -i $keyPath -N -L 3300:127.0.0.1:3000 "ubuntu@$ec2Ip"
   ```

4. Mở `http://127.0.0.1:3300`, tạo tài khoản quản trị và bật 2FA hoặc passkey.
5. Khi DNS `homespace-dokploy.nvminh162.id.vn` đã trỏ đúng, vào **Settings → Web Server → Server Domain**. Điền `homespace-dokploy.nvminh162.id.vn`, bật **HTTPS**, chọn **Let's Encrypt** và lưu. Mở domain HTTPS trong trình duyệt và thử đăng nhập lại trước khi đóng tunnel. GitHub cần gọi được webhook từ Internet. Giữ cổng `3000` riêng tư trong Security Group.
6. Tại **Settings → Git → GitHub**, thêm kết nối GitHub App, làm theo nút tạo app rồi **Install** trên tài khoản hoặc organization sở hữu `hs-infra`. Chọn **Only select repositories** và cấp quyền cho `hs-infra`. Quay lại Dokploy, xác nhận thấy repo trong danh sách. Luồng publish image bên GitHub Actions dùng quyền của từng repo, nên GitHub App của Dokploy chỉ cần repo chứa Compose.

**Kết quả cần thấy:** mở được `https://homespace-dokploy.nvminh162.id.vn`, đăng nhập được và Dokploy thấy repo `hs-infra`.

## Deploy hạ tầng trước

1. Trong Docker Hub, tạo private repo **`homespace-keycloak`**. Trong GitHub repo `hs-infra` → **Settings → Secrets and variables → Actions**, thêm `DOCKERHUB_USERNAME=nvminh162` và `DOCKERHUB_TOKEN` có quyền push vào repository đó. Thêm registry Docker Hub trong Dokploy bằng token pull riêng.
2. Hoàn thành cấu hình Dokploy và secrets ở phần **Tự động deploy sau khi publish image** trước khi push workflow mới lên `master`. Workflow có hai job liên tiếp `publish` và `deploy`. Image được đẩy cả tag Git SHA và `latest` trước khi Dokploy nhận yêu cầu triển khai.
3. Mở `.env.dokploy` trên máy cá nhân. Kiểm tra `KEYCLOAK_IMAGE=nvminh162/homespace-keycloak:latest` và `PGADMIN_DEFAULT_EMAIL=zolaracskh@gmail.com`. Luồng tự động cập nhật Keycloak dùng tag `latest`. Nếu phải tạo file trên một checkout mới, dùng `.env.example` làm mẫu, đặt mật khẩu production riêng, `KEYCLOAK_HOSTNAME=https://homespace-auth.nvminh162.id.vn`, `KEYCLOAK_HOSTNAME_STRICT=true` và tạo `KAFKA_CLUSTER_ID` bằng lệnh sau. Giữ nguyên ID và credential theo volume đang dùng khi redeploy.

   ```bash
   sudo docker run --rm --entrypoint /opt/kafka/bin/kafka-storage.sh apache/kafka:4.3.1 random-uuid
   ```

4. Trong Dokploy, vào **Projects → Create Project**, đặt tên `HomeSpace`. Trong project chọn **Create Service → Docker Compose**, đặt tên `homespace-infra`. Chọn **Git → Repository URL `https://github.com/homespace-platform/hs-infra.git` → Branch `master`**, Compose Path `./compose.production.yml`, loại **Docker Compose**. Hoàn tất Environment và Domains trước khi bật Autodeploy ở phần webhook bên dưới.
5. Mở tab **Environment** của Compose, dán nội dung `.env.dokploy` rồi lưu. File này chứa credential và được Git bỏ qua. Kiểm tra biến và cú pháp từ gốc repo bằng `docker compose --env-file .env.dokploy -f compose.production.yml config --quiet`.

6. Trước lần chạy đầu, tạo DNS `A` cho `homespace-auth.nvminh162.id.vn` trỏ tới IPv4 công khai của EC2. Trong **General → Preview Compose**, kiểm tra file production có đủ 11 service. Trong **Domains**, thêm `homespace-auth.nvminh162.id.vn` → service `keycloak` → **Container Port `8080`**, Path `/`, bật HTTPS và chọn Let's Encrypt. Lưu toàn bộ thiết lập, sau đó hoàn thành phần auto deploy bên dưới để pipeline khởi chạy lần đầu. `postgres`, `postgres-ai`, `mongodb`, `redis`, `gotenberg`, `kafka` và `keycloak` cần chạy `healthy`. `kafka-topics` hoàn thành với `Exited (0)`, còn `pgadmin`, `redis-insight` và `kafka-ui` ở trạng thái `running`.
7. Gọi OIDC discovery bên dưới và kiểm tra issuer kết thúc bằng `/realms/homespace-platform`. Mở Keycloak Admin Console và cấu hình redirect URI và Web Origins production theo mục **Keycloak và HTTPS**. Nếu bật Google login, điền client secret thật trong Keycloak production vì realm export mang giá trị đã che. Tài khoản quản trị Keycloak ở bước này phục vụ quản lý realm. Tài khoản admin ứng dụng sẽ được Core bootstrap khi deploy Core.

   ```powershell
   curl.exe -fsS 'https://homespace-auth.nvminh162.id.vn/realms/homespace-platform/.well-known/openid-configuration'
   ```

### Tự động deploy sau khi publish image

Workflow [publish-keycloak.yml](../.github/workflows/publish-keycloak.yml) gọi webhook Compose của Dokploy sau khi job push image thành công. GitHub Actions sẽ khởi chạy lượt deploy đầu tiên sau khi bạn hoàn thành thiết lập và push workflow lên `master`.

1. Trong Dokploy → Compose `homespace-infra` → **Deployments**, copy toàn bộ **Webhook URL**. URL có dạng `https://homespace-dokploy.nvminh162.id.vn/api/deploy/compose/TOKEN`.
2. Trong [Repository Actions secrets của hs-infra](https://github.com/homespace-platform/hs-infra/settings/secrets/actions), tạo secret **`DOKPLOY_DEPLOY_WEBHOOK`** và dán URL vừa copy vào giá trị. Token nằm trong URL, nên giữ URL này trong GitHub secret.
3. Trong **General**, giữ provider **Git**, branch `master`, **Watch Paths trống**, sau đó bật **Autodeploy**. Lưu Environment và Domains trước khi thực hiện bước này. Pipeline gửi webhook với header `X-GitHub-Event: push` và payload `ref=refs/heads/master` sau khi image sẵn sàng. Các thay đổi Git ở repo được triển khai thông qua lượt workflow này.
4. Sau khi cấu hình env, DNS, domain và GitHub secrets đã lưu, push workflow lên `master`. Mở **Actions → Publish Keycloak image**, theo dõi `publish` rồi `deploy`. Job `deploy` thành công nghĩa là Dokploy đã nhận yêu cầu. Mở **Compose → Deployments → lượt mới nhất** và **Containers** để xác nhận kết quả runtime.
5. Những lần sửa provider JAR, theme, realm hoặc Dockerfile Keycloak sau này trên `master` sẽ tự publish rồi deploy. Có thể chọn **Actions → Publish Keycloak image → Run workflow → master** để chạy thủ công toàn bộ pipeline. Với thay đổi Compose độc lập, lưu commit trên `master` rồi chạy pipeline thủ công hoặc chọn Deploy trong Dokploy.

Source **Git** của Compose trên Dokploy v0.31.4 kiểm tra branch của webhook. Payload Docker Hub gửi thông tin tag image nên sẽ bị từ chối với `Branch Not Match` khi gọi trực tiếp endpoint này. GitHub Actions gửi payload branch phù hợp sau khi publish. Để cấu hình Docker Hub **Webhooks** trống cho luồng triển khai này.

Các named volumes tiếp tục được sử dụng khi webhook kích hoạt deploy. Khi cần quay về image cũ, điền tag SHA trước đó vào `KEYCLOAK_IMAGE` trong Dokploy Environment rồi deploy và kiểm tra khả năng tương thích schema Keycloak.

[Dokploy Auto Deploy](https://docs.dokploy.com/docs/core/auto-deploy) · [Handler Compose webhook v0.31.4](https://github.com/Dokploy/dokploy/blob/v0.31.4/apps/dokploy/pages/api/deploy/compose/%5BrefreshToken%5D.ts)

### Mở pgAdmin, RedisInsight và Kafka UI

Ba công cụ quản trị lắng nghe trên loopback của EC2. Dùng SSH tunnel trên máy cá nhân để truy cập cả ba bằng một kết nối. Đổi tên file key và IP theo máy của bạn.

```powershell
ssh -i "$env:USERPROFILE\Downloads\homespace-ec2.pem" -N `
  -L 15050:127.0.0.1:5050 `
  -L 15540:127.0.0.1:5540 `
  -L 19022:127.0.0.1:9022 ubuntu@ELASTIC_IP
```

| Công cụ | URL qua tunnel | Kiểm tra |
| --- | --- | --- |
| pgAdmin | `http://127.0.0.1:15050` | Đăng nhập bằng `PGADMIN_DEFAULT_EMAIL` và `PGADMIN_DEFAULT_PASSWORD`. Chọn PostgreSQL Core hoặc AI đã khai báo, nhập mật khẩu tương ứng khi kết nối. |
| RedisInsight | `http://127.0.0.1:15540` | Thêm Redis database với host `redis`, port `6379`, user `default` và `REDIS_PASSWORD`. |
| Kafka UI | `http://127.0.0.1:19022` | Chọn cluster `HomeSpace` và kiểm tra các topic. |

Dùng chính Compose service `homespace-infra` cho các lần thêm backend để giữ mạng và volumes hiện có.

[Hạ tầng TeleCare tham chiếu](https://github.com/nvminh162-iuh/iuh-corporate-internship-project/tree/master/telecare-infrastructure) · [Compose trên Dokploy](https://docs.dokploy.com/docs/core/docker-compose)

[Cài Dokploy](https://docs.dokploy.com/docs/core/installation) · [Web Server Settings](https://docs.dokploy.com/docs/core/web-server) · [Bảo mật tài khoản](https://docs.dokploy.com/docs/core/account-security) · [Kết nối GitHub](https://docs.dokploy.com/docs/core/github)

## 3. Publish image lên Docker Hub

### Tạo Docker Hub repositories và quyền truy cập

1. Trong **Docker Hub → My Hub → Repositories → Create repository**, chọn namespace của bạn. Tạo các repo private bên dưới. Nếu namespace cá nhân giới hạn số private repositories, kiểm tra giới hạn của gói trước khi tạo toàn bộ.

| GitHub repo | Docker Hub repository |
| --- | --- |
| `hs-gateway-server` | `hs-gateway-server` |
| `hs-discovery-server` | `hs-discovery-server` |
| `hs-core-api` | `hs-core-api` |
| `hs-chat-service` | `hs-chat-service` |
| `hs-news-service` | `hs-news-service` |
| `hs-ai-service` | `hs-ai-service` |
| `hs-notification-service` | `hs-notification-service` |
| `hs-infra` | `homespace-keycloak` |

2. Trong **Docker Home → Account settings → Personal access tokens → Generate new token**, tạo token `homespace-github-push` có quyền Read & Write và token `homespace-dokploy-pull` có quyền Read. Lưu hai token ở nơi quản lý mật khẩu.
3. Trong từng GitHub repo trên, vào **Settings → Secrets and variables → Actions → Secrets → New repository secret**. Thêm `DOCKERHUB_USERNAME` là username đăng nhập Docker Hub và `DOCKERHUB_TOKEN` là token push. Qua tab **Variables**, thêm `DOCKERHUB_NAMESPACE` nếu namespace khác username. Với `hs-core-api`, thêm `APP_MODULE=hs-api-service`. `hs-infra` đã có workflow riêng cho Keycloak.
4. Trong Dokploy, mở **Settings → Registry → Add registry**, chọn Docker Hub. Nếu UI yêu cầu địa chỉ registry rõ ràng, dùng `docker.io`. Nhập username và token pull, lưu lại. Token này chỉ dùng để EC2 pull image private.

[Token Docker Hub](https://docs.docker.com/security/access-tokens/personal-access-tokens/) · [Registry trên Dokploy](https://docs.dokploy.com/docs/core/Docker)

### Chuẩn bị file build trong từng repo

Tạo các Dockerfile ở gốc repo tương ứng cho cấu hình bên dưới. Nếu repo đã có cách build image, giữ cách đó và đối chiếu cổng, thư mục, entrypoint. Hai frontend do Vercel tự build.

| Thành phần | Đóng gói |
| --- | --- |
| Gateway, Eureka | Java 21. Build ứng dụng Spring Boot trong mỗi repo. |
| Core API | Java 21. Build module chạy `hs-api-service` cùng các module phụ thuộc bằng `./mvnw -B -pl hs-api-service -am package`. |
| Chat, News, Notification | Dùng phiên bản Node đáp ứng `package.json`. Cài theo lockfile, build bằng `npm run build`, chạy `npm run start:prod`. |
| AI | Đóng gói theo `uv.lock`. Chạy `uv run alembic upgrade head` trước khi bật bản AI cần schema đó. |
| Keycloak | Đóng gói realm [`realm-export.json`](../keycloak/realm-export.json), các provider JAR và theme trong `hs-infra/keycloak`. Giữ provider đồng bộ sự kiện người dùng qua Kafka và provider đăng nhập điện thoại. |

Mẫu `.dockerignore` ở gốc mỗi repo giúp build context bỏ qua dependencies cục bộ, build output và `.env` chứa bí mật.

```dockerignore
**/.git
**/.env*
**/target
**/node_modules
**/dist
**/.venv
**/__pycache__
```

<details>
<summary>Dockerfile cho Gateway, Eureka và Core API</summary>

Gateway và Eureka dùng `APP_MODULE=.`. Core dùng `APP_MODULE=hs-api-service` và build từ gốc `hs-core-api` để Maven thấy đủ các module.

```dockerfile
FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /src
COPY . .
ARG APP_MODULE=.
RUN if [ "$APP_MODULE" = "." ]; then \
        sh ./mvnw -B -DskipTests package; \
    else \
        sh ./mvnw -B -DskipTests -pl "$APP_MODULE" -am package; \
    fi \
    && mkdir /out \
    && cp "$APP_MODULE"/target/*.jar /out/app.jar

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /out/app.jar /app/app.jar
USER 10001
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

Nếu Linux runner báo lỗi file `mvnw` do đầu dòng Windows, bảo đảm file trong Git dùng LF. Nếu `target` có nhiều JAR, sửa bước `cp` để lấy đúng JAR thực thi của Spring Boot. Các kiểm tra CI chạy trước bước đóng gói, theo cấu hình sẵn có của từng repo. Với Core, đối chiếu các đường dẫn template hợp đồng và file cấu hình đã khai báo trong env để chắc chắn runtime đọc được chúng.

</details>

<details>
<summary>Dockerfile cho Chat, News và Notification</summary>

```dockerfile
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
CMD ["npm", "run", "start:prod"]
```

</details>

<details>
<summary>Dockerfile cho AI</summary>

```dockerfile
FROM python:3.12-slim-bookworm
WORKDIR /app
RUN pip install --no-cache-dir uv
COPY . .
RUN uv sync --locked --no-dev
CMD ["uv", "run", "--no-sync", "uvicorn", "homespace_ai.main:app", "--app-dir", "src", "--host", "0.0.0.0", "--port", "8084"]
```

Compose dùng cùng image để chạy migration một lần trước khi AI khởi động. Đặt `AI_DATABASE_URL` trỏ đến pgvector production trước khi chạy migration.

</details>

### Chạy GitHub Actions và lấy tag

1. Tạo `.github/workflows/publish-image.yml` trong từng repo backend phát hành image. Mẫu này publish theo Git SHA. Gắn bước hoặc job test hiện có trước job publish ở repo có CI riêng. Tiếp tục dùng [workflow Keycloak sẵn có](../.github/workflows/publish-keycloak.yml) trong `hs-infra`.

   ```yaml
   name: Publish image to Docker Hub
   on:
     push:
       branches: [master]
     workflow_dispatch:
   permissions:
     contents: read
   jobs:
     publish:
       if: github.ref == 'refs/heads/master'
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: docker/setup-buildx-action@v3
         - uses: docker/login-action@v3
           with:
             username: ${{ secrets.DOCKERHUB_USERNAME }}
             password: ${{ secrets.DOCKERHUB_TOKEN }}
         - uses: docker/build-push-action@v6
           with:
             context: .
             file: ${{ vars.DOCKERFILE || 'Dockerfile' }}
             platforms: linux/amd64
             build-args: APP_MODULE=${{ vars.APP_MODULE || '.' }}
             push: true
             tags: ${{ vars.DOCKERHUB_NAMESPACE || secrets.DOCKERHUB_USERNAME }}/${{ vars.DOCKERHUB_IMAGE || github.event.repository.name }}:${{ github.sha }}
   ```

2. Đưa Dockerfile và workflow lên `master` theo quy trình Git của repo. Trong **Actions → Publish image to Docker Hub**, mở run của commit. Nếu chạy thủ công, chọn **Run workflow → Branch `master`**.
3. Mở **Docker Hub → repository → Tags** và sao chép tag Git SHA xuất hiện sau run thành công. Ghi lại từng cặp tên image và tag để đưa vào Compose.
4. Nếu Actions báo `denied`, kiểm tra đúng namespace, tên repository và quyền Write của token. Nếu Dokploy báo `pull access denied`, kiểm tra quyền Read của token trong Dokploy và tag đã xuất hiện trước khi deploy.

**Kết quả cần thấy:** Docker Hub có tám image với tag SHA dùng cho bản deploy đầu tiên.

TeleCare dùng Maven Jib để publish backend và workflow riêng để build Keycloak. Có thể lấy cách tách workflow đó cho HomeSpace. Dùng bộ lọc path cho workflow Keycloak để commit đổi tag release trong `hs-infra` chỉ kích hoạt deploy. [Workflow backend TeleCare](https://github.com/nvminh162-iuh/iuh-corporate-internship-project/blob/master/.github/workflows/deploy.yml) · [Workflow Keycloak TeleCare](https://github.com/nvminh162-iuh/iuh-corporate-internship-project/blob/master/.github/workflows/build-keycloak-image.yml) · [Docker và GitHub Actions](https://docs.docker.com/build/ci/github-actions/)

## 4. Cấu hình backend trong Docker Compose

### Bổ sung backend vào Compose production

Mở [`compose.production.yml`](../compose.production.yml) đang dùng cho infra. Giữ các service hạ tầng, công cụ giám sát và named volume. Kafka quảng bá `kafka:19092` trong mạng riêng. PostgreSQL dùng [`postgres/init/01-create-databases.sql`](../postgres/init/01-create-databases.sql) để tạo `homespace_core` trên volume mới. Keycloak dùng image đã publish trong `KEYCLOAK_IMAGE` và chờ database cùng Kafka topic.

Thêm các service ứng dụng bên dưới vào cùng `services:`. Thay `DOCKERHUB_NAMESPACE` và từng `SHA_*` bằng namespace và tag thực tế. Chèn map `environment` theo bước kế tiếp. Giữ `hs-network` trong phần `networks:` cuối file. Dùng `${VAR:?missing VAR}` cho biến cần giá trị và `${VAR?missing VAR}` cho biến có thể để trống có chủ đích.

<details>
<summary>Các service ứng dụng cần thêm vào Compose</summary>

Dán phần này vào cuối `services:` của file production, ngay trước `volumes:` cấp gốc. Các service con thụt bốn dấu cách, cùng cấp với `postgres`. Các tên này cũng là hostname dùng trong bảng env.

```yaml
    discovery:
      image: docker.io/DOCKERHUB_NAMESPACE/hs-discovery-server:SHA_DISCOVERY
      restart: unless-stopped
      networks: [hs-network]

    gateway:
      image: docker.io/DOCKERHUB_NAMESPACE/hs-gateway-server:SHA_GATEWAY
      restart: unless-stopped
      depends_on:
        discovery: { condition: service_started }
        redis: { condition: service_healthy }
      networks: [hs-network]

    core:
      image: docker.io/DOCKERHUB_NAMESPACE/hs-core-api:SHA_CORE
      restart: unless-stopped
      depends_on:
        discovery: { condition: service_started }
        postgres: { condition: service_healthy }
        mongodb: { condition: service_healthy }
        redis: { condition: service_healthy }
        keycloak: { condition: service_healthy }
        kafka-topics: { condition: service_completed_successfully }
      networks: [hs-network]

    chat:
      image: docker.io/DOCKERHUB_NAMESPACE/hs-chat-service:SHA_CHAT
      restart: unless-stopped
      depends_on:
        mongodb: { condition: service_healthy }
        kafka-topics: { condition: service_completed_successfully }
      networks: [hs-network]

    news:
      image: docker.io/DOCKERHUB_NAMESPACE/hs-news-service:SHA_NEWS
      restart: unless-stopped
      depends_on:
        mongodb: { condition: service_healthy }
        kafka-topics: { condition: service_completed_successfully }
      networks: [hs-network]

    notification:
      image: docker.io/DOCKERHUB_NAMESPACE/hs-notification-service:SHA_NOTIFICATION
      restart: unless-stopped
      depends_on:
        mongodb: { condition: service_healthy }
        kafka-topics: { condition: service_completed_successfully }
      networks: [hs-network]

    ai-migrate:
      image: &ai-image docker.io/DOCKERHUB_NAMESPACE/hs-ai-service:SHA_AI
      restart: 'no'
      command: ['uv', 'run', '--no-sync', 'alembic', 'upgrade', 'head']
      environment: &ai-env
        AI_DATABASE_URL: '${HS_AI_AI_DATABASE_URL:?missing HS_AI_AI_DATABASE_URL}'
        # Thêm map env cho AI rồi giữ anchor &ai-env để service ai dùng chung.
      depends_on:
        postgres-ai: { condition: service_healthy }
      networks: [hs-network]

    ai:
      image: *ai-image
      restart: unless-stopped
      environment: *ai-env
      depends_on:
        ai-migrate: { condition: service_completed_successfully }
        mongodb: { condition: service_healthy }
      networks: [hs-network]
```

</details>

### Tạo danh sách biến và truyền vào đúng container

Dùng một mục **Environment** của Dokploy cho Compose. Đặt prefix cho biến ứng dụng để các repo có cùng tên biến vẫn dùng được giá trị riêng. Ví dụ `HS_CHAT_MONGODB_URI` và `HS_NEWS_MONGODB_URI` đi vào hai container với cùng tên `MONGODB_URI`. Các biến hạ tầng như `POSTGRES_PASSWORD` giữ nguyên nếu Compose production đang tham chiếu trực tiếp.

1. Mở `.env.example` ở gốc từng repo. Với Gateway, Core, Chat, News, Notification và AI, lần lượt dùng prefix `HS_GATEWAY`, `HS_CORE`, `HS_CHAT`, `HS_NEWS`, `HS_NOTIFICATION`, `HS_AI`. Eureka trong workspace hiện dùng cấu hình từ `application.properties` và có thể bắt đầu với service `discovery` ở trên.
2. Dưới từng service trong YAML, thêm map `environment:`. Ví dụ minh họa với hai giá trị dưới `chat`.

   ```yaml
           environment:
               PORT: '${HS_CHAT_PORT:?missing HS_CHAT_PORT}'
               MONGODB_URI: '${HS_CHAT_MONGODB_URI:?missing HS_CHAT_MONGODB_URI}'
   ```

3. Để lấy danh sách mapping nhanh, chạy đoạn dưới bằng **PowerShell từ `D:\Workspace\homespace`**. Các lệnh chỉ đọc tên biến từ `.env.example`. Đổi `$repo` và `$prefix` cho service tiếp theo. Copy dòng kết quả vào dưới `environment:` của đúng service. Với AI đặt các dòng dưới `environment: &ai-env` của `ai-migrate`, giữ một dòng cho mỗi key. Sau đó dùng `:?` cho biến cần giá trị và luôn điền các biến cần thiết theo validator của ứng dụng.

   ```powershell
   $repo = 'hs-chat-service'
   $prefix = 'HS_CHAT'
   Get-Content "$repo/.env.example" | ForEach-Object {
       if ($_ -match '^([A-Z][A-Z0-9_]*)=') {
           $key = $Matches[1]
           $composeKey = "${prefix}_${key}"
           '            ' + $key + ': "${' + $composeKey + '?missing ' + $composeKey + '}"'
       }
   }
   ```

4. Trong Dokploy, lưu các giá trị tương ứng bằng định dạng `KEY=value`. Ví dụ `HS_CHAT_PORT=8082` và `HS_CHAT_EUREKA_INSTANCE_HOSTNAME=chat`. Với Core, khai báo `HS_CORE_HOMESPACE_TIME_SIMULATED_AT=` để dùng giờ thực. Nếu chưa dùng webhook tùy chọn của SmartCA, vẫn khai báo `HS_CORE_SMARTCA_WEBHOOK_PUBLIC_URL=`. Compose map hai biến này qua cú pháp `?` để nhận giá trị rỗng có chủ đích.
5. Kiểm tra các credential và URL theo bảng bên dưới. Đối chiếu tên biến trong source khi khác giữa các repo. Sử dụng cùng giá trị khi Gateway và service yêu cầu chung một internal secret. Giữ các giá trị bí mật trong Dokploy và mật khẩu sản xuất trong trình quản lý mật khẩu. Các file Git chỉ chứa biểu thức tham chiếu biến.

[Docker Compose trong Dokploy](https://docs.dokploy.com/docs/core/docker-compose) · [Nội suy biến Compose](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/) · [Mạng và tên service Docker](https://docs.docker.com/compose/how-tos/networking/) · [Thứ tự khởi động Compose](https://docs.docker.com/compose/how-tos/startup-order/)

### Cấu hình kết nối chính

Các hostname nội bộ dưới đây giả định đặt tên service trong Compose tương ứng. Cấu hình những biến này trong từng service sử dụng chúng.

| Biến hoặc kết nối | Giá trị production |
| --- | --- |
| `DATASOURCE_URL` của Core | `jdbc:postgresql://postgres:5432/homespace_core` |
| `AI_DATABASE_URL` | PostgreSQL/pgvector qua `postgres-ai:5432`, với driver `postgresql+asyncpg` và credential của AI |
| `EUREKA_CLIENT_SERVICE_URL` | `http://discovery:8761/eureka` |
| `EUREKA_INSTANCE_HOSTNAME` của Chat, News, Notification và AI | Tương ứng `chat`, `news`, `notification`, `ai` |
| `PORT` của Chat, News, AI và Notification | Tương ứng `8082`, `8083`, `8084`, `8085` |
| `KAFKA_BOOTSTRAP_SERVERS` của Core, `KAFKA_BROKERS` của các consumer | `kafka:19092` |
| `KEYCLOAK_KAFKA_TOPIC`, `KAFKA_EVENTS_TOPIC`, `KAFKA_DLT_TOPIC`, `KAFKA_NEWS_TOPIC`, `KAFKA_NEWS_DLT_TOPIC` | `keycloak-user-events`, `homespace.notification.events.v1`, `homespace.notification.events.dlt.v1`, `homespace.news.events.v1`, `homespace.news.events.dlt.v1`. Điền nhất quán cho producer, consumer và `kafka-topics`. |
| `REDIS_HOST` | `redis` |
| `MONGODB_URI`, `AI_MONGODB_URI` | `mongodb://USER:PASSWORD@mongodb:27017/DATABASE?authSource=AUTH_DATABASE`. Giữ database của từng service theo `.env.example`. Mã hóa ký tự đặc biệt trong thành phần username/password của URI. |
| `CONTRACT_GOTENBERG_URL` | `http://gotenberg:3000` |
| `GATEWAY_BASE_URL` của AI | `http://gateway:8080` |
| `GATEWAY_INTERNAL_SECRET` | Cùng giá trị ở Gateway và các service dùng secret nội bộ này |
| `KEYCLOAK_SERVER_URL` của Core | `https://homespace-auth.nvminh162.id.vn` |
| `JWT_ISSUER_URI` của Gateway, `KEYCLOAK_ISSUER_URL` của Notification | `https://homespace-auth.nvminh162.id.vn/realms/homespace-platform` |
| `JWT_JWK_SET_URI` của Gateway | `http://keycloak:8080/realms/homespace-platform/protocol/openid-connect/certs` |
| `CORS_ALLOWED_ORIGINS` và `NOTIFICATION_REALTIME_ORIGINS` | `https://homespace.nvminh162.id.vn,https://homespace-admin.nvminh162.id.vn` |
| `PAYMENT_PROOF_UPLOAD_PUBLIC_BASE_URL` của Core | `https://homespace-api.nvminh162.id.vn` |
| `SEPAY_RETURN_URL` của Core | `https://homespace.nvminh162.id.vn/dashboard/membership/return` nếu dùng SePay |

- **Core và Gateway:** đặt `SPRING_PROFILES_ACTIVE=prod` ở hai service. Với database Core mới, xác định cách tạo schema trước khi chọn `JPA_DDL_AUTO`. Nếu dùng Hibernate tạo schema theo cách hiện tại của dự án, sử dụng `update` có kiểm soát ở lần khởi tạo và kiểm tra schema trước khi chuyển `validate`. Với database đã có dữ liệu, sao lưu trước khi đổi schema.
- **Keycloak và tài khoản ứng dụng:** credential quản trị Keycloak dùng cho client đồng bộ của Core phải truy cập được realm. Khai báo các nhóm `BOOTSTRAP_ADMIN_*` của Core với tài khoản production khi cần bootstrap. Sau lần chạy đầu, đăng nhập tài khoản đó vào admin portal và kiểm tra user có trong Keycloak, ứng dụng và đúng quyền. Core thực hiện đồng bộ tài khoản qua Keycloak khi seed.
- **S3:** tạo bucket và cấp quyền cho đúng dịch vụ. Nếu trình duyệt upload bằng URL ký sẵn, cấu hình bucket CORS cho hai origin frontend và đúng phương thức upload. Kiểm tra đường dẫn mẫu DOCX và dịch vụ Gotenberg trước khi thử ký.
- **Firebase:** nhập credential server vào Notification, biến công khai và khóa VAPID vào Vercel theo `.env.example`. Giữ `KEYCLOAK_AUDIENCE` của Notification khớp audience trong access token phát hành từ realm.
- **VNPT eKYC, SmartCA, SePay và blockchain:** nhập cấu hình từng nhà cung cấp vào Core. Đăng ký lại origin hoặc callback HTTPS ở nhà cung cấp theo tính năng đang bật. Ví dụ SePay IPN đi qua `https://homespace-api.nvminh162.id.vn/api/v1/membership/sepay/ipn`. Với blockchain, xác nhận cặp RPC, chain ID và địa chỉ contract cùng thuộc mạng định dùng.

### Keycloak và HTTPS

- Đặt `KC_HOSTNAME=https://homespace-auth.nvminh162.id.vn`, `KC_HOSTNAME_STRICT=true`, `KC_HTTP_ENABLED=true` và `KC_PROXY_HEADERS=xforwarded`. Traefik nhận HTTPS và chuyển tiếp đến Keycloak cổng `8080`. Management health của Keycloak dùng nội bộ.
- Khi khởi tạo mới, dùng `start --import-realm` với realm và provider đã đóng gói. Với realm đã tồn tại, chỉnh client qua Keycloak Admin Console.
- Trong realm `homespace-platform`, cấu hình **Valid redirect URIs** và **Web Origins** cho hai client. Giới hạn URL redirect theo domain và kiểm tra lại URL chuyển hướng sau logout.

| Client | Valid redirect URI | Web Origin |
| --- | --- | --- |
| `homespace-id` | `https://homespace.nvminh162.id.vn/*` | `https://homespace.nvminh162.id.vn` |
| `homespace-admin-id` | `https://homespace-admin.nvminh162.id.vn/*` | `https://homespace-admin.nvminh162.id.vn` |

[Keycloak hostname](https://www.keycloak.org/server/hostname) · [Keycloak sau reverse proxy](https://www.keycloak.org/server/reverseproxy)

### Domain cho các service

1. Push `compose.production.yml` lên `master` của `hs-infra` sau khi điền đủ tag. Dùng Docker Compose service `homespace-infra` đã tạo trong project `HomeSpace`.
2. Trong **General**, kiểm tra source **Git → hs-infra → master** và **Compose Path** `./compose.production.yml`. Bật **Autodeploy** khi phần cấu hình webhook đã hoàn tất.
3. Mở **Environment**, dán các biến hạ tầng và biến có prefix từ bước trước rồi **Save**. Đối chiếu tag image và cấu hình bằng **Preview Compose** khi UI hiển thị tính năng này. Với dòng tên miền, nếu UI cần nạp service trước, deploy Compose một lần để lấy danh sách rồi thêm domain và deploy lại. Nếu Core chưa bootstrap được vì domain Auth chưa có HTTPS, xử lý domain Auth trước và redeploy Core sau khi OIDC discovery đã hoạt động.
4. Vào **Domains → Add Domain** ba lần. Nhập **Host** theo bảng, chọn service, port và path. Bật **HTTPS**, chọn chứng chỉ **Let's Encrypt**, rồi lưu từng domain.

| Host | Service | Container Port | Path | Internal Path | Strip Path |
| --- | --- | --- | --- | --- | --- |
| `homespace-api.nvminh162.id.vn` | `gateway` | `8080` | `/` | `/` | Tắt |
| `homespace-auth.nvminh162.id.vn` | `keycloak` | `8080` | `/` | `/` | Tắt |
| `homespace-notify.nvminh162.id.vn` | `notification` | `8085` | `/socket.io` | `/` | Tắt |

5. Mở **Preview Compose**. Kiểm tra cả ba service ingress có routing phù hợp và vẫn dùng chung mạng nội bộ với các service chúng gọi. Nếu bản Dokploy có tùy chọn **Isolated Deployments**, có thể dùng tùy chọn đó để Dokploy tạo mạng proxy riêng cho Compose. Kiểm tra tên service vẫn phân giải qua `hs-network` trong preview. Service nhận ingress cần nằm trên mạng Traefik, còn các database và Kafka tiếp tục dùng mạng nội bộ của Compose.

Web app dùng `NEXT_PUBLIC_NOTIFICATION_SOCKET_URL` và path `/socket.io`. Admin dùng `/api/v1/notifications/socket.io` qua Gateway. Chat cũng đi qua Gateway. Domain Notification riêng phục vụ kết nối Socket.IO của web, còn các API thông báo đi qua Gateway. [Domain Docker Compose](https://docs.dokploy.com/docs/core/docker-compose/domains)

### Deploy lần đầu và xác minh backend

1. Nếu có bản env kiểm thử riêng trên máy của bạn, kiểm tra cú pháp và nội suy trước khi chạy. Đặt file env ngoài repo. `--quiet` chỉ trả lỗi, giúp tránh in cấu hình đã nội suy ra terminal.

   ```bash
   docker compose --env-file .env.dokploy -f compose.production.yml config --quiet
   ```

2. Trong Dokploy, vào **General → Deploy** rồi mở bản deploy mới nhất ở **Deployments**. Kiểm tra log đã checkout đúng commit `hs-infra` và pull đúng tag. Sang **Logs** hoặc **Docker → Containers** để xem trạng thái runtime. Tiến trình chạy một lần như `kafka-topics` và `ai-migrate` hoàn thành với exit code `0`, còn database và backend tiếp tục `running`.
3. Kiểm tra theo thứ tự trong bảng. Khi service lỗi, xem log đúng service trước khi chạy lại.

| Chặng | Dấu hiệu thành công |
| --- | --- |
| PostgreSQL, pgvector, MongoDB, Redis | `healthy`. PostgreSQL có database `keycloak` và `homespace_core`. |
| Kafka và `kafka-topics` | Kafka `healthy`, job tạo topic `Exited (0)`. |
| Keycloak | `healthy`. Endpoint OIDC discovery bên dưới trả JSON có `issuer` đúng domain. |
| Eureka, Chat, News, Notification | Chạy ổn định, service không lặp lỗi đăng ký Eureka hoặc kết nối Kafka. |
| `ai-migrate`, AI | `ai-migrate` `Exited (0)`, AI tiếp tục chạy. |
| Core và Gateway | Health Gateway trả `UP`, API danh sách tin qua Gateway trả HTTP `200`. |

4. Từ **Windows PowerShell**, gọi các endpoint sau. `curl.exe` giúp dùng đúng chương trình curl khi có alias `curl` trong PowerShell.

   ```powershell
   curl.exe -fsS 'https://homespace-auth.nvminh162.id.vn/realms/homespace-platform/.well-known/openid-configuration'
   curl.exe -fsS 'https://homespace-api.nvminh162.id.vn/api/v1/actuator/health/readiness'
   curl.exe -fsS 'https://homespace-api.nvminh162.id.vn/api/v1/public/listings?page=1&size=1'
   ```

5. Vào Keycloak **Administration Console**, chọn realm `homespace-platform` → **Clients**. Mở từng client ở bảng Keycloak, khai báo đúng các URL production và **Save**. Trong **Settings → Access settings**, kiểm tra **Root URL**, **Home URL** và **Valid post logout redirect URIs** đang trỏ đúng frontend tương ứng nếu những mục này có giá trị. Nếu dùng Google, trong Google Cloud Console đăng ký đúng redirect URI do **Identity providers → Google** của Keycloak production hiển thị. Kiểm tra cả provider đăng nhập điện thoại nếu được bật.

**Kết quả cần thấy:** OIDC discovery trả issuer đúng domain, Gateway và Core đều truy cập được qua HTTPS. Lúc này mới dùng các endpoint production trong Vercel.

### Cập nhật sau lần deploy đầu

Keycloak dùng pipeline ở mục **Tự động deploy sau khi publish image**. Giữ Autodeploy của Compose bật để endpoint nhận webhook từ job `deploy`. Khi cập nhật tag backend trong `compose.production.yml`, lưu cùng một commit release cho các service cần đi cùng nhau, sau đó kích hoạt triển khai và đối chiếu log trong Dokploy. Nếu cần rollback, chọn tag trước đó và kiểm tra khả năng tương thích schema trước khi deploy lại.

## 5. Deploy frontend trên Vercel

### Chuẩn bị admin portal

Admin dùng `BrowserRouter`. Nếu repo chưa có SPA rewrite, thêm `vercel.json` ở gốc `hs-admin-portal` rồi đưa lên `master`. Cấu hình này giúp truy cập trực tiếp URL như `/settings/account-security`.

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Import và cấu hình hai project

1. Đăng nhập Vercel, chọn team cần deploy → **Add New → Project**. Nếu `hs-web-app` và `hs-admin-portal` là private trong GitHub organization, cần Vercel Pro để kết nối trực tiếp. Trong **Import Git Repository**, chọn **Adjust GitHub App Permissions** nếu thiếu repo, cấp quyền cho đúng hai repo rồi quay lại Vercel.
2. Chọn **Import** cho `hs-web-app`. Đặt **Project Name** `homespace-web`, **Framework Preset** `Next.js`, **Root Directory** `.`. Giữ build và output mặc định của Next.js. Trong phần **Environment Variables** ở màn hình import, điền các biến web từ bảng bên dưới rồi chọn **Deploy**.
3. Tạo project thứ hai cho `hs-admin-portal`. Đặt **Project Name** `homespace-admin`, **Framework Preset** `Vite`, **Root Directory** `.`. Dùng build command `npm run build` và output directory `dist` nếu Vercel yêu cầu nhập. Điền các biến admin rồi chọn **Deploy**.
4. Trong từng project, mở **Settings** và kiểm tra **Production Branch** là `master` ở phần cấu hình Git hoặc Production Environment. Kiểm tra Node version tương thích với `package.json` của repo. Mở **Settings → Environment Variables** để xác nhận những giá trị bên dưới nằm trong scope **Production**. Điền các biến build công khai còn lại theo `.env.example`, gồm Firebase và Vietmap nếu repo sử dụng. Nếu đã sửa env sau build, vào **Deployments → bản Production gần nhất → Redeploy**, hoặc deploy từ một commit mới.

| Project | Biến | Giá trị |
| --- | --- | --- |
| Web | `NEXT_PUBLIC_GATEWAY_BASE_URL` | `https://homespace-api.nvminh162.id.vn` |
| Web | `NEXT_PUBLIC_KEYCLOAK_BASE_URL` | `https://homespace-auth.nvminh162.id.vn` |
| Web | `NEXT_PUBLIC_KEYCLOAK_REALM` | `homespace-platform` |
| Web | `NEXT_PUBLIC_KEYCLOAK_CLIENT_ID` | `homespace-id` |
| Web | `NEXT_PUBLIC_SITE_URL` | `https://homespace.nvminh162.id.vn` |
| Web | `NEXT_PUBLIC_NOTIFICATION_SOCKET_URL` | `https://homespace-notify.nvminh162.id.vn` |
| Admin | `VITE_GATEWAY_BASE_URL` | `https://homespace-api.nvminh162.id.vn` |
| Admin | `VITE_KEYCLOAK_BASE_URL` | `https://homespace-auth.nvminh162.id.vn` |
| Admin | `VITE_KEYCLOAK_REALM` | `homespace-platform` |
| Admin | `VITE_KEYCLOAK_CLIENT_ID` | `homespace-admin-id` |
| Admin | `VITE_WEB_APP_URL` | `https://homespace.nvminh162.id.vn` |

### Gắn domain production

1. Mở project `homespace-web` → **Settings → Domains → Add Domain**. Nhập `homespace.nvminh162.id.vn`, gán domain cho **Production** và mở phần DNS instructions. Tạo bản ghi được Vercel yêu cầu trong DNS zone `nvminh162.id.vn`.
2. Làm tương tự cho project `homespace-admin` với `homespace-admin.nvminh162.id.vn`. Nếu Vercel yêu cầu TXT để xác minh quyền sở hữu, thêm đúng record host và value mà màn hình hiển thị.
3. Chờ cả hai domain báo **Valid Configuration** và HTTPS hoạt động. Dùng hai domain chính thức để kiểm tra login vì Keycloak và Gateway đã được cấu hình theo chúng.
4. Mở `https://homespace.nvminh162.id.vn` và `https://homespace-admin.nvminh162.id.vn/settings/account-security`. Kiểm tra cả trang tĩnh `/silent-check-sso.html` và `/firebase-messaging-sw.js` trên mỗi domain. Hai URL này cần trả đúng file tĩnh, gồm HTML SSO và JavaScript service worker.

**Kết quả cần thấy:** hai project có Production deployment thành công, domain riêng có HTTPS, trang con admin mở được khi dán URL trực tiếp.

[Git trên Vercel](https://vercel.com/docs/git) · [Biến môi trường](https://vercel.com/docs/environment-variables) · [SPA rewrite cho Vite](https://vercel.com/docs/frameworks/frontend/vite)

## 6. Kiểm tra trước khi mở truy cập

### Kiểm thử theo vai trò và luồng người dùng

- [ ] **Backend:** chạy lại ba lệnh ở mục **Deploy lần đầu và xác minh backend**. Gateway readiness trả `UP`, danh sách tin trả HTTP `200` qua Core, OIDC discovery trả issuer đúng domain Auth. Thử từ một mạng khác để kiểm tra đường đi công cộng.
- [ ] **Người dùng và admin:** mở hai profile trình duyệt riêng. Đăng nhập, đăng xuất, tải lại trang và hoàn thành onboarding bằng tài khoản thử. Kiểm tra người dùng thường bị từ chối ở trang hoặc API quản trị. Xác nhận tài khoản admin bootstrap có quyền phù hợp.
- [ ] **Socket.IO:** mở **DevTools → Network → WS**. Trên web, xác nhận notification socket đến `homespace-notify.nvminh162.id.vn/socket.io/`. Trên admin, xác nhận notification socket đến `homespace-api.nvminh162.id.vn/api/v1/notifications/socket.io/`. Với WebSocket upgrade, trạng thái thường là `101`. Gửi chat giữa hai tài khoản, rồi thử một nghiệp vụ có thông báo để kiểm tra realtime và Kafka. Chat vẫn dùng trạng thái chưa đọc riêng của hội thoại.
- [ ] **Hợp đồng và thanh toán:** dùng dữ liệu thử để upload tệp, tạo PDF qua Gotenberg và thử các luồng VNPT, SmartCA, SePay đang bật. Với webhook, đối chiếu kết quả trong dashboard nhà cung cấp và log backend, đồng thời xác nhận trạng thái nghiệp vụ đã cập nhật trong UI.
- [ ] **Core mất kết nối:** trên môi trường thử, kiểm tra Gateway và hai frontend khi Core dừng, rồi xác nhận phục hồi khi Core lên lại. Hai frontend hiện đọc `/api/v1/actuator/health` của Gateway. Nếu Gateway vẫn `UP` khi Core đã dừng, cần nối tình trạng Core vào endpoint frontend đang đọc để đáp ứng yêu cầu chặn truy cập khi Core down.
- [ ] **CI/CD và dữ liệu:** publish một phiên bản thử, cập nhật tag ở `hs-infra`, xác nhận Dokploy tự chạy đúng commit và dữ liệu vẫn còn. Sửa một thay đổi phù hợp trên frontend để xác nhận Vercel deploy từ `master`.

### Theo dõi EC2 và chẩn đoán lỗi thường gặp

Trên EC2, xem tài nguyên và trạng thái container. Các lệnh này chỉ đọc trạng thái.

```bash
sudo docker compose ls --all
sudo docker ps -a
sudo docker stats --no-stream
free -h
df -h /
```

Nếu dùng EC2 **8 GiB**, chạy kiểm tra khi khởi động đủ stack, tạo PDF và cập nhật image. Đối chiếu với log Dokploy và trạng thái `OOMKilled` của container. Ví dụ `sudo docker inspect --format '{{.State.OOMKilled}} {{.RestartCount}}' CONTAINER_ID`.

| Hiện tượng | Kiểm tra tiếp |
| --- | --- |
| Domain chưa có chứng chỉ hoặc DNS sai | Bản ghi `A` đúng Elastic IP, cổng 80/443 mở, host trong Dokploy đúng tên, cert provider là Let's Encrypt. |
| API trả `502` hoặc `503` | Container port trong Domains, mạng trong **Preview Compose**, log Gateway và Core, đăng ký Eureka. Chạy riêng lệnh gọi danh sách tin để kiểm tra tuyến qua Core. |
| Keycloak báo `invalid_redirect_uri` hoặc issuer sai | Domain Auth, cấu hình hostname/proxy, client ID và redirect URI chính xác của từng frontend. |
| Web báo CORS hoặc Socket.IO lỗi `404` | So origin trên request với CORS env. Kiểm tra route Notification, `Strip Path`, URL frontend và status WebSocket upgrade. |
| Container restart liên tục hoặc thiếu env | Tên prefix ở Dokploy khớp map `environment:`. Các URL giữa container dùng hostname Compose. Xem trạng thái container và log đúng service. |
| Kafka/AI init chặn service phía sau | Mở log `kafka-topics` hoặc `ai-migrate`. Sửa broker URL, credential hoặc migration rồi deploy lại. Job init thành công trả exit `0`. |

### Backup, khôi phục và chốt go-live

1. Trong Dokploy cấu hình **S3 Destinations** hoặc một đích lưu trữ ngoài EC2 và kiểm tra ghi được. Dùng backup nhất quán của PostgreSQL cho `keycloak`, `homespace_core`, `homespace_ai` và backup MongoDB cho các database dịch vụ. Giữ named volumes khi cập nhật Compose. Dùng snapshot EBS hoặc backup volume phù hợp cho các dữ liệu còn lại theo cách vận hành.
2. Chạy một bản backup thủ công và xác nhận có tệp bên S3. Thử restore ra môi trường riêng, kiểm tra đọc được dữ liệu. Sau đó đặt lịch backup và dung lượng lưu giữ phù hợp. Kiểm tra cả tài liệu hợp đồng lưu trên S3 và vòng đời lưu trữ của bucket.
3. Ghi lại commit release `hs-infra`, tag image, hai deployment Vercel và thời điểm backup đã kiểm tra. Chỉ mở truy cập chính thức sau khi các mục kiểm thử bắt buộc ở trên đạt.

[Backup volume trên Dokploy](https://docs.dokploy.com/docs/core/volume-backups) · [Backup database trên Dokploy](https://docs.dokploy.com/docs/core/databases/backups)
