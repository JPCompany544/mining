"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

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
