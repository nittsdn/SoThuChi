-- ============================================================
-- SUPABASE SCHEMA – Sổ Thu Chi
-- Project : https://vspfbfeazipxjgymxpzr.supabase.co
-- Version : 1.0.0
-- Nguyên tắc:
--   • Bảng thực lưu chuẩn (snake_case, có FK ràng buộc)
--   • Views trả về đúng tên field cũ → frontend không đổi gì
-- ============================================================

-- ============================================================
-- PHẦN 1: DANH MỤC CHI (3 cấp có FK)
-- nhom_chi → phan_loai_chi → loai_chi
-- ============================================================

CREATE TABLE nhom_chi (
  id_nc      SERIAL PRIMARY KEY,
  ten_nhom   TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  note       TEXT
);

INSERT INTO nhom_chi (ten_nhom, sort_order) VALUES
  ('Sinh hoạt', 1),
  ('Gia đình',  2),
  ('Cá nhân',   3),
  ('Bắt buộc',  4),
  ('Tài chính', 5),
  ('Khác',      6);

-- ------------------------------------------------------------

CREATE TABLE phan_loai_chi (
  id_plc       SERIAL PRIMARY KEY,
  ten_phanloai TEXT NOT NULL UNIQUE,
  id_nc        INTEGER NOT NULL REFERENCES nhom_chi(id_nc),
  sort_order   INTEGER NOT NULL DEFAULT 0,
  note         TEXT
);

INSERT INTO phan_loai_chi (ten_phanloai, id_nhom, sort_order) VALUES
  ('Ăn uống',         1, 1),
  ('Di chuyển',       1, 2),
  ('Điện',            1, 3),
  ('Nước',            1, 4),
  ('Internet',        1, 5),
  ('Mua sắm chung',   1, 6),
  ('Sức khỏe',        2, 1),
  ('Đám hiếu hỉ',    2, 2),
  ('Biểu tặng',       2, 3),
  ('Mua sắm cá nhân', 3, 1),
  ('Giải trí',        3, 2),
  ('Học hành',        3, 3),
  ('Nhà cửa',         4, 1),
  ('Phí ngân hàng',   4, 2),
  ('Sửa chữa',        4, 3),
  ('Gửi mẹ',          4, 4),
  ('Đầu tư',          5, 1),
  ('Cho mượn',        6, 1),
  ('Khác',            6, 2);

-- ------------------------------------------------------------
-- mo_ta_chi (trước là loai_chi)
-- sort_order: 0 = ẩn chip bar, 1–8 = vị trí chip
-- ------------------------------------------------------------

CREATE TABLE mo_ta_chi (
  id_mtc      TEXT NOT NULL PRIMARY KEY,    -- c1, c2...
  mo_ta_chi   TEXT NOT NULL,
  id_plc      INTEGER NOT NULL REFERENCES phan_loai_chi(id_plc),
  icon        TEXT NOT NULL DEFAULT '',
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  note        TEXT
);

-- View trả về đúng tên field cũ (frontend dùng phan_loai + nhom)
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

-- ============================================================
-- PHẦN 2: DANH MỤC THU
-- sort_order: 0 = ẩn, 1–8 = vị trí chip
-- ============================================================

CREATE TABLE loai_thu (
  id_lt       TEXT NOT NULL PRIMARY KEY,   -- lt_1, lt_2...
  mo_ta_thu   TEXT NOT NULL UNIQUE,         -- Lãi HD, Lương...
  loai_thu    TEXT NOT NULL,               -- nhóm: Ngân hàng, Lương...
  icon        TEXT NOT NULL DEFAULT '',
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- PHẦN 3: NGUỒN TIỀN
-- nguon_tien là khoá chính (text key nghiệp vụ)
-- ============================================================

CREATE TABLE nguon_tien (
  nguon_tien TEXT NOT NULL PRIMARY KEY,    -- tên tài khoản, vd: Tech Mèo
  nguoi      TEXT,
  nhom       TEXT,                          -- Bank / Cash / Ví
  icon       TEXT NOT NULL DEFAULT '',
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  note       TEXT
);

-- View giữ tương thích (không cần alias vì tên cột đã đúng)
CREATE OR REPLACE VIEW v_nguon_tien AS
SELECT
  nguon_tien,
  nguoi,
  nhom,
  icon,
  active,
  sort_order,
  note
FROM nguon_tien
WHERE active = TRUE
ORDER BY sort_order ASC, nguon_tien ASC;

-- ============================================================
-- PHẦN 4: CHI TIÊU
-- ============================================================

CREATE TABLE chi_tieu (
  id_chi        TEXT NOT NULL PRIMARY KEY,
  id_mtc        TEXT NOT NULL REFERENCES mo_ta_chi(id_mtc),
  nguon_tien    TEXT NOT NULL REFERENCES nguon_tien(nguon_tien),
  -- Lưu 2 dạng: số thực (để query) + công thức gốc (để hiển thị)
  so_tien_nghin NUMERIC(18,6) NOT NULL,     -- đơn vị NGHÌN VNĐ, vd: 4.5 = 4.500đ
  formula       TEXT,                       -- công thức gốc, vd: "=4+0.5"
  so_tien_vnd   BIGINT GENERATED ALWAYS AS
                  (ROUND(so_tien_nghin * 1000)) STORED,
  ngay          DATE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chi_tieu_ngay   ON chi_tieu(ngay DESC);
CREATE INDEX idx_chi_tieu_nguon  ON chi_tieu(nguon_tien);

-- ============================================================
-- PHẦN 5: THU NHẬP
-- ============================================================

CREATE TABLE thu (
  id_thu      TEXT NOT NULL PRIMARY KEY,
  id_lt       TEXT NOT NULL REFERENCES loai_thu(id_lt),
  so_tien     BIGINT NOT NULL,              -- VNĐ nguyên
  ngay        DATE NOT NULL,
  nguon_tien  TEXT NOT NULL REFERENCES nguon_tien(nguon_tien),
  ghi_chu     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_thu_ngay ON thu(ngay DESC);

-- View chi_tieu (đặt sau khi bảng thu đã tồn tại)
-- Số dư lý thuyết = tổng toàn bộ thu - tổng toàn bộ chi (cùng một giá trị cho mọi dòng)
CREATE OR REPLACE VIEW v_Chi_Tieu_2026 AS
SELECT
  c.id_chi                                        AS "IDChi",
  mtc.mo_ta_chi,
  c.nguon_tien                                    AS "Nguồn tiền",
  c.formula                                       AS "Nghìn VND",
  c.so_tien_vnd                                   AS "Số tiền vnđ",
  c.ngay                                          AS "Ngày",
  COALESCE((SELECT SUM(so_tien)   FROM thu),      0)
  - COALESCE((SELECT SUM(so_tien_vnd) FROM chi_tieu), 0)
                                                  AS "Số dư lý thuyết",
  c.so_tien_nghin,
  c.created_at
FROM chi_tieu c
JOIN mo_ta_chi mtc ON mtc.id_mtc = c.id_mtc
ORDER BY c.ngay DESC, c.created_at DESC;

-- View trả về đúng tên field cũ + Tổng thu lũy kế
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

-- ============================================================
-- PHẦN 6: TỔNG KẾT
-- ============================================================

CREATE TABLE tk_session (
  id          SERIAL PRIMARY KEY,
  session_id  TEXT NOT NULL UNIQUE,
  ngay_tk     DATE NOT NULL,
  so_du_lt    BIGINT NOT NULL,
  so_du_tt    BIGINT NOT NULL,
  chenhlech   BIGINT GENERATED ALWAYS AS (so_du_lt - so_du_tt) STORED,  -- lý thuyết - thực tế
  status      TEXT NOT NULL DEFAULT 'confirmed',
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tk_detail (
  id          SERIAL PRIMARY KEY,
  session_id  TEXT NOT NULL REFERENCES tk_session(session_id),
  ngay_tk     DATE NOT NULL,
  nguon_tien  TEXT NOT NULL REFERENCES nguon_tien(nguon_tien),
  so_tien     BIGINT NOT NULL
);

-- ============================================================
-- PHẦN 7: VIEW SỐ DƯ LÝ THUYẾT THEO NGUỒN TIỀN
-- (dùng trong tổng kết)
-- ============================================================

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
-- PHẦN 8: TẮT RLS (app cá nhân)
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

-- ============================================================
-- PHẦN 9: GRANT cho anon key
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
