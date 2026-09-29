#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Monitor de progreso para el pipeline del Dashboard MRO.

Genera, en vivo, un progress.html que se auto-refresca (abrelo en el navegador)
con: barra de progreso %, paso actual, tiempo transcurrido, ETA (estimado por
historial de corridas), y si algo falla, MARCA el paso exacto y el error.

Se usa desde run_all.py:

    from progress import Progress
    pr = Progress([("far","Descargar FAR"), ("knime","KNIME")], OUT_DIR)
    pr.start("far"); ...; pr.done("far")           # o pr.fail("far", "mensaje")
    pr.finish()

No necesita servidor: el HTML lleva <meta refresh> y se reescribe en cada cambio.
"""
from __future__ import annotations

import datetime as dt
import html
import json
import time
from pathlib import Path

_PENDING, _RUNNING, _DONE, _FAILED, _SKIPPED = "pending", "running", "done", "failed", "skipped"

_DOT = {_PENDING: "#6b7280", _RUNNING: "#3b82f6", _DONE: "#22c55e",
        _FAILED: "#ef4444", _SKIPPED: "#a78bfa"}
_WORD = {_PENDING: "en espera", _RUNNING: "en curso", _DONE: "OK",
         _FAILED: "FALLO", _SKIPPED: "omitido"}


def _fmt(sec: float) -> str:
    sec = int(max(0, sec))
    h, r = divmod(sec, 3600)
    m, s = divmod(r, 60)
    if h:
        return f"{h}h {m}m {s}s"
    if m:
        return f"{m}m {s}s"
    return f"{s}s"


class Progress:
    def __init__(self, steps, out_dir, title="Dashboard MRO — Run All",
                 history_name=".progress_history.json"):
        self.steps = [{"key": k, "label": l, "status": _PENDING,
                       "t0": None, "t1": None, "error": ""} for k, l in steps]
        self.out_dir = Path(out_dir)
        self.out_dir.mkdir(parents=True, exist_ok=True)
        self.title = title
        self.started = time.time()
        self.finished = False
        self.history_path = self.out_dir / history_name
        self.history = self._load_history()
        self.render()

    # ---------- historial (para ETA) ----------
    def _load_history(self) -> dict:
        try:
            return json.loads(self.history_path.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            return {}

    def _avg(self, key: str) -> float | None:
        vals = self.history.get(key) or []
        return sum(vals) / len(vals) if vals else None

    def _save_history(self) -> None:
        for s in self.steps:
            if s["status"] == _DONE and s["t0"] and s["t1"]:
                self.history.setdefault(s["key"], [])
                self.history[s["key"]].append(round(s["t1"] - s["t0"], 1))
                self.history[s["key"]] = self.history[s["key"]][-10:]  # ultimas 10
        try:
            self.history_path.write_text(json.dumps(self.history), encoding="utf-8")
        except Exception:  # noqa: BLE001
            pass

    # ---------- API ----------
    def _find(self, key):
        for s in self.steps:
            if s["key"] == key:
                return s
        raise KeyError(key)

    def start(self, key):
        s = self._find(key)
        s["status"] = _RUNNING
        s["t0"] = time.time()
        self.render()

    def done(self, key):
        s = self._find(key)
        s["status"] = _DONE
        s["t1"] = time.time()
        self.render()

    def skip(self, key, msg=""):
        s = self._find(key)
        s["status"] = _SKIPPED
        s["t0"] = s["t0"] or time.time()
        s["t1"] = time.time()
        s["error"] = msg
        self.render()

    def fail(self, key, error=""):
        s = self._find(key)
        s["status"] = _FAILED
        s["t1"] = time.time()
        s["error"] = str(error)
        self.render()

    def finish(self):
        self.finished = True
        self._save_history()
        self.render()

    # ---------- calculo ----------
    def _elapsed(self, s) -> float:
        if not s["t0"]:
            return 0.0
        return (s["t1"] or time.time()) - s["t0"]

    def _fraction_and_eta(self):
        total = len(self.steps)
        done_like = sum(1 for s in self.steps if s["status"] in (_DONE, _SKIPPED, _FAILED))
        frac_running = 0.0
        eta = 0.0
        any_eta = False
        for s in self.steps:
            avg = self._avg(s["key"])
            if s["status"] == _RUNNING:
                el = self._elapsed(s)
                if avg:
                    frac_running = min(0.95, el / avg) if avg > 0 else 0
                    eta += max(0.0, avg - el)
                    any_eta = True
            elif s["status"] == _PENDING:
                if avg:
                    eta += avg
                    any_eta = True
        pct = (done_like + frac_running) / total * 100 if total else 0
        if self.finished:
            pct = 100
        return pct, (eta if any_eta and not self.finished else None)

    # ---------- render ----------
    def render(self):
        pct, eta = self._fraction_and_eta()
        elapsed_total = (time.time() - self.started) if not self.finished else \
            (max((s["t1"] or self.started) for s in self.steps) - self.started)

        failed = next((s for s in self.steps if s["status"] == _FAILED), None)
        running = next((s for s in self.steps if s["status"] == _RUNNING), None)

        if failed:
            headline, hcolor = "Se detuvo por un error", "#ef4444"
        elif self.finished:
            headline, hcolor = "Completado", "#22c55e"
        elif running:
            headline, hcolor = f"En curso: {running['label']}", "#3b82f6"
        else:
            headline, hcolor = "Iniciando…", "#3b82f6"

        rows = []
        for i, s in enumerate(self.steps, 1):
            dur = _fmt(self._elapsed(s)) if s["t0"] else "—"
            extra = f'<div class="err">{html.escape(s["error"])}</div>' if s["error"] else ""
            rows.append(f"""
      <div class="step {s['status']}">
        <span class="dot" style="background:{_DOT[s['status']]}"></span>
        <span class="num">{i}</span>
        <span class="lbl">{html.escape(s['label'])}</span>
        <span class="st">{_WORD[s['status']]}</span>
        <span class="dur">{dur}</span>
        {extra}
      </div>""")

        eta_txt = _fmt(eta) if eta is not None else ("—" if self.finished else "estimando…")
        refresh = "" if self.finished or failed else '<meta http-equiv="refresh" content="2">'
        stamp = dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        doc = f"""<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">{refresh}
<title>{html.escape(self.title)}</title>
<style>
  :root {{ color-scheme: dark; }}
  * {{ box-sizing: border-box; }}
  body {{ margin:0; background:#0b0f17; color:#e5e7eb;
         font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif; }}
  .wrap {{ max-width:760px; margin:0 auto; padding:24px 16px; }}
  h1 {{ font-size:19px; margin:0 0 2px; }}
  .sub {{ color:#9ca3af; font-size:13px; margin-bottom:18px; }}
  .headline {{ font-size:16px; font-weight:600; margin:0 0 12px; color:{hcolor}; }}
  .bar {{ height:16px; background:#1f2937; border-radius:999px; overflow:hidden; }}
  .fill {{ height:100%; width:{pct:.1f}%; background:{hcolor}; transition:width .4s; }}
  .meta {{ display:flex; justify-content:space-between; margin:8px 2px 22px;
           color:#9ca3af; font-size:13px; }}
  .meta b {{ color:#e5e7eb; }}
  .step {{ display:grid; grid-template-columns:auto 22px 1fr auto auto; align-items:center;
           gap:10px; padding:11px 12px; border:1px solid #1f2937; border-radius:10px;
           margin-bottom:8px; background:#0f1521; }}
  .step.running {{ border-color:#3b82f6; }}
  .step.failed  {{ border-color:#ef4444; }}
  .dot {{ width:11px; height:11px; border-radius:50%; }}
  .num {{ color:#6b7280; font-variant-numeric:tabular-nums; }}
  .lbl {{ font-weight:500; }}
  .st  {{ color:#9ca3af; font-size:12.5px; text-transform:uppercase; letter-spacing:.4px; }}
  .dur {{ color:#9ca3af; font-variant-numeric:tabular-nums; font-size:13px; }}
  .err {{ grid-column:3 / -1; color:#fca5a5; font-size:12.5px; margin-top:4px;
          white-space:pre-wrap; word-break:break-word; }}
  .foot {{ color:#6b7280; font-size:12px; margin-top:16px; }}
</style></head><body><div class="wrap">
  <h1>{html.escape(self.title)}</h1>
  <div class="sub">Actualizado: {stamp}</div>
  <div class="headline">{html.escape(headline)}</div>
  <div class="bar"><div class="fill"></div></div>
  <div class="meta">
    <span>Progreso: <b>{pct:.0f}%</b></span>
    <span>Transcurrido: <b>{_fmt(elapsed_total)}</b></span>
    <span>Falta (aprox): <b>{eta_txt}</b></span>
  </div>
  {''.join(rows)}
  <div class="foot">Esta página se actualiza sola. Si un paso falla, aparece en rojo con el detalle.</div>
</div></body></html>"""

        tmp = self.out_dir / "progress.html.tmp"
        tmp.write_text(doc, encoding="utf-8")
        tmp.replace(self.out_dir / "progress.html")

        # JSON legible por otros procesos.
        try:
            (self.out_dir / "progress.json").write_text(json.dumps({
                "title": self.title, "pct": round(pct, 1), "finished": self.finished,
                "failed": bool(failed), "elapsed_s": round(elapsed_total, 1),
                "eta_s": round(eta, 1) if eta is not None else None,
                "steps": [{"key": s["key"], "label": s["label"], "status": s["status"],
                           "seconds": round(self._elapsed(s), 1), "error": s["error"]}
                          for s in self.steps],
                "timestamp": stamp,
            }, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception:  # noqa: BLE001
            pass


if __name__ == "__main__":
    # Demo rapida (simula una corrida) para ver el HTML.
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    pr = Progress([("far", "Descargar FAR (5 CSV)"), ("ext1", "Extractor Labelbox"),
                   ("ext2", "Extractor DC1B"), ("knime", "KNIME (batch)")], out,
                  title="DEMO — Dashboard MRO")
    for k in ["far", "ext1", "ext2", "knime"]:
        pr.start(k)
        time.sleep(1)
        pr.done(k)
    pr.finish()
    print("HTML escrito en", Path(out) / "progress.html")
