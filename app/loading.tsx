export default function Loading() {
  return (
    <main className="site-loading" aria-live="polite" role="status">
      <div className="site-loading-mark" aria-hidden="true">
        <span className="site-loading-ring site-loading-ring-one" />
        <span className="site-loading-ring site-loading-ring-two" />
        <span className="site-loading-logo">ABE</span>
      </div>
      <div className="site-loading-copy">
        <strong>ABE TechLab Operations</strong>
        <span>Preparing your workspace…</span>
      </div>
      <style>{`
        .site-loading{min-height:100vh;display:grid;place-items:center;align-content:center;gap:18px;padding:32px 20px;background:#f4f5f7;color:#15171a;text-align:center}
        .site-loading-mark{position:relative;width:104px;height:104px;display:grid;place-items:center}
        .site-loading-ring{position:absolute;inset:0;border:1px solid rgba(21,23,26,.16);border-radius:28px}
        .site-loading-ring-one{transform:rotate(8deg) scale(.92);animation:abe-loader-one 1.8s ease-in-out infinite}
        .site-loading-ring-two{inset:9px;border-color:rgba(183,255,60,.8);border-radius:22px;transform:rotate(-14deg);animation:abe-loader-two 1.8s ease-in-out infinite}
        .site-loading-logo{position:relative;z-index:1;width:68px;height:68px;display:grid;place-items:center;border-radius:20px;background:#111214;color:#b7ff3c;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:800;letter-spacing:.08em;box-shadow:0 18px 42px rgba(17,17,15,.14);animation:abe-loader-logo 1.8s ease-in-out infinite}
        .site-loading-copy{display:grid;gap:4px}
        .site-loading-copy strong{font-family:Arial,Helvetica,sans-serif;font-size:16px;letter-spacing:-.02em}
        .site-loading-copy span{color:#747a83;font-size:12px}
        @keyframes abe-loader-one{0%,100%{transform:rotate(8deg) scale(.92);opacity:.55}50%{transform:rotate(188deg) scale(1);opacity:1}}
        @keyframes abe-loader-two{0%,100%{transform:rotate(-14deg) scale(.96);opacity:.6}50%{transform:rotate(166deg) scale(.9);opacity:1}}
        @keyframes abe-loader-logo{0%,100%{transform:translateY(2px) scale(.97)}50%{transform:translateY(-3px) scale(1)}}
        @media (max-width:700px){.site-loading-mark{width:92px;height:92px}.site-loading-logo{width:62px;height:62px;font-size:15px}.site-loading-ring-two{inset:8px}}
        @media (prefers-reduced-motion:reduce){.site-loading-ring-one,.site-loading-ring-two,.site-loading-logo{animation:none}}
      `}</style>
    </main>
  );
}
