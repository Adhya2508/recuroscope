import Editor from "@monaco-editor/react";
import {
  Play, Pause, SkipForward, RotateCcw, Zap,
  Layers, GitBranch, GitMerge, Database, FlaskConical,
  Sun, Moon
} from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────────────
//  THEME HOOK
// ─────────────────────────────────────────────────────────────
function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem("rs-theme") || "dark");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("rs-theme", theme);
  }, [theme]);
  return [theme, () => setTheme(t => t === "dark" ? "light" : "dark")];
}

// ─────────────────────────────────────────────────────────────
//  CSS-VAR HELPER  — read a CSS variable at runtime
// ─────────────────────────────────────────────────────────────
function v(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// ─────────────────────────────────────────────────────────────
//  EXAMPLES  — 8 correct stack recursion problems
// ─────────────────────────────────────────────────────────────
const EXAMPLES = {
  "Reverse Stack": {
    tag: "Classic",
    desc: "Reverse a stack in-place using recursion — no extra data structure allowed.",
    code: `import java.util.*;
public class Main {
    public static void insertAtBottom(Stack<Integer> st, int val) {
        if(st.isEmpty()) {
            st.push(val);
            return;
        }
        int top = st.pop();
        insertAtBottom(st, val);
        st.push(top);
    }
    public static void reverseStack(Stack<Integer> st) {
        if(st.isEmpty()) {
            return;
        }
        int top = st.pop();
        reverseStack(st);
        insertAtBottom(st, top);
    }
    public static void main(String[] args) {
        Stack<Integer> st = new Stack<>();
        st.push(3);
        st.push(2);
        st.push(1);
        reverseStack(st);
    }
}`,
  },

  "Sort Stack": {
    tag: "Classic",
    desc: "Sort a stack in ascending order using recursion — smallest at bottom, largest at top.",
    code: `import java.util.*;
public class Main {
    public static void insertSorted(Stack<Integer> st, int val) {
        if(st.isEmpty()) {
            st.push(val);
            return;
        }
        if(st.peek() <= val) {
            st.push(val);
            return;
        }
        int top = st.pop();
        insertSorted(st, val);
        st.push(top);
    }
    public static void sortStack(Stack<Integer> st) {
        if(st.isEmpty()) {
            return;
        }
        int top = st.pop();
        sortStack(st);
        insertSorted(st, top);
    }
    public static void main(String[] args) {
        Stack<Integer> st = new Stack<>();
        st.push(3);
        st.push(1);
        st.push(4);
        st.push(2);
        sortStack(st);
    }
}`,
  },

  "Insert at Bottom": {
    tag: "Classic",
    desc: "Insert a given value at the bottom of a stack without using any other data structure.",
    code: `import java.util.*;
public class Main {
    public static void insertAtBottom(Stack<Integer> st, int val) {
        if(st.isEmpty()) {
            st.push(val);
            return;
        }
        int top = st.pop();
        insertAtBottom(st, val);
        st.push(top);
    }
    public static void main(String[] args) {
        Stack<Integer> st = new Stack<>();
        st.push(4);
        st.push(3);
        st.push(2);
        insertAtBottom(st, 1);
    }
}`,
  },

  "Delete Middle": {
    tag: "Medium",
    desc: "Delete the middle element of a stack using recursion. Middle = floor(n/2) index from bottom (0-indexed).",
    code: `import java.util.*;
public class Main {
    public static void deleteMiddle(Stack<Integer> st, int k, int n) {
        if(k == n / 2) {
            st.pop();
            return;
        }
        int top = st.pop();
        deleteMiddle(st, k + 1, n);
        st.push(top);
    }
    public static void main(String[] args) {
        Stack<Integer> st = new Stack<>();
        st.push(1);
        st.push(2);
        st.push(3);
        st.push(4);
        st.push(5);
        int n = 5;
        deleteMiddle(st, 0, n);
    }
}`,
  },

  "Sum of Stack": {
    tag: "Easy",
    desc: "Recursively find the sum of all elements, then fully restore the stack.",
    code: `import java.util.*;
public class Main {
    public static int sumStack(Stack<Integer> st) {
        if(st.isEmpty()) {
            return 0;
        }
        int top = st.pop();
        int rest = sumStack(st);
        st.push(top);
        return top + rest;
    }
    public static void main(String[] args) {
        Stack<Integer> st = new Stack<>();
        st.push(1);
        st.push(2);
        st.push(3);
        st.push(4);
        int result = sumStack(st);
    }
}`,
  },

  "Count Elements": {
    tag: "Easy",
    desc: "Count elements in a stack recursively, restoring every element after counting.",
    code: `import java.util.*;
public class Main {
    public static int countStack(Stack<Integer> st) {
        if(st.isEmpty()) {
            return 0;
        }
        int top = st.pop();
        int count = countStack(st);
        st.push(top);
        return count + 1;
    }
    public static void main(String[] args) {
        Stack<Integer> st = new Stack<>();
        st.push(10);
        st.push(20);
        st.push(30);
        st.push(40);
        int result = countStack(st);
    }
}`,
  },

  "Duplicate Stack": {
    tag: "Easy",
    desc: "Duplicate every element of a stack recursively — each element appears twice.",
    code: `import java.util.*;
public class Main {
    public static void duplicateStack(Stack<Integer> st) {
        if(st.isEmpty()) {
            return;
        }
        int top = st.pop();
        duplicateStack(st);
        st.push(top);
        st.push(top);
    }
    public static void main(String[] args) {
        Stack<Integer> st = new Stack<>();
        st.push(1);
        st.push(2);
        st.push(3);
        duplicateStack(st);
    }
}`,
  },

  "Find Minimum": {
    tag: "Medium",
    desc: "Find the minimum element in a stack recursively, restoring the stack afterwards.",
    code: `import java.util.*;
public class Main {
    public static int findMin(Stack<Integer> st) {
        if(st.size() == 1) {
            return st.peek();
        }
        int top = st.pop();
        int minBelow = findMin(st);
        st.push(top);
        if(top < minBelow) {
            return top;
        }
        return minBelow;
    }
    public static void main(String[] args) {
        Stack<Integer> st = new Stack<>();
        st.push(5);
        st.push(2);
        st.push(8);
        st.push(1);
        st.push(4);
        int result = findMin(st);
    }
}`,
  },
};

const TRY_TEMPLATE = `import java.util.*;
public class Main {
    // ✏ Write any recursive function here.
    // Supports: if/else, for/while, return values,
    //           Stack push/pop/peek/isEmpty, int[] arrays,
    //           var++ var-- += -= Math.max Math.min
    public static int factorial(int n) {
        if(n <= 1) {
            return 1;
        }
        int prev = factorial(n - 1);
        return n * prev;
    }
    public static void main(String[] args) {
        int result = factorial(5);
    }
}`;

// ─────────────────────────────────────────────────────────────
//  EXPLANATION
// ─────────────────────────────────────────────────────────────
function getExplanation(ev) {
  if (!ev) return "Press ▶ Run, then use Step or Play to walk through execution.";
  const { action, callee, changed_var, return_value, from_call, condition, result, value, arr_idx, arr_val } = ev;
  switch (action) {
    case "call":
      return `📞 Calling "${callee}"${ev.call_args && Object.keys(ev.call_args).length ? " with " + Object.entries(ev.call_args).map(([k,v])=>`${k} = ${v}`).join(", ") : ""}. New frame pushed onto call stack.`;
    case "return":
      return `↩ "${callee}" finished. Return value: ${return_value !== null && return_value !== undefined ? return_value : "void"}. Frame popped — caller resumes.`;
    case "return_val":
      return `↩ Returning ${value} from "${callee}". This value flows back up to whoever called it.`;
    case "return_void":
      return `↩ Returning (void) from "${callee}". Base case or early exit reached.`;
    case "push":
      return `📥 Pushing ${value} onto the stack — it becomes the new TOP.`;
    case "pop":
      return value !== null && value !== undefined
        ? `📤 Popping ${value} from the stack.${changed_var ? ` Stored in "${changed_var}".` : ""}`
        : "📤 Pop called — stack was empty.";
    case "condition":
      return `🔀 if (${condition || value}) → ${result ? "✅ TRUE — entering block." : "❌ FALSE — skipping block."}`;
    case "loop_cond":
      return `🔁 Loop check: (${condition || value}) → ${result ? "✅ TRUE — body runs." : "🔴 FALSE — loop exits."}`;
    case "assign":
      return from_call
        ? `📬 Return value from "${from_call}" captured → ${value}`
        : `📝 Variable updated: ${value}`;
    case "init":
      return `🗂 Stack "${value}" created and ready (empty).`;
    case "heap_alloc":
      return `🗃 Array allocated on the heap: ${value}`;
    case "arr_write":
      return `✏️ arr[${arr_idx}] ← ${arr_val} written into heap memory.`;
    default:
      return `⚙ ${action}${value !== null && value !== undefined ? " → " + value : ""}`;
  }
}

function actionColor(action) {
  const map = {
    push: "#10b981", pop: "#ef4444",
    call: "#3b82f6",
    return: "#a78bfa", return_val: "#a78bfa", return_void: "#a78bfa",
    condition: "#f59e0b", loop_cond: "#f97316",
    assign: "#22d3ee", init: "#22c55e",
    heap_alloc: "#a855f7", arr_write: "#ec4899",
  };
  return map[action] || "#64748b";
}

const TAG_STYLE = {
  Classic: { bg: "rgba(59,130,246,0.14)", border: "#1d4ed8", color: "#93c5fd" },
  Medium:  { bg: "rgba(245,158,11,0.14)", border: "#b45309", color: "#fcd34d" },
  Easy:    { bg: "rgba(16,185,129,0.12)", border: "#065f46", color: "#6ee7b7" },
};

const FRAME_HUES = [210, 155, 38, 275, 14, 180, 330, 60];

const EV_COLORS = {
  push:"#10b981", pop:"#ef4444", call:"#3b82f6",
  return:"#a78bfa", return_val:"#a78bfa", return_void:"#a78bfa",
  condition:"#f59e0b", loop_cond:"#f97316",
  assign:"#22d3ee", init:"#22c55e",
  heap_alloc:"#a855f7", arr_write:"#ec4899",
};

// ─────────────────────────────────────────────────────────────
//  STACK BLOCK
// ─────────────────────────────────────────────────────────────
function StackBlock({ value, isTop, index, theme }) {
  const topBg    = "linear-gradient(135deg, #0891b2, #1d4ed8)";
  const idleBg   = theme === "light" ? "#e2e8f0" : "rgb(8,14,30)";
  const idleBord = theme === "light" ? "#cbd5e1" : "#1e293b";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -30, scale: 0.65 }}
      animate={{ opacity: 1, y: 0, scale: isTop ? 1.05 : 1 }}
      exit={{ opacity: 0, x: 70, scale: 0.3 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      style={{
        width: 148, height: 46, marginTop: 3, borderRadius: 8,
        border: isTop ? "2px solid #67e8f9" : `2px solid ${idleBord}`,
        background: isTop ? topBg : idleBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, fontWeight: 900, fontFamily: "JetBrains Mono, monospace",
        position: "relative", color: isTop ? "#fff" : theme === "light" ? "#1e293b" : "#f1f5f9",
        flexShrink: 0,
        boxShadow: isTop ? "0 0 16px rgba(6,182,212,0.35), 0 4px 12px rgba(0,0,0,0.4)" : "0 2px 6px rgba(0,0,0,0.2)",
      }}
    >
      {value}
      {isTop && (
        <div style={{ position: "absolute", right: -42, fontSize: 8, color: "#22d3ee", fontWeight: 900, whiteSpace: "nowrap" }}>
          TOP →
        </div>
      )}
      <div style={{ position: "absolute", left: -17, fontSize: 8, fontFamily: "JetBrains Mono, monospace", color: theme === "light" ? "#94a3b8" : "#1e3a5f" }}>
        [{index}]
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
//  FRAME CARD
// ─────────────────────────────────────────────────────────────
function FrameCard({ frame, changedVar, theme }) {
  const hue    = FRAME_HUES[(frame.depth || 0) % FRAME_HUES.length];
  const active = frame.active;
  const locals = Object.entries(frame.locals || {}).filter(([k]) => !k.startsWith("__"));

  const inactiveBg     = theme === "light" ? "#f8fafc"       : "rgb(5,9,20)";
  const inactiveBorder = theme === "light" ? "#e2e8f0"       : "rgb(18,28,46)";
  const inactiveLabel  = theme === "light" ? "#94a3b8"       : "#334155";
  const localKeyColor  = theme === "light" ? "#64748b"       : "#475569";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      style={{
        borderRadius: 9, overflow: "hidden", flexShrink: 0,
        border: active ? `2px solid hsl(${hue},72%,52%)` : `1px solid ${inactiveBorder}`,
        background: active ? `hsla(${hue},50%,${theme==="light"?95:12}%,${theme==="light"?0.9:0.75})` : inactiveBg,
      }}
    >
      {/* header */}
      <div style={{
        padding: "5px 10px",
        borderBottom: `1px solid hsl(${hue},38%,${active ? (theme==="light"?82:24) : (theme==="light"?92:10)}%)`,
        display: "flex", alignItems: "center", gap: 7,
        background: active ? `hsla(${hue},44%,${theme==="light"?88:15}%,0.5)` : "transparent",
      }}>
        <motion.div
          animate={{ scale: active ? [1,1.3,1] : 1 }}
          transition={{ repeat: active ? Infinity : 0, duration: 2 }}
          style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
            background: active ? `hsl(${hue},78%,54%)` : (theme==="light" ? "#cbd5e1" : "#1e3a5f") }}
        />
        <span style={{ fontSize: 11, fontWeight: 800, fontFamily: "JetBrains Mono, monospace",
          color: active ? `hsl(${hue},${theme==="light"?70:78}%,${theme==="light"?35:70}%)` : inactiveLabel }}>
          {frame.method}
          {active && frame.line && (
            <span style={{ fontWeight: 400, marginLeft: 5, fontSize: 9, color: theme==="light" ? "#94a3b8" : "#475569" }}>
              ln {frame.line}
            </span>
          )}
        </span>
        {active && (
          <span style={{ marginLeft: "auto", fontSize: 7, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase",
            color: `hsl(${hue},68%,${theme==="light"?40:56}%)` }}>
            ACTIVE
          </span>
        )}
      </div>
      {/* locals */}
      <div style={{ padding: "6px 10px", display: "flex", flexDirection: "column", gap: 3 }}>
        {locals.length === 0
          ? <div style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", color: theme==="light"?"#cbd5e1":"#1e3a5f" }}>— no locals —</div>
          : locals.map(([k, val]) => {
            const isChanged = active && changedVar === k;
            const valColor = val === "__DS__" ? "#f59e0b"
              : typeof val === "string" && val.startsWith("arr") ? (theme==="light"?"#7c3aed":"#c4b5fd")
              : isChanged ? "#22d3ee"
              : `hsl(${hue},${theme==="light"?65:62}%,${theme==="light"?40:62}%)`;
            return (
              <motion.div key={k}
                animate={{ background: isChanged ? ["rgba(34,211,238,0.2)","transparent"] : "transparent" }}
                transition={{ duration: 0.9 }}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, borderRadius: 4, padding: "1px 3px" }}>
                <span style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", color: isChanged ? "#22d3ee" : localKeyColor }}>{k}</span>
                <span style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", fontWeight: 700, color: valColor,
                  padding: "1px 6px", borderRadius: 4, background: theme==="light"?"rgba(0,0,0,0.04)":"rgba(255,255,255,0.04)" }}>
                  {val === "__DS__" ? "Stack[]" : String(val)}
                </span>
              </motion.div>
            );
          })
        }
        {frame.return_value !== null && frame.return_value !== undefined && (
          <div style={{ display: "flex", justifyContent: "space-between",
            borderTop: `1px solid ${theme==="light"?"rgba(0,0,0,0.06)":"rgba(255,255,255,0.06)"}`,
            marginTop: 3, paddingTop: 4 }}>
            <span style={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace", color: theme==="light"?"#94a3b8":"#475569" }}>↩ return</span>
            <span style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", fontWeight: 900, color: "#a78bfa" }}>
              {String(frame.return_value)}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
//  RECURSION TREE
// ─────────────────────────────────────────────────────────────
function methodHue(name) {
  let h = 0;
  for (const c of name) h = (h * 37 + c.charCodeAt(0)) % 360;
  return h;
}

function collectActiveIds(tree) {
  const ids = new Set();
  if (!tree) return ids;
  function walk(n) {
    if (!n) return;
    if (!n.done) ids.add(n.id);
    n.children?.forEach(walk);
  }
  walk(tree);
  return ids;
}

function TreeNodeView({ node, activeIds, theme }) {
  if (!node) return null;
  const isActive = !node.done && activeIds.has(node.id);
  const hue      = methodHue(node.method);

  const argStr = Object.entries(node.args || {})
    .map(([k, val]) => `${k}=${val}`).join(", ");

  const nodeBg = isActive
    ? `hsla(${hue},55%,${theme==="light"?92:15}%,${theme==="light"?0.95:0.95})`
    : node.done
      ? `hsla(${hue},32%,${theme==="light"?94:11}%,${theme==="light"?0.7:0.7})`
      : theme==="light" ? "#ffffff" : "rgb(5,9,20)";

  const nodeBorder = isActive
    ? `2px solid hsl(${hue},78%,${theme==="light"?42:58}%)`
    : node.done
      ? `1px solid hsl(${hue},42%,${theme==="light"?72:30}%)`
      : `1px solid ${theme==="light"?"#e2e8f0":"rgb(20,30,52)"}`;

  const nameColor = isActive
    ? `hsl(${hue},${theme==="light"?70:78}%,${theme==="light"?32:68}%)`
    : node.done
      ? `hsl(${hue},50%,${theme==="light"?38:48}%)`
      : theme==="light" ? "#94a3b8" : "#334155";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <motion.div
        layout
        animate={{
          scale: isActive ? 1.08 : 1,
          boxShadow: isActive ? `0 0 14px hsla(${hue},80%,60%,0.5)` : "none",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        style={{ padding: "5px 10px", borderRadius: 8, textAlign: "center", minWidth: 70, maxWidth: 140,
          border: nodeBorder, background: nodeBg }}
      >
        <div style={{ fontSize: 9, fontWeight: 800, fontFamily: "JetBrains Mono, monospace", whiteSpace: "nowrap", color: nameColor }}>
          {node.method}
        </div>
        {argStr && (
          <div style={{ fontSize: 7.5, fontFamily: "JetBrains Mono, monospace", marginTop: 1,
            color: theme==="light"?"#94a3b8":"#475569",
            maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            ({argStr})
          </div>
        )}
        {/* return value — appears as soon as node.done becomes true */}
        <AnimatePresence>
          {node.done && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ marginTop: 3, fontSize: 8, fontFamily: "JetBrains Mono, monospace", fontWeight: 900,
                color: "#10b981",
                background: theme==="light"?"rgba(16,185,129,0.10)":"rgba(16,185,129,0.12)",
                borderRadius: 4, padding: "1px 5px",
                border: "1px solid rgba(16,185,129,0.25)" }}>
              {node.returned !== null && node.returned !== undefined ? `↩ ${node.returned}` : "↩ void"}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* children */}
      {node.children?.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: 1, height: 12, background: theme==="light"?"#cbd5e1":"#1e3a5f" }} />
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            {node.children.map(child => (
              <div key={child.id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 1, height: 10, background: theme==="light"?"#cbd5e1":"#1e3a5f" }} />
                <TreeNodeView node={child} activeIds={activeIds} theme={theme} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ARRAY VISUALIZER  (heap panel)
// ─────────────────────────────────────────────────────────────
function ArrayViz({ name, data, flashIdx, theme }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace", fontWeight: 800, marginBottom: 5,
        color: theme==="light"?"#7c3aed":"#a78bfa", letterSpacing: "0.06em" }}>
        {name} <span style={{ fontWeight: 400, color: theme==="light"?"#94a3b8":"#374151" }}>int[{data.length}]</span>
      </div>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        {data.map((val, idx) => {
          const isFlash = idx === flashIdx;
          return (
            <motion.div key={idx}
              animate={{
                background: isFlash
                  ? [theme==="light"?"rgba(236,72,153,0.35)":"rgba(236,72,153,0.55)", theme==="light"?"rgba(109,40,217,0.08)":"rgba(124,58,237,0.12)"]
                  : theme==="light"?"rgba(109,40,217,0.08)":"rgba(124,58,237,0.12)",
                borderColor: isFlash ? "#ec4899" : theme==="light"?"#a78bfa":"#3b1d8f",
              }}
              transition={{ duration: 0.7 }}
              style={{ minWidth: 38, height: 38, borderRadius: 6, border: "1px solid", display: "flex",
                flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <span style={{ fontSize: 13, fontWeight: 800, fontFamily: "JetBrains Mono, monospace",
                color: isFlash ? "#ec4899" : theme==="light"?"#6d28d9":"#a78bfa" }}>{val}</span>
              <span style={{ fontSize: 7, fontFamily: "JetBrains Mono, monospace", position: "absolute", bottom: 2,
                color: theme==="light"?"#7c3aed":"#4c1d95" }}>[{idx}]</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  TIMELINE SCRUBBER
// ─────────────────────────────────────────────────────────────
function Timeline({ step, total, events, onSeek, theme }) {
  if (!total) return null;
  const trackBg = theme === "light" ? "#f1f5f9" : "rgb(4,8,18)";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase",
          letterSpacing: "0.1em", color: theme==="light"?"#94a3b8":"#334155" }}>Timeline</span>
        <span style={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace",
          color: theme==="light"?"#0891b2":"#22d3ee" }}>{step} / {total}</span>
      </div>
      <div style={{ position: "relative", height: 18, cursor: "pointer", borderRadius: 4, overflow: "hidden" }}
        onClick={e => {
          const r = e.currentTarget.getBoundingClientRect();
          onSeek(Math.round(((e.clientX - r.left) / r.width) * total));
        }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", background: trackBg }}>
          {events.map((ev, i) => (
            <div key={i} style={{ flex: 1, minWidth: 1, height: "100%",
              background: EV_COLORS[ev.action] || (theme==="light"?"#e2e8f0":"#1e293b"),
              opacity: i < step ? 1 : 0.15 }} />
          ))}
        </div>
        <div style={{ position: "absolute", top: 0, bottom: 0, width: 2,
          background: theme==="light"?"#0f172a":"#ffffff",
          boxShadow: theme==="light"?"0 0 4px rgba(0,0,0,0.4)":"0 0 5px rgba(255,255,255,0.9)",
          left: `${(step/total)*100}%`, transform: "translateX(-50%)", pointerEvents: "none" }} />
      </div>
      {/* legend */}
      <div style={{ display: "flex", gap: "4px 10px", flexWrap: "wrap", marginTop: 5 }}>
        {[["call","#3b82f6"],["return","#a78bfa"],["push","#10b981"],["pop","#ef4444"],["cond","#f59e0b"],["loop","#f97316"],["assign","#22d3ee"]].map(([l,c])=>(
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: c }} />
            <span style={{ fontSize: 7.5, fontFamily: "JetBrains Mono, monospace", color: theme==="light"?"#64748b":"#475569" }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  MAIN APP
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [theme, toggleTheme] = useTheme();
  const dark = theme === "dark";

  const [section, setSection]           = useState("stack");
  const [selectedKey, setSelectedKey]   = useState("Reverse Stack");
  const [code, setCode]                 = useState(EXAMPLES["Reverse Stack"].code);

  const [events, setEvents]             = useState([]);
  const [stack, setStack]               = useState([]);
  const [frames, setFrames]             = useState([]);
  const [tree, setTree]                 = useState(null);
  const [heap, setHeap]                 = useState({});
  const [currentLine, setCurrentLine]   = useState(null);
  const [prevLine, setPrevLine]         = useState(null);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [currentStep, setCurrentStep]   = useState(0);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [loading, setLoading]           = useState(false);
  const [speed, setSpeed]               = useState(600);
  const [error, setError]               = useState(null);
  const [rightTab, setRightTab]         = useState("frames");
  const [flashRef, setFlashRef]         = useState(null);
  const [flashIdx, setFlashIdx]         = useState(null);

  const editorRef  = useRef(null);
  const monacoRef  = useRef(null);
  const prevDecRef = useRef([]);
  const currDecRef = useRef([]);

  const activeIds = collectActiveIds(tree);

  // ── decorations ───────────────────────────────────────────
  const applyDecs = useCallback((prev, curr) => {
    const ed = editorRef.current, mon = monacoRef.current;
    if (!ed || !mon) return;
    prevDecRef.current = ed.deltaDecorations(prevDecRef.current,
      prev ? [{ range: new mon.Range(prev,1,prev,1), options:{ isWholeLine:true, className:"line-prev" } }] : []);
    currDecRef.current = ed.deltaDecorations(currDecRef.current,
      curr ? [{ range: new mon.Range(curr,1,curr,1), options:{ isWholeLine:true, className:"line-curr", glyphMarginClassName:"glyph-curr" } }] : []);
  }, []);

  const clearDecs = useCallback(() => {
    if (editorRef.current) {
      prevDecRef.current = editorRef.current.deltaDecorations(prevDecRef.current, []);
      currDecRef.current = editorRef.current.deltaDecorations(currDecRef.current, []);
    }
  }, []);

  // ── apply one event snapshot ───────────────────────────────
  const applyEvent = useCallback((evt, prevEvt) => {
    setStack(evt.stack ?? []);
    setFrames(evt.frames ?? []);
    setTree(evt.tree ?? null);
    setHeap(evt.heap ?? {});
    const nl = evt.line || null, ol = prevEvt?.line || null;
    setPrevLine(ol); setCurrentLine(nl); applyDecs(ol, nl);
    setCurrentEvent(evt);
    if (evt.action === "arr_write") { setFlashRef(evt.heap_ref); setFlashIdx(evt.arr_idx); }
    else { setFlashRef(null); setFlashIdx(null); }
  }, [applyDecs]);

  // ── reset ─────────────────────────────────────────────────
  const reset = useCallback(() => {
    setStack([]); setFrames([]); setTree(null); setHeap({});
    setCurrentStep(0); setCurrentLine(null); setPrevLine(null);
    setCurrentEvent(null); setIsPlaying(false); clearDecs();
    setFlashRef(null); setFlashIdx(null);
  }, [clearDecs]);

  // ── run ───────────────────────────────────────────────────
  const runCode = async () => {
    try {
      setLoading(true); setError(null); reset();
      const res = await axios.post("https://recuroscope.onrender.com/execute", { code });
      if (!res.data.success) { setError(res.data.error || "Backend error"); return; }
      setEvents(res.data.events || []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Cannot reach backend on port 8000 — is it running?");
    } finally { setLoading(false); }
  };

  // ── step forward ──────────────────────────────────────────
  const nextStep = useCallback(() => {
    if (currentStep >= events.length) return;
    applyEvent(events[currentStep], events[currentStep - 1] || null);
    setCurrentStep(p => p + 1);
  }, [currentStep, events, applyEvent]);

  // ── step back ─────────────────────────────────────────────
  const prevStep = useCallback(() => {
    if (currentStep <= 1) return;
    const t = currentStep - 2;
    applyEvent(events[t], events[t - 1] || null);
    setCurrentStep(t + 1);
  }, [currentStep, events, applyEvent]);

  // ── seek ──────────────────────────────────────────────────
  const seekTo = useCallback((s) => {
    const clamped = Math.max(0, Math.min(s, events.length));
    if (clamped === 0) { reset(); return; }
    applyEvent(events[clamped - 1], events[clamped - 2] || null);
    setCurrentStep(clamped);
  }, [events, applyEvent, reset]);

  // ── autoplay ──────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;
    if (currentStep >= events.length) { setIsPlaying(false); return; }
    const t = setTimeout(nextStep, speed);
    return () => clearTimeout(t);
  }, [isPlaying, currentStep, events.length, speed, nextStep]);

  // ── select example ────────────────────────────────────────
  function selectExample(key) {
    setSelectedKey(key);
    setCode(EXAMPLES[key].code);
    reset(); setEvents([]);
  }

  function switchSection(s) {
    setSection(s);
    reset(); setEvents([]);
    if (s === "stack") { setSelectedKey("Reverse Stack"); setCode(EXAMPLES["Reverse Stack"].code); }
    else               { setSelectedKey(""); setCode(TRY_TEMPLATE); }
  }

  const isDone   = events.length > 0 && currentStep >= events.length;
  const progress = events.length > 0 ? (currentStep / events.length) * 100 : 0;
  const acColor  = actionColor(currentEvent?.action);
  const heapItems = Object.entries(heap);

  // ── theme-aware colours used inline ───────────────────────
  const pageBg         = dark ? "#020817"                : "#f8fafc";
  const panelBg        = dark ? "rgba(4,8,18,0.98)"      : "rgba(255,255,255,0.98)";
  const panelBorder    = dark ? "rgb(12,20,40)"          : "#e2e8f0";
  const innerBorder    = dark ? "rgb(10,16,32)"          : "#e2e8f0";
  const editorHeaderBg = dark ? "rgb(5,9,20)"            : "#f1f5f9";
  const editorBg       = dark ? "rgb(4,8,18)"            : "#fafafa";
  const textPrimary    = dark ? "#f1f5f9"                : "#0f172a";
  const textMuted      = dark ? "#334155"                : "#94a3b8";
  const textSecondary  = dark ? "#64748b"                : "#475569";
  const accentColor    = dark ? "#22d3ee"                : "#0891b2";
  const progressTrack  = dark ? "rgb(12,18,36)"          : "#e2e8f0";
  const sectionTabBg   = dark ? "rgb(5,9,20)"            : "#f1f5f9";
  const infoBg         = dark ? "rgb(5,9,20)"            : "#f1f5f9";
  const infoBorder     = dark ? "rgb(14,22,42)"          : "#e2e8f0";
  const infoText       = dark ? "#64748b"                : "#64748b";
  const tryBg          = dark ? "rgba(16,185,129,0.06)"  : "rgba(16,185,129,0.07)";
  const tryBorder      = dark ? "rgba(16,185,129,0.20)"  : "rgba(16,185,129,0.25)";
  const tryText        = dark ? "#6ee7b7"                : "#065f46";
  const explainBg      = dark ? "linear-gradient(135deg,rgba(99,102,241,0.08),rgba(59,130,246,0.06))"
                              : "linear-gradient(135deg,rgba(99,102,241,0.06),rgba(59,130,246,0.04))";
  const explainBorder  = dark ? "rgba(99,102,241,0.18)"  : "rgba(99,102,241,0.2)";
  const explainText    = dark ? "#a5b4fc"                : "#4338ca";
  const emptyBg        = dark ? "rgb(2,4,12)"            : "#f8fafc";
  const emptyColor     = dark ? "#1e293b"                : "#cbd5e1";
  const timelineBg     = dark ? "rgb(4,8,18)"            : "#f1f5f9";
  const errBg          = dark ? "rgba(239,68,68,0.08)"   : "rgba(220,38,38,0.06)";
  const errBorder      = dark ? "rgba(239,68,68,0.22)"   : "rgba(220,38,38,0.20)";
  const errText        = dark ? "#fca5a5"                : "#b91c1c";

  const monacoTheme    = dark ? "vs-dark" : "light";

  const TABS = [
    { id:"frames", label:"Call Stack",     icon:<GitBranch size={10}/> },
    { id:"stack",  label:"Data Stack",     icon:<Layers size={10}/> },
    { id:"heap",   label:"Heap",           icon:<Database size={10}/> },
    { id:"tree",   label:"Recursion Tree", icon:<GitMerge size={10}/> },
  ];

  return (
    <div style={{ minHeight:"100vh", background: pageBg, color: textPrimary, transition:"background 0.25s, color 0.25s" }}>
      {/* ambient glows — dark only */}
      {dark && <>
        <div style={{ position:"fixed", top:-200, left:-200, width:600, height:600, pointerEvents:"none", zIndex:0, background:"radial-gradient(circle,rgba(6,182,212,0.05) 0%,transparent 70%)" }}/>
        <div style={{ position:"fixed", bottom:-150, right:-150, width:500, height:500, pointerEvents:"none", zIndex:0, background:"radial-gradient(circle,rgba(139,92,246,0.04) 0%,transparent 70%)" }}/>
      </>}

      <div style={{ position:"relative", zIndex:1, padding:"14px 18px", display:"flex", flexDirection:"column", gap:10, minHeight:"100vh" }}>

        {/* ── HEADER ─────────────────────────────────────────── */}
        <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          {/* logo */}
          <div style={{ marginRight:4 }}>
            <h1 style={{ margin:0, fontSize:28, fontWeight:900, letterSpacing:"-0.04em", lineHeight:1,
              background: dark?"linear-gradient(135deg,#f1f5f9 20%,#22d3ee 100%)":"linear-gradient(135deg,#0f172a 20%,#0891b2 100%)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              Recurscope
            </h1>
            <p style={{ margin:"2px 0 0", fontSize:8, color: textMuted, fontFamily:"JetBrains Mono, monospace", textTransform:"uppercase", letterSpacing:"0.18em" }}>
              Java Recursion Visualizer
            </p>
          </div>

          {/* section tabs */}
          <div style={{ display:"flex", gap:3, background: sectionTabBg, border:`1px solid ${panelBorder}`, borderRadius:10, padding:3 }}>
            {[
              { id:"stack", label:"Stack Problems", icon:<Layers size={10}/> },
              { id:"try",   label:"Try Your Own",   icon:<FlaskConical size={10}/> },
            ].map(s => (
              <button key={s.id} onClick={() => switchSection(s.id)}
                style={{ padding:"5px 12px", borderRadius:7, display:"flex", alignItems:"center", gap:5,
                  fontSize:10, fontWeight:700, cursor:"pointer", border:"none", fontFamily:"inherit",
                  background: section===s.id ? (dark?"rgba(34,211,238,0.12)":"rgba(8,145,178,0.10)") : "transparent",
                  color: section===s.id ? accentColor : textSecondary,
                  outline: section===s.id ? `1px solid ${dark?"rgba(34,211,238,0.25)":"rgba(8,145,178,0.30)"}` : "none" }}>
                {s.icon}{s.label}
              </button>
            ))}
          </div>

          {/* spacer */}
          <div style={{ flex:1 }}/>

          {/* step counter */}
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:8, color: textMuted, fontFamily:"JetBrains Mono, monospace", textTransform:"uppercase", letterSpacing:"0.1em" }}>step</div>
            <div style={{ fontSize:20, fontWeight:900, color: accentColor, fontFamily:"JetBrains Mono, monospace", lineHeight:1 }}>
              {currentStep}<span style={{ color: textMuted, fontSize:11 }}> / {events.length}</span>
            </div>
          </div>

          {/* theme toggle */}
          <button className="theme-toggle" onClick={toggleTheme} title={dark?"Switch to Light":"Switch to Dark"}>
            {dark ? <Sun size={15}/> : <Moon size={15}/>}
          </button>
        </div>

        {/* ── EXAMPLE SELECTOR (stack section) ───────────────── */}
        {section === "stack" && (
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            {Object.entries(EXAMPLES).map(([key, ex]) => {
              const ts  = TAG_STYLE[ex.tag] || TAG_STYLE.Easy;
              const sel = selectedKey === key;
              return (
                <button key={key} onClick={() => selectExample(key)}
                  style={{ padding:"4px 11px", borderRadius:7, fontSize:9, fontWeight:700, cursor:"pointer",
                    border:"none", fontFamily:"inherit", display:"flex", alignItems:"center", gap:5,
                    background: sel ? (dark?"rgba(34,211,238,0.10)":"rgba(8,145,178,0.08)") : (dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)"),
                    color: sel ? accentColor : textSecondary,
                    outline: sel ? `1px solid ${dark?"rgba(34,211,238,0.30)":"rgba(8,145,178,0.30)"}` : `1px solid ${panelBorder}` }}>
                  <span style={{ fontSize:7, fontWeight:900, padding:"1px 5px", borderRadius:4,
                    background: ts.bg, color: ts.color, border:`1px solid ${ts.border}` }}>
                    {ex.tag}
                  </span>
                  {key}
                </button>
              );
            })}
          </div>
        )}

        {/* description / try banner */}
        {section === "stack" && selectedKey && (
          <div style={{ background: infoBg, border:`1px solid ${infoBorder}`, borderRadius:8, padding:"7px 12px", fontSize:11, color: infoText }}>
            <span style={{ color: accentColor, fontWeight:700, marginRight:7 }}>📌</span>
            {EXAMPLES[selectedKey]?.desc}
          </div>
        )}
        {section === "try" && (
          <div style={{ background: tryBg, border:`1px solid ${tryBorder}`, borderRadius:8, padding:"7px 12px", fontSize:11, color: tryText }}>
            <span style={{ fontWeight:700, marginRight:7 }}>🧪</span>
            Write any recursive Java function. Supports: if/else · for/while · return values · Stack operations · int[] arrays · var++/-- · +=/-= · Math.max/min. The recursion tree shows each call's return value the moment it resolves.
          </div>
        )}

        {/* ── MAIN GRID ──────────────────────────────────────── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 390px", gap:12, flex:1, minHeight:0 }}>

          {/* ── LEFT ────────────────────────────────────────── */}
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>

            {/* line legend */}
            <div style={{ display:"flex", gap:14 }}>
              {[["#22c55e","prev executed"],["#f87171","next to run"]].map(([c,l])=>(
                <div key={l} style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <div style={{ width:10, height:2.5, background:c, borderRadius:2 }}/>
                  <span style={{ fontSize:8.5, color:c, fontFamily:"JetBrains Mono, monospace" }}>{l}</span>
                </div>
              ))}
            </div>

            {/* editor */}
            <div style={{ borderRadius:11, overflow:"hidden", border:`1px solid ${panelBorder}`, flex:1 }}>
              <div style={{ background: editorHeaderBg, padding:"6px 11px", display:"flex", alignItems:"center", gap:6, borderBottom:`1px solid ${innerBorder}` }}>
                {["#ef4444","#f59e0b","#22c55e"].map(c=><div key={c} style={{ width:7, height:7, borderRadius:"50%", background:c }}/>)}
                <span style={{ color: textMuted, fontSize:9.5, fontFamily:"JetBrains Mono, monospace", marginLeft:7 }}>Main.java</span>
              </div>
              <Editor
                height="360px"
                defaultLanguage="java"
                theme={monacoTheme}
                value={code}
                onChange={v => { setCode(v||""); reset(); setEvents([]); }}
                onMount={(ed, mon) => { editorRef.current = ed; monacoRef.current = mon; }}
                options={{ fontSize:13, fontFamily:"JetBrains Mono, monospace", minimap:{enabled:false},
                  scrollBeyondLastLine:false, lineNumbers:"on", renderLineHighlight:"none",
                  glyphMargin:true, padding:{top:10,bottom:10} }}
              />
            </div>

            {/* progress bar */}
            <div style={{ height:2, background: progressTrack, borderRadius:99, overflow:"hidden" }}>
              <motion.div animate={{ width:`${progress}%` }} transition={{ duration:0.15 }}
                style={{ height:"100%", borderRadius:99,
                  background: dark?"linear-gradient(90deg,#22d3ee,#6366f1)":"linear-gradient(90deg,#0891b2,#6366f1)" }}/>
            </div>

            {/* controls */}
            <div style={{ display:"flex", gap:5, flexWrap:"wrap", alignItems:"center" }}>
              {[
                { l: loading?"Running…":"▶ Run", c:"#1d4ed8", fn:runCode,                           dis:loading },
                { l:"⏮",                          c:"#374151", fn:prevStep,                          dis:!events.length||currentStep<=1 },
                { l:"Step ▶",                     c:"#7c3aed", fn:nextStep,                          dis:!events.length||isDone },
                { l: isPlaying?"⏸ Pause":"▶ Play",c: isPlaying?"#b45309":"#059669",fn:()=>setIsPlaying(p=>!p), dis:!events.length||isDone },
                { l:"↺ Reset",                    c: dark?"#374151":"#64748b", fn:reset,             dis:false },
              ].map(btn=>(
                <button key={btn.l} onClick={btn.fn} disabled={btn.dis}
                  style={{ padding:"7px 13px", borderRadius:8, fontWeight:700, fontSize:11,
                    cursor:btn.dis?"not-allowed":"pointer", border:"none", color:"white",
                    background:btn.c, opacity:btn.dis?0.35:1, transition:"filter 0.14s", fontFamily:"inherit" }}
                  onMouseEnter={e=>!btn.dis&&(e.currentTarget.style.filter="brightness(1.2)")}
                  onMouseLeave={e=>(e.currentTarget.style.filter="brightness(1)")}
                >{btn.l}</button>
              ))}
              <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:8.5, color: textMuted, fontFamily:"JetBrains Mono, monospace", textTransform:"uppercase", letterSpacing:"0.1em" }}>Speed</span>
                <input type="range" min={60} max={2000} step={40} value={speed} onChange={e=>setSpeed(Number(e.target.value))} style={{ width:78 }}/>
                <span style={{ fontSize:8.5, color: accentColor, fontFamily:"JetBrains Mono, monospace", minWidth:26 }}>{(speed/1000).toFixed(1)}s</span>
              </div>
            </div>

            {/* timeline */}
            {events.length > 0 && (
              <div style={{ background: timelineBg, border:`1px solid ${panelBorder}`, borderRadius:9, padding:"8px 11px" }}>
                <Timeline step={currentStep} total={events.length} events={events} onSeek={seekTo} theme={theme}/>
              </div>
            )}

            {/* error */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                  style={{ background: errBg, border:`1px solid ${errBorder}`, borderRadius:8,
                    padding:"8px 12px", color: errText, fontSize:10.5, fontFamily:"JetBrains Mono, monospace" }}>
                  ⚠ {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* explanation */}
            <AnimatePresence mode="wait">
              <motion.div key={currentStep}
                initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                style={{ background: explainBg, border:`1px solid ${explainBorder}`, borderRadius:9,
                  padding:"9px 13px", fontSize:11.5, lineHeight:1.75, color: explainText }}>
                <span style={{ fontSize:8.5, fontWeight:900, letterSpacing:"0.12em", marginRight:8,
                  color: dark?"rgba(99,102,241,0.45)":"rgba(67,56,202,0.5)" }}>EXPLAIN</span>
                {getExplanation(currentEvent)}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── RIGHT PANEL ─────────────────────────────────── */}
          <div style={{ background: panelBg, border:`1px solid ${panelBorder}`, borderRadius:11,
            display:"flex", flexDirection:"column", overflow:"hidden", maxHeight:"calc(100vh - 68px)" }}>

            {/* panel header */}
            <div style={{ padding:"9px 12px", borderBottom:`1px solid ${innerBorder}`, flexShrink:0 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:7 }}>
                <span style={{ fontSize:12, fontWeight:900, letterSpacing:"-0.02em", color: textPrimary }}>Runtime View</span>
                {isPlaying && (
                  <motion.span animate={{opacity:[1,0.15,1]}} transition={{repeat:Infinity,duration:1.1}}
                    style={{ fontSize:8.5, color: accentColor, fontWeight:900, letterSpacing:"0.14em" }}>● LIVE</motion.span>
                )}
              </div>
              <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setRightTab(t.id)}
                    style={{ padding:"3px 9px", borderRadius:6, display:"flex", alignItems:"center", gap:3,
                      fontSize:9, fontWeight:700, cursor:"pointer", border:"none", fontFamily:"inherit",
                      background: rightTab===t.id ? (dark?"rgba(34,211,238,0.12)":"rgba(8,145,178,0.10)") : "transparent",
                      color: rightTab===t.id ? accentColor : textSecondary,
                      outline: rightTab===t.id ? `1px solid ${dark?"rgba(34,211,238,0.22)":"rgba(8,145,178,0.28)"}` : "none" }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* action badge */}
            <div style={{ padding:"7px 12px", flexShrink:0 }}>
              <AnimatePresence mode="wait">
                <motion.div key={(currentEvent?.action||"")+(currentStep)}
                  initial={{opacity:0,scale:0.93}} animate={{opacity:1,scale:1}}
                  style={{ background:`${acColor}18`, border:`1px solid ${acColor}44`, borderRadius:8,
                    padding:"6px 11px", textAlign:"center", fontWeight:900, fontSize:12,
                    letterSpacing:"0.06em", color: acColor, fontFamily:"JetBrains Mono, monospace" }}>
                  {currentEvent
                    ? `${currentEvent.action?.toUpperCase()}${currentEvent.value !== null && currentEvent.value !== undefined ? "  "+currentEvent.value : ""}`
                    : "WAITING"}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* line + depth */}
            <div style={{ padding:"0 12px 7px", flexShrink:0, display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ fontSize:8.5, color: textMuted, fontFamily:"JetBrains Mono, monospace", textTransform:"uppercase", letterSpacing:"0.1em" }}>Line</span>
                <AnimatePresence mode="wait">
                  <motion.span key={currentLine} initial={{opacity:0,scale:0.6}} animate={{opacity:1,scale:1}}
                    style={{ fontSize:20, fontWeight:900, color: accentColor, fontFamily:"JetBrains Mono, monospace", lineHeight:1 }}>
                    {currentLine || "—"}
                  </motion.span>
                </AnimatePresence>
              </div>
              {frames.length > 0 && (
                <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                  <span style={{ fontSize:8.5, color: textMuted, fontFamily:"JetBrains Mono, monospace", textTransform:"uppercase", letterSpacing:"0.1em" }}>Depth</span>
                  {frames.map((_,i)=>(
                    <div key={i} style={{ width:7, height:7, borderRadius:2, background:`hsl(${FRAME_HUES[i%FRAME_HUES.length]},70%,50%)`, opacity:i===frames.length-1?1:0.4 }}/>
                  ))}
                  <span style={{ fontSize:10, color: accentColor, fontFamily:"JetBrains Mono, monospace", fontWeight:900, marginLeft:2 }}>{frames.length}</span>
                </div>
              )}
            </div>

            {/* ── TAB CONTENT ─────────────────────────────────── */}
            <div style={{ flex:1, overflow:"hidden", padding:"0 10px 10px" }}>

              {/* CALL STACK */}
              {rightTab === "frames" && (
                <div style={{ height:"100%", overflowY:"auto", display:"flex", flexDirection:"column", gap:5, paddingRight:2 }}>
                  {frames.length === 0
                    ? <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:160, gap:8, color: emptyColor }}>
                        <GitBranch size={22} style={{opacity:0.35}}/>
                        <span style={{ fontSize:11, fontWeight:600 }}>No active frames</span>
                        <span style={{ fontSize:8.5 }}>Run → Step / Play</span>
                      </div>
                    : <AnimatePresence>
                        {[...frames].reverse().map((f, ri) => {
                          const origIdx = frames.length - 1 - ri;
                          return (
                            <FrameCard key={`${f.method}-${origIdx}`}
                              frame={{ ...f, depth: origIdx }}
                              changedVar={f.active ? currentEvent?.changed_var : null}
                              theme={theme} />
                          );
                        })}
                      </AnimatePresence>
                  }
                </div>
              )}

              {/* DATA STACK */}
              {rightTab === "stack" && (
                <div style={{ height:"100%", background: emptyBg, borderRadius:9,
                  border:`1px solid ${panelBorder}`, position:"relative", overflow:"hidden" }}>
                  {stack.length === 0 && (
                    <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
                      alignItems:"center", justifyContent:"center", gap:8, color: emptyColor }}>
                      <Layers size={22} style={{opacity:0.35}}/>
                      <span style={{ fontSize:11, fontWeight:600 }}>Empty Stack</span>
                    </div>
                  )}
                  <div style={{ position:"absolute", bottom:18, left:"50%", transform:"translateX(-50%)",
                    width:142, height:2, background: dark?"rgb(18,28,50)":"#e2e8f0", borderRadius:99 }}/>
                  <div style={{ position:"absolute", bottom:5, left:"50%", transform:"translateX(-50%)",
                    fontSize:7.5, fontFamily:"JetBrains Mono, monospace", letterSpacing:"0.1em",
                    color: dark?"#1e3a5f":"#94a3b8" }}>BOTTOM</div>
                  <div style={{ position:"absolute", bottom:26, left:"50%", transform:"translateX(-50%)",
                    display:"flex", flexDirection:"column-reverse", alignItems:"center",
                    maxHeight:"calc(100% - 50px)", overflowY:"auto" }}>
                    <AnimatePresence>
                      {stack.map((val,i)=>(
                        <StackBlock key={`${i}-${val}`} value={val} isTop={i===stack.length-1} index={i} theme={theme}/>
                      ))}
                    </AnimatePresence>
                  </div>
                  {stack.length > 0 && (
                    <div style={{ position:"absolute", top:8, right:9, fontSize:8.5,
                      fontFamily:"JetBrains Mono, monospace", color: textMuted }}>
                      size: {stack.length}
                    </div>
                  )}
                </div>
              )}

              {/* HEAP */}
              {rightTab === "heap" && (
                <div style={{ height:"100%", overflowY:"auto", paddingRight:2 }}>
                  {heapItems.length === 0
                    ? <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:160, gap:8, color: emptyColor }}>
                        <Database size={22} style={{opacity:0.35}}/>
                        <span style={{ fontSize:11, fontWeight:600 }}>Heap is empty</span>
                        <span style={{ fontSize:8.5 }}>int[] arrays appear here</span>
                      </div>
                    : <div style={{ paddingTop:4 }}>
                        <div style={{ fontSize:9, color: textMuted, fontFamily:"JetBrains Mono, monospace", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>
                          Heap Memory
                        </div>
                        {heapItems.map(([ref, obj])=>(
                          <ArrayViz key={ref} name={obj.label||ref} data={obj.data}
                            flashIdx={flashRef===ref?flashIdx:null} theme={theme}/>
                        ))}
                      </div>
                  }
                </div>
              )}

              {/* RECURSION TREE */}
              {rightTab === "tree" && (
                <div style={{ height:"100%", background: emptyBg, borderRadius:9,
                  border:`1px solid ${panelBorder}`, overflow:"auto", padding:"14px 10px" }}>
                  {!tree
                    ? <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:160, gap:8, color: emptyColor }}>
                        <GitMerge size={22} style={{opacity:0.35}}/>
                        <span style={{ fontSize:11, fontWeight:600 }}>Tree builds as you step</span>
                        <span style={{ fontSize:8.5 }}>↩ shows return values live</span>
                      </div>
                    : <div style={{ display:"flex", justifyContent:"center", minWidth:"fit-content" }}>
                        <TreeNodeView node={tree} activeIds={activeIds} theme={theme}/>
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