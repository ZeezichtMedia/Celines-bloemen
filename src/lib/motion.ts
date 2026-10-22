// Beweging: Lenis smooth scroll, verschijnen bij scrollen en de zwevende header.
// Deliberately small: smooth scroll (Lenis), blur-fade reveals, scroll-aware header.
// Resist adding cursor spotlights, magnetic buttons, counters. Restraint is the point.
//
// Boot it once from your layout/page:
//   import { bootMotion } from "../lib/motion";
//   bootMotion();
// After injecting DOM at runtime (e.g. a generated result), call
//   window.__siteReveal?.(container)
// so the new .reveal nodes get observed too.

import Lenis from "lenis";

declare global {
  interface Window {
    __siteLenis?: Lenis;
    __siteRevealObserver?: IntersectionObserver;
    __siteScrollHandler?: () => void;
    __siteReveal?: (root?: ParentNode) => void;
  }
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// -------------------- Lenis smooth scroll --------------------
export function initLenis() {
  if (typeof window === "undefined" || prefersReducedMotion()) return;
  if (window.__siteLenis) { rebindAnchors(window.__siteLenis); return; }

  const lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.5,
    lerp: 0.1,
  });
  window.__siteLenis = lenis;

  function raf(time: number) { lenis.raf(time); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);
  rebindAnchors(lenis);
}

function rebindAnchors(lenis: Lenis) {
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    if (a.dataset.lenisAnchorBound) return;
    a.dataset.lenisAnchorBound = "true";
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.querySelector(href);
      if (target) { e.preventDefault(); lenis.scrollTo(target as HTMLElement, { offset: -88, duration: 1.2 }); }
    });
  });
}

export function scrollToEl(el: HTMLElement, offset = -88) {
  if (window.__siteLenis) window.__siteLenis.scrollTo(el, { offset, duration: 1.2 });
  else el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// -------------------- Reveal animations --------------------
export function initRevealAnimations(root: ParentNode = document) {
  if (typeof window === "undefined") return;
  if (!window.__siteRevealObserver) {
    window.__siteRevealObserver = new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
  }
  const observer = window.__siteRevealObserver;
  root
    .querySelectorAll<HTMLElement>(".reveal:not(.is-visible), .reveal-image:not(.is-visible), .reveal-stagger:not(.is-visible)")
    .forEach((el) => observer.observe(el));
}

// -------------------- Scroll-aware header --------------------
export function initScrollHeader() {
  if (typeof window === "undefined") return;
  const header = document.querySelector<HTMLElement>(".site-header");
  if (!header) return;
  if (window.__siteScrollHandler) window.removeEventListener("scroll", window.__siteScrollHandler);
  const update = () => { header.dataset.scrolled = String(window.scrollY > 40); };
  window.__siteScrollHandler = update;
  window.addEventListener("scroll", update, { passive: true });
  update();
}

// -------------------- Boot --------------------
export function bootMotion() {
  initLenis();
  initRevealAnimations();
  initScrollHeader();
  window.__siteReveal = (root?: ParentNode) => initRevealAnimations(root ?? document);
}
