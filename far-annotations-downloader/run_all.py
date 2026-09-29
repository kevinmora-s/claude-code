# -*- coding: utf-8 -*-
"""
RUN ALL  ->  orquestador del Dashboard MRO (v3.0.0)

Corre TODO el proceso de un comando, EN ORDEN, con monitor visual (progress.html):
  0) Descargar FAR (5 CSV desde la pagina) -> abre Edge + download_csvs.py.
  1) Extractores de Labelbox (ndjson -> CSV por batch).
  2) KNIME en modo BATCH (headless): ejecuta el workflow y sus CSV Writers.

Novedades vs v2:
  - Paso 0 nuevo: descarga de FAR integrada (con candado de frescura).
  - Monitor visual: escribe progress.html (se auto-refresca) con barra %, paso
    actual, ETA y, si algo falla, MARCA el paso exacto y el error. Abrelo en el
    navegador mientras corre.
  - Sigue deteniendose en el primer error (STOP_ON_ERROR) para no correr KNIME
    con data incompleta.

Flags: --dry-run, --skip-far, --skip-extractors, --skip-knime.

Coloca en esta MISMA carpeta: run_all.py, progress.py, download_csvs.py y los
extractores. Requiere Python con pandas/openpyxl (extractores) y KNIME instalado.
"""
import subprocess, sys, os, time, datetime, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from progress import Progress  # noqa: E402  (progress.py va al lado de este script)

# ============================ EDITA ESTAS RUTAS ============================
PYTHON_EXE = sys.executable

# ---- Paso 0: Descarga de FAR ----
RUN_FAR          = True
DOWNLOAD_SCRIPT  = os.path.join(HERE, "download_csvs.py")   # el descargador (al lado)
FAR_MAX_AGE_HOURS = 8      # si el CSV de la semana tiene < X h, se salta (candado de frescura)
EDGE_DBG_PORT    = 9222
EDGE_PROFILE     = os.path.join(os.path.expanduser("~"), "EdgeAutomation")
FAR_URL          = "https://far-annotations.gamma.harmony.a2z.com/far-annotations/audit"
_EDGE_CANDS = [
    os.path.join(os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)"),
                 "Microsoft", "Edge", "Application", "msedge.exe"),
    os.path.join(os.environ.get("ProgramFiles", r"C:\Program Files"),
                 "Microsoft", "Edge", "Application", "msedge.exe"),
    "msedge.exe",
]

# ---- Paso 1: Extractores ----
EXTRACTORS = [
    os.path.join(HERE, "Kevs_import_labelbox_batch_to_csv.py"),
    os.path.join(HERE, "import_dc1b_batch_to_csv.py"),
]

# ---- Paso 2: KNIME (headless via NodePit Batch) ----
_HOME           = os.path.expanduser("~")
KNIME_EXE       = os.path.join(_HOME, "AppData", "Local", "Programs", "KNIME", "knime.exe")
KNIME_WORKSPACE = os.path.join(_HOME, "knime-workspace")
KNIME_WORKFLOW  = "MRO Dashboard Compilated V 2.0.0"

# ---- General ----
LOG_DIR       = os.path.join(HERE, "logs")
PROGRESS_DIR  = HERE          # donde se escribe progress.html (abrelo ahi)
STOP_ON_ERROR = True
RUN_EXTRACTORS = True
RUN_KNIME      = True
# ==========================================================================

os.makedirs(LOG_DIR, exist_ok=True)
_LOG_PATH = os.path.join(LOG_DIR, "run_all_" + datetime.datetime.now().strftime("%Y%m%d_%H%M%S") + ".log")


def log(msg=""):
    line = f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {msg}"
    print(line, flush=True)
    with open(_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def run_step(cmd, name, dry):
    log("-" * 66)
    log(f"PASO: {name}")
    log("CMD : " + " ".join(f'"{c}"' if " " in str(c) else str(c) for c in cmd))
    if dry:
        log("(dry-run: no se ejecuta)")
        return 0
    t0 = time.time()
    try:
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                              text=True, encoding="utf-8", errors="replace")
    except FileNotFoundError as e:
        log(f"ERROR: no encontre el ejecutable -> {e}")
        return 1
    if proc.stdout:
        for ln in proc.stdout.splitlines():
            log("   | " + ln)
    log(f"-> {name} termino en {time.time()-t0:0.1f}s con codigo {proc.returncode}")
    return proc.returncode


# --------------------------- Paso 0: FAR ---------------------------
def _edge_exe():
    for c in _EDGE_CANDS:
        if c == "msedge.exe" or os.path.isfile(c):
            return c
    return "msedge.exe"


def _edge_alive():
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{EDGE_DBG_PORT}/json/version", timeout=2) as r:
            return r.status == 200
    except Exception:  # noqa: BLE001
        return False


def ensure_edge(dry):
    """Abre Edge con depuracion (si no esta abierto) y espera a que responda."""
    if _edge_alive():
        log("Edge ya esta escuchando en el puerto %d." % EDGE_DBG_PORT)
        return True
    if dry:
        log("(dry-run: abriria Edge con --remote-debugging-port)")
        return True
    edge = _edge_exe()
    log("Abriendo Edge (%s) en el puerto %d ..." % (edge, EDGE_DBG_PORT))
    try:
        subprocess.Popen([edge, f"--remote-debugging-port={EDGE_DBG_PORT}",
                          f"--user-data-dir={EDGE_PROFILE}", FAR_URL])
    except FileNotFoundError as e:
        log(f"ERROR: no pude abrir Edge -> {e}")
        return False
    for _ in range(40):
        if _edge_alive():
            log("Edge respondiendo.")
            return True
        time.sleep(1)
    log("AVISO: Edge no respondio en el puerto a tiempo.")
    return False


def run_far(dry):
    """Descarga los 5 CSV de FAR. Devuelve (rc, detalle)."""
    if not ensure_edge(dry):
        return 1, "no pude abrir Edge (depuracion) para la descarga"
    cmd = [PYTHON_EXE, DOWNLOAD_SCRIPT, "--max-age-hours", str(FAR_MAX_AGE_HOURS)]
    rc = run_step(cmd, "Descarga FAR", dry)
    if rc == 3:
        return 3, "no conecto a Edge (sesion/Midway). Toca la YubiKey y reintenta."
    if rc != 0:
        return rc, "una o mas descargas fallaron (revisa el log / far_ultimo_estado.json)"
    return 0, ""


# ------------------------------- main -------------------------------
def main():
    args = set(sys.argv[1:])
    dry = "--dry-run" in args
    do_far   = RUN_FAR        and "--skip-far" not in args
    do_ext   = RUN_EXTRACTORS and "--skip-extractors" not in args
    do_knime = RUN_KNIME      and "--skip-knime" not in args

    # Definir pasos para el monitor.
    steps = []
    if do_far:
        steps.append(("far", "Descargar FAR (5 CSV)"))
    if do_ext:
        for ex in EXTRACTORS:
            steps.append(("ext:" + os.path.basename(ex), "Extractor " + os.path.basename(ex)))
    if do_knime:
        steps.append(("knime", "KNIME (batch, headless)"))
    pr = Progress(steps, PROGRESS_DIR, title="Dashboard MRO — Run All")

    log("=" * 66)
    log("RUN ALL - Dashboard MRO v3.0.0")
    log(f"log      : {_LOG_PATH}")
    log(f"progreso : {os.path.join(PROGRESS_DIR, 'progress.html')}  (abrelo en el navegador)")
    if dry:
        log("MODO DRY-RUN (no ejecuta nada, solo muestra los comandos)")

    failed = []

    # ---- 0) FAR ----
    if do_far:
        pr.start("far")
        rc, detail = run_far(dry)
        if rc == 0:
            pr.done("far")
        else:
            pr.fail("far", detail)
            failed.append("Descarga FAR")
            if STOP_ON_ERROR:
                log("STOP_ON_ERROR: se aborta (no se corre extractores ni KNIME).")
                pr.finish()
                log("RESULTADO: FALLO -> " + ", ".join(failed))
                sys.exit(1)

    # ---- 1) Extractores ----
    if do_ext and not (failed and STOP_ON_ERROR):
        for ex in EXTRACTORS:
            key = "ext:" + os.path.basename(ex)
            pr.start(key)
            if not os.path.isfile(ex) and not dry:
                pr.fail(key, "extractor no encontrado: " + ex)
                failed.append(os.path.basename(ex))
                if STOP_ON_ERROR:
                    break
                continue
            rc = run_step([PYTHON_EXE, ex], "Extractor " + os.path.basename(ex), dry)
            if rc == 0:
                pr.done(key)
            else:
                pr.fail(key, f"termino con codigo {rc} (revisa el log)")
                failed.append(os.path.basename(ex))
                if STOP_ON_ERROR:
                    log("STOP_ON_ERROR: se aborta antes de KNIME (data incompleta).")
                    do_knime = False
                    break

    # ---- 2) KNIME ----
    if do_knime and not (failed and STOP_ON_ERROR):
        pr.start("knime")
        wf_dir = os.path.join(KNIME_WORKSPACE, KNIME_WORKFLOW)
        knime_cmd = [
            KNIME_EXE, "-nosplash", "-consoleLog",
            "-application", "com.nodepit.batch.application.NodePitBatchExecutor",
            "-data", KNIME_WORKSPACE, "--reset", "--no-save", wf_dir,
        ]
        rc = run_step(knime_cmd, "KNIME batch (NodePit)", dry)
        if rc == 0:
            pr.done("knime")
        else:
            NODEPIT_CODES = {10: "entrada invalida (flags/ruta del workflow)",
                             20: "error al CARGAR el workflow",
                             30: "error al EJECUTAR el workflow (algun nodo fallo)",
                             40: "error al GUARDAR el workflow", 50: "error desconocido"}
            pr.fail("knime", f"NodePit exit {rc}: " + NODEPIT_CODES.get(rc, "fallo"))
            failed.append("KNIME")

    pr.finish()
    log("=" * 66)
    if failed:
        log("RESULTADO: FALLARON -> " + ", ".join(failed))
        sys.exit(1)
    log("RESULTADO: TODO OK. Dashboard actualizado.")
    sys.exit(0)


if __name__ == "__main__":
    main()
