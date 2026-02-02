// API Request Types
export interface ChiPayload {
  ngay: string;        // YYYY-MM-DD
  so_tien: number;     // > 0 (tổng nghìn)
  mo_ta: string;
  loai_chi: string;    // từ loai_chi
  nguon_tien: string;  // từ nguon_tien
}

export interface ChiRequest {
  type: "chi";
  payload: ChiPayload;
}

export interface ThuPayload {
  ngay: string;        // YYYY-MM-DD
  so_tien: number;     // > 0 (VNĐ, app *1000)
  mo_ta: string;
  loai_thu: string;    // string tự do
  nguon_tien: string;  // từ nguon_tien
}

export interface ThuRequest {
  type: "thu";
  payload: ThuPayload;
}

export interface TKDetail {
  nguon_tien: string; // từ nguon_tien
  so_du_tt: number;   // >= 0 (VNĐ)
}

export interface TKPayload {
  session_id: string;     // vd: s4
  ngay_tk: string;        // YYYY-MM-DD
  so_du_lt: number;       // load từ Sheet (VNĐ)
  chi_tiet: TKDetail[];   // >= 1 dòng
  note?: string;          // optional
}

export interface TKRequest {
  type: "tk";
  payload: TKPayload;
}

export type AppRequest = ChiRequest | ThuRequest | TKRequest;

// UI Types
export interface NguonTien {
  ten_nguon_tien: string;
  icon?: string;
  active: boolean;
}

export interface LoaiChi {
  ten_loai_chi: string;
  active: boolean;
  sort_order?: number;
}

export interface TempItem {
  id: string;
  value: number;
}

export interface LastExpense {
  moTa: string;
  thu: string; // "Thứ hai", "Thứ ba"...
  ngay: string; // dd/mm/yyyy
  soTien: number; // nghìn
  soDu: number; // VNĐ
}

export interface TKInput {
  nguonTien: string;
  soDuTT: string; // String để format được
}

export interface TKResult {
  soDuLT: number;
  soDuTT: number;
  chenhLech: number;
  chiTietChi: Record<string, { total: number; items: any[] }>;
  ngayBatDau: Date;
  ngayKetThuc: Date;
}

export interface ChiTieuRecord {
  id: string;
  chi_tieu: string;
  loai_chi: string;
  nguon_tien: string;
  so_tien_nghin: number;
  so_tien_vnd: number;
  ngay: string;
  so_du_lt: number;
}

export interface ThuRecord {
  id: string;
  thu_vnd: number;
  ngay: string;
  mo_ta: string;
  nguon_tien: string;
  loai_thu: string;
  tong_thu: number;
}
