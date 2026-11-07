import {QUALITY_MANIFEST} from './terrain-quality-manifest.js';
// 同版 Copernicus 质量层：每像元 EDM、FLM、WBM 各 1 字节，HEM float32 LE。
export async function loadQualityMask(id,blob,r,signal){
 const m=QUALITY_MANIFEST[id];if(!m||!globalThis.crypto?.subtle)throw Error('质量掩膜未验证：缺少清单或 SHA-256 功能。');
 const digest=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');
 if(await digest(await blob.arrayBuffer())!==m.demSha256)throw Error('DEM 与质量掩膜的来源或版本不匹配。');
 if(Math.abs(r.originX-m.origin[0])>1e-10||Math.abs(r.originY-m.origin[1])>1e-10||Math.abs(r.stepX-m.resolution[0])>1e-12||Math.abs(r.stepY-m.resolution[1])>1e-12)throw Error('DEM 与质量掩膜网格不匹配。');
 const response=await fetch('./'+m.maskPath,{signal});if(!response.ok)throw Error('质量掩膜文件缺失。');const raw=await response.arrayBuffer();if(await digest(raw)!==m.maskSha256)throw Error('质量掩膜校验失败。');
 return {width:m.width,height:m.height,offsetX:m.offsetX,offsetY:m.offsetY,bytes:new Uint8Array(raw)};
}
export function checkRouteQuality(r,profile,mask){
 if(!mask)return {valid:false,reason:'质量掩膜未验证：请检查与 DEM 同版的质量层。'};
 const {width,height,offsetX,offsetY,bytes}=mask;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2||!Number.isInteger(offsetX)||!Number.isInteger(offsetY)||!(bytes instanceof Uint8Array)||bytes.byteLength!==width*height*7)return {valid:false,reason:'质量掩膜格式或网格不匹配。'};
 if(!r||!profile||!Array.isArray(profile.points)||profile.points.length===0||![r.originX,r.originY,r.stepX,r.stepY].every(Number.isFinite)||!r.stepX||!r.stepY)return {valid:false,reason:'线路或栅格参数不完整，无法核验质量。'};
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),visited=new Set();let flagged=null;
 for(const p of profile.points){let x=(p.lon-r.originX)/r.stepX,y=(p.lat-r.originY)/r.stepY;const eps=1e-9;if(!Number.isFinite(x)||!Number.isFinite(y)||x < -eps||y < -eps||x > r.width-1+eps||y > r.height-1+eps)return {valid:false,reason:'当前线路超出 DEM 覆盖范围。'};if(Math.abs(x-Math.round(x))<eps)x=Math.round(x);if(Math.abs(y-Math.round(y))<eps)y=Math.round(y);x=Math.max(0,Math.min(r.width-1,x));y=Math.max(0,Math.min(r.height-1,y));const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(x0+1,r.width-1),y1=Math.min(y0+1,r.height-1),fx=x-x0,fy=y-y0;
  for(const [col,row,weight] of [[x0,y0,(1-fx)*(1-fy)],[x1,y0,fx*(1-fy)],[x0,y1,(1-fx)*fy],[x1,y1,fx*fy]]){if(weight===0)continue;const mx=col-offsetX,my=row-offsetY;if(mx<0||my<0||mx>=width||my>=height)return {valid:false,reason:'质量掩膜未覆盖当前线路，请选择掩膜覆盖的线路。'};const index=my*width+mx;if(visited.has(index))continue;visited.add(index);const pos=index*7,edm=bytes[pos],flm=bytes[pos+1],wbm=bytes[pos+2],hem=v.getFloat32(pos+3,true);if(edm===0||flm===0)return {valid:false,invalid:true,reason:'当前剖面包含缺测数据（质量掩膜标记为无效像元）。'};if(edm!==1||flm!==2||wbm!==0||!Number.isFinite(hem)||hem<0)flagged={valid:false,reason:`质量掩膜含编辑、填补、水体或未知误差（EDM ${edm}、FLM ${flm}、WBM ${wbm}），暂无法判断。`};}
 }
 return flagged||{valid:true,reason:'当前线路插值像元已核验同版质量掩膜；仍受 DSM 精度和中心线采样限制。',cells:visited.size};
}
