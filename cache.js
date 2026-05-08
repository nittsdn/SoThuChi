// ================= CACHE (localStorage) =================
// Lưu data ít thay đổi để tránh gọi API mỗi lần load app
// Không có TTL – chỉ xóa khi có thay đổi dữ liệu liên quan

// Tăng số này mỗi khi có thay đổi dữ liệu danh mục (loai_chi, nguon_tien)
// để tự động bust cache trên mọi thiết bị
const CACHE_VERSION = "3.4.0003";

const CACHE_KEYS = {
  LOAI_CHI:   'stc_cache_loai_chi',
  NGUON_TIEN: 'stc_cache_nguon_tien',
  LOAI_THU:   'stc_cache_loai_thu'
};

/**
 * Đọc data từ cache
 * @param {string} key - CACHE_KEYS.xxx
 * @returns {Array|null} - data hoặc null nếu chưa có cache
 */
function getCached(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.data)) return null;
    if (parsed.version !== CACHE_VERSION) {
      console.log(`🔄 Cache VERSION MISMATCH: ${key} (saved: ${parsed.version}, current: ${CACHE_VERSION}) – bỏ cache cũ`);
      localStorage.removeItem(key);
      return null;
    }
    console.log(`📦 Cache HIT: ${key} (${parsed.data.length} items)`);
    return parsed.data;
  } catch (e) {
    console.warn(`⚠️ Cache đọc lỗi [${key}]:`, e);
    return null;
  }
}

/**
 * Lưu data vào cache
 * @param {string} key - CACHE_KEYS.xxx
 * @param {Array} data - data cần lưu
 */
function setCached(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, version: CACHE_VERSION, savedAt: Date.now() }));
    console.log(`💾 Cache SET: ${key} (${data.length} items, version: ${CACHE_VERSION})`);
  } catch (e) {
    console.warn(`⚠️ Cache ghi lỗi [${key}]:`, e);
  }
}

/**
 * Xóa cache theo key chỉ định, không truyền = xóa tất cả
 * @param {...string} keys - CACHE_KEYS.xxx (không truyền = xóa hết)
 */
function clearCache(...keys) {
  const targets = keys.length > 0 ? keys : Object.values(CACHE_KEYS);
  targets.forEach(key => {
    localStorage.removeItem(key);
    console.log(`🗑️ Cache CLEAR: ${key}`);
  });
}

/**
 * Lấy data từ cache, nếu không có thì fetch và lưu cache
 * @param {string} cacheKey - CACHE_KEYS.xxx
 * @param {string} sheetName - tên sheet để fetch
 * @returns {Array}
 */
async function getCachedOrFetch(cacheKey, sheetName) {
  const cached = getCached(cacheKey);
  if (cached) return cached;

  console.log(`🌐 Cache MISS: ${sheetName} – đang fetch...`);
  const data = await fetchData(sheetName);
  if (data && data.length > 0) {
    setCached(cacheKey, data);
  }
  return data || [];
}
