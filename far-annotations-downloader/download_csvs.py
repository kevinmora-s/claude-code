#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FAR Annotations - Descarga automatica de CSVs desde la pagina de Audit.

Que hace:
  1. Abre la pagina de Audit en un navegador dedicado (perfil propio, reutiliza tu sesion).
  2. Para cada uno de los 5 queues objetivo:
       - Despliega el Annotation type correspondiente.
       - Entra al queue correcto (distingue Job Queue vs Review Queue).
       - Da clic en "Export CSV" y ESPERA a que el archivo se genere (pueden ser 7-15 min).
       - Guarda el CSV en su carpeta, con el nombre estandarizado.

Formato de nombre:
  - Job Queues   -> Annotations-<MMDDYY>.csv   (ej. Annotations-91726.csv el 17/sep/2026)
  - Review Queues-> Audits-<MMDDYY>.csv         (ej. Audits-91726.csv)
  Mes SIN cero a la izquierda, dia con 2 digitos, anio con 2 digitos.

Uso tipico (en la PC de trabajo):
  python download_csvs.py

Opciones utiles:
  python download_csvs.py --discover     # solo lista los queues/enlaces (para afinar)
  python download_csvs.py --only 3       # corre solo el objetivo #3 (1..5) para probar
  python download_csvs.py --date 2026-09-17   # forzar una fecha (pruebas / backfill)
  python download_csvs.py --headless     # sin ventana visible (solo si ya funciona bien)

Requisitos (una sola vez):
  pip install playwright
  playwright install chromium
"""
from __future__ import annotations

import argparse
import datetime as dt
import glob
import json
import logging
import os
import re
import shutil
import sys
import time
from pathlib import Path

from playwright.sync_api import (
    sync_playwright,
    Page,
    TimeoutError as PWTimeout,
)

# ============================ CONFIGURACION ============================
# Ajusta SOLO estas variables si algo cambia. El resto del script no hace falta tocarlo.

AUDIT_URL = "https://far-annotations.gamma.harmony.a2z.com/far-annotations/audit"

# Navegador a controlar. "msedge" = Microsoft Edge instalado (recomendado, por Midway).
# Otras opciones: "chrome" (Google Chrome instalado) o "" (Chromium de Playwright).
BROWSER_CHANNEL = "msedge"

# Carpeta base. Cada archivo se guarda en BASE_DIR / <folder>.
# Se AUTODETECTA igual que lo hace KNIME (nodo #44): el disco W: (Dashboard_k2)
# puede estar en "My Documents" (creador) o en "Shared With Me" (equipo). Asi el
# script funciona en cualquier equipo sin editar el codigo. Se puede forzar con
# la variable de entorno FAR_CSV_BASE.
def _resolve_csvs_base() -> Path:
    env = os.environ.get("FAR_CSV_BASE")
    if env:
        return Path(env)
    candidates = (
        [r"W:\My Documents\Dashboard_k2"]
        + glob.glob(r"W:\Shared With Me\*\Dashboard_k2")
        + glob.glob(r"W:\Shared With Me\*\*\Dashboard_k2")
    )
    for c in candidates:
        if os.path.isdir(c):
            return Path(c) / "Far-Annotation Data" / "CSVs"
    return Path(r"W:\My Documents\Dashboard_k2\Far-Annotation Data\CSVs")  # fallback (creador)


BASE_DIR = _resolve_csvs_base()

# Perfil de navegador dedicado (guarda tu sesion de Midway para reutilizarla).
PROFILE_DIR = Path.home() / ".far_annotations_pw_profile"

# Carpeta de Descargas de Edge (fallback si la captura por CDP viene vacia).
# Se puede forzar con la variable de entorno FAR_DOWNLOADS_DIR.
DOWNLOADS_DIR = Path(os.environ.get("FAR_DOWNLOADS_DIR", str(Path.home() / "Downloads")))

# Cuanto esperar (segundos) a que completes el login de Midway en la ventana.
# Mas holgado para las corridas programadas (te da tiempo de tocar la YubiKey).
AUTH_WAIT_S = 600  # 10 minutos

# Tiempo maximo de espera a que se genere/descargue cada CSV.
DOWNLOAD_TIMEOUT_MS = 25 * 60 * 1000  # 25 minutos

# Reintentos por archivo si algo falla (sesion caida, timeout, etc.).
RETRIES_PER_FILE = 2  # => hasta 3 intentos por archivo

# Rango de la nueva opcion "Timeline" del Export.
#   Valores: "24h" | "7d" | "30d" | "90d" | "all"
# Default para las corridas recurrentes = 30d. El baseline usa --timeline all.
# (El 'clic' al selector en la pagina se cablea cuando se confirme el control.)
TIMELINE_RANGE = "30d"

# Los 5 archivos a descargar. Cada cola se abre DIRECTO por su 'jobtype' (ID),
# lo que evita depender de menus/tablas. 'folder' = subcarpeta destino.
# 'prefix' = Annotations (Job Queues) o Audits (Review Queues).
TARGETS = [
    {"jobtype": "01M0B6047EB8Z8WN50S8AX8G5J", "folder": "XDOF BBOX",        "prefix": "Annotations", "label": "XDoF Bbox (Job)"},
    {"jobtype": "01M00PFQHJWQ2ME8QX931XMP3C", "folder": "PCS Concept BBOX", "prefix": "Annotations", "label": "PCS Concept BBox (Job)"},
    {"jobtype": "01M0B60442P8CN967GN3RHFRRY", "folder": "XDOF BBOX",        "prefix": "Audits",      "label": "XDoF Bbox (Review)"},
    {"jobtype": "01M00PFQBJR4PVHBDMNWJ1KAGB", "folder": "PCS Concept BBOX", "prefix": "Audits",      "label": "PCS Concept BBox (Review)"},
    {"jobtype": "01KYNB9KKHMS3G7S7NDHXQFPBT", "folder": "Polarity",         "prefix": "Annotations", "label": "PCS Concept Polarity (Job)"},
]

# Tipos que expande el modo --discover (solo para diagnostico).
DISCOVERY_TYPES = ["PCS Concept BBox", "PCS Concept Polarity"]
# ======================================================================

SCRIPT_DIR = Path(__file__).resolve().parent
DEBUG_DIR = SCRIPT_DIR / "debug"

log = logging.getLogger("far")


def setup_logging() -> None:
    DEBUG_DIR.mkdir(parents=True, exist_ok=True)
    fmt = "%(asctime)s  %(levelname)-7s %(message)s"
    logging.basicConfig(level=logging.INFO, format=fmt, datefmt="%H:%M:%S")
    fh = logging.FileHandler(DEBUG_DIR / "run.log", encoding="utf-8")
    fh.setFormatter(logging.Formatter(fmt, datefmt="%Y-%m-%d %H:%M:%S"))
    logging.getLogger().addHandler(fh)


def date_tag(d: dt.date | None = None) -> str:
    """Devuelve MMDDYY con mes sin cero, dia 2 digitos, anio 2 digitos. 17/09/2026 -> 91726."""
    d = d or dt.date.today()
    return f"{d.month}{d.day:02d}{d.year % 100:02d}"


def dump_debug(page: Page, label: str) -> None:
    """Guarda screenshot + HTML para diagnosticar cuando algo falla."""
    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    base = DEBUG_DIR / f"{stamp}_{label}"
    try:
        page.screenshot(path=str(base) + ".png", full_page=True)
        (Path(str(base) + ".html")).write_text(page.content(), encoding="utf-8")
        log.info("  [debug] guardado %s.png / .html", base.name)
    except Exception as exc:  # noqa: BLE001
        log.warning("  [debug] no se pudo guardar diagnostico: %s", exc)


def _authed_url(url: str) -> bool:
    """True si estamos ya dentro de la app (no en Midway ni en la pantalla de login)."""
    u = url.lower()
    return ("far-annotations" in u) and ("midway" not in u) and ("_login" not in u)


def auth_problem(page: Page) -> str | None:
    """Detecta si la pagina esta en un estado de sesion caida. Devuelve el motivo o None."""
    try:
        u = (page.url or "").lower()
        if "midway" in u or "_login" in u:
            return "redirigido a Midway (sesion caida): requiere re-login con YubiKey"
        body = page.locator("body").inner_text(timeout=3000)
        if "AEA extension not installed" in body:
            return "AEA no activa / sesion caida: requiere re-login con YubiKey"
    except Exception:  # noqa: BLE001
        pass
    return None


def goto_authed(page: Page, url: str) -> None:
    """Navega a 'url'. Si redirige a Midway, espera a que el usuario inicie sesion."""
    page.goto(url, wait_until="domcontentloaded")
    deadline = time.time() + AUTH_WAIT_S
    warned = False
    while not _authed_url(page.url):
        if not warned:
            log.warning("=" * 60)
            log.warning("INICIA SESION (Midway) en la ventana del navegador.")
            log.warning("Usa tu PIN + llave de seguridad. Esperando hasta %d s...", AUTH_WAIT_S)
            log.warning("=" * 60)
            warned = True
        if time.time() > deadline:
            raise RuntimeError("no se completo el login de Midway a tiempo")
        page.wait_for_timeout(2000)
    if warned:
        log.info("Sesion iniciada. Continuando...")
    page.wait_for_timeout(1200)


def goto_audit(page: Page) -> None:
    """Va a la pagina principal de Audit (usado por --discover)."""
    goto_authed(page, AUDIT_URL)
    page.wait_for_timeout(300)


def ensure_expanded(page: Page, type_name: str, queue_hint: str | None = None) -> None:
    """Abre (despliega) el Annotation type indicado en la lista de Audit."""
    goto_audit(page)

    title = page.get_by_text(type_name, exact=True).first
    title.wait_for(state="visible", timeout=30_000)
    title.scroll_into_view_if_needed()

    for _ in range(3):
        if queue_hint:
            link = page.get_by_role("link", name=queue_hint, exact=True)
            if link.count() > 0 and link.first.is_visible():
                return  # ya esta desplegado
        title.click()
        page.wait_for_timeout(2000)
    # Si no se confirmo por queue_hint, seguimos igual y dejamos que la verificacion posterior decida.


def find_export_button(page: Page):
    """Devuelve el localizador del boton 'Export CSV'."""
    btn = page.get_by_role("button", name=re.compile("export.*csv", re.I))
    if btn.count() == 0:
        btn = page.get_by_text(re.compile("export.*csv", re.I))
    return btn


# Etiquetas de la barra "Dates:" del Export (24 h / 7 d / 30 d / 90 d / All).
TIMELINE_LABELS = {"24h": r"24\s*h", "7d": r"7\s*d", "30d": r"30\s*d", "90d": r"90\s*d", "all": r"All"}


def select_timeline(page: Page, range_key: str) -> None:
    """Selecciona el rango en la barra 'Dates:' antes de exportar.

    Se ancla al boton 'Custom' (unico de esa barra) para no confundirse con el
    'All' de la barra de STATUS. Best-effort: si falla, avisa (para 30d el
    default ya es 30d, asi que no rompe).
    """
    pat = TIMELINE_LABELS.get(range_key)
    if not pat:
        return
    try:
        anchor = page.get_by_role("button", name=re.compile(r"^\s*Custom\s*$", re.I)).last
        bar = anchor.locator("xpath=ancestor::*[1]")
    except Exception:  # noqa: BLE001
        bar = page
    target = bar.get_by_role("button", name=re.compile(rf"^\s*{pat}\s*$", re.I))
    if target.count() == 0:
        target = bar.get_by_text(re.compile(rf"^\s*{pat}\s*$", re.I))
    try:
        target.first.click()
        page.wait_for_timeout(1500)  # dar tiempo a que recargue las metricas del rango
        log.info("  Timeline seleccionado: %s", range_key)
    except Exception as exc:  # noqa: BLE001
        log.warning("  no pude seleccionar el Timeline '%s' (%s). Sigo con el rango visible.",
                    range_key, exc)


def open_queue(page: Page, target: dict) -> bool:
    """Abre DIRECTO la pagina de detalle de la cola por su jobtype ID."""
    queue_url = f"{AUDIT_URL}/jobtype/{target['jobtype']}"
    log.info("  Abriendo: %s", queue_url)
    goto_authed(page, queue_url)

    # La pagina de detalle esta lista cuando aparece el boton Export CSV.
    btn = find_export_button(page)
    try:
        btn.first.wait_for(state="visible", timeout=20_000)
    except PWTimeout:
        log.error("  no encontre el boton 'Export CSV' en esta pagina")
        dump_debug(page, f"sin_export_{target['jobtype']}")
        return False

    # Registrar el titulo para verificar que es la cola correcta.
    try:
        h1 = page.get_by_role("heading", name=re.compile("Audit:", re.I)).first
        h1.wait_for(timeout=5_000)
        log.info("  Titulo de la pagina: %s", (h1.inner_text() or "").strip())
    except Exception:  # noqa: BLE001
        pass
    return True


def _size(p: Path) -> int:
    try:
        return p.stat().st_size if p.exists() else 0
    except Exception:  # noqa: BLE001
        return 0


def _wait_nonzero(p: Path, timeout: float = 120) -> int:
    """Espera a que el archivo tenga tamano > 0 y estable (W: sincronizado puede
    reportar 0 justo despues de guardar). Devuelve el tamano final en bytes."""
    end = time.time() + timeout
    while time.time() < end:
        s = _size(p)
        if s > 0:
            time.sleep(1.5)                 # confirmar que no sigue creciendo/sincronizando
            if _size(p) == s:
                return s
        else:
            time.sleep(1.5)
    return _size(p)


def _newest_download_after(after_ts: float):
    """Archivo .csv mas reciente en DOWNLOADS_DIR, terminado (no .crdownload) y >0."""
    try:
        cands = []
        for p in DOWNLOADS_DIR.glob("*.csv"):
            if Path(str(p) + ".crdownload").exists():
                continue
            st = p.stat()
            if st.st_size > 0 and st.st_mtime >= after_ts - 3:
                cands.append(p)
        return max(cands, key=lambda q: q.stat().st_mtime) if cands else None
    except Exception:  # noqa: BLE001
        return None


def export_csv(page: Page, dest: Path) -> None:
    """Clic en 'Export CSV' y guarda el archivo en 'dest'. Robusto ante CDP (0 KB)."""
    dest.parent.mkdir(parents=True, exist_ok=True)

    # Seleccionar el rango del Timeline (Dates) antes de exportar.
    select_timeline(page, TIMELINE_RANGE)

    btn = find_export_button(page)
    minutes = DOWNLOAD_TIMEOUT_MS // 60_000
    log.info("  clic en 'Export CSV'; esperando la descarga (hasta %d min)...", minutes)
    t_click = time.time()
    with page.expect_download(timeout=DOWNLOAD_TIMEOUT_MS) as dl_info:
        btn.first.click()
    download = dl_info.value

    if dest.exists():
        try:
            dest.unlink()  # reemplazar el del dia
        except Exception:  # noqa: BLE001
            pass

    # --- Estrategia 1: save_as de Playwright (espera a que W: refleje el tamano) ---
    try:
        download.save_as(str(dest))
    except Exception as exc:  # noqa: BLE001
        log.warning("  save_as fallo: %s", exc)
    size = _wait_nonzero(dest, timeout=120)   # W: sincronizado puede tardar en reportar >0
    log.info("  [diag] sugerido=%s | save_as -> %.1f KB",
             getattr(download, "suggested_filename", "?"), size / 1024)

    # --- Estrategia 2: copiar desde el temp de Playwright ---
    if size == 0:
        try:
            tp = download.path()
            tsz = _size(Path(tp)) if tp else 0
            log.info("  [diag] temp Playwright=%s (%.1f KB)", tp, tsz / 1024)
            if tp and tsz > 0:
                shutil.copyfile(tp, dest)
        except Exception as exc:  # noqa: BLE001
            log.warning("  copiar temp fallo: %s", exc)
        size = _wait_nonzero(dest, timeout=30)

    # --- Estrategia 3: tomar el archivo real de la carpeta de Descargas de Edge ---
    if size == 0:
        log.info("  [diag] buscando el archivo en Descargas: %s", DOWNLOADS_DIR)
        deadline = time.time() + 120
        found = None
        while time.time() < deadline:
            found = _newest_download_after(t_click)
            if found:
                # esperar a que termine de escribirse (tamano estable)
                s0 = found.stat().st_size
                time.sleep(2)
                if found.stat().st_size == s0:
                    break
            time.sleep(2)
        if found:
            log.info("  [diag] encontrado en Descargas: %s (%.1f KB)",
                     found.name, found.stat().st_size / 1024)
            try:
                shutil.move(str(found), str(dest))
            except Exception as exc:  # noqa: BLE001
                log.warning("  mover desde Descargas fallo: %s", exc)
            size = _size(dest)

    if size == 0:
        raise ValueError("descarga vacia (0 KB): el archivo no se guardo con contenido")

    log.info("  OK  guardado: %s  (%.1f KB)", dest, size / 1024)


def run_discovery(page: Page) -> None:
    """Solo lista los enlaces visibles bajo cada tipo objetivo (para afinar selectores)."""
    for type_name in DISCOVERY_TYPES:
        log.info("=== Desplegando: %s ===", type_name)
        ensure_expanded(page, type_name)
        page.wait_for_timeout(1500)
        for a in page.get_by_role("link").all():
            try:
                txt = (a.inner_text() or "").strip()
                href = a.get_attribute("href") or ""
            except Exception:  # noqa: BLE001
                continue
            if txt:
                print(f"  '{txt}'  ->  {href}")
    dump_debug(page, "discovery")


def main() -> int:
    global TIMELINE_RANGE
    ap = argparse.ArgumentParser(description="Descarga automatica de CSVs de FAR Annotations Audit.")
    ap.add_argument("--headless", action="store_true", help="Sin ventana visible (solo con --no-attach).")
    ap.add_argument("--no-attach", dest="attach", action="store_false",
                    help="NO conectarse a tu Edge; abrir un navegador propio (no suele servir por Midway/AEA).")
    ap.set_defaults(attach=True)  # por defecto: conectarse a TU Edge (launch_edge_debug.bat)
    ap.add_argument("--cdp", type=str, default="http://127.0.0.1:9222",
                    help="URL de depuracion del Edge (por defecto 127.0.0.1:9222).")
    ap.add_argument("--discover", action="store_true", help="Solo listar queues/enlaces y salir.")
    ap.add_argument("--only", type=int, metavar="N", help="Correr solo el objetivo N (1..%d)." % len(TARGETS))
    ap.add_argument("--date", type=str, metavar="YYYY-MM-DD", help="Forzar fecha (para calcular la WW).")
    ap.add_argument("--timeline", type=str, choices=["24h", "7d", "30d", "90d", "all"],
                    help="Rango del Timeline del Export (default: %s). Baseline: all." % TIMELINE_RANGE)
    ap.add_argument("--baseline", action="store_true",
                    help="Baseline: nombra <prefix>-BASELINE.csv y usa Timeline 'all'.")
    ap.add_argument("--max-age-hours", type=float, metavar="H", default=0,
                    help="Si el archivo destino ya existe y tiene menos de H horas, se SALTA (candado de frescura).")
    ap.add_argument("--keep-open", action="store_true", help="Dejar el navegador abierto al terminar.")
    args = ap.parse_args()

    setup_logging()

    # Rango del Timeline: baseline fuerza 'all'; --timeline explicito tiene prioridad.
    if args.baseline:
        TIMELINE_RANGE = "all"
    if args.timeline:
        TIMELINE_RANGE = args.timeline
    log.info("Timeline range: %s", TIMELINE_RANGE)

    forced_date = None
    if args.date:
        forced_date = dt.datetime.strptime(args.date, "%Y-%m-%d").date()

    # Nombre del archivo: BASELINE, o WW<semana ISO> (WW40, WW41, ...).
    if args.baseline:
        tag = "BASELINE"
    else:
        ref = forced_date or dt.date.today()
        tag = f"WW{ref.isocalendar()[1]}"
    log.info("Etiqueta de archivos: %s", tag)

    targets = TARGETS
    if args.only:
        if not (1 <= args.only <= len(TARGETS)):
            log.error("--only debe estar entre 1 y %d", len(TARGETS))
            return 2
        targets = [TARGETS[args.only - 1]]

    results: list[tuple[str, bool, str]] = []

    with sync_playwright() as p:
        browser = None
        if args.attach:
            # Conectarse al Edge YA abierto y autenticado (el de launch_edge_debug.bat).
            log.info("Conectando a TU Edge en %s ...", args.cdp)
            try:
                browser = p.chromium.connect_over_cdp(args.cdp)
            except Exception as exc:  # noqa: BLE001
                log.error("No pude conectar a tu Edge (%s).", exc)
                log.error("Abre PRIMERO 'launch_edge_debug.bat', inicia sesion en Midway y DEJALO abierto.")
                return 3
            if not browser.contexts:
                raise RuntimeError("el Edge conectado no tiene contexto; abrelo con launch_edge_debug.bat")
            ctx = browser.contexts[0]  # contexto real -> conserva tu sesion (AEA / Midway)
            # Reutiliza la pestana que ya esta en la app; si no hay, abre una.
            page = None
            for pg in ctx.pages:
                if "far-annotations" in (pg.url or "").lower():
                    page = pg
                    break
            if page is None:
                page = ctx.new_page()
            log.info("Conectado. Usando tu sesion autenticada.")
        else:
            launch_kwargs = dict(
                user_data_dir=str(PROFILE_DIR),
                headless=args.headless,
                accept_downloads=True,
                no_viewport=True,
                args=["--start-maximized"],
            )
            if BROWSER_CHANNEL:
                launch_kwargs["channel"] = BROWSER_CHANNEL  # usar Edge/Chrome instalado
            ctx = p.chromium.launch_persistent_context(**launch_kwargs)
            page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.set_default_timeout(30_000)

        try:
            if args.discover:
                run_discovery(page)
                return 0

            for t in targets:
                label = f"{t['prefix']}-{tag}  [{t['label']}]"
                log.info("")
                log.info(">>> %s", label)
                dest = BASE_DIR / t["folder"] / f"{t['prefix']}-{tag}.csv"

                # Candado de frescura: si ya existe y es reciente, no re-descargar.
                if args.max_age_hours and dest.exists():
                    age_h = (time.time() - dest.stat().st_mtime) / 3600.0
                    if age_h < args.max_age_hours:
                        log.info("  fresco (%.1f h < %.1f h): se salta.", age_h, args.max_age_hours)
                        results.append((label, True, f"fresco: {dest}"))
                        continue

                ok = False
                last_err = ""
                for attempt in range(1, RETRIES_PER_FILE + 2):  # 1 + reintentos
                    if attempt > 1:
                        log.info("  reintento %d/%d ...", attempt - 1, RETRIES_PER_FILE)
                    try:
                        if not open_queue(page, t):
                            raise RuntimeError(auth_problem(page) or "no pude abrir la pagina de la cola")
                        export_csv(page, dest)
                        ok = True
                        break
                    except Exception as exc:  # noqa: BLE001
                        last_err = auth_problem(page) or str(exc)
                        log.error("  intento %d fallo: %s", attempt, last_err)
                        dump_debug(page, f"fallo_{t['prefix']}_{t['jobtype']}_try{attempt}")
                        page.wait_for_timeout(3000)

                results.append((label, ok, str(dest) if ok else last_err))
        finally:
            if args.attach:
                pass  # es TU navegador: no lo cerramos ni tocamos tus pestanas
            else:
                if args.keep_open:
                    log.info("Navegador abierto (--keep-open). Cierralo manualmente.")
                    try:
                        page.pause()
                    except Exception:  # noqa: BLE001
                        pass
                ctx.close()

    # Resumen final
    log.info("")
    log.info("================= RESUMEN =================")
    ok = sum(1 for _, good, _ in results if good)
    for lbl, good, info in results:
        log.info("  [%s] %s", "OK " if good else "XX", lbl)
        if not good:
            log.info("        -> %s", info)
    log.info("Descargados %d de %d.", ok, len(results))

    # Archivo de estado (para que el orquestador 'Run All' sepa si paso o no).
    write_status(tag, results, ok)
    return 0 if ok == len(results) else 1


def write_status(tag: str, results: list, ok: int) -> None:
    """Escribe un JSON de estado con el resultado de la ultima corrida."""
    status = {
        "fecha_nombre": tag,
        "timestamp": dt.datetime.now().isoformat(timespec="seconds"),
        "timeline_range": TIMELINE_RANGE,
        "ok": ok,
        "total": len(results),
        "exito_total": ok == len(results),
        "detalle": [
            {"archivo": lbl, "ok": good, "info": info} for lbl, good, info in results
        ],
    }
    for target_dir in (DEBUG_DIR, BASE_DIR):
        try:
            target_dir.mkdir(parents=True, exist_ok=True)
            (target_dir / "far_ultimo_estado.json").write_text(
                json.dumps(status, ensure_ascii=False, indent=2), encoding="utf-8"
            )
        except Exception as exc:  # noqa: BLE001
            log.warning("no pude escribir el estado en %s: %s", target_dir, exc)


if __name__ == "__main__":
    sys.exit(main())
