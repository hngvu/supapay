Microservice chuyên biệt để xử lý thanh toán chuyển khoản ngân hàng tự động (QR Code) sử dụng **SePay** và **Supabase**. Dịch vụ được xây dựng trên nền tảng **Fastify** để đảm bảo hiệu năng cao, độ trễ thấp và dễ dàng mở rộng.

## 🌟 Tính năng chính

* **Tạo mã QR thanh toán:** Sinh nội dung chuyển khoản (Content) ngắn gọn, unique (6 ký tự) và trả về link QR SePay.
* **Xử lý Webhook tự động:** Nhận thông báo biến động số dư từ SePay ngay lập tức.
* **Quản lý trạng thái thông minh:** Tự động phát hiện các trạng thái:
    * `SUCCESS`: Thanh toán đủ tiền, đúng giờ.
    * `LATE_PAYMENT`: Thanh toán đủ tiền nhưng quá hạn (Timeout).
    * `PARTIAL_PAID`: Thanh toán thiếu tiền.
    * `EXPIRED`: Đơn hàng hết hạn chưa thanh toán.
* **Bảo mật 2 lớp:**
    * **Internal API:** Bảo vệ endpoint tạo đơn bằng `x-api-key`.
    * **Webhook Security:** Xác thực request từ SePay bằng `Authorization Bearer`.
* **API Documentation:** Tích hợp sẵn Swagger UI.

---

## 🛠 Tech Stack

* **Runtime:** Node.js
* **Framework:** Fastify v4
* **Database:** Supabase (PostgreSQL)
* **Docs:** Swagger / OpenAPI
* **Payment Gateway:** SePay.vn