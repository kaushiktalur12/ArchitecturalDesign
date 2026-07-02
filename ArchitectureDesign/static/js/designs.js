/* ═══════════════════════════════════════════════════════════════════════════
 *  designs.js  –  2D canvas (no overlap) + Three.js 3D (matches 2D exactly)
 *  Room labels in 3D, per-floor different layouts, style-driven design
 *  ✦ Windows & Doors added in both 2D and 3D
 * ═══════════════════════════════════════════════════════════════════════════ */

/* ── Variation tab switch ─────────────────────────────────────────────── */
function switchVar(idx) {
  document
    .querySelectorAll(".var-tab")
    .forEach((t, i) => t.classList.toggle("active", i === idx));
  document
    .querySelectorAll(".var-panel")
    .forEach((p, i) => p.classList.toggle("active", i === idx));
}

/* ── 2D / 3D toggle ──────────────────────────────────────────────────── */
function setView(vi, mode, btn) {
  btn
    .closest(".view-toggle")
    .querySelectorAll(".vt")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  document
    .getElementById(`view2d-${vi}`)
    .classList.toggle("hidden", mode !== "2d");
  document
    .getElementById(`view3d-${vi}`)
    .classList.toggle("hidden", mode !== "3d");
  if (mode === "3d" && !renderers[vi]) init3D(vi);
}

/* ── Floor selector ──────────────────────────────────────────────────── */
const currentFloor = [0, 0];

function switchFloor(vi, fi) {
  currentFloor[vi] = fi;
  document
    .querySelectorAll(`.fpill-${vi}`)
    .forEach((b, i) => b.classList.toggle("active", i === fi));
  draw2D(vi);
  if (renderers[vi]) {
    destroyRenderer(vi);
    init3D(vi);
  }
}

let DESIGN_DATA = {};
let PROJECT = {};

function attachViewButtons() {
  document.querySelectorAll(".view-toggle .vt").forEach((btn) => {
    btn.addEventListener("click", () => {
      const vi = parseInt(btn.dataset.vi, 10);
      const view = btn.dataset.view;
      if (!Number.isFinite(vi) || !view) return;
      setView(vi, view, btn);
    });
  });
}

function applyRoomDotColors() {
  document.querySelectorAll(".room-dot").forEach((dot) => {
    const color = dot.dataset.color;
    if (color) {
      dot.style.backgroundColor = color;
    }
  });
}

function initDesignsPage() {
  const dd = document.getElementById("design-data-json");
  if (dd) DESIGN_DATA = JSON.parse(dd.textContent || "{}");
  const pj = document.getElementById("project-data-json");
  if (pj) PROJECT = JSON.parse(pj.textContent || "{}");
  attachViewButtons();
  applyRoomDotColors();
}

/* ══════════════════════════════════════════════════════════════════════
 *  2D CANVAS
 * ══════════════════════════════════════════════════════════════════════ */
function draw2D(vi) {
  const canvas = document.getElementById(`canvas2d-${vi}`);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const vari = DESIGN_DATA?.variations?.[vi];
  if (!vari) return;

  const fi = currentFloor[vi] || 0;
  const fd = vari.floors_data || [vari.rooms];
  const rooms = fd[Math.min(fi, fd.length - 1)] || vari.rooms || [];
  const pl = DESIGN_DATA.plot_length || 50;
  const pw = DESIGN_DATA.plot_width || 30;
  const style = DESIGN_DATA.design_style || "Modern";
  const ori = DESIGN_DATA.orientation || "East-Facing";
  const totF = DESIGN_DATA.floors || 1;

  const wrap = canvas.parentElement;
  canvas.width = wrap.clientWidth || 500;
  canvas.height = wrap.clientHeight || 380;
  const W = canvas.width,
    H = canvas.height;

  /* Background */
  ctx.fillStyle = "#080812";
  ctx.fillRect(0, 0, W, H);

  /* Subtle grid */
  ctx.strokeStyle = "rgba(255,255,255,0.025)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  /* Margins & scale */
  const PAD = 48;
  const cW = W - PAD * 2,
    cH = H - PAD * 2;
  const SX = cW / 100,
    SY = cH / 100;

  /* Style-based border colour */
  const styleBorder = {
    Modern: "#06b6d4",
    Traditional: "#f59e0b",
    Minimalist: "#a3e635",
    Contemporary: "#38bdf8",
  };
  const bCol = styleBorder[style] || "#06b6d4";

  /* Outer plot border */
  ctx.save();
  ctx.shadowColor = bCol;
  ctx.shadowBlur = 16;
  ctx.strokeStyle = bCol;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 3]);
  ctx.strokeRect(PAD, PAD, cW, cH);
  ctx.setLineDash([]);
  ctx.restore();

  /* Dimension label */
  ctx.fillStyle = bCol;
  ctx.font = "bold 11px 'Segoe UI'";
  ctx.textAlign = "center";
  ctx.fillText(`${pl}ft × ${pw}ft`, W / 2, PAD - 16);

  /* Style + floor label */
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "10px 'Segoe UI'";
  ctx.textAlign = "left";
  ctx.fillText(
    `${style}  ·  Floor ${fi + 1}/${totF}  ·  ${ori}`,
    PAD + 3,
    H - 6,
  );

  /* Draw rooms */
  rooms.forEach((r) => {
    const x = PAD + r.x * SX,
      y = PAD + r.y * SY,
      w = r.w * SX,
      h = r.h * SY;
    const col = r.color;

    /* Room fill */
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;

    /* Room border — style affects line style */
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.8;
    if (style === "Minimalist") {
      ctx.setLineDash([]);
    } else if (style === "Traditional") {
      ctx.lineWidth = 2.2;
    }
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    /* Furniture */
    if (w > 28 && h > 20) drawFurn2D(ctx, r.type, x, y, w, h, col);

    /* Stair hatching */
    if (r.type === "stair") drawStairHatch(ctx, x, y, w, h, col);

    /* ── Windows on top wall ── */
    drawWindows2D(ctx, r.type, x, y, w, h, col);

    /* ── Door on bottom-left ── */
    drawDoor2D(ctx, r.type, x, y, w, h, col);

    /* Room name label */
    const fs = Math.min(11, w / 6.5, h / 2.5);
    if (w > 36 && h > 18 && fs >= 6.5) {
      ctx.fillStyle = "#fff";
      ctx.font = `600 ${fs}px 'Segoe UI'`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(trunc(r.name, 15), x + w / 2, y + h / 2 - (fs < 8 ? 0 : 5));
      if (h > 30 && fs >= 8.5) {
        ctx.fillStyle = col;
        ctx.font = `${Math.max(7, fs - 2.5)}px 'Segoe UI'`;
        ctx.fillText(`${r.sqft} sqft`, x + w / 2, y + h / 2 + fs * 0.9);
      }
    }
    ctx.textBaseline = "alphabetic";
  });

  /* Compass */
  drawCompass(ctx, W - 40, 40, ori);

  /* Dimension arrows */
  ctx.strokeStyle = `${bCol}55`;
  ctx.fillStyle = `${bCol}99`;
  ctx.lineWidth = 0.8;
  ctx.font = "9px 'Segoe UI'";
  ctx.textAlign = "center";
  ctx.beginPath();
  ctx.moveTo(PAD, PAD + cH + 16);
  ctx.lineTo(PAD + cW, PAD + cH + 16);
  ctx.stroke();
  ctx.fillText(`${pl} ft`, PAD + cW / 2, PAD + cH + 27);
  ctx.save();
  ctx.translate(PAD - 18, PAD + cH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${pw} ft`, 0, 4);
  ctx.restore();

  /* V label */
  ctx.fillStyle = bCol + "bb";
  ctx.font = `bold 10px 'Segoe UI'`;
  ctx.textAlign = "left";
  ctx.fillText(
    `V${vi + 1}: ${vi === 0 ? "COMPACT EFFICIENT" : "LUXURY SPACIOUS"}`,
    PAD,
    PAD + cH + 40,
  );
}

/* ── 2D Window drawing ───────────────────────────────────────────────── */
/**
 * Draws windows as dashed segments with small pane lines on the TOP wall
 * of each room (architectural convention: windows shown as breaks in wall).
 * Skips rooms that logically wouldn't have exterior windows.
 */
function drawWindows2D(ctx, type, x, y, w, h, col) {
  const noWin = ["bath", "powder", "corridor", "stair", "store", "utility"];
  if (noWin.includes(type)) return;
  if (w < 30 || h < 20) return;

  ctx.save();
  ctx.strokeStyle = "#e0f2fe";
  ctx.lineWidth = 2.2;

  // How many windows and their width based on room size
  const winCount = w > 80 ? 2 : 1;
  const winW = Math.min(w * 0.28, 28);
  const winGap = w / (winCount + 1);

  for (let i = 0; i < winCount; i++) {
    const wx = x + winGap * (i + 1) - winW / 2;
    const wy = y; // on the top wall

    // White gap (erase wall line) — window opening
    ctx.clearRect(wx, wy - 1.5, winW, 3.5);

    // Outer window frame lines
    ctx.strokeStyle = "#e0f2fe";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx + winW, wy);
    ctx.stroke();

    // Inner pane dividers (cross)
    ctx.strokeStyle = col + "cc";
    ctx.lineWidth = 0.9;
    // Vertical pane divider
    ctx.beginPath();
    ctx.moveTo(wx + winW / 2, wy - 3);
    ctx.lineTo(wx + winW / 2, wy + 3);
    ctx.stroke();

    // Small tick marks at ends to indicate frame depth
    ctx.strokeStyle = "#e0f2fe";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(wx, wy - 3);
    ctx.lineTo(wx, wy + 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(wx + winW, wy - 3);
    ctx.lineTo(wx + winW, wy + 4);
    ctx.stroke();

    // Subtle cyan shimmer line inside window opening
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = "#06b6d4";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(wx + 2, wy + 1);
    ctx.lineTo(wx + winW - 2, wy + 1);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

/* ── 2D Door drawing ─────────────────────────────────────────────────── */
/**
 * Draws a door as an arc swing on the BOTTOM wall of a room.
 * Architectural standard: door shown as opening gap + quarter-circle swing arc.
 * Skips rooms that don't need doors (e.g., open terraces, gardens).
 */
function drawDoor2D(ctx, type, x, y, w, h, col) {
  const noDoor = ["garden", "terrace", "balcony", "stair", "corridor"];
  if (noDoor.includes(type)) return;
  if (w < 22 || h < 18) return;

  ctx.save();

  // Door width: ~15-20% of room width, capped at 18px
  const dw = Math.min(w * 0.22, 18);
  // Position: left portion of bottom wall
  const dx = x + w * 0.12;
  const dy = y + h; // bottom wall

  // Clear wall gap for door opening
  ctx.clearRect(dx, dy - 1.5, dw, 3.5);

  // Door panel line (from hinge point)
  ctx.strokeStyle = "#fde68a";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(dx, dy);
  ctx.lineTo(dx + dw, dy - dw); // door panel at 45° for standard representation
  ctx.stroke();

  // Swing arc
  ctx.strokeStyle = "#fde68a";
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.arc(dx, dy, dw, -Math.PI / 2, 0); // quarter circle swing
  ctx.stroke();
  ctx.setLineDash([]);

  // Hinge dot
  ctx.fillStyle = "#fde68a";
  ctx.beginPath();
  ctx.arc(dx, dy, 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/* ── Furniture symbols ───────────────────────────────────────────────── */
function drawFurn2D(ctx, type, x, y, w, h, col) {
  ctx.save();
  ctx.strokeStyle = col;
  ctx.lineWidth = 0.9;
  ctx.globalAlpha = 0.62;
  switch (type) {
    case "master":
    case "bed": {
      rr(ctx, x + 3, y + 3, w - 6, h * 0.7, 3);
      ctx.stroke();
      rr(ctx, x + 5, y + 5, w * 0.4, h * 0.26, 2);
      ctx.stroke();
      rr(ctx, x + w * 0.52, y + 5, w * 0.4, h * 0.26, 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 3, y + h * 0.72);
      ctx.lineTo(x + w - 3, y + h * 0.72);
      ctx.stroke();
      if (w > 60) (rr(ctx, x + w - 13, y + h * 0.33, 10, 10, 1), ctx.stroke());
      break;
    }
    case "bath": {
      ctx.beginPath();
      ctx.ellipse(
        x + w * 0.22,
        y + h * 0.22,
        w * 0.12,
        h * 0.17,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      rr(ctx, x + w * 0.56, y + 4, w * 0.34, h * 0.27, 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + w * 0.73, y + 4 + h * 0.135, 3, 0, Math.PI * 2);
      ctx.stroke();
      rr(ctx, x + 4, y + h * 0.54, w * 0.44, h * 0.38, 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(
        x + 4 + w * 0.22,
        y + h * 0.54 + h * 0.19,
        w * 0.11,
        h * 0.09,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      break;
    }
    case "powder": {
      ctx.beginPath();
      ctx.ellipse(
        x + w * 0.5,
        y + h * 0.3,
        w * 0.18,
        h * 0.22,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      rr(ctx, x + w * 0.25, y + h * 0.62, w * 0.5, h * 0.28, 2);
      ctx.stroke();
      break;
    }
    case "kitchen": {
      ctx.beginPath();
      ctx.moveTo(x + 3, y + 3);
      ctx.lineTo(x + w - 3, y + 3);
      ctx.lineTo(x + w - 3, y + h * 0.42);
      ctx.lineTo(x + w * 0.6, y + h * 0.42);
      ctx.lineTo(x + w * 0.6, y + h - 3);
      ctx.lineTo(x + 3, y + h - 3);
      ctx.closePath();
      ctx.stroke();
      for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++) {
          ctx.beginPath();
          ctx.arc(
            x + w * 0.68 + j * w * 0.16,
            y + h * 0.54 + i * h * 0.2,
            w * 0.055,
            0,
            Math.PI * 2,
          );
          ctx.stroke();
        }
      rr(ctx, x + w * 0.07, y + h * 0.07, w * 0.22, h * 0.19, 2);
      ctx.stroke();
      break;
    }
    case "living":
    case "hall":
    case "lounge": {
      rr(ctx, x + 6, y + 6, w * 0.58, h * 0.28, 3);
      ctx.stroke();
      rr(ctx, x + 6, y + h * 0.36, w * 0.21, h * 0.26, 2);
      ctx.stroke();
      rr(ctx, x + w * 0.38, y + h * 0.36, w * 0.21, h * 0.26, 2);
      ctx.stroke();
      rr(ctx, x + w * 0.18, y + h * 0.64, w * 0.34, h * 0.18, 2);
      ctx.stroke();
      if (h > 70) {
        rr(ctx, x + w * 0.1, y + h * 0.86, w * 0.5, h * 0.1, 1);
        ctx.stroke();
      }
      break;
    }
    case "dining": {
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.27, 0, Math.PI * 2);
      ctx.stroke();
      const cR = Math.min(w, h) * 0.27;
      [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
      ].forEach(([dx, dy]) => {
        rr(
          ctx,
          x + w / 2 + dx * cR * 1.6 - 7,
          y + h / 2 + dy * cR * 1.6 - 7,
          14,
          14,
          2,
        );
        ctx.stroke();
      });
      break;
    }
    case "study":
    case "office": {
      rr(ctx, x + 3, y + 3, w * 0.66, h * 0.3, 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(
        x + w * 0.28,
        y + h * 0.55,
        Math.min(w, h) * 0.17,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      rr(ctx, x + w * 0.09, y + h * 0.08, w * 0.3, h * 0.18, 1);
      ctx.stroke();
      if (w > 55) {
        rr(ctx, x + w * 0.72, y + 3, w * 0.24, h * 0.62, 2);
        ctx.stroke();
      }
      break;
    }
    case "garden":
    case "terrace": {
      [
        [0.16, 0.22],
        [0.54, 0.16],
        [0.8, 0.34],
        [0.28, 0.64],
        [0.66, 0.7],
      ].forEach(([gx, gy]) => {
        const gr = Math.min(w, h) * 0.1;
        ctx.beginPath();
        ctx.arc(x + gx * w, y + gy * h, gr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + gx * w, y + gy * h, gr * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y + h - 3);
      ctx.lineTo(x + w / 2, y + h * 0.4);
      ctx.stroke();
      break;
    }
    case "garage": {
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 4, y + i * (h / 4));
        ctx.lineTo(x + w - 4, y + i * (h / 4));
        ctx.stroke();
      }
      rr(ctx, x + 8, y + h * 0.56, w - 16, h * 0.35, 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + w * 0.28, y + h * 0.88, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + w * 0.72, y + h * 0.88, 5, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "balcony": {
      const posts = Math.max(2, Math.floor(w / 9));
      for (let i = 0; i <= posts; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 4 + (i * (w - 8)) / posts, y + 4);
        ctx.lineTo(x + 4 + (i * (w - 8)) / posts, y + h - 4);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(x + 4, y + 5);
      ctx.lineTo(x + w - 4, y + 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 4, y + h - 5);
      ctx.lineTo(x + w - 4, y + h - 5);
      ctx.stroke();
      if (w > 40) {
        rr(ctx, x + w / 2 - 8, y + h / 2 - 8, 16, 16, 2);
        ctx.stroke();
      }
      break;
    }
    case "corridor": {
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y + 4);
      ctx.lineTo(x + w / 2, y + h - 4);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
    case "porch":
    case "foyer": {
      [0.22, 0.78].forEach((cx2) => {
        ctx.beginPath();
        ctx.arc(x + cx2 * w, y + h * 0.5, 4, 0, Math.PI * 2);
        ctx.stroke();
      });
      rr(ctx, x + w * 0.25, y + h * 0.65, w * 0.5, h * 0.22, 1);
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

function drawStairHatch(ctx, x, y, w, h, col) {
  ctx.save();
  ctx.strokeStyle = col;
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 9; i++) {
    const sw = (w * (i + 1)) / 9;
    ctx.beginPath();
    ctx.rect(x, y + h * (i / 9), sw, h / 9);
    ctx.stroke();
  }
  ctx.fillStyle = col;
  ctx.globalAlpha = 0.85;
  ctx.font = "bold 8px 'Segoe UI'";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("▲ STAIR", x + w / 2, y + h / 2);
  ctx.restore();
}

function drawCompass(ctx, cx, cy, ori) {
  const amap = {
    "East-Facing": Math.PI / 2,
    "West-Facing": -Math.PI / 2,
    "North-Facing": 0,
    "South-Facing": Math.PI,
  };
  const rot = amap[ori] || 0;
  const R = 22;
  ctx.save();
  ctx.fillStyle = "rgba(8,8,18,0.85)";
  ctx.beginPath();
  ctx.arc(cx, cy, R + 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(6,182,212,.5)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  [
    ["N", 0],
    ["E", Math.PI / 2],
    ["S", Math.PI],
    ["W", -Math.PI / 2],
  ].forEach(([l, a]) => {
    ctx.fillStyle = l === "N" ? "#f87171" : "rgba(255,255,255,.45)";
    ctx.font = "bold 7px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(l, cx + Math.sin(a) * (R - 7), cy - Math.cos(a) * (R - 7));
  });
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.fillStyle = "#f87171";
  ctx.beginPath();
  ctx.moveTo(0, -R + 5);
  ctx.lineTo(4, 2);
  ctx.lineTo(0, -2);
  ctx.lineTo(-4, 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.25)";
  ctx.beginPath();
  ctx.moveTo(0, R - 5);
  ctx.lineTo(4, -2);
  ctx.lineTo(0, 2);
  ctx.lineTo(-4, -2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#06b6d4";
  ctx.beginPath();
  ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function trunc(s, n) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/* ══════════════════════════════════════════════════════════════════════
 *  3D ENGINE – exactly matches 2D grid (x,y,w,h in 0-100 grid units)
 * ══════════════════════════════════════════════════════════════════════ */
const renderers = {},
  scenes = {},
  cameras = {},
  animIds = {};
const FH = 3.2,
  SC = 0.22; // floor height metres, grid-unit → 3D scale

const COL3D = {
  living: 0x00b894,
  lounge: 0x00b894,
  hall: 0x00b894,
  master: 0x6c5ce7,
  bed: 0x0984e3,
  bath: 0xa29bfe,
  powder: 0xd63031,
  kitchen: 0xfdcb6e,
  dining: 0xe17055,
  study: 0x74b9ff,
  office: 0x38bdf8,
  garden: 0x55efc4,
  terrace: 0xa3e635,
  garage: 0x636e72,
  stair: 0xb2bec3,
  balcony: 0xfd79a8,
  store: 0xb2bec3,
  utility: 0x81ecec,
  corridor: 0xfd79a8,
  porch: 0xffeaa7,
  foyer: 0xffeaa7,
};

function destroyRenderer(vi) {
  if (animIds[vi]) cancelAnimationFrame(animIds[vi]);
  if (renderers[vi]) renderers[vi].dispose();
  renderers[vi] = null;
}

function init3D(vi) {
  const canvas = document.getElementById(`canvas3d-${vi}`);
  if (!canvas) return;
  const vari = DESIGN_DATA?.variations?.[vi];
  if (!vari) return;

  const W = canvas.clientWidth || 500,
    H = canvas.clientHeight || 380;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  renderer.setSize(W, H);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x080812, 1);
  renderers[vi] = renderer;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x080812, 0.007);
  scenes[vi] = scene;

  const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 1000);
  cameras[vi] = camera;

  /* Lights */
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const sun = new THREE.DirectionalLight(0xfff8e0, 1.25);
  sun.position.set(16, 30, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  ["left", "right", "top", "bottom"].forEach(
    (k, i) => (sun.shadow.camera[k] = i % 2 === 0 ? -35 : 35),
  );
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 200;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x06b6d4, 0.28);
  fill.position.set(-12, 20, -10);
  scene.add(fill);

  /* Ground */
  const gnd = new THREE.Mesh(
    new THREE.PlaneGeometry(140, 140),
    new THREE.MeshStandardMaterial({ color: 0x0a0a16, roughness: 1 }),
  );
  gnd.rotation.x = -Math.PI / 2;
  gnd.position.y = -0.1;
  gnd.receiveShadow = true;
  scene.add(gnd);
  scene.add(new THREE.GridHelper(140, 70, 0x1a1a2e, 0x1a1a2e));

  const floors = DESIGN_DATA.floors || 1;
  const fd = vari.floors_data || [vari.rooms];

  for (let fi = 0; fi < floors; fi++) {
    const baseY = fi * FH;
    const rooms = fd[Math.min(fi, fd.length - 1)] || [];

    /* Floor slab */
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(100 * SC, 0.14, 100 * SC),
      new THREE.MeshStandardMaterial({ color: 0x16162a, roughness: 0.9 }),
    );
    slab.position.set(50 * SC, baseY - 0.07, 50 * SC);
    slab.receiveShadow = true;
    scene.add(slab);

    /* Exterior walls */
    addExtWalls(scene, 100 * SC, 100 * SC, baseY, FH);

    rooms.forEach((r) => {
      if (r.type === "stair") {
        addStairs(scene, r, baseY, SC, FH);
        return;
      }

      const rx = r.x * SC,
        rz = r.y * SC,
        rw = r.w * SC,
        rd = r.h * SC;
      const col = COL3D[r.type] || 0x888888;
      const wh = FH * 0.93;

      /* Room floor tile */
      const ft = new THREE.Mesh(
        new THREE.BoxGeometry(rw - 0.06, 0.07, rd - 0.06),
        new THREE.MeshStandardMaterial({
          color: col,
          roughness: 0.85,
          opacity: 0.68,
          transparent: true,
        }),
      );
      ft.position.set(rx + rw / 2, baseY + 0.035, rz + rd / 2);
      ft.receiveShadow = true;
      scene.add(ft);

      /* Walls: left, right, back */
      const wm = new THREE.MeshStandardMaterial({
        color: 0xf0eeff,
        roughness: 0.92,
        opacity: 0.1,
        transparent: true,
        side: THREE.DoubleSide,
      });
      addBox(scene, rx, baseY + wh / 2, rz + rd / 2, 0.1, wh, rd, wm);
      addBox(scene, rx + rw, baseY + wh / 2, rz + rd / 2, 0.1, wh, rd, wm);
      addBox(scene, rx + rw / 2, baseY + wh / 2, rz, rw, wh, 0.1, wm);
      if (fi < floors - 1) {
        addBox(
          scene,
          rx + rw / 2,
          baseY + FH,
          rz + rd / 2,
          rw - 0.06,
          0.05,
          rd - 0.06,
          new THREE.MeshStandardMaterial({
            color: 0x1e1e3a,
            roughness: 0.9,
            opacity: 0.4,
            transparent: true,
          }),
        );
      }

      /* ── Windows ── */
      addWindows3D(scene, r, rx, rz, rw, rd, baseY, wh, col);

      /* ── Door ── */
      addDoor3D(scene, r, rx, rz, rw, rd, baseY, wh);

      /* Furniture */
      addFurn3D(scene, r, rx, rz, rw, rd, baseY, col);

      /* Room label sprite */
      addLabel3D(scene, r.name, rx + rw / 2, baseY + 0.3, rz + rd / 2, col);
    });
  }

  /* Roof */
  addRoof(scene, 100 * SC, 100 * SC, floors * FH);

  /* Camera */
  const mx = 50 * SC,
    mz = 50 * SC,
    my = (floors * FH) / 2;
  const initR = Math.max(100 * SC, 100 * SC) * 1.55 + floors * 1.8;
  let theta = vi === 0 ? 0.6 : -0.5;
  let phi = 0.88,
    radius = initR;

  function updateCam() {
    camera.position.set(
      mx + radius * Math.sin(phi) * Math.sin(theta),
      my + radius * Math.cos(phi),
      mz + radius * Math.sin(phi) * Math.cos(theta),
    );
    camera.lookAt(mx, my * 0.6, mz);
  }
  updateCam();

  /* Controls */
  let drag = false,
    rt = false,
    px = 0,
    py = 0;
  canvas.onmousedown = (e) => {
    drag = true;
    rt = e.button === 2;
    px = e.clientX;
    py = e.clientY;
  };
  canvas.oncontextmenu = (e) => e.preventDefault();
  window.addEventListener("mouseup", () => (drag = false));
  window.addEventListener("mousemove", (e) => {
    if (!drag) return;
    if (rt) {
      /* pan */
    } else {
      theta -= (e.clientX - px) * 0.007;
      phi = Math.max(
        0.12,
        Math.min(Math.PI / 2.05, phi - (e.clientY - py) * 0.007),
      );
    }
    px = e.clientX;
    py = e.clientY;
    updateCam();
  });
  canvas.onwheel = (e) => {
    radius = Math.max(4, Math.min(80, radius + e.deltaY * 0.04));
    updateCam();
  };
  let t0x = 0,
    t0y = 0;
  canvas.addEventListener("touchstart", (e) => {
    t0x = e.touches[0].clientX;
    t0y = e.touches[0].clientY;
  });
  canvas.addEventListener("touchmove", (e) => {
    theta -= (e.touches[0].clientX - t0x) * 0.007;
    phi = Math.max(
      0.12,
      Math.min(Math.PI / 2.05, phi - (e.touches[0].clientY - t0y) * 0.007),
    );
    t0x = e.touches[0].clientX;
    t0y = e.touches[0].clientY;
    updateCam();
  });

  function animate() {
    animIds[vi] = requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();
}

/* ══════════════════════════════════════════════════════════════════════
 *  3D WINDOWS
 * ══════════════════════════════════════════════════════════════════════ */
/**
 * Adds window frame + glass panes on the FRONT wall (facing camera, z = rz+rd)
 * of rooms that logically have exterior windows.
 * Glass is a semi-transparent blue plane; frame is a thin border box.
 */
function addWindows3D(scene, r, rx, rz, rw, rd, baseY, wh, col) {
  const noWin = ["bath", "powder", "corridor", "stair", "store", "utility"];
  if (noWin.includes(r.type)) return;
  if (rw < 0.5 || rd < 0.4) return;

  const winCount = rw > 1.6 ? 2 : 1;
  const winW = Math.min(rw * 0.32, 0.72); // window width
  const winH = wh * 0.38; // window height
  const sillH = wh * 0.42; // height from floor to window bottom
  const winZ = rz + rd; // front wall Z position

  // Materials
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x9ecfff,
    roughness: 0.05,
    metalness: 0.1,
    opacity: 0.38,
    transparent: true,
    side: THREE.DoubleSide,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xf5f5f5,
    roughness: 0.55,
    metalness: 0.1,
  });

  const gap = rw / (winCount + 1);

  for (let i = 0; i < winCount; i++) {
    const wx = rx + gap * (i + 1);
    const wcy = baseY + sillH + winH / 2;

    // Glass pane
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), glassMat);
    glass.position.set(wx, wcy, winZ + 0.01);
    scene.add(glass);

    // Frame: top, bottom, left, right bars
    const frameThick = 0.04;
    const frameDepth = 0.07;

    // Top bar
    addBox(
      scene,
      wx,
      wcy + winH / 2,
      winZ,
      winW + frameThick * 2,
      frameThick,
      frameDepth,
      frameMat,
    );
    // Bottom bar (sill)
    addBox(
      scene,
      wx,
      wcy - winH / 2,
      winZ,
      winW + frameThick * 2,
      frameThick,
      frameDepth,
      frameMat,
    );
    // Left bar
    addBox(
      scene,
      wx - winW / 2,
      wcy,
      winZ,
      frameThick,
      winH,
      frameDepth,
      frameMat,
    );
    // Right bar
    addBox(
      scene,
      wx + winW / 2,
      wcy,
      winZ,
      frameThick,
      winH,
      frameDepth,
      frameMat,
    );

    // Centre mullion (vertical divider between panes)
    addBox(scene, wx, wcy, winZ, frameThick * 0.7, winH, frameDepth, frameMat);

    // Horizontal rail (mid-pane divider)
    addBox(scene, wx, wcy, winZ, winW, frameThick * 0.7, frameDepth, frameMat);

    // Inner glass shimmer effect (second translucent plane slightly offset)
    const shimmer = new THREE.Mesh(
      new THREE.PlaneGeometry(winW * 0.9, winH * 0.85),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0,
        metalness: 0,
        opacity: 0.08,
        transparent: true,
        side: THREE.DoubleSide,
      }),
    );
    shimmer.position.set(wx - winW * 0.15, wcy + winH * 0.1, winZ + 0.015);
    scene.add(shimmer);
  }
}

/* ══════════════════════════════════════════════════════════════════════
 *  3D DOOR
 * ══════════════════════════════════════════════════════════════════════ */
/**
 * Adds a door on the FRONT wall (z = rz+rd) of a room:
 *  - Door opening gap (wall segments above/beside the gap)
 *  - Semi-open door panel rotated ~60°
 *  - Thin frame around the opening
 *  - Small door knob sphere
 */
function addDoor3D(scene, r, rx, rz, rw, rd, baseY, wh) {
  const noDoor = ["garden", "terrace", "balcony", "stair", "corridor"];
  if (noDoor.includes(r.type)) return;
  if (rw < 0.4 || rd < 0.3) return;

  const doorW = Math.min(rw * 0.28, 0.82); // door width
  const doorH = Math.min(wh * 0.72, 2.2); // door height
  const doorZ = rz + rd; // front wall Z
  const doorX = rx + rw * 0.15; // left side of door opening

  // Frame material
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xc9a96e, // warm wood tone
    roughness: 0.65,
    metalness: 0.05,
  });
  // Door panel material
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x8b5e3c, // darker wood
    roughness: 0.7,
    metalness: 0.0,
  });
  // Knob material
  const knobMat = new THREE.MeshStandardMaterial({
    color: 0xe0a020,
    roughness: 0.15,
    metalness: 0.9,
  });

  const frameThick = 0.06;
  const frameDepth = 0.12;

  // Door frame: left jamb, right jamb, header (lintel)
  // Left jamb
  addBox(
    scene,
    doorX - frameThick / 2,
    baseY + doorH / 2,
    doorZ,
    frameThick,
    doorH,
    frameDepth,
    frameMat,
  );
  // Right jamb
  addBox(
    scene,
    doorX + doorW + frameThick / 2,
    baseY + doorH / 2,
    doorZ,
    frameThick,
    doorH,
    frameDepth,
    frameMat,
  );
  // Header
  addBox(
    scene,
    doorX + doorW / 2,
    baseY + doorH + frameThick / 2,
    doorZ,
    doorW + frameThick * 2,
    frameThick,
    frameDepth,
    frameMat,
  );

  // Wall fill ABOVE the door opening (up to full wall height)
  const aboveH = wh - doorH - frameThick;
  if (aboveH > 0.05) {
    const wallAboveMat = new THREE.MeshStandardMaterial({
      color: 0xf0eeff,
      roughness: 0.92,
      opacity: 0.1,
      transparent: true,
      side: THREE.DoubleSide,
    });
    addBox(
      scene,
      doorX + doorW / 2,
      baseY + doorH + frameThick + aboveH / 2,
      doorZ,
      doorW + frameThick * 2,
      aboveH,
      0.1,
      wallAboveMat,
    );
  }

  // Door panel — semi-open at ~55° from wall plane
  // Hinged at left jamb (doorX), swings inward (negative Z direction)
  const doorAngle = Math.PI / 3; // 60° open
  const panelGroup = new THREE.Group();
  panelGroup.position.set(doorX, baseY, doorZ);

  // Door panel mesh (pivot at x=0 local, then rotate)
  const panelMesh = new THREE.Mesh(
    new THREE.BoxGeometry(doorW, doorH - 0.04, 0.045),
    panelMat,
  );
  // Shift panel so hinge is at x=0
  panelMesh.position.set(doorW / 2, doorH / 2, 0);
  panelGroup.add(panelMesh);

  // Door panel inset rectangles (decorative recessed panels)
  const insetMat = new THREE.MeshStandardMaterial({
    color: 0x6b4829,
    roughness: 0.75,
  });
  // Upper inset
  const insetUpper = new THREE.Mesh(
    new THREE.BoxGeometry(doorW * 0.7, doorH * 0.38, 0.03),
    insetMat,
  );
  insetUpper.position.set(doorW / 2, doorH * 0.67, 0.02);
  panelGroup.add(insetUpper);

  // Lower inset
  const insetLower = new THREE.Mesh(
    new THREE.BoxGeometry(doorW * 0.7, doorH * 0.32, 0.03),
    insetMat,
  );
  insetLower.position.set(doorW / 2, doorH * 0.24, 0.02);
  panelGroup.add(insetLower);

  // Door knob
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), knobMat);
  knob.position.set(doorW * 0.82, doorH * 0.44, 0.05);
  panelGroup.add(knob);

  // Knob backplate
  const backplate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, 0.015, 10),
    new THREE.MeshStandardMaterial({
      color: 0xb8860b,
      roughness: 0.2,
      metalness: 0.9,
    }),
  );
  backplate.rotation.x = Math.PI / 2;
  backplate.position.set(doorW * 0.82, doorH * 0.44, 0.035);
  panelGroup.add(backplate);

  // Rotate the whole group around the hinge axis (Y axis at local origin)
  panelGroup.rotation.y = -doorAngle;

  panelGroup.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  scene.add(panelGroup);
}

/* ── Helpers ─────────────────────────────────────────────────────────── */
function addBox(sc, x, y, z, w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  sc.add(m);
  return m;
}

function addExtWalls(sc, W, D, baseY, fh) {
  const m = new THREE.MeshStandardMaterial({
    color: 0xf5f3ff,
    roughness: 0.92,
    opacity: 0.11,
    transparent: true,
  });
  addBox(sc, W / 2, baseY + fh / 2, 0, W, fh, 0.18, m);
  addBox(sc, W / 2, baseY + fh / 2, D, W, fh, 0.18, m);
  addBox(sc, 0, baseY + fh / 2, D / 2, 0.18, fh, D, m);
  addBox(sc, W, baseY + fh / 2, D / 2, 0.18, fh, D, m);
}

function addRoof(sc, W, D, topY) {
  const rm = new THREE.Mesh(
    new THREE.BoxGeometry(W + 0.3, 0.18, D + 0.3),
    new THREE.MeshStandardMaterial({ color: 0x221a44, roughness: 0.8 }),
  );
  rm.position.set(W / 2, topY + 0.09, D / 2);
  rm.castShadow = true;
  sc.add(rm);
  const pm = new THREE.MeshStandardMaterial({
    color: 0x2e2060,
    roughness: 0.8,
  });
  [
    [W / 2, topY + 0.38, 0, W, 0.75, 0.22],
    [W / 2, topY + 0.38, D, W, 0.75, 0.22],
    [0, topY + 0.38, D / 2, 0.22, 0.75, D],
    [W, topY + 0.38, D / 2, 0.22, 0.75, D],
  ].forEach(([x, y, z, w, h, d]) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), pm);
    p.position.set(x, y, z);
    sc.add(p);
  });
}

function addStairs(sc, r, baseY, sc2, fh) {
  const rx = r.x * sc2,
    rz = r.y * sc2,
    rw = r.w * sc2,
    rd = r.h * sc2;
  const steps = 12,
    sh = fh / steps,
    sd = rd / steps;
  const mat = new THREE.MeshStandardMaterial({
    color: 0xb2bec3,
    roughness: 0.65,
  });
  for (let s = 0; s < steps; s++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(rw, sh * (s + 1), sd), mat);
    m.position.set(
      rx + rw / 2,
      baseY + (sh * (s + 1)) / 2,
      rz + sd * s + sd / 2,
    );
    m.castShadow = true;
    m.receiveShadow = true;
    sc.add(m);
  }
  const rm = new THREE.MeshStandardMaterial({
    color: 0xdfe6e9,
    metalness: 0.5,
    roughness: 0.3,
  });
  const pg = new THREE.CylinderGeometry(0.03, 0.03, fh, 8);
  for (let s = 0; s < steps; s += 2) {
    const p = new THREE.Mesh(pg, rm);
    p.position.set(rx + rw - 0.08, baseY + fh / 2, rz + sd * s + sd / 2);
    sc.add(p);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, rd), rm);
  bar.position.set(rx + rw - 0.08, baseY + fh, rz + rd / 2);
  sc.add(bar);
}

function addLabel3D(sc, name, x, y, z, col) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 52;
  const ctx2 = c.getContext("2d");
  ctx2.fillStyle = "rgba(0,0,0,0)";
  ctx2.fillRect(0, 0, 256, 52);
  ctx2.font = "bold 17px 'Segoe UI',sans-serif";
  ctx2.textAlign = "center";
  ctx2.textBaseline = "middle";
  ctx2.shadowColor = "rgba(0,0,0,0.9)";
  ctx2.shadowBlur = 6;
  ctx2.fillStyle = "#ffffff";
  ctx2.fillText(name, 128, 26);
  const tex = new THREE.CanvasTexture(c);
  const sp = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.95 }),
  );
  sp.position.set(x, y + 0.12, z);
  sp.scale.set(2.2, 0.44, 1);
  sc.add(sp);
}

/* ── 3D Furniture ────────────────────────────────────────────────────── */
function addFurn3D(sc, r, rx, rz, rw, rd, baseY, col) {
  const add = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    sc.add(m);
  };
  const M = (c, rough = 0.8, metal = 0) =>
    new THREE.MeshStandardMaterial({
      color: c,
      roughness: rough,
      metalness: metal,
    });
  const cx = rx + rw / 2,
    cz = rz + rd / 2;

  switch (r.type) {
    case "master":
    case "bed": {
      add(
        new THREE.BoxGeometry(rw * 0.54, 0.38, rd * 0.7),
        M(0x5c3a1e),
        cx,
        baseY + 0.19,
        cz + rd * 0.03,
      );
      add(
        new THREE.BoxGeometry(rw * 0.52, 0.16, rd * 0.6),
        M(0xf4efe8),
        cx,
        baseY + 0.45,
        cz + rd * 0.03,
      );
      [-1, 1].forEach((s) =>
        add(
          new THREE.BoxGeometry(rw * 0.2, 0.09, rd * 0.16),
          M(0xffffff),
          cx + s * rw * 0.14,
          baseY + 0.53,
          cz - rd * 0.22,
        ),
      );
      add(
        new THREE.BoxGeometry(rw * 0.55, 0.7, 0.1),
        M(0x3d2014),
        cx,
        baseY + 0.64,
        cz - rd * 0.35 + 0.05,
      );
      if (rw > 0.8) {
        add(
          new THREE.BoxGeometry(0.43, 0.52, 0.43),
          M(0x6b4f3a),
          cx + rw * 0.34,
          baseY + 0.26,
          cz - rd * 0.22,
        );
        add(
          new THREE.CylinderGeometry(0.04, 0.06, 0.52, 8),
          M(0xe0a020),
          cx + rw * 0.34,
          baseY + 0.78,
          cz - rd * 0.22,
        );
        add(
          new THREE.BoxGeometry(rw * 0.3, 1.85, 0.44),
          M(0x8b6914, 0.7),
          rx + rw * 0.15,
          baseY + 0.93,
          rz + 0.22,
        );
      }
      break;
    }
    case "bath": {
      add(
        new THREE.CylinderGeometry(0.2, 0.2, 0.4, 14),
        M(0xfafafa, 0.3),
        rx + rw * 0.22,
        baseY + 0.2,
        rz + rd * 0.18,
      );
      add(
        new THREE.BoxGeometry(0.43, 0.14, 0.35),
        M(0xfafafa, 0.2),
        rx + rw * 0.7,
        baseY + 0.82,
        rz + rd * 0.13,
      );
      add(
        new THREE.BoxGeometry(0.44, 0.62, 0.04),
        M(0x9ecfff, 0.1, 0.9),
        rx + rw * 0.7,
        baseY + 1.32,
        rz + 0.04,
      );
      add(
        new THREE.BoxGeometry(rw * 0.44, 0.46, rd * 0.36),
        M(0xfafafa, 0.2),
        cx - rw * 0.04,
        baseY + 0.23,
        rz + rd * 0.64,
      );
      break;
    }
    case "powder": {
      add(
        new THREE.CylinderGeometry(0.18, 0.18, 0.36, 14),
        M(0xfafafa, 0.3),
        cx,
        baseY + 0.18,
        cz,
      );
      add(
        new THREE.BoxGeometry(0.4, 0.13, 0.32),
        M(0xfafafa, 0.2),
        cx,
        baseY + 0.8,
        rz + rd * 0.2,
      );
      break;
    }
    case "kitchen": {
      add(
        new THREE.BoxGeometry(rw * 0.68, 0.88, 0.52),
        M(0x5a5a5a, 0.4),
        rx + rw * 0.34,
        baseY + 0.44,
        rz + 0.26,
      );
      add(
        new THREE.BoxGeometry(0.52, 0.88, rd * 0.48),
        M(0x5a5a5a, 0.4),
        rx + 0.26,
        baseY + 0.44,
        rz + rd * 0.24,
      );
      add(
        new THREE.BoxGeometry(rw * 0.68, 0.055, 0.52),
        M(0xd0d0d0, 0.2),
        rx + rw * 0.34,
        baseY + 0.9,
        rz + 0.26,
      );
      for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++)
          add(
            new THREE.CylinderGeometry(0.085, 0.085, 0.04, 12),
            M(0x333333),
            rx + rw * 0.52 + j * 0.2 * rw,
            baseY + 0.92,
            rz + 0.12 + i * 0.16,
          );
      add(
        new THREE.BoxGeometry(0.64, 1.76, 0.64),
        M(0xe8e8e8, 0.3),
        rx + rw * 0.87,
        baseY + 0.88,
        rz + rd * 0.6,
      );
      break;
    }
    case "living":
    case "hall":
    case "lounge": {
      add(
        new THREE.BoxGeometry(rw * 0.58, 0.52, rd * 0.2),
        M(0x2d3f5e),
        cx,
        baseY + 0.26,
        rz + rd * 0.12,
      );
      add(
        new THREE.BoxGeometry(rw * 0.58, 0.64, 0.16),
        M(0x2d3f5e),
        cx,
        baseY + 0.58,
        rz + rd * 0.22,
      );
      add(
        new THREE.BoxGeometry(rw * 0.28, 0.07, rd * 0.16),
        M(0x7b4f2a, 0.5),
        cx,
        baseY + 0.62,
        rz + rd * 0.4,
      );
      add(
        new THREE.BoxGeometry(rw * 0.46, 0.68, 0.07),
        M(0x111111, 0.2),
        cx,
        baseY + 1.06,
        rz + rd * 0.87,
      );
      [-1, 1].forEach((s) =>
        add(
          new THREE.BoxGeometry(rd * 0.15, 0.46, rd * 0.15),
          M(0x3d4f6e),
          cx + s * rw * 0.33,
          baseY + 0.23,
          rz + rd * 0.37,
        ),
      );
      break;
    }
    case "dining": {
      add(
        new THREE.BoxGeometry(rw * 0.44, 0.07, rd * 0.52),
        M(0x8b5a2b, 0.5),
        cx,
        baseY + 0.72,
        cz,
      );
      [-1, 1].forEach((i) =>
        [-1, 1].forEach((j) =>
          add(
            new THREE.CylinderGeometry(0.04, 0.04, 0.72, 8),
            M(0x6b4423),
            cx + i * rw * 0.17,
            baseY + 0.36,
            cz + j * rd * 0.2,
          ),
        ),
      );
      [-1, 1].forEach((i) =>
        [-1, 0, 1].forEach((j) =>
          add(
            new THREE.BoxGeometry(0.36, 0.42, 0.36),
            M(0x4a3728),
            cx + i * rw * 0.33,
            baseY + 0.21,
            cz + j * rd * 0.25,
          ),
        ),
      );
      break;
    }
    case "study":
    case "office": {
      add(
        new THREE.BoxGeometry(rw * 0.64, 0.055, rd * 0.36),
        M(0x7a5c3c, 0.6),
        cx,
        baseY + 0.72,
        rz + rd * 0.18,
      );
      add(
        new THREE.BoxGeometry(0.44, 0.42, 0.44),
        M(0x222222, 0.8),
        cx,
        baseY + 0.21,
        rz + rd * 0.42,
      );
      add(
        new THREE.BoxGeometry(0.46, 0.32, 0.04),
        M(0x111111),
        cx,
        baseY + 1.04,
        rz + rd * 0.09,
      );
      add(
        new THREE.BoxGeometry(0.26, 1.54, rd * 0.68),
        M(0x6b4f3a, 0.8),
        rx + 0.13,
        baseY + 0.77,
        cz,
      );
      break;
    }
    case "garden":
    case "terrace": {
      [
        [0.16, 0.22],
        [0.55, 0.16],
        [0.8, 0.34],
        [0.28, 0.64],
        [0.66, 0.7],
      ].forEach(([gx, gy]) => {
        const tx = rx + gx * rw,
          tz = rz + gy * rd;
        add(
          new THREE.CylinderGeometry(0.09, 0.13, 1.12, 8),
          M(0x5a3e28),
          tx,
          baseY + 0.56,
          tz,
        );
        add(
          new THREE.SphereGeometry(0.58, 8, 6),
          M(0x2d8a4e, 1),
          tx,
          baseY + 1.7,
          tz,
        );
      });
      const gp = new THREE.Mesh(
        new THREE.PlaneGeometry(rw - 0.18, rd - 0.18),
        new THREE.MeshStandardMaterial({
          color: 0x4ade80,
          roughness: 1,
          opacity: 0.5,
          transparent: true,
        }),
      );
      gp.rotation.x = -Math.PI / 2;
      gp.position.set(cx, baseY + 0.02, cz);
      sc.add(gp);
      add(
        new THREE.BoxGeometry(0.84, 0.09, 0.32),
        M(0x8b6914),
        cx,
        baseY + 0.44,
        cz,
      );
      break;
    }
    case "garage": {
      add(
        new THREE.BoxGeometry(rw * 0.62, 0.54, rd * 0.52),
        M(0x1a3a5c, 0.3, 0.65),
        cx,
        baseY + 0.37,
        cz,
      );
      add(
        new THREE.BoxGeometry(rw * 0.38, 0.42, rd * 0.38),
        M(0x1a3a5c, 0.3, 0.65),
        cx,
        baseY + 0.88,
        cz,
      );
      [-1, 1].forEach((i) =>
        [-1, 1].forEach((j) => {
          const wg = new THREE.CylinderGeometry(0.18, 0.18, 0.11, 12);
          wg.rotateZ(Math.PI / 2);
          add(
            wg,
            M(0x111111),
            cx + i * rw * 0.27,
            baseY + 0.19,
            cz + j * rd * 0.19,
          );
        }),
      );
      break;
    }
    case "balcony": {
      const rm = M(0xd4d4d4, 0.3, 0.75);
      const posts = Math.max(2, Math.floor(rw / 0.56));
      for (let p = 0; p <= posts; p++)
        add(
          new THREE.CylinderGeometry(0.03, 0.03, 0.94, 8),
          rm,
          rx + 0.3 + (p * (rw - 0.6)) / posts,
          baseY + 0.47,
          rz + 0.08,
        );
      add(
        new THREE.BoxGeometry(rw, 0.06, 0.06),
        rm,
        cx,
        baseY + 0.94,
        rz + 0.08,
      );
      add(
        new THREE.BoxGeometry(0.44, 0.44, 0.44),
        M(0xfafafa, 0.85),
        cx - 0.36,
        baseY + 0.22,
        cz,
      );
      add(
        new THREE.CylinderGeometry(0.26, 0.26, 0.055, 12),
        M(0xfafafa, 0.5),
        cx + 0.36,
        baseY + 0.58,
        cz,
      );
      break;
    }
    case "porch":
    case "foyer": {
      [0.22, 0.78].forEach((cx2) =>
        add(
          new THREE.CylinderGeometry(0.1, 0.13, FH * 0.88, 12),
          M(0xfde68a, 0.7),
          rx + cx2 * rw,
          baseY + FH * 0.44,
          rz + rd * 0.5,
        ),
      );
      break;
    }
  }
}

/* ── Space distribution bars ─────────────────────────────────────────── */
function drawDistBars(vi) {
  const el = document.getElementById(`dist-${vi}`);
  if (!el) return;
  const v = DESIGN_DATA?.variations?.[vi];
  if (!v) return;
  const rooms = v.rooms || [];
  const total = DESIGN_DATA?.total_area || 1;
  el.innerHTML = "";
  rooms.forEach((r) => {
    const pct = Math.round((r.sqft / total) * 100);
    el.innerHTML += `<div class="dist-item">
      <div class="dist-row-label"><span style="color:${r.color}">${r.name}</span><span>${r.sqft} sqft (${pct}%)</span></div>
      <div class="dist-bar-bg"><div class="dist-bar-fill" style="width:0%;background:${r.color}" data-width="${pct}%"></div></div>
    </div>`;
  });
  setTimeout(() => {
    el.querySelectorAll(".dist-bar-fill").forEach(
      (b) => (b.style.width = b.dataset.width),
    );
  }, 220);
}

/* ── Floor pills ─────────────────────────────────────────────────────── */
function buildFloorPills() {
  const floors = DESIGN_DATA.floors || 1;
  if (floors <= 1) return;
  [0, 1].forEach((vi) => {
    const sel = document.getElementById(`fsel-${vi}`);
    if (!sel) return;
    sel.innerHTML = `<span class="fpill-label">Floor:</span>`;
    for (let f = 0; f < floors; f++) {
      const b = document.createElement("button");
      b.className = `floor-pill fpill-${vi}${f === 0 ? " active" : ""}`;
      b.textContent = f === 0 ? "G (F1)" : `F${f + 1}`;
      b.onclick = () => switchFloor(vi, f);
      sel.appendChild(b);
    }
    sel.style.display = "flex";
  });
}

/* ── Init ────────────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  initDesignsPage();
  if (!DESIGN_DATA?.variations) return;
  buildFloorPills();
  DESIGN_DATA.variations.forEach((_, i) => {
    draw2D(i);
    drawDistBars(i);
  });
});
window.addEventListener("resize", () => {
  if (DESIGN_DATA?.variations)
    DESIGN_DATA.variations.forEach((_, i) => draw2D(i));
});
