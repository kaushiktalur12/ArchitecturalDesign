/* ═══════════════════════════════════════════════════════════════════
 *  reports.js  –  Dashboard: charts, history table, view + delete
 * ═══════════════════════════════════════════════════════════════════ */

let allProjects = [];

async function loadReports(days) {
  document.getElementById("btn7").classList.toggle("active", days === 7);
  document.getElementById("btn30").classList.toggle("active", days === 30);
  try {
    const res = await fetch(`/api/projects?period=${days}`);
    allProjects = await res.json();
    renderAll(allProjects, days);
    document.getElementById("showing-label").textContent =
      `Showing ${allProjects.length} project${allProjects.length !== 1 ? "s" : ""}`;
  } catch (e) {
    console.error(e);
  }
}

function renderAll(projects, days) {
  updateSummary(projects);
  renderTable(projects);
  drawBarChart(projects, days);
  drawHorizChart("style-chart", groupBy(projects, "design_style"));
  drawHorizChart("type-chart", groupBy(projects, "building_type"));
}

/* ── Summary counters ─────────────────────────────────────────────── */
function updateSummary(p) {
  const res = p.filter((x) => x.building_type === "Residential").length;
  const com = p.filter((x) => x.building_type === "Commercial").length;
  const avg = p.length
    ? Math.round(p.reduce((s, x) => s + (x.plot_length || 0), 0) / p.length)
    : 0;
  animNum("s-total", p.length);
  animNum("s-res", res);
  animNum("s-com", com);
  animNum("s-avg", avg);
}

function animNum(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let cur = 0;
  const step = Math.max(1, Math.ceil(target / 30));
  const t = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = cur;
    if (cur >= target) clearInterval(t);
  }, 28);
}

/* ── Project history table ───────────────────────────────────────── */
function renderTable(projects) {
  const tbody = document.getElementById("proj-tbody");
  const nd = document.getElementById("no-data");
  const badge = document.getElementById("proj-count");
  if (badge) badge.textContent = projects.length;

  tbody.innerHTML = "";

  if (!projects.length) {
    nd.classList.remove("hidden");
    return;
  }
  nd.classList.add("hidden");

  projects.forEach((p, i) => {
    const tr = document.createElement("tr");
    tr.className = "proj-row";
    tr.dataset.pid = p.id;
    tr.style.animationDelay = `${i * 40}ms`;

    const dt = new Date(p.created_at).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const plot = `${p.plot_length || "–"}×${p.plot_width || "–"} ft`;
    const area = p.total_area
      ? Math.round(p.total_area).toLocaleString() + " sqft"
      : "–";
    const rooms = p.total_rooms != null ? `${p.total_rooms} rooms` : "–";

    /* building-type badge colour */
    const typeClass =
      {
        Residential: "tag-res",
        Commercial: "tag-com",
        Villa: "tag-vil",
        Apartment: "tag-apt",
      }[p.building_type] || "tag-res";

    tr.innerHTML = `
      <td class="td-num">${i + 1}</td>
      <td class="td-date">${dt}</td>
      <td class="td-plot">${plot}</td>
      <td><span class="type-badge ${typeClass}">${p.building_type || "–"}</span></td>
      <td class="td-style">${p.design_style || "–"}</td>
      <td><span class="floor-pill">${p.floors || 1}F</span></td>
      <td class="td-rooms">${rooms}</td>
      <td class="td-area">${area}</td>
      <td>
        <div class="actions-cell">
          <a class="btn-view" href="/designs?pid=${p.id}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            View
          </a>
          <button class="btn-delete" data-pid="${p.id}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            Delete
          </button>
        </div>
      </td>`;

    tbody.appendChild(tr);
  });

  /* Attach delete listeners after rows are in the DOM */
  tbody.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pid = parseInt(btn.dataset.pid, 10);
      const row = btn.closest("tr");
      openDeleteModal(pid, row);
    });
  });
}

/* ── Delete modal ─────────────────────────────────────────────────── */
let _deletePid = null;
let _deleteRow = null;

function openDeleteModal(pid, rowEl) {
  _deletePid = pid;
  _deleteRow = rowEl;
  const btn = document.getElementById("confirm-delete-btn");
  if (btn) {
    btn.textContent = "Yes, Delete";
    btn.disabled = false;
  }
  document.getElementById("delete-modal").classList.remove("hidden");
}

function closeDeleteModal() {
  _deletePid = null;
  _deleteRow = null;
  const btn = document.getElementById("confirm-delete-btn");
  if (btn) {
    btn.textContent = "Yes, Delete";
    btn.disabled = false;
  }
  document.getElementById("delete-modal").classList.add("hidden");
}

async function confirmDelete() {
  if (!_deletePid) return;
  const btn = document.getElementById("confirm-delete-btn");
  btn.innerHTML = `<span style="opacity:0.7">Deleting…</span>`;
  btn.disabled = true;

  try {
    const res = await fetch(`/api/project/${_deletePid}`, { method: "DELETE" });
    const data = await res.json();

    if (data.ok) {
      /* capture before clearing state */
      const removedRow = _deleteRow;
      const removedId = _deletePid;
      closeDeleteModal();

      /* animate the row out */
      removedRow.style.transition = "all 0.38s ease";
      removedRow.style.opacity = "0";
      removedRow.style.transform = "translateX(30px)";

      setTimeout(() => {
        removedRow.remove();

        /* sync in-memory list & re-number rows */
        allProjects = allProjects.filter((p) => p.id !== removedId);
        const badge = document.getElementById("proj-count");
        if (badge) badge.textContent = allProjects.length;

        document.querySelectorAll("#proj-tbody tr").forEach((r, i) => {
          const numCell = r.querySelector(".td-num");
          if (numCell) numCell.textContent = i + 1;
        });

        if (!document.querySelectorAll("#proj-tbody tr").length)
          document.getElementById("no-data").classList.remove("hidden");

        updateSummary(allProjects);
      }, 380);
    } else {
      alert("Could not delete: " + (data.msg || "Unknown error"));
      btn.textContent = "Yes, Delete";
      btn.disabled = false;
    }
  } catch (e) {
    alert("Network error. Please try again.");
    btn.textContent = "Yes, Delete";
    btn.disabled = false;
  }
}

/* ── Wire up modal on load ────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("delete-modal");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeDeleteModal();
    });
  }

  document
    .getElementById("confirm-delete-btn")
    ?.addEventListener("click", confirmDelete);

  document
    .querySelector(".modal-btn--cancel")
    ?.addEventListener("click", closeDeleteModal);

  loadReports(30);
});

/* ── Bar chart: projects over time ───────────────────────────────── */
function drawBarChart(projects, days) {
  const canvas = document.getElementById("bar-chart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = canvas.parentElement.clientWidth || 780;
  const W = canvas.width,
    H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  if (!projects.length) {
    ctx.fillStyle = "#4b5563";
    ctx.font = "14px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText("No data for this period", W / 2, H / 2);
    return;
  }

  const byDay = {};
  projects.forEach((p) => {
    const k = new Date(p.created_at).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
    byDay[k] = (byDay[k] || 0) + 1;
  });
  const labels = Object.keys(byDay).slice(-14);
  const vals = labels.map((l) => byDay[l]);
  const maxV = Math.max(...vals, 1);

  const PL = 48,
    PR = 14,
    PT = 24,
    PB = 40;
  const cW = W - PL - PR,
    cH = H - PT - PB;
  const bW = Math.max(10, (cW / labels.length) * 0.6);
  const gap = cW / labels.length;

  /* gridlines */
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const gy = PT + cH - (g / 4) * cH;
    ctx.beginPath();
    ctx.moveTo(PL, gy);
    ctx.lineTo(W - PR, gy);
    ctx.stroke();
    ctx.fillStyle = "#4b5563";
    ctx.font = "11px 'Segoe UI'";
    ctx.textAlign = "right";
    ctx.fillText(Math.round((g / 4) * maxV), PL - 6, gy + 4);
  }

  /* bars */
  labels.forEach((lbl, i) => {
    const bh = (vals[i] / maxV) * cH;
    const bx = PL + i * gap + (gap - bW) / 2;
    const by = PT + cH - bh;
    const gr = ctx.createLinearGradient(bx, by, bx, by + bh);
    gr.addColorStop(0, "#7c3aed");
    gr.addColorStop(1, "#06b6d4");
    ctx.fillStyle = gr;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, bW, bh, 4);
    else ctx.rect(bx, by, bW, bh);
    ctx.fill();

    if (vals[i] > 0) {
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 12px 'Segoe UI'";
      ctx.textAlign = "center";
      ctx.fillText(vals[i], bx + bW / 2, by - 6);
    }
    ctx.fillStyle = "#6b7280";
    ctx.font = "11px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText(lbl, bx + bW / 2, PT + cH + 18);
  });
}

/* ── Horizontal bar chart (style / type) ─────────────────────────── */
const HC = ["#7c3aed", "#06b6d4", "#f59e0b", "#10b981", "#ef4444", "#ec4899"];

function drawHorizChart(id, data) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = canvas.parentElement.clientWidth || 420;
  const W = canvas.width,
    H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const keys = Object.keys(data),
    vals = keys.map((k) => data[k]);
  const maxV = Math.max(...vals, 1);

  if (!keys.length) {
    ctx.fillStyle = "#4b5563";
    ctx.font = "13px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText("No data", W / 2, H / 2);
    return;
  }

  const PL = 138,
    PR = 52,
    rowH = Math.min(38, (H - 20) / keys.length);
  keys.forEach((k, i) => {
    const bw = (vals[i] / maxV) * (W - PL - PR);
    const by = 20 + i * rowH;

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "13px 'Segoe UI'";
    ctx.textAlign = "right";
    ctx.fillText(k, PL - 10, by + rowH / 2 + 4);

    /* track */
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(PL, by + 5, W - PL - PR, rowH - 10);

    /* fill */
    const gr = ctx.createLinearGradient(PL, 0, PL + bw, 0);
    gr.addColorStop(0, HC[i % HC.length]);
    gr.addColorStop(1, HC[i % HC.length] + "88");
    ctx.fillStyle = gr;
    if (ctx.roundRect) ctx.roundRect(PL, by + 5, bw, rowH - 10, 3);
    else ctx.rect(PL, by + 5, bw, rowH - 10);
    ctx.fill();

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 13px 'Segoe UI'";
    ctx.textAlign = "left";
    ctx.fillText(vals[i], PL + bw + 9, by + rowH / 2 + 4);
  });
}

function groupBy(arr, key) {
  return arr.reduce((a, x) => {
    const k = x[key] || "Unknown";
    a[k] = (a[k] || 0) + 1;
    return a;
  }, {});
}

/* ── Export PDF ───────────────────────────────────────────────────── */
async function exportPDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const el = document.querySelector(".reports-wrap");
  try {
    const c = await html2canvas(el, { scale: 1.5, backgroundColor: "#0a0a14" });
    const img = c.toDataURL("image/png");
    const pW = pdf.internal.pageSize.getWidth();
    const pH = (c.height * pW) / c.width;
    pdf.addImage(
      img,
      "PNG",
      0,
      0,
      pW,
      Math.min(pH, pdf.internal.pageSize.getHeight()),
    );
    pdf.save(
      `GenArch_Report_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.pdf`,
    );
  } catch (e) {
    alert("Export failed.");
    console.error(e);
  }
}
