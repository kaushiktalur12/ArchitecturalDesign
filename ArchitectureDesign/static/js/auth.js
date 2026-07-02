/* ── Shared helpers ──────────────────────────────────────────────────── */
function blockNumbers(input) {
  input.value = input.value.replace(/[^a-zA-Z]/g, "");
}

function toggleEye(inputId, svgId) {
  const inp = document.getElementById(inputId);
  const eye = document.getElementById(svgId);
  if (inp.type === "password") {
    inp.type = "text";
    eye.innerHTML = `
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>`;
  } else {
    inp.type = "password";
    eye.innerHTML = `
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>`;
  }
}

function showError(msg) {
  const el = document.getElementById("error-msg");
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 4000);
}

function showSuccess(msg) {
  const el = document.getElementById("success-msg");
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
}

/* ── Password strength ───────────────────────────────────────────────── */
function checkStrength(pw) {
  const len = pw.length >= 8;
  const up = /[A-Z]/.test(pw);
  const num = /[0-9]/.test(pw);
  const sym = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw);

  const score = [len, up, num, sym].filter(Boolean).length;
  const bars = ["sb1", "sb2", "sb3", "sb4"];
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const classes = ["", "weak", "fair", "good", "strong"];

  bars.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = "sb " + (i < score ? classes[score] : "");
  });

  const sl = document.getElementById("strength-label");
  if (sl) {
    sl.textContent = pw.length > 0 ? labels[score] : "";
    sl.className = "strength-label " + (pw.length > 0 ? classes[score] : "");
  }
}

function checkMatch() {
  const pw = document.getElementById("su-password")?.value;
  const cf = document.getElementById("su-confirm")?.value;
  const msg = document.getElementById("match-msg");
  if (!msg) return;
  if (!cf) {
    msg.textContent = "";
    return;
  }
  if (pw === cf) {
    msg.textContent = "✓ Passwords match";
    msg.className = "match-msg ok";
  } else {
    msg.textContent = "✗ Passwords do not match";
    msg.className = "match-msg bad";
  }
}

/* ── Signup ──────────────────────────────────────────────────────────── */
async function doSignup() {
  const username = document.getElementById("su-username").value.trim();
  const email = document.getElementById("su-email").value.trim();
  const password = document.getElementById("su-password").value;
  const confirm = document.getElementById("su-confirm").value;

  if (!username || !email || !password || !confirm) {
    showError("Please fill in all fields");
    return;
  }
  if (!/^[a-zA-Z]+$/.test(username)) {
    showError("Username must contain only letters");
    return;
  }
  if (password.length < 8) {
    showError("Password must be at least 8 characters");
    return;
  }
  if (!/[A-Z]/.test(password)) {
    showError("Password must contain at least one uppercase letter");
    return;
  }
  if (!/[0-9]/.test(password)) {
    showError("Password must contain at least one number");
    return;
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    showError("Password must contain at least one special character");
    return;
  }
  if (password !== confirm) {
    showError("Passwords do not match");
    return;
  }

  const res = await fetch("/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await res.json();
  if (data.ok) {
    showSuccess("Account created! Redirecting to login...");
    setTimeout(() => (window.location.href = "/login"), 1800);
  } else {
    showError(data.msg || "Signup failed");
  }
}
