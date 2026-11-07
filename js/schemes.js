import {DEFAULTS,ENVIRONMENTS} from './config.js';
import {link,energy} from './model.js';
export const STORAGE_KEY='longyuan-lora.schemes.v1';
const KEYS=Object.keys(DEFAULTS);
export function evaluate(p){
  if(!p||typeof p!=='object'||!Object.hasOwn(ENVIRONMENTS,p.environment))throw new Error('环境配置无效');
  for(const key of KEYS){if(!Object.hasOwn(p,key))throw new Error(`缺少参数：${key}`);if(key!=='environment'&&(typeof p[key]!=='number'||!Number.isFinite(p[key])))throw new Error(`参数无效：${key}`);}
  if(![15,30,60].includes(p.interval))throw new Error('发送间隔无法在界面加载');
  const params=Object.fromEntries(KEYS.map(key=>[key,p[key]]));
  const radio=link(params),power=energy(params);
  return {params,radio,power};
}
export function compare(a,b){const x=evaluate(a),y=evaluate(b);const groups=[['无线参数',['sf','bw','power']],['环境或传播假设',['environment','n','extra']],['通信距离',['distance']],['电池或工作电流条件',['capacity','effective','sleep','tx','awake','awakeSeconds','interval']],['频率、天线或噪声条件',['frequency','gt','gr','nf']],['数据包条件',['payload','cr','preamble','crc','implicit']],['设计余量阈值',['threshold']]];const differences=groups.filter(([,keys])=>keys.some(k=>a[k]!==b[k])).map(([name])=>name);return {a:x,b:y,differences,delta:{margin:y.radio.margin-x.radio.margin,sensitivity:y.radio.sensitivity-x.radio.sensitivity,toaMs:(y.power.toa-x.power.toa)*1000,current:y.power.periodic-x.power.periodic,days:x.power.periodicDays===null||y.power.periodicDays===null?null:y.power.periodicDays-x.power.periodicDays}};}
export function createStore(storage){let state={A:null,B:null};let warning='';let writable=true;
  try{const raw=storage.getItem(STORAGE_KEY);if(raw!==null){const parsed=JSON.parse(raw);if(!parsed||parsed.version!==1||!parsed.slots||typeof parsed.slots!=='object')throw new Error('保存格式不兼容');for(const slot of ['A','B']){if(parsed.slots[slot]!==null&&parsed.slots[slot]!==undefined){const s=parsed.slots[slot];if(!s||typeof s.savedAt!=='string'||!Number.isFinite(Date.parse(s.savedAt)))throw new Error('保存时间无效');if(s.modelVersion!==undefined&&s.modelVersion!=='0.1.0')throw new Error('计算模型版本不兼容');const current=evaluate(s.params);state[slot]={savedAt:s.savedAt,params:current.params,modelVersion:'0.1.0',results:{radio:current.radio,power:current.power}};}}}}catch(e){state={A:null,B:null};warning=`本地保存不可用或数据不兼容（${e.message}）；本次仅保存在当前页面，原有数据未覆盖。`;writable=false;}
  const validSlot=slot=>{if(!['A','B'].includes(slot))throw new Error('方案编号无效');};
  function persist(){if(!writable)return;try{storage.setItem(STORAGE_KEY,JSON.stringify({version:1,slots:state}));}catch{warning='本地存储写入失败，本次修改仅保存在当前页面。';writable=false;}}
  return {get warning(){return warning;},get(slot){validSlot(slot);return state[slot]?structuredClone(state[slot]):null;},save(slot,params,now=new Date()){validSlot(slot);const checked=evaluate(params);if(!(now instanceof Date)||!Number.isFinite(now.getTime()))throw new Error('保存时间无效');state[slot]={savedAt:now.toISOString(),params:checked.params,modelVersion:'0.1.0',results:{radio:checked.radio,power:checked.power}};persist();return this.get(slot);},remove(slot){validSlot(slot);state[slot]=null;persist();}};
}

