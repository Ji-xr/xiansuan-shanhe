import {help,attachFieldHelp,explainLife} from './help.js';
import {diagnoseCustom} from './system-report-data.js';
import {createSystemLines,downloadSystemReport} from './system-report.js';
import {mountCustomEditor} from './custom-power-ui.js';
import {CUSTOM_KEY} from './custom-power-store.js';
import {REFERENCE_INPUT,PARAMETER_SOURCES} from './power-config.js';
import {assessPower} from './power-assessment.js';
import {createWorkspace,storageRevision} from './workspace.js';
const KEY='longyuan-lora.system-power.v1';let storage;try{storage=window.localStorage;}catch{storage={getItem(){throw Error('存储不可用')}};}let writable=true,settings={...REFERENCE_INPUT},message='';try{const raw=storage.getItem(KEY);if(raw!==null){const o=JSON.parse(raw);if(o.version!==1||!o.settings||Object.keys(REFERENCE_INPUT).some(k=>!Object.hasOwn(o.settings,k)))throw Error('版本或字段不兼容');settings={...o.settings};}}catch(e){writable=false;message='整机配置无法读取或格式不兼容，原数据未覆盖；本次仅在当前页面有效。';}
const hardwareKeys = [KEY, CUSTOM_KEY];
const hardwareConflict = '另一标签页已更新整机配置。请刷新此页后继续编辑或导出。';
function readHardwareRevision() {
  try { return storageRevision(storage, hardwareKeys); }
  catch { return null; }
}
let hardwareRevision = readHardwareRevision();
function hardwareIsCurrent() {
  const current = readHardwareRevision();
  return current === null || current === hardwareRevision;
}
const hardwareStorage = {
  getItem: key => storage.getItem(key),
  setItem(key, value) {
    if (!hardwareIsCurrent()) throw Error(hardwareConflict);
    storage.setItem(key, value);
    hardwareRevision = readHardwareRevision();
  },
};

let workspace=createWorkspace(storage);const root=document.createElement('section');root.className='section';root.innerHTML=`<h2>多状态整机功耗分析</h2><p>单向 LoRa P2P · 理论估算，非实测；不计 LoRaWAN 接收窗口、重传、老化及温度影响。</p><p id="sys-status" role="status"></p><nav class="system-tabs" aria-label="整机功耗分析视图"><button type="button" data-view="device">设备配置</button><button type="button" data-view="cycle">工作周期</button><button type="button" data-view="result">能耗分析</button></nav><div id="sys-device"><p>发送电流需输入，不由发射功率推算。<a href="./pages/about.html#method-power">模型与参数来源</a></p><form id="sys-form" class="form-grid" novalidate></form></div><div id="sys-cycle" hidden><h3>工作时间轴</h3><div id="sys-timeline" class="table-wrap"></div></div><div id="sys-result" hidden><h3>整机能耗与约束</h3><div id="sys-results" aria-live="polite"></div><p id="sys-understanding" class="result-understanding"></p><details><summary>查看计算过程</summary><div id="sys-details"></div></details><div id="sys-diagnostics" aria-live="polite"></div><button type="button" id="export-system">导出整机功耗 PNG</button><p id="export-system-status" role="status"></p><div class="joint-charts"><div><h4>器件电池侧能耗</h4><div class="joint-chart"><canvas id="sys-device-chart"></canvas></div></div><div><h4>阶段电池侧能耗</h4><div class="joint-chart"><canvas id="sys-stage-chart"></canvas></div></div></div></div>`;document.querySelector('main').insertBefore(root,document.querySelector('#energy')); 
const labels={cycleSeconds:'周期 s',batteryV:'电池标称电压 V',capacityMah:'电池容量 mAh',effective:'电池有效容量比例',logicV:'MCU/无线支路电压 V',sensorV:'传感器支路电压 V',logicEfficiency:'MCU/无线转换效率',sensorEfficiency:'传感器转换效率',quiescentMa:'电池侧静态电流 mA',mcuMa:'MCU 活动电流 mA（假设）',mcuSleepMa:'MCU 休眠电流 mA（假设）',radioSleepMa:'无线休眠电流 mA（假设）',txMa:'无线发送电流 mA',sensorMa:'传感器采样电流 mA',wakeSeconds:'唤醒时长 s（假设）',sampleSeconds:'采样时长 s',processSeconds:'处理时长 s（假设）',switchSeconds:'切换时长 s（假设）',targetDays:'目标续航天数（用户输入）',logicPeakMa:'MCU/无线峰值能力 mA（用户输入）',sensorPeakMa:'传感器峰值能力 mA（用户输入）'};
const form=root.querySelector('#sys-form');form.innerHTML=`<label>设备模式<select name="mode"><option value="reference">参考硬件</option><option value="custom">自定义设备</option></select></label>`+Object.entries(labels).slice(0,9).map(([key,label])=>`<label>${label}<input type="number" name="${key}" min="0" step="any" required></label>`).join('')+`<details class="power-advanced"><summary>工作电流、时长与约束</summary><div class="form-grid">`+Object.entries(labels).slice(9).map(([key,label])=>`<label>${label}<input type="number" name="${key}" min="0" step="any" required></label>`).join('')+`</div></details>`;for(const el of form.elements)if(el.name)el.value=settings[el.name];let charts=[];if(typeof Chart!=='undefined'){charts=['sys-device-chart','sys-stage-chart'].map(id=>new Chart(root.querySelector('#'+id),{type:'bar',data:{labels:[],datasets:[{label:'电池侧能耗占比 %',data:[],backgroundColor:'#387b52'}]},options:{responsive:true,maintainAspectRatio:false,animation:false,indexAxis:'y'}}));}
let uiRevision=0;let editor;function assessEdited(next,radio){try{return diagnoseCustom(editor.evaluate(next,radio),next);}catch(e){return {errors:[{level:'错误',cause:e.message,basis:'自定义配置与模型校验',action:'修正输入'}],warnings:[],pending:[],result:null};}}
function checkHardware() {
  if (hardwareIsCurrent()) return true;
  root.querySelector('#sys-status').textContent = hardwareConflict;
  root.querySelector('#sys-results').textContent = '整机配置已变更，当前结果已过期。';
  root.querySelector('#sys-understanding').textContent = '';
  root.querySelector('#sys-details').textContent = '';
  root.querySelector('#sys-timeline').textContent = '';
  root.querySelector('#sys-diagnostics').replaceChildren();
  root.querySelector('#export-system').disabled = true;
  for (const chart of charts) {
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.update();
  }
  return false;
}

const f=n=>Number(n).toPrecision(5);function update(saveHardware = true){uiRevision++;if(!checkHardware())return;try{if(workspace.revision!==storage.getItem('longyuan-lora.workspace.v1'))workspace=createWorkspace(storage);}catch{workspace=createWorkspace(storage);}if(workspace.warning){root.querySelector('#sys-status').textContent=workspace.warning;root.querySelector('#sys-results').textContent='当前通信配置不可用。';root.querySelector('#sys-details').textContent='';root.querySelector('#sys-timeline').textContent='';root.querySelector('#sys-diagnostics').replaceChildren();root.querySelector('#export-system').disabled=true;for(const c of charts){c.data.labels=[];c.data.datasets[0].data=[];c.update();}return;}let next={};for(const el of form.elements){if(!el.name)continue;if(el.name==='mode')next.mode=el.value;else next[el.name]=el.value===''?NaN:Number(el.value);}if(editor)editor.setActive(next.mode==='custom');for(const key of ['mcuMa','mcuSleepMa','radioSleepMa','txMa','sensorMa','wakeSeconds','sampleSeconds','processSeconds','switchSeconds'])form.elements.namedItem(key).closest('label').hidden=next.mode==='custom';const a=next.mode==='custom'&&editor?assessEdited(next,workspace.get()):assessPower(next,workspace.get());const result=root.querySelector('#sys-results'),timeline=root.querySelector('#sys-timeline'),diag=root.querySelector('#sys-diagnostics');diag.replaceChildren();for(const d of [...a.errors,...a.warnings,...a.pending]){let p=document.createElement('p');p.textContent=`${d.level}：${d.cause}。依据：${d.basis}；建议：${d.action}。`;diag.append(p);}root.querySelector('#export-system').disabled=!a.result;if(!a.result){root.querySelector('#sys-understanding').textContent='如何理解这个结果：输入无效，无法估算续航。';root.querySelector('#sys-details').textContent='输入无效，明细不可用。';result.textContent='输入无效，已停止计算。';timeline.textContent='时间轴不可用。';for(const c of charts){c.data.labels=[];c.data.datasets[0].data=[];c.update();}return;}settings=next;if(saveHardware&&next.mode==='custom'&&editor)try{editor.persist(next,workspace.get());}catch(e){message='自定义配置保存失败：'+e.message;}if(saveHardware&&writable)try{hardwareStorage.setItem(KEY,JSON.stringify({version:1,settings}));}catch{writable=false;message='整机配置无法保存，本次仅在当前页面有效。';}root.querySelector('#sys-status').textContent=[message,workspace.warning,editor?.warning].filter(Boolean).join(' ');const r=a.result;root.querySelector('#sys-understanding').textContent='理论估算，实际寿命需设备验证。';root.querySelector('#sys-details').textContent=r.stages.map(stage=>`${stage.name} ${f(stage.seconds)} s：`+stage.details.map(d=>`${d.name}（${d.state}，${d.rail}）${d.voltage} V × ${d.currentMa} mA × ${f(d.seconds)} s ÷ 3600 = ${f(d.outputMwh)} mWh；效率 ${d.efficiency}，电池侧 ${f(d.batteryMwh)} mWh`).join('；')).join('。')+`。电池侧静态消耗 ${next.batteryV} V × ${next.quiescentMa} mA × ${next.cycleSeconds} s ÷ 3600 = ${f(r.regulatorMwh)} mWh；总 ${f(r.batteryMwh)} mWh/周期；平均 ${f(r.avgMw)} mW；每日 ${f(r.dailyMwh)} mWh；续航 ${r.days===null?'无法估算有限寿命':f(r.days)+' 天'}。`;result.textContent=`单周期 ${f(r.batteryMwh)} mWh；每日 ${f(r.dailyMwh)} mWh；平均电池功率 ${f(r.avgMw)} mW；可用电量 ${f(r.availableMwh)} mWh；理论续航 ${r.days===null?'零功耗，无法估算有限寿命':f(r.days)+' 天'}。发送时间 ${(r.toa*1000).toFixed(3)} ms。静态损耗 ${f(r.regulatorMwh)} mWh/周期。模型估算，非实测。`;timeline.textContent=r.stages.map(s=>`${s.name}：${f(s.seconds)} s，${s.devices.map(d=>`${d.name} ${d.currentMa} mA`).join(" + ")}，电池侧 ${f(s.batteryMwh)} mWh`).join('；')+`。电池侧静态损耗另计。`;const datasets=[Object.entries(r.devices),[...r.stages.map(s=>[s.name,s.batteryMwh]),['稳压器静态',r.regulatorMwh]]];charts.forEach((c,i)=>{c.data.labels=datasets[i].map(x=>x[0]);c.data.datasets[0].data=datasets[i].map(x=>r.batteryMwh===0?0:100*x[1]/r.batteryMwh);c.update();});}
editor=mountCustomEditor({root,storage:hardwareStorage,settings,radio:()=>workspace.get(),beforeSave:checkHardware,changed:()=>update()});editor.setActive(settings.mode==='custom');root.querySelector('#export-system').addEventListener('click',async()=>{const status=root.querySelector('#export-system-status');try{if(!checkHardware())throw Error(hardwareConflict);if(workspace.warning)throw Error(workspace.warning);if(workspace.revision!==storage.getItem('longyuan-lora.workspace.v1'))throw Error('配置正在同步，请稍后重试');const rev=storageRevision(storage,['longyuan-lora.workspace.v1','longyuan-lora.system-power.v1','longyuan-lora.custom-power.v1']),ui=uiRevision;let next={};for(const el of form.elements)if(el.name)next[el.name]=el.name==='mode'?el.value:el.value===''?NaN:Number(el.value);const radio=workspace.get();const a=next.mode==='custom'?assessEdited(next,radio):assessPower(next,radio);if(!a.result)throw Error(a.errors.map(x=>x.cause).join('；'));const h={settings:next,custom:next.mode==='custom'?editor.snapshot(next):null};await downloadSystemReport(createSystemLines(h,radio,a),Object.entries(a.result.devices).map(([label,value])=>({label,value})),'先算山河-整机功耗.png',()=>ui===uiRevision&&rev===storageRevision(storage,['longyuan-lora.workspace.v1','longyuan-lora.system-power.v1','longyuan-lora.custom-power.v1']));status.textContent='PNG 已生成，浏览器将处理下载。';}catch(e){status.textContent='导出失败：'+e.message;}});form.addEventListener('input',()=>update());const tabs=root.querySelector('.system-tabs');for(const b of tabs.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.view==='device'));tabs.addEventListener('click',e=>{const id=e.target.dataset.view;if(!id)return;for(const name of ['device','cycle','result'])root.querySelector('#sys-'+name).hidden=id!==name;for(const b of tabs.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.view===id));if(id==='result')for(const c of charts)c.resize();});root.querySelector('#sys-status').textContent=message;update();window.addEventListener('storage', event => {
  if (event.key === null || event.key === 'longyuan-lora.workspace.v1' || hardwareKeys.includes(event.key)) {
    workspace = createWorkspace(storage);
    update(false);
  }
});
