import {
  saveTerrainReport,
  clearTerrainReport,
} from "./terrain-report-snapshot.js";
import { terrainPreferences } from "./terrain-radio-preferences.js";
import { scenarioPhotoStrip } from "./scenario-photo-strip.js";
import { buildCaseView, pathGraphic, writeCase } from "./case-view.js";
import { help, attachFieldHelp, explainTerrain } from "./help.js";
import { readGeoTiff, MAX_FILE_BYTES } from "./terrain-geotiff.js";
import { createProfileCache } from "./terrain-profile-cache.js";
import { checkRouteQuality, loadQualityMask } from "./terrain-quality.js";
import { createDebouncedCalculation } from "./debounce-calculation.js";
const profileCache = createProfileCache();
import { analyzeTerrainRadio } from "./terrain-radio.js";
import { EXAMPLES, VERIFIED_DEMO_ROUTES } from "./terrain-examples.js";
const $ = (s) => document.querySelector(s),
  root = $("#terrain-app");
root.innerHTML = `<h1>地形高程剖面</h1><p>DEM 剖面与几何净空 · 非实测</p><div class="terrain-modes"><button type="button" data-mode="quick">快速体验 · 内置 DSM</button><button type="button" data-mode="upload">专业分析 · 上传 GeoTIFF</button></div><p id="terrain-mode" class="badge"></p><p id="terrain-status" role="status"></p><button type="button" id="cancel-load" hidden>取消加载</button><div class="terrain-layout"><div><section><h2>填入相关数据</h2><div id="quick-import"><div class="scenario-select"><label>场景<select id="example"><option value="" selected disabled>请选择场景</option><option value="qilian">祁连山</option><option value="hexi">河西走廊·嘉峪关</option><option value="yellow">黄河上游·永靖刘家峡</option></select></label><button type="button" id="load-example">填入相关数据</button></div><div id="demo-routes" hidden><p>此案例默认使用通过地形质量核验的演示线路。</p><button type="button" id="original-route">查看原线路</button> <button type="button" id="verified-route">恢复核验线路</button></div><div class="terrain-examples" aria-label="区域实景参考">${scenarioPhotoStrip()}</div><p class="footnote">区域实景参考，非节点位置，不参与计算。</p></div><div id="upload-import" hidden><label>选择本地 GeoTIFF<input type="file" id="file" accept=".tif,.tiff,image/tiff"></label><label>数据来源（用户填写）<input id="source" placeholder="数据集名称及版本"></label><label>数据类型<select id="dataType"><option value="未知">未知</option><option value="DSM">DSM</option><option value="DTM">DTM</option></select></label><label>垂直高程基准（文件未标注时由用户填写）<input id="datum" placeholder="请按数据说明填写，不得猜测"></label><label>高程单位（文件未标注时）<select id="unit"><option value="">未知</option><option value="m">米（m）</option></select></label><button type="button" id="load-file">读取文件</button><p class="footnote">文件仅在当前页面内存中；刷新后需重新选择。内部掩膜不支持；外部掩膜须先写入 NoData。</p></div><div id="metadata"></div></section><section><h2>节点与参数</h2><form id="terrain-form" class="form-grid" novalidate><label>起点经度 °<input type="number" step="any" name="lonA" required></label><label>起点纬度 °<input type="number" step="any" name="latA" required></label><label>起点天线离地高度 m<input type="number" min="0" step="any" name="heightA" required></label><label>终点经度 °<input type="number" step="any" name="lonB" required></label><label>终点纬度 °<input type="number" step="any" name="latB" required></label><label>终点天线离地高度 m<input type="number" min="0" step="any" name="heightB" required></label><label>采样间距 m<input type="number" min="0.01" step="any" name="spacing" required></label></form><h3>无线链路分析</h3><div class="form-grid"><label>载波频率 MHz<input id="radio-frequency" type="number" min="100" max="10000" step="any" value="868"></label><label>菲涅尔净空参考 %<input id="radio-ratio" type="number" min="0" max="100" step="any" value="60"></label><label>地球曲率与折射<select id="radio-curvature"><option value="flat">平面近似（不含曲率）</option><option value="earth">地球曲率（k=1，无折射）</option><option value="refracted" selected>等效地球半径（k=4/3，标准折射假设）</option></select></label></div><label class="quality-check"><input id="quality-confirm" type="checkbox"> 我已依据数据资料核实 NoData、外部掩膜和垂直基准；此确认不消除 DEM 分辨率及采样局限。</label><button type="button" id="analyse" hidden>重新尝试</button></section></div><div><section><h2>地形与无线链路分析</h2><p id="terrain-understanding" class="result-understanding"></p><p id="radio-results" aria-live="polite"></p><div id="terrain-location" class="terrain-location"><h3>位置与高程</h3><p>尚无有效地形计算。</p></div><p id="result" aria-live="polite">请选择场景或地形数据。</p><div id="terrain-plot" hidden><div class="terrain-legend" aria-label="地形图例"><button type="button" data-series="0" aria-pressed="true"><i class="line-ground"></i>地形（含曲率凸起）m</button><button type="button" data-series="1" aria-pressed="true"><i class="line-sight"></i>天线视线 m</button><button type="button" data-series="2" aria-pressed="true"><i class="line-fresnel"></i>第一菲涅尔区上边界</button><button type="button" data-series="3" aria-pressed="true"><i class="line-fresnel"></i>第一菲涅尔区下边界</button><button type="button" data-series="4" aria-pressed="true"><i class="dot-antenna"></i>天线顶部</button><button type="button" data-series="5" aria-pressed="true"><i class="dot-obstacle"></i>最小视线净空位置</button></div><div class="chart-wrap"><p id="plot-stale" class="plot-stale" hidden aria-hidden="true"></p><canvas id="terrain-chart" role="img" aria-label="由 DEM 栅格计算的距离高程剖面"></canvas></div></div></section><section class="terrain-method-link"><p>中心线几何分析 · 非现场可靠性</p><details><summary>查看计算依据与限制</summary><p>采用 DEM 中心线采样及等效地球半径近似，结果不代表完整三维障碍或实地通信可靠性。数据来源、精度和完整公式见模型与方法。</p></details></section></div></div>`;
for (const [value, text] of [
  ["dingxi", "定西·陇中黄土丘陵沟壑区"],
  ["maqu", "玛曲·高寒草甸"],
]) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = text;
  $("#example").append(option);
}
const qualityLabel = $("#quality-confirm").closest("label"),
  qualityTextNode = qualityLabel.lastChild;
const importSection = $("#quick-import").closest("section"),
  layout = root.querySelector(".terrain-layout");
layout.before(importSection);
importSection.classList.add("terrain-import");
const terrainLocation = $("#terrain-location");
$("#terrain-plot").after(terrainLocation);
let caseStorage;
try {
  caseStorage = window.localStorage;
} catch {
  caseStorage = {
    getItem() {
      throw Error("存储不可用");
    },
  };
}
function clearCase() {
  clearTerrainReport(caseStorage);
  const el = $("#terrain-location");
  if (el.dataset.hasResults === "true")
    el.style.minHeight = el.offsetHeight + "px";
  el.replaceChildren();
  el.dataset.hasResults = "false";
  const h = document.createElement("h3"),
    p = document.createElement("p");
  h.textContent = "位置与高程";
  p.textContent = "尚无有效地形计算。";
  el.append(h, p);
  const warning = writeCase(caseStorage, null);
  if (warning) $("#terrain-status").textContent = warning;
}
function showCase(v) {
  const el = $("#terrain-location");
  el.replaceChildren();
  el.dataset.hasResults = "true";
  const h = document.createElement("h3");
  h.textContent = `${v.name} · ${v.category}`;
  el.append(h);
  const m = document.createElement("div");
  m.innerHTML = pathGraphic(v.a, v.b);
  el.append(m);
  const hint = document.createElement("p");
  hint.className = "footnote";
  hint.textContent = "相对位置示意，坐标轴按当前节点范围缩放；不是 GIS 底图。";
  el.append(hint);
  const dl = document.createElement("dl");
  dl.className = "case-stats";
  const add = (k, val) => {
    let d = document.createElement("div"),
      dt = document.createElement("dt"),
      dd = document.createElement("dd");
    dt.textContent = k;
    dd.textContent = val;
    d.append(dt, dd);
    dl.append(d);
  };
  const f = (n) => n.toFixed(5);
  add("起点经纬度", `${f(v.a.lon)}, ${f(v.a.lat)}`);
  add("终点经纬度", `${f(v.b.lon)}, ${f(v.b.lat)}`);
  add("路径长度", `${(v.distance / 1000).toFixed(2)} km`);
  add("起点高程", `${v.start.toFixed(2)} m`);
  add("终点高程", `${v.end.toFixed(2)} m`);
  add("高程差（终点−起点）", `${v.difference.toFixed(2)} m`);
  add(
    "栅格分辨率",
    `${v.resolution[0].toPrecision(4)}° × ${v.resolution[1].toPrecision(4)}°`,
  );
  el.append(dl);
  const warning = writeCase(caseStorage, v);
  if (warning) {
    const p = document.createElement("p");
    p.textContent = warning;
    el.append(p);
  }
}
$("#terrain-form").addEventListener("submit", (event) =>
  event.preventDefault(),
);
const key = "longyuan-lora.terrain-ui.v1",
  form = $("#terrain-form"),
  names = ["lonA", "latA", "heightA", "lonB", "latB", "heightB", "spacing"];
const defaults = {
  lonA: 100.28,
  latA: 38.75,
  heightA: 2,
  lonB: 100.31,
  latB: 38.73,
  heightB: 3,
  spacing: 100,
};
let activeExample = "",
  quickEdited = false,
  loadingExample = false;
const scenarioKey = "longyuan-lora.scenario-selection.v1";
function routeFields({ a, b }) {
  return {
    lonA: a.lon,
    latA: a.lat,
    heightA: a.antenna,
    lonB: b.lon,
    latB: b.lat,
    heightB: b.antenna,
    spacing: 100,
  };
}
try {
  const v = JSON.parse(caseStorage.getItem(scenarioKey) || "null");
  if (v?.version === 1 && Object.hasOwn(EXAMPLES, v.id)) {
    activeExample = v.id;
    quickEdited = v.dirty === true;
  }
} catch {}
function saveScenario() {
  try {
    caseStorage.setItem(
      scenarioKey,
      JSON.stringify({ version: 1, id: activeExample, dirty: quickEdited }),
    );
  } catch {}
}
function markCards() {
  const button = $("#load-example");
  button.disabled = loadingExample;
  button.textContent = loadingExample ? "正在加载…" : "填入相关数据";
  $("#demo-routes").hidden = loadingExample || !data.quick || !Object.hasOwn(VERIFIED_DEMO_ROUTES, activeExample);
}
let mode = "quick",
  states = {
    quick: { ...defaults },
    upload: {
      lonA: "",
      latA: "",
      heightA: 2,
      lonB: "",
      latB: "",
      heightB: 2,
      spacing: 100,
      source: "",
      datum: "",
      unit: "",
      dataType: "未知",
    },
  },
  data = { quick: null, upload: null },
  file = null,
  chart = null,
  storageOk = true,
  loadEpoch = 0,
  exampleAbort = null;
function showQualityState() {
  const box = $("#quality-confirm");
  if (mode === "quick") {
    box.checked = false;
    box.disabled = true;
    qualityTextNode.textContent = data.quick?.qualityMask ? " 内置案例对当前线路的插值像元逐一核验同版质量掩膜；DSM 和采样仍有局限。" : " 质量掩膜未验证，暂无法确认数据质量。";
  } else {
    box.disabled = false;
    qualityTextNode.textContent = " 我已依据数据资料核实 NoData、外部掩膜和垂直基准；此确认不消除 DEM 分辨率及采样局限。";
  }
}

try {
  let raw = localStorage.getItem(key);
  if (raw) {
    let v = JSON.parse(raw);
    if (v.version !== 1 || !v.states?.quick || !v.states?.upload)
      throw Error("格式或版本不兼容");
    states = v.states;
  }
} catch (e) {
  storageOk = false;
  $("#terrain-status").textContent =
    "地形参数存储不可用或不兼容；原数据未覆盖，本次仅保存在当前页面。";
}
if (!activeExample) {
  const v = states.quick;
  const same = (a, b) => Number(a) === Number(b);
  const match = Object.entries(EXAMPLES).find(
    ([, x]) =>
      same(v.lonA, x.a.lon) &&
      same(v.latA, x.a.lat) &&
      same(v.heightA, x.a.antenna) &&
      same(v.lonB, x.b.lon) &&
      same(v.latB, x.b.lat) &&
      same(v.heightB, x.b.antenna) &&
      same(v.spacing, 100),
  );
  if (match) activeExample = match[0];
  else if (names.some((k) => !same(v[k], defaults[k]))) quickEdited = true;
}
markCards();
function save() {
  if (storageOk)
    try {
      localStorage.setItem(key, JSON.stringify({ version: 1, states }));
    } catch {
      storageOk = false;
      $("#terrain-status").textContent =
        "地形参数无法持久保存；本次仅在当前页面有效。";
    }
}
function capture() {
  for (const k of names) states[mode][k] = form.elements.namedItem(k).value;
  if (mode === "upload")
    for (const k of ["source", "datum", "unit", "dataType"])
      states.upload[k] = $("#" + k).value;
  save();
}
let successTimer = null;
function clearSuccessNotice() { if (successTimer !== null) clearTimeout(successTimer); successTimer = null; if ($("#terrain-status").textContent === "已更新") $("#terrain-status").textContent = ""; }
function showSuccessNotice() { clearSuccessNotice(); $("#terrain-status").textContent = "已更新"; successTimer = setTimeout(() => { if ($("#terrain-status").textContent === "已更新") $("#terrain-status").textContent = ""; successTimer = null; }, 1800); }
const autoCalculation = createDebouncedCalculation(() => { $("#result").textContent = "正在重新计算…"; calculate(); });
let uploadTimer = null;
function cancelLoad() {
  clearSuccessNotice();
  autoCalculation.cancel();
  if (uploadTimer !== null) clearTimeout(uploadTimer);
  uploadTimer = null;
  loadingExample = false;
  markCards();
  loadEpoch++;
  exampleSequence++;
  if (exampleAbort) exampleAbort.abort();
  exampleAbort = null;
  $("#cancel-load").hidden = true;
}
$("#cancel-load").addEventListener("click", () => {
  cancelLoad();
  data[mode] = null;
  clearPlot();
  clearCase();
  showMetadata();
  $("#radio-results").textContent =
    "几何通视：数据不足；菲涅尔净空：数据不足。";
  $("#result").textContent =
    "加载已取消；若正在解码，浏览器可能仍需片刻释放资源。";
  $("#terrain-status").textContent = "加载已取消，可重新选择文件或案例。";
});
function clearPlot() {
  const wasVisible = !$("#terrain-plot").hidden;
  if (chart) {
    chart.destroy();
    chart = null;
  }
  if (wasVisible) {
    $("#terrain-chart").hidden = true;
    $("#plot-stale").hidden = false;
  } else $("#terrain-plot").hidden = true;
}
function restore() {
  for (const k of names)
    form.elements.namedItem(k).value = states[mode][k] ?? "";
  for (const k of ["source", "datum", "unit", "dataType"])
    $("#" + k).value = states.upload[k] ?? (k === "dataType" ? "未知" : "");
  $("#quick-import").hidden = mode !== "quick";
  $("#upload-import").hidden = mode !== "upload";
  $("#terrain-mode").textContent =
    mode === "quick" ? "快速体验 · 内置 DSM" : "专业分析 · 用户上传";
  $("#result").textContent = data[mode]
    ? "正在更新计算结果…"
    : mode === "upload"
      ? "请重新选择地形数据。"
      : "请选择并加载内置数据。";
  showMetadata();
  showQualityState();
  clearPlot();
}
function showMetadata() {
  const r = data[mode],
    out = $("#metadata");
  out.replaceChildren();
  if (!r) {
    out.textContent = "尚未读取数据。";
    showQualityState();
    return;
  }
  const x = r.originX + r.stepX * (r.width - 1),
    y = r.originY + r.stepY * (r.height - 1);
  const brief = document.createElement("p");
  brief.textContent = `来源：${r.source}；${r.dataType}；${r.crs}；垂直基准 ${r.verticalDatum}。${r.noData === null ? (mode === "quick" && r.qualityMask ? "NoData 未声明；当前线路有效性以质量核验为准。" : "NoData 未声明，像元有效性未知。") : `NoData：${r.noData}。`}`;
  const details = document.createElement("details"),
    summary = document.createElement("summary"),
    full = document.createElement("p");
  summary.textContent = "查看栅格元数据";
  full.textContent = `版本：${r.version}；大小：${r.width} × ${r.height} 像元；有效采样范围：经度 ${Math.min(x, r.originX).toFixed(6)}–${Math.max(x, r.originX).toFixed(6)}，纬度 ${Math.min(y, r.originY).toFixed(6)}–${Math.max(y, r.originY).toFixed(6)}；分辨率：${Math.abs(r.stepX)}° × ${Math.abs(r.stepY)}°；垂直基准来源：${r.verticalSource}；单位 ${r.unit}；${r.rasterType}。${r.qualitySummary || "请按数据说明核对外部掩膜与高程基准。"}${r.licenseNotice ? `；许可声明：${r.licenseNotice}` : ""}`;
  details.append(summary, full);
  out.append(brief, details);
  showQualityState();
}

const radioPrefs = terrainPreferences(caseStorage);
if (radioPrefs.value) {
  $("#radio-frequency").value = radioPrefs.value.frequency;
  $("#radio-ratio").value = radioPrefs.value.ratio;
  $("#radio-curvature").value = radioPrefs.value.curvature;
}
const prefWarning = document.createElement("p");
prefWarning.className = "storage-note";
prefWarning.setAttribute("role", "status");
prefWarning.textContent = radioPrefs.warning;
$("#radio-curvature").closest(".form-grid").after(prefWarning);
function saveRadioPrefs() {
  const f = $("#radio-frequency"),
    r = $("#radio-ratio");
  if (f.value !== "" && f.validity.valid && r.value !== "" && r.validity.valid)
    radioPrefs.save({
      frequency: Number(f.value),
      ratio: Number(r.value),
      curvature: $("#radio-curvature").value,
    });
  prefWarning.textContent = radioPrefs.warning;
}
const curvature = $("#radio-curvature"),
  curvatureText = document.createElement("p");
curvatureText.className = "curvature-current";
curvature.after(curvatureText);
function showCurvature() {
  curvatureText.textContent = "";
}
curvature.addEventListener("change", showCurvature);
showCurvature();
document.querySelectorAll("[data-series]").forEach((b) =>
  b.addEventListener("click", () => {
    if (!chart) return;
    const i = Number(b.dataset.series),
      visible = !chart.isDatasetVisible(i);
    chart.setDatasetVisibility(i, visible);
    b.setAttribute("aria-pressed", String(visible));
    chart.update();
  }),
);
for (const b of document.querySelectorAll("[data-mode]"))
  b.addEventListener("click", () => {
    if (mode === b.dataset.mode) return;
    cancelLoad();
    clearCase();
    capture();
    mode = b.dataset.mode;
    terrainDirty = true;
    $("#quality-confirm").checked = false;
    $("#radio-results").textContent =
      "";
    $("#terrain-understanding").textContent = "";
    restore();
    if (data[mode]) scheduleCalculation();
  });
let terrainDirty = true;
function markStale(kind = "terrain") {
  if (kind === "terrain" || !data[mode]) terrainDirty = true;
  if (terrainDirty) kind = "terrain";
  capture();
  showQualityState();
  clearPlot();
  clearCase();
  $("#result").textContent = "";
  $("#radio-results").textContent = "";
  $("#terrain-understanding").textContent = "";
  $("#terrain-status").textContent = "";
  scheduleCalculation();
}
function scheduleCalculation() {
  clearSuccessNotice();
  autoCalculation.cancel();
  $("#analyse").hidden = true;
  const inputs = [...form.elements, $("#radio-frequency"), $("#radio-ratio")];
  const bad = inputs.some(x => x.required && x.value === "" || x.type === "number" && (x.value === "" || !x.validity.valid || !Number.isFinite(Number(x.value))));
  const coordinateBad = ["lonA","lonB"].some(k => Math.abs(Number(form.elements.namedItem(k).value)) > 180) || ["latA","latB"].some(k => Math.abs(Number(form.elements.namedItem(k).value)) > 90);
  if (bad || coordinateBad) { $("#result").textContent = "请补全必要参数"; $("#plot-stale").textContent = ""; return; }
  if (!data[mode]) { $("#result").textContent = "数据不足，暂无法判断"; $("#plot-stale").textContent = ""; return; }
  $("#result").textContent = "正在更新计算结果…";
  $("#plot-stale").textContent = "";
  autoCalculation.schedule();
}
form.addEventListener("input", () => {
  if (mode === "quick") {
    const route = VERIFIED_DEMO_ROUTES[activeExample] ?? EXAMPLES[activeExample];
    const base = route ? routeFields(route) : defaults;
    quickEdited = names.some(
      (k) =>
        form.elements.namedItem(k).value === "" ||
        Number(form.elements.namedItem(k).value) !== Number(base[k]),
    );
    saveScenario();
  }
});
form.addEventListener("input", (event) => markStale(["heightA","heightB"].includes(event.target.name) ? "radio" : "terrain"));
for (const k of ["source", "datum", "unit", "dataType"])
  $("#" + k).addEventListener("change", () => {
    capture();
    if (mode === "upload" && file) {
      cancelLoad();
      data.upload = null;
      clearPlot();
      clearCase();
      showMetadata();
      $("#result").textContent = "正在更新计算结果…";
      $("#radio-results").textContent = "";
      $("#terrain-status").textContent = "";
      scheduleUpload();
    }
  });
$("#file").addEventListener("change", (e) => {
  cancelLoad();
  file = e.target.files[0] || null;
  data.upload = null;
  clearCase();
  $("#terrain-understanding").textContent = "";
  $("#quality-confirm").checked = false;
  $("#radio-results").textContent =
    "";
  clearPlot();
  showMetadata();
  $("#result").textContent = file
    ? "正在更新计算结果…"
    : "请重新选择地形数据";
  if (file) scheduleUpload();
});
async function load(blob, meta, target, guard = () => true) {
  terrainDirty = true;
  const epoch = ++loadEpoch,
    priorGuard = guard;
  guard = () => epoch === loadEpoch && priorGuard();
  if (target === mode) {
    clearPlot();
    $("#quality-confirm").checked = false;
    $("#radio-results").textContent =
      "";
  }
  try {
    $("#terrain-status").textContent = "";
    $("#result").textContent = "正在更新计算结果…";
    const raster = await readGeoTiff(blob, window.GeoTIFF, meta);
    if (!guard()) return false;
    data[target] = raster;
    if (target === mode) {
      showMetadata();
      $("#result").textContent = "正在更新计算结果…";
    }
    $("#terrain-status").textContent = "";
    return true;
  } catch (e) {
    if (!guard()) return false;
    data[target] = null;
    showMetadata();
    $("#terrain-status").textContent =
      "计算未完成，请检查输入：" +
      e.message;
    $("#result").textContent = "";
  } finally {
    if (epoch === loadEpoch) $("#cancel-load").hidden = true;
  }
}
const routeKey = "longyuan-lora.scenario-routes.v1";
let routeWritable = true,
  routeCache = {};
try {
  const raw = caseStorage.getItem(routeKey);
  if (raw) {
    const v = JSON.parse(raw);
    if (
      v.version !== 1 ||
      !v.routes ||
      typeof v.routes !== "object" ||
      Array.isArray(v.routes)
    )
      throw Error("格式不兼容");
    routeCache = v.routes;
  }
} catch {
  routeWritable = false;
  $("#terrain-status").textContent =
    "案例路线缓存不可用，原数据未覆盖；本次仅在页面内保留。";
}
function rememberRoute() {
  const id = activeExample || "未命名";
  if (quickEdited) {
    capture();
    routeCache[id] = { ...states.quick };
  } else {
    if (!Object.hasOwn(routeCache, id)) return;
    delete routeCache[id];
  }
  if (routeWritable)
    try {
      caseStorage.setItem(
        routeKey,
        JSON.stringify({ version: 1, routes: routeCache }),
      );
    } catch {
      routeWritable = false;
      $("#terrain-status").textContent =
        "路线无法持久保存；本次仅在页面内保留。";
    }
}
let exampleSequence = 0;
async function loadExample(id) {
  if (loadingExample) return;
  const ex = EXAMPLES[id];
  if (!ex || ex.pending) {
    $("#terrain-status").textContent = "请先选择场景。";
    return;
  }
  if (id === activeExample && data.quick && data.quick.qualityMask) {
    if (chart)
      $("#terrain-status").textContent = "当前场景已加载，路线参数保持不变。";
    else calculate();
    return;
  }
  const preserveRoute = id === activeExample && quickEdited;
  if (id !== activeExample) rememberRoute();
  cancelLoad();
  const seq = ++exampleSequence;
  loadingExample = true;
  markCards();
  data.quick = null;
  clearCase();
  clearPlot();
  $("#quality-confirm").checked = false;
  showMetadata();
  $("#result").textContent = "正在更新计算结果…";
  $("#radio-results").textContent =
    "";
  $("#terrain-understanding").textContent = "";
  try {
    $("#terrain-status").textContent = "";
    exampleAbort = new AbortController();
    const { signal } = exampleAbort;
    const files = await Promise.all((ex.parts ?? [ex.url]).map(async (url) => {
      const response = await fetch(url, { signal });
      if (!response.ok) throw Error(`示例文件加载失败（${response.status}）`);
      return response.blob();
    }));
    const blob = files.length === 1 ? files[0] : new Blob(files, { type: "image/tiff" });
    if (seq !== exampleSequence) return;
    const ok = await load(blob, ex, "quick", () => seq === exampleSequence);
    if (ok && mode === "quick") {
      try { data.quick.qualityMask = await loadQualityMask(id, blob, data.quick, exampleAbort.signal); }
      catch (error) { if (seq !== exampleSequence) return; data.quick.qualityMask = null; data.quick.qualityError = "质量掩膜未验证：" + error.message + "；请检查文件后重试。"; }
      if (seq !== exampleSequence || mode !== "quick") return;
      const saved = routeCache[id];
      if (!preserveRoute) {
        if (
          saved &&
          names.every(
            (k) =>
              saved[k] !== undefined &&
              saved[k] !== "" &&
              Number.isFinite(Number(saved[k])),
          )
        )
          Object.assign(states.quick, saved);
        else
          Object.assign(states.quick, routeFields(VERIFIED_DEMO_ROUTES[id] ?? ex));
      }
      activeExample = id;
      quickEdited = preserveRoute || !!saved;
      $("#example").value = id;
      highlightPhoto();
      restore();
      save();
      saveScenario();
      calculate();
    }
  } catch (e) {
    if (seq === exampleSequence) {
      $("#terrain-status").textContent =
        "地形数据文件缺失或加载失败，请加载地形数据并重试：" + e.message;
      $("#result").textContent = "";
    }
  } finally {
    if (seq === exampleSequence) {
      loadingExample = false;
      markCards();
      $("#cancel-load").hidden = true;
    }
  }
}
function scheduleUpload() {
  autoCalculation.cancel();
  if (uploadTimer !== null) clearTimeout(uploadTimer);
  uploadTimer = setTimeout(() => { uploadTimer = null; readUpload(); }, 350);
}
function readUpload() {
  if (uploadTimer !== null) clearTimeout(uploadTimer);
  uploadTimer = null;
  capture();
  if (!file) {
    $("#terrain-status").textContent = "请先选择 GeoTIFF 文件。";
    return;
  }
  load(
    file,
    {
      source: $("#source").value || `用户上传：${file.name}`,
      verticalDatum: $("#datum").value.trim(),
      unit: $("#unit").value,
      dataType: $("#dataType").value,
    },
    "upload",
  ).then(ok => { if (ok && mode === "upload") scheduleCalculation(); });
}
$("#load-file").addEventListener("click", readUpload);
$("#load-example").addEventListener("click", () =>
  loadExample($("#example").value),
);
function chooseDemoRoute(useOriginal) {
  const verified = VERIFIED_DEMO_ROUTES[activeExample];
  if (!verified || !data.quick || loadingExample) return;
  Object.assign(states.quick, routeFields(useOriginal ? EXAMPLES[activeExample] : verified));
  quickEdited = useOriginal;
  restore();
  saveScenario();
  markStale();
  rememberRoute();
}
$("#original-route").addEventListener("click", () => chooseDemoRoute(true));
$("#verified-route").addEventListener("click", () => chooseDemoRoute(false));

function highlightPhoto() {
  for (const el of document.querySelectorAll("[data-photo]"))
    el.classList.toggle("selected", el.dataset.photo === $("#example").value);
}
$("#example").addEventListener("change", () => {
  highlightPhoto();
  if ($("#example").value !== activeExample || !data.quick) {
    if (activeExample) rememberRoute();
    cancelLoad();
    data.quick = null;
    activeExample = "";
    quickEdited = false;
    for (const name of names) form.elements.namedItem(name).value = "";
    $("#quality-confirm").checked = false;
    showMetadata();
    showQualityState();
    clearPlot();
    clearCase();
    $("#terrain-understanding").textContent = "";
    $("#result").textContent = "正在更新计算结果…";
    $("#radio-results").textContent = "";
    $("#terrain-status").textContent = "";
    loadExample($("#example").value);
  }
});
markCards();
function calculate() {
  capture();
  try {
    const r = data[mode];
    if (!r) throw Error("请先读取当前模式的数据");
    if (mode === "quick" && $("#example").value !== activeExample)
      throw Error("请先填入所选场景的数据");
    const get = (k) => {
        const x = form.elements.namedItem(k);
        if (!x.value || !x.validity.valid)
          throw Error("请检查节点坐标、天线高度和采样间距");
        return Number(x.value);
      },
      a = { lon: get("lonA"), lat: get("latA"), antenna: get("heightA") },
      b = { lon: get("lonB"), lat: get("latB"), antenna: get("heightB") };
    let p = profileCache.profile(r, a, b, get("spacing"));
    const freq = $("#radio-frequency"),
      ratio = $("#radio-ratio");
    if (
      !freq.value ||
      !freq.validity.valid ||
      !ratio.value ||
      !ratio.validity.valid
    )
      throw Error("请检查载波频率和净空比例");
    const routeQuality = mode === "quick" ? checkRouteQuality(r, p, r.qualityMask) : null;
    if (routeQuality?.invalid) throw Error(routeQuality.reason);
    const q = analyzeTerrainRadio({
      profile: p,
      heightA: a.antenna,
      heightB: b.antenna,
      frequencyMHz: Number(freq.value),
      clearanceRatio: Number(ratio.value) / 100,
      curvature: $("#radio-curvature").value,
      quality: {
        validPixelsConfirmed:
          mode === "quick" ? routeQuality.valid : (r.noData !== null && $("#quality-confirm").checked),
        verticalDatumConfirmed:
          mode === "quick" ? routeQuality.valid : (!!r.verticalDatum && $("#quality-confirm").checked),
        maxGapMeters: p.distance / (p.points.length - 1) + 1e-6,
      },
    });
    if (typeof Chart === "undefined") throw Error("图表库加载失败");
    if (chart) chart.destroy();
    $("#terrain-plot").hidden = false;
    $("#terrain-chart").hidden = false;
    $("#plot-stale").hidden = true;
    document
      .querySelectorAll("[data-series]")
      .forEach((b) => b.setAttribute("aria-pressed", "true"));
    const points = (fn) => q.rows.map((x) => ({ x: x.distance, y: fn(x) }));
    const obstacle = q.rows.find((x) => x.distance === q.obstructionLocation);
    chart = new Chart($("#terrain-chart"), {
      type: "line",
      data: {
        datasets: [
          {
            label: "地形（含曲率凸起）m",
            data: points((x) => x.terrain),
            borderColor: "#176448",
            borderWidth: 2,
            pointRadius: 0,
          },
          {
            label: "天线视线 m",
            data: points((x) => x.line),
            borderColor: "#364d85",
            borderWidth: 2,
            pointRadius: 0,
          },
          {
            label: "第一菲涅尔区上边界",
            data: points((x) => x.upper),
            borderColor: "#bf8b3d",
            borderDash: [4, 4],
            pointRadius: 0,
          },
          {
            label: "第一菲涅尔区下边界",
            data: points((x) => x.lower),
            borderColor: "#bf8b3d",
            borderDash: [4, 4],
            pointRadius: 0,
          },
          {
            label: "天线顶部",
            data: [
              { x: 0, y: p.startAntenna },
              { x: p.distance, y: p.endAntenna },
            ],
            showLine: false,
            pointRadius: 6,
            backgroundColor: "#b87925",
          },
          {
            label: "最小视线净空位置",
            data: [{ x: obstacle.distance, y: obstacle.terrain }],
            showLine: false,
            pointRadius: 5,
            backgroundColor: "#ad3d2c",
          },
        ],
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        parsing: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { type: "linear", title: { display: true, text: "距离 m" } },
          y: { title: { display: true, text: "高程及等效曲率 m" } },
        },
      },
    });
    $("#result").textContent =
      `${mode === "quick" ? "快速体验" : "专业分析"}｜总距离 ${p.distance.toFixed(2)} m，${p.points.length} 个采样点；起点地面 ${p.points[0].elevation.toFixed(2)} m、天线离地 ${a.antenna} m；终点地面 ${p.points.at(-1).elevation.toFixed(2)} m、天线离地 ${b.antenna} m。来源 ${r.source}，${r.dataType}，${r.verticalDatum}。`;
    $("#radio-results").textContent =
      `几何通视：${q.geometricStatus}；菲涅尔净空：${q.fresnelStatus}。采样点最小视线净空 ${q.minClearance.toFixed(2)} m，位置距起点 ${q.obstructionLocation.toFixed(1)} m；最大遮挡深度 ${q.maxObstruction.toFixed(2)} m。第一菲涅尔区最大侵入 ${q.maxFresnelIntrusion.toFixed(2)} m，位置 ${q.maxFresnelIntrusionLocation.toFixed(1)} m；最不利净空相对所需比例的差值 ${q.worstFresnel.toFixed(2)} m，位置 ${q.worstFresnelLocation.toFixed(1)} m。载波 ${q.frequencyMHz} MHz；参考比例 ${(q.clearanceRatio * 100).toFixed(0)}%；曲率 ${q.k === null ? "平面" : `k=${q.k.toFixed(3)}`}。${q.qualitySufficient ? "采样结果仅供设计参考。" : "像元有效性或高程基准待核实，数值仅供条件分析。"}`;
    const cv = buildCaseView({
      mode,
      id: $("#example").value,
      raster: r,
      profile: p,
      analysis: q,
      a,
      b,
    });
    showCase(cv);
    saveTerrainReport(caseStorage, {
      caseTime: cv.time,
      rows: q.rows,
      frequencyMHz: q.frequencyMHz,
      clearanceRatio: q.clearanceRatio,
      curvature: q.curvature,
      heightA: a.antenna,
      heightB: b.antenna,
      source: r.source,
      dataType: r.dataType,
      verticalDatum: r.verticalDatum,
      crs: r.crs,
      datasetVersion: r.version,
    });
    terrainDirty = false;
    $("#terrain-understanding").textContent = "";
    $("#analyse").hidden = true;
    if (q.qualitySufficient) showSuccessNotice();
    else { clearSuccessNotice(); $("#terrain-status").textContent = mode === "quick" ? (r.qualityError || routeQuality.reason) : (r.noData === null ? "NoData 未声明：无法确认部分高程像元有效性，请核验数据来源。" : "质量掩膜未验证：请核实外部掩膜与高程基准。"); }
  } catch (e) {
    clearCase();
    clearPlot();
    $("#result").textContent = /超出栅格/.test(e.message) ? "当前线路超出 DEM 覆盖范围，请调整节点。" : /NoData|无效高程|缺测数据/.test(e.message) ? "当前剖面包含缺测数据，请调整线路或更换数据。" : "计算未完成，请检查输入：" + e.message;
    $("#radio-results").textContent = "";
    $("#terrain-understanding").textContent = "";
    clearSuccessNotice();
    $("#terrain-status").textContent = "";
    $("#plot-stale").textContent = "";
    $("#analyse").hidden = false;
  }
}
$("#analyse").addEventListener("click", () => { autoCalculation.cancel(); calculate(); });
for (const id of [
  "radio-frequency",
  "radio-ratio",
  "radio-curvature",
  "quality-confirm",
])
  $("#" + id).addEventListener("input", () => {
    if (id !== "quality-confirm") saveRadioPrefs();
    markStale("radio");
  });
restore();
const requested = new URLSearchParams(location.search).get("example");
if (
  requested &&
  Object.hasOwn(EXAMPLES, requested) &&
  !EXAMPLES[requested].pending
) {
  $("#example").value = requested;
  highlightPhoto();
  loadExample(requested);
}
