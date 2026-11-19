"use client";

import React, { useState, useEffect, useRef, memo } from "react";
import Link from "next/link";
import { useMiningStore } from "./store/useMiningStore";
import { MINING_PLANS, MiningMode } from "./config/mining";
import PlanEmailModal from "./components/PlanEmailModal";
import WithdrawalModal from "./components/WithdrawalModal";
import UnpaidBanner from "./components/UnpaidBanner";

// FAQ item component - Memoized to prevent parent re-render propagation
const FaqItem = memo(function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item${open ? ' open' : ''}`} onClick={() => setOpen(!open)}>
      <div className="faq-q">
        <span>{question}</span>
        <span className="faq-arrow">+</span>
      </div>
      <div className="faq-a">{answer}</div>
    </div>
  );
});
FaqItem.displayName = "FaqItem";

const FAQ_ITEMS = [
  {
    q: 'How does cloud mining work on Chukohash?',
    a: 'Chukohash allocates dedicated cloud GPU and ASIC nodes from our distributed datacenter clusters. You select your plan, connect your email, and our cloud infrastructure handles 100% of the hashing power remotely 24/7. No hardware or software installation required.',
  },
  {
    q: "Does mining use my device's resources?",
    a: "No. Your phone, laptop, or PC is not used for any computational work. All mining is performed entirely on our remote datacenter clusters. Your device simply displays the session dashboard — it won't heat up, slow down, or drain battery any more than browsing a regular website.",
  },
  {
    q: 'Why is there a cloud rig deposit fee?',
    a: 'Cloud mining requires dedicated ASIC and enterprise GPU clusters. The plan deposit covers server hardware reservation, electricity, cooling, and high-bandwidth pool connection across our datacenters for the entire 7-day contract duration.',
  },
  {
    q: 'What are the mining plans and expected earnings?',
    a: 'We offer three transparent plans: Node Starter ($150) mines $1,500 after 7 days; Cluster Rig ($300) mines $3,000 after 7 days; and Quantum Titan ($500) mines $5,000 after 7 days. Every plan delivers a guaranteed 10x output on our remote cloud rigs.',
  },
  {
    q: 'Why do you store data only in localStorage?',
    a: "Privacy is our core principle. By storing all session data exclusively in your browser's localStorage, we ensure zero server-side tracking. No accounts, no KYC, no cookies, no analytics. You control your data completely — clear your browser storage and it's gone forever.",
  },
  {
    q: 'What happens if I close the browser during mining?',
    a: "Your mining session runs entirely on our remote datacenter GPU clusters and proceeds continuously even if you close your browser, switch tabs, or disconnect. When mining is completed, your earnings are saved and the payout withdrawal modal automatically presents your next action.",
  },
  {
    q: 'How long is a mining session?',
    a: 'Each mining session runs for its selected 7-day cloud contract. You can monitor progress live or leave and return at any time. When finished, you are immediately notified to complete withdrawal.',
  },
  {
    q: 'What is a session code?',
    a: 'Each mining session is assigned a unique code (e.g. NX-A7K3-P9BW). This code identifies your session for payment processing. If you leave the site before paying the infrastructure fee, you can return later and use the session code to complete your withdrawal.',
  },
  {
    q: 'Which cryptocurrencies can I mine?',
    a: 'We support 14+ cryptocurrencies including Bitcoin (BTC), Ethereum (ETH), Solana (SOL), Toncoin (TON), Monero (XMR), Dogecoin (DOGE), TRON (TRX), Cardano (ADA), Polkadot (DOT), Tether (USDT), USD Coin (USDC), Litecoin (LTC), and Ripple (XRP).',
  },
  {
    q: 'How do I receive my mined crypto?',
    a: "After stopping your mining session, you'll be asked to enter your wallet address. Once you pay the infrastructure fee via deposit or WalletConnect, your mined earnings are automatically sent to your specified wallet within 2 network confirmations.",
  },
];

export default function Home() {
  const nodesRef = useRef(17796);
  const hashRef = useRef(893.4);
  const onlineRef = useRef(5954);

  const [selectedPlanForModal, setSelectedPlanForModal] = useState<MiningMode | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const speedTier = useMiningStore((s) => s.speedTier);
  const setSpeedTier = useMiningStore((s) => s.setSpeedTier);
  const restoreSession = useMiningStore((s) => s.restoreSession);

  const activePlan = MINING_PLANS[Math.min(speedTier, MINING_PLANS.length - 1)] || MINING_PLANS[1];

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Background network stats ticker
  useEffect(() => {
    const updateStatsDom = () => {
      const elNodes = document.getElementById("statNodes");
      const elHash = document.getElementById("statHash");
      const elOnline = document.getElementById("statOnline");
      if (elNodes) elNodes.textContent = nodesRef.current.toLocaleString();
      if (elHash) elHash.textContent = `${hashRef.current.toFixed(0)} PH/s`;
      if (elOnline) elOnline.textContent = onlineRef.current.toLocaleString();
    };

    updateStatsDom();

    const interval = setInterval(() => {
      nodesRef.current += Math.random() > 0.5 ? 1 : -1;
      hashRef.current = +(hashRef.current + (Math.random() - 0.5) * 0.4).toFixed(1);
      onlineRef.current += Math.random() > 0.52 ? 1 : -1;
      updateStatsDom();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleSelectPlan = (plan: MiningMode) => {
    setSpeedTier(plan.tierIndex);
    setSelectedPlanForModal(plan);
    setIsEmailModalOpen(true);
  };

  return (
    <>
      {/* ─── HERO SECTION ─── */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            {/* HERO LOGO */}
            <div className="hero-logo-mobile">
              <div className="hero-logo" id="heroLogo">
                <div className="hero-logo-ring r1"></div>
                <div className="hero-logo-ring r2"></div>
                <div className="hero-logo-core">
                  <div className="logo-svg">
                    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="lg1" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#EC7505"></stop>
                          <stop offset="100%" stopColor="#ffae19"></stop>
                        </linearGradient>
                        <linearGradient id="lg2" x1="100%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#EC7505" stopOpacity="0.3"></stop>
                          <stop offset="100%" stopColor="#ffae19" stopOpacity="0.3"></stop>
                        </linearGradient>
                      </defs>
                      <polygon points="100,15 175,55 175,135 100,175 25,135 25,55" stroke="url(#lg2)" strokeWidth="1.5" fill="none"></polygon>
                      <polygon points="100,35 155,65 155,125 100,155 45,125 45,65" stroke="url(#lg1)" strokeWidth="2" fill="rgba(236,117,5,0.03)"></polygon>
                      <line x1="100" y1="35" x2="100" y2="15" stroke="url(#lg1)" strokeWidth="1" opacity="0.5"></line>
                      <line x1="155" y1="65" x2="175" y2="55" stroke="url(#lg1)" strokeWidth="1" opacity="0.5"></line>
                      <line x1="155" y1="125" x2="175" y2="135" stroke="url(#lg1)" strokeWidth="1" opacity="0.5"></line>
                      <line x1="100" y1="155" x2="100" y2="175" stroke="url(#lg1)" strokeWidth="1" opacity="0.5"></line>
                      <line x1="45" y1="125" x2="25" y2="135" stroke="url(#lg1)" strokeWidth="1" opacity="0.5"></line>
                      <line x1="45" y1="65" x2="25" y2="55" stroke="url(#lg1)" strokeWidth="1" opacity="0.5"></line>
                      <rect x="75" y="72" width="50" height="50" rx="6" stroke="url(#lg1)" strokeWidth="2" fill="rgba(236,117,5,0.06)"></rect>
                      <line x1="85" y1="72" x2="85" y2="62" stroke="var(--accent)" strokeWidth="1.5" opacity="0.6"></line>
                      <line x1="100" y1="72" x2="100" y2="62" stroke="var(--accent)" strokeWidth="1.5" opacity="0.6"></line>
                      <line x1="115" y1="72" x2="115" y2="62" stroke="var(--accent)" strokeWidth="1.5" opacity="0.6"></line>
                      <line x1="85" y1="122" x2="85" y2="132" stroke="var(--accent)" strokeWidth="1.5" opacity="0.6"></line>
                      <line x1="100" y1="122" x2="100" y2="132" stroke="var(--accent)" strokeWidth="1.5" opacity="0.6"></line>
                      <line x1="115" y1="122" x2="115" y2="132" stroke="var(--accent)" strokeWidth="1.5" opacity="0.6"></line>
                      <line x1="75" y1="82" x2="65" y2="82" stroke="var(--accent)" strokeWidth="1.5" opacity="0.6"></line>
                      <line x1="75" y1="97" x2="65" y2="97" stroke="var(--accent)" strokeWidth="1.5" opacity="0.6"></line>
                      <line x1="75" y1="112" x2="65" y2="112" stroke="var(--accent)" strokeWidth="1.5" opacity="0.6"></line>
                      <line x1="125" y1="82" x2="135" y2="82" stroke="var(--accent)" strokeWidth="1.5" opacity="0.6"></line>
                      <line x1="125" y1="97" x2="135" y2="97" stroke="var(--accent)" strokeWidth="1.5" opacity="0.6"></line>
                      <line x1="125" y1="112" x2="135" y2="112" stroke="var(--accent)" strokeWidth="1.5" opacity="0.6"></line>
                      <text x="100" y="103" textAnchor="middle" fontFamily="Orbitron" fontSize="18" fontWeight="900" fill="url(#lg1)">
                        CH
                      </text>
                    </svg>
                  </div>
                </div>
                <div className="orbit-coin" style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)", animation: "18s linear 0s infinite normal none running orbit-0" }}>
                  <img src="/assets/icons/btc.svg" alt="BTC" onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }} />
                </div>
                <div className="orbit-coin" style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)", animation: "22s linear 0s infinite normal none running orbit-1" }}>
                  <img src="/assets/icons/eth.svg" alt="ETH" onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }} />
                </div>
                <div className="orbit-coin" style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)", animation: "26s linear 0s infinite normal none running orbit-2" }}>
                  <img src="/assets/icons/bnb.svg" alt="BNB" onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }} />
                </div>
                <div className="orbit-coin" style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)", animation: "30s linear 0s infinite normal none running orbit-3" }}>
                  <img src="/assets/icons/sol.svg" alt="SOL" onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }} />
                </div>
                <div className="orbit-coin" style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)", animation: "34s linear 0s infinite normal none running orbit-4" }}>
                  <img src="/assets/icons/doge.svg" alt="DOGE" onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }} />
                </div>
              </div>
            </div>

            <div className="hero-text">
              <h1>
                Harness <span className="gradient">Datacenter Power</span> For Cloud Mining
              </h1>
              <p>
                Deploy GPU-accelerated cloud mining across distributed datacenter clusters. Guaranteed 10× return on 7-day contracts. Zero local device resources used.
              </p>
              <div className="hero-actions">
                <a href="#plans" className="btn btn-primary">
                  Choose a Plan
                </a>
                <Link href="/dashboard" className="btn btn-outline">
                  Live Dashboard
                </Link>
              </div>
              <div className="hero-floats">
                <div className="hf-item">
                  <span className="hf-lbl">Active Nodes</span>
                  <span className="hf-val" id="statNodes">
                    17,796
                  </span>
                </div>
                <div className="hf-item">
                  <span className="hf-lbl">Hash Power</span>
                  <span className="hf-val" id="statHash">
                    893 PH/s
                  </span>
                </div>
                <div className="hf-item">
                  <span className="hf-lbl">Online</span>
                  <span className="hf-val" id="statOnline">
                    5,954
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* STATS BAR */}
          <div className="stats-bar fade-up visible">
            <div className="stat-item">
              <div className="stat-val">10×</div>
              <div className="stat-label">Contract Return</div>
            </div>
            <div className="stat-item">
              <div className="stat-val">7 Days</div>
              <div className="stat-label">Fixed Contract</div>
            </div>
            <div className="stat-item">
              <div className="stat-val">0%</div>
              <div className="stat-label">Device Load</div>
            </div>
            <div className="stat-item">
              <div className="stat-val">24/7</div>
              <div className="stat-label">Datacenter Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CLOUD MINING PLANS SELECTION ─── */}
      <section id="plans" className="plans-section">
        <div className="container">
          <div className="section-header fade-up visible">
            <span className="section-tag">// Cloud Mining Plans</span>
            <h2 className="section-title">Select Your Cloud Mining Plan</h2>
            <p className="plans-subtitle">
              Choose your cloud mining power. Guaranteed 10× return mined after 7 days on our datacenter clusters.
            </p>
          </div>

          <div className="plans-grid">
            {MINING_PLANS.map((plan) => {
              const isSelected = activePlan.tierIndex === plan.tierIndex;
              return (
                <div
                  key={plan.id}
                  className={`plan-card ${isSelected ? "selected" : ""} ${plan.tierIndex === 1 ? "popular" : ""}`}
                  onClick={() => handleSelectPlan(plan)}
                >
                  <span className="plan-badge">{plan.badge}</span>

                  <div className="plan-header">
                    <div className="plan-name">{plan.name}</div>
                    <div className="plan-price-wrap">
                      <span className="plan-price">${plan.priceUsd}</span>
                      <span className="plan-period">/ 7-Day Contract</span>
                    </div>
                  </div>

                  <div className="plan-roi-box">
                    <div className="roi-label">Guaranteed 7-Day Return</div>
                    <div className="roi-amount">${plan.targetUsd.toLocaleString()}</div>
                    <div className="roi-sub">10× Output (${Math.round(plan.dailyUsd)} / day)</div>
                    <span className="roi-multiplier">10× GUARANTEED</span>
                  </div>

                  <div className="plan-specs">
                    <div className="spec-row">
                      <span className="spec-icon">⚡</span>
                      <span className="spec-label">Cloud Rig</span>
                      <span className="spec-val">{plan.rigHardware}</span>
                    </div>
                    <div className="spec-row">
                      <span className="spec-icon">🚀</span>
                      <span className="spec-label">Hash Power</span>
                      <span className="spec-val" style={{ color: "#ffae19" }}>{plan.hashrateDisplay}</span>
                    </div>
                    <div className="spec-row">
                      <span className="spec-icon">🪙</span>
                      <span className="spec-label">Tokens Unlocked</span>
                      <span className="spec-val">
                        <span className="coin-badge-pill unlocked">
                          {plan.tierIndex === 0
                            ? "3 Top Coins"
                            : plan.tierIndex === 1
                            ? "8 Major Coins"
                            : "All 14+ Tokens"}
                        </span>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`btn-select-plan ${isSelected ? "active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPlan(plan);
                    }}
                  >
                    SELECT PLAN · ${plan.priceUsd} →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── KNOWLEDGE / PRIVACY SECTION ─── */}
      <section id="privacy" className="knowledge-section">
        <div className="container">
          <div className="privacy-grid fade-up visible">
            <div className="privacy-visual">
              <div className="shield-wrap">
                <div className="shield-rings">
                  <div className="sr"></div>
                  <div className="sr"></div>
                  <div className="sr"></div>
                </div>
                <svg viewBox="0 0 200 240" fill="none">
                  <path d="M100 10 L185 50 L185 130 Q185 200 100 230 Q15 200 15 130 L15 50 Z" stroke="url(#sg)" strokeWidth="2" fill="rgba(236,117,5,0.03)"></path>
                  <path d="M80 125 L95 140 L125 105" stroke="#ffae19" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"></path>
                  <defs>
                    <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#EC7505"></stop>
                      <stop offset="100%" stopColor="#ffae19"></stop>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            <div className="privacy-content">
              <span className="section-tag">// Zero-Knowledge Architecture</span>
              <h2>Your Privacy Is Not a Feature. It's the Foundation.</h2>
              <p>CHUKOHASH is built on a radical premise: your mining data belongs to you alone. We engineered our platform around session-based local storage — not because it was easy, but because it was right.</p>
              <p>Every session, every earning, every configuration lives exclusively in your browser's localStorage. No server databases. No user accounts. No KYC. No analytics. No cookies. Nothing leaves your machine.</p>

              <ul className="privacy-points">
                <li>
                  <span className="icon-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  </span>
                  <div><strong>Anti-KYC by design</strong> — No identity documents, no personal data, no verification</div>
                </li>
                <li>
                  <span className="icon-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  </span>
                  <div><strong>localStorage only</strong> — All data stored locally. Clear anytime, gone forever</div>
                </li>
                <li>
                  <span className="icon-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  </span>
                  <div><strong>Zero tracking</strong> — No analytics, fingerprinting, cookies, or server logs</div>
                </li>
                <li>
                  <span className="icon-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  </span>
                  <div><strong>Open architecture</strong> — Inspect the code yourself. What you see is what runs</div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PLATFORM CAPABILITIES SECTION ─── */}
      <section id="features" className="features-section">
        <div className="container">
          <div className="section-header fade-up visible">
            <span className="section-tag">// Platform Capabilities</span>
            <h2 className="section-title">Built for Serious Miners</h2>
          </div>
          <div className="features-grid fade-up visible">
            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(0,232,255,0.08)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00e8ff" strokeWidth="2">
                  <rect x="4" y="4" width="16" height="16" rx="2"></rect>
                  <path d="M9 9h6M9 12h6M9 15h4"></path>
                </svg>
              </div>
              <h3>GPU &amp; ASIC Clusters</h3>
              <p>Enterprise-grade GPU &amp; ASIC farms across multiple datacenters. No hardware purchases required.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(108,92,231,0.08)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6c5ce7" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 6v6l4 2"></path>
                </svg>
              </div>
              <h3>7-Day Guaranteed Contracts</h3>
              <p>Predictable 7-day cloud mining contracts delivering an exact 10× return on cluster power.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(0,214,143,0.08)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00d68f" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                </svg>
              </div>
              <h3>Multi-Chain Mining</h3>
              <p>Mine BTC, ETH, SOL, TON, XMR, DOGE, BNB, LTC, and more — switch instantly in your dashboard.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(255,71,87,0.08)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff4757" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              </div>
              <h3>Zero Data Collection</h3>
              <p>No accounts, no KYC, no tracking. Full anonymity with localStorage-only architecture.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(255,165,2,0.08)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffa502" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
                </svg>
              </div>
              <h3>Instant Cloud Deployment</h3>
              <p>No installation, no config. Select your plan, enter your email, start cloud mining in seconds.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(0,200,255,0.08)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00c8ff" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"></path>
                </svg>
              </div>
              <h3>Transparent 10× ROI</h3>
              <p>Fixed contract pricing: $150 → $1,500 · $300 → $3,000 · $500 → $5,000. Transparent daily yield.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS SECTION ─── */}
      <section id="howto" className="howto-section">
        <div className="container">
          <div className="section-header fade-up visible">
            <span className="section-tag">// Getting Started</span>
            <h2 className="section-title">How It Works</h2>
          </div>
          <div className="steps fade-up visible">
            <div className="step">
              <div className="step-num">01</div>
              <div className="step-content">
                <h3>Select a Plan</h3>
                <p>Choose from Node Starter ($150), Cluster Rig ($300), or Quantum Titan ($500)</p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">02</div>
              <div className="step-content">
                <h3>Enter Email</h3>
                <p>Provide your email to link your contract and receive instant settlement notifications</p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">03</div>
              <div className="step-content">
                <h3>Dedicated Dashboard</h3>
                <p>Monitor your live mined balance, hashrate, and contract progression in real-time</p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">04</div>
              <div className="step-content">
                <h3>Claim Payout</h3>
                <p>Once completed, withdraw your 10× mined balance directly to your private crypto wallet</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ SECTION ─── */}
      <section id="faq" className="faq-section">
        <div className="container">
          <div className="section-header fade-up visible">
            <span className="section-tag">// FAQ</span>
            <h2 className="section-title">Frequently Asked Questions</h2>
          </div>
          <div className="faq-list fade-up visible">
            {FAQ_ITEMS.map((item, i) => (
              <FaqItem key={i} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Plan Email Modal */}
      <PlanEmailModal
        plan={selectedPlanForModal}
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
      />

      <WithdrawalModal />
      <UnpaidBanner />
    </>
  );
}
