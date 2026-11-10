#!/usr/bin/env python3
"""
Construye docs/data.js para el tablero WASDE - Complejo Soja.

Fuentes oficiales (sin claves):
  * USDA FAS PSD Online - descargas masivas CSV (historia por pais)
      https://apps.fas.usda.gov/psdonline/downloads/psd_oilseeds_csv.zip
      https://apps.fas.usda.gov/psdonline/downloads/psd_grains_pulses_csv.zip
  * USDA WASDE - XML de cada informe mensual, archivo oficial ESMIS (Cornell Mann Library)
      https://usda.library.cornell.edu/concern/publications/3t945q76s

Solo usa la libreria estandar de Python (3.9+).
Uso:  python scripts/build.py            (descarga y regenera)
      python scripts/build.py --offline  (usa los archivos ya descargados en data/)
"""
import csv, hashlib, io, json, os, re, sys, time, zipfile, datetime, urllib.request
import xml.etree.ElementTree as ET
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
XML_DIR = os.path.join(DATA_DIR, "wasde_xml")
PSD_DIR = os.path.join(DATA_DIR, "psd")
OUT = os.path.join(ROOT, "docs", "data.js")
UA = "Mozilla/5.0 (compatible; wasde-soja-dashboard/1.0)"

PSD_BASE = "https://apps.fas.usda.gov/psdonline/downloads/"
PSD_FILES = {"oilseeds": "psd_oilseeds_csv.zip", "grains": "psd_grains_pulses_csv.zip"}
ESMIS_HOST = "https://usda.library.cornell.edu"
ESMIS_PUB = ESMIS_HOST + "/concern/publications/3t945q76s?locale=en"

FIRST_YEAR = 2000
TOP_N = 12          # paises que se muestran por rubro (el resto se agrupa)
RANK_WINDOW = 10    # campanas para elegir los paises relevantes

COMMS = {
    "soja":   {"code": "2222000", "file": "oilseeds", "name": "Soja (poroto)", "en": "Oilseed, Soybean"},
    "harina": {"code": "0813100", "file": "oilseeds", "name": "Harina de soja", "en": "Meal, Soybean"},
    "aceite": {"code": "4232000", "file": "oilseeds", "name": "Aceite de soja", "en": "Oil, Soybean"},
    "maiz":   {"code": "0440000", "file": "grains", "name": "Maíz", "en": "Corn"},
    "trigo":  {"code": "0410000", "file": "grains", "name": "Trigo", "en": "Wheat"},
}
ATTRS = {  # PSD Attribute_ID -> clave
    "004": "area", "184": "yield", "020": "bs", "028": "prod", "057": "imp",
    "086": "supply", "007": "crush", "125": "dom", "130": "feed", "192": "fsi",
    "140": "ind", "149": "food", "161": "feedwaste", "088": "exp", "176": "es",
}

# Tablas WASDE (por titulo, robusto ante cambios de numeracion)
WASDE_WORLD = [
    ("World Soybean Meal Supply and Use", "harina"),
    ("World Soybean Oil Supply and Use", "aceite"),
    ("World Soybean Supply and Use", "soja"),
    ("World Wheat Supply and Use", "trigo"),
    ("World Corn Supply and Use", "maiz"),
]
WASDE_US_SOY = "U.S. Soybeans and Products Supply and Use"
WASDE_ATTR = {
    "Beginning Stocks": "bs", "Production": "prod", "Imports": "imp",
    "Domestic Crush": "crush", "Domestic Total": "dom", "Domestic Feed": "feed",
    "Exports": "exp", "Ending Stocks": "es",
}
REGION_CODE = {
    "World": "WORLD", "United States": "US", "Argentina": "AR", "Brazil": "BR", "Paraguay": "PA",
    "China": "CH", "European Union": "E4", "India": "IN", "Mexico": "MX", "Russia": "RS",
    "Ukraine": "UP", "Canada": "CA", "Australia": "AS", "Japan": "JA", "Egypt": "EG",
    "South Africa": "SF", "South Korea": "KS", "Bangladesh": "BG", "Nigeria": "NI",
    "Kazakhstan": "KZ", "United Kingdom": "UK",
}
MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def fetch(url, tries=3):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.read()
        except Exception as e:  # noqa
            last = e
            time.sleep(3 * (i + 1))
    raise RuntimeError(f"No se pudo descargar {url}: {last}")


def clean(s):
    s = " ".join((s or "").split())
    return re.sub(r"\s+\d+/$", "", s).strip()  # quita notas al pie "World 2/"


# ----------------------------------------------------------------------------- PSD
def load_psd(offline):
    os.makedirs(PSD_DIR, exist_ok=True)
    meta = {}
    rows = defaultdict(list)
    wanted = {c["code"]: k for k, c in COMMS.items()}
    for key, fname in PSD_FILES.items():
        path = os.path.join(PSD_DIR, fname)
        if not offline or not os.path.exists(path):
            log("Descargando", PSD_BASE + fname)
            with open(path, "wb") as f:
                f.write(fetch(PSD_BASE + fname))
        with zipfile.ZipFile(path) as z:
            name = [n for n in z.namelist() if n.endswith(".csv")][0]
            with z.open(name) as fh:
                for r in csv.DictReader(io.TextIOWrapper(fh, encoding="utf-8")):
                    k = wanted.get(r["Commodity_Code"])
                    if k and int(r["Market_Year"]) >= FIRST_YEAR and r["Attribute_ID"] in ATTRS:
                        rows[k].append(r)
        meta[key] = {"url": PSD_BASE + fname,
                     "downloaded": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")}
    return rows, meta


def build_psd(rows):
    out = {}
    for k, rs in rows.items():
        years = sorted({int(r["Market_Year"]) for r in rs})
        yi = {y: i for i, y in enumerate(years)}
        n = len(years)
        countries = {}
        upd_max = ""
        for r in rs:
            cc = r["Country_Code"]
            c = countries.setdefault(cc, {"name": r["Country_Name"], "s": {}, "u": [None] * n})
            a = ATTRS[r["Attribute_ID"]]
            arr = c["s"].setdefault(a, [None] * n)
            arr[yi[int(r["Market_Year"])]] = float(r["Value"])
            u = f'{r["Calendar_Year"]}-{r["Month"]}'
            c["u"][yi[int(r["Market_Year"])]] = max(c["u"][yi[int(r["Market_Year"])]] or "", u)
            upd_max = max(upd_max, u)
        # Mundo = suma de paises (como en PSD)
        world = {}
        for a in ATTRS.values():
            if a in ("yield",):
                continue
            tot = [None] * n
            for c in countries.values():
                arr = c["s"].get(a)
                if not arr:
                    continue
                for i, v in enumerate(arr):
                    if v is not None:
                        tot[i] = (tot[i] or 0.0) + v
            if any(v is not None for v in tot):
                world[a] = tot
        if "area" in world and "prod" in world:
            world["yield"] = [round(p / ar, 3) if p and ar else None for p, ar in zip(world["prod"], world["area"])]
        # Seleccion de paises relevantes
        keep = set()
        lo = max(0, n - RANK_WINDOW)
        for a in ("prod", "crush", "dom", "imp", "exp", "es"):
            scores = []
            for cc, c in countries.items():
                arr = c["s"].get(a)
                if arr:
                    vals = [v for v in arr[lo:] if v is not None]
                    if vals:
                        scores.append((sum(vals) / len(vals), cc))
            scores.sort(reverse=True)
            keep.update(cc for s, cc in scores[:TOP_N] if s > 0)
        keep.update(["AR", "BR", "US", "PA", "CH", "E4", "IN"] if k in ("soja", "harina", "aceite") else ["AR", "BR", "US"])
        keep &= set(countries)
        kept = {cc: countries[cc] for cc in keep}
        # Resto del mundo
        rest = {}
        for a, tot in world.items():
            if a in ("yield",):
                continue
            arr = [None if v is None else v for v in tot]
            for cc in keep:
                s = countries[cc]["s"].get(a)
                if s:
                    arr = [None if t is None else t - (v or 0) for t, v in zip(arr, s)]
            rest[a] = [None if v is None else round(v, 3) for v in arr]
        for c in kept.values():
            for a, arr in c["s"].items():
                c["s"][a] = [None if v is None else round(v, 3) for v in arr]
        out[k] = {
            "name": COMMS[k]["name"], "en": COMMS[k]["en"], "code": COMMS[k]["code"],
            "file": COMMS[k]["file"], "years": years, "updated": upd_max,
            "world": {a: [None if v is None else round(v, 3) for v in arr] for a, arr in world.items()},
            "rest": rest, "countries": kept,
        }
        log(f"PSD {k}: {len(years)} campanas, {len(kept)} paises, actualizado {upd_max}")
    return out


# ----------------------------------------------------------------------------- WASDE
def list_esmis_releases():
    """Devuelve {report_id: {'xml':url,'pdf':url,'file':name}} de la pagina de la publicacion."""
    html = fetch(ESMIS_PUB).decode("utf-8", "replace")
    found = {}
    for m in re.finditer(r'href="(/sites/default/release-files/(\d+)/(wasde(\d\d)(\d\d)(v\d+)?)\.(xml|pdf))"', html):
        href, rel, fname, mm, yy, ver, ext = m.groups()
        rid = f"20{yy}-{mm}"
        v = int(ver[1:]) if ver else 1
        cur = found.get(rid)
        if cur and cur["v"] > v:
            continue
        if not cur or cur["v"] < v:
            cur = found[rid] = {"v": v, "file": fname}
        cur[ext] = ESMIS_HOST + href
    return found


def sync_wasde(offline):
    os.makedirs(XML_DIR, exist_ok=True)
    index_path = os.path.join(XML_DIR, "index.json")
    index = json.load(open(index_path)) if os.path.exists(index_path) else {}
    if not offline:
        try:
            rel = list_esmis_releases()
            log(f"ESMIS: {len(rel)} informes listados")
            for rid, r in sorted(rel.items()):
                if "xml" not in r:
                    continue
                path = os.path.join(XML_DIR, r["file"] + ".xml")
                known = index.get(rid)
                if known and known.get("file") == r["file"] and os.path.exists(path):
                    continue
                log("Descargando WASDE", rid, r["xml"])
                with open(path, "wb") as f:
                    f.write(fetch(r["xml"]))
                index[rid] = {"file": r["file"], "xml": r["xml"], "pdf": r.get("pdf"),
                              "fetched": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")}
            json.dump(index, open(index_path, "w"), indent=1, sort_keys=True)
        except Exception as e:  # noqa
            log("AVISO: no se pudo consultar ESMIS:", e)
    return index


def walk_cells(el, ctx, out):
    c = ctx
    if el.tag.startswith("matrix"):
        c = dict(ctx)
        c["_matrix"] = el.tag
    if el.attrib:
        c = dict(c)
        for k, v in el.attrib.items():
            if k.startswith("cell_value") or k.startswith("Textbox") or k in ("Name", "page_title") or k.startswith("sub_report"):
                continue
            c[re.sub(r"\d+$", "", k)] = " ".join(v.split())
    for k, v in el.attrib.items():
        if k.startswith("cell_value"):
            out.append((c, v))
    for ch in el:
        walk_cells(ch, c, out)


def to_num(v):
    v = (v or "").replace(",", "").strip()
    try:
        return float(v)
    except ValueError:
        return None


def parse_year(lbl):
    m = re.match(r"(\d{4}/\d{2})\s*(Est\.|Proj\.)?", lbl or "")
    if not m:
        return None, None
    return m.group(1), {"Est.": "est", "Proj.": "proj"}.get(m.group(2), "hist")


def parse_wasde(path):
    root = ET.parse(path).getroot()
    month_label, number = None, None
    world, us = [], []
    for sr in root:
        rep = sr.find("Report")
        if rep is None:
            continue
        title = rep.get("sub_report_title") or ""
        pt = rep.get("page_title") or ""
        mpage = re.search(r"WASDE\s*-\s*(\d+)\s*-\s*(\d+)", pt)
        page = int(mpage.group(2)) if mpage else None
        if mpage:
            number = mpage.group(1)
        month_label = month_label or rep.get("Report_Month")
        comm = next((c for t, c in WASDE_WORLD if title.startswith(t)), None)
        if comm:
            cells = []
            walk_cells(rep, {}, cells)
            for ctx, v in cells:
                my, st = parse_year(ctx.get("region_header"))
                attr = WASDE_ATTR.get(clean(ctx.get("attribute")))
                region = clean(ctx.get("region"))
                val = to_num(v)
                if my and attr and region and val is not None:
                    world.append({"c": comm, "r": region, "my": my, "st": st,
                                  "fm": (ctx.get("forecast_month") or "")[:3].lower(),
                                  "a": attr, "v": val, "p": page})
        elif title.startswith(WASDE_US_SOY):
            cells = []
            walk_cells(rep, {}, cells)
            # identifica cada sub-tabla (poroto / aceite / harina) por su unidad de precio
            mx_comm = {}
            for ctx, v in cells:
                a = ctx.get("attribute") or ""
                if "$/bu" in a:
                    mx_comm[ctx.get("_matrix")] = "soja"
                elif "c/lb" in a:
                    mx_comm[ctx.get("_matrix")] = "aceite"
                elif "$/s.t." in a:
                    mx_comm[ctx.get("_matrix")] = "harina"
            for ctx, v in cells:
                my, st = parse_year(ctx.get("market_year"))
                attr = clean(ctx.get("attribute"))
                val = to_num(v)
                comm_lbl = mx_comm.get(ctx.get("_matrix"), ctx.get("_matrix"))
                if my and attr and val is not None:
                    us.append({"c": comm_lbl, "my": my, "st": st,
                               "fm": (ctx.get("forecast_month") or "")[:3].lower(),
                               "a": attr, "v": val, "p": page})
    return month_label, number, world, us


def build_wasde(index):
    reports = []
    series = {}   # comm -> region -> attr -> my -> {rid: [v, src_rid, page]}
    us = {}       # rid -> rows
    us_order = []
    for rid in sorted(index):
        info = index[rid]
        path = os.path.join(XML_DIR, info["file"] + ".xml")
        if not os.path.exists(path):
            continue
        try:
            mlabel, number, wrows, urows = parse_wasde(path)
        except Exception as e:  # noqa
            log("AVISO: no se pudo leer", path, e)
            continue
        y, m = map(int, rid.split("-"))
        cur_fm = MONTHS[m - 1]
        prev_rid = f"{y - (m == 1)}-{(m - 2) % 12 + 1:02d}"
        reports.append({"id": rid, "label": mlabel, "number": number, "pdf": info.get("pdf"),
                        "xml": info.get("xml"), "file": info["file"]})
        for r in wrows:
            if r["fm"] and r["fm"] != cur_fm:
                target = prev_rid  # columna del mes anterior publicada en este informe
            else:
                target = rid
            d = series.setdefault(r["c"], {}).setdefault(r["r"], {}).setdefault(r["a"], {}).setdefault(r["my"], {})
            if target == rid or target not in d:
                d[target] = [r["v"], rid, r["p"], r["st"]]
        us[rid] = urows
        us_order.append(rid)
    # Tabla EE.UU. del ultimo informe (con su columna del mes anterior)
    us_latest = None
    if us_order:
        rid = us_order[-1]
        y, m = map(int, rid.split("-"))
        us_latest = {"report": rid, "cur": MONTHS[m - 1], "rows": us[rid]}
    regions_meta = {}
    for c, regs in series.items():
        regions_meta[c] = [{"name": r, "code": REGION_CODE.get(r)} for r in regs]
    log(f"WASDE: {len(reports)} informes procesados")
    return {"reports": reports, "series": series, "regions": regions_meta, "us": us_latest}


# ----------------------------------------------------------------------------- main
def main():
    offline = "--offline" in sys.argv
    rows, psd_meta = load_psd(offline)
    psd = build_psd(rows)
    index = sync_wasde(offline)
    wasde = build_wasde(index)
    data = {
        "generated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "sources": {
            "psd": psd_meta,
            "psd_home": "https://apps.fas.usda.gov/psdonline/app/index.html#/app/advQuery",
            "psd_circular": {"oilseeds": "https://apps.fas.usda.gov/psdonline/circulars/oilseeds.pdf",
                              "grains": "https://apps.fas.usda.gov/psdonline/circulars/grain.pdf"},
            "esmis": ESMIS_PUB,
            "wasde_home": "https://www.usda.gov/about-usda/general-information/staff-offices/office-chief-economist/commodity-markets/wasde-report",
        },
        "psd": psd, "wasde": wasde,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    # Huella de los datos (sin fechas de descarga): si no cambió, no se reescribe el archivo
    digest = hashlib.sha256(json.dumps([psd, wasde], sort_keys=True).encode()).hexdigest()[:16]
    data["hash"] = digest
    if os.path.exists(OUT) and f'"hash":"{digest}"' in open(OUT, encoding="utf-8").read():
        log("Sin cambios en los datos (hash", digest + "). No se reescribe docs/data.js")
        return
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("window.DATA=" + payload + ";\n")
    log(f"OK -> {OUT} ({len(payload) / 1e6:.2f} MB)")


if __name__ == "__main__":
    main()
