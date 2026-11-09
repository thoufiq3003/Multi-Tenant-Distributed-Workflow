import React, { useEffect, useRef, useState } from "react";

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Fades/slides children in the first time they scroll into view. */
export function Reveal({ children, delay = 0, as: Tag = "div", className = "", style, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced() || !("IntersectionObserver" in window)) { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} className={`reveal ${shown ? "in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms`, ...style }} {...rest}>{children}</Tag>;
}

/** Counts up to `value` whenever it changes (e.g. when API data arrives). */
export function CountUp({ value = 0, duration = 1200 }) {
  const [n, setN] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (reduced()) { setN(value); return; }
    const start = performance.now(), a = from.current;
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(a + (value - a) * eased));
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{n.toLocaleString()}</>;
}

/** Cycles through words with a slide animation. */
export function RotatingWord({ words, interval = 2200 }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduced()) return;
    const t = setInterval(() => setI(x => (x + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words, interval]);
  return <span className="rot-word" key={i}>{words[i]}</span>;
}

/** Sets --mx / --my on hover so CSS can draw a spotlight that follows the cursor. */
export const spotlight = (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
};

/** Animated mini workflow graph for the hero: a pulse travels through the DAG. */
export function FlowDiagram() {
  const nodes = [
    { x: 14, y: 52, label: "Trigger", c: "#4ade80" },
    { x: 130, y: 52, label: "HTTP call", c: "#60a5fa" },
    { x: 246, y: 52, label: "Condition", c: "#c4b5fd" },
    { x: 362, y: 52, label: "Notify", c: "#4ade80" }
  ];
  return (
    <svg className="flow-diagram" viewBox="0 0 470 170" role="img" aria-label="Animated workflow diagram">
      <defs><filter id="glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
      {/* edges */}
      {[0, 1, 2].map(i => <line key={i} className="fd-edge" x1={nodes[i].x + 94} y1="75" x2={nodes[i + 1].x} y2="75" />)}
      {/* compensation branch */}
      <path className="fd-edge fd-comp" d="M293 98 C293 130 200 135 176 128" />
      <g className="fd-node fd-node-comp"><rect x="96" y="112" width="86" height="34" rx="11" /><text x="139" y="133" textAnchor="middle">Rollback</text></g>
      {/* nodes */}
      {nodes.map((n, i) => (
        <g key={n.label} className="fd-node" style={{ animationDelay: `${i * 0.9}s` }}>
          <rect x={n.x} y={n.y} width="94" height="46" rx="13" />
          <circle cx={n.x + 17} cy={n.y + 23} r="5" fill={n.c} />
          <text x={n.x + 30} y={n.y + 27}>{n.label}</text>
        </g>
      ))}
      {/* travelling pulse */}
      <circle r="6" fill="#f0a23a" filter="url(#glow)">
        <animateMotion dur="3.6s" repeatCount="indefinite" path="M60 75 L176 75 L292 75 L408 75" />
      </circle>
    </svg>
  );
}
