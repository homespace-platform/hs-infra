# Triển khai HomeSpace trên Vercel, AWS EC2 và Dokploy

Hai frontend chạy trên Vercel. Backend, Keycloak và hạ tầng dữ liệu chạy trên một EC2 do Dokploy quản lý. GitHub Actions build image và đẩy lên Docker Hub. Discovery và Gateway đang được chuẩn bị thử nghiệm bằng Compose riêng để network nằm trong YAML và DNS dùng tên service; các backend khác vẫn giữ Application riêng, chưa chuyển đồng loạt.

**Thử nghiệm Discovery + Gateway, giữ nguyên infra:** làm theo [Discovery Compose](https://github.com/homespace-platform/hs-discovery-server/blob/master/deploy/dokploy.md), sau đó [Gateway Compose](https://github.com/homespace-platform/hs-gateway-server/blob/master/deploy/dokploy.md). Mỗi repo có `compose.production.yml`, tham gia external `hs-network` do infra hiện tại tạo; Docker DNS dùng service name `hs-discovery-server`/`hs-gateway-server`, không cần khai báo alias trùng tên hoặc chỉnh Advanced → Networks. Không xóa/tạo lại Compose infra hoặc volumes; chỉ Stop Application Discovery/Gateway cũ trước khi Deploy bản Compose mới. Gỡ domain/webhook trùng để không chạy hai bản. Tài liệu yêu cầu file YAML được đưa lên Git trước khi dùng Git provider; thay đổi local chưa tự deploy lên Dokploy.

Triển khai Compose **`hs-infra`** bằng [`compose.production.yml`](../compose.production.yml). Chạy local bằng [`docker-compose.yml`](../docker-compose.yml) với `.env`, production dùng `.env.dokploy`. Cả hai có 11 service infra và 7 volume; backend không nằm trong Compose infra. Repo `hs-infra` có pipeline build image **`nvminh162/hs-keycloak`**; Keycloak chạy dưới service `keycloak` bên trong Compose `hs-infra`, không tạo một Application/Compose Keycloak riêng.

**Deploy Core riêng:** làm theo [hướng dẫn Application Core API](https://github.com/homespace-platform/hs-core-api/blob/master/deploy/dokploy.md). Chọn **Create Service → Application → Docker**, dùng Environment và webhook của riêng Core. Infra và các Application dùng chung mạng overlay attachable `hs-network`; Compose `hs-infra` tự tạo mạng khi deploy lần đầu trên EC2 mới. Các Application triển khai sau chỉ gắn vào mạng đã có.

**Trình tự:** [Tạo EC2 và DNS](#1-chọn-ec2-và-chuẩn-bị-dns) → [Cài Dokploy](#2-cài-dokploy) → [Chuẩn bị image](#3-publish-image-lên-docker-hub) → [Deploy hạ tầng từ Git](#deploy-hạ-tầng-trước) → [Deploy backend](#4-deploy-mỗi-backend-thành-application-riêng) → [Deploy Vercel](#5-deploy-frontend-trên-vercel) → [Kiểm tra](#6-kiểm-tra-trước-khi-mở-truy-cập).

**Phương án hiện tại:** **build/push image `hs-keycloak` thành công → deploy Compose `hs-infra`**. Compose dùng provider **Git** để lấy YAML từ repo `hs-infra`, branch `master`; backend ngoài cặp thử nghiệm Discovery/Gateway vẫn dùng Application Docker riêng. GitHub Actions chỉ build/push image. Bấm **Deploy** trên Compose `hs-infra` để Dokploy lấy YAML mới và pull image. Chưa có bước tự động nối hai việc này; xem [cách cập nhật](#cập-nhật-từ-git-và-thời-điểm-deploy).

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

### Tạo DNS trên iNET cho `homespace.id.vn`

| URL | Host nhập trên iNET | DNS | Đích |
| --- | --- | --- | --- |
| `homespace.id.vn` | `@` | Bản ghi Vercel cung cấp | `hs-web-app` |
| `admin.homespace.id.vn` | `admin` | Bản ghi Vercel cung cấp | `hs-admin-portal` |
| `api.homespace.id.vn` | `api` | `A` → Elastic IP | Gateway, cổng container `8080`, path `/` |
| `auth.homespace.id.vn` | `auth` | `A` → Elastic IP | Keycloak, cổng container `8080`, path `/` |
| `notification.homespace.id.vn` | `notification` | `A` → Elastic IP | Notification, cổng container `8085`, path `/socket.io` |
| `dokploy.homespace.id.vn` | `dokploy` | `A` → Elastic IP | Trang quản trị Dokploy và điểm nhận webhook GitHub/Docker Hub qua HTTPS |
| `pgadmin.homespace.id.vn` | `pgadmin` | `A` → Elastic IP | pgAdmin, service `pgadmin`, cổng container `80`; cần bảo vệ truy cập |
| `redis.homespace.id.vn` | `redis` | `A` → Elastic IP | RedisInsight, service `redis-insight`, cổng container `5540`; cần bảo vệ truy cập |
| `kafka.homespace.id.vn` | `kafka` | `A` → Elastic IP | Kafka UI, service `kafka-ui`, cổng container `9022`; cần bảo vệ truy cập |

Ba domain quản trị là tùy chọn: thiết lập theo [mục domain hạ tầng](#domain-cho-giao-diện-quản-trị-hạ-tầng) nếu muốn dùng trình duyệt qua HTTPS. Có thể giữ SSH tunnel thay thế. Không tạo domain HTTP cho giao thức database/broker.

1. Đăng nhập iNET OnePortal → **Tên miền → Danh sách → homespace.id.vn → Bản ghi**. Dùng **Thêm bản ghi / Add record** bốn lần cho host `api`, `auth`, `notification`, `dokploy`.
2. Mỗi bản ghi đặt **Type `A`**, **Host/Name** như bảng, **Value** là Elastic IP hiện đang gắn với EC2, **TTL** khoảng 300 giây nếu nhà cung cấp cho chọn. Value chỉ chứa IP, không có `https://`, port hoặc path. Nếu DNS đang dùng Cloudflare, chọn **DNS only** trong lần thiết lập HTTPS đầu tiên. Hai bản ghi Vercel làm ở bước 5 sau khi thêm domain vào đúng project và lấy target chính xác; không trỏ `@`/`admin` về EC2.
3. Trên Windows PowerShell, kiểm tra bốn host phân giải được. Với DNS không qua proxy, địa chỉ trả về phải là Elastic IP. Nếu vừa sửa bản ghi cũ, đợi cache hết hạn và kiểm tra lại.

   ```powershell
   'api','auth','notification','dokploy' | ForEach-Object {
       Resolve-DnsName "$_.homespace.id.vn" -Type A |
           Select-Object Name, IPAddress
   }
   ```

Nếu bật proxy/bảo vệ OneShield, DNS công khai có thể trả IP của proxy; đối chiếu IP máy chủ gốc trong iNET với Elastic IP. Dùng **Full (Strict)** khi EC2 đã có chứng chỉ hợp lệ đúng domain. Flexible dùng HTTP từ proxy tới EC2, có thể gây vòng lặp khi Traefik chuyển HTTP sang HTTPS.

**Kết quả cần thấy:** EC2 `Running`, trạng thái kiểm tra đạt, bốn bản ghi backend có đích gốc cùng Elastic IP. [Thiết lập domain trên Vercel](https://vercel.com/docs/domains/set-up-custom-domain)

Nếu chuyển hệ thống đang dùng domain cũ, cập nhật cả Domains của Dokploy/Vercel, env URL/issuer/CORS, redirect URI của Keycloak, Firebase authorized domains, S3 CORS và callback nhà cung cấp theo các bảng bên dưới. Các file `.env.dokploy` đã tồn tại cần được đối chiếu lại; việc sửa hướng dẫn này không tự thay đổi env hay DNS đang chạy. Giữ nguyên database, realm/client IDs và secret. Sau khi đổi env frontend, deploy lại để bản build nhận URL mới; webhook Docker Hub/GitHub cũng phải dùng domain Dokploy mới.

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
5. Khi DNS `dokploy.homespace.id.vn` đã trỏ đúng, vào **Settings → Web Server → Server Domain**. Điền `dokploy.homespace.id.vn`, bật **HTTPS**, chọn **Let's Encrypt** và lưu. Mở domain HTTPS trong trình duyệt và thử đăng nhập lại trước khi đóng tunnel. Các webhook sử dụng domain HTTPS này. Giữ cổng `3000` riêng tư trong Security Group.
6. Provider **Git** dùng URL repository; repo public qua HTTPS không cần SSH key, repo private cần cấp quyền đọc. Không cần kết nối GitHub App chỉ để dùng Git provider. GitHub Actions đăng nhập Docker Hub bằng secrets riêng ở phần publish image.

**Kết quả cần thấy:** mở được `https://dokploy.homespace.id.vn` và đăng nhập được qua HTTPS.

## Deploy hạ tầng trước

Compose **`hs-infra`** triển khai cả **11 service hạ tầng**, gồm Keycloak và các dependency PostgreSQL/Kafka. `hs-keycloak` là tên image trên Docker Hub; `keycloak` là tên service trong Compose. Thẻ Compose `hs-keycloak` trong ảnh trước đó được đặt nhầm tên. Nếu thẻ này chưa deploy và chưa có dữ liệu, đổi tên hiển thị thành `hs-infra` trước khi triển khai. Với stack đã chạy, giữ nguyên định danh Compose, app name và named volumes để tránh tạo database mới. Trên EC2 mới, nếu không phục hồi backup, database sẽ có dữ liệu mới.

1. Trong Docker Hub, chuẩn bị repo **`nvminh162/hs-keycloak`**. Trong GitHub repo `hs-infra` → **Settings → Secrets and variables → Actions**, thêm `DOCKERHUB_USERNAME=nvminh162` và `DOCKERHUB_TOKEN` có quyền push. Nếu image private, thêm registry Docker Hub trong Dokploy bằng token pull riêng.
2. Chạy **GitHub → Actions → Publish Keycloak image → Run workflow → master**, chờ thành công và xác nhận tag `latest` có trên Docker Hub. Workflow [publish-keycloak.yml](../.github/workflows/publish-keycloak.yml) chỉ có job `publish`, build/push tag Git SHA và `latest`. Nó không tự chạy khi chỉ sửa Compose hoặc tài liệu.
3. Mở `.env.dokploy` trên máy cá nhân. Kiểm tra `KEYCLOAK_IMAGE=nvminh162/hs-keycloak:latest`, `KEYCLOAK_ADMIN_USERNAME=homespace`, `KEYCLOAK_HOSTNAME=https://auth.homespace.id.vn`, `KEYCLOAK_HOSTNAME_STRICT=true` và `PGADMIN_DEFAULT_EMAIL=homespace.id.vn@gmail.com`. Username bootstrap chỉ tạo tài khoản khi khởi tạo; đổi biến không đổi tên tài khoản trong database đã có. Nếu phải tạo file trên checkout mới, dùng `.env.example` làm mẫu và đặt mật khẩu production riêng. Chỉ tạo `KAFKA_CLUSTER_ID` mới khi khởi tạo cluster với volume mới; giữ nguyên ID và credential theo volume đang dùng khi redeploy.

   ```bash
   sudo docker run --rm --entrypoint /opt/kafka/bin/kafka-storage.sh apache/kafka:4.3.1 random-uuid
   ```

4. Trên EC2 mới đã cài Dokploy, không cần tự chạy `docker network create`: Compose `hs-infra` tạo `hs-network` dạng `overlay`, `attachable` trong lần Deploy đầu. Dokploy đã khởi tạo Swarm; phải deploy trên manager của Swarm đó. Nếu đã tạo mạng thủ công hoặc còn mạng từ stack khác, đọc [trường hợp mạng đã tồn tại](#mạng-hs-network-đã-tồn-tại-từ-trước) trước khi chuyển sang cấu hình Compose quản lý mạng.
5. Trong **Projects → homespace → production**, mở Compose hạ tầng và đặt tên hiển thị **`hs-infra`**. Nếu chưa có, chọn **Create Service → Docker Compose**, đặt tên `hs-infra`; không tạo thêm stack nếu đã có thẻ đặt nhầm tên `hs-keycloak`. Trong **General → Provider → Git**, điền:

   | Trường | Giá trị |
   | --- | --- |
   | Repository URL | `https://github.com/homespace-platform/hs-infra.git` |
   | Branch | `master` |
   | Compose Path | `./compose.production.yml` |
   | Watch Paths | Để trống khi thiết lập lần đầu |
   | Enable Submodules | Tắt |
   | Loại triển khai | Docker Compose, không chọn Stack |
   | Autodeploy | Tắt cho luồng deploy thủ công sau khi image publish |

   Repo public qua HTTPS không cần SSH key. Repo private: dùng **Add SSH Key** và cấp quyền đọc repository cho public key tương ứng. Bấm **Save**. Không dùng `./docker-compose.yml`: đó là cấu hình local. Mỗi lần Deploy sẽ lấy YAML từ Git; bản sửa local chưa push lên `master` sẽ chưa được dùng.
6. Hoàn tất hai [File Mount bên dưới](#file-mount-cho-postgresql-và-pgadmin), bao gồm thay đổi đường dẫn trong YAML trên Git, trước khi deploy lần đầu.
7. Mở tab **Environment**, dán nội dung `.env.dokploy` rồi **Save**. File này chứa credential và được Git bỏ qua; không đưa vào repo hoặc chat. Sửa env local không tự sửa Environment trên Dokploy. Có thể kiểm tra cú pháp từ gốc repo bằng `docker compose --env-file .env.dokploy -f compose.production.yml config --quiet`; lệnh này không xác nhận file mount hay network đã tồn tại trên EC2.
8. Trong **General → Preview Compose**, kiểm tra đủ 11 service; network `default` phải có `name: hs-network`, `driver: overlay`, `attachable: true`, không dùng `external: true` cho lần khởi tạo mới. Đây là mạng mặc định của mọi service infra không khai báo network riêng. Làm lần lượt theo [hướng dẫn thêm domain Keycloak](#keycloak-và-https): tạo DNS `auth`, kiểm tra Environment, thêm domain trong **Compose hs-infra → Domains**, lưu rồi Deploy. Không thêm domain Keycloak ở Settings → Web Server.
9. Sau khi image **`nvminh162/hs-keycloak:latest`** đã publish thành công và lưu đủ cấu hình, vào Compose **`hs-infra` → General → Deploy**. Compose pull image đó cho service `keycloak` và triển khai cùng các service hạ tầng khác; không deploy Keycloak riêng. Theo dõi **Deployments**, **Logs** và **Containers**: `postgres`, `postgres-ai`, `mongodb`, `redis`, `gotenberg`, `kafka` và `keycloak` cần `healthy`; `kafka-topics` hoàn thành với `Exited (0)`; `pgadmin`, `redis-insight`, `kafka-ui` ở trạng thái `running`.
10. Mở `https://auth.homespace.id.vn/admin/`, đăng nhập bằng `KEYCLOAK_ADMIN_USERNAME` và `KEYCLOAK_ADMIN_PASSWORD` trong Environment. Gọi OIDC discovery bên dưới, kiểm tra issuer là `https://auth.homespace.id.vn/realms/homespace-platform`. Realm mới được import từ image; realm đã tồn tại cần sửa client qua Admin Console. Nếu bật Google login, điền client secret thật vì realm export mang giá trị đã che. Tài khoản admin ứng dụng sẽ được Core bootstrap khi deploy Core.

   ```powershell
   curl.exe -fsS 'https://auth.homespace.id.vn/realms/homespace-platform/.well-known/openid-configuration'
   ```

### File Mount cho PostgreSQL và pgAdmin

Áp dụng cho cả provider Git và Raw. Raw không clone repo nên không có `./postgres/init/01-create-databases.sql` hoặc `./pgadmin/servers.json`; Git cũng có thể làm hỏng bind mount từ checkout khi clone lại. File production dùng `../files/` theo [hướng dẫn Dokploy](https://docs.dokploy.com/docs/core/troubleshooting/volumes-mounts). Phải tạo hai File Mount trong **đúng Compose đang deploy**; mounts của một Compose khác không tự chuyển sang Compose mới.

1. Vào **Advanced → Volumes/Mounts → Add Volume → File Mount**, tạo và Save từng file:

   | File Path | Nội dung lấy từ repo |
   | --- | --- |
   | `01-create-databases.sql` | [`postgres/init/01-create-databases.sql`](../postgres/init/01-create-databases.sql) |
   | `servers.json` | [`pgadmin/servers.json`](../pgadmin/servers.json) |

2. File `compose.production.yml` đã dùng hai source cho File Mount. Nếu Dokploy đang lưu bản YAML cũ, thay hai dòng source; giữ nguyên target, quyền read-only và named volumes:

   | Service | Source hiện tại | Source cho File Mount |
   | --- | --- | --- |
   | `postgres` | `./postgres/init/01-create-databases.sql` | `../files/01-create-databases.sql` |
   | `pgadmin` | `./pgadmin/servers.json` | `../files/servers.json` |

   **Raw:** dán file production đã sửa vào **General → Raw → Compose File**, Save. **Git:** đưa thay đổi YAML lên `master` trước khi Deploy; không sửa bản Preview vì lần Deploy sau lấy lại YAML trên Git. Raw không nhận thay đổi chỉ nằm ở file local/Git.
3. Khi thay nội dung hai file trong repo, cập nhật cả nội dung File Mount trên Dokploy. Script PostgreSQL init chỉ chạy khi volume dữ liệu còn trống; sửa file không tự tạo hay migrate database đã tồn tại. Không xóa volume để ép chạy lại script.

#### Raw báo `bind source path does not exist`

Nếu log có `Detected: 0 mounts` và đường dẫn lỗi kết thúc bằng `/code/postgres/init/01-create-databases.sql`, bản Raw đang tham chiếu file repo chưa có trên server. Không rebuild Keycloak hoặc tạo file rỗng để vượt lỗi. Thêm hai File Mount ở bước 1, sửa hai source ở bước 2, Save rồi Deploy lại cùng Compose. Nội dung SQL lấy nguyên từ repo, pgAdmin dùng JSON hợp lệ; File Path chỉ là tên file trong bảng, không phải đường dẫn đích trong container.

Giữ đúng App Name/project Compose hiện tại khi chuyển Git sang Raw. Nếu tạo Compose mới, Dokploy dùng project name mới và các named volume có thể trỏ tới dữ liệu mới dù tên trong YAML giống nhau. Không xóa Compose cũ/volumes để xử lý lỗi mount; cần đối chiếu volume trước khi tiếp tục nếu project đã đổi.

### Cập nhật từ Git và thời điểm deploy

Luồng hiện tại: **push thay đổi repo `hs-infra` lên Git → chờ Actions build/push image `hs-keycloak` nếu có thay đổi Keycloak → bấm Deploy Compose `hs-infra` trên Dokploy → kiểm tra health**. Workflow chỉ publish image, không gọi Dokploy API và không dùng `DOKPLOY_DEPLOY_WEBHOOK`.

| Thay đổi | Cách cập nhật |
| --- | --- |
| Compose YAML | Push lên `master`; lần Deploy tiếp theo Dokploy lấy YAML mới. Nếu cùng thay đổi Keycloak, chờ image mới trước. |
| Provider, theme hoặc realm đóng gói trong image | Chờ workflow `Publish Keycloak image` thành công rồi Deploy. Realm đã tồn tại không được import đè tự động. |
| Environment | Sửa trực tiếp trong Dokploy → Save → Deploy. Git không chứa `.env.dokploy`. |
| SQL init hoặc cấu hình pgAdmin | Cập nhật File Mount tương ứng; SQL init không chạy lại với database đã tồn tại. |
| Một backend riêng | Build/publish và deploy đúng Application backend; không deploy lại infra. |

**Tự động khi push Git (tùy chọn):** copy Compose Webhook URL từ Dokploy, thêm vào GitHub repo → **Settings → Webhooks → Add webhook**, Content type `application/json`, sự kiện **Just the push event**, giữ SSL verification bật. Hoàn tất thiết lập rồi bật **Autodeploy**. Handler kiểm tra branch `master` và Watch Paths. Webhook Git chạy ngay khi push, **không chờ Actions**; với thay đổi cần image mới, có thể deploy image `latest` cũ và không có lần deploy thứ hai sau khi build xong. Vì vậy luồng hiện tại giữ deploy thủ công sau CI.

**Tự động sau khi image publish (chưa triển khai):** phương án gọn là thêm bước gọi Dokploy sau job publish thành công, rồi tránh webhook push Git gây deploy sớm. Cách này thay đổi yêu cầu hiện tại “Actions chỉ publish image”; không được coi là đã có trong workflow. Khi có nhiều commit liên tiếp, cũng cần bảo đảm YAML và image thuộc đúng bản phát hành.

**Docker Hub webhook:** không gắn trực tiếp webhook image của `hs-keycloak` vào Compose dùng provider Git trên Dokploy **v0.31.4**: payload không có branch Git và bị từ chối `Branch Not Match`. Luồng Docker Hub → Raw trước đây là phương án khác, không tự đồng bộ YAML. Các backend dùng **Application Docker** vẫn có thể dùng webhook Docker Hub riêng của chúng. Giữ kín token trong mọi webhook URL.

Giữ nguyên Compose hiện có và named volumes khi cập nhật; đổi tên project/tạo stack mới có thể tạo volume khác. Muốn quay về image cũ, đặt `KEYCLOAK_IMAGE` thành tag SHA đã publish rồi Deploy; kiểm tra tương thích schema và backup trước khi hạ phiên bản Keycloak.

[Dokploy Auto Deploy](https://docs.dokploy.com/docs/core/auto-deploy) · [Handler Compose webhook v0.31.4](https://github.com/Dokploy/dokploy/blob/v0.31.4/apps/dokploy/pages/api/deploy/compose/%5BrefreshToken%5D.ts)

### Mở pgAdmin, RedisInsight và Kafka UI

Có hai cách truy cập: [domain HTTPS có xác thực](#domain-cho-giao-diện-quản-trị-hạ-tầng) hoặc SSH tunnel bên dưới. Cấu hình Compose hiện tại chỉ bind các cổng host vào loopback; giữ nguyên để tránh mở thẳng công cụ ra Internet.

#### Domain cho giao diện quản trị hạ tầng

Compose hiện có ba giao diện quản trị dưới đây; chưa có Prometheus/Grafana trong stack. Domain `redis` dành cho **RedisInsight**, không phải endpoint Redis server. Domain `kafka` dành cho **Kafka UI**, không phải Kafka broker.

| Host trong Domains | Service Name | Container Port | Ghi chú |
| --- | --- | --- | --- |
| `pgadmin.homespace.id.vn` | `pgadmin` | `80` | `5050` là cổng host qua tunnel, không điền vào Container Port |
| `redis.homespace.id.vn` | `redis-insight` | `5540` | Không dùng `3000` hoặc cổng Redis `6379` |
| `kafka.homespace.id.vn` | `kafka-ui` | `9022` | Compose đã đặt `SERVER_PORT=9022`, không dùng cổng broker `19092` |

**Bảo vệ trước khi mở domain:** Compose hiện không cấu hình đăng nhập cho RedisInsight/Kafka UI. Mật khẩu Redis bảo vệ kết nối database, không thay thế đăng nhập giao diện. Dùng một middleware BasicAuth ở Traefik cho cả ba domain; pgAdmin vẫn giữ đăng nhập riêng. HTTPS hoặc bật proxy OneShield không tự giới hạn ai được vào giao diện.

1. Trên EC2, tạo hash cho tài khoản quản trị giao diện bằng `htpasswd -nB homespace`. Lệnh hỏi mật khẩu tương tác; dùng mật khẩu riêng, không truyền password trong command và không gửi dòng hash vào chat. Nếu thiếu `htpasswd`, cài gói `apache2-utils` trước. Dòng kết quả có dạng `homespace:<bcrypt-hash>`.
2. Trong Dokploy → **Traefik File System**, tạo file `infra-admin-auth.yml` trong thư mục cấu hình **dynamic** đang được Traefik theo dõi, cùng cấp các file dynamic hiện có; không sửa file cấu hình static hoặc ghi đè file khác. Nội dung:

   ```yaml
   http:
     middlewares:
       infra-admin-auth:
         basicAuth:
           removeHeader: true
           users:
             - 'THAY_BANG_TOAN_BO_DONG_HOMEspace_VA_HASH_TU_HTPASSWD'
   ```

   Thay toàn bộ chuỗi mẫu bằng dòng `homespace:<bcrypt-hash>` vừa tạo, giữ dấu nháy. Đây là file YAML dynamic, **không nhân đôi dấu `$`** như khi viết hash trong nhãn Docker Compose. Save file; chỉ tạo domain sau khi middleware được Traefik tải thành công. [Traefik BasicAuth](https://doc.traefik.io/traefik/middlewares/http/basicauth/)
3. Trong **iNET → homespace.id.vn → Bản ghi DNS**, tạo/sửa ba bản ghi `A`: `pgadmin`, `redis`, `kafka`, cùng trỏ về Elastic IP EC2, TTL khoảng 5 phút. Khi cấp chứng chỉ lần đầu có thể dùng Chỉ DNS; nếu bật OneShield sau đó, dùng Full (Strict) khi chứng chỉ gốc đã hợp lệ.
4. Vào **Dokploy → Projects → homespace → production → Compose infra → Domains → Add Domain**. Tạo lần lượt ba domain theo bảng. Đặt **Path `/`**, **Internal Path `/` hoặc để trống**, **Strip Path tắt**, **Custom Entrypoint tắt**, **HTTPS bật**, **Certificate Provider Let's Encrypt**. Trong ô **Middlewares**, nhập **`infra-admin-auth@file`** rồi bấm **Add** trước khi **Create/Save**. Áp dụng cho cả ba domain, không gắn middleware này lên domain Keycloak hay API của người dùng.
5. Sau khi lưu đủ domain, vào **General → Deploy** lại cùng Compose. Dokploy thêm nhãn Traefik và kết nối `dokploy-network` cho các service có domain; service vẫn giữ `hs-network`. Không cần sửa Dockerfile, publish image hay mở thêm inbound port `80` của pgAdmin/`5540`/`9022` trên EC2. Public chỉ dùng HTTP `80` và HTTPS `443` của Traefik.
6. Kiểm tra trước khi nhập credential: `curl.exe -I https://redis.homespace.id.vn/` phải trả **401** kèm `WWW-Authenticate`, với chứng chỉ hợp lệ. Kiểm tra tương tự `pgadmin` và `kafka`. Nếu middleware báo không tồn tại hoặc chưa có lớp xác thực, chưa đưa domain vào sử dụng; sửa middleware hoặc giữ SSH tunnel. Sau đó mở bằng trình duyệt, đăng nhập BasicAuth bằng tài khoản vừa tạo, rồi kết nối từng công cụ theo bảng bên dưới.

   | Công cụ | Kết nối sau khi qua BasicAuth |
   | --- | --- |
   | pgAdmin | Đăng nhập bằng `PGADMIN_DEFAULT_EMAIL`/`PGADMIN_DEFAULT_PASSWORD`; chọn server `hs-postgres` hoặc `ai-pgvector`, nhập mật khẩu PostgreSQL tương ứng. |
   | RedisInsight | Add database: Host `redis`, Port `6379`, User `default`, Password từ `REDIS_PASSWORD`. Không dùng hostname public hoặc `localhost` để kết nối Redis từ container. |
   | Kafka UI | Chọn cluster `HomeSpace`; broker nội bộ `kafka:19092` đã khai báo trong Compose. |

Các domain/middleware được lưu trong Dokploy; thay đổi file Compose trong Git không tự tạo các bản ghi DNS hoặc cấu hình xác thực này. Không public PostgreSQL/MongoDB/Redis/Kafka broker qua Domains. Nếu cần thêm công cụ quan sát khác, triển khai service đó trước rồi mới cấu hình domain tương ứng.

#### Truy cập qua SSH tunnel

Dùng SSH tunnel trên máy cá nhân để truy cập cả ba bằng một kết nối, không cần domain. Đổi tên file key và IP theo máy của bạn.

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

Giữ Compose `hs-infra` cho hạ tầng, bao gồm service `keycloak`. Mỗi backend dùng một Application riêng, tham gia mạng overlay `hs-network`; cập nhật backend không deploy lại infra.

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
| `hs-infra` | `hs-keycloak` |

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

TeleCare dùng Maven Jib để publish backend và workflow riêng để build Keycloak. HomeSpace cũng tách build image theo repository. Workflow Keycloak hiện chỉ build/push; Compose infra dùng Git và được deploy sau khi image sẵn sàng, theo [luồng cập nhật](#cập-nhật-từ-git-và-thời-điểm-deploy). [Workflow backend TeleCare](https://github.com/nvminh162-iuh/iuh-corporate-internship-project/blob/master/.github/workflows/deploy.yml) · [Workflow Keycloak TeleCare](https://github.com/nvminh162-iuh/iuh-corporate-internship-project/blob/master/.github/workflows/build-keycloak-image.yml) · [Docker và GitHub Actions](https://docs.docker.com/build/ci/github-actions/)

## 4. Deploy mỗi backend thành Application riêng

**Ngoại lệ thử nghiệm:** Discovery và Gateway chuyển sang Compose riêng theo hai hướng dẫn ở đầu tài liệu, network khai báo trong YAML, DNS dùng tên service. Các bước Application/Advanced bên dưới chỉ áp dụng khi còn dùng Application, không làm lại cho Compose thử nghiệm. Giữ infra hiện có; không thêm backend vào Compose infra.

Mỗi repo backend có Dockerfile, workflow publish image, Environment và webhook riêng. Trên Dokploy tạo một Application cho mỗi backend, chọn Docker provider và image tương ứng; không thêm backend vào Compose `hs-infra`.

### Mạng dùng chung và thứ tự deploy

1. Push cấu hình `compose.production.yml` mới lên Git trước khi bấm Deploy. Trên EC2 mới, Compose `hs-infra` tự tạo `hs-network`; không cần tạo mạng thủ công trước đó. Nếu Preview Compose còn `external: true` cho mạng này, Dokploy chưa dùng bản cấu hình mới.
2. Deploy Compose `hs-infra` trước và chờ infra healthy. Cả 11 service dùng mạng mặc định `default` có tên thực tế `hs-network`, driver `overlay`, `attachable: true`. Service mới thêm vào Compose này cũng tự dùng mạng đó nếu không khai báo mạng khác. Không đổi volumes. Local `docker-compose.yml` vẫn dùng bridge trên máy local; không deploy file local lên Dokploy.
3. Deploy Application Discovery trước, gắn `hs-network` với alias `hs-discovery-server`, chờ healthy. Làm theo [hướng dẫn Discovery](https://github.com/homespace-platform/hs-discovery-server/blob/master/deploy/dokploy.md).
4. Làm theo [hướng dẫn Core Application](https://github.com/homespace-platform/hs-core-api/blob/master/deploy/dokploy.md): publish image, tạo Application, dán env Core, gắn mạng và deploy. Giữ `EUREKA_CLIENT_SERVICE_URL=http://hs-discovery-server:8761/eureka/`, bật Eureka/Discovery theo env production; xác nhận Core xuất hiện trên Eureka.
5. Deploy Gateway cùng mạng, alias `hs-gateway-server`, đăng ký Eureka, giữ `GATEWAY_INTERNAL_SECRET` khớp Core và các service sử dụng. Domain API route tới Application Gateway cổng 8080. Kiểm tra `/api/v1/actuator/health` qua Gateway.
6. Chat, News, Notification và AI tiếp tục triển khai theo cùng nguyên tắc Application và CI/CD độc lập, cùng mạng backend. Các bước build/runtime riêng của chúng phải được chuẩn bị trong repo tương ứng.

Application dùng Docker Swarm; Compose container gắn được vào cùng overlay `hs-network` nhờ `Attachable=true`. Tên mạng cố định là `hs-network`, không có tiền tố project Compose. Compose `hs-infra` sở hữu mạng; các Application chỉ tham gia, không tạo mạng khác cùng tên. Giữ thêm `dokploy-network` do Dokploy quản lý cho các dịch vụ cần Traefik; không mở public port PostgreSQL/MongoDB/Redis/Kafka để nối các Application. Vòng đời deploy và Environment của từng service vẫn tách riêng.

Cấu hình tự tạo mạng trong Compose chủ `hs-infra`:

```yaml
networks:
  default:
    name: hs-network
    driver: overlay
    attachable: true
```

Sau lần Deploy đầu, kiểm tra trên EC2:

```bash
sudo docker network inspect hs-network --format 'driver={{.Driver}} attachable={{.Attachable}}'
```

Kết quả cần là `driver=overlay attachable=true`. Deploy lại cùng Compose tiếp tục dùng mạng hiện có. Không dùng thao tác xóa stack/`docker compose down` để cập nhật image: Compose có thể cố xóa mạng mà các Application khác đang dùng. Lệnh Deploy thông thường mới là luồng cập nhật.

#### Mạng `hs-network` đã tồn tại từ trước

Nếu đã chạy lệnh tạo mạng thủ công theo hướng dẫn cũ, mạng đó không có nhãn sở hữu của Compose. Cấu hình tự tạo mới không tự nhận quyền quản lý mạng của stack khác hoặc mạng thủ công; Compose có thể báo nhãn `com.docker.compose.network` không đúng.

Kiểm tra, không xóa mạng:

```bash
sudo docker network inspect hs-network --format 'driver={{.Driver}} attachable={{.Attachable}} labels={{json .Labels}}'
```

Với môi trường đã có mạng dùng chung, giữ cách tham chiếu external trong **bản YAML triển khai của môi trường đó** thay cho block tự tạo ở trên; không khai báo thêm `driver`/`attachable` cùng `external: true`:

```yaml
networks:
  default:
    external: true
    name: hs-network
```

Mạng phải là overlay/attachable và thuộc đúng Swarm. Không tự xóa hoặc tạo lại mạng đang dùng để đổi quyền sở hữu. Cấu hình external chỉ dành cho trường hợp mạng đã có; trên máy mới không có mạng, dùng cấu hình tự tạo của `compose.production.yml`.

**Tạo Application mới: cấu hình một lần, giữ khi redeploy**

Docker không tự chọn `hs-network` cho một Dokploy Application mới. `EXPOSE` trong Dockerfile, biến env hoặc việc cùng project Dokploy không tự gắn network. Trước lần Deploy đầu:

1. Chọn đúng server/Swarm chứa `hs-network` và infra.
2. Vào **Advanced → Networks**, thêm `hs-network`, giữ `dokploy-network`. Nếu dùng **Swarm Settings → Network**, thêm Target `hs-network` và Aliases theo bảng rồi **Save Networks**. Nếu danh sách chưa hiện mạng, refresh/sync trên đúng server.
3. Cấu hình alias cố định, không dùng tên container hoặc tên service Dokploy sinh ngẫu nhiên trong env:

   | Application | Alias trên `hs-network` |
   | --- | --- |
   | Discovery | `hs-discovery-server` |
   | Core | `core-api` |
   | Gateway | `hs-gateway-server` |
   | Chat | `chat` |
   | News | `news` |
   | Notification | `notification` |
   | AI | `ai` |

4. Dán Environment của đúng service, lưu, Deploy rồi kiểm tra health. Ví dụ backend truy cập `postgres:5432`, `mongodb:27017`, `redis:6379`, `kafka:19092`, `discovery:8761` theo dependency thực tế; không dùng `localhost` để trỏ đến container khác.

Sau khi gắn cùng mạng, Docker DNS phân giải service name/alias và cập nhật địa chỉ khi container thay đổi. Dokploy giữ cấu hình mạng đã Save cho các lần redeploy; image mới không cần gắn lại. Service hạ tầng trong Compose đã có tên DNS theo service key (`postgres`, `postgres-ai`, `mongodb`, `redis`, `kafka`, `keycloak`, `gotenberg`). Eureka đăng ký ứng dụng là bước riêng: cùng network không tự bật Eureka, tạo database, cấp quyền hoặc đồng bộ secret. Hai frontend Vercel truy cập domain HTTPS, không tham gia `hs-network`.

Với một Compose khác cần dùng hạ tầng chung, chỉ tham chiếu external như dưới đây sau khi `hs-infra` đã tạo mạng. Không để Compose thứ hai quản lý cùng mạng:

```yaml
networks:
  default:
    external: true
    name: hs-network
```

Không tạo thêm stack có cùng alias database trên mạng chung. Giữ kiểm tra token/identity và credential ở các service; cùng mạng không thay thế xác thực. Không gắn thủ công container bằng `docker network connect` làm cấu hình lâu dài vì container có thể bị thay khi deploy.

Kiểm tra từ **Open Terminal** của backend bằng công cụ sẵn có trong image: `getent hosts postgres kafka hs-discovery-server` kiểm tra DNS; `curl -fsS --max-time 5 http://hs-discovery-server:8761/eureka/apps` kiểm tra đường tới Eureka. Chỉ kiểm tra các dependency đang chạy. DNS phân giải thành công chưa chứng minh ứng dụng đã healthy hoặc credential đúng.

[Docker: mạng mặc định Compose](https://docs.docker.com/reference/compose-file/networks/) · [Docker: overlay attachable](https://docs.docker.com/engine/network/drivers/overlay/)

### Cấu hình kết nối chính

Các hostname nội bộ dưới đây giả định service/container có alias tương ứng trên cùng mạng overlay `hs-network`. Cấu hình những biến này trong từng service sử dụng chúng.

| Biến hoặc kết nối | Giá trị production |
| --- | --- |
| `DATASOURCE_URL` của Core | `jdbc:postgresql://postgres:5432/homespace_core` |
| `AI_DATABASE_URL` | PostgreSQL/pgvector qua `postgres-ai:5432`, với driver `postgresql+asyncpg` và credential của AI |
| `EUREKA_CLIENT_SERVICE_URL` | `http://hs-discovery-server:8761/eureka/` |
| `EUREKA_INSTANCE_HOSTNAME` | Dùng giá trị theo hướng dẫn từng service; Chat/Notification hiện dùng `localhost` làm tín hiệu để code tự chọn IP container. DNS alias ở Dokploy là cấu hình riêng, không tự đổi biến này. |
| `PORT` của Chat, News, AI và Notification | Tương ứng `8082`, `8083`, `8084`, `8085` |
| `KAFKA_BOOTSTRAP_SERVERS` của Core, `KAFKA_BROKERS` của các consumer | `kafka:19092` |
| `KEYCLOAK_KAFKA_TOPIC`, `KAFKA_EVENTS_TOPIC`, `KAFKA_DLT_TOPIC`, `KAFKA_NEWS_TOPIC`, `KAFKA_NEWS_DLT_TOPIC` | `keycloak-user-events`, `homespace.notification.events.v1`, `homespace.notification.events.dlt.v1`, `homespace.news.events.v1`, `homespace.news.events.dlt.v1`. Điền nhất quán cho producer, consumer và `kafka-topics`. |
| `REDIS_HOST` | `redis` |
| `MONGODB_URI`, `AI_MONGODB_URI` | `mongodb://USER:PASSWORD@mongodb:27017/DATABASE?authSource=AUTH_DATABASE`. Giữ database của từng service theo `.env.example`. Mã hóa ký tự đặc biệt trong thành phần username/password của URI. |
| `CONTRACT_GOTENBERG_URL` | `http://gotenberg:3000` |
| `GATEWAY_BASE_URL` của AI | `http://hs-gateway-server:8080` |
| `GATEWAY_INTERNAL_SECRET` | Cùng giá trị ở Gateway và các service dùng secret nội bộ này |
| `KEYCLOAK_SERVER_URL` của Core | `http://keycloak:8080` trên mạng backend |
| `JWT_ISSUER_URI` của Gateway, `KEYCLOAK_ISSUER_URL` của Notification | `https://auth.homespace.id.vn/realms/homespace-platform` |
| `JWT_JWK_SET_URI` của Gateway | `http://keycloak:8080/realms/homespace-platform/protocol/openid-connect/certs` |
| `CORS_ALLOWED_ORIGINS` và `NOTIFICATION_REALTIME_ORIGINS` | `https://homespace.id.vn,https://admin.homespace.id.vn` |
| `PAYMENT_PROOF_UPLOAD_PUBLIC_BASE_URL` của Core | `https://api.homespace.id.vn` |
| `SEPAY_RETURN_URL` của Core | `https://homespace.id.vn/dashboard/membership/return` nếu dùng SePay |

- **Core và Gateway:** đặt `SPRING_PROFILES_ACTIVE=prod` ở hai service. Với database Core mới, xác định cách tạo schema trước khi chọn `JPA_DDL_AUTO`. Nếu dùng Hibernate tạo schema theo cách hiện tại của dự án, sử dụng `update` có kiểm soát ở lần khởi tạo và kiểm tra schema trước khi chuyển `validate`. Với database đã có dữ liệu, sao lưu trước khi đổi schema.
- **Keycloak và tài khoản ứng dụng:** credential quản trị Keycloak dùng cho client đồng bộ của Core phải truy cập được realm. Khai báo các nhóm `BOOTSTRAP_ADMIN_*` của Core với tài khoản production khi cần bootstrap. Sau lần chạy đầu, đăng nhập tài khoản đó vào admin portal và kiểm tra user có trong Keycloak, ứng dụng và đúng quyền. Core thực hiện đồng bộ tài khoản qua Keycloak khi seed.
- **S3:** tạo bucket và cấp quyền cho đúng dịch vụ. Nếu trình duyệt upload bằng URL ký sẵn, cấu hình bucket CORS cho hai origin frontend và đúng phương thức upload. Kiểm tra đường dẫn mẫu DOCX và dịch vụ Gotenberg trước khi thử ký.
- **Firebase:** nhập credential server vào Notification, biến công khai và khóa VAPID vào Vercel theo `.env.example`. Giữ `KEYCLOAK_AUDIENCE` của Notification khớp audience trong access token phát hành từ realm.
- **VNPT eKYC, SmartCA, SePay và blockchain:** nhập cấu hình từng nhà cung cấp vào Core. Đăng ký lại origin hoặc callback HTTPS ở nhà cung cấp theo tính năng đang bật. Ví dụ SePay IPN đi qua `https://api.homespace.id.vn/api/v1/membership/sepay/ipn`. Với blockchain, xác nhận cặp RPC, chain ID và địa chỉ contract cùng thuộc mạng định dùng.

### Keycloak và HTTPS

Mục tiêu: mở **`https://auth.homespace.id.vn/admin/`** để quản trị Keycloak. Domain này dẫn tới service **`keycloak` bên trong Compose `hs-infra`**, không cần tạo Application mới.

Luồng truy cập: **trình duyệt → OneShield nếu bật → EC2/Traefik cổng 443 → Keycloak cổng nội bộ 8080**. `dokploy.homespace.id.vn` là trang quản trị Dokploy; `auth.homespace.id.vn` là Keycloak.

#### Bước 1 — Thêm bản ghi DNS `auth` trên iNET

1. Mở **iNET OnePortal → Tên miền → Danh sách → homespace.id.vn → Bản ghi**.
2. Nếu đã có bản ghi `auth`, chọn **Chỉnh sửa**; nếu chưa có, chọn **Thêm bản ghi**.
3. Điền **Tên/Host `auth`**, **Loại `A`**, **Nội dung/Value là Elastic IP của EC2 đang chạy Dokploy**, TTL khoảng **5 phút**. Không nhập URL, port hoặc path vào Value. Không tạo hai bản ghi `auth` trỏ tới hai máy khác nhau.
4. Lưu bản ghi. EC2 cần cho phép truy cập HTTP `80` và HTTPS `443` theo phần Security Group. Không cần mở public cổng `8080` hoặc `9000` của Keycloak.
5. Kiểm tra trên PowerShell:

   ```powershell
   Resolve-DnsName auth.homespace.id.vn -Type A
   ```

   Nếu tắt proxy/bảo vệ, kết quả phải là Elastic IP. Nếu bật OneShield, kết quả có thể là IP proxy; kiểm tra **địa chỉ máy chủ gốc** trong iNET phải là Elastic IP của EC2.

Khi OneShield bật, dùng **Full (Strict)** sau khi Traefik đã có chứng chỉ hợp lệ cho `auth.homespace.id.vn`. Không dùng Flexible với cấu hình chuyển HTTP sang HTTPS này. Nếu proxy cản xác thực Let's Encrypt trong lần thiết lập đầu, có thể tạm chuyển bản ghi sang DNS trực tiếp, cấp chứng chỉ và kiểm tra HTTPS gốc thành công rồi bật lại bảo vệ ở Full (Strict).

#### Bước 2 — Kiểm tra Environment của Compose `hs-infra`

1. Mở **Dokploy → Projects → homespace → production → hs-infra → Environment**.
2. Kiểm tra các dòng công khai sau; giữ nguyên mật khẩu và các biến khác:

   ```dotenv
   KEYCLOAK_IMAGE=nvminh162/hs-keycloak:latest
   KEYCLOAK_ADMIN_USERNAME=homespace
   KEYCLOAK_HOSTNAME=https://auth.homespace.id.vn
   KEYCLOAK_HOSTNAME_STRICT=true
   ```

3. Chọn **Save**. Sửa `.env.dokploy` trên máy cá nhân không tự cập nhật Environment trên Dokploy.

Compose đã ánh xạ `KEYCLOAK_HOSTNAME` sang `KC_HOSTNAME`, `KEYCLOAK_HOSTNAME_STRICT` sang `KC_HOSTNAME_STRICT`; đã đặt `KC_HTTP_ENABLED=true` và `KC_PROXY_HEADERS=xforwarded`. Không cần thêm các biến `KC_*` trùng vào Environment. HTTPS công khai kết thúc tại Traefik, sau đó Traefik gọi HTTP nội bộ tới Keycloak; đây không phải chế độ Flexible giữa OneShield và EC2. [Keycloak hostname](https://www.keycloak.org/server/hostname) · [Keycloak sau reverse proxy](https://www.keycloak.org/server/reverseproxy)

#### Bước 3 — Thêm domain trong tab Domains

1. Vẫn trong Compose **`hs-infra`**, chọn tab **Domains**. Nếu thanh tab bị khuất, kéo ngang để tìm Domains.
2. Chọn **Add Domain / Create Domain**. Nếu `auth.homespace.id.vn` đã có ở đây, sửa bản ghi hiện có thay vì tạo trùng.
3. Điền form:

   | Trường | Giá trị |
   | --- | --- |
   | Host | `auth.homespace.id.vn` — không thêm `https://`, port hoặc `/admin` |
   | Service Name / Service | `keycloak` — service key trong YAML, không phải tên image `hs-keycloak` |
   | Container Port | `8080` |
   | Path | `/` |
   | Internal Path, nếu có | Để trống, không thêm tiền tố |
   | Strip Path, nếu có | Tắt |
   | HTTPS | Bật |
   | Certificate / Certificate Provider | Let's Encrypt |
   | Custom Entrypoint, nếu có | Giữ mặc định, không bật cấu hình riêng |

4. Chọn **Save / Create**. Nếu danh sách Service không có `keycloak`, quay lại **General**, kiểm tra Git URL, branch `master`, Compose Path `./compose.production.yml`, Save rồi **Preview Compose → Refresh**. Bản YAML trên Git phải có service key `keycloak`.
5. Không nhập domain này vào **Settings → Web Server → Server Domain**: mục đó dành cho `dokploy.homespace.id.vn`. Container Port `8080` trong form domain chỉ là cổng đích của Traefik, không phải yêu cầu mở cổng `8080` trên EC2.

#### Bước 4 — Deploy Compose để áp dụng domain

1. Chờ image `nvminh162/hs-keycloak:latest` build/push thành công. Xác nhận network, Environment và File Mount đã hoàn tất.
2. Vào **hs-infra → General → Deploy**. Với Docker Compose, chỉ Save domain chưa đủ: phải redeploy để áp dụng nhãn Traefik. [Dokploy Domains](https://docs.dokploy.com/docs/core/domains)
3. Theo dõi **Deployments** để biết pull image/triển khai có lỗi không. Sau đó vào **Containers**, kiểm tra PostgreSQL, Kafka, Keycloak và xem **Logs** của container `keycloak` nếu chưa healthy.
4. Keycloak cần giữ mạng `hs-network` để gọi PostgreSQL/Kafka và kết nối `dokploy-network` do Dokploy quản lý để Traefik route domain. Không bật detach mạng Traefik. Nếu chứng chỉ chưa cấp được, kiểm tra DNS gốc, cổng `80`/`443`, OneShield và log Traefik; không tắt kiểm tra chứng chỉ để che lỗi.
5. Khi thêm/sửa domain lần sau, Save rồi Deploy lại **cùng Compose `hs-infra`**; không tạo lại stack hoặc xóa volume.

#### Bước 5 — Kiểm tra HTTPS và đăng nhập Keycloak

1. Mở **`https://auth.homespace.id.vn/admin/`**. Trình duyệt phải dùng đúng domain, chứng chỉ hợp lệ và hiện trang đăng nhập. Đăng nhập bằng `homespace` cùng `KEYCLOAK_ADMIN_PASSWORD` trong Dokploy Environment nếu database vừa được khởi tạo bằng cấu hình trên. Với database cũ, dùng tài khoản đã tồn tại; biến bootstrap không đổi tên user cũ.
2. Kiểm tra realm trên PowerShell:

   ```powershell
   $oidc = Invoke-RestMethod -Uri 'https://auth.homespace.id.vn/realms/homespace-platform/.well-known/openid-configuration'
   $oidc.issuer
   $oidc.authorization_endpoint
   ```

   Issuer cần là **`https://auth.homespace.id.vn/realms/homespace-platform`**. Endpoint đăng nhập cũng phải bắt đầu bằng domain HTTPS mới, không chứa `localhost`, domain cũ hoặc `:8080`.
3. Trong Admin Console, chọn realm **`homespace-platform`**. Vào **Clients → homespace-id → Settings** và **Clients → homespace-admin-id → Settings**, kiểm tra các URL ở bảng dưới rồi Save. Các client ứng dụng nằm trong `homespace-platform`; tài khoản quản trị Keycloak bootstrap thuộc realm `master`.

Realm mới được import từ image với `start --import-realm`. File import là `/opt/keycloak/data/import/homespace-platform-realm.json`, khớp realm `homespace-platform`. Realm đã tồn tại không được import đè; cập nhật client qua Admin Console. Không xóa database để chạy lại import.

| Client | Valid redirect URI | Web Origin |
| --- | --- | --- |
| `homespace-id` | `https://homespace.id.vn/*` | `https://homespace.id.vn` |
| `homespace-admin-id` | `https://admin.homespace.id.vn/*` | `https://admin.homespace.id.vn` |

Kiểm tra cả **Valid post logout redirect URIs** theo đúng frontend. Nếu client còn có URL local dành cho phát triển, giữ theo nhu cầu nhưng không dùng chúng làm đích đăng nhập production. Backend dùng issuer công khai ở trên; endpoint nội bộ như `http://keycloak:8080` chỉ dùng cho kết nối server khi cấu hình cho phép, không thay issuer bằng URL nội bộ.

#### Lỗi thường gặp khi mở domain Keycloak

| Hiện tượng | Kiểm tra trước |
| --- | --- |
| Không phân giải được domain | Bản ghi `auth`, nameserver đang có hiệu lực và cache DNS. |
| Traefik trả `404` ngay ở `/admin/` | Đúng Host, Service `keycloak`, Path `/`; đã Save domain và Deploy lại Compose chưa. |
| `502` / `504` | Keycloak healthy chưa, Container Port có phải `8080`, Traefik và Keycloak có chung `dokploy-network` không. |
| `ERR_TOO_MANY_REDIRECTS` | OneShield có đang dùng Flexible không; hostname Keycloak có đúng URL HTTPS; Path/Internal Path có bị thêm `/auth` hoặc `/admin` không. |
| Lỗi chứng chỉ hoặc OneShield báo máy chủ gốc lỗi | Chứng chỉ gốc đúng `auth.homespace.id.vn`, chưa hết hạn; DNS gốc đúng EC2; Traefik truy cập được từ proxy. Xem log cấp chứng chỉ. |
| Admin mở được nhưng OIDC realm trả `404` | Realm `homespace-platform` đã import chưa, image có đúng bản mới, log import có lỗi không. |
| Đăng nhập frontend báo `invalid_redirect_uri` | Đúng realm/client và redirect URI của frontend theo bảng; sửa client hiện có rồi Save. |
| User `homespace` không đăng nhập được | Database đã từng bootstrap bằng username khác hay chưa; kiểm tra tài khoản đang tồn tại, không reset database. |

### Domains và cập nhật độc lập

- Keycloak và các công cụ quản trị giữ trong Domains của Compose `hs-infra`.
- Domain `api.homespace.id.vn` nằm ở Application Gateway, container port 8080, path `/`, HTTPS.
- Domain `notification.homespace.id.vn` nằm ở Application Notification khi service đó được deploy, container port 8085, path `/socket.io` theo route ứng dụng.
- Core hiện chưa có domain public. Kiểm tra health trong container và kiểm thử REST qua Gateway sau khi Gateway được deploy.
- Mỗi Docker Hub repository gắn webhook của đúng Application trong tab Webhooks. GitHub Actions của backend chỉ build/test/push. Webhook Application có dạng `/api/deploy/TOKEN`; webhook infra Compose có `/api/deploy/compose/TOKEN`. Không dùng webhook infra để cập nhật Core.
- Sau publish, theo dõi deployment và health của Application tương ứng; không deploy lại cả infra khi chỉ thay backend.

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
| Web | `NEXT_PUBLIC_GATEWAY_BASE_URL` | `https://api.homespace.id.vn` |
| Web | `NEXT_PUBLIC_KEYCLOAK_BASE_URL` | `https://auth.homespace.id.vn` |
| Web | `NEXT_PUBLIC_KEYCLOAK_REALM` | `homespace-platform` |
| Web | `NEXT_PUBLIC_KEYCLOAK_CLIENT_ID` | `homespace-id` |
| Web | `NEXT_PUBLIC_SITE_URL` | `https://homespace.id.vn` |
| Web | `NEXT_PUBLIC_NOTIFICATION_SOCKET_URL` | `https://notification.homespace.id.vn` |
| Admin | `VITE_GATEWAY_BASE_URL` | `https://api.homespace.id.vn` |
| Admin | `VITE_KEYCLOAK_BASE_URL` | `https://auth.homespace.id.vn` |
| Admin | `VITE_KEYCLOAK_REALM` | `homespace-platform` |
| Admin | `VITE_KEYCLOAK_CLIENT_ID` | `homespace-admin-id` |
| Admin | `VITE_WEB_APP_URL` | `https://homespace.id.vn` |

### Gắn domain production

1. Mở project `homespace-web` → **Settings → Domains → Add Domain**. Nhập `homespace.id.vn`, gán domain cho **Production** và mở phần DNS instructions. Tạo bản ghi được Vercel yêu cầu trong DNS zone `homespace.id.vn`.
2. Làm tương tự cho project `homespace-admin` với `admin.homespace.id.vn`. Nếu Vercel yêu cầu TXT để xác minh quyền sở hữu, thêm đúng record host và value mà màn hình hiển thị.
3. Chờ cả hai domain báo **Valid Configuration** và HTTPS hoạt động. Dùng hai domain chính thức để kiểm tra login vì Keycloak và Gateway đã được cấu hình theo chúng.
4. Mở `https://homespace.id.vn` và `https://admin.homespace.id.vn/settings/account-security`. Kiểm tra cả trang tĩnh `/silent-check-sso.html` và `/firebase-messaging-sw.js` trên mỗi domain. Hai URL này cần trả đúng file tĩnh, gồm HTML SSO và JavaScript service worker.

**Kết quả cần thấy:** hai project có Production deployment thành công, domain riêng có HTTPS, trang con admin mở được khi dán URL trực tiếp.

[Git trên Vercel](https://vercel.com/docs/git) · [Biến môi trường](https://vercel.com/docs/environment-variables) · [SPA rewrite cho Vite](https://vercel.com/docs/frameworks/frontend/vite)

## 6. Kiểm tra trước khi mở truy cập

### Kiểm thử theo vai trò và luồng người dùng

- [ ] **Backend:** chạy lại ba lệnh ở mục **Deploy lần đầu và xác minh backend**. Gateway readiness trả `UP`, danh sách tin trả HTTP `200` qua Core, OIDC discovery trả issuer đúng domain Auth. Thử từ một mạng khác để kiểm tra đường đi công cộng.
- [ ] **Người dùng và admin:** mở hai profile trình duyệt riêng. Đăng nhập, đăng xuất, tải lại trang và hoàn thành onboarding bằng tài khoản thử. Kiểm tra người dùng thường bị từ chối ở trang hoặc API quản trị. Xác nhận tài khoản admin bootstrap có quyền phù hợp.
- [ ] **Socket.IO:** mở **DevTools → Network → WS**. Trên web, xác nhận notification socket đến `notification.homespace.id.vn/socket.io/`. Trên admin, xác nhận notification socket đến `api.homespace.id.vn/api/v1/notifications/socket.io/`. Với WebSocket upgrade, trạng thái thường là `101`. Gửi chat giữa hai tài khoản, rồi thử một nghiệp vụ có thông báo để kiểm tra realtime và Kafka. Chat vẫn dùng trạng thái chưa đọc riêng của hội thoại.
- [ ] **Hợp đồng và thanh toán:** dùng dữ liệu thử để upload tệp, tạo PDF qua Gotenberg và thử các luồng VNPT, SmartCA, SePay đang bật. Với webhook, đối chiếu kết quả trong dashboard nhà cung cấp và log backend, đồng thời xác nhận trạng thái nghiệp vụ đã cập nhật trong UI.
- [ ] **Core mất kết nối:** trên môi trường thử, kiểm tra Gateway và hai frontend khi Core dừng, rồi xác nhận phục hồi khi Core lên lại. Hai frontend hiện đọc `/api/v1/actuator/health` của Gateway. Nếu Gateway vẫn `UP` khi Core đã dừng, cần nối tình trạng Core vào endpoint frontend đang đọc để đáp ứng yêu cầu chặn truy cập khi Core down.
- [ ] **CI/CD và dữ liệu:** với infra Git, chờ publish image thành công rồi Deploy; xác nhận Dokploy lấy đúng YAML từ `master`, pull image mới và dữ liệu vẫn còn. Kiểm tra webhook Docker Hub riêng cho từng Application Docker; không dùng nó cho Compose Git. Sửa một thay đổi phù hợp trên frontend để xác nhận Vercel deploy từ `master`.

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
