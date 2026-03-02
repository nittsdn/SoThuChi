-- ============================================================
-- MIGRATION V3 – Chuẩn hoá tên ID các bảng chi + loai_thu/thu
-- Chạy trong Supabase SQL Editor
-- ============================================================
-- Thay đổi:
--   nhom_chi.id          → id_nc
--   phan_loai_chi.id     → id_plc
--   phan_loai_chi.id_nhom → id_nc
--   loai_chi             → đổi tên bảng thành mo_ta_chi
--   loai_chi.id_chi      → id_mtc  (trở thành PK TEXT)
--   loai_chi.id_phanloai → id_plc
--   loai_chi.id (serial) → xoá
--   chi_tieu.id (serial) → xoá, id_chi làm PK
--   chi_tieu.mo_ta_chi   → xoá (thay bằng id_mtc FK)
--   loai_thu.id_loaithu  → id_lt
--   thu.id_loaithu       → id_lt
-- ============================================================

-- BƯỚC 0: Drop views phụ thuộc
DROP VIEW IF EXISTS v_Chi_Tieu_2026 CASCADE;
DROP VIEW IF EXISTS v_Thu_2026 CASCADE;
DROP VIEW IF EXISTS v_loai_chi CASCADE;
DROP VIEW IF EXISTS v_so_du_theo_nguon CASCADE;
DROP VIEW IF EXISTS v_nguon_tien CASCADE;

-- ============================================================
-- BƯỚC 1: nhom_chi — rename id → id_nc
-- ============================================================
ALTER TABLE nhom_chi RENAME COLUMN id TO id_nc;

-- ============================================================
-- BƯỚC 2: phan_loai_chi — rename id → id_plc, id_nhom → id_nc
-- ============================================================
ALTER TABLE phan_loai_chi RENAME COLUMN id TO id_plc;
ALTER TABLE phan_loai_chi RENAME COLUMN id_nhom TO id_nc;

-- ============================================================
-- BƯỚC 3: loai_chi → mo_ta_chi, id_chi → id_mtc, id_phanloai → id_plc
-- ============================================================

-- 3a: Đổi tên bảng
ALTER TABLE loai_chi RENAME TO mo_ta_chi;

-- 3b: Đổi id_chi TEXT UNIQUE → id_mtc TEXT PRIMARY KEY
-- Xoá PK cũ (serial id), rồi biến id_chi thành PK mới
ALTER TABLE mo_ta_chi DROP CONSTRAINT loai_chi_pkey;   -- PK trên id serial
ALTER TABLE mo_ta_chi DROP COLUMN id;                  -- xoá serial

-- Đổi tên cột
ALTER TABLE mo_ta_chi RENAME COLUMN id_chi      TO id_mtc;
ALTER TABLE mo_ta_chi RENAME COLUMN id_phanloai TO id_plc;

-- Gán id_mtc làm PK
ALTER TABLE mo_ta_chi DROP CONSTRAINT IF EXISTS loai_chi_id_chi_key;  -- UNIQUE
ALTER TABLE mo_ta_chi ADD PRIMARY KEY (id_mtc);

-- Update FK từ id_plc sang phan_loai_chi(id_plc)
-- (FK tự nhận biết column rename, nhưng constraint name cần check)
-- Nếu có FK cũ tên loai_chi_id_phanloai_fkey → tự cập nhật chiều tham chiếu
-- (PostgreSQL tự theo dõi column rename → không cần drop/recreate FK thông thường)

-- ============================================================
-- BƯỚC 4: chi_tieu — thêm id_mtc FK, xoá mo_ta_chi + serial id
-- ============================================================

-- 4a: Thêm cột id_mtc
ALTER TABLE chi_tieu ADD COLUMN id_mtc TEXT;

-- 4b: Populate id_mtc từ mo_ta_chi bằng cách match text
UPDATE chi_tieu ct
SET id_mtc = mc.id_mtc
FROM mo_ta_chi mc
WHERE mc.mo_ta_chi = ct.mo_ta_chi;

-- 4c: Kiểm tra bao nhiêu dòng không map được (nên = 0)
DO $$
DECLARE cnt INT;
BEGIN
  SELECT COUNT(*) INTO cnt FROM chi_tieu WHERE id_mtc IS NULL;
  IF cnt > 0 THEN
    RAISE WARNING '⚠ % dòng chi_tieu không map được id_mtc!', cnt;
  END IF;
END $$;

-- 4d: Set NOT NULL + FK
ALTER TABLE chi_tieu ALTER COLUMN id_mtc SET NOT NULL;
ALTER TABLE chi_tieu ADD CONSTRAINT chi_tieu_id_mtc_fkey
  FOREIGN KEY (id_mtc) REFERENCES mo_ta_chi(id_mtc);

-- 4e: Xoá serial id, biến id_chi thành PK
ALTER TABLE chi_tieu DROP CONSTRAINT chi_tieu_pkey;  -- PK trên id serial
ALTER TABLE chi_tieu DROP COLUMN id;
ALTER TABLE chi_tieu DROP CONSTRAINT IF EXISTS chi_tieu_id_chi_key; -- UNIQUE
ALTER TABLE chi_tieu ADD PRIMARY KEY (id_chi);

-- 4f: Xoá cột mo_ta_chi TEXT cũ
ALTER TABLE chi_tieu DROP COLUMN mo_ta_chi;

-- ============================================================
-- BƯỚC 5: loai_thu — rename id_loaithu → id_lt
-- ============================================================
ALTER TABLE loai_thu RENAME COLUMN id_loaithu TO id_lt;

-- ============================================================
-- BƯỚC 6: thu — rename id_loaithu → id_lt
-- ============================================================
ALTER TABLE thu RENAME COLUMN id_loaithu TO id_lt;

-- ============================================================
-- BƯỚC 7: Recreate views
-- ============================================================

CREATE OR REPLACE VIEW v_loai_chi AS
SELECT
  lc.id_mtc,
  lc.mo_ta_chi,
  pl.ten_phanloai  AS phan_loai,
  nh.ten_nhom      AS nhom,
  lc.icon,
  lc.active,
  lc.sort_order,
  lc.note
FROM mo_ta_chi lc
JOIN phan_loai_chi pl ON pl.id_plc = lc.id_plc
JOIN nhom_chi      nh ON nh.id_nc  = pl.id_nc
ORDER BY lc.sort_order DESC, lc.mo_ta_chi ASC;

CREATE OR REPLACE VIEW v_nguon_tien AS
SELECT nguon_tien, nguoi, nhom, icon, active, sort_order, note
FROM nguon_tien
WHERE active = TRUE
ORDER BY sort_order ASC, nguon_tien ASC;

CREATE OR REPLACE VIEW v_Chi_Tieu_2026 AS
SELECT
  c.id_chi                                        AS "IDChi",
  mtc.mo_ta_chi,
  c.nguon_tien                                    AS "Nguồn tiền",
  c.formula                                       AS "Nghìn VND",
  c.so_tien_vnd                                   AS "Số tiền vnđ",
  c.ngay                                          AS "Ngày",
  COALESCE((SELECT SUM(so_tien)       FROM thu),   0)
  - COALESCE((SELECT SUM(so_tien_vnd) FROM chi_tieu), 0)
                                                  AS "Số dư lý thuyết",
  c.so_tien_nghin,
  c.created_at
FROM chi_tieu c
JOIN mo_ta_chi mtc ON mtc.id_mtc = c.id_mtc
ORDER BY c.ngay DESC, c.created_at DESC;

CREATE OR REPLACE VIEW v_Thu_2026 AS
SELECT
  t.so_tien                                       AS "Thu",
  t.ngay                                          AS "Ngày",
  COALESCE(t.ghi_chu, lt.mo_ta_thu)               AS "Mô tả",
  t.nguon_tien                                    AS "Nguồn tiền",
  lt.loai_thu                                     AS "Loại thu",
  lt.mo_ta_thu                                    AS "Mo ta thu",
  t.id_lt,
  SUM(t.so_tien) OVER (ORDER BY t.ngay ASC,
                                t.created_at ASC) AS "Tổng thu",
  t.id_thu                                        AS "IDThu",
  t.created_at
FROM thu t
JOIN loai_thu lt ON lt.id_lt = t.id_lt
ORDER BY t.ngay DESC, t.created_at DESC;

CREATE OR REPLACE VIEW v_so_du_theo_nguon AS
WITH chi_by_nguon AS (
  SELECT nguon_tien, SUM(so_tien_vnd) AS tong_chi
  FROM chi_tieu GROUP BY nguon_tien
),
thu_by_nguon AS (
  SELECT nguon_tien, SUM(so_tien) AS tong_thu
  FROM thu GROUP BY nguon_tien
),
last_tk AS (
  SELECT DISTINCT ON (d.nguon_tien)
    d.nguon_tien,
    d.so_tien          AS so_du_tt_last,
    s.ngay_tk
  FROM tk_detail d
  JOIN tk_session s ON s.session_id = d.session_id
  ORDER BY d.nguon_tien, s.ngay_tk DESC
)
SELECT
  n.nguon_tien,
  n.nguoi,
  n.nhom,
  n.icon,
  COALESCE(lt.so_du_tt_last, 0)                     AS so_du_dau_ky,
  lt.ngay_tk                                        AS ngay_dau_ky,
  COALESCE(thu.tong_thu, 0)                         AS tong_thu,
  COALESCE(chi.tong_chi, 0)                         AS tong_chi,
  COALESCE(lt.so_du_tt_last, 0)
    + COALESCE(thu.tong_thu, 0)
    - COALESCE(chi.tong_chi, 0)                     AS so_du_ly_thuyet
FROM nguon_tien n
LEFT JOIN chi_by_nguon chi ON chi.nguon_tien = n.nguon_tien
LEFT JOIN thu_by_nguon thu ON thu.nguon_tien = n.nguon_tien
LEFT JOIN last_tk lt       ON lt.nguon_tien  = n.nguon_tien
WHERE n.active = TRUE
ORDER BY n.sort_order ASC;

-- ============================================================
-- BƯỚC 8: Tắt RLS + grant
-- ============================================================
ALTER TABLE nhom_chi       DISABLE ROW LEVEL SECURITY;
ALTER TABLE phan_loai_chi  DISABLE ROW LEVEL SECURITY;
ALTER TABLE mo_ta_chi      DISABLE ROW LEVEL SECURITY;
ALTER TABLE loai_thu       DISABLE ROW LEVEL SECURITY;
ALTER TABLE nguon_tien     DISABLE ROW LEVEL SECURITY;
ALTER TABLE chi_tieu       DISABLE ROW LEVEL SECURITY;
ALTER TABLE thu            DISABLE ROW LEVEL SECURITY;
ALTER TABLE tk_session     DISABLE ROW LEVEL SECURITY;
ALTER TABLE tk_detail      DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
