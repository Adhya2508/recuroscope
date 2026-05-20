# 🔬 Recurscope

**A step-by-step Java recursion & stack visualizer.**
Watch every function call, local variable, stack push/pop, and return value unfold live — with a recursion tree that builds in real time.

---

## What it looks like

```
┌─────────────────────────────────┬──────────────────────────────┐
│  Java Editor (Monaco)           │  Runtime View                │
│                                 │                              │
│  ▶ line being executed ← red    │  ┌─ Call Stack ───────── ┐   │
│    line just ran      ← green   │  │  reverseStack  ACTIVE │   │
│                                 │  │    top = 1            │   │
│  ─────────────────────────────  │  ├─ insertAtBottom ──────┤   │
│  Timeline scrubber              │  │    val = 1            │   │
│  ████████░░░░░░░░░░░░  12/38    │  └───────────────────────┘   │
│                                 │                              │
│  ▶ Run  ⏮  Step ▶  ▶ Play      │  ┌─ Data Stack ─────────┐    │
│  ↺ Reset   Speed ──●── 0.6s     │  │        2    ← TOP    │    │
│                                 │  │        3             │    │
│  EXPLAIN  Popping 1 from stack  │  └─ BOTTOM ─────────────┘    │
└─────────────────────────────────┴──────────────────────────────┘
```

---

## Features

| Feature | Details |
|---|---|
| **Line highlighting** | Green = just executed · Red = next to run · `▶` glyph in margin |
| **Call stack panel** | Every live frame with locals, active frame highlighted, depth indicator |
| **Return value tracking** | Return values shown in frame cards and captured into variables correctly |
| **Data stack panel** | Animated push/pop with TOP indicator — for Stack-based problems |
| **Heap memory panel** | `int[]` arrays shown as indexed cells with write-flash animation |
| **Recursion tree** | Builds incrementally · active nodes glow · `↩ value` appears the moment a call returns |
| **Timeline scrubber** | Click anywhere to jump to that exact step · colour-coded by event type |
| **Step forward & back** | Go one step at a time in either direction |
| **Autoplay + speed** | Continuous playback from 0.06s to 2s per step |
| **Explanation bar** | Plain-English description of every event |
| **Light & dark theme** | Full CSS-variable based theming, persists across sessions |
| **8 curated examples** | All common stack recursion patterns, hand-verified |
| **Try Your Own** | Paste any supported Java recursion and visualize it instantly |

---

## Supported Java Syntax

| Construct | Example |
|---|---|
| `if / else` | `if(st.isEmpty()) { ... } else { ... }` |
| `for` loop | `for(int i = 0; i < n; i++) { ... }` |
| `while` loop | `while(!st.isEmpty()) { ... }` |
| `return` (void + value) | `return top + rest;` |
| Variable declaration | `int top = st.pop();` |
| Variable reassignment | `top = 5;` |
| Compound assignment | `sum += val;` · `count -= 1;` |
| Increment / Decrement | `i++` · `--j` |
| Stack operations | `st.push(x)` · `st.pop()` · `st.peek()` · `st.isEmpty()` · `st.size()` |
| Array declaration | `int[] arr = new int[n];` · `int[] arr = {1,2,3};` |
| Array read / write | `arr[i]` · `arr[i] = val;` |
| `arr.length` | `for(int i = 0; i < arr.length; i++)` |
| Recursive calls | `int a = fib(n - 1);` — return value captured correctly |
| `Math.max / Math.min` | `Math.max(a, b)` |
| `Math.abs` | `Math.abs(n)` |
| Logical operators | `&&` · `\|\|` · `!` |
| Comparison | `==` · `!=` · `<` · `>` · `<=` · `>=` |

---

## Built-in Examples

All 8 examples are hand-verified and execute correctly end-to-end.

### Stack Recursion Problems

| # | Problem | Tag | What it demonstrates |
|---|---|---|---|
| 1 | **Reverse Stack** | Classic | `insertAtBottom` + `reverseStack` mutual recursion |
| 2 | **Sort Stack** | Classic | `insertSorted` + `sortStack` — ascending order |
| 3 | **Insert at Bottom** | Classic | Base case on `isEmpty`, unwind and restore |
| 4 | **Delete Middle** | Medium | Index tracking through recursion depth |
| 5 | **Sum of Stack** | Easy | Pop → recurse → push back → return sum |
| 6 | **Count Elements** | Easy | Count by adding 1 at each return level |
| 7 | **Duplicate Stack** | Easy | Each element pushed twice on the way back |
| 8 | **Find Minimum** | Medium | Compare top vs min-below at each level |

### Try Your Own

Anything that fits the supported syntax table above. Good starting points:

```java
// Fibonacci
public static int fib(int n) {
    if(n <= 1) { return n; }
    int a = fib(n - 1);
    int b = fib(n - 2);
    return a + b;
}

// Factorial
public static int factorial(int n) {
    if(n <= 1) { return 1; }
    int prev = factorial(n - 1);
    return n * prev;
}

// Power of 2
public static int power(int base, int exp) {
    if(exp == 0) { return 1; }
    int half = power(base, exp / 2);
    if(exp % 2 == 0) { return half * half; }
    return base * half * half;
}

// GCD (Euclidean)
public static int gcd(int a, int b) {
    if(b == 0) { return a; }
    return gcd(b, a % b);
}

// Sum of array recursively
public static int arraySum(int[] arr, int i) {
    if(i == arr.length) { return 0; }
    int rest = arraySum(arr, i + 1);
    return arr[i] + rest;
}
```

---

## Project Structure

```
recurscope/
├── main.py              ← FastAPI backend (parser + interpreter)
├── src/
│   ├── App.jsx          ← React frontend (all UI)
│   ├── index.css        ← Global styles + light/dark theme variables
│   └── main.jsx         ← React entry point
├── index.html           ← Vite HTML shell
├── vite.config.js
├── package.json
└── README.md
```

---

## Setup & Running

### 1 — Backend (Python / FastAPI)

**Requirements:** Python 3.8+

```bash
pip install fastapi uvicorn
```

```bash
uvicorn main:app --reload --port 8000
```

Backend runs at `http://127.0.0.1:8000`. Keep this terminal open.

---

### 2 — Frontend (React / Vite)

**Requirements:** Node 18+

```bash
npm install
```

If starting from scratch, also install:

```bash
npm install @monaco-editor/react axios framer-motion lucide-react
```

```bash
npm run dev
```

Frontend runs at `http://localhost:5173`.

---

### 3 — Required boilerplate files

**`index.html`**
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Recurscope</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

**`src/main.jsx`**
```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**`vite.config.js`**
```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
```

**`package.json`** (minimum)
```json
{
  "name": "recurscope",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "@monaco-editor/react": "^4.6.0",
    "axios": "^1.6.0",
    "framer-motion": "^11.0.0",
    "lucide-react": "^0.383.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.3.0"
  }
}
```

---

## How It Works

```
Browser                         FastAPI (main.py)
   │                                    │
   │  POST /execute  { code: "..." }   │
   │ ─────────────────────────────────▶│
   │                                    │  parse_methods()
   │                                    │    → finds all public static methods
   │                                    │  Interpreter.call_method("main")
   │                                    │    → _exec() walks each statement
   │                                    │    → emit() snapshots state after each step
   │                                    │  TreeNode built as calls are made
   │                                    │  Heap updated on int[] alloc/write
   │  { success, events: [...] }        │
   │ ◀─────────────────────────────────│
   │                                    │
   │  Replay events one at a time       │
   │  (Step / Play / Scrub)             │
```

**Each event is a complete snapshot:**

```json
{
  "action":      "return_val",
  "value":       6,
  "line":        8,
  "callee":      "factorial",
  "return_value": 6,
  "stack":       [],
  "frames": [
    {
      "method": "main",
      "locals": { "result": null },
      "active": false,
      "depth":  0
    },
    {
      "method": "factorial",
      "locals": { "n": 3, "prev": 2 },
      "active": true,
      "depth":  1
    }
  ],
  "tree": {
    "id": 2, "method": "factorial", "args": { "n": 3 },
    "done": true, "returned": 6,
    "children": [
      { "id": 3, "method": "factorial", "args": { "n": 2 },
        "done": true, "returned": 2, "children": [ ... ] }
    ]
  },
  "heap":        {},
  "changed_var": "prev"
}
```

The frontend just replays these snapshots — no live execution in the browser.

---

## Theming

`index.css` uses CSS custom properties scoped to `[data-theme]`:

```css
[data-theme="dark"]  { --bg-page: #020817; --accent: #22d3ee; ... }
[data-theme="light"] { --bg-page: #f8fafc; --accent: #0891b2; ... }
```

The theme toggle button writes `data-theme` to `<html>` and saves to `localStorage` so the preference persists across reloads.

To force a theme programmatically:
```js
document.documentElement.setAttribute("data-theme", "light");
```

---

## Event Type Reference

| Action | When it fires | Color in timeline |
|---|---|---|
| `call` | A method is entered | Blue |
| `return` | A method exits (any kind) | Purple |
| `return_val` | `return expr;` evaluated | Purple |
| `return_void` | `return;` (no value) | Purple |
| `push` | `st.push(x)` | Green |
| `pop` | `st.pop()` | Red |
| `assign` | Variable set or updated | Cyan |
| `condition` | `if(...)` evaluated | Amber |
| `loop_cond` | `for`/`while` condition checked | Orange |
| `init` | Stack created | Green |
| `heap_alloc` | `int[]` allocated | Violet |
| `arr_write` | `arr[i] = val` | Pink |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Cannot reach backend" | Make sure `uvicorn main:app --reload --port 8000` is running in a separate terminal |
| CORS error in browser | The backend already allows `*` — restart it with the command above |
| "No methods found" | Your code must have at least one `public static` method |
| Execution stops early | Check that your base case `return` is correct — the interpreter stops when `main` returns |
| Stack overflow error | The depth limit is 150 frames. Use smaller inputs for deep recursion |
| Infinite loop warning | Loops are capped at 10 000 iterations — check your loop condition |
| Array not in Heap tab | Declare arrays with `int[] arr = new int[n]` or `int[] arr = {1,2,3}` |
| Return value shows `null` | Make sure you write `int result = myFunc(args)` not just `myFunc(args)` |
| Light theme editor looks wrong | Monaco uses its own theme — it switches between `vs-dark` and `light` automatically |

---

## Limits

| Limit | Value | Reason |
|---|---|---|
| Max events per run | 6 000 | Prevents browser freeze on infinite recursion |
| Max recursion depth | 150 frames | Mirrors typical JVM stack depth |
| Max loop iterations | 10 000 per loop | Catches accidental infinite loops |

---

## License

MIT — use freely, modify freely, no attribution required.
