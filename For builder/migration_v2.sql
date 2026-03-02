-- ============================================================
-- MIGRATION v2: Redesign loai_thu, nguon_tien, thu
-- Chạy trong Supabase SQL Editor
-- ============================================================

-- ============================================================
-- BƯỚC 1: Drop views phụ thuộc trước
-- ============================================================
DROP VIEW IF EXISTS v_Thu_2026 CASCADE;
DROP VIEW IF EXISTS v_Chi_Tieu_2026 CASCADE;
DROP VIEW IF EXISTS v_so_du_theo_nguon CASCADE;
DROP VIEW IF EXISTS v_nguon_tien CASCADE;

-- ============================================================
-- BƯỚC 2: Tạo bảng loai_thu mới (thiết kế lại)
-- ============================================================
DROP TABLE IF EXISTS loai_thu CASCADE;

CREATE TABLE loai_thu (
  id_loaithu  TEXT NOT NULL PRIMARY KEY,   -- lt_1, lt_2...
  mo_ta_thu   TEXT NOT NULL UNIQUE,         -- Lãi HD, Lương...
  loai_thu    TEXT NOT NULL,               -- nhóm: Ngân hàng, Lương...
  icon        TEXT NOT NULL DEFAULT '',
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- BƯỚC 3: Extract loai_thu từ data thực trong bảng thu
-- (distinct Mô tả + Loại thu)
-- ============================================================
INSERT INTO loai_thu (id_loaithu, mo_ta_thu, loai_thu)
SELECT
  'lt_' || ROW_NUMBER() OVER (ORDER BY mo_ta),
  mo_ta,
  loai_thu
FROM (
  SELECT DISTINCT mo_ta, loai_thu
  FROM thu
  WHERE mo_ta IS NOT NULL AND mo_ta <> ''
) sub
ON CONFLICT DO NOTHING;

-- ============================================================
-- BƯỚC 4: Redesign bảng nguon_tien
-- PK = nguon_tien (text), bỏ id serial
-- ============================================================

-- Tạo bảng mới
CREATE TABLE nguon_tien_new (
  nguon_tien TEXT NOT NULL PRIMARY KEY,
  nguoi      TEXT,
  nhom       TEXT,
  icon       TEXT NOT NULL DEFAULT '',
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  note       TEXT
);

-- Copy data (ten → nguon_tien)
INSERT INTO nguon_tien_new
SELECT ten, nguoi, nhom, icon, active, sort_order, note
FROM nguon_tien;

-- ============================================================
-- BƯỚC 5: Tạo bảng thu mới với FK đúng
-- ============================================================

-- Backup data cũ
CREATE TEMP TABLE thu_backup AS SELECT * FROM thu;

-- Drop bảng cũ (có FK đến nguon_tien.ten)
DROP TABLE thu CASCADE;
DROP TABLE chi_tieu CASCADE;
DROP TABLE tk_detail CASCADE;

-- Drop và rename nguon_tien
DROP TABLE nguon_tien CASCADE;
ALTER TABLE nguon_tien_new RENAME TO nguon_tien;

-- Tạo lại chi_tieu với FK mới
CREATE TABLE chi_tieu (
  id            SERIAL PRIMARY KEY,
  id_chi        TEXT NOT NULL UNIQUE,
  mo_ta_chi     TEXT NOT NULL,
  nguon_tien    TEXT NOT NULL REFERENCES nguon_tien(nguon_tien),
  so_tien_nghin NUMERIC(18,6) NOT NULL,
  formula       TEXT,
  so_tien_vnd   BIGINT GENERATED ALWAYS AS (ROUND(so_tien_nghin * 1000)) STORED,
  ngay          DATE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chi_tieu_ngay  ON chi_tieu(ngay DESC);
CREATE INDEX idx_chi_tieu_nguon ON chi_tieu(nguon_tien);

-- Restore chi_tieu data ── dùng bảng backup nếu cần
-- (nếu bạn đã migrate chi_tieu trước đó, chạy bước này)

-- Tạo bảng thu mới
CREATE TABLE thu (
  id_thu      TEXT NOT NULL PRIMARY KEY,
  id_loaithu  TEXT NOT NULL REFERENCES loai_thu(id_loaithu),
  so_tien     BIGINT NOT NULL,
  ngay        DATE NOT NULL,
  nguon_tien  TEXT NOT NULL REFERENCES nguon_tien(nguon_tien),
  ghi_chu     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_thu_ngay ON thu(ngay DESC);

-- Migrate data từ backup: map mo_ta → id_loaithu
INSERT INTO thu (id_thu, id_loaithu, so_tien, ngay, nguon_tien, ghi_chu, created_at)
SELECT
  b.id_thu,
  lt.id_loaithu,
  b.so_tien,
  b.ngay,
  b.nguon_tien,
  NULL,   -- ghi_chu (data cũ không có)
  b.created_at
FROM thu_backup b
JOIN loai_thu lt ON lt.mo_ta_thu = b.mo_ta
WHERE b.id_thu IS NOT NULL AND b.id_thu <> '';

-- Tạo lại tk_detail với FK mới
CREATE TABLE tk_detail (
  id          SERIAL PRIMARY KEY,
  session_id  TEXT NOT NULL REFERENCES tk_session(session_id),
  ngay_tk     DATE NOT NULL,
  nguon_tien  TEXT NOT NULL REFERENCES nguon_tien(nguon_tien),
  so_tien     BIGINT NOT NULL
);

-- ============================================================
-- BƯỚC 6: Restore chi_tieu data từ backup (nếu có)
-- ============================================================
-- Nếu chi_tieu cũng bị drop, cần migrate lại từ GAS
-- Dùng migrate.html bước 3

-- ============================================================
-- BƯỚC 7: Tạo lại Views
-- ============================================================
CREATE OR REPLACE VIEW v_nguon_tien AS
SELECT nguon_tien, nguoi, nhom, icon, active, sort_order, note
FROM nguon_tien
WHERE active = TRUE
ORDER BY sort_order ASC, nguon_tien ASC;

CREATE OR REPLACE VIEW v_Chi_Tieu_2026 AS
SELECT
  c.id_chi                                        AS "IDChi",
  c.mo_ta_chi,
  c.nguon_tien                                    AS "Nguồn tiền",
  c.formula                                       AS "Nghìn VND",
  c.so_tien_vnd                                   AS "Số tiền vnđ",
  c.ngay                                          AS "Ngày",
  COALESCE((SELECT SUM(so_tien) FROM thu), 0)
  - COALESCE((SELECT SUM(so_tien_vnd) FROM chi_tieu), 0)
                                                  AS "Số dư lý thuyết",
  c.so_tien_nghin,
  c.created_at
FROM chi_tieu c
ORDER BY c.ngay DESC, c.created_at DESC;

CREATE OR REPLACE VIEW v_Thu_2026 AS
SELECT
  t.so_tien                                       AS "Thu",
  t.ngay                                          AS "Ngày",
  COALESCE(t.ghi_chu, lt.mo_ta_thu)               AS "Mô tả",
  t.nguon_tien                                    AS "Nguồn tiền",
  lt.loai_thu                                     AS "Loại thu",
  lt.mo_ta_thu                                    AS "Mo ta thu",
  SUM(t.so_tien) OVER (ORDER BY t.ngay ASC,
                                t.created_at ASC) AS "Tổng thu",
  t.id_thu                                        AS "IDThu",
  t.id_loaithu,
  t.created_at
FROM thu t
JOIN loai_thu lt ON lt.id_loaithu = t.id_loaithu
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
    d.so_tien AS so_du_tt_last,
    s.ngay_tk
  FROM tk_detail d
  JOIN tk_session s ON s.session_id = d.session_id
  ORDER BY d.nguon_tien, s.ngay_tk DESC
)
SELECT
  n.nguon_tien,
  n.nguoi, n.nhom, n.icon,
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
-- BƯỚC 8: Tắt RLS + Grant
-- ============================================================
ALTER TABLE loai_thu    DISABLE ROW LEVEL SECURITY;
ALTER TABLE nguon_tien  DISABLE ROW LEVEL SECURITY;
ALTER TABLE chi_tieu    DISABLE ROW LEVEL SECURITY;
ALTER TABLE thu         DISABLE ROW LEVEL SECURITY;
ALTER TABLE tk_detail   DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
