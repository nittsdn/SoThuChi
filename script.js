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
            // Lấy dòng chi cuối và format theo yêu cầu
            for (let i = rows.length - 1; i > 0; i--) {
                const money = rows[i][3] ? parseFloat(rows[i][3].replace(/[\."]/g, '')) : 0;
                if (money > 0) {
                    const dateStr = rows[i][4] ? rows[i][4].replace(/"/g, '').trim() : '';
                    let d = null;
                    if (dateStr) {
                        // Parse dateStr dạng dd/mm/yyyy (ví dụ "30/01/2026")
                        const parts = dateStr.split('/');
                        if (parts.length === 3) {
                            const day = parseInt(parts[0], 10);
                            const month = parseInt(parts[1], 10) - 1; // JS month 0-based
                            const year = parseInt(parts[2], 10);
                            d = new Date(year, month, day);
                        }
                    }
                    let formattedWeekday = 'Không xác định';
                    let formattedDate = 'Không xác định';
                    if (d && !isNaN(d.getTime())) {
                        formattedWeekday = d.toLocaleDateString('vi-VN', { weekday: 'long' });
                        const datePart = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        formattedDate = datePart.replace(/\//g, '.');
                    }
                    const desc = rows[i][1] ? rows[i][1].replace(/"/g, '').trim() : '';
                    lastChi = `Chi tiêu cuối ${formattedWeekday} ngày ${formattedDate}: ${desc} tổng ${money.toLocaleString()} đ`;
                    break;
                }
            }
        }
        document.getElementById('balance').innerText = (thu - chi).toLocaleString('vi-VN') + ' đ';
        document.getElementById('last-trans').innerText = lastChi;
    } catch (e) { console.error(e); }
}

// ... (phần còn lại file giữ nguyên)