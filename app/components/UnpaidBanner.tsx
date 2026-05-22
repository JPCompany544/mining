"use client";

import React, { useState } from "react";
import { useMiningStore } from "../store/useMiningStore";
import Portal from "./Portal";

export default function UnpaidBanner() {
  const unpaidSessions = useMiningStore((s) => s.unpaidSessions);
  const openWithdrawalModal = useMiningStore((s) => s.openWithdrawalModal);
  
  const [isListOpen, setIsListOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (unpaidSessions.length === 0 || isDismissed) {
    return null;
  }

  const showUnpaidList = () => {
    setIsListOpen(true);
  };

  const dismissUnpaid = () => {
    setIsDismissed(true);
  };

  const selectSession = (session: any) => {
    openWithdrawalModal(session);
    setIsListOpen(false);
  };

  return (
    <>
      <style>{`
        .unpaid-banner {
          font-size: 16px;
          --bg-primary: #070a0f;
          --bg-secondary: #0b0f16;
          --bg-card: rgba(11,15,22,0.9);
          --accent: #00e8ff;
          --accent-dim: rgba(0,232,255,0.12);
          --accent-glow: rgba(0,232,255,0.35);
          --accent2: #6c5ce7;
          --accent2-dim: rgba(108,92,231,0.12);
          --green: #00d68f;
          --green-dim: rgba(0,214,143,0.12);
          --red: #ff4757;
          --red-dim: rgba(255,71,87,0.12);
          --orange: #ffa502;
          --text-primary: #e4e8ee;
          --text-secondary: #adb3bd;
          --text-dim: #6e7480;
          --border: rgba(255,255,255,0.06);
          --border-hover: rgba(255,255,255,0.12);
          --glass: rgba(255,255,255,0.03);
          --r: 10px;
          --r-lg: 16px;
          color: var(--text-primary);
          font-family: 'Rajdhani',sans-serif;
          line-height: 1.6;
          -webkit-font-smoothing: antialiased;
          -webkit-tap-highlight-color: transparent;
          margin: 0;
          box-sizing: border-box;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 30;
          background: rgba(255,165,2,0.1);
          border-top: 1px solid rgba(255,165,2,0.25);
          backdrop-filter: blur(16px);
          padding: 12px 0;
          display: block;
        }

        .unpaid-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .unpaid-text {
          flex: 1;
        }

        .unpaid-text strong {
          color: var(--orange);
          font-size: 18px;
        }

        .unpaid-btn {
          background: var(--orange);
          color: #000;
          border: none;
          padding: 6px 16px;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
        }

        .unpaid-btn:hover {
          background: #ffb732;
        }

        .unpaid-dismiss {
          background: transparent;
          color: var(--text-secondary);
          border: none;
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
          padding: 0 8px;
          opacity: 0.7;
          transition: 0.2s;
        }

        .unpaid-dismiss:hover {
          opacity: 1;
          color: #fff;
        }

        /* Unpaid List Modal Styles */
        .unpaid-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(4px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        
        .unpaid-modal {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r-lg);
          padding: 24px;
          width: 100%;
          max-width: 500px;
          max-height: 80vh;
          overflow-y: auto;
        }

        .unpaid-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 16px;
        }

        .unpaid-modal-header h3 {
          margin: 0;
          font-size: 20px;
        }

        .unpaid-modal-close {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 24px;
          cursor: pointer;
        }

        .unpaid-session-item {
          background: var(--glass);
          border: 1px solid var(--border);
          border-radius: var(--r);
          padding: 16px;
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: 0.2s;
        }

        .unpaid-session-item:hover {
          background: rgba(255,255,255,0.05);
          border-color: var(--border-hover);
        }
        
        .us-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .us-code {
          font-family: monospace;
          color: var(--text-secondary);
          font-size: 13px;
        }
        
        .us-amount {
          color: var(--green);
          font-weight: 600;
          font-size: 18px;
        }
      `}</style>
      
      <div className="unpaid-banner" id="unpaidBanner">
        <div className="container">
          <div className="unpaid-inner">
            <span className="unpaid-text" id="unpaidText">
              You have <strong>{unpaidSessions.length}</strong> unpaid {unpaidSessions.length === 1 ? 'session' : 'sessions'}
            </span>
            <button className="unpaid-btn" onClick={showUnpaidList}>View</button>
            <button className="unpaid-dismiss" onClick={dismissUnpaid}>×</button>
          </div>
        </div>
      </div>

      {isListOpen && (
        <Portal>
          <div className="unpaid-modal-overlay" onClick={() => setIsListOpen(false)}>
            <div className="unpaid-modal" onClick={e => e.stopPropagation()}>
              <div className="unpaid-modal-header">
                <h3>Unpaid Sessions</h3>
                <button className="unpaid-modal-close" onClick={() => setIsListOpen(false)}>×</button>
              </div>
              <div className="unpaid-sessions-list">
                {unpaidSessions.map(s => (
                  <div key={s.sessionId} className="unpaid-session-item">
                    <div className="us-info">
                      <span className="us-code">{s.sessionId}</span>
                      <span className="us-amount">{s.minedAmount.toFixed(8)} {s.coinTicker}</span>
                    </div>
                    <button className="unpaid-btn" style={{ padding: '8px 16px' }} onClick={() => selectSession(s)}>
                      Pay Fee
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
