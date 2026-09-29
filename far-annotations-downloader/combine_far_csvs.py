#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Combinador de CSVs de FAR Annotations.

Por cada carpeta/dataset:
  - Junta TODOS los CSV de ese dataset (baseline + weekly WWxx + dated).
  - Quita la fila de DESCRIPCIONES (fila 2) que trae el export nuevo de FAR.
  - Deduplica por 'taskId' quedandose con la version MAS RECIENTE
    (orden por fecha de modificacion del archivo: lo bajado despues gana).
  - Valida archivos vacios / corruptos (0 KB o sin filas de datos) y los salta.
  - Escribe un unico CSV limpio: '<prefix>-COMBINED.csv' (1 solo encabezado).

Ese COMBINED es el que debe leer KNIME.

Uso:
  python combine_far_csvs.py            # combina los 5 datasets
  python combine_far_csvs.py --dry-run  # solo diagnostica, no escribe

La ruta base se puede sobrescribir con la variable de entorno FAR_CSV_BASE.
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import os
import re
import sys
from pathlib import Path

# ============================ CONFIGURACION ============================
BASE_DIR = Path(os.environ.get(
    "FAR_CSV_BASE",
    r"W:\My Documents\Dashboard_k2\Far-Annotation Data\CSVs",
))

# (carpeta, prefijo). Cada uno produce <prefijo>-COMBINED.csv en su carpeta.
DATASETS = [
    ("XDOF BBOX",        "Annotations"),
    ("XDOF BBOX",        "Audits"),
    ("PCS Concept BBOX", "Annotations"),
    ("PCS Concept BBOX", "Audits"),
    ("Polarity",         "Annotations"),
]

ID_COLUMN = "taskId"          # llave de deduplicacion (unica por fila/stage)
COMBINED_SUFFIX = "-COMBINED"  # el archivo de salida lleva este sufijo

# Un taskId es un ULID: 26 caracteres base32 (0-9 A-Z). Sirve para distinguir
# una fila de datos real de la fila de descripciones (cuyo 1er campo es texto).
ULID_RE = re.compile(r"^[0-9A-HJKMNP-TV-Z]{26}$")
# ======================================================================

# Permitir CSVs con celdas enormes (descripciones largas / comentarios).
csv.field_size_limit(min(sys.maxsize, 2**31 - 1))

# El maximo real depende de la plataforma; bajamos si hiciera falta.
while True:
    try:
        csv.field_size_limit(csv.field_size_limit())
        break
    except OverflowError:
        csv.field_size_limit(int(csv.field_size_limit() / 10))


def log(msg: str = "") -> None:
    print(msg, flush=True)


def source_files(folder: Path, prefix: str) -> list[Path]:
    """CSVs de ese dataset, excluyendo el COMBINED, ordenados por fecha (viejo->nuevo)."""
    out = []
    for p in folder.glob(f"{prefix}-*.csv"):
        if p.stem.endswith(COMBINED_SUFFIX):
            continue
        out.append(p)
    out.sort(key=lambda p: p.stat().st_mtime)  # el mas reciente se procesa al final y gana
    return out


def read_rows(path: Path):
    """Devuelve (header, filas_de_datos). Salta la fila de descripciones si existe.

    Lanza ValueError si el archivo esta vacio o no tiene datos utiles.
    """
    if path.stat().st_size == 0:
        raise ValueError("archivo de 0 KB (vacio)")

    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        try:
            header = next(reader)
        except StopIteration:
            raise ValueError("sin encabezado")
        header = [h.strip() for h in header]

        rows = []
        first = True
        for row in reader:
            if not row or all(c.strip() == "" for c in row):
                continue
            if first:
                first = False
                # Si la 1a fila tras el encabezado NO parece dato (taskId no es ULID),
                # es la fila de descripciones -> se salta.
                if not ULID_RE.match((row[0] or "").strip()):
                    continue
            rows.append(row)
    if not rows:
        raise ValueError("sin filas de datos")
    return header, rows


def combine_dataset(folder: Path, prefix: str, dry: bool) -> dict:
    label = f"{folder.name} / {prefix}"
    result = {"dataset": label, "ok": False, "archivos": 0, "filas_out": 0, "detalle": ""}

    if not folder.is_dir():
        result["detalle"] = f"carpeta no existe: {folder}"
        log(f"  [XX] {label}: {result['detalle']}")
        return result

    files = source_files(folder, prefix)
    if not files:
        result["detalle"] = "no hay archivos fuente"
        log(f"  [XX] {label}: {result['detalle']}")
        return result

    header_ref = None
    id_idx = None
    merged: dict[str, list] = {}   # taskId -> fila (la ultima procesada gana)
    used, skipped = 0, []

    for path in files:
        try:
            header, rows = read_rows(path)
        except ValueError as exc:
            skipped.append(f"{path.name} ({exc})")
            continue

        if header_ref is None:
            header_ref = header
            if ID_COLUMN not in header_ref:
                result["detalle"] = f"no encontre la columna '{ID_COLUMN}' en {path.name}"
                log(f"  [XX] {label}: {result['detalle']}")
                return result
            id_idx = header_ref.index(ID_COLUMN)
        elif header != header_ref:
            # columnas distintas -> mejor no mezclar a ciegas
            skipped.append(f"{path.name} (encabezado distinto)")
            continue

        for row in rows:
            if len(row) <= id_idx:
                continue
            tid = (row[id_idx] or "").strip()
            if tid:
                merged[tid] = row   # sobrescribe: el archivo mas nuevo gana
        used += 1

    if not merged:
        result["detalle"] = "0 filas tras combinar (todos los fuente vacios/invalidos)"
        log(f"  [XX] {label}: {result['detalle']}")
        return result

    out_path = folder / f"{prefix}{COMBINED_SUFFIX}.csv"
    if not dry:
        tmp = out_path.with_suffix(".csv.tmp")
        with tmp.open("w", encoding="utf-8", newline="") as f:
            w = csv.writer(f)
            w.writerow(header_ref)
            w.writerows(merged.values())
        os.replace(tmp, out_path)  # reemplazo atomico

    result.update(ok=True, archivos=used, filas_out=len(merged),
                  detalle=f"saltados: {skipped}" if skipped else "")
    log(f"  [OK] {label}: {used} archivo(s) -> {len(merged):,} filas -> {out_path.name}"
        + (f"  (saltados: {len(skipped)})" if skipped else ""))
    for s in skipped:
        log(f"        - saltado: {s}")
    return result


def main() -> int:
    ap = argparse.ArgumentParser(description="Combina y limpia los CSVs de FAR para KNIME.")
    ap.add_argument("--dry-run", action="store_true", help="No escribe; solo diagnostica.")
    args = ap.parse_args()

    log("=" * 60)
    log("COMBINADOR FAR -> CSVs limpios para KNIME")
    log(f"Base: {BASE_DIR}")
    if args.dry_run:
        log("MODO DRY-RUN (no escribe archivos)")
    log("=" * 60)

    results = []
    for folder_name, prefix in DATASETS:
        results.append(combine_dataset(BASE_DIR / folder_name, prefix, args.dry_run))

    ok = sum(1 for r in results if r["ok"])
    log("")
    log("================= RESUMEN =================")
    for r in results:
        log(f"  [{'OK ' if r['ok'] else 'XX'}] {r['dataset']}: "
            f"{r['filas_out']:,} filas de {r['archivos']} archivo(s)")
    log(f"Datasets combinados: {ok} de {len(results)}")

    # Estado para el orquestador Run All.
    try:
        (BASE_DIR / "far_combinador_estado.json").write_text(
            json.dumps({
                "timestamp": dt.datetime.now().isoformat(timespec="seconds"),
                "ok": ok, "total": len(results),
                "exito_total": ok == len(results),
                "detalle": results,
            }, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as exc:  # noqa: BLE001
        log(f"(no pude escribir el estado: {exc})")

    return 0 if ok == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
