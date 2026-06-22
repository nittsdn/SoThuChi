-- ============================================================
-- MIGRATION V4 – tk_draft + tk_session enhancements
-- Chạy trong Supabase SQL Editor
-- ============================================================
-- Thay đổi:
--   1. Tạo bảng tk_draft (lưu SDTT từng nguồn tiền, upsert theo ngày+nguồn)
--   2. Thêm cột data_cutoff_at, tong_thu_ky, tong_chi_ky vào tk_session
-- ============================================================

-- ============================================================
-- BƯỚC 1: Tạo bảng tk_draft
-- Mỗi hàng = 1 nguồn tiền × 1 ngày làm TK
-- Upsert (ngay_tk, nguon_tien) → nhiều thiết bị save độc lập
-- ============================================================
CREATE TABLE IF NOT EXISTS tk_draft (
  ngay_tk      DATE        NOT NULL,
  nguon_tien   TEXT        NOT NULL REFERENCES nguon_tien(nguon_tien) ON UPDATE CASCADE ON DELETE CASCADE,
  sdtt         BIGINT      NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ngay_tk, nguon_tien)
);

-- ============================================================
-- BƯỚC 2: Thêm cột vào tk_session
-- data_cutoff_at: timestamp lúc bấm xác nhận → dùng để load lại giao dịch của kỳ
-- tong_thu_ky:    tổng thu trong kỳ (snapshot tại thời điểm chốt)
-- tong_chi_ky:    tổng chi trong kỳ (snapshot tại thời điểm chốt)
-- ============================================================
ALTER TABLE tk_session
  ADD COLUMN IF NOT EXISTS data_cutoff_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tong_thu_ky    BIGINT,
  ADD COLUMN IF NOT EXISTS tong_chi_ky    BIGINT;

-- ============================================================
-- BƯỚC 3: Tắt RLS + Grant quyền
-- (nhất quán với toàn bộ bảng khác trong app — dùng anon key trực tiếp)
-- ============================================================
ALTER TABLE tk_draft DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON tk_draft TO anon;
