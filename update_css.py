import re

with open('JEC.html', 'r', encoding='utf-8') as f:
    content = f.read()

new_css = """<style>
  :root {
    --bg-main: #f0fdf4; /* Very light clinical green */
    --surface: #ffffff;
    --border: #d1fae5;
    --accent: #00A556; /* Fortis Green */
    --accent-hover: #008a46;
    --accent2: #E83035; /* Fortis Red */
    --accent2-hover: #cc252a;
    --text: #064e3b; /* Deep medical green/black */
    --muted: #047857;
    --danger: #E83035;
    --warn: #ffc107;
    
    /* Dynamic 3D Shadows */
    --shadow-3d: 6px 6px 0px rgba(0, 165, 86, 0.2);
    --shadow-3d-hover: 10px 10px 0px rgba(0, 165, 86, 0.25);
    --shadow-btn: 4px 4px 0px rgba(0, 138, 70, 1);
    --shadow-btn2: 4px 4px 0px rgba(204, 37, 42, 1);
    --shadow-inner: inset 4px 4px 10px rgba(255,255,255,0.7), inset -4px -4px 10px rgba(0,0,0,0.05);
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'DM Sans', -apple-system, sans-serif;
    color: var(--text);
    min-height: 100vh;
    overflow-x: hidden;
    background: linear-gradient(135deg, #ffffff 0%, #d1fae5 100%);
    background-size: 200% 200%;
    animation: gradientBG 10s ease infinite;
    line-height: 1.5;
  }

  @keyframes gradientBG {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  /* ── PAGES & TRANSITIONS ── */
  .page { 
    display: none; 
    min-height: 100vh; 
    opacity: 0;
    transform: perspective(1000px) translateZ(-50px) rotateX(2deg);
    transition: opacity 0.5s ease, transform 0.5s ease;
  }
  .page.active { 
    display: block; 
    opacity: 1;
    transform: perspective(1000px) translateZ(0) rotateX(0);
  }

  /* ════════════════════════════
     HOME PAGE
  ════════════════════════════ */
  .home-nav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 40px;
    position: sticky; top: 0;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(12px);
    z-index: 100;
    box-shadow: 0 4px 20px rgba(0, 165, 86, 0.1);
    border-bottom: 2px solid #fff;
  }

  .logo {
    font-size: 1.8rem; font-weight: 800;
    color: var(--accent);
    display: flex; align-items: center; gap: 12px;
    letter-spacing: -0.02em;
    text-shadow: 2px 2px 0px rgba(0,0,0,0.05);
  }

  .logo-icon {
    width: 38px; height: 38px;
    background: linear-gradient(135deg, var(--accent), #34d399);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: var(--shadow-btn);
  }

  .logo-icon span {
    width: 14px; height: 14px;
    background: #fff;
    border-radius: 4px;
    box-shadow: inset 1px 1px 3px rgba(0,0,0,0.2);
  }

  .live-badge {
    display: flex; align-items: center; gap: 8px;
    background: #fff;
    border: 2px solid var(--accent2);
    border-radius: 12px;
    padding: 8px 16px;
    font-size: 0.8rem; font-weight: 800;
    color: var(--accent2);
    text-transform: uppercase;
    box-shadow: 4px 4px 0px rgba(232, 48, 53, 0.2);
    animation: bounce 2s infinite;
  }
  
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }

  .live-dot {
    width: 8px; height: 8px;
    background: var(--accent2);
    border-radius: 50%;
    animation: pulse 1s infinite;
  }

  @keyframes pulse {
    0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(232, 48, 53, 0.4); }
    50% { transform: scale(0.8); box-shadow: 0 0 0 8px rgba(232, 48, 53, 0); }
  }

  .nav-actions { display: flex; gap: 14px; }

  /* ── 3D BUTTONS ── */
  .btn {
    padding: 12px 28px;
    border-radius: 12px;
    font-family: 'DM Sans', sans-serif;
    font-weight: 800;
    font-size: 0.95rem;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }

  .btn-ghost {
    background: #fff;
    color: var(--text);
    border: 2px solid var(--border);
    box-shadow: 4px 4px 0px rgba(0,0,0,0.05);
  }
  .btn-ghost:active { 
    transform: translateY(4px) translateX(4px); 
    box-shadow: 0px 0px 0px; 
  }

  .btn-primary {
    background: var(--accent);
    color: #fff;
    border: 2px solid var(--accent);
    box-shadow: var(--shadow-btn);
  }
  .btn-primary:active { 
    transform: translateY(4px) translateX(4px); 
    box-shadow: 0px 0px 0px; 
  }

  .btn-secondary {
    background: var(--accent2);
    color: #fff;
    border: 2px solid var(--accent2);
    box-shadow: var(--shadow-btn2);
  }
  .btn-secondary:active { 
    transform: translateY(4px) translateX(4px); 
    box-shadow: 0px 0px 0px; 
  }

  /* HERO */
  .hero {
    padding: 80px 40px 60px;
    max-width: 1200px; margin: 0 auto;
    text-align: center;
  }

  .hero-tag {
    display: inline-flex; align-items: center; gap: 8px;
    background: #fff;
    border: 2px solid var(--accent);
    border-radius: 12px;
    padding: 8px 18px;
    font-size: 0.85rem; font-weight: 800;
    color: var(--accent);
    margin-bottom: 30px;
    text-transform: uppercase; letter-spacing: 0.05em;
    box-shadow: 4px 4px 0px rgba(0, 165, 86, 0.15);
  }
  
  @keyframes textPulse {
    0%, 100% { transform: scale(1); filter: drop-shadow(0px 4px 12px rgba(0, 165, 86, 0.3)); }
    50% { transform: scale(1.02); filter: drop-shadow(0px 8px 24px rgba(0, 165, 86, 0.5)); }
  }

  .hero h1 {
    font-size: clamp(3rem, 7vw, 5rem);
    font-weight: 900;
    line-height: 1;
    margin-bottom: 24px;
    color: var(--text);
    letter-spacing: -0.02em;
    animation: textPulse 3s ease-in-out infinite;
  }

  .hero h1 .accent { 
    color: var(--accent);
    text-shadow: 4px 4px 0px rgba(0, 165, 86, 0.2);
  }

  .hero-sub {
    font-size: 1.2rem;
    color: var(--muted);
    max-width: 700px;
    margin: 0 auto 40px;
    font-weight: 600;
    background: #fff;
    padding: 16px 24px;
    border-radius: 16px;
    box-shadow: var(--shadow-inner);
  }

  .hero-pills {
    display: flex; justify-content: center; flex-wrap: wrap; gap: 14px;
    margin-bottom: 40px;
  }

  .pill {
    padding: 10px 20px;
    border-radius: 12px;
    background: #fff;
    font-size: 0.85rem; font-weight: 800;
    color: var(--text);
    border: 2px solid var(--accent);
    box-shadow: 4px 4px 0px rgba(0, 165, 86, 0.15);
    transform: rotate(-2deg);
    transition: transform 0.2s;
  }
  .pill:nth-child(even) { transform: rotate(2deg); }
  .pill:hover { transform: scale(1.1) rotate(0deg); }

  .hero-cta { display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; }
  .hero-cta .btn { padding: 16px 36px; font-size: 1.1rem; }

  /* STATS BAR */
  .stats-bar {
    display: grid; grid-template-columns: repeat(4, 1fr);
    background: rgba(255,255,255,0.7);
    backdrop-filter: blur(10px);
    border-top: 4px solid #fff;
    border-bottom: 4px solid #fff;
    box-shadow: 0 10px 30px rgba(0, 165, 86, 0.1);
  }

  .stat-item {
    padding: 30px;
    text-align: center;
    border-right: 2px solid rgba(255,255,255,0.5);
  }
  .stat-item:last-child { border-right: none; }

  .stat-num {
    font-size: 3rem;
    font-weight: 900;
    color: var(--accent);
    line-height: 1;
    text-shadow: 2px 2px 0px rgba(0,0,0,0.1);
  }

  .stat-label {
    font-size: 0.9rem; font-weight: 800;
    color: var(--text);
    margin-top: 8px;
    text-transform: uppercase;
  }

  /* FEATURE GRID */
  .section { padding: 80px 40px; max-width: 1200px; margin: 0 auto; }

  .section-label {
    display: inline-block;
    background: #fff;
    padding: 8px 16px;
    border-radius: 12px;
    font-weight: 800; font-size: 0.8rem;
    color: var(--accent2);
    margin-bottom: 20px;
    border: 2px solid var(--accent2);
    box-shadow: 4px 4px 0px rgba(232, 48, 53, 0.15);
    text-transform: uppercase; letter-spacing: 0.05em;
  }

  .section-title {
    font-size: clamp(2.5rem, 5vw, 3.5rem);
    font-weight: 900;
    margin-bottom: 40px;
    color: var(--text);
    letter-spacing: -0.02em;
  }

  .feature-cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
  }

  .feature-col {
    background: #fff;
    border-radius: 24px;
    border: 4px solid #fff;
    padding: 0;
    box-shadow: var(--shadow-3d);
    overflow: hidden;
    transform: perspective(1000px) rotateY(0deg);
    transition: transform 0.4s ease, box-shadow 0.4s ease;
  }
  .feature-col:hover { 
    transform: perspective(1000px) rotateY(-2deg) translateY(-5px); 
    box-shadow: var(--shadow-3d-hover);
  }
  .feature-col:nth-child(2):hover { transform: perspective(1000px) rotateY(2deg) translateY(-5px); }

  .col-header {
    display: flex; align-items: center; gap: 12px;
    padding: 24px;
    font-weight: 800;
    font-size: 1.2rem;
    background: rgba(0, 165, 86, 0.05);
    border-bottom: 2px solid #fff;
    color: var(--accent);
  }

  .col-dot {
    width: 14px; height: 14px;
    border-radius: 50%;
    background: var(--accent2);
    box-shadow: inset 2px 2px 4px rgba(255,255,255,0.8);
  }

  .feature-item {
    display: flex; align-items: flex-start; gap: 16px;
    padding: 24px;
    border-bottom: 2px solid #fff;
  }
  .feature-item:last-child { border-bottom: none; }

  .feat-icon {
    width: 44px; height: 44px; flex-shrink: 0;
    background: #fff;
    border: 2px solid var(--border);
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.2rem;
    color: var(--accent);
    box-shadow: 3px 3px 0px rgba(0, 165, 86, 0.1);
  }

  .feat-title { font-weight: 800; font-size: 1.1rem; margin-bottom: 4px; color: var(--text); }
  .feat-desc { font-size: 0.95rem; color: var(--muted); font-weight: 600; line-height: 1.6; }

  /* HOW IT WORKS */
  .flow-section {
    padding: 80px 40px;
    background: rgba(255,255,255,0.6);
    border-top: 4px solid #fff;
    border-bottom: 4px solid #fff;
    backdrop-filter: blur(10px);
  }

  .flow-inner { max-width: 1200px; margin: 0 auto; text-align: center; }

  .flow-steps {
    display: flex; justify-content: center; align-items: center;
    gap: 16px; flex-wrap: wrap;
    margin-top: 40px;
  }

  .flow-step {
    display: flex; align-items: center; gap: 10px;
    padding: 16px 24px;
    background: #fff;
    border: 3px solid var(--accent);
    border-radius: 16px;
    font-size: 1rem; font-weight: 800;
    color: var(--text);
    box-shadow: 4px 4px 0px var(--accent);
    transform: rotate(-1deg);
  }
  .flow-step:nth-child(even) { transform: rotate(1deg); }

  .flow-dot {
    width: 10px; height: 10px;
    background: var(--accent);
    border-radius: 50%;
  }

  .flow-arrow {
    padding: 0 10px;
    color: var(--accent);
    font-size: 1.5rem;
    font-weight: 900;
  }

  /* ════════════════════════════
     INNER PAGES SHARED
  ════════════════════════════ */
  .inner-nav {
    display: flex; align-items: center; gap: 20px;
    padding: 20px 40px;
    background: rgba(255,255,255,0.8);
    backdrop-filter: blur(12px);
    position: sticky; top: 0; z-index: 100;
    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    border-bottom: 4px solid #fff;
  }

  .back-btn {
    display: flex; align-items: center; gap: 8px;
    background: #fff;
    border: 2px solid var(--border);
    border-radius: 12px;
    padding: 10px 18px;
    font-weight: 800; font-size: 0.95rem;
    color: var(--text);
    cursor: pointer;
    box-shadow: 4px 4px 0px rgba(0,0,0,0.05);
    transition: all 0.1s;
  }
  .back-btn:active { transform: translate(4px, 4px); box-shadow: 0 0 0; }

  .inner-title {
    font-size: 1.8rem; font-weight: 900;
    color: var(--accent);
    animation: textPulse 4s infinite;
  }

  .page-body { padding: 40px 30px; max-width: 1000px; margin: 0 auto; }

  /* ── SEARCH ── */
  .search-bar {
    display: flex; gap: 16px;
    margin-bottom: 40px;
  }

  .search-input {
    flex: 1;
    background: #fff;
    border: 4px solid #fff;
    border-radius: 16px;
    padding: 18px 24px;
    font-family: 'DM Sans', sans-serif;
    font-size: 1.1rem; font-weight: 800;
    color: var(--text);
    box-shadow: var(--shadow-inner), 6px 6px 0px rgba(0,0,0,0.05);
    outline: none;
    transition: border-color 0.2s;
  }
  .search-input:focus { border-color: var(--accent); }

  /* ── DOCTOR CARDS ── */
  .doctor-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px,1fr)); gap: 24px; }

  .doctor-card {
    background: rgba(255,255,255,0.9);
    border-radius: 20px;
    border: 4px solid #fff;
    padding: 28px;
    cursor: pointer;
    box-shadow: var(--shadow-3d);
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
  }
  .doctor-card:hover { 
    transform: translateY(-6px) rotate(-1deg);
    box-shadow: var(--shadow-3d-hover);
    border-color: var(--accent);
  }

  .doc-avatar {
    width: 64px; height: 64px;
    border-radius: 16px;
    background: linear-gradient(135deg, #34d399, var(--accent));
    display: flex; align-items: center; justify-content: center;
    font-size: 2rem;
    margin-bottom: 18px;
    color: #fff;
    box-shadow: var(--shadow-inner), 4px 4px 0px rgba(0, 165, 86, 0.2);
  }

  .doc-name { font-weight: 900; font-size: 1.3rem; margin-bottom: 4px; color: var(--text); }
  .doc-spec { font-size: 0.95rem; font-weight: 800; color: var(--accent); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;}
  .doc-info { font-size: 0.9rem; color: var(--muted); display: flex; flex-direction: column; gap: 8px; font-weight: 600; }

  .doc-wait {
    margin-top: 24px;
    padding: 14px 18px;
    background: #fff;
    border-radius: 12px;
    font-size: 0.9rem; font-weight: 800;
    color: var(--text);
    display: flex; justify-content: space-between;
    box-shadow: var(--shadow-inner);
    border: 2px solid transparent;
  }

  /* ── QUEUE ── */
  .queue-card {
    background: #fff;
    border-radius: 24px;
    border: 4px solid #fff;
    box-shadow: var(--shadow-3d);
    overflow: hidden;
  }

  .queue-header {
    padding: 36px;
    background: linear-gradient(135deg, var(--accent), #34d399);
    color: #fff;
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 4px solid #fff;
  }

  .queue-num {
    font-size: 5rem;
    font-weight: 900;
    line-height: 1;
    text-shadow: 4px 4px 0px rgba(0, 138, 70, 0.4);
  }

  .queue-label { font-size: 1.1rem; font-weight: 800; margin-top: 8px; opacity: 0.9; }

  .queue-list { padding: 24px; }

  .queue-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 24px;
    border-radius: 16px;
    margin-bottom: 12px;
    background: #fff;
    box-shadow: var(--shadow-inner);
  }
  .queue-row.current { border-left: 8px solid var(--accent2); }
  .queue-row.mine { background: rgba(0, 165, 86, 0.1); border-left: 8px solid var(--accent); }

  .q-token { font-weight: 900; font-size: 1.2rem; color: var(--text); }
  .q-eta { font-size: 0.9rem; color: var(--muted); font-weight: 700; }
  
  .q-badge {
    font-size: 0.75rem; padding: 6px 14px;
    border-radius: 12px; font-weight: 800;
    box-shadow: 2px 2px 0px rgba(0,0,0,0.1);
  }
  .badge-green { background: var(--accent); color: #fff; }
  .badge-blue { background: #0ea5e9; color: #fff; }
  .badge-muted { background: #e9ecef; color: var(--text); }

  /* ── BOOKING & FORMS ── */
  .booking-form { display: flex; flex-direction: column; gap: 24px; }

  .form-group label {
    display: block;
    font-size: 0.95rem;
    font-weight: 800;
    color: var(--text);
    margin-bottom: 10px;
  }

  .form-input, .form-select {
    width: 100%;
    background: #fff;
    border: 4px solid transparent;
    border-radius: 16px;
    padding: 16px 20px;
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    font-size: 1.1rem; font-weight: 800;
    box-shadow: var(--shadow-inner);
    outline: none;
    transition: all 0.2s ease;
    appearance: none;
  }
  .form-input:focus, .form-select:focus { 
    border-color: var(--accent); 
  }

  .time-slots { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }

  .time-slot {
    padding: 16px;
    text-align: center;
    background: #fff;
    border: 2px solid var(--border);
    border-radius: 12px;
    font-size: 0.95rem; font-weight: 800;
    color: var(--text);
    cursor: pointer;
    box-shadow: 4px 4px 0px rgba(0,0,0,0.05);
    transition: all 0.1s;
  }
  .time-slot:active { transform: translate(4px,4px); box-shadow: 0 0 0; }
  .time-slot.selected { background: var(--accent); color: #fff; border-color: var(--accent); box-shadow: 4px 4px 0px rgba(0, 138, 70, 0.4); }
  .time-slot.disabled { opacity: 0.5; background: #e9ecef; cursor: not-allowed; box-shadow: none; transform: none; }

  /* ── PROFILE / STATS ── */
  .stats-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 20px; margin-bottom: 40px; }

  .stat-card {
    background: #fff;
    border-radius: 20px;
    border: 4px solid #fff;
    padding: 24px;
    text-align: center;
    box-shadow: var(--shadow-3d);
  }

  .s-num {
    font-size: 3rem;
    font-weight: 900;
    color: var(--accent);
    line-height: 1;
    text-shadow: 2px 2px 0px rgba(0,0,0,0.1);
  }
  .s-label { font-size: 0.9rem; font-weight: 800; margin-top: 10px; color: var(--text); text-transform: uppercase; letter-spacing: 0.05em;}

  .review-item {
    padding: 24px;
    background: #fff;
    border-radius: 16px;
    margin-bottom: 20px;
    box-shadow: var(--shadow-inner);
  }
  .review-stars { color: var(--warn); margin-bottom: 12px; font-size: 1.2rem; }
  .review-text { font-size: 1rem; font-weight: 600; line-height: 1.6; color: var(--text); }
  .review-author { font-size: 0.9rem; color: var(--muted); font-weight: 800; margin-top: 16px; }

  /* DOCTOR PAGE */
  #doctor-page .stats-grid { grid-template-columns: repeat(3,1fr); }

  .toggle-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 24px;
    background: #fff;
    border: 4px solid #fff;
    border-radius: 20px;
    margin-bottom: 20px;
    box-shadow: var(--shadow-3d);
  }
  .toggle-label { font-weight: 800; font-size: 1.1rem; }
  .toggle-desc { font-size: 0.9rem; color: var(--muted); font-weight: 600; margin-top: 6px; }

  .toggle {
    width: 60px; height: 34px;
    background: #e9ecef;
    border-radius: 17px;
    cursor: pointer;
    position: relative;
    transition: background 0.3s;
    flex-shrink: 0;
    box-shadow: inset 2px 2px 5px rgba(0,0,0,0.1);
  }
  .toggle.on { background: var(--accent); }
  .toggle::after {
    content: '';
    position: absolute; top: 4px; left: 4px;
    width: 26px; height: 26px;
    background: #fff;
    border-radius: 50%;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
  }
  .toggle.on::after { transform: translateX(26px); }

  /* SCHEDULE */
  .day-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 12px; margin-bottom: 30px; }
  .day-btn {
    padding: 16px 0;
    text-align: center;
    background: #fff;
    border-radius: 12px;
    font-size: 0.95rem; font-weight: 800;
    color: var(--text);
    cursor: pointer;
    box-shadow: 4px 4px 0px rgba(0,0,0,0.05);
    transition: all 0.1s;
  }
  .day-btn:active { transform: translate(4px,4px); box-shadow: 0 0 0; }
  .day-btn.active { background: var(--accent); color: #fff; box-shadow: 4px 4px 0px rgba(0, 138, 70, 0.4); }

  /* ── AUTH ── */
  .auth-container {
    max-width: 480px;
    margin: 80px auto;
    background: rgba(255,255,255,0.9);
    border: 4px solid #fff;
    border-radius: 24px;
    padding: 50px;
    box-shadow: var(--shadow-3d);
    transform: perspective(1000px) rotateY(-2deg);
  }
  
  .auth-title {
    font-size: 2.5rem;
    font-weight: 900;
    margin-bottom: 12px;
    text-align: center;
    color: var(--accent);
    text-shadow: 2px 2px 0px rgba(0, 165, 86, 0.15);
  }
  .auth-sub {
    color: var(--text);
    font-size: 1.05rem; font-weight: 700;
    text-align: center;
    margin-bottom: 40px;
  }
  .otp-inputs {
    display: flex; gap: 14px; justify-content: center; margin: 40px 0;
  }
  .otp-input {
    width: 60px; height: 75px;
    text-align: center;
    font-size: 2.2rem; font-weight: 900;
    background: #fff;
    border: none;
    border-radius: 16px;
    color: var(--text);
    box-shadow: var(--shadow-inner);
  }
  .otp-input:focus { outline: 3px solid var(--accent); }

  .map-container {
    width: 100%;
    height: 350px;
    border-radius: 20px;
    border: 4px solid #fff;
    overflow: hidden;
    margin-bottom: 40px;
    box-shadow: var(--shadow-3d);
  }

  /* ── SIGNAL ── */
  .signal-card {
    text-align: center;
    padding: 80px 40px;
    background: #fff;
    border-radius: 24px;
    border: 4px solid #fff;
    box-shadow: var(--shadow-3d);
  }

  .signal-ring {
    width: 150px; height: 150px;
    border-radius: 50%;
    background: #fff;
    color: var(--accent);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 40px;
    animation: ring-pulse 2s infinite;
    font-size: 3.5rem;
    box-shadow: var(--shadow-inner), 0 0 0 10px rgba(0, 165, 86, 0.2);
  }

  @keyframes ring-pulse {
    0%,100% { box-shadow: var(--shadow-inner), 0 0 0 0px rgba(0, 165, 86, 0.4); }
    50% { box-shadow: var(--shadow-inner), 0 0 0 30px rgba(0, 165, 86, 0); }
  }

  /* ── ALERT ── */
  .toast {
    position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%) translateY(150px);
    background: #fff;
    border-radius: 16px;
    border: 4px solid var(--accent);
    padding: 18px 30px;
    font-size: 1.05rem; font-weight: 800;
    color: var(--text);
    z-index: 9998;
    transition: transform 0.5s cubic-bezier(0.34,1.56,0.64,1);
    box-shadow: 8px 8px 0px rgba(0, 165, 86, 0.2);
  }
  .toast.show { transform: translateX(-50%) translateY(0); }
  .toast .acc { color: var(--accent); }

  /* RESPONSIVE */
  @media (max-width: 700px) {
    .hero { padding: 60px 20px; }
    .home-nav { padding: 12px 20px; }
    .feature-cols { grid-template-columns: 1fr; }
    .stats-bar { grid-template-columns: 1fr 1fr; }
    .stat-item { padding: 20px; }
    .section { padding: 60px 20px; }
    .flow-section { padding: 60px 20px; }
    .time-slots { grid-template-columns: repeat(3,1fr); }
    #doctor-page .stats-grid { grid-template-columns: 1fr 1fr; }
    .day-grid { grid-template-columns: repeat(4,1fr); }
    .auth-container { transform: none; margin: 30px 15px; padding: 30px; }
  }
</style>"""

new_content = re.sub(r'<style>.*?</style>', new_css, content, flags=re.DOTALL)

with open('JEC.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Updated JEC.html CSS with Dynamic 3D')
