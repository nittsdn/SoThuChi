Đã tạo file For builder/huong-dan-auth-supabase.md.

File gồm 5 bước đầy đủ:

Tạo project Supabase mới
SQL tạo bảng app_users
Tạo tài khoản user
Code copy-paste cho supabase.js và auth.js
HTML tối thiểu cần có
Bạn chỉ cần đổi YOUR_PROJECT / YOUR_ANON_KEY và rename hàm initApp() là xong.

# Hướng dẫn tái sử dụng Auth Supabase (Email/Password)

## Bước 1: Tạo project Supabase mới
1. Vào https://supabase.com → New project
2. Lưu lại **Project URL** và **anon key**

---

## Bước 2: Tạo bảng `app_users` trong Supabase

Chạy SQL này trong **SQL Editor** của project mới:

```sql
create table app_users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  role text not null default 'user',
  created_at timestamptz default now()
);

-- Bật RLS
alter table app_users enable row level security;

-- Chỉ cho phép đọc chính mình
create policy "Users read own row" on app_users
  for select using (auth.uid() = id);
```

---

## Bước 3: Tạo tài khoản người dùng
1. Supabase Dashboard → **Authentication > Users** → **Invite user** (hoặc Add user)
2. Sau khi user tạo xong, vào **Table Editor > app_users** → thêm row với `id` = UUID của user đó, `role` = `'admin'` hoặc `'user'`

---

## Bước 4: Copy 2 file vào project mới

### `supabase.js`
```js
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'implicit',
    detectSessionInUrl: true,
    persistSession: true,
  }
});
```

### `auth.js`
```js
let currentUser = null;
let currentRole = null;

async function initAuth() {
  showScreen('loading');
  try {
    const { data: { session } } = await db.auth.getSession();
    if (session?.user) {
      currentUser = session.user;
      await checkUserRole();
    } else {
      showScreen('login');
    }
  } catch (e) {
    showScreen('login');
  }
  db.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user && !currentUser) {
      currentUser = session.user;
      await checkUserRole();
    } else if (event === 'SIGNED_OUT') {
      currentUser = null; currentRole = null;
      showScreen('login');
    }
  });
}

async function checkUserRole() {
  const { data, error } = await db.from('app_users').select('role').eq('id', currentUser.id).single();
  if (error || !data) {
    await db.auth.signOut();
    document.getElementById('login-error').textContent = 'Tài khoản chưa được cấp quyền.';
    showScreen('login');
    return;
  }
  currentRole = data.role;
  showScreen('app');
  initApp(); // hàm khởi động app chính của bạn
}

async function signInWithEmail(email, password) {
  const btn = document.getElementById('btn-login');
  const errEl = document.getElementById('login-error');
  btn.disabled = true;
  btn.textContent = 'Đang đăng nhập...';
  errEl.textContent = '';
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    errEl.textContent = 'Email hoặc mật khẩu không đúng';
    btn.disabled = false;
    btn.textContent = 'Đăng nhập';
  }
}

async function signOut() {
  await db.auth.signOut();
}

function showScreen(screen) {
  document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
  const el = document.getElementById('screen-' + screen);
  if (el) el.style.display = 'flex';
}

function isAdmin() { return currentRole === 'admin'; }
```

---

## Bước 5: HTML tối thiểu cần có

```html
<!-- Load Supabase CDN trước -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabase.js"></script>
<script src="auth.js"></script>

<!-- Màn hình loading -->
<div id="screen-loading" class="screen" style="display:none">Đang tải...</div>

<!-- Màn hình login -->
<div id="screen-login" class="screen" style="display:none">
  <input id="inp-email" type="email" placeholder="Email" />
  <input id="inp-password" type="password" placeholder="Mật khẩu" />
  <button id="btn-login" onclick="signInWithEmail(
    document.getElementById('inp-email').value,
    document.getElementById('inp-password').value
  )">Đăng nhập</button>
  <p id="login-error" style="color:red"></p>
</div>

<!-- Màn hình app chính -->
<div id="screen-app" class="screen" style="display:none">
  <!-- nội dung app -->
  <button onclick="signOut()">Đăng xuất</button>
</div>

<script>
  initAuth(); // khởi động khi load trang
</script>
```

---

## Lưu ý
- Thay `YOUR_PROJECT` và `YOUR_ANON_KEY` bằng thông tin project Supabase mới
- Hàm `initApp()` trong `auth.js` là hàm khởi động app chính của bạn — đổi tên cho phù hợp
- `currentUser` và `currentRole` là biến global dùng được ở mọi file JS khác
