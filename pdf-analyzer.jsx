import { useState, useRef, useCallback } from "react";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function ptToCm(pt) {
  return (pt * 0.0352778).toFixed(1);
}

async function extractPDFInfo(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target.result;
      const bytes = new Uint8Array(buffer);
      const text = new TextDecoder("latin1").decode(bytes);

      const titleMatch = text.match(/\/Title\s*\(([^)]*)\)/);
      const authorMatch = text.match(/\/Author\s*\(([^)]*)\)/);

      const pagesMatch2 = [...text.matchAll(/\/Type\s*\/Page[^s]/g)];
      const pagesMatch = text.match(/\/N\s+(\d+)/);
      const pageCount = pagesMatch2.length || (pagesMatch ? parseInt(pagesMatch[1]) : 1);

      // Only CMYK or RGB
      let colorProfile = "RGB";
      if (text.includes("/DeviceCMYK") || text.includes("/CMYK")) {
        colorProfile = "CMYK";
      }

      const versionMatch = text.match(/%PDF-(\d+\.\d+)/);
      const pdfVersion = versionMatch ? versionMatch[1] : "Unknown";

      const mediaBoxMatch = text.match(/\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/);
      let pageSize = "Desconocido";
      let pageSizeCm = null;
      if (mediaBoxMatch) {
        const wPt = parseFloat(mediaBoxMatch[3]);
        const hPt = parseFloat(mediaBoxMatch[4]);
        const wCm = ptToCm(wPt);
        const hCm = ptToCm(hPt);
        pageSizeCm = { w: wCm, h: hCm };
        const wMm = Math.round(wPt * 0.352778);
        const hMm = Math.round(hPt * 0.352778);
        if (Math.abs(wMm - 210) < 5 && Math.abs(hMm - 297) < 5) pageSize = "A4";
        else if (Math.abs(wMm - 148) < 5 && Math.abs(hMm - 210) < 5) pageSize = "A5";
        else if (Math.abs(wMm - 297) < 5 && Math.abs(hMm - 420) < 5) pageSize = "A3";
        else if (Math.abs(wMm - 216) < 5 && Math.abs(hMm - 279) < 5) pageSize = "Letter";
        else if (Math.abs(wMm - 216) < 5 && Math.abs(hMm - 356) < 5) pageSize = "Legal";
        else pageSize = "Personalizado";
      }

      const isEncrypted = text.includes("/Encrypt");
      const hasImages = text.includes("/Image") || text.includes("/XObject");

      resolve({
        title: titleMatch ? titleMatch[1] : file.name.replace(".pdf", ""),
        author: authorMatch ? authorMatch[1] : "No especificado",
        colorProfile,
        pdfVersion,
        pageSize,
        pageSizeCm,
        pageCount: Math.max(pageCount, 1),
        isEncrypted,
        hasImages,
        fileSize: file.size,
        fileName: file.name,
        lastModified: new Date(file.lastModified).toLocaleDateString("es-ES", {
          year: "numeric", month: "long", day: "numeric"
        }),
      });
    };
    reader.readAsArrayBuffer(file);
  });
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --crimson:   #7b0d0d;
    --scarlet:   #b52b2b;
    --vermilion: #d94040;
    --coral:     #e8736a;
    --rose:      #f2a59d;
    --blush:     #fce8e6;
    --parchment: #fdf4f3;
    --light:     #fffafa;
    --ink:       #1c0a0a;
    --muted:     #9e6a68;
    --border:    #ead8d6;
    --border2:   #d9b3b0;
  }

  body { font-family: 'Syne', sans-serif; background: var(--parchment); color: var(--ink); min-height: 100vh; }
  .app { min-height: 100vh; display: flex; flex-direction: column; }

  /* AUTH */
  .auth-wrap { min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr; }
  .auth-left {
    background: linear-gradient(160deg, var(--crimson) 0%, var(--scarlet) 60%, var(--vermilion) 100%);
    color: var(--light); padding: 60px;
    display: flex; flex-direction: column; justify-content: space-between;
    position: relative; overflow: hidden;
  }
  .auth-left::before {
    content: ''; position: absolute; top: -80px; right: -80px;
    width: 360px; height: 360px; border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 65%);
  }
  .auth-left::after {
    content: ''; position: absolute; bottom: -60px; left: -60px;
    width: 280px; height: 280px; border-radius: 50%;
    background: radial-gradient(circle, rgba(0,0,0,0.15) 0%, transparent 65%);
  }
  .auth-brand { position: relative; z-index: 1; }
  .auth-logo { font-family: 'DM Serif Display', serif; font-size: 2rem; letter-spacing: -1px; }
  .auth-logo span { color: var(--rose); }
  .auth-tagline { margin-top: 8px; color: rgba(252,232,230,0.6); font-size: 0.78rem; letter-spacing: 0.12em; text-transform: uppercase; }
  .auth-left-body { position: relative; z-index: 1; }
  .auth-headline { font-family: 'DM Serif Display', serif; font-size: 2.9rem; line-height: 1.15; margin-bottom: 20px; }
  .auth-headline em { font-style: italic; color: var(--rose); }
  .auth-desc { color: rgba(252,232,230,0.72); font-size: 0.9rem; line-height: 1.8; }
  .auth-features { margin-top: 28px; display: flex; flex-direction: column; gap: 12px; }
  .auth-feature { display: flex; align-items: center; gap: 12px; color: rgba(252,232,230,0.65); font-size: 0.84rem; }
  .auth-feature-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--rose); flex-shrink: 0; }
  .auth-left-footer { color: rgba(252,232,230,0.3); font-size: 0.72rem; position: relative; z-index: 1; }

  .auth-right { background: var(--light); padding: 60px; display: flex; align-items: center; justify-content: center; }
  .auth-form-wrap { width: 100%; max-width: 420px; }
  .auth-tabs { display: flex; margin-bottom: 40px; border-bottom: 2px solid var(--border); }
  .auth-tab {
    flex: 1; padding: 12px; background: none; border: none; font-family: 'Syne', sans-serif;
    font-size: 0.95rem; font-weight: 600; color: var(--muted); cursor: pointer;
    border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; letter-spacing: 0.02em;
  }
  .auth-tab.active { color: var(--crimson); border-bottom-color: var(--crimson); }
  .auth-form-title { font-family: 'DM Serif Display', serif; font-size: 2rem; margin-bottom: 6px; color: var(--ink); }
  .auth-form-sub { color: var(--muted); font-size: 0.875rem; margin-bottom: 32px; }

  .field { margin-bottom: 20px; }
  .field label { display: block; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
  .field input {
    width: 100%; padding: 14px 16px; background: var(--parchment); border: 1.5px solid var(--border);
    border-radius: 10px; font-family: 'DM Mono', monospace; font-size: 0.9rem; color: var(--ink);
    outline: none; transition: all 0.2s;
  }
  .field input:focus { border-color: var(--scarlet); background: var(--light); box-shadow: 0 0 0 3px rgba(123,13,13,0.1); }
  .field input::placeholder { color: var(--border2); }

  .btn-primary {
    width: 100%; padding: 16px; background: var(--crimson); color: var(--light);
    border: none; border-radius: 10px; font-family: 'Syne', sans-serif;
    font-size: 0.95rem; font-weight: 700; letter-spacing: 0.04em; cursor: pointer;
    transition: all 0.25s; margin-top: 8px;
  }
  .btn-primary:hover { background: var(--scarlet); transform: translateY(-1px); box-shadow: 0 8px 28px rgba(123,13,13,0.28); }
  .btn-primary:active { transform: none; }

  .auth-divider { text-align: center; margin: 24px 0; color: var(--muted); font-size: 0.8rem; position: relative; }
  .auth-divider::before, .auth-divider::after { content: ''; position: absolute; top: 50%; width: 38%; height: 1px; background: var(--border); }
  .auth-divider::before { left: 0; } .auth-divider::after { right: 0; }

  .btn-ghost {
    width: 100%; padding: 14px; background: transparent; color: var(--ink);
    border: 1.5px solid var(--border); border-radius: 10px; font-family: 'Syne', sans-serif;
    font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
    display: flex; align-items: center; justify-content: center; gap: 10px;
  }
  .btn-ghost:hover { border-color: var(--scarlet); color: var(--scarlet); background: var(--blush); }

  /* NAV */
  .dash-nav {
    background: linear-gradient(90deg, var(--crimson) 0%, var(--scarlet) 100%);
    color: var(--light); padding: 0 48px;
    display: flex; align-items: center; justify-content: space-between; height: 64px;
    position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 16px rgba(123,13,13,0.3);
  }
  .nav-logo { font-family: 'DM Serif Display', serif; font-size: 1.4rem; }
  .nav-logo span { color: var(--rose); }
  .nav-right { display: flex; align-items: center; gap: 20px; }
  .nav-user { font-size: 0.78rem; color: rgba(252,232,230,0.6); letter-spacing: 0.07em; text-transform: uppercase; }
  .nav-logout {
    background: none; border: 1px solid rgba(252,232,230,0.25); color: rgba(252,232,230,0.6);
    padding: 7px 15px; border-radius: 6px; font-family: 'Syne', sans-serif; font-size: 0.78rem;
    cursor: pointer; transition: all 0.2s; letter-spacing: 0.04em;
  }
  .nav-logout:hover { border-color: var(--rose); color: var(--rose); }

  /* HERO */
  .dash-hero { padding: 80px 48px 60px; max-width: 860px; margin: 0 auto; width: 100%; text-align: center; }
  .hero-eyebrow { font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--scarlet); font-weight: 700; margin-bottom: 16px; }
  .hero-title { font-family: 'DM Serif Display', serif; font-size: 3.4rem; line-height: 1.1; margin-bottom: 16px; color: var(--ink); }
  .hero-title em { font-style: italic; color: var(--crimson); }
  .hero-sub { color: var(--muted); font-size: 1rem; line-height: 1.75; max-width: 520px; margin: 0 auto; }

  /* UPLOAD */
  .upload-section { padding: 0 48px 80px; max-width: 860px; margin: 0 auto; width: 100%; }
  .drop-zone {
    border: 2px dashed var(--border2); border-radius: 20px; padding: 80px 48px;
    text-align: center; cursor: pointer; transition: all 0.3s; background: var(--light); position: relative; overflow: hidden;
  }
  .drop-zone::before {
    content: ''; position: absolute; inset: 0; opacity: 0;
    background: radial-gradient(ellipse at center, rgba(123,13,13,0.05) 0%, transparent 70%);
    transition: opacity 0.3s;
  }
  .drop-zone.dragging { border-color: var(--crimson); border-style: solid; }
  .drop-zone.dragging::before { opacity: 1; }
  .drop-zone:hover { border-color: var(--coral); }
  .drop-icon {
    width: 72px; height: 72px; margin: 0 auto 24px;
    background: var(--blush); border-radius: 20px; display: flex; align-items: center; justify-content: center;
  }
  .drop-icon svg { width: 34px; height: 34px; color: var(--crimson); }
  .drop-title { font-family: 'DM Serif Display', serif; font-size: 1.7rem; margin-bottom: 8px; color: var(--ink); }
  .drop-sub { color: var(--muted); font-size: 0.875rem; margin-bottom: 24px; }
  .drop-badge { display: inline-block; padding: 6px 14px; background: var(--blush); border-radius: 20px; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--scarlet); }
  .file-preview-pill { display: inline-flex; align-items: center; gap: 12px; background: var(--blush); border: 1px solid var(--border2); border-radius: 12px; padding: 12px 20px; margin-top: 20px; }
  .pill-name { font-family: 'DM Mono', monospace; font-size: 0.85rem; color: var(--ink); font-weight: 500; }
  .pill-size { font-size: 0.75rem; color: var(--muted); }
  .pill-remove { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 1.1rem; padding: 0 4px; transition: color 0.2s; }
  .pill-remove:hover { color: var(--crimson); }
  .btn-analyze {
    display: block; width: 100%; max-width: 360px; margin: 32px auto 0; padding: 20px;
    background: linear-gradient(135deg, var(--crimson) 0%, var(--scarlet) 100%);
    color: white; border: none; border-radius: 14px; font-family: 'Syne', sans-serif;
    font-size: 1rem; font-weight: 700; letter-spacing: 0.06em; cursor: pointer; transition: all 0.25s; text-transform: uppercase;
  }
  .btn-analyze:hover { background: linear-gradient(135deg, var(--scarlet) 0%, var(--vermilion) 100%); transform: translateY(-2px); box-shadow: 0 12px 32px rgba(123,13,13,0.28); }
  .btn-analyze:disabled { background: var(--border); color: var(--muted); transform: none; box-shadow: none; cursor: not-allowed; }

  /* LOADING */
  .analyzing-wrap { text-align: center; padding: 60px 48px; }
  .analyzing-title { font-family: 'DM Serif Display', serif; font-size: 2.1rem; margin-bottom: 10px; color: var(--ink); }
  .analyzing-sub { color: var(--muted); margin-bottom: 40px; font-size: 0.9rem; }
  .progress-bar { width: 100%; max-width: 400px; margin: 0 auto; height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, var(--crimson), var(--coral)); border-radius: 2px; animation: progress 2.2s ease-in-out forwards; }
  @keyframes progress { from { width: 0; } to { width: 100%; } }
  .scanning-steps { display: flex; flex-direction: column; gap: 10px; margin-top: 32px; max-width: 320px; margin-left: auto; margin-right: auto; }
  .step { font-size: 0.8rem; color: var(--muted); display: flex; align-items: center; gap: 10px; opacity: 0; animation: fadeStep 0.4s ease forwards; }
  .step:nth-child(1) { animation-delay: 0.3s; }
  .step:nth-child(2) { animation-delay: 0.9s; }
  .step:nth-child(3) { animation-delay: 1.5s; }
  .step-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--scarlet); flex-shrink: 0; }
  @keyframes fadeStep { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: none; } }

  /* RESULTS */
  .results-wrap { padding: 48px; max-width: 1100px; margin: 0 auto; width: 100%; }
  .results-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 40px; flex-wrap: wrap; gap: 16px; }
  .results-title { font-family: 'DM Serif Display', serif; font-size: 2rem; color: var(--ink); }
  .results-title span { color: var(--crimson); }
  .btn-new {
    padding: 12px 24px; background: linear-gradient(135deg, var(--crimson), var(--scarlet));
    color: var(--light); border: none; border-radius: 10px; font-family: 'Syne', sans-serif;
    font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.2s; letter-spacing: 0.04em;
  }
  .btn-new:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(123,13,13,0.25); }

  .results-grid { display: grid; grid-template-columns: 1fr 1.7fr; gap: 28px; }

  .preview-card { background: var(--light); border-radius: 20px; overflow: hidden; border: 1px solid var(--border); display: flex; flex-direction: column; }
  .preview-card-head { padding: 18px 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
  .card-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
  .preview-badge { padding: 4px 10px; background: var(--blush); color: var(--crimson); border-radius: 20px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
  .preview-body { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 36px 24px; background: var(--parchment); }
  .pdf-thumb {
    width: 100%; max-width: 200px; aspect-ratio: 8.5 / 11; background: white;
    border-radius: 6px; box-shadow: 0 16px 48px rgba(123,13,13,0.12), 0 2px 8px rgba(0,0,0,0.06);
    display: flex; flex-direction: column; padding: 18px; position: relative; overflow: hidden;
  }
  .pdf-thumb::after { content: ''; position: absolute; top: 0; right: 0; border-style: solid; border-width: 0 20px 20px 0; border-color: transparent var(--parchment) transparent transparent; }
  .pdf-thumb-header { width: 55%; height: 7px; background: var(--border); border-radius: 4px; margin-bottom: 10px; }
  .pdf-thumb-line { height: 4px; background: var(--blush); border-radius: 3px; margin-bottom: 5px; }
  .pdf-thumb-line.short { width: 62%; }
  .pdf-thumb-line.med { width: 80%; }
  .pdf-thumb-block { width: 100%; aspect-ratio: 16/9; background: var(--blush); border-radius: 5px; margin: 10px 0; }
  .pdf-thumb-footer { margin-top: auto; display: flex; align-items: center; gap: 7px; }
  .pdf-thumb-label { font-family: 'DM Mono', monospace; font-size: 0.6rem; color: var(--muted); }
  .preview-info { margin-top: 20px; text-align: center; }
  .preview-filename { font-family: 'DM Mono', monospace; font-size: 0.78rem; color: var(--ink); font-weight: 500; word-break: break-all; }
  .preview-pages { font-size: 0.73rem; color: var(--muted); margin-top: 4px; }

  .stats-card { background: var(--light); border-radius: 20px; border: 1px solid var(--border); overflow: hidden; }
  .stats-card-head { padding: 18px 28px; border-bottom: 1px solid var(--border); }
  .stats-card-name { font-family: 'DM Serif Display', serif; font-size: 1.3rem; margin-top: 4px; color: var(--ink); }

  .stats-grid { padding: 24px 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .stat-item { padding: 20px; background: var(--parchment); border-radius: 14px; border: 1px solid var(--border); transition: border-color 0.2s; }
  .stat-item:hover { border-color: var(--border2); }
  .stat-label { font-size: 0.67rem; font-weight: 700; letter-spacing: 0.11em; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; }
  .stat-value { font-family: 'DM Mono', monospace; font-size: 1.05rem; font-weight: 500; color: var(--ink); }
  .stat-sub { font-size: 0.71rem; color: var(--muted); margin-top: 5px; font-family: 'DM Mono', monospace; }

  /* Color chips */
  .color-chip { display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px; border-radius: 10px; font-family: 'DM Mono', monospace; font-size: 1rem; font-weight: 500; }
  .chip-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .chip-rgb { background: rgba(123,13,13,0.07); color: var(--crimson); }
  .chip-rgb .chip-dot { background: linear-gradient(135deg, var(--crimson) 0%, var(--coral) 60%, var(--rose) 100%); }
  .chip-cmyk { background: rgba(181,43,43,0.1); color: var(--scarlet); }
  .chip-cmyk .chip-dot { background: linear-gradient(135deg, var(--crimson), var(--scarlet), var(--vermilion), var(--rose)); }

  /* Tags */
  .tags-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
  .tag { padding: 3px 9px; border-radius: 5px; font-size: 0.66rem; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; }
  .tag-red { background: rgba(123,13,13,0.1); color: var(--crimson); }
  .tag-rose { background: var(--blush); color: var(--scarlet); }
  .tag-gray { background: var(--parchment); color: var(--muted); border: 1px solid var(--border); }

  .extra-meta { padding: 0 28px 28px; display: flex; gap: 10px; flex-wrap: wrap; }
  .meta-pill { padding: 7px 13px; background: var(--parchment); border: 1px solid var(--border); border-radius: 8px; font-size: 0.73rem; color: var(--muted); display: flex; align-items: center; gap: 6px; }
  .meta-pill strong { color: var(--ink); font-family: 'DM Mono', monospace; font-size: 0.71rem; }

  @media (max-width: 900px) {
    .auth-wrap { grid-template-columns: 1fr; }
    .auth-left { display: none; }
    .results-grid { grid-template-columns: 1fr; }
    .dash-nav, .dash-hero, .upload-section, .results-wrap { padding-left: 20px; padding-right: 20px; }
    .hero-title { font-size: 2.4rem; }
    .stats-grid { grid-template-columns: 1fr; }
  }
`;

// ─── Color chip ───────────────────────────────────────────────────────────────

function ColorChip({ profile }) {
  if (profile === "CMYK") {
    return <span className="color-chip chip-cmyk"><span className="chip-dot" />CMYK</span>;
  }
  return <span className="color-chip chip-rgb"><span className="chip-dot" />RGB</span>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function AuthPage({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = (e) => { e.preventDefault(); if (!form.email || !form.password) return; onLogin(form.name || form.email.split("@")[0] || "Usuario"); };

  return (
    <div className="auth-wrap">
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-logo">PDF<span>Lens</span></div>
          <div className="auth-tagline">Document Intelligence Platform</div>
        </div>
        <div className="auth-left-body">
          <div className="auth-headline">Descubre lo que hay<br /><em>dentro</em> de tus PDFs</div>
          <div className="auth-desc">Analiza metadatos, perfil de color, tamaño en centímetros y peso de tus documentos en segundos.</div>
          <div className="auth-features">
            <div className="auth-feature"><span className="auth-feature-dot" />Detección de perfil: RGB o CMYK</div>
            <div className="auth-feature"><span className="auth-feature-dot" />Dimensiones exactas en centímetros</div>
            <div className="auth-feature"><span className="auth-feature-dot" />Peso y versión del documento</div>
            <div className="auth-feature"><span className="auth-feature-dot" />Vista previa del documento</div>
          </div>
        </div>
        <div className="auth-left-footer">© 2026 PDFLens · Todos los derechos reservados</div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrap">
          <div className="auth-tabs">
            <button className={`auth-tab ${tab === "login" ? "active" : ""}`} onClick={() => setTab("login")}>Iniciar sesión</button>
            <button className={`auth-tab ${tab === "signup" ? "active" : ""}`} onClick={() => setTab("signup")}>Crear cuenta</button>
          </div>
          {tab === "login" ? (
            <>
              <div className="auth-form-title">Bienvenido de vuelta</div>
              <div className="auth-form-sub">Ingresa tus credenciales para continuar</div>
              <form onSubmit={submit}>
                <div className="field"><label>Correo electrónico</label><input name="email" type="email" placeholder="tu@email.com" value={form.email} onChange={handle} required /></div>
                <div className="field"><label>Contraseña</label><input name="password" type="password" placeholder="••••••••" value={form.password} onChange={handle} required /></div>
                <button className="btn-primary" type="submit">Iniciar sesión →</button>
              </form>
              <div className="auth-divider">o continúa con</div>
              <button className="btn-ghost" onClick={() => onLogin("Invitado")}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>
                Acceder como invitado
              </button>
            </>
          ) : (
            <>
              <div className="auth-form-title">Crea tu cuenta</div>
              <div className="auth-form-sub">Gratis y sin tarjeta de crédito</div>
              <form onSubmit={submit}>
                <div className="field"><label>Nombre completo</label><input name="name" type="text" placeholder="Tu nombre" value={form.name} onChange={handle} required /></div>
                <div className="field"><label>Correo electrónico</label><input name="email" type="email" placeholder="tu@email.com" value={form.email} onChange={handle} required /></div>
                <div className="field"><label>Contraseña</label><input name="password" type="password" placeholder="Mínimo 8 caracteres" value={form.password} onChange={handle} required /></div>
                <button className="btn-primary" type="submit">Crear cuenta →</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Upload ───────────────────────────────────────────────────────────────────

function UploadPage({ user, onLogout, onAnalyze }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();
  const handleFile = (f) => { if (f && f.type === "application/pdf") setFile(f); };
  const onDrop = useCallback((e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }, []);

  return (
    <div className="app">
      <nav className="dash-nav">
        <div className="nav-logo">PDF<span>Lens</span></div>
        <div className="nav-right">
          <span className="nav-user">👤 {user}</span>
          <button className="nav-logout" onClick={onLogout}>Salir</button>
        </div>
      </nav>
      <div className="dash-hero">
        <div className="hero-eyebrow">Análisis de documentos</div>
        <h1 className="hero-title">Extrae todo lo que<br /><em>importa</em> de tu PDF</h1>
        <p className="hero-sub">Sube tu documento y obtén al instante el tamaño en centímetros, el peso, y el perfil de color (RGB o CMYK).</p>
      </div>
      <div className="upload-section">
        <div
          className={`drop-zone ${dragging ? "dragging" : ""}`}
          onDrop={onDrop} onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onClick={() => !file && inputRef.current.click()}
        >
          <input ref={inputRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
          <div className="drop-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          {file ? (
            <div>
              <div className="drop-title">Archivo listo</div>
              <div className="file-preview-pill">
                <span style={{ fontSize: "1.4rem" }}>📄</span>
                <div><div className="pill-name">{file.name}</div><div className="pill-size">{formatBytes(file.size)}</div></div>
                <button className="pill-remove" onClick={(e) => { e.stopPropagation(); setFile(null); }}>✕</button>
              </div>
            </div>
          ) : (
            <>
              <div className="drop-title">Arrastra tu PDF aquí</div>
              <div className="drop-sub">o haz clic para buscar en tu ordenador</div>
              <span className="drop-badge">Solo archivos .PDF</span>
            </>
          )}
        </div>
        <button className="btn-analyze" disabled={!file} onClick={() => onAnalyze(file)}>
          {file ? "✦  Analizar documento" : "Selecciona un PDF primero"}
        </button>
      </div>
    </div>
  );
}

// ─── Loading ──────────────────────────────────────────────────────────────────

function LoadingPage() {
  return (
    <div className="app" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="analyzing-wrap">
        <div className="analyzing-title">Analizando documento…</div>
        <div className="analyzing-sub">Extrayendo propiedades y metadatos del archivo</div>
        <div className="progress-bar"><div className="progress-fill" /></div>
        <div className="scanning-steps">
          <div className="step"><span className="step-dot" />Leyendo estructura del PDF</div>
          <div className="step"><span className="step-dot" />Detectando perfil de color (RGB / CMYK)</div>
          <div className="step"><span className="step-dot" />Calculando dimensiones en centímetros</div>
        </div>
      </div>
    </div>
  );
}

// ─── Results ──────────────────────────────────────────────────────────────────

function ResultsPage({ info, user, onLogout, onReset }) {
  return (
    <div className="app">
      <nav className="dash-nav">
        <div className="nav-logo">PDF<span>Lens</span></div>
        <div className="nav-right">
          <span className="nav-user">👤 {user}</span>
          <button className="nav-logout" onClick={onLogout}>Salir</button>
        </div>
      </nav>
      <div className="results-wrap">
        <div className="results-header">
          <div>
            <div style={{ fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>Análisis completado</div>
            <h2 className="results-title">Resultados del <span>documento</span></h2>
          </div>
          <button className="btn-new" onClick={onReset}>+ Nuevo análisis</button>
        </div>

        <div className="results-grid">
          {/* Preview */}
          <div className="preview-card">
            <div className="preview-card-head">
              <span className="card-label">Vista previa</span>
              <span className="preview-badge">PDF {info.pdfVersion}</span>
            </div>
            <div className="preview-body">
              <div className="pdf-thumb">
                <div className="pdf-thumb-header" />
                <div className="pdf-thumb-line" />
                <div className="pdf-thumb-line med" />
                <div className="pdf-thumb-line short" />
                <div className="pdf-thumb-block" />
                <div className="pdf-thumb-line" />
                <div className="pdf-thumb-line med" />
                <div className="pdf-thumb-line short" />
                <div className="pdf-thumb-footer">
                  <div style={{
                    width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
                    background: info.colorProfile === "CMYK"
                      ? "linear-gradient(135deg,#7b0d0d,#b52b2b,#d94040,#f2a59d)"
                      : "linear-gradient(135deg,#b52b2b,#e8736a,#f2a59d)"
                  }} />
                  <span className="pdf-thumb-label">{info.colorProfile} · {info.pageCount}p</span>
                </div>
              </div>
              <div className="preview-info">
                <div className="preview-filename">{info.fileName}</div>
                <div className="preview-pages">
                  {info.pageCount} {info.pageCount === 1 ? "página" : "páginas"}
                  {info.pageSizeCm ? ` · ${info.pageSizeCm.w} × ${info.pageSizeCm.h} cm` : ""}
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-card">
            <div className="stats-card-head">
              <div className="card-label">Metadatos extraídos</div>
              <div className="stats-card-name">{info.title}</div>
            </div>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-label">Peso del archivo</div>
                <div className="stat-value">{formatBytes(info.fileSize)}</div>
                <div className="stat-sub">{info.fileSize.toLocaleString("es-ES")} bytes exactos</div>
              </div>

              <div className="stat-item">
                <div className="stat-label">Tamaño de página</div>
                {info.pageSizeCm ? (
                  <>
                    <div className="stat-value">{info.pageSizeCm.w} × {info.pageSizeCm.h} cm</div>
                    <div className="stat-sub">{info.pageSize} · {info.pageCount} {info.pageCount === 1 ? "pág." : "págs."}</div>
                  </>
                ) : (
                  <div className="stat-value">{info.pageSize}</div>
                )}
              </div>

              <div className="stat-item">
                <div className="stat-label">Perfil de color</div>
                <div style={{ marginTop: 6 }}><ColorChip profile={info.colorProfile} /></div>
                <div className="stat-sub" style={{ marginTop: 8 }}>
                  {info.colorProfile === "CMYK" ? "Apto para impresión profesional" : "Optimizado para pantalla / web"}
                </div>
              </div>

              <div className="stat-item">
                <div className="stat-label">Versión PDF</div>
                <div className="stat-value">PDF {info.pdfVersion}</div>
                <div className="stat-sub">
                  <div className="tags-row">
                    {info.isEncrypted ? <span className="tag tag-red">Cifrado</span> : <span className="tag tag-rose">Sin cifrado</span>}
                    {info.hasImages && <span className="tag tag-gray">Con imágenes</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="extra-meta">
              {info.author !== "No especificado" && <div className="meta-pill">Autor: <strong>{info.author}</strong></div>}
              <div className="meta-pill">Modificado: <strong>{info.lastModified}</strong></div>
              <div className="meta-pill">Archivo: <strong>{info.fileName}</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState("auth");
  const [user, setUser] = useState("");
  const [pdfInfo, setPdfInfo] = useState(null);

  const login = (name) => { setUser(name); setPage("upload"); };
  const logout = () => { setUser(""); setPage("auth"); setPdfInfo(null); };
  const reset = () => setPage("upload");

  const analyze = async (file) => {
    setPage("loading");
    const info = await extractPDFInfo(file);
    await new Promise(r => setTimeout(r, 2200));
    setPdfInfo(info);
    setPage("results");
  };

  return (
    <>
      <style>{css}</style>
      {page === "auth"    && <AuthPage onLogin={login} />}
      {page === "upload"  && <UploadPage user={user} onLogout={logout} onAnalyze={analyze} />}
      {page === "loading" && <LoadingPage />}
      {page === "results" && pdfInfo && <ResultsPage info={pdfInfo} user={user} onLogout={logout} onReset={reset} />}
    </>
  );
}
