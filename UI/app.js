// ================= UTIL =================
const fmt = n => n.toLocaleString("vi-VN");

function formatDate(d) {
  return d.toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

// ================= STATE =================
let chiDate = new Date();
let thuDate = new Date();

let chiStack = [];
let chiDesc = "";
let chiSource = "";

// ================= HEADER =================
function updateHeader() {
  if (!chiStack.length) return;
  const total = chiStack.reduce((a, b) => a + b, 0) * 1000;

  document.getElementById("header-last-chi").innerHTML =
    `Chi cuối<br>
     ${chiDesc} – ${formatDate(chiDate)}<br>
     Tổng: ${fmt(total)}`;
}

// ================= DATE =================
function renderDates() {
  document.getElementById("chi-date").innerText = formatDate(chiDate);
  document.getElementById("thu-date").innerText = formatDate(thuDate);
}

// ================= INIT =================
window.onload = () => {
  renderDates();
  document.getElementById("chi-input").focus();
};

// ================= CHI =================
const chiInput = document.getElementById("chi-input");
const chiStackEl = document.getElementById("chi-stack");
const chiSubmit = document.getElementById("chi-submit");

document.getElementById("chi-add").onclick = () => {
  const v = Number(chiInput.value);
  if (!v) return;
  chiStack.push(v);
  chiInput.value = "";
  chiInput.focus();
  renderChiStack();
};

function renderChiStack() {
  if (!chiStack.length) {
    chiStackEl.innerText = "Chưa có số";
    chiSubmit.disabled = true;
    return;
  }
  const total = chiStack.reduce((a, b) => a + b, 0);
  chiStackEl.innerText =
    chiStack.map(v => fmt(v * 1000)).join(" + ") +
    " = " + fmt(total * 1000);
  checkChiReady();
}

document.querySelectorAll('input[name="chi-desc"]').forEach(r => {
  r.onchange = () => {
    chiDesc = r.value;
    document.getElementById("chi-desc-other").value = "";
    checkChiReady();
  };
});

document.getElementById("chi-desc-other").onchange = e => {
  chiDesc = e.target.value;
  document.querySelectorAll('input[name="chi-desc"]').forEach(r => r.checked = false);
  checkChiReady();
};

document.getElementById("chi-source").onchange = e => {
  chiSource = e.target.value;
  checkChiReady();
};

function checkChiReady() {
  chiSubmit.disabled = !(chiStack.length && chiDesc && chiSource);
}

document.getElementById("chi-reset").onclick = () => {
  chiStack = [];
  chiDesc = "";
  chiSource = "";
  chiInput.value = "";
  chiStackEl.innerText = "Chưa có số";
  document.getElementById("chi-desc-other").value = "";
  document.getElementById("chi-source").value = "";
  document.querySelectorAll('input[name="chi-desc"]').forEach(r => r.checked = false);
  chiSubmit.disabled = true;
  chiInput.focus();
};

chiSubmit.onclick = () => {
  updateHeader();
  alert("Đã thêm chi (fake)");
  document.getElementById("chi-reset").click();
};

// ================= THU =================
const thuInput = document.getElementById("thu-input");
const thuDisplay = document.getElementById("thu-display");
const thuSubmit = document.getElementById("thu-submit");

thuInput.oninput =
document.getElementById("thu-desc").oninput =
document.getElementById("thu-source").onchange = () => {
  if (!thuInput.value) {
    thuDisplay.innerText = "Chưa có số";
    thuSubmit.disabled = true;
    return;
  }
  thuDisplay.innerText = fmt(Number(thuInput.value) * 1000);
  thuSubmit.disabled = !(
    thuInput.value &&
    document.getElementById("thu-desc").value &&
    document.getElementById("thu-source").value
  );
};

document.getElementById("thu-reset").onclick = () => {
  thuInput.value = "";
  document.getElementById("thu-desc").value = "";
  document.getElementById("thu-source").value = "";
  thuDisplay.innerText = "Chưa có số";
  thuSubmit.disabled = true;
};

thuSubmit.onclick = () => {
  alert("Đã thêm thu (fake)");
  document.getElementById("thu-reset").click();
};
