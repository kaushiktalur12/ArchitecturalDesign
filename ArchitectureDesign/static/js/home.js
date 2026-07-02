/* ── Background image carousel ───────────────────────────────────────── */
const bgImgs = document.querySelectorAll('.bg-img');
let bgIdx = 0;

function rotateBg() {
  bgImgs[bgIdx].classList.remove('active');
  bgIdx = (bgIdx + 1) % bgImgs.length;
  bgImgs[bgIdx].classList.add('active');
}
if (bgImgs.length) setInterval(rotateBg, 4500);

/* ── Animated gradient word ──────────────────────────────────────────── */
const words = ['Spaces', 'Layouts', 'Visions', 'Blueprints', 'Futures'];
let wIdx = 0;
const wordEl = document.getElementById('animated-word');

function rotateWord() {
  if (!wordEl) return;
  wordEl.style.opacity = '0';
  wordEl.style.transform = 'translateY(-10px)';
  setTimeout(() => {
    wIdx = (wIdx + 1) % words.length;
    wordEl.textContent = words[wIdx];
    wordEl.style.opacity = '1';
    wordEl.style.transform = 'translateY(0)';
  }, 400);
}
if (wordEl) {
  wordEl.style.transition = 'opacity 0.4s, transform 0.4s';
  setInterval(rotateWord, 3000);
}

/* ── Intersection observer for feature cards ─────────────────────────── */
const cards = document.querySelectorAll('.feat-card, .step, .stat-card');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.15 });

cards.forEach((c, i) => {
  c.style.opacity    = '0';
  c.style.transform  = 'translateY(24px)';
  c.style.transition = `opacity 0.5s ${i * 0.08}s, transform 0.5s ${i * 0.08}s`;
  observer.observe(c);
});

/* ── Mobile menu ─────────────────────────────────────────────────────── */
function toggleMenu() {
  document.querySelector('.nav-links').classList.toggle('open');
}

/* ── Navbar scroll effect ────────────────────────────────────────────── */
window.addEventListener('scroll', () => {
  const nav = document.querySelector('.navbar');
  if (!nav) return;
  nav.style.background = window.scrollY > 40
    ? 'rgba(6,6,14,0.98)'
    : 'rgba(6,6,14,0.85)';
});
