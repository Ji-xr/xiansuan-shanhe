import {evaluate,compare} from './schemes.js';
import {ENVIRONMENTS} from './config.js';
export const REPORT_SIZE={width:1920,height:1080};
export const format=(value,digits=2)=>value===null?'无法估算':Number(value).toFixed(digits);
export function makeReport(mode,inputs,date=new Date()){
 if(!['single','compare'].includes(mode)||!(date instanceof Date)||!Number.isFinite(date.getTime()))throw new Error('报告参数无效');
 const cmp=mode==='compare'?compare(inputs.A,inputs.B):null;
 const entries=mode==='single'?[{name:'当前方案',data:evaluate(inputs.current)}]:[{name:'方案 A',data:cmp.a},{name:'方案 B',data:cmp.b}];
 return {mode,date:date.toLocaleString('zh-CN',{hour12:false}),entries,differences:cmp?.differences??[],delta:cmp?.delta??null};
}
const text=(ctx,s,x,y,size=27,color='#24443a',bold=false,maxWidth=1780)=>{ctx.font=`${bold?'700':'400'} ${size}px "Microsoft YaHei", "PingFang SC", sans-serif`;ctx.fillStyle=color;ctx.fillText(s,x,y,maxWidth);};
export function drawReport(canvas,report){
 if(!canvas||!report?.entries?.length)throw new Error('无法生成报告');canvas.width=REPORT_SIZE.width;canvas.height=REPORT_SIZE.height;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('浏览器不支持画布');
 ctx.fillStyle='#f5f8f4';ctx.fillRect(0,0,1920,1080);ctx.fillStyle='#175b45';ctx.fillRect(0,0,1920,16);
 text(ctx,'先算山河  /  LoRa 链路与续航分析',70,90,42,'#153e30',true);text(ctx,report.mode==='single'?'单方案结果':'A / B 方案比较',70,145,28,'#547164');text(ctx,`生成时间：${report.date}`,1260,90,25,'#547164');
 const cardWidth=report.entries.length===1?1780:870;
 report.entries.forEach(({name,data},i)=>{const x=70+i*910,y=195,p=data.params,r=data.radio,e=data.power;ctx.fillStyle='#ffffff';ctx.fillRect(x,y,cardWidth,650);text(ctx,name,x+30,y+55,31,'#175b45',true);
 const rows=[`模型预测链路余量   ${format(r.margin)} dB   ·   风险 ${r.risk}`,`理论状态   ${r.label}`,`周期休眠平均电流   ${format(e.periodic,5)} mA`, `周期休眠预计续航   ${format(e.periodicDays)}${e.periodicDays===null?'':' 天'}`,`接收灵敏度   ${format(r.sensitivity)} dBm   ·   ToA ${format(e.toa*1000,3)} ms`, `发射 ${p.power} dBm   ·   SF${p.sf}   ·   BW ${p.bw} kHz   ·   距离 ${p.distance} km`,`环境 ${ENVIRONMENTS[p.environment].label}   ·   n ${p.n}   ·   附加损耗 ${p.extra} dB`,`电池 ${p.capacity} mAh × ${p.effective}   ·   发送间隔 ${p.interval} min`,`发送电流 ${p.tx} mA（假设）   ·   休眠 ${p.sleep} mA`,`频率 ${p.frequency} MHz   ·   NF ${p.nf} dB   ·   阈值 ${p.threshold} dB`,`包长 ${p.payload} 字节 · 前导码 ${p.preamble} · 编码率 4/${p.cr+4} · CRC ${p.crc?'开':'关'}`,`报头 ${p.implicit?'隐式':'显式'} · 天线增益 ${p.gt}/${p.gr} dBi`,`唤醒电流 ${p.awake} mA · 每周期唤醒 ${p.awakeSeconds} s`];
 rows.forEach((s,j)=>text(ctx,s,x+30,y+110+j*43,j===0?27:23,j===0?'#175b45':'#24443a',j===0,cardWidth-60));});
 const diff=report.mode==='compare'?(report.differences.length?`条件不一致：${report.differences.join('、')}`:'环境、距离、电池及接收条件一致；无线电参数仍可能不同。'):'参考芯片：SX1262；环境参数和用户电流为估算假设。';
 text(ctx,diff,70,895,24,'#704b24',true);if(report.delta)text(ctx,`差值 B − A：链路余量 ${format(report.delta.margin)} dB · 平均电流 ${format(report.delta.current,5)} mA · 续航 ${format(report.delta.days)}${report.delta.days===null?'':' 天'}`,70,930,22,'#526a5e');text(ctx,'软件仿真结果，非实地实测',70,965,29,'#175b45',true);text(ctx,'参考芯片 SX1262；不代表真实可靠性；未计传感器、MCU、温度、老化、重传；发射电流不随功率自动联动。',70,1010,23,'#526a5e');
 return canvas;
}
export function encodePng(canvas){return new Promise((resolve,reject)=>{try{if(!canvas||typeof canvas.toBlob!=='function')throw new Error('浏览器不支持 PNG 导出');canvas.toBlob(blob=>{if(!blob||blob.type!=='image/png'||!blob.size)reject(new Error('PNG 编码失败'));else resolve(blob);},'image/png');}catch(error){reject(error);}});}

