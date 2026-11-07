import {createWorkspace} from './workspace.js';
import {createStore,compare,evaluate} from './schemes.js';
import {readCase} from './case-view.js';
import {readTerrainReport} from './terrain-report-snapshot.js';
import {terrainDistanceComparison} from './terrain-condition.js';
import {readSharedHardware,evaluateHardware,evaluateJoint} from './system-report-data.js';
export function gatherReport(storage){
 const out={created:new Date().toISOString(),warnings:[]};
 try{const w=createWorkspace(storage);if(w.warning)throw Error(w.warning);out.current=evaluate(w.get());}catch(e){out.warnings.push('当前链路配置不可用：'+e.message)}
 const c=readCase(storage);if(c.warning)out.warnings.push(c.warning);out.terrain=c.value;out.profile=readTerrainReport(storage,c.value);
 if(out.terrain&&!out.profile)out.warnings.push('地形图快照不可用或旧版记录未保存剖面，请检查地形数据。');
 try{const s=createStore(storage);if(s.warning)throw Error(s.warning);out.a=s.get('A');out.b=s.get('B');if(out.a&&out.b)out.comparison=compare(out.a.params,out.b.params);}catch(e){out.warnings.push('A/B 数据不可用：'+e.message)}
 try{out.hardware=readSharedHardware(storage);if(out.current)out.power=evaluateHardware(out.hardware,out.current.params);if(out.a&&out.b)try{out.joint=evaluateJoint(out.hardware,out.a.params,out.b.params)}catch(e){out.warnings.push('整机 A/B 联合计算不可用：'+e.message)}}catch(e){out.warnings.push('整机功耗未分析：'+e.message)}
 if(out.terrain&&out.current){out.warnings.push(terrainDistanceComparison(out.terrain.distance,out.current.params.distance));if(out.profile){if(out.profile.frequencyMHz!==out.current.params.frequency)out.warnings.push(`载波频率不同：地形 ${out.profile.frequencyMHz} MHz，链路 ${out.current.params.frequency} MHz。`)}else out.warnings.push('历史地形记录未保存频率，无法自动核对。');}
 return out;
}
