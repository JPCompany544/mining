"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface UserRecord {
  id: string;
  email: string;
  username: string;
  selected_plan?: string | null;
  selected_plan_price?: number | null;
  selected_plan_at?: string | null;
  created_at: string;
  email_verified: boolean;
  deposits: {
    total: number;
    pending: number;
    confirmed: number;
    rejected: number;
  };
}

interface DepositRecord {
  id: string;
  user_id: string;
  user_email: string;
  plan_name: string;
  plan_price_usd: number;
  tier_index: number;
  coin_symbol: string;
  coin_network: string;
  crypto_amount: string;
  wallet_address: string;
  status: "pending" | "confirmed" | "rejected";
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

type Tab = "deposits" | "users";
type DepositFilter = "all" | "pending" | "confirmed" | "rejected";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("deposits");
  const [depositFilter, setDepositFilter] = useState<DepositFilter>("pending");

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [depositsLoading, setDepositsLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [expandedDeposit, setExpandedDeposit] = useState<string | null>(null);

  // Check admin auth
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user?.email) {
        router.push("/login?redirect=/admin");
        return;
      }
      setAdminEmail(data.user.email);
      // We'll verify admin status via the API call
      setAuthorized(true);
      setLoading(false);
    });
  }, [router]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.status === 403) {
        setAuthorized(false);
        setUsersLoading(false);
        return;
      }
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
    setUsersLoading(false);
  }, []);

  const fetchDeposits = useCallback(async () => {
    setDepositsLoading(true);
    try {
      const statusParam = depositFilter !== "all" ? `?status=${depositFilter}` : "";
      const res = await fetch(`/api/admin/deposits${statusParam}`);
      if (res.status === 403) {
        setAuthorized(false);
        setDepositsLoading(false);
        return;
      }
      const data = await res.json();
      if (data.deposits) setDeposits(data.deposits);
    } catch (err) {
      console.error("Failed to fetch deposits:", err);
    }
    setDepositsLoading(false);
  }, [depositFilter]);

  // Auto-refresh deposits every 8 seconds
  useEffect(() => {
    if (!authorized) return;
    fetchDeposits();
    const interval = setInterval(fetchDeposits, 8000);
    return () => clearInterval(interval);
  }, [authorized, fetchDeposits]);

  useEffect(() => {
    if (authorized && activeTab === "users") {
      fetchUsers();
    }
  }, [authorized, activeTab, fetchUsers]);

  const handleDepositAction = async (depositId: string, status: "confirmed" | "rejected") => {
    setActionLoading(depositId);
    try {
      const res = await fetch(`/api/admin/deposits/${depositId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, admin_note: actionNote || undefined }),
      });
      if (res.ok) {
        setActionNote("");
        setExpandedDeposit(null);
        fetchDeposits();
      }
    } catch (err) {
      console.error("Action failed:", err);
    }
    setActionLoading(null);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading admin panel...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.deniedIcon}>🔒</div>
        <h2 style={styles.deniedTitle}>Access Denied</h2>
        <p style={styles.deniedSub}>
          Your account (<strong>{adminEmail}</strong>) is not authorized to access the admin panel.
        </p>
        <button style={styles.backBtn} onClick={() => router.push("/dashboard")}>
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  const pendingCount = deposits.filter((d) => d.status === "pending").length;

  return (
    <div style={styles.page}>
      {/* Top Bar */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            type="button"
            style={styles.backPlatformBtn}
            onClick={() => router.push("/dashboard")}
            title="Go to Miner Dashboard"
          >
            ← Platform
          </button>
          <h1 style={styles.logo}>⚡ CHUKO ADMIN</h1>
          <span style={styles.adminBadge}>ADMIN</span>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.adminEmail} title={adminEmail}>
            {adminEmail}
          </span>
          <button style={styles.signOutBtn} onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Stats Row */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <span style={styles.statNum}>{users.length || "—"}</span>
          <span style={styles.statLabel}>Total Users</span>
        </div>
        <div style={{ ...styles.statCard, borderColor: pendingCount > 0 ? "#f59e0b" : "rgba(255,255,255,0.08)" }}>
          <span style={{ ...styles.statNum, color: pendingCount > 0 ? "#fbbf24" : "#f8fafc" }}>
            {pendingCount}
          </span>
          <span style={styles.statLabel}>Pending Payments</span>
        </div>
        <div style={styles.statCard}>
          <span style={{ ...styles.statNum, color: "#22c55e" }}>
            {deposits.filter((d) => d.status === "confirmed").length || "0"}
          </span>
          <span style={styles.statLabel}>Confirmed</span>
        </div>
        <div style={styles.statCard}>
          <span style={{ ...styles.statNum, color: "#ef4444" }}>
            {deposits.filter((d) => d.status === "rejected").length || "0"}
          </span>
          <span style={styles.statLabel}>Rejected</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={styles.tabRow}>
        <button
          style={activeTab === "deposits" ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab("deposits")}
        >
          Payments {pendingCount > 0 && <span style={styles.tabBadge}>{pendingCount}</span>}
        </button>
        <button
          style={activeTab === "users" ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab("users")}
        >
          All Users
        </button>
      </div>

      {/* ─── DEPOSITS TAB ─── */}
      {activeTab === "deposits" && (
        <div style={styles.section}>
          {/* Filter Row */}
          <div style={styles.filterRow}>
            {(["pending", "all", "confirmed", "rejected"] as DepositFilter[]).map((f) => (
              <button
                key={f}
                style={depositFilter === f ? styles.filterActive : styles.filterBtn}
                onClick={() => setDepositFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            <button style={styles.refreshBtn} onClick={fetchDeposits} disabled={depositsLoading}>
              {depositsLoading ? "⟳" : "Refresh"}
            </button>
          </div>

          {depositsLoading && deposits.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.spinner} />
              <p>Loading payments...</p>
            </div>
          ) : deposits.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={{ fontSize: "2rem" }}>📭</span>
              <p>No {depositFilter !== "all" ? depositFilter : ""} payments found.</p>
            </div>
          ) : (
            <div style={styles.depositList}>
              {deposits.map((deposit) => {
                const isExpanded = expandedDeposit === deposit.id;
                const isPending = deposit.status === "pending";
                const isProcessing = actionLoading === deposit.id;

                return (
                  <div
                    key={deposit.id}
                    style={{
                      ...styles.depositCard,
                      borderLeftColor:
                        deposit.status === "pending"
                          ? "#f59e0b"
                          : deposit.status === "confirmed"
                          ? "#22c55e"
                          : "#ef4444",
                    }}
                  >
                    {/* Deposit Header */}
                    <div
                      style={styles.depositHeader}
                      onClick={() => setExpandedDeposit(isExpanded ? null : deposit.id)}
                    >
                      <div style={styles.depositMain}>
                        <div style={styles.depositTopRow}>
                          <span style={styles.depositEmail}>{deposit.user_email}</span>
                          <span
                            style={{
                              ...styles.statusBadge,
                              background:
                                deposit.status === "pending"
                                  ? "rgba(245, 158, 11, 0.15)"
                                  : deposit.status === "confirmed"
                                  ? "rgba(34, 197, 94, 0.15)"
                                  : "rgba(239, 68, 68, 0.15)",
                              color:
                                deposit.status === "pending"
                                  ? "#fbbf24"
                                  : deposit.status === "confirmed"
                                  ? "#4ade80"
                                  : "#f87171",
                              borderColor:
                                deposit.status === "pending"
                                  ? "rgba(245, 158, 11, 0.3)"
                                  : deposit.status === "confirmed"
                                  ? "rgba(34, 197, 94, 0.3)"
                                  : "rgba(239, 68, 68, 0.3)",
                            }}
                          >
                            {deposit.status.toUpperCase()}
                          </span>
                        </div>
                        <div style={styles.depositMeta}>
                          <span>
                            <strong style={{ color: "#ffae19" }}>{deposit.plan_name}</strong>
                            {" · "}${deposit.plan_price_usd} USD
                          </span>
                          <span style={{ color: "#64748b" }}>·</span>
                          <span>
                            {deposit.crypto_amount} {deposit.coin_symbol}
                          </span>
                          <span style={{ color: "#64748b" }}>·</span>
                          <span style={{ color: "#64748b" }}>{timeAgo(deposit.created_at)}</span>
                        </div>
                      </div>
                      <span style={styles.expandArrow}>{isExpanded ? "▲" : "▼"}</span>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div style={styles.depositDetails}>
                        <div style={styles.detailGrid}>
                          <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Deposit ID</span>
                            <span style={styles.detailValue}>{deposit.id.slice(0, 8)}...</span>
                          </div>
                          <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Network</span>
                            <span style={styles.detailValue}>{deposit.coin_network}</span>
                          </div>
                          <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Wallet Address</span>
                            <span style={{ ...styles.detailValue, fontSize: "0.75rem", wordBreak: "break-all" as const }}>
                              {deposit.wallet_address}
                            </span>
                          </div>
                          <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Submitted</span>
                            <span style={styles.detailValue}>{formatDate(deposit.created_at)}</span>
                          </div>
                        </div>

                        {deposit.admin_note && (
                          <div style={styles.noteBox}>
                            <span style={styles.noteLabel}>Admin Note:</span> {deposit.admin_note}
                          </div>
                        )}

                        {isPending && (
                          <div style={styles.actionArea}>
                            <input
                              type="text"
                              placeholder="Optional note (e.g. TxID or reason)"
                              value={expandedDeposit === deposit.id ? actionNote : ""}
                              onChange={(e) => setActionNote(e.target.value)}
                              style={styles.noteInput}
                            />
                            <div style={styles.actionBtns}>
                              <button
                                style={styles.confirmBtn}
                                disabled={isProcessing}
                                onClick={() => handleDepositAction(deposit.id, "confirmed")}
                              >
                                {isProcessing ? "Processing..." : "✓ Confirm Payment"}
                              </button>
                              <button
                                style={styles.rejectBtn}
                                disabled={isProcessing}
                                onClick={() => handleDepositAction(deposit.id, "rejected")}
                              >
                                {isProcessing ? "Processing..." : "✕ Reject"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── USERS TAB ─── */}
      {activeTab === "users" && (
        <div style={styles.section}>
          <div style={styles.filterRow}>
            <span style={styles.sectionTitle}>
              Registered Users ({users.length})
            </span>
            <button style={styles.refreshBtn} onClick={fetchUsers} disabled={usersLoading}>
              {usersLoading ? "⟳" : "Refresh"}
            </button>
          </div>

          {usersLoading && users.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.spinner} />
              <p>Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={{ fontSize: "2rem" }}>👥</span>
              <p>No users registered yet.</p>
            </div>
          ) : (
            <div style={styles.userList}>
              {users.map((u) => (
                <div key={u.id} style={styles.userCard}>
                  <div style={styles.userTop}>
                    <div style={styles.userAvatar}>
                      {(u.username || u.email)[0]?.toUpperCase() || "?"}
                    </div>
                    <div style={styles.userInfo}>
                      <span style={styles.userName}>{u.username || "—"}</span>
                      <span style={styles.userEmail}>{u.email}</span>
                    </div>
                    <div style={styles.userBadges}>
                      {u.email_verified ? (
                        <span style={styles.verifiedBadge}>✓ Verified</span>
                      ) : (
                        <span style={styles.unverifiedBadge}>Unverified</span>
                      )}
                    </div>
                  </div>
                  <div style={styles.userPlanRow}>
                    <span style={styles.userPlanLabel}>Clicked Plan:</span>
                    {u.selected_plan ? (
                      <span style={styles.userPlanBadge}>
                        <strong style={{ color: "#ffae19" }}>{u.selected_plan}</strong>
                        {u.selected_plan_price ? (
                          <span style={{ color: "#4ade80", marginLeft: 5 }}>(${u.selected_plan_price} USD)</span>
                        ) : null}
                        {u.deposits.confirmed === 0 && (
                          <span style={{ color: "#94a3b8", fontSize: "0.72rem", marginLeft: 6 }}>
                            · Not paid yet
                          </span>
                        )}
                      </span>
                    ) : (
                      <span style={{ color: "#64748b", fontSize: "0.82rem", fontStyle: "italic" }}>
                        None clicked yet
                      </span>
                    )}
                  </div>
                  <div style={styles.userBottom}>
                    <span style={styles.userStat}>
                      Registered: <strong>{formatDate(u.created_at)}</strong>
                    </span>
                    <span style={styles.userStat}>
                      Deposits: <strong>{u.deposits.total}</strong>
                      {u.deposits.pending > 0 && (
                        <span style={{ color: "#fbbf24", marginLeft: 4 }}>
                          ({u.deposits.pending} pending)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Inline Styles ─── */
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#030712",
    color: "#f8fafc",
    fontFamily: "'Rajdhani', sans-serif",
    padding: "0 0 3rem 0",
  },
  loadingWrap: {
    minHeight: "100vh",
    background: "#030712",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem",
    color: "#f8fafc",
    fontFamily: "'Rajdhani', sans-serif",
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid rgba(236, 117, 5, 0.2)",
    borderTopColor: "#ffae19",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    color: "#94a3b8",
    fontSize: "1rem",
    fontWeight: 600,
  },
  deniedIcon: { fontSize: "3rem", marginBottom: 8 },
  deniedTitle: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "1.4rem",
    fontWeight: 800,
    margin: 0,
  },
  deniedSub: {
    color: "#94a3b8",
    fontSize: "1rem",
    textAlign: "center",
    maxWidth: 400,
    lineHeight: 1.5,
  },
  backBtn: {
    marginTop: 16,
    padding: "10px 24px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 10,
    color: "#f8fafc",
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: "0.95rem",
    fontWeight: 700,
    cursor: "pointer",
  },

  // Header
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.85rem 1rem",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    flexWrap: "wrap",
    gap: "0.5rem",
    background: "#080d1a",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  backPlatformBtn: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 6,
    color: "#94a3b8",
    padding: "4px 8px",
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: "0.78rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  logo: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "1rem",
    fontWeight: 900,
    color: "#ffae19",
    margin: 0,
    letterSpacing: "0.03em",
  },
  adminBadge: {
    padding: "2px 6px",
    background: "rgba(236, 117, 5, 0.15)",
    border: "1px solid rgba(236, 117, 5, 0.3)",
    borderRadius: 6,
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "0.6rem",
    fontWeight: 800,
    color: "#ffae19",
    letterSpacing: "0.1em",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginLeft: "auto",
  },
  adminEmail: {
    color: "#94a3b8",
    fontSize: "0.82rem",
    fontWeight: 600,
    maxWidth: "180px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  signOutBtn: {
    padding: "5px 12px",
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: 8,
    color: "#f87171",
    fontSize: "0.8rem",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  // Stats Row
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "0.75rem",
    padding: "1.25rem 1.5rem",
  },
  statCard: {
    background: "rgba(15, 20, 32, 0.8)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  statNum: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "1.6rem",
    fontWeight: 900,
    color: "#f8fafc",
  },
  statLabel: {
    fontSize: "0.78rem",
    color: "#64748b",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },

  // Tabs
  tabRow: {
    display: "flex",
    gap: 4,
    padding: "0 1.5rem",
    marginBottom: "0.5rem",
  },
  tab: {
    padding: "10px 20px",
    background: "none",
    border: "1px solid transparent",
    borderBottom: "none",
    borderRadius: "10px 10px 0 0",
    color: "#94a3b8",
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: "0.9rem",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  tabActive: {
    padding: "10px 20px",
    background: "rgba(15, 20, 32, 0.8)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderBottom: "1px solid transparent",
    borderRadius: "10px 10px 0 0",
    color: "#ffae19",
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: "0.9rem",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  tabBadge: {
    background: "#f59e0b",
    color: "#030712",
    borderRadius: 10,
    padding: "1px 7px",
    fontSize: "0.7rem",
    fontWeight: 800,
  },

  // Section
  section: {
    margin: "0 1.5rem",
    background: "rgba(15, 20, 32, 0.6)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "0 12px 12px 12px",
    padding: "1rem",
  },
  sectionTitle: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "0.85rem",
    fontWeight: 800,
    color: "#f8fafc",
    letterSpacing: "0.04em",
  },

  // Filters
  filterRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: "1rem",
    flexWrap: "wrap",
  },
  filterBtn: {
    padding: "6px 14px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    color: "#94a3b8",
    fontSize: "0.8rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  filterActive: {
    padding: "6px 14px",
    background: "rgba(236, 117, 5, 0.15)",
    border: "1px solid rgba(236, 117, 5, 0.4)",
    borderRadius: 8,
    color: "#ffae19",
    fontSize: "0.8rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  refreshBtn: {
    padding: "6px 14px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    color: "#94a3b8",
    fontSize: "0.8rem",
    fontWeight: 700,
    cursor: "pointer",
    marginLeft: "auto",
  },

  // Empty
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    padding: "3rem 1rem",
    color: "#64748b",
    fontSize: "0.95rem",
    fontWeight: 600,
  },

  // Deposit Cards
  depositList: { display: "flex", flexDirection: "column", gap: 8 },
  depositCard: {
    background: "rgba(4, 7, 18, 0.7)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderLeft: "3px solid #f59e0b",
    borderRadius: 10,
    overflow: "hidden",
  },
  depositHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.85rem 1rem",
    cursor: "pointer",
  },
  depositMain: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    flex: 1,
    minWidth: 0,
  },
  depositTopRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  depositEmail: {
    fontWeight: 700,
    fontSize: "0.95rem",
    color: "#f8fafc",
  },
  statusBadge: {
    padding: "2px 8px",
    borderRadius: 6,
    fontSize: "0.65rem",
    fontWeight: 800,
    fontFamily: "'Orbitron', sans-serif",
    letterSpacing: "0.05em",
    border: "1px solid",
  },
  depositMeta: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: "0.82rem",
    color: "#94a3b8",
    fontWeight: 600,
    flexWrap: "wrap",
  },
  expandArrow: {
    color: "#64748b",
    fontSize: "0.75rem",
    padding: "0 4px",
    flexShrink: 0,
  },

  // Deposit Details
  depositDetails: {
    borderTop: "1px solid rgba(255,255,255,0.06)",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.85rem",
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.6rem",
  },
  detailItem: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  detailLabel: {
    fontSize: "0.7rem",
    color: "#64748b",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  detailValue: {
    fontSize: "0.88rem",
    color: "#e2e8f0",
    fontWeight: 600,
  },
  noteBox: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: "0.82rem",
    color: "#94a3b8",
    fontWeight: 600,
  },
  noteLabel: {
    color: "#ffae19",
    fontWeight: 800,
  },

  // Action Area
  actionArea: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    paddingTop: 4,
  },
  noteInput: {
    width: "100%",
    padding: "10px 12px",
    background: "rgba(15, 20, 32, 0.8)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8,
    color: "#f8fafc",
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: "0.88rem",
    fontWeight: 600,
    outline: "none",
    boxSizing: "border-box",
  },
  actionBtns: {
    display: "flex",
    gap: 8,
  },
  confirmBtn: {
    flex: 1,
    padding: "10px 16px",
    background: "rgba(34, 197, 94, 0.15)",
    border: "1px solid rgba(34, 197, 94, 0.4)",
    borderRadius: 8,
    color: "#4ade80",
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: "0.88rem",
    fontWeight: 800,
    cursor: "pointer",
  },
  rejectBtn: {
    flex: 1,
    padding: "10px 16px",
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: 8,
    color: "#f87171",
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: "0.88rem",
    fontWeight: 800,
    cursor: "pointer",
  },

  // User Cards
  userList: { display: "flex", flexDirection: "column", gap: 8 },
  userCard: {
    background: "rgba(4, 7, 18, 0.7)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.65rem",
  },
  userTop: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #EC7505 0%, #ffae19 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "0.85rem",
    fontWeight: 900,
    color: "#030712",
    flexShrink: 0,
  },
  userInfo: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontWeight: 700,
    fontSize: "0.95rem",
    color: "#f8fafc",
  },
  userEmail: {
    fontSize: "0.82rem",
    color: "#94a3b8",
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  userBadges: { flexShrink: 0 },
  verifiedBadge: {
    padding: "3px 8px",
    background: "rgba(34, 197, 94, 0.12)",
    border: "1px solid rgba(34, 197, 94, 0.3)",
    borderRadius: 6,
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "#4ade80",
  },
  unverifiedBadge: {
    padding: "3px 8px",
    background: "rgba(245, 158, 11, 0.12)",
    border: "1px solid rgba(245, 158, 11, 0.3)",
    borderRadius: 6,
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "#fbbf24",
  },
  userBottom: {
    display: "flex",
    gap: 16,
    paddingTop: 4,
    borderTop: "1px solid rgba(255,255,255,0.05)",
    flexWrap: "wrap",
  },
  userStat: {
    fontSize: "0.8rem",
    color: "#64748b",
    fontWeight: 600,
  },
  userPlanRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    padding: "6px 10px",
    background: "rgba(255, 174, 25, 0.05)",
    border: "1px solid rgba(255, 174, 25, 0.15)",
    borderRadius: 8,
  },
  userPlanLabel: {
    fontSize: "0.78rem",
    color: "#94a3b8",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  userPlanBadge: {
    fontSize: "0.85rem",
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    flexWrap: "wrap",
  },
};

