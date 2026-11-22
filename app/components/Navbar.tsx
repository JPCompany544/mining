"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnv } from "@/lib/supabase/config";
import { useMiningStore } from "@/app/store/useMiningStore";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState<{ email?: string; id: string } | null>(null);

  const setUserEmail = useMiningStore((s) => s.setUserEmail);
  const { isConfigured } = getSupabaseEnv();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const openSupport = () => {
    if (typeof window !== "undefined") {
      alert("Support portal is coming soon! For inquiries, please email contact@chukohash.io");
    }
  };

  const handleLogoClick = () => {
    if (pathname !== "/") {
      router.push("/");
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    setIsOpen(false);
    if (!isConfigured) {
      setUser(null);
      router.push("/login");
      return;
    }

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser(null);
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Sign out error", err);
      router.push("/login");
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Listen to Supabase Auth State
  useEffect(() => {
    if (!isConfigured) return;

    const supabase = createClient();

    // 1. Initial check
    supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      const user = data.user;
      if (user) {
        setUser({ email: user.email, id: user.id });
        if (user.email) setUserEmail(user.email);
      } else {
        setUser(null);
      }
    });

    // 2. Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        setUser({ email: session.user.email, id: session.user.id });
        if (session.user.email) setUserEmail(session.user.email);
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured, setUserEmail]);

  // Dedicated admin portal has its own header; do not render public fixed navbar over it
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <nav id="navbar" className={`${isScrolled ? "scrolled" : ""} ${isOpen ? "menu-open" : ""}`}>
      <div className="container nav-inner">
        <div className="logo" onClick={handleLogoClick} style={{ cursor: "pointer" }}>
          CHUKOHASH<span>.io</span>
        </div>
        <div className={`nav-links ${isOpen ? "active" : ""}`}>
          <Link href="/dashboard" onClick={() => setIsOpen(false)}>
            Dashboard
          </Link>
          <Link href="/#plans" onClick={() => setIsOpen(false)}>
            Plans
          </Link>
          <Link href="/#privacy" onClick={() => setIsOpen(false)}>
            Privacy
          </Link>
          <Link href="/#features" onClick={() => setIsOpen(false)}>
            Features
          </Link>
          <Link href="/#howto" onClick={() => setIsOpen(false)}>
            How It Works
          </Link>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              openSupport();
              setIsOpen(false);
            }}
          >
            Support
          </a>

          {user ? (
            <div className="nav-user-chip">
              <span className="nav-user-indicator" title="Connected to Cloud Cluster" />
              <span className="nav-user-email" title={user.email || "Node Operator"}>
                {user.email || "Operator"}
              </span>
              <button
                type="button"
                className="nav-logout-btn"
                onClick={handleSignOut}
                title="Disconnect Node / Sign Out"
                aria-label="Sign Out"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="nav-auth-group">
              <Link
                href="/login"
                className="nav-auth-login"
                onClick={() => setIsOpen(false)}
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="nav-auth-register"
                onClick={() => setIsOpen(false)}
              >
                Register
              </Link>
            </div>
          )}

          <Link href="/#plans" className="nav-cta" onClick={() => setIsOpen(false)}>
            Start Mining
          </Link>
        </div>
        <button
          className={`menu-toggle ${isOpen ? "active" : ""}`}
          id="menuToggle"
          onClick={toggleMenu}
          aria-label="Toggle Menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </nav>
  );
}
