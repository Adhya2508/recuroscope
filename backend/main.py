from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import Any
import re
import copy

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────
#  METHOD PARSER
# ─────────────────────────────────────────────────────────────

SKIP_NAMES = {"if", "while", "for", "switch", "class",
              "Main", "Solution", "try", "catch", "else"}

METHOD_RE = re.compile(
    r'\s*(?:(?:public|private|protected|static|final|synchronized|void|int|boolean|long|'
    r'double|String|Stack|Deque|Queue|List|void)\s+)+'
    r'(\w+)\s*\(([^)]*)\)\s*(?:throws\s+[\w,\s]+\s*)?\{?'
)

def parse_methods(code: str) -> dict:
    methods = {}
    lines = code.split("\n")
    i = 0
    while i < len(lines):
        m = METHOD_RE.match(lines[i])
        if m and m.group(1) not in SKIP_NAMES:
            mname = m.group(1)
            body = [{"line": i + 1, "text": lines[i].strip()}]
            depth = lines[i].count("{") - lines[i].count("}")
            i += 1
            while i < len(lines):
                body.append({"line": i + 1, "text": lines[i].strip()})
                depth += lines[i].count("{") - lines[i].count("}")
                i += 1
                if depth <= 0:
                    break
            methods[mname] = body
        else:
            i += 1
    return methods


# ─────────────────────────────────────────────────────────────
#  EXPRESSION EVALUATOR
# ─────────────────────────────────────────────────────────────

def eval_expr(expr: str, local_vars: dict, data_stack: list) -> Any:
    expr = expr.strip().rstrip(";")
    if not expr:
        return None
    if re.fullmatch(r'-?\d+', expr):
        return int(expr)
    if expr in ("true", "false"):
        return expr == "true"
    if expr == "null":
        return None
    if expr in local_vars:
        return local_vars[expr]
    if re.search(r'\w+\.isEmpty\(\)', expr):
        return len(data_stack) == 0
    if re.search(r'\w+\.pop\(\)', expr):
        return data_stack.pop() if data_stack else None
    if re.search(r'\w+\.(?:peek|top)\(\)', expr):
        return data_stack[-1] if data_stack else None
    if re.search(r'\w+\.size\(\)', expr):
        return len(data_stack)
    # arithmetic
    m = re.fullmatch(r'(.+?)\s*([+\-*/% ])\s*(.+)', expr)
    if m:
        op = m.group(2).strip()
        if op in ('+', '-', '*', '/', '%'):
            a = eval_expr(m.group(1).strip(), local_vars, data_stack)
            b = eval_expr(m.group(3).strip(), local_vars, data_stack)
            try:
                ia, ib = int(a), int(b)
                return (ia + ib if op == '+' else ia - ib if op == '-' else
                        ia * ib if op == '*' else ia // ib if op == '/' else ia % ib)
            except Exception:
                pass
    return expr


# ─────────────────────────────────────────────────────────────
#  RETURN SIGNAL
# ─────────────────────────────────────────────────────────────

class _Return(Exception):
    def __init__(self, value=None):
        self.value = value


# ─────────────────────────────────────────────────────────────
#  RECURSION TREE BUILDER
#  Tracks call/return events to build a tree structure
# ─────────────────────────────────────────────────────────────

class TreeNode:
    _id_counter = 0

    def __init__(self, method: str, args: dict, parent_id=None):
        TreeNode._id_counter += 1
        self.id        = TreeNode._id_counter
        self.method    = method
        self.args      = {k: v for k, v in args.items() if v != "__DS__"}
        self.parent_id = parent_id
        self.children  = []
        self.returned  = None
        self.done      = False

    def to_dict(self):
        return {
            "id":        self.id,
            "method":    self.method,
            "args":      self.args,
            "parent_id": self.parent_id,
            "children":  [c.to_dict() for c in self.children],
            "returned":  self.returned,
            "done":      self.done,
        }


# ─────────────────────────────────────────────────────────────
#  INTERPRETER
# ─────────────────────────────────────────────────────────────

MAX_EVENTS = 3000
MAX_DEPTH  = 120


class Interpreter:
    def __init__(self, methods: dict):
        self.methods      = methods
        self.events       = []
        self.data_stack   = []
        self.call_frames  = []
        self._ec          = 0
        # recursion tree
        TreeNode._id_counter = 0
        self._tree_root   = None
        self._tree_stack  = []   # stack of TreeNode (mirrors call_frames)

    # ── frame snapshot ──────────────────────────────────────
    def _snap_frames(self):
        snap = []
        for idx, f in enumerate(self.call_frames):
            clean = {
                k: ("__DS__" if v == "__DS__" else v)
                for k, v in f["locals"].items()
                if not k.startswith("__")
            }
            snap.append({
                "method":       f["method"],
                "locals":       clean,
                "active":       idx == len(self.call_frames) - 1,
                "line":         f.get("line"),
                "return_value": f.get("return_value"),
                "depth":        idx,
            })
        return snap

    # ── tree snapshot ───────────────────────────────────────
    def _snap_tree(self):
        if self._tree_root is None:
            return None
        return self._tree_root.to_dict()

    # ── emit ────────────────────────────────────────────────
    def emit(self, action: str, value: Any, line: int,
             changed_var: str = None, extra: dict = None):
        self._ec += 1
        if self._ec > MAX_EVENTS:
            raise RuntimeError("Event limit reached — possible infinite recursion.")
        ev = {
            "action":      action,
            "value":       value,
            "line":        line,
            "stack":       copy.copy(self.data_stack),
            "frames":      self._snap_frames(),
            "tree":        self._snap_tree(),
            "changed_var": changed_var,
        }
        if extra:
            ev.update(extra)
        self.events.append(ev)

    # ── call a method ────────────────────────────────────────
    def call_method(self, name: str, args: dict, depth: int = 0):
        if depth > MAX_DEPTH:
            raise RuntimeError("Max recursion depth exceeded.")
        if name not in self.methods:
            return None

        # ── build tree node ──
        parent_id = self._tree_stack[-1].id if self._tree_stack else None
        node = TreeNode(name, args, parent_id)
        if self._tree_root is None:
            self._tree_root = node
        elif self._tree_stack:
            self._tree_stack[-1].children.append(node)
        self._tree_stack.append(node)

        local_vars = dict(args)
        frame = {"method": name, "locals": local_vars,
                 "line": None, "return_value": None}
        self.call_frames.append(frame)

        ret = None
        try:
            self._exec(self.methods[name], local_vars, frame, depth)
        except _Return as r:
            ret = r.value
        finally:
            frame["return_value"] = ret
            # mark tree node as done
            node.returned = ret
            node.done     = True
            self.emit("return", ret, frame.get("line") or 0,
                      extra={"callee": name, "return_value": ret})
            if self.call_frames and self.call_frames[-1] is frame:
                self.call_frames.pop()
            if self._tree_stack and self._tree_stack[-1] is node:
                self._tree_stack.pop()

        return ret

    # ── execute node list ─────────────────────────────────────
    def _exec(self, nodes, local_vars, frame, depth):
        i = 0
        while i < len(nodes):
            node = nodes[i]
            ln   = node["line"]
            text = node["text"]
            frame["line"] = ln
            i += 1

            # skip boilerplate
            if (not text
                    or text in ("{", "}", "};")
                    or text.startswith("//")
                    or text.startswith("/*")
                    or text.startswith("*")
                    or text.startswith("System.out")
                    or text.startswith("import ")
                    or text.startswith("public class")
                    or re.match(r'^@', text)):
                continue

            # ── return; ──────────────────────────────────────
            if re.match(r'^return\s*;?\s*$', text):
                self.emit("return_void", None, ln)
                raise _Return(None)

            # ── return <expr>; ────────────────────────────────
            m = re.match(r'^return\s+(.+?)\s*;?\s*$', text)
            if m:
                val = eval_expr(m.group(1), local_vars, self.data_stack)
                self.emit("return_val", val, ln)
                raise _Return(val)

            # ── if (...) { ── THE KEY FIX: initial_depth=1 ───
            m = re.match(r'^if\s*\((.+?)\)\s*\{', text)
            if m:
                cond_str = m.group(1).strip()
                cond_val = self._cond(cond_str, local_vars)
                self.emit("condition", str(cond_val).lower(), ln,
                          extra={"condition": cond_str, "result": cond_val})
                # The '{' is ON this line, so block starts at depth=1
                block, i = self._collect(nodes, i, initial_depth=1)
                else_block = []
                if i < len(nodes) and re.match(r'^else\b', nodes[i]["text"]):
                    i += 1
                    else_block, i = self._collect(nodes, i, initial_depth=1)
                if cond_val:
                    self._exec(block, local_vars, frame, depth)
                elif else_block:
                    self._exec(else_block, local_vars, frame, depth)
                continue

            # ── if(cond) single statement; ────────────────────
            m = re.match(r'^if\s*\((.+?)\)\s+(.+?)\s*;?\s*$', text)
            if m:
                cond_str = m.group(1).strip()
                body_str = m.group(2).strip()
                cond_val = self._cond(cond_str, local_vars)
                self.emit("condition", str(cond_val).lower(), ln,
                          extra={"condition": cond_str, "result": cond_val})
                if cond_val:
                    self._exec([{"line": ln, "text": body_str}],
                               local_vars, frame, depth)
                continue

            # ── st.push(expr) ─────────────────────────────────
            m = re.match(r'^\w+\.push\((.+?)\)\s*;?\s*$', text)
            if m:
                val = eval_expr(m.group(1).strip(), local_vars, self.data_stack)
                self.data_stack.append(val)
                frame["locals"] = dict(local_vars)
                self.emit("push", val, ln)
                continue

            # ── TYPE var = st.pop() ───────────────────────────
            m = re.match(
                r'^(?:int|long|double|var)\s+(\w+)\s*=\s*\w+\.pop\(\)\s*;?\s*$',
                text)
            if m:
                vname  = m.group(1)
                popped = self.data_stack.pop() if self.data_stack else None
                local_vars[vname] = popped
                frame["locals"]   = dict(local_vars)
                self.emit("pop", popped, ln, changed_var=vname)
                continue

            # ── bare st.pop() ─────────────────────────────────
            if re.match(r'^\w+\.pop\(\)\s*;?\s*$', text):
                popped = self.data_stack.pop() if self.data_stack else None
                frame["locals"] = dict(local_vars)
                self.emit("pop", popped, ln)
                continue

            # ── Stack / Queue init ────────────────────────────
            m = re.match(
                r'^(?:Stack|Queue|Deque|LinkedList|ArrayDeque)<\w+>\s+(\w+)'
                r'\s*=\s*new\s+\w+<[^>]*>\(\)\s*;?\s*$', text)
            if m:
                vname = m.group(1)
                local_vars[vname] = "__DS__"
                frame["locals"]   = dict(local_vars)
                self.emit("init", vname, ln, changed_var=vname)
                continue

            # ── TYPE var = expr ───────────────────────────────
            m = re.match(
                r'^(?:int|long|double|boolean|String|var)\s+(\w+)\s*=\s*(.+?)\s*;?\s*$',
                text)
            if m:
                vname = m.group(1)
                val   = eval_expr(m.group(2), local_vars, self.data_stack)
                local_vars[vname] = val
                frame["locals"]   = dict(local_vars)
                self.emit("assign", f"{vname} = {val}", ln, changed_var=vname)
                continue

            # ── var = expr (re-assign) ────────────────────────
            m = re.match(r'^(\w+)\s*=\s*(.+?)\s*;?\s*$', text)
            if m:
                vname = m.group(1)
                if vname in local_vars:
                    val = eval_expr(m.group(2), local_vars, self.data_stack)
                    local_vars[vname] = val
                    frame["locals"]   = dict(local_vars)
                    self.emit("assign", f"{vname} = {val}", ln, changed_var=vname)
                    continue

            # ── method call: name(args); ──────────────────────
            m = re.match(r'^(\w+)\s*\(([^;]*)\)\s*;?\s*$', text)
            if m:
                callee   = m.group(1)
                raw_args = (m.group(2) or "").strip()
                if callee in self.methods and callee not in SKIP_NAMES:
                    resolved = self._resolve(callee, raw_args, local_vars)
                    self.emit("call", callee, ln,
                              extra={"callee": callee, "call_args": resolved})
                    frame["locals"] = dict(local_vars)
                    self.call_method(callee, resolved, depth + 1)
                continue

    # ── collect a braced block ────────────────────────────────
    # THE FIX: initial_depth=1 because the '{' was on the if-line itself.
    # Old code used opened=False and never broke when block had no '{'.
    def _collect(self, nodes, start: int, initial_depth: int = 1):
        block = []
        depth = initial_depth
        i     = start
        while i < len(nodes):
            t      = nodes[i]["text"]
            depth += t.count("{") - t.count("}")
            block.append(nodes[i])
            i += 1
            if depth <= 0:
                break
        return block, i

    # ── condition evaluator ───────────────────────────────────
    def _cond(self, expr: str, local_vars: dict) -> bool:
        expr = expr.strip()
        if re.search(r'!\s*\w+\.isEmpty\(\)', expr):
            return len(self.data_stack) != 0
        if re.search(r'\w+\.isEmpty\(\)', expr):
            return len(self.data_stack) == 0
        m = re.match(r'(.+?)\s*(==|!=|<=|>=|<|>)\s*(.+)', expr)
        if m:
            a  = eval_expr(m.group(1).strip(), local_vars, self.data_stack)
            b  = eval_expr(m.group(3).strip(), local_vars, self.data_stack)
            op = m.group(2)
            try:
                if op == '==': return a == b
                if op == '!=': return a != b
                a, b = int(a), int(b)
                return (a < b if op == '<' else a > b if op == '>' else
                        a <= b if op == '<=' else a >= b)
            except Exception:
                pass
        return False

    # ── resolve call arguments ────────────────────────────────
    def _resolve(self, callee: str, raw_args: str, local_vars: dict) -> dict:
        if callee not in self.methods:
            return {}
        sig = self.methods[callee][0]["text"]
        pm  = re.search(r'\(([^)]*)\)', sig)
        if not pm or not pm.group(1).strip():
            return {}
        param_names = []
        for p in pm.group(1).split(","):
            p = re.sub(r'<[^>]+>', '', p).strip()
            toks = p.split()
            if toks:
                param_names.append(toks[-1])
        call_args = [a.strip() for a in raw_args.split(",") if a.strip()]
        result = {}
        for idx, pname in enumerate(param_names):
            if idx >= len(call_args):
                break
            arg = call_args[idx]
            if arg in local_vars and local_vars[arg] == "__DS__":
                result[pname] = "__DS__"
            else:
                result[pname] = eval_expr(arg, local_vars, self.data_stack)
        return result


# ─────────────────────────────────────────────────────────────
#  RUN
# ─────────────────────────────────────────────────────────────

def run_code(code: str) -> dict:
    methods = parse_methods(code)
    if not methods:
        return {"success": False,
                "error": "No methods found in your code.",
                "events": []}

    interp = Interpreter(methods)
    entry  = "main" if "main" in methods else next(iter(methods))

    try:
        interp.call_method(entry, {}, depth=0)
    except RuntimeError as e:
        return {"success": False, "error": str(e), "events": interp.events}

    return {
        "success":     True,
        "events":      interp.events,
        "total_steps": len(interp.events),
    }


# ─────────────────────────────────────────────────────────────
#  ENDPOINT
# ─────────────────────────────────────────────────────────────

@app.post("/execute")
def execute_endpoint(data: dict):
    code: str = data.get("code", "")
    try:
        result = run_code(code)
    except Exception as e:
        return {"success": False, "error": str(e), "events": []}
    return result