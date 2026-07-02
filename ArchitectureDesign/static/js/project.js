/* ── Plot preview ────────────────────────────────────────────────────── */
function updatePreview() {
  const L = parseFloat(document.getElementById('plot_length').value) || 0;
  const W = parseFloat(document.getElementById('plot_width').value)  || 0;
  const area = L * W;

  // Update area display
  document.getElementById('area-display').textContent =
    area > 0 ? area.toLocaleString() : '0';

  // Proportional rectangle (max 180×140 px display)
  const maxW = 180, maxH = 140;
  const scale = Math.min(maxW / Math.max(L, 1), maxH / Math.max(W, 1), 1.8);
  const rW = Math.max(40, Math.round(L * scale));
  const rH = Math.max(30, Math.round(W * scale));
  const rect = document.getElementById('plot-rect');
  rect.style.width  = rW + 'px';
  rect.style.height = rH + 'px';
  document.getElementById('plot-label').textContent = L && W ? `${L}×${W} ft` : 'Plot';

  // Validation indicators
  const lenErr = document.getElementById('len-err');
  const widErr = document.getElementById('wid-err');
  lenErr.classList.toggle('hidden', L === 0 || L >= 20);
  widErr.classList.toggle('hidden', W === 0 || W >= 20);
}

/* ── Loader messages ─────────────────────────────────────────────────── */
const loaderMessages = [
  'Analyzing plot dimensions...',
  'Optimizing room layout...',
  'Calculating space efficiency...',
  'Generating floor plan variations...',
  'Applying design style preferences...',
  'Almost ready...'
];
let msgInterval;

function startLoader() {
  const overlay = document.getElementById('loader');
  const text    = document.getElementById('loader-text');
  overlay.classList.remove('hidden');
  let i = 0;
  text.textContent = loaderMessages[0];
  msgInterval = setInterval(() => {
    i = (i + 1) % loaderMessages.length;
    text.textContent = loaderMessages[i];
  }, 900);
}

function stopLoader() {
  clearInterval(msgInterval);
  document.getElementById('loader').classList.add('hidden');
}

/* ── Generate ────────────────────────────────────────────────────────── */
async function generateDesign() {
  const L = parseFloat(document.getElementById('plot_length').value) || 0;
  const W = parseFloat(document.getElementById('plot_width').value)  || 0;

  // Validate minimum plot size
  if (L < 20 || W < 20) {
    const banner = document.getElementById('error-banner');
    banner.textContent = '⚠ Minimum plot size is 20×20 ft. Please enter valid dimensions.';
    banner.classList.remove('hidden');
    setTimeout(() => banner.classList.add('hidden'), 3500);
    return;
  }

  const payload = {
    plot_length:   L,
    plot_width:    W,
    building_type: document.getElementById('building_type').value,
    bedrooms:      parseInt(document.getElementById('bedrooms').value)  || 2,
    bathrooms:     parseInt(document.getElementById('bathrooms').value) || 1,
    halls:         parseInt(document.getElementById('halls').value)     || 1,
    kitchens:      parseInt(document.getElementById('kitchens').value)  || 1,
    floors:        parseInt(document.getElementById('floors').value)    || 1,
    design_style:  document.getElementById('design_style').value,
    orientation:   document.getElementById('orientation').value
  };

  startLoader();
  document.getElementById('gen-btn').disabled = true;

  try {
    const res  = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    stopLoader();
    document.getElementById('gen-btn').disabled = false;

    if (data.ok) {
      window.location.href = `/designs?pid=${data.pid}`;
    } else {
      const banner = document.getElementById('error-banner');
      banner.textContent = '⚠ ' + (data.msg || 'Generation failed');
      banner.classList.remove('hidden');
    }
  } catch (err) {
    stopLoader();
    document.getElementById('gen-btn').disabled = false;
    const banner = document.getElementById('error-banner');
    banner.textContent = '⚠ Network error. Please try again.';
    banner.classList.remove('hidden');
  }
}

// Run once on load
updatePreview();
