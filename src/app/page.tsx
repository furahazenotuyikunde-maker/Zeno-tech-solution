import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="zeno-page">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@400;500;600;700&display=swap" />
      <style>{`
        :root { color-scheme: dark; }
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { margin: 0; background: #07122A; }
        .zeno-page {
          --navy: #07122A; --panel: #0E2250; --border: #1D3566;
          --text: #F2F6FF; --muted: #9DB0D3; --cyan: #5CE1F5; --gold: #D9B26A;
          min-height: 100vh; overflow: hidden; background: var(--navy); color: var(--text);
          font-family: Manrope, sans-serif; font-size: 15px; line-height: 1.65;
        }
        .zeno-page h1, .zeno-page h2, .zeno-page h3 { margin: 0; font-family: Sora, sans-serif; line-height: 1.2; letter-spacing: -0.035em; }
        .zeno-page a { color: inherit; text-decoration: none; }
        .zeno-page a:focus-visible { outline: 3px solid var(--gold); outline-offset: 4px; }
        .wrap { width: min(1120px, calc(100% - 40px)); margin-inline: auto; }
        .nav { height: 68px; border-bottom: 1px solid var(--border); }
        .nav-inner { display: flex; height: 100%; align-items: center; justify-content: space-between; }
        .brand { color: var(--text); font-size: 13px; font-weight: 800; letter-spacing: .18em; }
        .sign-in, .button { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; border: 1px solid var(--border); border-radius: 10px; padding: 0 18px; font-size: 13px; font-weight: 700; }
        .sign-in { min-height: 36px; border-color: #47618D; }
        .sign-in:hover, .button-outline:hover { border-color: var(--cyan); color: var(--cyan); }
        .hero { display: grid; min-height: 650px; grid-template-columns: 1.02fr .98fr; align-items: center; gap: 48px; padding-block: 70px 82px; }
        .tag { display: inline-flex; align-items: center; gap: 9px; border: 1px solid #285078; border-radius: 999px; background: #0A1B3B; padding: 6px 12px; color: #C4D7F1; font-size: 12px; font-weight: 600; }
        .tag-mark { width: 7px; height: 7px; border-radius: 50%; background: var(--cyan); }
        .hero h1 { max-width: 650px; margin-top: 24px; font-size: clamp(36px, 4.35vw, 56px); font-weight: 600; }
        .hero h1 span { color: var(--cyan); }
        .hero-copy { max-width: 520px; margin: 21px 0 0; color: var(--muted); font-size: 16px; }
        .hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 29px; }
        .button-cyan { border-color: var(--cyan); background: var(--cyan); color: #06152E !important; }
        .button-cyan:hover { background: #A0F1FB; border-color: #A0F1FB; }
        .button-outline { color: var(--text); }
        .protection { display: flex; max-width: 540px; gap: 15px; margin-top: 42px; border: 1px solid var(--border); border-radius: 14px; background: var(--panel); padding: 19px; }
        .protection-icon { display: grid; width: 42px; height: 42px; flex: 0 0 auto; place-items: center; border: 1px solid #25617E; border-radius: 11px; color: var(--cyan); }
        .protection h2 { font-size: 15px; letter-spacing: -.02em; }
        .protection strong { display: block; margin-top: 4px; color: #D7E2F8; font-size: 13px; font-weight: 600; }
        .protection p { margin: 7px 0 0; color: var(--muted); font-size: 12px; }
        .art { position: relative; display: grid; min-height: 440px; place-items: center; }
        .art-glow { position: absolute; width: 330px; height: 330px; border-radius: 50%; background: #28CBEA; opacity: .11; filter: blur(85px); }
        .door-svg { position: relative; z-index: 1; width: min(100%, 520px); height: auto; overflow: visible; }
        .signal-ring { transform-origin: 325px 214px; animation: signal-pulse 2.4s ease-out infinite; }
        .signal-ring.delay { animation-delay: 1.2s; }
        @keyframes signal-pulse { 0% { opacity: .7; transform: scale(.78); } 75%, 100% { opacity: 0; transform: scale(1.35); } }
        .status-chip { position: absolute; z-index: 3; display: flex; align-items: center; gap: 9px; border: 1px solid var(--border); border-radius: 10px; background: #0B1B3A; padding: 10px 13px; color: #E7EEFC; font-size: 11px; font-weight: 700; }
        .status-chip.one { right: 2%; top: 16%; }
        .status-chip.two { bottom: 13%; left: 0; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #59D9A2; }
        .status-dot.gold { background: var(--gold); }
        .section { padding-block: 72px; border-top: 1px solid var(--border); }
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .stat { min-height: 118px; border: 1px solid var(--border); border-radius: 13px; background: #0A1A39; padding: 20px; }
        .stat strong { display: block; color: var(--cyan); font-family: Sora, sans-serif; font-size: 14px; }
        .stat span { display: block; margin-top: 7px; color: var(--muted); font-size: 13px; }
        .section-heading { max-width: 620px; margin-bottom: 29px; }
        .section-heading h2 { font-size: clamp(27px, 3.2vw, 38px); }
        .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .feature { min-height: 210px; border: 1px solid var(--border); border-radius: 14px; background: var(--panel); padding: 23px; }
        .line-icon { display: grid; width: 40px; height: 40px; place-items: center; border: 1px solid #285078; border-radius: 11px; color: var(--cyan); }
        .feature h3 { margin-top: 19px; font-size: 16px; letter-spacing: -.02em; }
        .feature p { margin: 10px 0 0; color: var(--muted); font-size: 13px; line-height: 1.7; }
        .how { border-block: 1px solid var(--border); background: #0A1B3A; }
        .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
        .step { display: flex; align-items: flex-start; gap: 14px; }
        .step-number { display: grid; width: 34px; height: 34px; flex: 0 0 auto; place-items: center; border-radius: 50%; background: var(--gold); color: #17213A; font-family: Sora, sans-serif; font-size: 13px; font-weight: 700; }
        .step h3 { margin-top: 3px; font-size: 15px; letter-spacing: -.02em; }
        .step p { margin: 8px 0 0; color: var(--muted); font-size: 13px; }
        .final-cta { padding-block: 76px; text-align: center; }
        .final-cta h2 { font-size: clamp(29px, 3.4vw, 40px); }
        .final-cta p { margin: 12px 0 22px; color: var(--muted); font-size: 14px; }
        .footer { border-top: 1px solid var(--border); color: var(--muted); font-size: 12px; }
        .footer-inner { display: flex; min-height: 62px; align-items: center; justify-content: space-between; gap: 20px; }
        @media (max-width: 800px) {
          .hero { min-height: auto; grid-template-columns: 1fr; gap: 25px; padding-block: 60px; }
          .hero h1 { max-width: 720px; }
          .art { min-height: 390px; }
          .stats, .features, .steps { grid-template-columns: 1fr; }
          .section { padding-block: 56px; }
          .stat { min-height: auto; }
        }
        @media (max-width: 480px) {
          .wrap { width: min(100% - 32px, 1120px); }
          .brand { font-size: 11px; letter-spacing: .13em; }
          .hero { padding-block: 47px 52px; }
          .hero h1 { font-size: 36px; }
          .hero-copy { font-size: 14px; }
          .protection { margin-top: 32px; padding: 16px; }
          .art { min-height: 320px; margin-inline: -8px; }
          .status-chip { padding: 8px 10px; font-size: 10px; }
          .status-chip.one { right: 0; top: 7%; }
          .status-chip.two { bottom: 6%; left: 0; }
          .footer-inner { min-height: 58px; }
        }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          .signal-ring { animation: none; opacity: .25; }
        }
      `}</style>

      <header className="nav">
        <div className="wrap nav-inner">
          <Link className="brand" href="/" aria-label="Zeno Tech Solution home">ZENO TECH SOLUTION</Link>
          <Link className="sign-in" href="/auth/signin">Sign in</Link>
        </div>
      </header>

      <section className="wrap hero" aria-labelledby="hero-title">
        <div>
          <div className="tag"><span className="tag-mark" />Smart hotel access · Rwanda</div>
          <h1 id="hero-title">Intelligent RFID Keycards &amp; ESP32 Wireless Door Controllers <span>— It Uses AI to Ensure Innovation</span></h1>
          <p className="hero-copy">It uses AI to auto-detect cloned cards, predict power waste, prevent theft.</p>
          <article className="protection">
            <span className="protection-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 3 19 6v5c0 4.7-2.9 8.1-7 10-4.1-1.9-7-5.3-7-10V6l7-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="m8.5 12 2.2 2.2 4.8-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
            <div>
              <h2>Clone detection</h2>
              <strong>Automatically blocks copied RFID cards</strong>
              <p>Instantly identify and block copied RFID cards before the door opens.</p>
            </div>
          </article>
        </div>

        <div className="art" role="img" aria-label="Hotel room door, wireless RFID reader, and Zeno smart access card">
          <div className="art-glow" />
          <div className="status-chip one"><span className="status-dot" />Room 204 unlocked</div>
          <div className="status-chip two"><span className="status-dot gold" />Cloned card blocked</div>
          <svg className="door-svg" viewBox="0 0 540 430" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <linearGradient id="doorFrame" x1="120" y1="35" x2="375" y2="385" gradientUnits="userSpaceOnUse"><stop stopColor="#182F5C"/><stop offset="1" stopColor="#091832"/></linearGradient>
              <linearGradient id="doorFace" x1="164" y1="54" x2="346" y2="365" gradientUnits="userSpaceOnUse"><stop stopColor="#19335F"/><stop offset="1" stopColor="#10244A"/></linearGradient>
              <linearGradient id="cardBlue" x1="360" y1="225" x2="500" y2="350" gradientUnits="userSpaceOnUse"><stop stopColor="#1479CB"/><stop offset="1" stopColor="#0A397B"/></linearGradient>
              <linearGradient id="chipGold" x1="375" y1="285" x2="420" y2="318" gradientUnits="userSpaceOnUse"><stop stopColor="#F0D294"/><stop offset="1" stopColor="#B8863E"/></linearGradient>
              <filter id="softGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="7"/></filter>
            </defs>
            <ellipse cx="273" cy="377" rx="211" ry="19" fill="#020A18" opacity=".48"/>
            <rect x="101" y="34" width="247" height="347" rx="8" fill="url(#doorFrame)" stroke="#34517F" strokeWidth="2"/>
            <rect x="119" y="51" width="211" height="312" rx="3" fill="url(#doorFace)" stroke="#294675" strokeWidth="1.5"/>
            <rect x="139" y="73" width="172" height="270" rx="2" fill="none" stroke="#28436D" strokeWidth="1"/>
            <rect x="150" y="84" width="150" height="248" rx="2" fill="#142B53" opacity=".47"/>
            <path d="M179 84v248M272 84v248" stroke="#203A67" strokeWidth="1" opacity=".8"/>
            <rect x="282" y="203" width="9" height="44" rx="4.5" fill="#D9B26A"/>
            <circle cx="286.5" cy="255" r="3" fill="#E5C47F"/>
            <rect x="342" y="183" width="42" height="100" rx="9" fill="#0C1C3A" stroke="#42618E" strokeWidth="2"/>
            <rect x="350" y="195" width="26" height="49" rx="5" fill="#132B52" stroke="#35527D"/>
            <circle cx="363" cy="211" r="7" fill="#5CE1F5" opacity=".18" filter="url(#softGlow)"/>
            <circle cx="363" cy="211" r="3.5" fill="#5CE1F5"/>
            <path d="M356 258h14M359 264h8" stroke="#527096" strokeWidth="2" strokeLinecap="round"/>
            <g fill="none" stroke="#5CE1F5" strokeLinecap="round">
              <circle className="signal-ring" cx="325" cy="214" r="25" strokeWidth="1.5" opacity=".65"/>
              <circle className="signal-ring delay" cx="325" cy="214" r="25" strokeWidth="1.5" opacity=".45"/>
              <path d="M354 173c12 10 18 24 18 40M362 165c15 13 23 30 23 48" strokeWidth="2" opacity=".55"/>
            </g>
            <g transform="rotate(-12 424 300)">
              <rect x="365" y="247" width="151" height="101" rx="12" fill="url(#cardBlue)" stroke="#69DDF2" strokeOpacity=".58" strokeWidth="1.5"/>
              <path d="M378 262h124" stroke="#9BEAF5" strokeOpacity=".28"/>
              <text x="379" y="273" fill="#F2F6FF" fontFamily="Manrope, sans-serif" fontSize="8.5" fontWeight="700" letterSpacing="1.1">ZENO TECH SOLUTION</text>
              <text x="379" y="286" fill="#C5E9F5" fontFamily="Manrope, sans-serif" fontSize="7" fontWeight="600" letterSpacing="1.15">SMART ACCESS CARD</text>
              <rect x="380" y="297" width="36" height="27" rx="4" fill="url(#chipGold)" stroke="#F0D294" strokeWidth=".8"/>
              <path d="M398 297v27M380 310.5h36M387 297v7h22v13h-22v7" fill="none" stroke="#986E38" strokeWidth=".75"/>
              <g transform="translate(472 301)" fill="none" stroke="#D8F7FA" strokeWidth="1.6" strokeLinecap="round">
                <path d="M0 5c4 4 4 10 0 14M5 1c7 7 7 15 0 22M10 -3c10 10 10 23 0 30"/>
              </g>
              <text x="380" y="337" fill="#DCEBFF" fontFamily="Manrope, sans-serif" fontSize="7" fontWeight="700" letterSpacing="1">ROOM 204</text>
            </g>
            <path d="M386 284 369 267" stroke="#5CE1F5" strokeWidth="1.5" strokeDasharray="3 4" opacity=".8"/>
            <circle cx="369" cy="267" r="3" fill="#5CE1F5"/>
          </svg>
        </div>
      </section>

      <section className="section" aria-label="System benefits">
        <div className="wrap stats">
          <article className="stat"><strong>Instant</strong><span>Cloned cards flagged at the door</span></article>
          <article className="stat"><strong>Wireless</strong><span>ESP32 controllers, no wiring between doors</span></article>
          <article className="stat"><strong>Lower bills</strong><span>Power waste predicted before it happens</span></article>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-heading"><h2>One system for every door, card and kilowatt.</h2></div>
          <div className="features">
            <article className="feature">
              <span className="line-icon" aria-hidden="true"><svg width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="M12 3 19 6v5c0 4.7-2.9 8.1-7 10-4.1-1.9-7-5.3-7-10V6l7-3Z" stroke="currentColor" strokeWidth="1.6"/><path d="m8.5 12 2.2 2.2 4.8-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg></span>
              <h3>Clone detection</h3><p>AI compares every tap with how real cards behave and blocks copies before the door opens.</p>
            </article>
            <article className="feature">
              <span className="line-icon" aria-hidden="true"><svg width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="M13 2 4 14h7l-1 8 10-13h-7l1-7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg></span>
              <h3>Power-waste prediction</h3><p>See which rooms leave lights and air conditioning running, and act before the bill arrives.</p>
            </article>
            <article className="feature">
              <span className="line-icon" aria-hidden="true"><svg width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v14H4zM8 9h8M8 12h8M8 15h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
              <h3>Theft prevention</h3><p>Every entry is logged by room, card and time, so staff can trace what happened in seconds.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section how" id="how-it-works">
        <div className="wrap">
          <div className="section-heading"><h2>From tap to unlocked in three steps.</h2></div>
          <div className="steps">
            <article className="step"><span className="step-number">1</span><div><h3>Guest taps the card.</h3><p>The RFID reader on the door reads the keycard.</p></div></article>
            <article className="step"><span className="step-number">2</span><div><h3>AI checks the card.</h3><p>The ESP32 controller verifies the card and screens for clones.</p></div></article>
            <article className="step"><span className="step-number">3</span><div><h3>Door opens and logs.</h3><p>Valid cards unlock the door. Every attempt appears in your dashboard.</p></div></article>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="wrap footer-inner"><span>© 2026 Zeno Tech Solution</span><span>Kigali, Rwanda</span></div>
      </footer>
    </main>
  );
}
