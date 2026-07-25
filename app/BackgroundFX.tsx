"use client";

import { useEffect, useRef } from "react";
import type { Mode } from "@/app/games";

type Petal = {
  x: number;
  y: number;
  vy: number;
  phase: number;
  speed: number;
  amp: number;
  scale: number;
  rot: number;
  vr: number;
  wind: number;
};

export default function BackgroundFX({ mode }: { mode: Mode }) {
  const layerRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // ---- stars (rendered once) ----
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const stars: HTMLDivElement[] = [];
    for (let i = 0; i < 80; i++) {
      const s = document.createElement("div");
      const size = Math.random() * 2 + 1;
      s.style.cssText = `position:absolute;background:#fff;border-radius:50%;
        width:${size}px;height:${size}px;left:${Math.random() * 100}%;top:${Math.random() * 100}%;
        animation:dexTwinkle 3s ease-in-out ${Math.random() * 3}s infinite`;
      s.dataset.fx = "star";
      layer.appendChild(s);
      stars.push(s);
    }
    return () => stars.forEach((s) => s.remove());
  }, []);

  // ---- shooting stars (auto + on click), dark only, upward ----
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const shoot = (x?: number, y?: number) => {
      if (modeRef.current !== "dark") return;
      const el = document.createElement("div");
      const len = Math.random() * 90 + 130;
      const sx = x ?? Math.random() * window.innerWidth;
      const sy =
        y ??
        window.innerHeight * 0.5 + Math.random() * window.innerHeight * 0.4;
      const angle = -(Math.random() * 30 + 45); // negative = upward
      el.style.cssText = `position:absolute;height:2px;width:${len}px;border-radius:2px;
        background:linear-gradient(90deg,transparent,#fff);transform-origin:right center;
        left:${sx}px;top:${sy}px;transform:rotate(${angle}deg);opacity:0`;
      layer.appendChild(el);
      el.animate(
        [
          { opacity: 0, transform: `rotate(${angle}deg) translateX(0)` },
          { opacity: 1, offset: 0.2 },
          { opacity: 0, transform: `rotate(${angle}deg) translateX(340px)` },
        ],
        { duration: 750, easing: "ease-out" },
      ).addEventListener("finish", () => el.remove());
    };

    const timer = window.setInterval(() => {
      if (Math.random() < 0.5) shoot();
    }, 3500);

    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("button") || t.closest("a")) return;
      shoot(e.clientX, e.clientY);
    };
    document.addEventListener("click", onClick);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("click", onClick);
    };
  }, []);

  // ---- petals: grand localized swoops + cursor wind, light only ----
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const els: HTMLDivElement[] = [];
    const petals: Petal[] = [];

    for (let i = 0; i < 24; i++) {
      const el = document.createElement("div");
      el.dataset.fx = "petal";
      el.style.cssText = `position:absolute;width:14px;height:14px;will-change:transform;
        border-radius:14px 2px 14px 2px;opacity:${(Math.random() * 0.35 + 0.55).toFixed(2)};
        background:radial-gradient(circle at 32% 28%,#ffdfea,#f2a0be 70%,#e07ba0)`;
      layer.appendChild(el);
      els.push(el);
      petals.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vy: Math.random() * 0.5 + 0.4,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.008 + 0.006,
        amp: Math.random() * 70 + 50, // big amplitude = grand curve
        scale: Math.random() * 0.6 + 0.6,
        rot: Math.random() * 360,
        vr: (Math.random() * 2 - 1) * 1.2,
        wind: 0,
      });
    }

    let mx = -999;
    let my = -999;
    let prevX = -999;
    let vx = 0;
    const onMove = (e: MouseEvent) => {
      if (prevX !== -999) vx = e.clientX - prevX;
      prevX = e.clientX;
      mx = e.clientX;
      my = e.clientY;
    };
    document.addEventListener("mousemove", onMove);

    let raf = 0;
    const tick = () => {
      const light = modeRef.current === "light";
      for (let i = 0; i < petals.length; i++) {
        const p = petals[i];
        els[i].style.display = light ? "block" : "none";
        if (!light) continue;

        p.phase += p.speed;
        const curve = Math.sin(p.phase) * p.amp * p.speed * 14;

        // localized wind: only petals near the cursor get pushed
        const dist = Math.hypot(p.x - mx, p.y - my);
        if (dist < 180) p.wind += vx * 0.15 * (1 - dist / 180);
        p.wind *= 0.94;

        p.x += curve + p.wind * 0.3;
        p.y += p.vy;
        p.rot += p.vr;

        if (p.y > window.innerHeight + 20) {
          p.y = -20;
          p.x = Math.random() * window.innerWidth;
          p.wind = 0;
        }
        if (p.x > window.innerWidth + 30) p.x = -30;
        if (p.x < -30) p.x = window.innerWidth + 30;

        els[i].style.transform =
          `translate(${p.x}px, ${p.y}px) rotate(${p.rot}deg) scale(${p.scale})`;
      }
      vx *= 0.85;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousemove", onMove);
      els.forEach((el) => el.remove());
    };
  }, []);

  // hide stars in light mode
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer
      .querySelectorAll<HTMLElement>('[data-fx="star"]')
      .forEach((s) => (s.style.display = mode === "dark" ? "block" : "none"));
  }, [mode]);

  return (
    <>
      <style>{`@keyframes dexTwinkle{0%,100%{opacity:.2}50%{opacity:1}}`}</style>
      <div
        ref={layerRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden transition-all duration-500"
        style={{ background: "var(--scene)" }}
      />
    </>
  );
}
