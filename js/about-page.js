import { HELP } from "./help.js";
import { TERRAIN_SOURCE_HTML } from "./terrain-methods-content.js";
import { PARAMETER_SOURCES } from "./power-config.js";
import { PHOTOS, photoMarkup } from "./region-photos.js";
import { createWorkspace } from "./workspace.js";
import { DEFAULTS, ENVIRONMENTS, SCENARIOS } from "./config.js";
import { link, energy, compareScenarios } from "./model.js";
import { createStore, evaluate, compare } from "./schemes.js";
import { makeReport, drawReport, encodePng } from "./report.js";
import { calculationDetails } from "./calculation-details.js";

const $ = (s) => document.querySelector(s);
const number = (name, label, min, max, step) =>
  `<label>${label}<input name="${name}" type="number" min="${min}" max="${max}" step="${step}" required></label>`;
const select = (name, label, options) =>
  `<label>${label}<select name="${name}">${options.map(([value, text]) => `<option value="${value}">${text}</option>`).join("")}</select></label>`;
const fmt = (n, d = 2) => (n === null ? "无法估算" : Number(n).toFixed(d));
const sources = $("#sources");
sources.innerHTML = `<div class="section-heading"><div><p class="eyebrow">05 / MODELS & ASSUMPTIONS</p><h2 id="sources-title">数据来源、模型及假设</h2></div></div><div class="source-copy"><p>路径损耗 PL=20log₁₀(4πd₀f/c)+10n log₁₀(d/d₀)+L；d₀=1 m，f 为 Hz，d 为 m，n 是路径指数，L 是附加损耗 dB。两者是彼此区分的概念假设，可能与实际环境相关，均未实测标定。链路预算未纳入实际地形、遮挡绕射，也没有实现 ITU-R P.833 或 P.526。</p><p>接收功率 Pr=Pt+Gt+Gr−PL；灵敏度 S=−174+10log₁₀(BW Hz)+NF+SINRmin；链路余量=Pr−S。−174 dBm/Hz 是近似室温热噪声，NF 6 dB 为假设。所需 SINR 取自 Semtech TN1300.05 第 7 页表 1 的第一代解调器模型；资料注明第二代约改善 1 dB，此处保守使用第一代值，不代表 SX1262 各芯片的保证门限。</p><p>符号时间 Ts=2^SF/BW；ToA=(前导码+4.25+有效载荷符号数)×Ts；报头、CRC、编码率和符号时间≥16.38 ms 的低速率优化参与计算。平均电流按各状态时长加权；续航=有效容量/平均电流/24，零电流显示无法估算。</p><p>来源：<a href="https://www.semtech.com/uploads/technology/LoRa/predicting-lorawan-capacity.pdf" target="_blank" rel="noopener">Semtech Predicting LoRaWAN Capacity，表 1</a>；<a href="https://www.semtech.com/products/wireless-rf/lora-connect/sx1262" target="_blank" rel="noopener">Semtech SX1262 官方资料入口</a>；<a href="https://www.hy-line-group.com/products/hcp/datasheet/semtech/sx1261-2_datasheet.pdf" target="_blank" rel="noopener">SX1261/2 Rev. 2.1 数据手册第三方镜像，表 3-6、§6.1.1.4、§6.1.4</a>；<a href="https://www.semtech.com/amazon-sidewalk-lora" target="_blank" rel="noopener">Semtech SX1262 产品电流</a>。</p><details><summary>查看仿真适用范围声明</summary><p>本平台为软件仿真原型，采用公开通信模型和示例参数，用于方案可行性初步分析。甘肃场景环境参数为概念性假设，结果并非当地实地测量，不构成实际通信距离、丢包率或电池寿命保证。实际频率、功率和设备参数应符合适用法规及硬件限制。</p></details></div>`;
sources
  .querySelector(".source-copy")
  .insertAdjacentHTML(
    "afterbegin",
    "<p><strong>资料分类：</strong>芯片型号与电流参考值来自 Semtech；链路与续航结果由公式计算；场景指数和遮挡损耗为概念假设；电池、电流及其他输入由用户设置。发射电流不按功率自动推断。</p>",
  );
const flow = document.createElement("section");
flow.className = "model-flow";
flow.innerHTML =
  "<h3>模型流程示意</h3><ol><li><strong>DEM / 地形数据</strong><span>栅格来源与基准</span></li><li><strong>地形剖面</strong><span>沿线采样</span></li><li><strong>通视与菲涅尔</strong><span>中心线净空</span></li><li><strong>LoRa 链路预算</strong><span>独立路径损耗模型</span></li><li><strong>整机功耗</strong><span>工作状态与供电</span></li><li><strong>综合评估</strong><span>并列展示与比较</span></li></ol><p>此图为分析环节示意；当前地形结果不会自动计入 LoRa 链路预算，功耗结果不代表实测寿命。</p>";
sources.prepend(flow);

const methods = document.createElement("section");
methods.className = "section methods";
methods.innerHTML = `<h2>模型与方法</h2><h3>计算模型与参数</h3><p><strong>灵敏度：</strong>S = −174 + 10log₁₀(BW_Hz) + NF + SNRmin，单位 dBm；BW 为 Hz，NF 和最低信噪比为 dB。−174 是室温近似，NF 与解调门限依所选模型假设。</p><p><strong>传播与链路：</strong>PL = PL₀ + 10n log₁₀(d/d₀) + L；PL₀ = 20log₁₀(4πfd₀/c)，d₀ = 1 m，f 为 Hz，d 为 m。接收功率 Pr = Pt + Gt + Gr − PL，余量 M = Pr − S，功率为 dBm、增益 dBi、余量 dB；传播指数 n 和附加损耗 L 为场景假设。</p><p><strong>空中时间：</strong>Ts = 2^SF / BW_Hz；N = 8 + max(ceil((8PL − 4SF + 28 + 16CRC − 20IH) / (4(SF − 2DE))) × (CR + 4), 0)；ToA = (前导码 + 4.25 + N)Ts。PL 为载荷字节；CRC、IH 为 0/1，CR 为 1–4；符号时间 ≥16.38 ms 时 DE=1。适用当前 SF7–SF12 LoRa 配置。</p><p><strong>周期平均电流：</strong>I = (Itx·Ttx + Iawake·Tawake + Isleep·Tsleep) / Tcycle；电流 mA，时间单位一致。理论天数 = 有效容量 mAh / I mA / 24。状态时间超过周期时模型拒绝计算；零平均电流无法给出有限续航。</p><p>SF 增大通常提高灵敏度但延长发送时间；带宽、功率、距离、天线增益、噪声系数和用户输入的发射/休眠电流均影响计算。功率不会自动推导发射电流。</p><h3>场景假设</h3><p>祁连山高海拔林区：n=2.8、额外损耗 12 dB；河西走廊戈壁：n=2、2 dB；黄河上游河谷：n=2.7、10 dB。参数是概念假设，非现场传播测量；通用环境可独立调整 n 和附加损耗。</p><h3>适用边界</h3><p>链路余量不等于实测通信成功率；DEM/DSM 中心线通视与菲涅尔分析不代表完整三维净空，也不会自动计入链路损耗。当前模型假设下的理论续航估算，实际使用寿命需要通过真实设备测试验证。温度、老化、自放电、安装、干扰与重传等因素可能改变结果。</p>`;
sources.append(methods);
for (const p of sources.querySelectorAll(".source-copy > p"))
  if (/^(路径损耗 PL=|接收功率 Pr=|符号时间 Ts=)/.test(p.textContent))
    p.remove();
methods.insertAdjacentHTML(
  "beforeend",
  `<h3>数据与软件来源</h3><p>Semtech TN1300.05 Version 2.0（2024-03，表 1，第 7 页）提供所采用的第一代解调信噪比参考；SX1261/2 Rev. 2.1（2021-12）的第 17 页表 3-6 与第 41 页 §6.1.4 使用第三方镜像核对，2025 版官方正文未获取。上方资料链接保留。</p><p>地形使用 <a href="https://registry.opendata.aws/copernicus-dem/">Copernicus DEM GLO-30 Public 2021</a>，为 DSM；解析使用 geotiff.js 2.1.3（MIT），图表使用 Chart.js 4.4.7（MIT）。项目保留相应许可文件和数据来源记录；垂直基准、外部掩膜和像元有效性需按数据集核实。</p><p>数据类别包括：厂商参考参数、计算所得结果、未实测的场景假设，以及用户自行输入的参数。</p>`,
);

methods.id = "method-link";
const directory = document.createElement("nav");
directory.className = "methods-directory";
directory.setAttribute("aria-label", "模型与方法目录");
directory.innerHTML =
  '<a href="#method-link">链路与续航公式</a><a href="#method-terrain">DEM 与通视</a><a href="#method-power">整机功耗与硬件</a><a href="#method-photos">照片来源</a>';
sources.prepend(directory);
const terrain = document.createElement("section");
terrain.id = "method-terrain";
terrain.className = "section methods";
terrain.innerHTML =
  "<h2>地形数据与几何分析</h2>" +
  TERRAIN_SOURCE_HTML +
  "<h3>通视、曲率与菲涅尔区</h3><p>天线视线按两端地面高程加天线离地高度线性连接；有效地球半径近似的曲率凸起 h=d₁d₂/(2kR)，R=6371008.8 m，k 可选 1 或 4/3；平面选项不计曲率。第一菲涅尔区半径 r₁=√(λd₁d₂/D)，λ=c/f；距离单位为 m、频率为 Hz。仅对剖面中心线采样，净空比例是可调参考，不代表三维净空或现场可靠性。</p><p>内部掩膜、子目录及附加样本不支持，遇到时拒绝；上传文件的外部掩膜无法从单文件识别。五个内置案例的同版 EDM、FLM、HEM 和 WBM 已裁取并与 DEM 网格和像元核对。当前线路的每个非零插值权重像元均单独检查；仅对未编辑、未填补、非水体且 HEM 有效的像元给出已核验状态。编辑、填补和水体不是自动视为无效，但需进一步核查；质量层未覆盖的区域保持数据不足。用户上传文件须按其来源核实。NoData 和非有限值不会参与高程采样。</p><p>依法或受委托负责哥白尼计划的组织不对 Copernicus WorldDEM-30 的任何使用承担责任。</p>";
terrain.innerHTML = terrain.innerHTML.replace(
  "高程基准及用户提供信息均不经平台独立验证。",
  "内置数据的高程基准按源资料核查；用户提供信息由用户核实。",
);
sources.append(terrain);
const power = document.createElement("section");
power.id = "method-power";
power.className = "section methods";
power.innerHTML =
  '<h2>多状态功耗与硬件依据</h2><p>同一非重叠阶段内并发器件分别计能量：E输出=V支路×I×t/3600 mWh，E电池=E输出/转换效率；电池输入侧静态电流单独计 V电池×I静态×T周期/3600。可用电量≈V电池×容量mAh×有效比例，平均功率=周期电量×3600/周期秒。理论续航和现实寿命不同，未充分计入低温、老化、自放电和重传。</p><p>参考模式使用 STM32L072、SX1262、EC-5；发送电流不会随功率自动推导。参考参数、温度、电源状态和用户假设如下：</p><div id="method-power-sources"></div><p><a href="https://www.st.com/resource/en/datasheet/stm32l072kb.pdf">ST STM32L072 手册</a> · <a href="https://www.semtech.com/amazon-sidewalk-lora">Semtech SX1262 规格</a> · <a href="https://publications.metergroup.com/Manuals/20431_EC-5_Manual_Web.pdf">METER EC-5 手册</a></p><p>设备与供电能力、低温容量、稳压器静态消耗和重传等无足够证据时为待验证，不能默认为通过。</p>';
const list = document.createElement("dl");
for (const [k, v] of Object.entries(PARAMETER_SOURCES)) {
  let dt = document.createElement("dt"),
    dd = document.createElement("dd");
  dt.textContent = k + "（" + v.unit + "） · " + v.kind;
  dd.textContent = v.condition;
  list.append(dt, dd);
}
power.querySelector("#method-power-sources").append(list);
power.insertAdjacentHTML(
  "beforeend",
  "<h3>独立数值验证</h3><p>已保存的自动化测试包含：3.7 V × 2000 mAh × 80% = 5920 mWh；1 mW 平均功率约 246.67 天；1 km、1 GHz 中点第一菲涅尔区半径约 8.657 m。测试是模型数值验证，不代表设备或现场实测。</p>",
);
sources.append(power);
const photos = document.createElement("section");
photos.id = "method-photos";
photos.className = "section methods";
photos.innerHTML =
  "<h2>区域照片来源</h2><p>实景仅作区域参考，不参与模型计算，也不表示案例节点的拍摄位置。</p>" +
  Object.values(PHOTOS)
    .map(
      (p) =>
        `<p>${p.name}：${p.scene}，${p.author}，<a href="${p.source}">原图来源</a> · <a href="${p.licenseUrl}">${p.license}</a>；缩放压缩，显示可能裁切。</p>`,
    )
    .join("");
sources.append(photos);

const glossary = document.createElement("section");
glossary.id = "method-parameters";
glossary.className = "section methods";
glossary.innerHTML =
  "<h2>参数与结果释义</h2><dl>" +
  Object.values(HELP)
    .map(([name, text]) => "<dt>" + name + "</dt><dd>" + text + "</dd>")
    .join("") +
  "</dl><h3>简化续航策略</h3><p>周期策略每周期发送一次、唤醒工作指定时间，其余深休眠；常开基线在每周期发送之外保持工作电流，并非持续发射。45 mA 仅在 SX1262 868/915 MHz、+14 dBm 特定 PA 设置下使用参考值，其他条件为输入假设；4.6 mA 为接收电流参考，用于演示常开状态。</p>";
sources.append(glossary);
directory.insertAdjacentHTML(
  "beforeend",
  '<a href="#method-parameters">参数与结果释义</a>',
);
