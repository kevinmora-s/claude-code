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
import logging
import os
import re
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
# Se puede sobrescribir SIN tocar el codigo con la variable de entorno FAR_CSV_BASE
# (util para correr en otra PC / PC virtual donde la ruta sea distinta).
BASE_DIR = Path(os.environ.get(
    "FAR_CSV_BASE",
    r"W:\My Documents\Dashboard_k2\Far-Annotation Data\CSVs",
))

# Perfil de navegador dedicado (guarda tu sesion de Midway para reutilizarla).
PROFILE_DIR = Path.home() / ".far_annotations_pw_profile"

# Cuanto esperar (segundos) a que completes el login de Midway en la ventana.
# Mas holgado para las corridas programadas (te da tiempo de tocar la YubiKey).
AUTH_WAIT_S = 600  # 10 minutos

# Tiempo maximo de espera a que se genere/descargue cada CSV.
DOWNLOAD_TIMEOUT_MS = 25 * 60 * 1000  # 25 minutos

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


def export_csv(page: Page, dest: Path) -> None:
    """Da clic en 'Export CSV' y espera la descarga, guardandola en 'dest'."""
    dest.parent.mkdir(parents=True, exist_ok=True)

    btn = find_export_button(page)

    minutes = DOWNLOAD_TIMEOUT_MS // 60_000
    log.info("  clic en 'Export CSV'; esperando la descarga (hasta %d min)...", minutes)
    with page.expect_download(timeout=DOWNLOAD_TIMEOUT_MS) as dl_info:
        btn.first.click()
    download = dl_info.value

    if dest.exists():
        dest.unlink()  # reemplazar el del dia
    download.save_as(str(dest))
    size_kb = dest.stat().st_size / 1024
    log.info("  OK  guardado: %s  (%.1f KB)", dest, size_kb)


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
    ap = argparse.ArgumentParser(description="Descarga automatica de CSVs de FAR Annotations Audit.")
    ap.add_argument("--headless", action="store_true", help="Sin ventana visible (solo con --no-attach).")
    ap.add_argument("--no-attach", dest="attach", action="store_false",
                    help="NO conectarse a tu Edge; abrir un navegador propio (no suele servir por Midway/AEA).")
    ap.set_defaults(attach=True)  # por defecto: conectarse a TU Edge (launch_edge_debug.bat)
    ap.add_argument("--cdp", type=str, default="http://127.0.0.1:9222",
                    help="URL de depuracion del Edge (por defecto 127.0.0.1:9222).")
    ap.add_argument("--discover", action="store_true", help="Solo listar queues/enlaces y salir.")
    ap.add_argument("--only", type=int, metavar="N", help="Correr solo el objetivo N (1..%d)." % len(TARGETS))
    ap.add_argument("--date", type=str, metavar="YYYY-MM-DD", help="Forzar fecha para el nombre.")
    ap.add_argument("--keep-open", action="store_true", help="Dejar el navegador abierto al terminar.")
    args = ap.parse_args()

    setup_logging()

    forced_date = None
    if args.date:
        forced_date = dt.datetime.strptime(args.date, "%Y-%m-%d").date()
    tag = date_tag(forced_date)
    log.info("Fecha para los nombres: %s", tag)

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
                try:
                    if not open_queue(page, t):
                        raise RuntimeError("no pude abrir la pagina de la cola")
                    export_csv(page, dest)
                    results.append((label, True, str(dest)))
                except Exception as exc:  # noqa: BLE001
                    log.error("  FALLO: %s", exc)
                    dump_debug(page, f"fallo_{t['prefix']}_{t['jobtype']}")
                    results.append((label, False, str(exc)))
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
    return 0 if ok == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
