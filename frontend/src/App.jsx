import Editor from "@monaco-editor/react";
import { Play, Pause, SkipForward, RotateCcw, Zap, Layers, GitBranch, GitMerge } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_CODE = `import java.util.*;
public class Main {
    public static void reverseStack(Stack<Integer> st) {
        if(st.isEmpty()) {
            return;
        }
        int top = st.pop();
        reverseStack(st);
        rev(st, top);
    }
    public static void rev(Stack<Integer> st, int val) {
        if(st.isEmpty()) {
            st.push(val);
            return;
        }
        int top = st.pop();
        rev(st, val);
        st.push(top);
    }
    public static void main(String[] args) {
        Stack<Integer> st = new Stack<>();
        st.push(4);
        st.push(1);
        st.push(3);
        st.push(2);
        reverseStack(st);
    }
}`;

function getExplanation(event) {
  if (!event) return "Press Run, then Step or Play to watch execution unfold.";
  const { action, value, condition, result, callee, changed_var } = event;
  switch (action) {
    case "push":       return `Pushing ${value} onto the stack → becomes the new TOP.`;
    case "pop":        return value !== null && value !== undefined ? `Popping ${value} from the stack.${changed_var ? ` Stored in local "${changed_var}".` : ""}` : "Pop called — stack was empty.";
    case "call":       return `Calling "${callee}" — a new frame is pushed onto the call stack. Execution jumps into this method.`;
    case "return":
    case "return_void": return `Returning from "${callee || "method"}". Frame is popped; caller resumes.`;
    case "return_val": return `Returning ${value}. Frame removed, caller resumes.`;
    case "condition":  return `Condition "${condition || value}" → ${result ? "TRUE ✓ entering block." : "FALSE ✗ skipping block."}`;
    case "assign":     return `Local variable: ${value}.`;
    case "init":       return `Stack "${value}" created and ready to use.`;
    default:           return `Executing: ${action}${value !== null && value !== undefined ? " → " + value : ""}`;
  }
}

function actionColor(action) {
  if (!action) return "#334155";
  const a = action.toLowerCase();
  if (a === "push")           return "#10b981";
  if (a === "pop")            return "#ef4444";
  if (a === "call")           return "#3b82f6";
  if (a.startsWith("return")) return "#8b5cf6";
  if (a === "condition")      return "#f59e0b";
  if (a === "assign")         return "#06b6d4";
  if (a === "init")           return "#22c55e";
  return "#475569";
}

// ── Stack Block ──────────────────────────────────────────────
function StackBlock({ value, isTop, index }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -36, scale: 0.6 }}
      animate={{ opacity: 1, y: 0, scale: isTop ? 1.05 : 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.3 }}
      transition={{ type: "spring", stiffness: 240, damping: 24 }}
      style={{
        width: 170, height: 54, marginTop: 3, borderRadius: 10,
        border: isTop ? "2px solid #67e8f9" : "2px solid #1e293b",
        background: isTop ? "linear-gradient(135deg,#0891b2,#1d4ed8)" : "rgb(10,18,36)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, fontWeight: 900, fontFamily: "JetBrains Mono, monospace",
        position: "relative", color: "white", flexShrink: 0,
        boxShadow: isTop ? "0 0 18px rgba(6,182,212,0.35),0 6px 14px rgba(0,0,0,0.5)" : "0 4px 10px rgba(0,0,0,0.4)",
      }}
    >
      {value}
      {isTop && <div style={{ position: "absolute", right: -48, fontSize: 9, color: "#22d3ee", fontWeight: 900, whiteSpace: "nowrap" }}>TOP →</div>}
      <div style={{ position: "absolute", left: -22, fontSize: 9, color: "#334155", fontFamily: "JetBrains Mono, monospace" }}>[{index}]</div>
    </motion.div>
  );
}

// ── Frame Card ───────────────────────────────────────────────
const FRAME_HUES = [210, 155, 38, 275, 0, 180, 315];

function FrameCard({ frame, isActive }) {
  const hue    = FRAME_HUES[(frame.depth || 0) % FRAME_HUES.length];
  const locals = Object.entries(frame.locals || {}).filter(([k]) => !k.startsWith("__"));
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{
        borderRadius: 10,
        border: isActive ? `2px solid hsl(${hue},78%,54%)` : "1px solid rgb(18,28,46)",
        background: isActive ? `hsla(${hue},55%,13%,0.7)` : "rgb(6,10,22)",
        overflow: "hidden", flexShrink: 0,
      }}
    >
      <div style={{
        padding: "5px 11px", borderBottom: `1px solid hsl(${hue},40%,${isActive ? 26 : 11}%)`,
        display: "flex", alignItems: "center", gap: 8,
        background: isActive ? `hsla(${hue},46%,17%,0.5)` : "transparent",
      }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: isActive ? `hsl(${hue},78%,54%)` : "#1e3a5f", flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 800, color: isActive ? `hsl(${hue},78%,70%)` : "#334155", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.04em" }}>
          {frame.method}
          {isActive && frame.line && <span style={{ color: "#475569", fontWeight: 400, marginLeft: 6, fontSize: 10 }}>: line {frame.line}</span>}
        </span>
        {isActive && <span style={{ marginLeft: "auto", fontSize: 8, fontWeight: 800, letterSpacing: "0.14em", color: `hsl(${hue},68%,54%)`, textTransform: "uppercase" }}>ACTIVE</span>}
      </div>
      <div style={{ padding: "7px 11px", display: "flex", flexDirection: "column", gap: 4 }}>
        {locals.length === 0
          ? <div style={{ color: "#1e3a5f", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}>— no locals —</div>
          : locals.map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: "#64748b" }}>{k}</span>
              <span style={{ fontSize: 12, fontFamily: "JetBrains Mono, monospace", fontWeight: 700, color: v === "__DS__" ? "#f59e0b" : `hsl(${hue},66%,64%)`, padding: "1px 7px", borderRadius: 4, background: "rgba(255,255,255,0.04)", minWidth: 24, textAlign: "right" }}>
                {v === "__DS__" ? "Stack[]" : String(v)}
              </span>
            </div>
          ))
        }
        {frame.return_value !== null && frame.return_value !== undefined && (
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: 3, paddingTop: 4 }}>
            <span style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", color: "#475569" }}>return</span>
            <span style={{ fontSize: 12, fontFamily: "JetBrains Mono, monospace", fontWeight: 700, color: "#22d3ee" }}>{String(frame.return_value)}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Recursion Tree Node ──────────────────────────────────────
const METHOD_HUES = { reverseStack: 210, rev: 155, main: 38 };

function TreeNodeView({ node, activeIds }) {
  if (!node) return null;
  const isActive = activeIds.has(node.id);
  const hue      = METHOD_HUES[node.method] ?? 275;
  const argStr   = Object.entries(node.args || {}).map(([k, v]) => `${k}=${v}`).join(", ");

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{
          opacity: 1, scale: isActive ? 1.1 : 1,
          boxShadow: isActive ? `0 0 14px hsla(${hue},80%,60%,0.5)` : "none",
        }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        style={{
          padding: "4px 9px", borderRadius: 7, textAlign: "center",
          border: isActive ? `2px solid hsl(${hue},78%,56%)` : node.done ? `1px solid hsl(${hue},40%,28%)` : "1px solid rgb(20,30,50)",
          background: isActive ? `hsla(${hue},55%,14%,0.9)` : node.done ? `hsla(${hue},30%,10%,0.6)` : "rgb(6,10,22)",
          minWidth: 80,
        }}
      >
        <div style={{ fontSize: 9, fontWeight: 800, color: isActive ? `hsl(${hue},78%,68%)` : node.done ? `hsl(${hue},50%,48%)` : "#334155", fontFamily: "JetBrains Mono, monospace", whiteSpace: "nowrap" }}>
          {node.method}
        </div>
        {argStr && (
          <div style={{ fontSize: 8, color: "#475569", fontFamily: "JetBrains Mono, monospace", marginTop: 1 }}>({argStr})</div>
        )}
        {node.done && (
          <div style={{ fontSize: 8, color: "#22d3ee", fontFamily: "JetBrains Mono, monospace", marginTop: 2, fontWeight: 700 }}>
            ✓ {node.returned !== null && node.returned !== undefined ? `→${node.returned}` : "void"}
          </div>
        )}
      </motion.div>

      {node.children && node.children.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: 1, height: 10, background: "#1e3a5f" }} />
          <div style={{ display: "flex", gap: 4, alignItems: "flex-start" }}>
            {node.children.map((child) => (
              <div key={child.id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 1, height: 8, background: "#1e3a5f" }} />
                <TreeNodeView node={child} activeIds={activeIds} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── collect active tree node ids from call frames ────────────
function collectActiveIds(tree, frameMethodNames) {
  const ids = new Set();
  if (!tree) return ids;
  function walk(node, depth) {
    if (!node) return;
    // A node is active if it's in the current call stack
    // We match by checking if any live frame matches this node
    // The simplest heuristic: mark the node active if it's not done yet
    if (!node.done) ids.add(node.id);
    node.children?.forEach(c => walk(c, depth + 1));
  }
  walk(tree, 0);
  return ids;
}

// ─────────────────────────────────────────────────────────────
//  MAIN APP
// ─────────────────────────────────────────────────────────────

export default function App() {
  const [code, setCode]           = useState(DEFAULT_CODE);
  const [events, setEvents]       = useState([]);
  const [stack, setStack]         = useState([]);
  const [frames, setFrames]       = useState([]);
  const [tree, setTree]           = useState(null);
  const [currentLine, setCurrentLine]     = useState(null);
  const [prevLine, setPrevLine]           = useState(null);
  const [currentAction, setCurrentAction] = useState("Waiting...");
  const [currentEvent, setCurrentEvent]   = useState(null);
  const [currentStep, setCurrentStep]     = useState(0);
  const [isPlaying, setIsPlaying]         = useState(false);
  const [loading, setLoading]             = useState(false);
  const [speed, setSpeed]                 = useState(700);
  const [error, setError]                 = useState(null);
  const [rightTab, setRightTab]           = useState("frames");

  const editorRef  = useRef(null);
  const monacoRef  = useRef(null);
  const prevDecRef = useRef([]);
  const currDecRef = useRef([]);

  const activeIds = collectActiveIds(tree, frames.map(f => f.method));

  // decorations
  const applyDecs = useCallback((prev, curr) => {
    const ed = editorRef.current, mon = monacoRef.current;
    if (!ed || !mon) return;
    prevDecRef.current = ed.deltaDecorations(prevDecRef.current,
      prev ? [{ range: new mon.Range(prev, 1, prev, 1), options: { isWholeLine: true, className: "line-prev" } }] : []);
    currDecRef.current = ed.deltaDecorations(currDecRef.current,
      curr ? [{ range: new mon.Range(curr, 1, curr, 1), options: { isWholeLine: true, className: "line-curr", glyphMarginClassName: "glyph-curr" } }] : []);
  }, []);

  const clearDecs = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    prevDecRef.current = ed.deltaDecorations(prevDecRef.current, []);
    currDecRef.current = ed.deltaDecorations(currDecRef.current, []);
  }, []);

  // run
  const runCode = async () => {
    try {
      setLoading(true); setError(null);
      const res = await axios.post("http://127.0.0.1:8000/execute", { code });
      if (!res.data.success) { setError(res.data.error || "Backend error"); return; }
      const evs = res.data.events || [];
      setEvents(evs); setCurrentStep(0);
      setStack([]); setFrames([]); setTree(null);
      setCurrentLine(null); setPrevLine(null);
      setCurrentAction(`Ready — ${evs.length} steps. Press Play or Step ▶`);
      setCurrentEvent(null); setIsPlaying(false); clearDecs();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Cannot reach backend at http://127.0.0.1:8000 — is it running?");
    } finally { setLoading(false); }
  };

  // apply event
  const applyEvent = useCallback((evt, prevEvt) => {
    setStack(evt.stack ?? []);
    setFrames(evt.frames ?? []);
    setTree(evt.tree ?? null);
    const nl = evt.line || null, ol = prevEvt?.line || null;
    setPrevLine(ol); setCurrentLine(nl); applyDecs(ol, nl);
    setCurrentEvent(evt);
    const a = evt.action?.toUpperCase() || "?";
    const v = evt.value !== null && evt.value !== undefined ? "  " + evt.value : "";
    setCurrentAction(a + v);
  }, [applyDecs]);

  // step
  const nextStep = useCallback(() => {
    if (currentStep >= events.length) return;
    applyEvent(events[currentStep], events[currentStep - 1] || null);
    setCurrentStep(p => p + 1);
  }, [currentStep, events, applyEvent]);

  // autoplay
  useEffect(() => {
    if (!isPlaying) return;
    if (currentStep >= events.length) { setIsPlaying(false); return; }
    const t = setTimeout(nextStep, speed);
    return () => clearTimeout(t);
  }, [isPlaying, currentStep, events.length, speed, nextStep]);

  // reset
  const resetExecution = () => {
    setStack([]); setFrames([]); setTree(null);
    setCurrentStep(0); setCurrentLine(null); setPrevLine(null);
    setCurrentAction("Waiting..."); setCurrentEvent(null);
    setIsPlaying(false); clearDecs();
  };

  const progress = events.length > 0 ? (currentStep / events.length) * 100 : 0;
  const isDone   = events.length > 0 && currentStep >= events.length;
  const acColor  = actionColor(currentEvent?.action);

  const TABS = [
    { id: "frames", label: "Call Frames",    icon: <GitBranch size={10} /> },
    { id: "stack",  label: "Data Stack",     icon: <Layers size={10} /> },
    { id: "tree",   label: "Recursion Tree", icon: <GitMerge size={10} /> },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#020817", color: "#f1f5f9" }}>
      <div style={{ position: "fixed", top: -300, left: -300, width: 700, height: 700, pointerEvents: "none", zIndex: 0, background: "radial-gradient(circle,rgba(6,182,212,0.04) 0%,transparent 70%)" }} />

      <div style={{ position: "relative", zIndex: 1, padding: "18px 22px", display: "flex", flexDirection: "column", minHeight: "100vh" }}>

        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 38, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1, background: "linear-gradient(135deg,#f1f5f9 30%,#22d3ee 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", margin: 0 }}>Recurscope</h1>
            <p style={{ color: "#334155", fontSize: 9, marginTop: 4, letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: "JetBrains Mono, monospace" }}>Runtime Stack Visualizer</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#334155", fontSize: 9, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>Step</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#22d3ee", fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>
              {currentStep}<span style={{ color: "#334155", fontSize: 13 }}> / {events.length}</span>
            </div>
          </div>
        </div>

        {/* GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 410px", gap: 14, flex: 1 }}>

          {/* ═ LEFT ═ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>

            {/* legend */}
            <div style={{ display: "flex", gap: 16, padding: "0 2px" }}>
              {[["#22c55e","#4ade80","line just executed"],["#f87171","#f87171","next line to execute"]].map(([bg,col,lbl]) => (
                <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 12, height: 3, background: bg, borderRadius: 2 }} />
                  <span style={{ fontSize: 9, color: col, fontFamily: "JetBrains Mono, monospace" }}>{lbl}</span>
                </div>
              ))}
            </div>

            {/* editor */}
            <div style={{ borderRadius: 13, overflow: "hidden", border: "1px solid rgb(14,22,42)" }}>
              <div style={{ background: "rgb(5,9,20)", padding: "7px 13px", display: "flex", alignItems: "center", gap: 7, borderBottom: "1px solid rgb(10,16,32)" }}>
                {["#ef4444","#f59e0b","#22c55e"].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />)}
                <span style={{ color: "#334155", fontSize: 10, fontFamily: "JetBrains Mono, monospace", marginLeft: 8 }}>Main.java</span>
              </div>
              <Editor
                height="430px"
                defaultLanguage="java"
                theme="vs-dark"
                value={code}
                onChange={v => setCode(v || "")}
                onMount={(editor, monaco) => { editorRef.current = editor; monacoRef.current = monaco; }}
                options={{ fontSize: 13, fontFamily: "JetBrains Mono, monospace", minimap: { enabled: false }, scrollBeyondLastLine: false, lineNumbers: "on", renderLineHighlight: "none", glyphMargin: true, padding: { top: 12, bottom: 12 } }}
              />
            </div>

            {/* progress */}
            <div style={{ height: 3, background: "rgb(14,20,38)", borderRadius: 99, overflow: "hidden" }}>
              <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.2 }} style={{ height: "100%", background: "linear-gradient(90deg,#22d3ee,#3b82f6)", borderRadius: 99 }} />
            </div>

            {/* controls */}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
              {[
                { label: loading ? "Running…" : "Run",  icon: <Zap size={13}/>,         color: "#1d4ed8", onClick: runCode,                   disabled: loading },
                { label: "Play",  icon: <Play size={13}/>,        color: "#059669", onClick: () => setIsPlaying(true),  disabled: isPlaying || !events.length || isDone },
                { label: "Pause", icon: <Pause size={13}/>,       color: "#b45309", onClick: () => setIsPlaying(false), disabled: !isPlaying },
                { label: "Step",  icon: <SkipForward size={13}/>, color: "#7c3aed", onClick: nextStep,                  disabled: !events.length || isDone },
                { label: "Reset", icon: <RotateCcw size={13}/>,   color: "#374151", onClick: resetExecution,            disabled: false },
              ].map(btn => (
                <button key={btn.label} onClick={btn.onClick} disabled={btn.disabled}
                  style={{ padding: "8px 14px", borderRadius: 9, display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 12, cursor: btn.disabled ? "not-allowed" : "pointer", border: "none", color: "white", background: btn.color, opacity: btn.disabled ? 0.38 : 1, transition: "filter 0.15s", fontFamily: "inherit" }}
                  onMouseEnter={e => !btn.disabled && (e.currentTarget.style.filter = "brightness(1.15)")}
                  onMouseLeave={e => (e.currentTarget.style.filter = "brightness(1)")}
                >
                  {btn.icon}{btn.label}
                </button>
              ))}
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ color: "#334155", fontSize: 9, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>Speed</span>
                <input type="range" min="80" max="2000" step="40" value={speed} onChange={e => setSpeed(Number(e.target.value))} style={{ width: 85, accentColor: "#22d3ee" }} />
                <span style={{ color: "#22d3ee", fontSize: 9, fontFamily: "JetBrains Mono, monospace", minWidth: 28 }}>{(speed/1000).toFixed(1)}s</span>
              </div>
            </div>

            {/* error */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 9, padding: "9px 13px", color: "#fca5a5", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>
                  ⚠ {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI explanation */}
            <AnimatePresence mode="wait">
              <motion.div key={currentAction} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.08),rgba(59,130,246,0.06))", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 11, padding: "10px 14px", fontSize: 12, lineHeight: 1.7, color: "#c4b5fd" }}>
                <span style={{ fontSize: 9, color: "rgba(139,92,246,0.5)", fontWeight: 800, letterSpacing: "0.12em", marginRight: 8 }}>✦ AI</span>
                {getExplanation(currentEvent)}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ═ RIGHT PANEL ═ */}
          <div style={{ background: "rgba(5,9,20,0.96)", border: "1px solid rgb(14,22,42)", borderRadius: 13, display: "flex", flexDirection: "column", overflow: "hidden", maxHeight: "calc(100vh - 74px)" }}>

            {/* panel header */}
            <div style={{ padding: "12px 14px", borderBottom: "1px solid rgb(10,16,30)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
                <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: "-0.02em" }}>Runtime View</span>
                {isPlaying && (
                  <motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1.1 }}
                    style={{ fontSize: 9, color: "#22d3ee", fontWeight: 800, letterSpacing: "0.14em" }}>● LIVE</motion.span>
                )}
              </div>
              {/* tabs */}
              <div style={{ display: "flex", gap: 4 }}>
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setRightTab(t.id)}
                    style={{ padding: "4px 10px", borderRadius: 7, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, cursor: "pointer", border: "none", background: rightTab === t.id ? "rgba(34,211,238,0.12)" : "transparent", color: rightTab === t.id ? "#22d3ee" : "#475569", outline: rightTab === t.id ? "1px solid rgba(34,211,238,0.22)" : "none", fontFamily: "inherit" }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* action badge */}
            <div style={{ padding: "9px 14px", flexShrink: 0 }}>
              <AnimatePresence mode="wait">
                <motion.div key={currentAction} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  style={{ background: `${acColor}18`, border: `1px solid ${acColor}55`, borderRadius: 9, padding: "8px 13px", textAlign: "center", fontWeight: 900, fontSize: 13, letterSpacing: "0.07em", color: acColor, fontFamily: "JetBrains Mono, monospace" }}>
                  {currentAction}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* line indicator */}
            <div style={{ padding: "0 14px 9px", flexShrink: 0, display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ color: "#334155", fontSize: 9, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>Line</span>
              <AnimatePresence mode="wait">
                <motion.span key={currentLine} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
                  style={{ fontSize: 22, fontWeight: 900, color: "#22d3ee", fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>
                  {currentLine || "—"}
                </motion.span>
              </AnimatePresence>
              {prevLine && prevLine !== currentLine && (
                <span style={{ fontSize: 9, color: "#334155", fontFamily: "JetBrains Mono, monospace" }}>← was {prevLine}</span>
              )}
            </div>

            {/* depth badge */}
            {frames.length > 0 && (
              <div style={{ padding: "0 14px 9px", flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                  <span style={{ fontSize: 9, color: "#334155", fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>Depth</span>
                  <div style={{ display: "flex", gap: 2 }}>
                    {frames.map((_, idx) => (
                      <div key={idx} style={{ width: 8, height: 8, borderRadius: 2, background: `hsl(${FRAME_HUES[idx % FRAME_HUES.length]},70%,50%)`, opacity: idx === frames.length - 1 ? 1 : 0.4 }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 10, color: "#22d3ee", fontFamily: "JetBrains Mono, monospace", fontWeight: 700 }}>{frames.length}</span>
                </div>
              </div>
            )}

            {/* tab content */}
            <div style={{ flex: 1, overflow: "hidden", padding: "0 12px 12px" }}>

              {/* CALL FRAMES */}
              {rightTab === "frames" && (
                <div style={{ height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", gap: 5, paddingRight: 2 }}>
                  {frames.length === 0
                    ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "180px", color: "#1e293b", gap: 8 }}>
                        <GitBranch size={24} style={{ opacity: 0.3 }} />
                        <span style={{ fontSize: 11, fontWeight: 600 }}>No active frames</span>
                        <span style={{ fontSize: 9, color: "#0f172a" }}>Press Run then Step/Play</span>
                      </div>
                    : <AnimatePresence>
                        {[...frames].reverse().map((frame, revIdx) => {
                          const origIdx = frames.length - 1 - revIdx;
                          return <FrameCard key={`${frame.method}-${origIdx}`} frame={{ ...frame, depth: origIdx }} isActive={frame.active} />;
                        })}
                      </AnimatePresence>
                  }
                </div>
              )}

              {/* DATA STACK */}
              {rightTab === "stack" && (
                <div style={{ height: "100%", background: "rgb(2,5,14)", borderRadius: 11, border: "1px solid rgb(10,16,30)", position: "relative", overflow: "hidden" }}>
                  {stack.length === 0 && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#1e293b", gap: 8 }}>
                      <Layers size={24} style={{ opacity: 0.3 }} />
                      <span style={{ fontSize: 11, fontWeight: 600 }}>Empty Stack</span>
                    </div>
                  )}
                  <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", width: 155, height: 2, background: "rgb(20,30,52)", borderRadius: 99 }} />
                  <div style={{ position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)", fontSize: 8, color: "#1e3a5f", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.1em" }}>BOTTOM</div>
                  <div style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column-reverse", alignItems: "center" }}>
                    <AnimatePresence>
                      {stack.map((val, idx) => <StackBlock key={`${idx}-${val}`} value={val} isTop={idx === stack.length - 1} index={idx} />)}
                    </AnimatePresence>
                  </div>
                  {stack.length > 0 && <div style={{ position: "absolute", top: 10, right: 11, fontSize: 9, color: "#334155", fontFamily: "JetBrains Mono, monospace" }}>size: {stack.length}</div>}
                </div>
              )}

              {/* RECURSION TREE */}
              {rightTab === "tree" && (
                <div style={{ height: "100%", background: "rgb(2,5,14)", borderRadius: 11, border: "1px solid rgb(10,16,30)", overflow: "auto", padding: "16px 12px" }}>
                  {!tree
                    ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "180px", color: "#1e293b", gap: 8 }}>
                        <GitMerge size={24} style={{ opacity: 0.3 }} />
                        <span style={{ fontSize: 11, fontWeight: 600 }}>Tree builds as you step</span>
                      </div>
                    : <div style={{ display: "flex", justifyContent: "center", minWidth: "fit-content" }}>
                        <TreeNodeView node={tree} activeIds={activeIds} />
                      </div>
                  }
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}