import axios from 'axios';
import type { AppRequest, ChiTieuRecord, LoaiChi, NguonTien } from '../types';
import { parseCSV } from '../utils/csv';

export const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-_-I6LLrifbZZPscBDUN9jufEyYrtf2tIIjtGihIScCU2tFp-HtuIgLkw6NqU0mUfOsEe9lIBTnIc/pub?gid=1944311512&single=true&output=csv';
export const GAS_URL = 'https://script.google.com/macros/s/AKfycbzjor1H_-TcN6hDtV2_P4yhSyi46zpoHZsy2WIaT-hJfoZbC0ircbB9zi3YIO388d1Q/exec';

// Fetch CSV data
export const fetchCSV = async (url: string): Promise<string> => {
  const response = await axios.get(url);
  return response.data;
};

// Submit data to Google Sheets
export const submitData = async (data: AppRequest): Promise<any> => {
  const response = await axios.post(GAS_URL, data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.data;
};

// Load Chi Tieu data
export const loadChiTieu = async (): Promise<ChiTieuRecord[]> => {
  try {
    const csv = await fetchCSV(CSV_URL);
    const rows = parseCSV(csv);
    
    // Skip header row
    const dataRows = rows.slice(1);
    
    return dataRows.map((row, index) => ({
      id: row[0] || `C${index + 1}`,
      chi_tieu: row[1] || '',
      loai_chi: row[2] || '',
      nguon_tien: row[3] || '',
      so_tien_nghin: parseFloat(row[4]) || 0,
      so_tien_vnd: parseFloat(row[5]) || 0,
      ngay: row[6] || '',
      so_du_lt: parseFloat(row[7]) || 0,
    }));
  } catch (error) {
    console.error('Error loading chi tieu:', error);
    return [];
  }
};

// Load last expense
export const loadLastExpense = async () => {
  const data = await loadChiTieu();
  if (data.length === 0) return null;
  
  const last = data[data.length - 1];
  return last;
};

// Load Loai Chi
export const loadLoaiChi = async (): Promise<LoaiChi[]> => {
  try {
    // In a real implementation, this would fetch from a different CSV or sheet
    // For now, return mock data
    return [
      { ten_loai_chi: 'Ăn uống', active: true, sort_order: 1 },
      { ten_loai_chi: 'Đi lại', active: true, sort_order: 2 },
      { ten_loai_chi: 'Mua sắm', active: true, sort_order: 3 },
      { ten_loai_chi: 'Giải trí', active: true, sort_order: 4 },
      { ten_loai_chi: 'Sức khỏe', active: true, sort_order: 5 },
      { ten_loai_chi: 'Học tập', active: true, sort_order: 6 },
      { ten_loai_chi: 'Nhà ở', active: true, sort_order: 7 },
      { ten_loai_chi: 'Khác', active: true, sort_order: 8 },
    ];
  } catch (error) {
    console.error('Error loading loai chi:', error);
    return [];
  }
};

// Load Nguon Tien
export const loadNguonTien = async (): Promise<NguonTien[]> => {
  try {
    // In a real implementation, this would fetch from a different CSV or sheet
    // For now, return mock data
    return [
      { ten_nguon_tien: 'Tiền mặt', icon: '💵', active: true },
      { ten_nguon_tien: 'Ngân hàng', icon: '🏦', active: true },
      { ten_nguon_tien: 'Ví điện tử', icon: '💳', active: true },
    ];
  } catch (error) {
    console.error('Error loading nguon tien:', error);
    return [];
  }
};
