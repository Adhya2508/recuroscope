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
    r'\s*(?:(?:public|private|protected|static|final|synchronized|'
    r'void|int|boolean|long|double|String|Stack|Deque|Queue|List|Integer|char)\s+)+'
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
#  HEAP
# ─────────────────────────────────────────────────────────────

class Heap:
    def __init__(self):
        self._store: dict = {}
        self._counter = 0

    def alloc_array(self, data: list, label: str = "") -> str:
        self._counter += 1
        ref = f"@arr{self._counter}"
        self._store[ref] = {"type": "array", "data": list(data), "label": label}
        return ref

    def get(self, ref: str):
        return self._store.get(ref)

    def set_index(self, ref: str, idx: int, val):
        if ref in self._store:
            arr = self._store[ref]["data"]
            while len(arr) <= idx:
                arr.append(0)
            arr[idx] = val

    def snapshot(self):
        return copy.deepcopy(self._store)


# ─────────────────────────────────────────────────────────────
#  EXPRESSION EVALUATOR
# ─────────────────────────────────────────────────────────────

def eval_expr(expr: str, local_vars: dict, data_stack: list, heap: Heap) -> Any:
    expr = expr.strip().rstrip(";")
    if not expr:
        return None
    if re.fullmatch(r'-?\d+', expr):
        return int(expr)
    if expr in ("true", "false"):
        return expr == "true"
    if expr == "null":
        return None

    # arr[i]
    m = re.fullmatch(r'(\w+)\[(.+?)\]', expr)
    if m:
        ref = local_vars.get(m.group(1))
        idx = eval_expr(m.group(2), local_vars, data_stack, heap)
        if ref and isinstance(ref, str) and ref.startswith("@arr"):
            obj = heap.get(ref)
            if obj and isinstance(idx, int) and 0 <= idx < len(obj["data"]):
                return obj["data"][idx]
        return 0

    # arr.length
    m = re.fullmatch(r'(\w+)\.length', expr)
    if m:
        ref = local_vars.get(m.group(1))
        if ref and isinstance(ref, str) and ref.startswith("@arr"):
            obj = heap.get(ref)
            if obj:
                return len(obj["data"])
        return 0

    if expr in local_vars:
        return local_vars[expr]

    # stack ops
    if re.search(r'\w+\.isEmpty\(\)', expr):
        return len(data_stack) == 0
    if re.search(r'\w+\.pop\(\)', expr):
        return data_stack.pop() if data_stack else None
    if re.search(r'\w+\.(?:peek|top)\(\)', expr):
        return data_stack[-1] if data_stack else None
    if re.search(r'\w+\.size\(\)', expr):
        return len(data_stack)

    # Math
    mm = re.fullmatch(r'Math\.(max|min)\((.+?),\s*(.+?)\)', expr)
    if mm:
        a = eval_expr(mm.group(2), local_vars, data_stack, heap)
        b = eval_expr(mm.group(3), local_vars, data_stack, heap)
        try:
            return max(int(a), int(b)) if mm.group(1) == "max" else min(int(a), int(b))
        except Exception:
            pass

    mm = re.fullmatch(r'Math\.abs\((.+?)\)', expr)
    if mm:
        a = eval_expr(mm.group(1), local_vars, data_stack, heap)
        try:
            return abs(int(a))
        except Exception:
            pass

    # ternary
    m = re.fullmatch(r'(.+?)\s*\?\s*(.+?)\s*:\s*(.+)', expr)
    if m:
        cond = eval_cond(m.group(1).strip(), local_vars, data_stack, heap)
        return eval_expr(m.group(2).strip(), local_vars, data_stack, heap) if cond \
               else eval_expr(m.group(3).strip(), local_vars, data_stack, heap)

    # arithmetic — + - first (lower precedence), then * / %
    for pattern, ops in [
        (r'^(.+?)\s*(\+|-)\s*(.+)$', {'+', '-'}),
        (r'^(.+?)\s*(\*|/|%)\s*(.+)$', {'*', '/', '%'}),
    ]:
        m = re.match(pattern, expr)
        if m and m.group(2) in ops:
            op = m.group(2)
            a = eval_expr(m.group(1).strip(), local_vars, data_stack, heap)
            b = eval_expr(m.group(3).strip(), local_vars, data_stack, heap)
            try:
                ia, ib = int(a), int(b)
                if op == '+': return ia + ib
                if op == '-': return ia - ib
                if op == '*': return ia * ib
                if op == '/': return ia // ib if ib != 0 else 0
                if op == '%': return ia % ib if ib != 0 else 0
            except Exception:
                pass

    return expr


def eval_cond(expr: str, local_vars: dict, data_stack: list, heap: Heap) -> bool:
    expr = expr.strip()

    if expr.startswith("!"):
        inner = expr[1:].strip()
        if re.search(r'\w+\.isEmpty\(\)', inner):
            return len(data_stack) != 0
        return not eval_cond(inner, local_vars, data_stack, heap)

    if re.search(r'!\s*\w+\.isEmpty\(\)', expr):
        return len(data_stack) != 0
    if re.search(r'\w+\.isEmpty\(\)', expr):
        return len(data_stack) == 0

    if '&&' in expr:
        parts = expr.split('&&')
        return all(eval_cond(p.strip(), local_vars, data_stack, heap) for p in parts)
    if '||' in expr:
        parts = expr.split('||')
        return any(eval_cond(p.strip(), local_vars, data_stack, heap) for p in parts)

    m = re.match(r'(.+?)\s*(==|!=|<=|>=|<|>)\s*(.+)', expr)
    if m:
        a  = eval_expr(m.group(1).strip(), local_vars, data_stack, heap)
        b  = eval_expr(m.group(3).strip(), local_vars, data_stack, heap)
        op = m.group(2)
        try:
            if op == '==': return a == b
            if op == '!=': return a != b
            a, b = int(a), int(b)
            if op == '<':  return a < b
            if op == '>':  return a > b
            if op == '<=': return a <= b
            if op == '>=': return a >= b
        except Exception:
            pass

    val = eval_expr(expr, local_vars, data_stack, heap)
    if isinstance(val, bool): return val
    if isinstance(val, int):  return val != 0
    return bool(val)


# ─────────────────────────────────────────────────────────────
#  CONTROL FLOW SIGNALS
# ─────────────────────────────────────────────────────────────

class _Return(Exception):
    def __init__(self, value=None): self.value = value

class _Break(Exception): pass
class _Continue(Exception): pass


# ─────────────────────────────────────────────────────────────
#  RECURSION TREE
# ─────────────────────────────────────────────────────────────

class TreeNode:
    _id_counter = 0

    def __init__(self, method: str, args: dict, parent_id=None):
        TreeNode._id_counter += 1
        self.id        = TreeNode._id_counter
        self.method    = method
        self.args      = {
            k: v for k, v in args.items()
            if v not in ("__DS__",)
            and not (isinstance(v, str) and v.startswith("@arr"))
        }
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

MAX_EVENTS = 6000
MAX_DEPTH  = 150


class Interpreter:
    def __init__(self, methods: dict):
        self.methods     = methods
        self.events      = []
        self.data_stack  = []
        self.call_frames = []
        self.heap        = Heap()
        self._ec         = 0
        TreeNode._id_counter = 0
        self._tree_root  = None
        self._tree_stack = []

    def _snap_frames(self):
        snap = []
        for idx, f in enumerate(self.call_frames):
            clean = {}
            for k, v in f["locals"].items():
                if k.startswith("__"): continue
                if v == "__DS__": clean[k] = "__DS__"
                elif isinstance(v, str) and v.startswith("@arr"):
                    obj = self.heap.get(v)
                    clean[k] = f"arr{obj['data']}" if obj else v
                else: clean[k] = v
            snap.append({
                "method":       f["method"],
                "locals":       clean,
                "active":       idx == len(self.call_frames) - 1,
                "line":         f.get("line"),
                "return_value": f.get("return_value"),
                "depth":        idx,
            })
        return snap

    def _snap_tree(self):
        return self._tree_root.to_dict() if self._tree_root else None

    def _snap_heap(self):
        return self.heap.snapshot()

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
            "heap":        self._snap_heap(),
            "changed_var": changed_var,
        }
        if extra:
            ev.update(extra)
        self.events.append(ev)

    def call_method(self, name: str, args: dict, depth: int = 0) -> Any:
        if depth > MAX_DEPTH:
            raise RuntimeError("Max recursion depth exceeded.")
        if name not in self.methods:
            return None

        parent_id = self._tree_stack[-1].id if self._tree_stack else None
        node = TreeNode(name, args, parent_id)
        if self._tree_root is None:
            self._tree_root = node
        elif self._tree_stack:
            self._tree_stack[-1].children.append(node)
        self._tree_stack.append(node)

        local_vars = dict(args)
        frame = {"method": name, "locals": local_vars, "line": None, "return_value": None}
        self.call_frames.append(frame)

        display_args = {
            k: v for k, v in args.items()
            if v not in ("__DS__",) and not (isinstance(v, str) and v.startswith("@"))
        }
        self.emit("call", name, 0, extra={"callee": name, "call_args": display_args})

        ret = None
        try:
            self._exec(self.methods[name], local_vars, frame, depth)
        except _Return as r:
            ret = r.value
        finally:
            frame["return_value"] = ret
            node.returned = ret
            node.done     = True
            self.emit("return", ret, frame.get("line") or 0,
                      extra={"callee": name, "return_value": ret})
            if self.call_frames and self.call_frames[-1] is frame:
                self.call_frames.pop()
            if self._tree_stack and self._tree_stack[-1] is node:
                self._tree_stack.pop()

        return ret

    def _exec(self, nodes, local_vars, frame, depth):
        i = 0
        while i < len(nodes):
            node = nodes[i]
            ln   = node["line"]
            text = node["text"]
            frame["line"] = ln
            i += 1

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

            if re.match(r'^break\s*;?\s*$', text): raise _Break()
            if re.match(r'^continue\s*;?\s*$', text): raise _Continue()

            # return;
            if re.match(r'^return\s*;?\s*$', text):
                self.emit("return_void", None, ln, extra={"callee": frame["method"]})
                raise _Return(None)

            # return expr;
            m = re.match(r'^return\s+(.+?)\s*;?\s*$', text)
            if m:
                val = eval_expr(m.group(1), local_vars, self.data_stack, self.heap)
                self.emit("return_val", val, ln,
                          extra={"callee": frame["method"], "return_value": val})
                raise _Return(val)

            # for loop
            m = re.match(r'^for\s*\((.+?);(.+?);(.+?)\)\s*\{?', text)
            if m:
                init_s, cond_s, upd_s = m.group(1).strip(), m.group(2).strip(), m.group(3).strip()
                block, i = self._collect(nodes, i, 1 if '{' in text else 0)
                self._exec_single(init_s, local_vars, frame, depth, ln)
                its = 0
                while True:
                    its += 1
                    if its > 10000: raise RuntimeError("For loop limit exceeded.")
                    cv = eval_cond(cond_s, local_vars, self.data_stack, self.heap)
                    self.emit("loop_cond", str(cv).lower(), ln,
                              extra={"condition": cond_s, "result": cv})
                    if not cv: break
                    try: self._exec(block, local_vars, frame, depth)
                    except _Break: break
                    except _Continue: pass
                    self._exec_single(upd_s, local_vars, frame, depth, ln)
                continue

            # while loop
            m = re.match(r'^while\s*\((.+?)\)\s*\{?', text)
            if m:
                cond_s = m.group(1).strip()
                block, i = self._collect(nodes, i, 1 if '{' in text else 0)
                its = 0
                while True:
                    its += 1
                    if its > 10000: raise RuntimeError("While loop limit exceeded.")
                    cv = eval_cond(cond_s, local_vars, self.data_stack, self.heap)
                    self.emit("loop_cond", str(cv).lower(), ln,
                              extra={"condition": cond_s, "result": cv})
                    if not cv: break
                    try: self._exec(block, local_vars, frame, depth)
                    except _Break: break
                    except _Continue: pass
                continue

            # if (...) {
            m = re.match(r'^if\s*\((.+?)\)\s*\{', text)
            if m:
                cond_s = m.group(1).strip()
                cv = eval_cond(cond_s, local_vars, self.data_stack, self.heap)
                self.emit("condition", str(cv).lower(), ln,
                          extra={"condition": cond_s, "result": cv})
                block, i = self._collect(nodes, i, 1)
                else_block = []
                if i < len(nodes) and re.match(r'^else\b', nodes[i]["text"]):
                    i += 1
                    else_block, i = self._collect(nodes, i, 1)
                if cv: self._exec(block, local_vars, frame, depth)
                elif else_block: self._exec(else_block, local_vars, frame, depth)
                continue

            # if(cond) single;
            m = re.match(r'^if\s*\((.+?)\)\s+(.+?)\s*;?\s*$', text)
            if m:
                cond_s = m.group(1).strip()
                body_s = m.group(2).strip()
                cv = eval_cond(cond_s, local_vars, self.data_stack, self.heap)
                self.emit("condition", str(cv).lower(), ln,
                          extra={"condition": cond_s, "result": cv})
                if cv:
                    self._exec([{"line": ln, "text": body_s}], local_vars, frame, depth)
                continue

            # int[] arr = new int[n];
            m = re.match(r'^(?:int|long|double|boolean|char)\[\]\s+(\w+)\s*=\s*new\s+\w+\[(.+?)\]\s*;?\s*$', text)
            if m:
                aname = m.group(1)
                sz = eval_expr(m.group(2), local_vars, self.data_stack, self.heap)
                try: sz = int(sz)
                except: sz = 0
                ref = self.heap.alloc_array([0]*sz, label=aname)
                local_vars[aname] = ref
                frame["locals"] = dict(local_vars)
                self.emit("heap_alloc", f"{aname}[{sz}]", ln, changed_var=aname,
                          extra={"heap_ref": ref})
                continue

            # int[] arr = {1,2,3};
            m = re.match(r'^(?:int|long|double|boolean|char)\[\]\s+(\w+)\s*=\s*\{(.+?)\}\s*;?\s*$', text)
            if m:
                aname = m.group(1)
                elems = [eval_expr(e.strip(), local_vars, self.data_stack, self.heap)
                         for e in m.group(2).split(",")]
                ref = self.heap.alloc_array(elems, label=aname)
                local_vars[aname] = ref
                frame["locals"] = dict(local_vars)
                self.emit("heap_alloc", f"{aname}{elems}", ln, changed_var=aname,
                          extra={"heap_ref": ref})
                continue

            # arr[i] = expr;
            m = re.match(r'^(\w+)\[(.+?)\]\s*=\s*(.+?)\s*;?\s*$', text)
            if m:
                aname = m.group(1)
                idx   = eval_expr(m.group(2), local_vars, self.data_stack, self.heap)
                val   = eval_expr(m.group(3), local_vars, self.data_stack, self.heap)
                ref   = local_vars.get(aname)
                if ref and isinstance(ref, str) and ref.startswith("@arr"):
                    try:
                        self.heap.set_index(ref, int(idx), val)
                        frame["locals"] = dict(local_vars)
                        self.emit("arr_write", val, ln, changed_var=f"{aname}[{idx}]",
                                  extra={"heap_ref": ref, "arr_idx": int(idx), "arr_val": val})
                    except: pass
                continue

            # st.push(expr)
            m = re.match(r'^\w+\.push\((.+?)\)\s*;?\s*$', text)
            if m:
                val = eval_expr(m.group(1).strip(), local_vars, self.data_stack, self.heap)
                self.data_stack.append(val)
                frame["locals"] = dict(local_vars)
                self.emit("push", val, ln)
                continue

            # TYPE var = st.pop()
            m = re.match(r'^(?:int|long|double|var|Integer)\s+(\w+)\s*=\s*\w+\.pop\(\)\s*;?\s*$', text)
            if m:
                vname  = m.group(1)
                popped = self.data_stack.pop() if self.data_stack else None
                local_vars[vname] = popped
                frame["locals"] = dict(local_vars)
                self.emit("pop", popped, ln, changed_var=vname)
                continue

            # st.pop() bare
            if re.match(r'^\w+\.pop\(\)\s*;?\s*$', text):
                popped = self.data_stack.pop() if self.data_stack else None
                frame["locals"] = dict(local_vars)
                self.emit("pop", popped, ln)
                continue

            # Stack init
            m = re.match(
                r'^(?:Stack|Queue|Deque|LinkedList|ArrayDeque)<\w+>\s+(\w+)'
                r'\s*=\s*new\s+\w+<[^>]*>\(\)\s*;?\s*$', text)
            if m:
                vname = m.group(1)
                local_vars[vname] = "__DS__"
                frame["locals"] = dict(local_vars)
                self.emit("init", vname, ln, changed_var=vname)
                continue

            # ★ TYPE var = methodCall(args);  — captures return value
            m = re.match(
                r'^(?:int|long|double|boolean|String|var|char|Integer)\s+(\w+)\s*=\s*(\w+)\s*\(([^;]*)\)\s*;?\s*$',
                text)
            if m:
                vname    = m.group(1)
                callee   = m.group(2)
                raw_args = (m.group(3) or "").strip()
                if callee in self.methods and callee not in SKIP_NAMES:
                    resolved = self._resolve_args(callee, raw_args, local_vars)
                    ret_val  = self.call_method(callee, resolved, depth + 1)
                    local_vars[vname] = ret_val
                    frame["locals"]   = dict(local_vars)
                    self.emit("assign", f"{vname} = {ret_val}", ln, changed_var=vname,
                              extra={"from_call": callee})
                else:
                    val = eval_expr(f"{callee}({raw_args})", local_vars, self.data_stack, self.heap)
                    local_vars[vname] = val
                    frame["locals"]   = dict(local_vars)
                    self.emit("assign", f"{vname} = {val}", ln, changed_var=vname)
                continue

            # TYPE var = expr;
            m = re.match(
                r'^(?:int|long|double|boolean|String|var|char|Integer)\s+(\w+)\s*=\s*(.+?)\s*;?\s*$',
                text)
            if m:
                vname = m.group(1)
                val   = eval_expr(m.group(2), local_vars, self.data_stack, self.heap)
                local_vars[vname] = val
                frame["locals"]   = dict(local_vars)
                self.emit("assign", f"{vname} = {val}", ln, changed_var=vname)
                continue

            # var++  var--
            m = re.match(r'^(\w+)(\+\+|--)\s*;?\s*$', text)
            if m:
                vname = m.group(1)
                if vname in local_vars:
                    try: nv = int(local_vars[vname]) + (1 if m.group(2) == "++" else -1)
                    except: nv = local_vars[vname]
                    local_vars[vname] = nv
                    frame["locals"]   = dict(local_vars)
                    self.emit("assign", f"{vname} = {nv}", ln, changed_var=vname)
                continue

            # var op= expr
            m = re.match(r'^(\w+)\s*(\+=|-=|\*=|/=|%=)\s*(.+?)\s*;?\s*$', text)
            if m:
                vname, op = m.group(1), m.group(2)
                if vname in local_vars:
                    rhs = eval_expr(m.group(3), local_vars, self.data_stack, self.heap)
                    try:
                        lv, rv = int(local_vars[vname]), int(rhs)
                        nv = (lv+rv if op=='+=' else lv-rv if op=='-=' else
                              lv*rv if op=='*=' else lv//rv if op=='/=' else lv%rv)
                    except: nv = local_vars[vname]
                    local_vars[vname] = nv
                    frame["locals"]   = dict(local_vars)
                    self.emit("assign", f"{vname} = {nv}", ln, changed_var=vname)
                continue

            # var = expr (reassign)
            m = re.match(r'^(\w+)\s*=\s*(.+?)\s*;?\s*$', text)
            if m:
                vname = m.group(1)
                if vname in local_vars:
                    val = eval_expr(m.group(2), local_vars, self.data_stack, self.heap)
                    local_vars[vname] = val
                    frame["locals"]   = dict(local_vars)
                    self.emit("assign", f"{vname} = {val}", ln, changed_var=vname)
                    continue

            # bare method call
            m = re.match(r'^(\w+)\s*\(([^;]*)\)\s*;?\s*$', text)
            if m:
                callee   = m.group(1)
                raw_args = (m.group(2) or "").strip()
                if callee in self.methods and callee not in SKIP_NAMES:
                    resolved = self._resolve_args(callee, raw_args, local_vars)
                    self.call_method(callee, resolved, depth + 1)
                continue

    def _exec_single(self, stmt: str, local_vars, frame, depth, ln):
        stmt = stmt.strip().rstrip(";")
        m = re.match(r'^(?:int|long|double|boolean|var)\s+(\w+)\s*=\s*(.+)$', stmt)
        if m:
            vname = m.group(1)
            val   = eval_expr(m.group(2), local_vars, self.data_stack, self.heap)
            local_vars[vname] = val
            frame["locals"]   = dict(local_vars)
            self.emit("assign", f"{vname} = {val}", ln, changed_var=vname)
            return
        m = re.match(r'^(\w+)\s*=\s*(.+)$', stmt)
        if m and m.group(1) in local_vars:
            val = eval_expr(m.group(2), local_vars, self.data_stack, self.heap)
            local_vars[m.group(1)] = val
            frame["locals"] = dict(local_vars)
            self.emit("assign", f"{m.group(1)} = {val}", ln, changed_var=m.group(1))
            return
        m = re.match(r'^(\w+)(\+\+|--)$', stmt)
        if m and m.group(1) in local_vars:
            vname = m.group(1)
            try: nv = int(local_vars[vname]) + (1 if m.group(2) == "++" else -1)
            except: nv = local_vars[vname]
            local_vars[vname] = nv
            frame["locals"]   = dict(local_vars)
            self.emit("assign", f"{vname} = {nv}", ln, changed_var=vname)
            return
        m = re.match(r'^(\w+)\s*(\+=|-=|\*=|/=|%=)\s*(.+)$', stmt)
        if m and m.group(1) in local_vars:
            vname, op = m.group(1), m.group(2)
            rhs = eval_expr(m.group(3), local_vars, self.data_stack, self.heap)
            try:
                lv, rv = int(local_vars[vname]), int(rhs)
                nv = (lv+rv if op=='+=' else lv-rv if op=='-=' else
                      lv*rv if op=='*=' else lv//rv if op=='/=' else lv%rv)
            except: nv = local_vars[vname]
            local_vars[vname] = nv
            frame["locals"]   = dict(local_vars)
            self.emit("assign", f"{vname} = {nv}", ln, changed_var=vname)

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

    def _resolve_args(self, callee: str, raw_args: str, local_vars: dict) -> dict:
        if callee not in self.methods:
            return {}
        sig = self.methods[callee][0]["text"]
        pm  = re.search(r'\(([^)]*)\)', sig)
        if not pm or not pm.group(1).strip():
            return {}
        param_names = []
        for p in pm.group(1).split(","):
            p = re.sub(r'<[^>]+>', '', p).strip()
            p = re.sub(r'\[\]', '', p).strip()
            toks = p.split()
            if toks:
                param_names.append(toks[-1])
        call_args = [a.strip() for a in raw_args.split(",") if a.strip()]
        result = {}
        for idx, pname in enumerate(param_names):
            if idx >= len(call_args): break
            arg = call_args[idx]
            if arg in local_vars and local_vars[arg] == "__DS__":
                result[pname] = "__DS__"
            elif arg in local_vars and isinstance(local_vars[arg], str) and local_vars[arg].startswith("@arr"):
                result[pname] = local_vars[arg]
            else:
                result[pname] = eval_expr(arg, local_vars, self.data_stack, self.heap)
        return result


# ─────────────────────────────────────────────────────────────
#  RUN
# ─────────────────────────────────────────────────────────────

def run_code(code: str) -> dict:
    methods = parse_methods(code)
    if not methods:
        return {"success": False, "error": "No methods found.", "events": []}
    interp = Interpreter(methods)
    entry  = "main" if "main" in methods else next(iter(methods))
    try:
        interp.call_method(entry, {}, depth=0)
    except RuntimeError as e:
        return {"success": False, "error": str(e), "events": interp.events}
    return {"success": True, "events": interp.events, "total_steps": len(interp.events)}


@app.post("/execute")
def execute_endpoint(data: dict):
    code: str = data.get("code", "")
    try:
        result = run_code(code)
    except Exception as e:
        return {"success": False, "error": str(e), "events": []}
    return result