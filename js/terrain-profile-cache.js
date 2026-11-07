import {makeProfile} from './terrain-model.js';

// 只缓存同一栅格和路线的采样；天线高度改变时更新端点高度。
export function createProfileCache(sample = makeProfile) {
  let saved = null;
  return {
    clear() { saved = null; },
    profile(raster, a, b, spacing) {
      for (const h of [a.antenna,b.antenna]) if (!Number.isFinite(h) || h < 0) throw Error('天线高度不得为负或非有限数');
      const key = JSON.stringify([a.lon,a.lat,b.lon,b.lat,spacing]);
      if (!saved || saved.raster !== raster || saved.key !== key) {
        let profile = sample(raster,a,b,spacing);
        if (profile.points.length < 3) profile = sample(raster,a,b,profile.distance / 2);
        saved = {raster,key,profile};
      }
      const p = saved.profile;
      return {...p,startAntenna:p.points[0].elevation+a.antenna,endAntenna:p.points.at(-1).elevation+b.antenna};
    }
  };
}
