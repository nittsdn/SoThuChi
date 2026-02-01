# Sổ Thu Chi

Ứng dụng web quản lý thu chi cá nhân kết nối với Google Sheets.

## Tính năng

### 📉 Phần Chi (Expenses)
- Nhập số tiền chi tiêu
- Thêm vào danh sách tạm thời
- Chỉnh sửa các khoản chi đã thêm bằng cách nhấn vào
- Chọn mô tả từ 8 checkbox phổ biến, dropdown hoặc nhập tùy chỉnh
- Xóa tất cả các khoản chi trong danh sách tạm
- Thêm vào Google Sheets và hiển thị thông báo thành công

### 📈 Phần Thu (Income)
- Nhập số tiền thu nhập
- Thêm vào danh sách tạm thời
- Chọn mô tả từ dropdown hoặc nhập tùy chỉnh
- Thêm vào Google Sheets và hiển thị thông báo thành công

### 📊 Phần Tổng kết (Summary)
- Hiển thị tổng kết cuối cùng từ Google Sheets
- Tạo tổng kết mới: Tính số dư hiện tại, nhập số dư thực tế các tài khoản
- Tính và hiển thị chênh lệch
- Lưu tổng kết vào Google Sheets

### ⚙️ Cài đặt
- Chọn 8 mô tả chi tiêu phổ biến từ tất cả các mô tả trong sheet
- Lưu cài đặt vào localStorage

## Công nghệ sử dụng

- HTML5
- CSS3 (iOS-inspired design)
- Vanilla JavaScript
- Google Sheets API (CSV export)
- PWA-ready (có thể thêm vào màn hình chính iOS)

## Cách sử dụng

1. Mở trang web trên trình duyệt
2. Ứng dụng sẽ tự động tải dữ liệu từ Google Sheets
3. Thêm các khoản thu chi
4. Xem số dư và tổng kết

## Lưu ý

- Ứng dụng sử dụng Google Sheets Published CSV để đọc dữ liệu
- Để ghi dữ liệu vào sheet, cần tích hợp Google Sheets API với authentication
- Hiện tại ghi dữ liệu đang ở chế độ demo (chỉ hiển thị thông báo thành công)

## Tương thích

- iOS Safari (PWA-ready)
- Chrome/Edge (Desktop & Mobile)
- Firefox
- Responsive design cho mọi kích thước màn hình

## Cấu trúc file

- `index.html` - Trang chính
- `app.js` - Logic ứng dụng
- `style.css` - Giao diện iOS-inspired
- `manifest.json` - PWA manifest
- `Link sothuchi.txt` - Link Google Sheets

## License

MIT
