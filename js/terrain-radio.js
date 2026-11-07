const R=6371008.8,C=299792458;
const valid=(x)=>typeof x==='number'&&Number.isFinite(x);
/** 局部抛物线等效地球近似；状态仅描述采样剖面，不是传播性能。 */
export function analyzeTerrainRadio({profile,heightA,heightB,frequencyMHz,clearanceRatio,curvature='refracted',quality}){
 if(!profile||!Array.isArray(profile.points)||profile.points.length<3)throw Error('至少需要三个连续地形采样点');
 const D=profile.distance,pts=profile.points;
 if(!valid(D)||D<=0||D>200000)throw Error('路径长度无效或超出局部近似 200 km 上限');
 if(!valid(heightA)||heightA<0||!valid(heightB)||heightB<0)throw Error('天线高度必须为非负有限数');
 if(!valid(frequencyMHz)||frequencyMHz<100||frequencyMHz>10000)throw Error('载波频率须为 100–10000 MHz');
 if(!valid(clearanceRatio)||clearanceRatio<0||clearanceRatio>1)throw Error('菲涅尔参考比例须为 0–1');
 if(!['flat','earth','refracted'].includes(curvature))throw Error('无效曲率选项');
 if(!quality||typeof quality.validPixelsConfirmed!=='boolean'||typeof quality.verticalDatumConfirmed!=='boolean')throw Error('缺少数据质量信息');
 const eps=Math.max(1e-6,D*1e-9); if(Math.abs(pts[0].distance)>eps||Math.abs(pts.at(-1).distance-D)>eps)throw Error('采样点没有覆盖完整路径');
 let maxGap=quality.maxGapMeters; if(!valid(maxGap)||maxGap<=0)throw Error('缺少有效采样间距');
 for(let i=0;i<pts.length;i++){const p=pts[i];if(!valid(p.distance)||!valid(p.elevation)||p.distance < -eps||p.distance>D+eps)throw Error('缺少或无效地形数据');if(i&&(p.distance<=pts[i-1].distance||p.distance-pts[i-1].distance>maxGap+eps))throw Error('地形采样不连续或间距超限');}
 const k=curvature==='flat'?null:curvature==='earth'?1:4/3,ae=k?R*k:null;
 const za=pts[0].elevation+heightA,zb=pts.at(-1).elevation+heightB,lambda=C/(frequencyMHz*1e6);
 const rows=pts.map(p=>{const d1=p.distance,d2=D-d1,t=d1/D;const bulge=ae?d1*d2/(2*ae):0;const line=za+(zb-za)*t;const terrain=p.elevation+bulge;const radius=Math.sqrt(Math.max(0,lambda*d1*d2/D));const clearance=line-terrain;return {distance:d1,elevation:p.elevation,bulge,terrain,line,radius,clearance,lower:line-radius,upper:line+radius,penetration:Math.max(0,radius-clearance),requiredExcess:clearance-clearanceRatio*radius};});
 const inner=rows.slice(1,-1),worst=inner.reduce((a,b)=>a.clearance<=b.clearance?a:b),fresnelWorst=inner.reduce((a,b)=>a.requiredExcess<=b.requiredExcess?a:b);
 const intrusion=inner.reduce((a,b)=>a.penetration>=b.penetration?a:b);
 const sufficient=quality.validPixelsConfirmed&&quality.verticalDatumConfirmed;const geo=worst.clearance>0?'无遮挡':'存在遮挡';const fresnel=fresnelWorst.requiredExcess>=0?'满足当前设计比例':'未满足';
 return {rows,distance:D,frequencyMHz,clearanceRatio,curvature,k,minClearance:worst.clearance,maxObstruction:Math.max(0,-worst.clearance),obstructionLocation:worst.distance,maxFresnelIntrusion:intrusion.penetration,maxFresnelIntrusionLocation:intrusion.distance,worstFresnel:fresnelWorst.requiredExcess,worstFresnelLocation:fresnelWorst.distance,geometricStatus:sufficient?geo:'数据不足',fresnelStatus:sufficient?fresnel:'数据不足',qualitySufficient:sufficient,assumptions:'仅采样点、球面局部近似；不含建筑、植被变化、传播损耗或实测可靠性。'};
}

