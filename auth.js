// auth.js — Xác thực và quản lý đăng nhập (Supabase Email/Password)

let currentUser = null;
let currentAccessToken = null;

async function initAuth() {
  document.getElementById('loading').style.display = 'flex';
  try {
    const { data: { session } } = await db.auth.getSession();
    document.getElementById('loading').style.display = 'none';
    if (session?.user) {
      currentUser = session.user;
      currentAccessToken = session.access_token;
      showScreen('app');
      await initApp();
    } else {
      showScreen('login');
    }
  } catch (e) {
    console.error('initAuth error:', e);
    document.getElementById('loading').style.display = 'none';
    showScreen('login');
  }

  db.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user && !currentUser) {
      currentUser = session.user;
      currentAccessToken = session.access_token;
      showScreen('app');
      await initApp();
    } else if (event === 'TOKEN_REFRESHED' && session) {
      currentAccessToken = session.access_token;
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      currentAccessToken = null;
      showScreen('login');
    }
  });
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
  if (!confirm('Đăng xuất khỏi Sổ Thu Chi?')) return;
  await db.auth.signOut();
}

function showScreen(screen) {
  document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
  const el = document.getElementById('screen-' + screen);
  if (el) el.style.display = (screen === 'app') ? 'block' : 'flex';
}

window.onload = () => initAuth();
