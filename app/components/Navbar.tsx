"use client";

import { useState, useEffect } from "react";

export default function Navbar() {
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

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);

    // Bind functions globally to match the exact onclick attributes in the outerHTML
    if (typeof window !== "undefined") {
      (window as any).toggleMenu = toggleMenu;
      (window as any).openSupport = openSupport;
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (typeof window !== "undefined") {
        delete (window as any).toggleMenu;
        delete (window as any).openSupport;
      }
    };
  }, [isOpen]);

  return (
    <nav id="navbar" className={`${isScrolled ? "scrolled" : ""} ${isOpen ? "menu-open" : ""}`}>
      <div className="container nav-inner">
        <div className="logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          CHUKOHASH<span>.io</span>
        </div>
        <div className={`nav-links ${isOpen ? "active" : ""}`}>
          <a href="#dashboard" onClick={() => setIsOpen(false)}>Dashboard</a>
          <a href="#privacy" onClick={() => setIsOpen(false)}>Privacy</a>
          <a href="#features" onClick={() => setIsOpen(false)}>Features</a>
          <a href="#howto" onClick={() => setIsOpen(false)}>How It Works</a>
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
          <a href="#mining" className="nav-cta" onClick={() => setIsOpen(false)}>
            Start Mining
          </a>
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
