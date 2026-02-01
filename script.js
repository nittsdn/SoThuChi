// ... (phần đầu file giữ nguyên)

async function loadSheetData() {
    try {
        const res = await fetch(CSV_URL);
        const text = await res.text();
        const rows = text.split('\n').map(r => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/));
        let thu = 0, chi = 0, lastChi = "Chưa có dữ liệu";

        if (rows.length > 1) {
            rows.slice(1).forEach(r => {
                const cVal = r[3] ? r[3].replace(/[\."]/g, '') : "0";
                const tVal = r[9] ? r[9].replace(/[\."]/g, '') : "0";
                chi += parseFloat(cVal) || 0; thu += parseFloat(tVal) || 0;
            });
            
            // Tìm ngày cuối cùng có chi tiêu và lấy tất cả chi tiêu trong ngày đó
            let lastDate = null;
            let lastDateTransactions = [];
            
            for (let i = rows.length - 1; i > 0; i--) {
                const money = rows[i][3] ? parseFloat(rows[i][3].replace(/[\."]/g, '')) : 0;
                if (money > 0) {
                    const dateStr = rows[i][4] ? rows[i][4].replace(/"/g, '').trim() : '';
                    
                    if (!lastDate) {
                        lastDate = dateStr;
                    }
                    
                    // Nếu cùng ngày cuối cùng, thêm vào mảng
                    if (dateStr === lastDate) {
                        const desc = rows[i][1] ? rows[i][1].replace(/"/g, '').trim() : '';
                        lastDateTransactions.unshift({ desc, money }); // unshift để giữ thứ tự đúng
                    } else {
                        break; // Đã qua ngày khác
                    }
                }
            }
            
            // Format hiển thị
            if (lastDateTransactions.length > 0) {
                // Parse date từ format "Thứ Hai- 05/1/26"
                let formattedWeekday = 'Không xác định';
                let formattedDate = 'Không xác định';
                
                if (lastDate) {
                    const dateParts = lastDate.split('- ');
                    if (dateParts.length === 2) {
                        formattedWeekday = dateParts[0].trim();
                        
                        // Parse dd/mm/yy
                        const dmyParts = dateParts[1].split('/');
                        if (dmyParts.length === 3) {
                            const day = dmyParts[0].padStart(2, '0');
                            const month = dmyParts[1].padStart(2, '0');
                            let year = dmyParts[2];
                            // Nếu năm 2 số, chuyển thành 4 số
                            if (year.length === 2) {
                                year = '20' + year;
                            }
                            formattedDate = `${day}.${month}.${year}`;
                        }
                    }
                }
                
                // Tạo danh sách mô tả
                const descriptions = lastDateTransactions.map(t => t.desc).join(', ');
                
                // Tạo danh sách số tiền
                const amounts = lastDateTransactions.map(t => t.money.toLocaleString()).join(' + ');
                
                // Tính tổng
                const total = lastDateTransactions.reduce((sum, t) => sum + t.money, 0);
                
                // Format cuối cùng
                lastChi = `Chi tiêu cuối ${formattedWeekday} ngày ${formattedDate}: ${descriptions} ${amounts} = ${total.toLocaleString()} vnđ`;
            }
        }
        
        document.getElementById('balance').innerText = (thu - chi).toLocaleString('vi-VN') + ' đ';
        document.getElementById('last-trans').innerText = lastChi;
    } catch (e) { 
        console.error(e); 
        document.getElementById('last-trans').innerText = "Lỗi tải dữ liệu";
    }
}

// ... (phần còn lại file giữ nguyên)