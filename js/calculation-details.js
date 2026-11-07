// 计算过程只读取现有模型的结果，并将公式与输入、输出组织为可读文本。
import {SNR} from './config.js';
import {sensitivity,pathLoss,link,airtime,energy} from './model.js';
const num=(v,d=6)=>Number(v).toFixed(d);
export function calculationDetails(p){
 const radio=link(p),air=airtime(p),power=energy(p);
 const noise=sensitivity(p.bw,p.sf,0)-SNR[p.sf];
 const withoutExtra=pathLoss(p.distance,p.frequency,p.n,0);
 const cycle=p.interval*60,sleepSeconds=cycle-air.seconds-p.awakeSeconds;
 return [
  {title:'1. 接收灵敏度',unit:'dBm',value:radio.sensitivity,formula:`S = −174 + 10log₁₀(BW_Hz) + NF + SNRmin\n= −174 + ${num(noise+174)} + ${p.nf} + (${SNR[p.sf]}) = ${num(radio.sensitivity)} dBm\nBW = ${p.bw} kHz = ${p.bw*1000} Hz；SF${p.sf} 的示例 SNRmin = ${SNR[p.sf]} dB；NF = ${p.nf} dB（演示假设）。`},
  {title:'2. 路径损耗',unit:'dB',value:radio.loss,formula:`PL = 20log₁₀(4π × 1 m × f / c) + 10n log₁₀(d / 1 m) + L额外\n频率 f = ${p.frequency} MHz = ${p.frequency*1000000} Hz；距离 d = ${p.distance} km = ${p.distance*1000} m；c = 299792458 m/s。\n传播指数 n = ${p.n}，额外损耗 L额外 = ${p.extra} dB（均为演示假设）。不含额外损耗的模型结果 = ${num(withoutExtra)} dB；PL = ${num(withoutExtra)} + ${p.extra} = ${num(radio.loss)} dB。`},
  {title:'3. 预计接收功率',unit:'dBm',value:radio.received,formula:`Pr = Pt + Gt + Gr − PL = ${p.power} + (${p.gt}) + (${p.gr}) − ${num(radio.loss)} = ${num(radio.received)} dBm\n发射功率 Pt 单位 dBm；天线增益 Gt、Gr 单位 dBi，路径损耗 PL 单位 dB。`},
  {title:'4. 链路余量',unit:'dB',value:radio.margin,formula:`Margin = Pr − S = ${num(radio.received)} − (${num(radio.sensitivity)}) = ${num(radio.margin)} dB\n设计阈值 = ${p.threshold} dB；状态：${radio.label}（模型判断，非通信保证）。`},
  {title:'5. 数据包发送时长',unit:'ms',value:air.seconds*1000,formula:`Ts = 2^SF / BW_Hz = 2^${p.sf} / ${p.bw*1000} = ${num(air.symbol,9)} s\nNpayload = 8 + max(ceil((8PL − 4SF + 28 + 16CRC − 20IH) / (4(SF − 2DE))) × (CR + 4), 0)\nPL = ${p.payload} 字节；CRC = ${p.crc}；IH = ${p.implicit}；CR = ${p.cr}（4/${p.cr+4}）；DE = ${air.ldro}；Npayload = ${air.payloadSymbols} 符号。\nToA = (前导码 + 4.25 + Npayload) × Ts = (${p.preamble} + 4.25 + ${air.payloadSymbols}) × ${num(air.symbol,9)} = ${num(air.seconds,9)} s = ${num(air.seconds*1000,3)} ms。`},
  {title:'6. 平均电流（周期休眠）',unit:'mA',value:power.periodic,formula:`I平均 = (I发 × T发 + I醒 × T醒 + I眠 × T眠) / T周期\nT周期 = ${p.interval} min × 60 = ${cycle} s；T发 = ${num(air.seconds,9)} s；T醒 = ${p.awakeSeconds} s；T眠 = ${num(sleepSeconds,9)} s。\nI发 = ${p.tx} mA；I醒 = ${p.awake} mA；I眠 = ${p.sleep} mA（均为用户输入或演示假设）。\nI平均 = (${p.tx} × ${num(air.seconds,9)} + ${p.awake} × ${p.awakeSeconds} + ${p.sleep} × ${num(sleepSeconds,9)}) / ${cycle} = ${num(power.periodic,9)} mA。`},
  {title:'7. 理论续航估算',unit:'天',value:power.periodicDays,formula:power.periodicDays===null?`有效容量 = ${p.capacity} mAh × ${p.effective} = ${num(p.capacity*p.effective)} mAh；平均电流为 0 mA，无法计算有限续航。`:`续航 = 有效容量 / I平均 / 24 = (${p.capacity} mAh × ${p.effective}) / ${num(power.periodic,9)} mA / 24 = ${num(power.periodicDays,2)} 天。\n仅为当前模型假设下的理论估算，实际使用寿命需要真实设备测试验证。`}
 ];
}
