/* Tablero WASDE - Complejo Soja. Lee window.DATA (generado por scripts/build.py). */
(function () {
  "use strict";
  const D = window.DATA;
  const $ = (s, el = document) => el.querySelector(s);
  const COMMS = ["soja", "harina", "aceite", "maiz", "trigo"];
  const SOY = ["soja", "harina", "aceite"];
  const W = D.wasde, P = D.psd, S = D.sources;
  const REPORTS = W.reports;
  const LAST = REPORTS[REPORTS.length - 1];
  const RID = LAST ? LAST.id : null;
  const PREV_RID = RID ? prevMonth(RID) : null;
  const MES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const MES_L = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  // ---------- etiquetas
  const ROWS = {
    soja: ["area", "yield", "bs", "prod", "imp", "supply", "crush", "dom", "exp", "es", "su"],
    harina: ["crush", "bs", "prod", "imp", "supply", "dom", "exp", "es", "su"],
    aceite: ["crush", "bs", "prod", "imp", "supply", "dom", "exp", "es", "su"],
    maiz: ["area", "yield", "bs", "prod", "imp", "supply", "feed", "dom", "exp", "es", "su"],
    trigo: ["area", "yield", "bs", "prod", "imp", "supply", "feed", "dom", "exp", "es", "su"],
  };
  const LBL = {
    area: "Área cosechada (M ha)", yield: "Rinde (t/ha)", bs: "Stock inicial", prod: "Producción", imp: "Importaciones",
    supply: "Oferta total", crush: "Molienda", dom: "Consumo total", feed: "Consumo forrajero", exp: "Exportaciones",
    es: "Stock final", su: "Stock / uso (%)",
  };
  const lbl = (c, a) => (a === "crush" && c !== "soja" ? "Poroto molido" : LBL[a]);
  const PSD_ATTR = { area: ["004", "Area Harvested"], yield: ["184", "Yield"], bs: ["020", "Beginning Stocks"], prod: ["028", "Production"], imp: ["057", "Imports"], supply: ["086", "Total Supply"], crush: ["007", "Crush"], dom: ["125", "Domestic Consumption"], feed: ["130", "Feed Dom. Consumption"], exp: ["088", "Exports"], es: ["176", "Ending Stocks"] };
  const WASDE_ATTR_EN = { bs: "Beginning Stocks", prod: "Production", imp: "Imports", crush: "Domestic Crush", dom: "Domestic Total", feed: "Domestic Feed", exp: "Exports", es: "Ending Stocks" };
  const WASDE_TITLE = { soja: "World Soybean Supply and Use", harina: "World Soybean Meal Supply and Use", aceite: "World Soybean Oil Supply and Use", maiz: "World Corn Supply and Use", trigo: "World Wheat Supply and Use" };
  const PAIS = { WORLD: "Mundo", REST: "Resto del mundo", US: "EE.UU.", AR: "Argentina", BR: "Brasil", PA: "Paraguay", CH: "China", E4: "Unión Europea", IN: "India", MX: "México", RS: "Rusia", UP: "Ucrania", CA: "Canadá", AS: "Australia", JA: "Japón", EG: "Egipto", SF: "Sudáfrica", KS: "Corea del Sur", BG: "Bangladesh", NI: "Nigeria", KZ: "Kazajistán", UK: "Reino Unido", ID: "Indonesia", VM: "Vietnam", TH: "Tailandia", TU: "Turquía", TW: "Taiwán", IR: "Irán", BL: "Bolivia", UY: "Uruguay", DM: "Benín", MY: "Malasia", RP: "Filipinas", PK: "Pakistán", SA: "Arabia Saudita", MO: "Marruecos", AG: "Argelia", CO: "Colombia", PE: "Perú", CI: "Chile", VE: "Venezuela", IZ: "Irak", BM: "Birmania", ET: "Etiopía", SN: "Singapur", NO: "Noruega", KN: "Corea del Norte", SY: "Siria", TC: "Emiratos Árabes", PN: "Panamá" };
  const REG_ES = { "World": "Mundo", "World Less China": "Mundo sin China", "United States": "EE.UU.", "Total Foreign": "Total extranjero", "Major Exporters": "Principales exportadores", "Major Importers": "Principales importadores", "Argentina": "Argentina", "Brazil": "Brasil", "Paraguay": "Paraguay", "China": "China", "European Union": "Unión Europea", "Southeast Asia": "Sudeste Asiático", "Mexico": "México", "India": "India", "North Africa": "Norte de África", "N. Africa": "Norte de África", "Australia": "Australia", "Canada": "Canadá", "Russia": "Rusia", "Ukraine": "Ucrania", "Bangladesh": "Bangladesh", "Japan": "Japón", "Nigeria": "Nigeria", "Sel. Mideast": "Medio Oriente (sel.)", "Kazakhstan": "Kazajistán", "United Kingdom": "Reino Unido", "South Africa": "Sudáfrica", "Egypt": "Egipto", "South Korea": "Corea del Sur" };
  const AGG = new Set(["World", "World Less China", "Total Foreign", "Major Exporters", "Major Importers", "Southeast Asia", "North Africa", "N. Africa", "Sel. Mideast"]);
  const regEs = (r) => REG_ES[r] || r;
  const paisEs = (c, comm) => PAIS[c] || (P[comm] && P[comm].countries[c] ? P[comm].countries[c].name : c);

  // ---------- helpers
  function prevMonth(rid) { let [y, m] = rid.split("-").map(Number); m -= 1; if (!m) { m = 12; y -= 1; } return `${y}-${String(m).padStart(2, "0")}`; }
  function ridLabel(rid, long) { const [y, m] = rid.split("-").map(Number); return (long ? MES_L : MES)[m - 1] + " " + y; }
  const myL = (y) => `${y}/${String((y + 1) % 100).padStart(2, "0")}`;
  const myNum = (s) => Number(String(s).slice(0, 4));
  const nf = (d) => new Intl.NumberFormat("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const F2 = nf(2), F1 = nf(1), F0 = nf(0);
  function fmt(v, a) { if (v == null || isNaN(v)) return "–"; if (a === "su") return F1.format(v); if (a === "yield") return F2.format(v); return F2.format(v); }
  function fmtD(v, a, pct) {
    if (v == null || isNaN(v)) return "–";
    const s = (v > 0 ? "+" : v < 0 ? "−" : "") + (pct ? F1.format(Math.abs(v)) + "%" : fmt(Math.abs(v), a));
    return s;
  }
  const cls = (v) => (v > 0 ? "up" : v < 0 ? "down" : "");
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- registro de fuentes (cada valor clickeable)
  let SRC = [];
  const reg = (o) => (SRC.push(o), SRC.length - 1);
  const cell = (v, a, srcObj, extra = "") => `<td class="${extra}" ${srcObj ? `data-s="${reg(srcObj)}"` : ""}>${fmt(v, a)}</td>`;

  // ---------- acceso PSD (1000 t -> Mt; 1000 ha -> M ha)
  function psdRaw(c, cc, a, i) {
    const d = P[c]; if (!d) return null;
    const s = cc === "WORLD" ? d.world : cc === "REST" ? d.rest : d.countries[cc] && d.countries[cc].s;
    if (!s || !s[a]) return null;
    return s[a][i];
  }
  function psd(c, cc, a, i) {
    if (a === "su") {
      const es = psdRaw(c, cc, "es", i), dom = psdRaw(c, cc, "dom", i), ex = psdRaw(c, cc, "exp", i) || 0;
      const use = cc === "WORLD" ? dom : (dom || 0) + ex;
      return es != null && use ? (100 * es) / use : null;
    }
    const v = psdRaw(c, cc, a, i);
    if (v == null) return null;
    return a === "yield" ? v : v / 1000;
  }
  function psdSrc(c, cc, a, i) {
    const d = P[c];
    return { t: "psd", c, cc, a, y: d.years[i], u: cc !== "WORLD" && cc !== "REST" && d.countries[cc] ? d.countries[cc].u[i] : d.updated, raw: a === "su" ? null : psdRaw(c, cc, a, i) };
  }

  // ---------- acceso WASDE
  function wSeries(c, region, a, my) { const s = W.series[c]; return s && s[region] && s[region][a] && s[region][a][my]; }
  function wv(c, region, a, my, rid) {
    if (a === "su") {
      const es = wv(c, region, "es", my, rid), dom = wv(c, region, "dom", my, rid), ex = wv(c, region, "exp", my, rid);
      if (!es || !dom) return null;
      const use = region === "World" ? dom[0] : dom[0] + (ex ? ex[0] : 0);
      return [(100 * es[0]) / use, es[1], es[2], es[3]];
    }
    const s = wSeries(c, region, a, my); return s && s[rid] ? s[rid] : null;
  }
  const wSrc = (c, region, a, my, rid, p) => p ? { t: "wasde", c, region, a, my, rid, src: p[1], page: p[2], st: p[3], v: p[0] } : null;
  function projMY(c) { // campaña proyectada en el último informe
    const s = W.series[c] && W.series[c]["World"] && W.series[c]["World"]["es"]; if (!s) return null;
    return Object.keys(s).filter((my) => s[my][RID]).sort().pop();
  }
  function regionForCode(c, cc) { const r = (W.regions[c] || []).find((x) => (cc === "WORLD" ? x.name === "World" : x.code === cc)); return r ? r.name : null; }

  // ---------- popover de fuente
  const pop = $("#pop");
  function showSrc(o, x, y) {
    let h = "";
    if (o.t === "psd") {
      const d = P[o.c];
      const country = o.cc === "WORLD" ? "Suma de todos los países (Mundo)" : o.cc === "REST" ? "Resto del mundo (Mundo − países mostrados)" : `${d.countries[o.cc].name} (${o.cc})`;
      const at = PSD_ATTR[o.a] || ["—", o.a === "su" ? "Calculado: Stock final / (Consumo + Export.)" : o.a];
      h = `<button class="x" aria-label="Cerrar">×</button><h4>USDA FAS · PSD Online</h4><dl>
        <dt>Producto</dt><dd>${esc(d.en)} (${d.code})</dd>
        <dt>País</dt><dd>${esc(country)}</dd>
        <dt>Campaña</dt><dd>${myL(o.y)} (Market_Year ${o.y})</dd>
        <dt>Atributo</dt><dd>${esc(at[1])} (${at[0]})</dd>
        ${o.raw != null ? `<dt>Valor publicado</dt><dd>${F0.format(o.raw)} ${o.a === "area" ? "(1000 HA)" : o.a === "yield" ? "(MT/HA)" : "(1000 MT)"}</dd>` : ""}
        <dt>Última revisión</dt><dd>${o.u || "—"}</dd></dl>
        <div class="links"><a href="${S.psd[d.file].url}" target="_blank" rel="noopener">Descargar CSV oficial (${d.file === "oilseeds" ? "psd_oilseeds" : "psd_grains_pulses"}.zip)</a>
        <a href="${S.psd_home}" target="_blank" rel="noopener">Consultar en PSD Online (Custom Query)</a>
        <a href="${S.psd_circular[d.file]}" target="_blank" rel="noopener">Circular FAS “World Markets and Trade” (PDF)</a></div>
        <div class="legend-help">En el CSV filtrá Commodity_Code=${d.code}, Country_Code=${o.cc === "WORLD" || o.cc === "REST" ? "(todos)" : o.cc}, Market_Year=${o.y}, Attribute_ID=${at[0]}.</div>`;
    } else {
      const rep = REPORTS.find((r) => r.id === o.src) || {};
      const fromPrevCol = o.rid !== o.src;
      h = `<button class="x" aria-label="Cerrar">×</button><h4>USDA WASDE N° ${rep.number || "?"} · ${ridLabel(o.src, true)}</h4><dl>
        <dt>Tabla</dt><dd>${o.c === "us" ? "U.S. Soybeans and Products Supply and Use (Domestic Measure)" : WASDE_TITLE[o.c] || o.c} · pág. ${o.page || "?"}</dd>
        <dt>Región</dt><dd>${esc(o.region)}</dd>
        <dt>Campaña</dt><dd>${o.my} ${o.st === "proj" ? "Proj." : o.st === "est" ? "Est." : ""}</dd>
        <dt>Rubro</dt><dd>${o.a === "su" ? "Calculado: Stock final / uso" : esc(WASDE_ATTR_EN[o.a] || o.a)}</dd>
        <dt>Valor</dt><dd>${o.c === "us" ? (o._fmt || F0.format(o.v)) + " (unidades USDA)" : fmt(o.v, o.a) + (o.a === "su" ? " %" : " millones de t")}</dd>
        ${fromPrevCol ? `<dt>Nota</dt><dd>Estimación de ${ridLabel(o.rid, true)}, tomada de la columna “mes anterior” del informe de ${ridLabel(o.src, true)}.</dd>` : ""}</dl>
        <div class="links">${rep.pdf ? `<a href="${rep.pdf}#page=${o.page || 1}" target="_blank" rel="noopener">Abrir PDF oficial en la pág. ${o.page}</a>` : ""}
        ${rep.xml ? `<a href="${rep.xml}" target="_blank" rel="noopener">Datos XML del informe</a>` : ""}
        <a href="${S.esmis}" target="_blank" rel="noopener">Archivo oficial de informes WASDE (ESMIS)</a></div>`;
    }
    pop.innerHTML = h; pop.style.display = "block";
    const r = pop.getBoundingClientRect();
    pop.style.left = Math.max(8, Math.min(x + 10, innerWidth - r.width - 8)) + "px";
    pop.style.top = Math.max(8, Math.min(y + 10, innerHeight - r.height - 8)) + "px";
  }
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-s]");
    if (t) { showSrc(SRC[+t.dataset.s], e.clientX, e.clientY); e.stopPropagation(); return; }
    if (e.target.closest(".x") || !e.target.closest("#pop")) pop.style.display = "none";
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") pop.style.display = "none"; });

  // ---------- charts
  let charts = [];
  const killCharts = () => { charts.forEach((c) => c.destroy()); charts = []; };
  const SER = ["--s1", "--s2", "--s3", "--s4", "--s5", "--s6", "--s7", "--s8"];
  function baseOpts(unit, extra = {}) {
    const ink2 = css("--ink-2"), grid = css("--grid"), muted = css("--muted");
    return Object.assign({
      responsive: true, maintainAspectRatio: false, animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: ink2, boxWidth: 12, boxHeight: 2, font: { size: 12 } } },
        tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y == null ? "–" : (unit === "%" ? F1 : F2).format(ctx.parsed.y)} ${unit}` } },
      },
      scales: {
        x: { ticks: { color: muted, maxRotation: 0, autoSkipPadding: 12 }, grid: { display: false }, border: { color: css("--axis") } },
        y: { ticks: { color: muted, callback: (v) => F0.format(v) }, grid: { color: grid }, border: { display: false }, title: { display: !!unit, text: unit, color: muted } },
      },
    }, extra);
  }
  function lineChart(el, labels, series, unit, opts = {}) {
    const ds = series.map((s, i) => ({ label: s.label, data: s.data, borderColor: css(s.color || SER[i % 8]), backgroundColor: css(s.color || SER[i % 8]), borderWidth: 2, pointRadius: s.points ? 3 : 0, pointHoverRadius: 5, tension: 0.15, spanGaps: true, borderDash: s.dash || [] }));
    const c = new Chart(el, { type: "line", data: { labels, datasets: ds }, options: baseOpts(unit, opts) });
    charts.push(c); return c;
  }
  function hbarChart(el, labels, data, unit, colors, onClick) {
    const o = baseOpts(unit);
    o.indexAxis = "y"; o.interaction = { mode: "nearest", intersect: true, axis: "y" };
    o.plugins.legend = { display: false };
    o.plugins.tooltip.callbacks.label = (ctx) => `${F2.format(ctx.parsed.x)} ${unit}`;
    o.scales = { x: { ticks: { color: css("--muted"), callback: (v) => F0.format(v) }, grid: { color: css("--grid") }, border: { display: false } }, y: { ticks: { color: css("--ink-2") }, grid: { display: false } } };
    if (onClick) o.onClick = (e, els) => els.length && onClick(els[0].index);
    const c = new Chart(el, { type: "bar", data: { labels, datasets: [{ data, backgroundColor: colors, borderRadius: 4, barPercentage: 0.75, categoryPercentage: 0.9 }] }, options: o });
    charts.push(c); return c;
  }

  // ---------- estado
  const st = { tab: "resumen", comm: "soja", country: "AR", supAttr: "prod", demAttr: "dom", year: null, evReg: "World", evAttr: "es", revComm: "complejo", revReg: "", hist: 10 };
  try { Object.assign(st, JSON.parse(localStorage.getItem("wasde-soja") || "{}")); } catch (e) { /* sin storage */ }
  const save = () => { try { localStorage.setItem("wasde-soja", JSON.stringify(st)); } catch (e) { /* */ } };

  const TABS = [["resumen", "Resumen"], ["mundo", "Balance mundial"], ["paises", "Países"], ["complejo", "Complejo soja"], ["evolucion", "Evolución WASDE"], ["usa", "EE.UU. (unidades USDA)"], ["fuentes", "Fuentes y método"]];
  function renderTabs() {
    $("#tabs").innerHTML = TABS.map(([k, l]) => `<button role="tab" aria-selected="${st.tab === k}" data-tab="${k}">${l}</button>`).join("");
    $("#tabs").onclick = (e) => { const b = e.target.closest("[data-tab]"); if (b) { st.tab = b.dataset.tab; save(); render(); } };
  }
  function commSeg(list = COMMS, key = "comm") {
    return `<div class="seg" data-seg="${key}">${list.map((c) => `<button data-v="${c}" class="${st[key] === c ? "on" : ""}">${c === "complejo" ? "Complejo soja" : P[c].name}</button>`).join("")}</div>`;
  }
  function bindSeg(root) {
    root.querySelectorAll("[data-seg]").forEach((g) => g.addEventListener("click", (e) => { const b = e.target.closest("[data-v]"); if (!b) return; st[g.dataset.seg] = b.dataset.v; save(); render(); }));
    root.querySelectorAll("select[data-k]").forEach((s) => s.addEventListener("change", () => { st[s.dataset.k] = s.value; save(); render(); }));
  }

  // ================================================================= RESUMEN
  function viewResumen() {
    let h = `<div class="grid g5">`;
    for (const c of COMMS) {
      const my = projMY(c), myPrev = my ? myL(myNum(my) - 1) : null;
      const cur = wv(c, "World", "es", my, RID), prv = wv(c, "World", "es", my, PREV_RID), ly = wv(c, "World", "es", myPrev, RID);
      const su = wv(c, "World", "su", my, RID), prod = wv(c, "World", "prod", my, RID), prodP = wv(c, "World", "prod", my, PREV_RID);
      const d1 = cur && prv ? cur[0] - prv[0] : null, d2 = cur && ly ? cur[0] - ly[0] : null, dp = prod && prodP ? prod[0] - prodP[0] : null;
      h += `<div class="card kpi ${SOY.includes(c) ? "focus" : ""}">
        <div class="lbl">${P[c].name} · Stock final mundial ${my || ""}</div>
        <div class="big" data-s="${reg(wSrc(c, "World", "es", my, RID, cur))}">${cur ? F2.format(cur[0]) : "–"} <span style="font-size:13px;color:var(--ink-2)">Mt</span></div>
        <div class="row"><span>vs informe anterior</span><span class="${cls(d1)}" ${prv ? `data-s="${reg(wSrc(c, "World", "es", my, PREV_RID, prv))}"` : ""}>${fmtD(d1)}</span></div>
        <div class="row"><span>vs campaña ${myPrev || ""}</span><span class="${cls(d2)}" ${ly ? `data-s="${reg(wSrc(c, "World", "es", myPrev, RID, ly))}"` : ""}>${fmtD(d2)}</span></div>
        <div class="row"><span>Stock / consumo</span><span ${su ? `data-s="${reg(wSrc(c, "World", "su", my, RID, su))}"` : ""}>${su ? F1.format(su[0]) + "%" : "–"}</span></div>
        <div class="row"><span>Producción (Δ m/m)</span><span ${prod ? `data-s="${reg(wSrc(c, "World", "prod", my, RID, prod))}"` : ""}>${prod ? F2.format(prod[0]) : "–"} <span class="${cls(dp)}">(${fmtD(dp)})</span></span></div>
      </div>`;
    }
    h += `</div>`;
    // Revisiones
    const list = st.revComm === "complejo" ? SOY : [st.revComm];
    // regiones disponibles (con dato en ambos informes) para el filtro
    const regSet = new Set();
    for (const c of list) {
      const s = W.series[c] || {};
      for (const region of Object.keys(s)) if (Object.values(s[region]).some((am) => Object.values(am).some((v) => v[RID] && v[PREV_RID]))) regSet.add(region);
    }
    const regOpts = [...regSet].sort((x, y) => (AGG.has(x) - AGG.has(y)) || regEs(x).localeCompare(regEs(y), "es"));
    if (st.revReg && !regSet.has(st.revReg)) st.revReg = "";
    const one = !!st.revReg;
    const rows = [];
    for (const c of list) {
      const s = W.series[c] || {};
      for (const region of Object.keys(s)) {
        if (one && region !== st.revReg) continue;
        for (const a of Object.keys(s[region])) for (const my of Object.keys(s[region][a])) {
          const cur = s[region][a][my][RID], prv = s[region][a][my][PREV_RID];
          // con un país elegido se muestra su balance completo (también lo que no cambió)
          if (cur && prv && (one || Math.abs(cur[0] - prv[0]) > 0.0049)) rows.push({ c, region, a, my, cur, prv, d: cur[0] - prv[0] });
        }
      }
    }
    if (one) rows.sort((x, y) => (list.indexOf(x.c) - list.indexOf(y.c)) || y.my.localeCompare(x.my));
    else rows.sort((x, y) => (AGG.has(x.region) - AGG.has(y.region)) || Math.abs(y.d) - Math.abs(x.d));
    const nChg = rows.filter((r) => Math.abs(r.d) > 0.0049).length;
    h += `<div class="card" style="margin-top:14px"><h2>Revisiones del WASDE de ${RID ? ridLabel(RID, true) : "–"} vs ${PREV_RID ? ridLabel(PREV_RID, true) : "–"}${one ? ` · ${regEs(st.revReg)}` : ""}</h2>
      <p class="note">${one ? `Balance completo de ${regEs(st.revReg)} en el informe, con su variación contra el mes anterior (${nChg} rubro${nChg === 1 ? "" : "s"} con cambios), en millones de toneladas.` : "Cambios por país/región y rubro, en millones de toneladas. Primero los países, ordenados por magnitud del cambio; después los agregados regionales."}</p>
      <div class="bar">${commSeg(["complejo", ...COMMS], "revComm")}
        <label>País / región <select data-k="revReg"><option value="">Todos (solo cambios)</option>${regOpts.map((r) => `<option value="${r}" ${st.revReg === r ? "selected" : ""}>${regEs(r)}${AGG.has(r) ? " (agregado)" : ""}</option>`).join("")}</select></label></div>
      <div class="tbl-wrap"><table><thead><tr><th>País / región</th><th style="text-align:left">Producto</th><th style="text-align:left">Rubro</th><th>Campaña</th><th>${PREV_RID ? ridLabel(PREV_RID) : ""}</th><th class="cur">${RID ? ridLabel(RID) : ""}</th><th>Δ</th><th>Δ %</th></tr></thead><tbody>
      ${rows.length ? rows.map((r) => `<tr><td>${regEs(r.region)}${AGG.has(r.region) ? '<span class="tag">agregado</span>' : ""}</td><td style="text-align:left">${P[r.c].name}</td><td style="text-align:left">${lbl(r.c, r.a)}</td><td>${r.my}</td>${cell(r.prv[0], r.a, wSrc(r.c, r.region, r.a, r.my, PREV_RID, r.prv))}${cell(r.cur[0], r.a, wSrc(r.c, r.region, r.a, r.my, RID, r.cur), "cur")}<td class="${cls(r.d)}">${fmtD(r.d)}</td><td class="${cls(r.d)}">${r.prv[0] ? fmtD((100 * r.d) / r.prv[0], null, true) : "–"}</td></tr>`).join("") : `<tr><td colspan="8">Sin revisiones.</td></tr>`}
      </tbody></table></div></div>`;
    return h;
  }

  // ================================================================= BALANCE (mundo o país)
  function balanceTable(c, cc) {
    const d = P[c], n = d.years.length, ci = n - 1, hist = Math.min(+st.hist, n);
    const idx = []; for (let i = n - hist; i < n; i++) idx.push(i);
    const region = regionForCode(c, cc);
    const my = myL(d.years[ci]);
    let h = `<div class="tbl-wrap"><table><thead><tr><th>Millones de t</th>`;
    h += idx.map((i) => `<th class="${i === ci ? "cur" : ""}">${myL(d.years[i])}${i === ci ? " P" : i === ci - 1 ? " E" : ""}</th>`).join("");
    h += `<th class="cmp">${region && PREV_RID ? "Inf. " + ridLabel(PREV_RID) : "Inf. anterior"}</th><th class="cmp">Δ m/m</th><th class="cmp">Δ a/a</th><th class="cmp">Prom. 5 años</th><th class="cmp">vs prom.</th></tr></thead><tbody>`;
    for (const a of ROWS[c]) {
      if (cc !== "WORLD" && !psdRaw(c, cc, a === "su" ? "es" : a, ci) && !psdRaw(c, cc, a === "su" ? "es" : a, ci - 1) && a !== "su") continue;
      h += `<tr class="${a === "es" || a === "area" && false ? "sep" : ""}"><td>${lbl(c, a)}</td>`;
      h += idx.map((i) => cell(psd(c, cc, a, i), a, psdSrc(c, cc, a, i), i === ci ? "cur" : "")).join("");
      const cur = psd(c, cc, a, ci), ly = psd(c, cc, a, ci - 1);
      let prev = null, prevS = null;
      if (region && a !== "area" && a !== "yield" && a !== "supply") {
        const p = wv(c, region, a, my, PREV_RID);
        if (p) { prev = p[0]; prevS = wSrc(c, region, a, my, PREV_RID, p); }
      }
      const av = []; for (let i = ci - 5; i < ci; i++) { const v = psd(c, cc, a, i); if (v != null) av.push(v); }
      const avg = av.length ? av.reduce((x, y) => x + y, 0) / av.length : null;
      const dm = prev != null && cur != null ? cur - prev : null, dy = cur != null && ly != null ? cur - ly : null, dv = cur != null && avg ? cur - avg : null;
      h += `<td class="cmp" ${prevS ? `data-s="${reg(prevS)}"` : ""}>${fmt(prev, a)}</td><td class="cmp ${cls(dm)}">${fmtD(dm, a)}</td><td class="cmp ${cls(dy)}">${fmtD(dy, a)}</td><td class="cmp">${fmt(avg, a)}</td><td class="cmp ${cls(dv)}">${avg ? fmtD((100 * dv) / Math.abs(avg), null, true) : "–"}</td></tr>`;
    }
    h += `</tbody></table></div><p class="legend-help">P = proyección, E = estimación (USDA). Historia: PSD Online. “Inf. anterior” y Δ m/m: WASDE del mes previo${region ? "" : " (este país no figura en las tablas del WASDE: sin comparación mensual)"}. Stock/uso: mundo = stock final / consumo; países = stock final / (consumo + exportaciones).</p>`;
    return h;
  }
  function histControls() {
    return `<label>Historia <select data-k="hist">${[5, 10, 15, 20, 27].map((v) => `<option value="${v}" ${+st.hist === v ? "selected" : ""}>${v === 27 ? "desde 2000" : v + " campañas"}</option>`).join("")}</select></label>`;
  }
  function viewMundo() {
    const c = st.comm, d = P[c];
    return `<div class="bar">${commSeg()} ${histControls()}</div>
      <div class="card"><h2>${d.name} · Balance mundial</h2><p class="note">Mundo = suma de todos los países (PSD). Hacé clic en cualquier número para ver la fuente.</p>${balanceTable(c, "WORLD")}</div>
      <div class="grid g2" style="margin-top:14px">
        <div class="card"><h3>Producción vs consumo mundial (Mt)</h3><div class="chart"><canvas id="ch1"></canvas></div></div>
        <div class="card"><h3>Relación stock final / consumo mundial (%)</h3><div class="chart"><canvas id="ch2"></canvas></div></div>
      </div>
      <div class="card" style="margin-top:14px"><h3>¿Quién explica la oferta y la demanda? Participación ${myL(d.years[d.years.length - 1])}</h3><div class="grid g2">
        <div><div class="note">Producción</div><div class="chart"><canvas id="ch3"></canvas></div></div>
        <div><div class="note">${c === "soja" ? "Molienda" : "Consumo total"}</div><div class="chart"><canvas id="ch4"></canvas></div></div></div></div>`;
  }
  function afterMundo() {
    const c = st.comm, d = P[c], n = d.years.length, lab = d.years.map(myL);
    lineChart($("#ch1"), lab, [{ label: "Producción", data: d.years.map((_, i) => psd(c, "WORLD", "prod", i)) }, { label: "Consumo total", data: d.years.map((_, i) => psd(c, "WORLD", "dom", i)) }], "Mt");
    lineChart($("#ch2"), lab, [{ label: "Stock / consumo", data: d.years.map((_, i) => psd(c, "WORLD", "su", i)) }], "%", {});
    for (const [id, a] of [["#ch3", "prod"], ["#ch4", c === "soja" ? "crush" : "dom"]]) {
      const r = rank(c, a, n - 1, 10);
      hbarChart($(id), r.map((x) => x.name), r.map((x) => x.v), "Mt", r.map((x) => (x.cc === "AR" ? css("--s2") : x.cc === "REST" ? css("--axis") : css("--s1"))), (i) => { if (r[i].cc !== "REST") { st.country = r[i].cc; st.tab = "paises"; save(); render(); } });
    }
  }
  function rank(c, a, i, top) {
    const d = P[c];
    const arr = Object.keys(d.countries).map((cc) => ({ cc, name: paisEs(cc, c), v: psd(c, cc, a, i) })).filter((x) => x.v > 0).sort((x, y) => y.v - x.v);
    const tot = psd(c, "WORLD", a, i);
    const shown = arr.slice(0, top);
    const rest = tot - shown.reduce((s, x) => s + x.v, 0);
    if (rest > 0.005) shown.push({ cc: "REST", name: "Resto", v: rest });
    return shown;
  }

  // ================================================================= PAISES
  function viewPaises() {
    const c = st.comm, d = P[c], n = d.years.length;
    if (!d.countries[st.country]) st.country = d.countries.AR ? "AR" : Object.keys(d.countries)[0];
    const yi = st.year != null && st.year < n ? +st.year : n - 1;
    const supOpts = [["prod", "Producción"], ["exp", "Exportaciones"], ["es", "Stock final"]];
    const demOpts = c === "soja" ? [["crush", "Molienda"], ["dom", "Consumo total"], ["imp", "Importaciones"]] : c === "maiz" || c === "trigo" ? [["dom", "Consumo total"], ["feed", "Consumo forrajero"], ["imp", "Importaciones"]] : [["dom", "Consumo total"], ["imp", "Importaciones"]];
    if (!supOpts.some((o) => o[0] === st.supAttr)) st.supAttr = "prod";
    if (!demOpts.some((o) => o[0] === st.demAttr)) st.demAttr = demOpts[0][0];
    const countries = Object.keys(d.countries).sort((a, b) => paisEs(a, c).localeCompare(paisEs(b, c)));
    return `<div class="bar">${commSeg()}
        <label>Campaña <select data-k="year">${d.years.map((y, i) => `<option value="${i}" ${i === yi ? "selected" : ""}>${myL(y)}</option>`).slice().reverse().join("")}</select></label></div>
      <div class="grid g2">
        <div class="card"><h3>Oferta · ranking de países</h3><div class="bar"><select data-k="supAttr">${supOpts.map(([k, l]) => `<option value="${k}" ${st.supAttr === k ? "selected" : ""}>${l}</option>`).join("")}</select><span class="note" style="margin:0">Clic en una barra para ver el país</span></div><div class="chart tall"><canvas id="cs"></canvas></div><div id="ts"></div></div>
        <div class="card"><h3>Demanda · ranking de países</h3><div class="bar"><select data-k="demAttr">${demOpts.map(([k, l]) => `<option value="${k}" ${st.demAttr === k ? "selected" : ""}>${l}</option>`).join("")}</select></div><div class="chart tall"><canvas id="cd"></canvas></div><div id="td"></div></div>
      </div>
      <div class="card" style="margin-top:14px"><div class="bar"><h2 style="margin:0">Hoja de balance · </h2><select data-k="country">${countries.map((cc) => `<option value="${cc}" ${cc === st.country ? "selected" : ""}>${paisEs(cc, c)}</option>`).join("")}</select> ${histControls()}</div>
        ${balanceTable(c, st.country)}
        <div class="grid g2" style="margin-top:12px">
          <div><h3>${paisEs(st.country, c)}: producción, consumo y comercio (Mt)</h3><div class="chart"><canvas id="cc1"></canvas></div></div>
          <div><h3>${paisEs(st.country, c)}: participación en el mundo (%)</h3><div class="chart"><canvas id="cc2"></canvas></div></div>
        </div></div>`;
  }
  function shareTable(c, a, yi, r) {
    const tot = psd(c, "WORLD", a, yi), prevTot = psd(c, "WORLD", a, yi - 1);
    return `<div class="tbl-wrap" style="margin-top:8px"><table><thead><tr><th>País</th><th>Mt</th><th>% mundo</th><th>Δ a/a</th></tr></thead><tbody>${r.map((x) => {
      const ly = x.cc === "REST" ? (prevTot != null ? prevTot - r.filter((z) => z.cc !== "REST").reduce((s, z) => s + (psd(c, z.cc, a, yi - 1) || 0), 0) : null) : psd(c, x.cc, a, yi - 1);
      const dd = ly != null ? x.v - ly : null;
      return `<tr><td>${x.name}</td>${cell(x.v, a, psdSrc(c, x.cc, a, yi))}<td>${tot ? F1.format((100 * x.v) / tot) : "–"}</td><td class="${cls(dd)}">${fmtD(dd, a)}</td></tr>`;
    }).join("")}<tr class="sep"><td>Mundo</td>${cell(tot, a, psdSrc(c, "WORLD", a, yi))}<td>100,0</td><td class="${cls(tot - prevTot)}">${fmtD(prevTot != null ? tot - prevTot : null, a)}</td></tr></tbody></table></div>`;
  }
  function afterPaises() {
    const c = st.comm, d = P[c], n = d.years.length, yi = st.year != null && st.year < n ? +st.year : n - 1;
    const color = (cc) => (cc === st.country ? css("--s2") : cc === "REST" ? css("--axis") : css("--s1"));
    for (const [cv, tb, a] of [["#cs", "#ts", st.supAttr], ["#cd", "#td", st.demAttr]]) {
      const r = rank(c, a, yi, 12);
      hbarChart($(cv), r.map((x) => x.name), r.map((x) => x.v), "Mt", r.map((x) => color(x.cc)), (i) => { if (r[i].cc !== "REST") { st.country = r[i].cc; save(); render(); } });
      $(tb).innerHTML = shareTable(c, a, yi, r);
    }
    const cc = st.country, lab = d.years.map(myL);
    const ser = [["prod", "Producción"], [c === "soja" ? "crush" : "dom", c === "soja" ? "Molienda" : "Consumo total"], ["exp", "Exportaciones"], ["imp", "Importaciones"]];
    lineChart($("#cc1"), lab, ser.map(([a, l]) => ({ label: l, data: d.years.map((_, i) => psd(c, cc, a, i)) })), "Mt");
    const sh = (a) => d.years.map((_, i) => { const v = psd(c, cc, a, i), t = psd(c, "WORLD", a, i); return v != null && t ? (100 * v) / t : null; });
    lineChart($("#cc2"), lab, [["prod", "Producción"], ["exp", "Exportaciones"], ["imp", "Importaciones"]].map(([a, l]) => ({ label: `% ${l.toLowerCase()} mundial`, data: sh(a) })), "%");
  }

  // ================================================================= COMPLEJO SOJA
  function viewComplejo() {
    const d = P.soja, n = d.years.length, ci = n - 1;
    const rows = [["AR", "Argentina"], ["BR", "Brasil"], ["US", "EE.UU."], ["PA", "Paraguay"], ["CH", "China"], ["E4", "Unión Europea"]];
    let t = `<div class="tbl-wrap"><table><thead><tr><th>${myL(d.years[ci])} · Mt</th><th>Producción poroto</th><th>Molienda</th><th>Molienda / producción</th><th>Export. poroto</th><th>Prod. harina</th><th>Export. harina</th><th>% export. mundial harina</th><th>Prod. aceite</th><th>Export. aceite</th><th>% export. mundial aceite</th></tr></thead><tbody>`;
    for (const [cc, name] of rows) {
      const pr = psd("soja", cc, "prod", ci), cr = psd("soja", cc, "crush", ci);
      const mex = psd("harina", cc, "exp", ci), oex = psd("aceite", cc, "exp", ci);
      const mw = psd("harina", "WORLD", "exp", ci), ow = psd("aceite", "WORLD", "exp", ci);
      t += `<tr><td>${name}</td>${cell(pr, "prod", psdSrc("soja", cc, "prod", ci))}${cell(cr, "crush", psdSrc("soja", cc, "crush", ci))}<td>${pr && cr ? F1.format((100 * cr) / pr) + "%" : "–"}</td>${cell(psd("soja", cc, "exp", ci), "exp", psdSrc("soja", cc, "exp", ci))}${cell(psd("harina", cc, "prod", ci), "prod", psdSrc("harina", cc, "prod", ci))}${cell(mex, "exp", psdSrc("harina", cc, "exp", ci))}<td>${mex != null && mw ? F1.format((100 * mex) / mw) + "%" : "–"}</td>${cell(psd("aceite", cc, "prod", ci), "prod", psdSrc("aceite", cc, "prod", ci))}${cell(oex, "exp", psdSrc("aceite", cc, "exp", ci))}<td>${oex != null && ow ? F1.format((100 * oex) / ow) + "%" : "–"}</td></tr>`;
    }
    t += `</tbody></table></div>`;
    // biocombustibles EE.UU. (WASDE)
    let bio = "";
    if (W.us) {
      const rows = W.us.rows.filter((r) => r.c === "aceite" && /Biofuel|Domestic Disappearance|Ending stocks|Production|Exports/.test(r.a));
      const myP = rows.map((r) => r.my).sort().pop();
      const get = (a, my, fm) => rows.find((r) => r.a === a && r.my === my && (fm == null || r.fm === fm));
      const items = [["Production", "Producción"], ["Biofuel", "Uso en biocombustibles"], ["Domestic Disappearance", "Consumo interno total"], ["Exports", "Exportaciones"], ["Ending stocks", "Stock final"]];
      const pm = MES[["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(W.us.cur)];
      bio = `<div class="tbl-wrap"><table><thead><tr><th>Aceite de soja EE.UU. · millones de libras</th><th>${myL(myNum(myP) - 1)} E</th><th>${myP} P (mes ant.)</th><th class="cur">${myP} P (${pm})</th><th>Δ m/m</th></tr></thead><tbody>${items.map(([a, l]) => {
        const e = get(a, myL(myNum(myP) - 1)), cur = get(a, myP, W.us.cur), prv = rows.find((r) => r.a === a && r.my === myP && r.fm && r.fm !== W.us.cur);
        const usSrc = (r) => r ? { t: "wasde", c: "us", region: "United States", a, my: r.my, rid: W.us.report, src: W.us.report, page: r.p, st: r.st, v: r.v } : null;
        const dd = cur && prv ? cur.v - prv.v : null;
        return `<tr><td>${l}</td><td ${e ? `data-s="${reg(usSrc(e))}"` : ""}>${e ? F0.format(e.v) : "–"}</td><td ${prv ? `data-s="${reg(usSrc(prv))}"` : ""}>${prv ? F0.format(prv.v) : "–"}</td><td class="cur" ${cur ? `data-s="${reg(usSrc(cur))}"` : ""}>${cur ? F0.format(cur.v) : "–"}</td><td class="${cls(dd)}">${dd == null ? "–" : (dd > 0 ? "+" : dd < 0 ? "−" : "") + F0.format(Math.abs(dd))}</td></tr>`;
      }).join("")}</tbody></table></div>`;
    }
    return `<div class="card"><h2>Mapa del complejo soja por origen</h2><p class="note">Del poroto a los subproductos: cuánto se muele en cada origen y qué parte del comercio mundial de harina y aceite explica. Fuente: PSD.</p>${t}</div>
      <div class="grid g2" style="margin-top:14px">
        <div class="card"><h3>Molienda de soja por país (Mt)</h3><div class="chart"><canvas id="k1"></canvas></div></div>
        <div class="card"><h3>Participación en las exportaciones mundiales de harina (%)</h3><div class="chart"><canvas id="k2"></canvas></div></div>
        <div class="card"><h3>Participación en las exportaciones mundiales de aceite (%)</h3><div class="chart"><canvas id="k3"></canvas></div></div>
        <div class="card"><h3>Importaciones de poroto: China vs resto (Mt)</h3><div class="chart"><canvas id="k4"></canvas></div></div>
      </div>
      <div class="card" style="margin-top:14px"><h2>EE.UU.: aceite de soja y biocombustibles (WASDE ${RID ? ridLabel(RID, true) : ""})</h2><p class="note">El uso del aceite en biocombustibles (renewable diesel y biodiésel) es hoy el principal motor de la demanda de aceite en EE.UU.</p>${bio}</div>`;
  }
  function afterComplejo() {
    const d = P.soja, lab = d.years.map(myL);
    const pc = [["AR", "Argentina", "--s2"], ["BR", "Brasil", "--s3"], ["US", "EE.UU.", "--s1"], ["CH", "China", "--s8"], ["E4", "Unión Europea", "--s7"]];
    lineChart($("#k1"), lab, pc.map(([cc, l, col]) => ({ label: l, color: col, data: d.years.map((_, i) => psd("soja", cc, "crush", i)) })), "Mt");
    const share = (c, cc) => P[c].years.map((_, i) => { const v = psd(c, cc, "exp", i), t = psd(c, "WORLD", "exp", i); return v != null && t ? (100 * v) / t : null; });
    const ex3 = [["AR", "Argentina", "--s2"], ["BR", "Brasil", "--s3"], ["US", "EE.UU."]].map((x) => [x[0], x[1], x[2] || "--s1"]);
    lineChart($("#k2"), P.harina.years.map(myL), ex3.concat([["PA", "Paraguay", "--s4"], ["IN", "India", "--s5"]]).map(([cc, l, col]) => ({ label: l, color: col, data: share("harina", cc) })), "%");
    lineChart($("#k3"), P.aceite.years.map(myL), ex3.concat([["PA", "Paraguay", "--s4"], ["E4", "Unión Europea", "--s7"]]).map(([cc, l, col]) => ({ label: l, color: col, data: share("aceite", cc) })), "%");
    lineChart($("#k4"), lab, [{ label: "China", color: "--s8", data: d.years.map((_, i) => psd("soja", "CH", "imp", i)) }, { label: "Resto del mundo", color: "--s1", data: d.years.map((_, i) => { const t = psd("soja", "WORLD", "imp", i), ch = psd("soja", "CH", "imp", i); return t != null ? t - (ch || 0) : null; }) }], "Mt");
  }

  // ================================================================= EVOLUCION WASDE
  function viewEvolucion() {
    const c = st.comm, s = W.series[c] || {};
    const regs = Object.keys(s);
    if (!regs.includes(st.evReg)) st.evReg = "World";
    const attrs = ["bs", "prod", "imp", "crush", "feed", "dom", "exp", "es", "su"].filter((a) => a === "su" || (s[st.evReg] && s[st.evReg][a]));
    if (!attrs.includes(st.evAttr)) st.evAttr = "es";
    const rids = REPORTS.map((r) => r.id);
    const ser = st.evAttr === "su" ? s[st.evReg].es : s[st.evReg][st.evAttr];
    const mys = Object.keys(ser || {}).sort().slice(-3);
    let t = `<div class="tbl-wrap"><table><thead><tr><th>Campaña</th>${rids.map((r) => `<th class="${r === RID ? "cur" : ""}">${ridLabel(r)}</th>`).join("")}<th class="cmp">Δ desde 1er informe</th></tr></thead><tbody>`;
    for (const my of mys) {
      const vals = rids.map((r) => wv(c, st.evReg, st.evAttr, my, r));
      const first = vals.find((v) => v), last = vals[vals.length - 1];
      t += `<tr><td>${my}</td>${vals.map((v, i) => v ? cell(v[0], st.evAttr, wSrc(c, st.evReg, st.evAttr, my, rids[i], v), rids[i] === RID ? "cur" : "") : `<td>–</td>`).join("")}<td class="cmp ${cls(last && first ? last[0] - first[0] : null)}">${last && first ? fmtD(last[0] - first[0], st.evAttr) : "–"}</td></tr>`;
    }
    t += `</tbody></table></div>`;
    return `<div class="bar">${commSeg()}
        <label>Región <select data-k="evReg">${regs.map((r) => `<option value="${esc(r)}" ${r === st.evReg ? "selected" : ""}>${regEs(r)}</option>`).join("")}</select></label>
        <label>Rubro <select data-k="evAttr">${attrs.map((a) => `<option value="${a}" ${a === st.evAttr ? "selected" : ""}>${lbl(c, a)}</option>`).join("")}</select></label></div>
      <div class="card"><h2>${P[c].name} · ${regEs(st.evReg)} · ${lbl(c, st.evAttr)}: cómo cambió la estimación informe a informe</h2>
        <p class="note">Cada punto es el valor publicado en ese WASDE. Así se ve si el USDA viene recortando o subiendo el número. Se agregan informes automáticamente a medida que se publican.</p>
        <div class="chart"><canvas id="ev"></canvas></div>${t}</div>`;
  }
  function afterEvolucion() {
    const c = st.comm, s = W.series[c] || {};
    const ser = st.evAttr === "su" ? s[st.evReg].es : s[st.evReg][st.evAttr];
    const mys = Object.keys(ser || {}).sort().slice(-3);
    const rids = REPORTS.map((r) => r.id);
    lineChart($("#ev"), rids.map((r) => ridLabel(r)), mys.map((my, i) => ({ label: my, points: true, color: ["--s7", "--s3", "--s1"].slice(-mys.length)[i], data: rids.map((r) => { const v = wv(c, st.evReg, st.evAttr, my, r); return v ? v[0] : null; }) })), st.evAttr === "su" ? "%" : "Mt", { scales: undefined });
    const ch = charts[charts.length - 1];
    ch.options.scales = baseOpts(st.evAttr === "su" ? "%" : "Mt").scales;
    ch.options.scales.y.beginAtZero = false; ch.options.scales.y.ticks.callback = (v) => F1.format(v);
    ch.update();
  }

  // ================================================================= EE.UU.
  function viewUSA() {
    if (!W.us) return `<div class="card">Sin datos.</div>`;
    const U = W.us, cur = U.cur;
    const blocks = [["soja", "Soja (poroto)", "millones de bushels / acres / $ por bushel"], ["aceite", "Aceite de soja", "millones de libras / centavos por libra"], ["harina", "Harina de soja", "miles de short tons / $ por short ton"]];
    let h = `<p class="note">Tabla “U.S. Soybeans and Products Supply and Use (Domestic Measure)” del WASDE de ${ridLabel(U.report, true)}, en las unidades originales del USDA (las que mueve el CBOT).</p>`;
    for (const [c, name, unit] of blocks) {
      const rows = U.rows.filter((r) => r.c === c);
      const attrs = [...new Set(rows.map((r) => r.a))];
      const mys = [...new Set(rows.map((r) => r.my))].sort();
      const myP = mys[mys.length - 1];
      const cols = mys.slice(0, -1).map((my) => ({ my, fm: "", lab: my + (rows.find((r) => r.my === my && r.st === "est") ? " E" : "") }));
      cols.push({ my: myP, fm: "prev", lab: myP + " P (mes ant.)" }, { my: myP, fm: cur, lab: myP + " P (" + ridLabel(U.report) + ")", cur: true });
      const usSrc = (r) => ({ t: "wasde", c: "us", region: "United States", a: r.a, my: r.my, rid: U.report, src: U.report, page: r.p, st: r.st, v: r.v });
      h += `<div class="card" style="margin-bottom:14px"><h2>${name}</h2><p class="note">${unit}</p><div class="tbl-wrap"><table><thead><tr><th>Rubro</th>${cols.map((k) => `<th class="${k.cur ? "cur" : ""}">${k.lab}</th>`).join("")}<th class="cmp">Δ m/m</th></tr></thead><tbody>`;
      for (const a of attrs) {
        const g = (k) => rows.find((r) => r.a === a && r.my === k.my && (k.fm === "prev" ? r.fm && r.fm !== cur : k.fm ? r.fm === k.fm : true));
        const vs = cols.map(g);
        const dd = vs[vs.length - 1] && vs[vs.length - 2] ? vs[vs.length - 1].v - vs[vs.length - 2].v : null;
        const fx = (v) => (/Yield|\$\/bu/.test(a) ? F2 : /Area/.test(a) ? F1 : F0).format(v);
        h += `<tr class="${/Ending/i.test(a) ? "sep" : ""}"><td>${esc(a)}</td>${vs.map((r, i) => r ? `<td class="${cols[i].cur ? "cur" : ""}" data-s="${reg(Object.assign(usSrc(r), { _fmt: fx(r.v) }))}">${fx(r.v)}</td>` : `<td>–</td>`).join("")}<td class="cmp ${cls(dd)}">${dd == null ? "–" : (dd > 0 ? "+" : dd < 0 ? "−" : "") + fx(Math.abs(dd))}</td></tr>`;
      }
      h += `</tbody></table></div></div>`;
    }
    return h;
  }

  // ================================================================= FUENTES
  function viewFuentes() {
    return `<div class="card prose"><h2>Fuentes oficiales</h2><ul>
      <li><b>WASDE (World Agricultural Supply and Demand Estimates)</b>: USDA, Oficina del Economista Jefe / WAOB. Se lee el <b>XML oficial de cada informe</b> desde el archivo ESMIS (Cornell Mann Library), el repositorio oficial de informes del USDA: <a href="${S.esmis}" target="_blank" rel="noopener">${S.esmis}</a>. Página del informe: <a href="${S.wasde_home}" target="_blank" rel="noopener">usda.gov · WASDE</a>.</li>
      <li><b>PSD Online (Production, Supply and Distribution)</b>: USDA FAS. Se usan las descargas masivas oficiales <a href="${S.psd.oilseeds.url}">psd_oilseeds_csv.zip</a> y <a href="${S.psd.grains.url}">psd_grains_pulses_csv.zip</a>. PSD se actualiza el mismo día que el WASDE y aporta la historia por país y los países que no figuran en las tablas del WASDE.</li></ul>
      <h2>Cómo validar un número</h2><ul>
      <li>Hacé clic en cualquier valor: se abre la ficha con el informe, la tabla, la página, la campaña y el rubro, y links directos al PDF (en la página exacta), al XML o al CSV.</li>
      <li>En PSD, el “valor publicado” está en miles de toneladas (1000 MT); el tablero lo muestra en millones de toneladas.</li></ul>
      <h2>Método</h2><ul>
      <li><b>Mundo</b> en PSD = suma de todos los países. En el WASDE se usa la fila “World” de cada tabla.</li>
      <li><b>Δ m/m</b>: contra el WASDE anterior. Para la campaña proyectada, el propio informe publica la columna del mes anterior.</li>
      <li><b>Prom. 5 años</b>: promedio de las 5 campañas previas a la proyectada.</li>
      <li><b>Stock/uso</b>: mundo = stock final / consumo total; país = stock final / (consumo + exportaciones).</li>
      <li>Campañas: años comerciales locales de cada país, como los publica el USDA (Argentina y Brasil soja = la campaña que se cosecha en el año siguiente).</li>
      <li>Actualización: un proceso automático (GitHub Actions) revisa a diario si salió un WASDE nuevo, descarga las fuentes y regenera esta página.</li></ul>
      <p class="note">Datos generados: ${D.generated}. Informes WASDE cargados: ${REPORTS.map((r) => ridLabel(r.id)).join(", ")}.</p></div>`;
  }

  // ================================================================= render
  function render() {
    killCharts(); SRC = []; pop.style.display = "none";
    renderTabs();
    const v = $("#view");
    const map = { resumen: [viewResumen], mundo: [viewMundo, afterMundo], paises: [viewPaises, afterPaises], complejo: [viewComplejo, afterComplejo], evolucion: [viewEvolucion, afterEvolucion], usa: [viewUSA], fuentes: [viewFuentes] };
    const [fn, after] = map[st.tab] || map.resumen;
    v.innerHTML = fn();
    bindSeg(v);
    if (after && window.Chart) after();
  }
  $("#hdr").innerHTML = `Último WASDE: <b>${RID ? ridLabel(RID, true) : "–"}</b>${LAST && LAST.number ? ` (N° ${LAST.number})` : ""}${LAST && LAST.pdf ? ` · <a href="${LAST.pdf}" target="_blank" rel="noopener">PDF</a>` : ""} · PSD actualizado: <b>${P.soja.updated}</b> · Generado ${D.generated}`;
  const th = $("#theme");
  try { th.value = localStorage.getItem("wasde-theme") || ""; } catch (e) { /* */ }
  const applyTheme = () => { if (th.value) document.documentElement.dataset.theme = th.value; else delete document.documentElement.dataset.theme; };
  applyTheme();
  th.onchange = () => { applyTheme(); try { localStorage.setItem("wasde-theme", th.value); } catch (e) { /* */ } render(); };
  render();
})();
