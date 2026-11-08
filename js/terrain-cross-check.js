import { EXAMPLES } from './terrain-examples.js';
import { makeProfile, sampleElevation } from './terrain-model.js';
import { checkRouteQuality } from './terrain-quality.js';
import { analyzeTerrainRadio } from './terrain-radio.js';

const supportedCases = new Set(['hexi', 'yellow']);
const folder = './assets/aw3d30/';
const verifiedUpload = {
  size: 1905968,
  demSha256: '191dd5bcb269308b895f4af839fcf61627bb7fd0d95e8765782cc779720f1ead',
  maskSha256: 'eccd00bfd8b2a8ce3c79c96cb5973413fe09ee19c7e152d2e03a2134aec81495',
  maskUrl: './assets/quality/qilian-cross-tile.valid.bin',
};

async function sha256(buffer) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', buffer));
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function loadCrossCheckRaster(id, signal) {
  if (!supportedCases.has(id)) return null;
  const load = async (file) => {
    const response = await fetch(folder + file, { signal });
    if (!response.ok) throw Error('AW3D30 数据文件不可用');
    return response;
  };
  const [manifest, buffer] = await Promise.all([
    load('manifest.json').then(response => response.json()),
    load(`${id}.bin`).then(response => response.arrayBuffer()),
  ]);
  const grid = manifest[id];
  const count = grid.width * grid.height;
  if (buffer.byteLength !== count * 3) throw Error('AW3D30 裁片大小不符');
  if (await sha256(buffer) !== grid.sha256) {
    throw Error('AW3D30 裁片校验失败');
  }
  const values = new Int16Array(count);
  const flags = new Uint8Array(count);
  const view = new DataView(buffer);
  for (let i = 0; i < count; i++) {
    values[i] = view.getInt16(i * 3, true);
    flags[i] = view.getUint8(i * 3 + 2);
  }
  return { raster: { ...grid, values }, flags: { ...grid, values: flags, noData: null } };
}

function sourceEvidence(name, profile, radio, isVerified) {
  const verified = profile.points.map(isVerified);
  const pending = verified.filter(value => !value).length;
  const evidence = { name, total: verified.length, pending, endpointsVerified: verified[0] && verified.at(-1) };
  if (!evidence.endpointsVerified) return evidence;

  const rows = radio.rows.slice(1, -1).filter((_, i) => verified[i + 1]);
  for (const row of rows) {
    if (row.clearance <= 0 && (!evidence.obstruction || row.clearance < evidence.obstruction.clearance)) evidence.obstruction = row;
    if (row.requiredExcess < 0 && (!evidence.fresnel || row.requiredExcess < evidence.fresnel.requiredExcess)) evidence.fresnel = row;
  }
  return evidence;
}

function verdict(primary, secondary, key, blocked, clear) {
  const sources = [primary, secondary].filter(Boolean);
  const obstructed = sources.filter(source => source[key]);
  const cleared = sources.filter(source => source.endpointsVerified && source.pending === 0 && !source[key]);
  if (obstructed.length === 2) return `两套数据均${blocked}`;
  if (obstructed.length && cleared.length) return '两套数据结论不一致，待核验';
  if (obstructed.length) return `${obstructed[0].name} 已核验点${blocked}`;
  if (cleared.length === 2) return `两套数据均${clear}`;
  return '数据不足';
}

function describeEvidence(source) {
  const count = `${source.total - source.pending}/${source.total} 点已核验，${source.pending} 点待核验`;
  const point = source.obstruction ?? source.fresnel;
  if (!source.endpointsVerified) return `${source.name} ${count}，端点待核验。`;
  if (!point) return `${source.name} ${count}。`;
  const excess = source.obstruction ? `视线净空 ${point.clearance.toFixed(2)} m` : `低于参考净空 ${(-point.requiredExcess).toFixed(2)} m`;
  return `${source.name} ${count}，距起点 ${point.distance.toFixed(1)} m 的已核验点${excess}。`;
}

export function compareOriginalRoute({ id, a, b, spacing, raster, profile, radio, options, alternate }) {
  if (!supportedCases.has(id)) return null;
  const original = EXAMPLES[id];
  const same = (point, expected) => Math.abs(point.lon - expected.lon) < 1e-8 && Math.abs(point.lat - expected.lat) < 1e-8;
  if (!same(a, original.a) || !same(b, original.b)) return null;

  const primary = sourceEvidence('Copernicus', profile, radio, point =>
    checkRouteQuality(raster, { points: [point] }, raster.qualityMask).valid);
  let secondary = null;
  let secondaryNote = 'JAXA AW3D30 裁片未加载，可重新打开案例重试。';
  if (alternate) {
    try {
      const otherProfile = makeProfile(alternate.raster, a, b, spacing);
      const otherRadio = analyzeTerrainRadio({ ...options, profile: otherProfile,
        quality: { validPixelsConfirmed: false, verticalDatumConfirmed: true, maxGapMeters: spacing } });
      secondary = sourceEvidence('JAXA AW3D30', otherProfile, otherRadio,
        point => sampleElevation(alternate.flags, point.lon, point.lat) === 0);
      secondaryNote = describeEvidence(secondary);
    } catch {
      secondaryNote = 'JAXA AW3D30 裁片无法为当前线路生成完整剖面。';
    }
  }

  return {
    geometricStatus: verdict(primary, secondary, 'obstruction', '发现遮挡', '核验为采样点无遮挡'),
    fresnelStatus: verdict(primary, secondary, 'fresnel', '未达净空要求', '核验为达到净空要求'),
    obstruction: primary.obstruction ?? primary.fresnel,
    qualityNote: `${describeEvidence(primary)} ${secondaryNote} Copernicus 采用 EGM2008，JAXA AW3D30 采用 EGM96。剖面图使用 Copernicus 高程。`,
  };
}

// Match the exact delivered GeoTIFF before loading its native-grid quality data.
export async function loadUploadQuality(file, raster) {
  if (file.size !== verifiedUpload.size || !globalThis.crypto?.subtle) return null;
  if (await sha256(await file.arrayBuffer()) !== verifiedUpload.demSha256) return null;
  try {
    const response = await fetch(verifiedUpload.maskUrl);
    if (!response.ok) throw Error('质量文件不可用');
    const buffer = await response.arrayBuffer();
    const cells = raster.width * raster.height;
    if (buffer.byteLength !== Math.ceil(cells / 8) || await sha256(buffer) !== verifiedUpload.maskSha256) {
      throw Error('质量文件校验失败');
    }
    const packed = new Uint8Array(buffer);
    const values = new Uint8Array(cells);
    for (let i = 0; i < cells; i++) values[i] = (packed[i >> 3] & (1 << (i & 7))) ? 0 : 1;
    return { flags: { ...raster, values, noData: null } };
  } catch {
    return { error: '配套质量掩膜暂不可用，请重新选择文件重试。' };
  }
}

export function assessUploadQuality(quality, profile, radio) {
  if (!quality) return null;
  if (quality.error) return {
    geometricStatus: '数据不足', fresnelStatus: '数据不足', qualitySufficient: false, qualityNote: quality.error,
  };
  const evidence = sourceEvidence('Copernicus GLO-30', profile, radio,
    point => sampleElevation(quality.flags, point.lon, point.lat) === 0);
  const complete = evidence.endpointsVerified && evidence.pending === 0;
  return {
    geometricStatus: evidence.obstruction ? '已核验点发现遮挡' : complete ? '采样点无遮挡' : '数据不足',
    fresnelStatus: evidence.fresnel ? '已核验点未达净空要求' : complete ? '满足当前设计比例' : '数据不足',
    qualitySufficient: complete,
    obstruction: evidence.obstruction ?? evidence.fresnel,
    qualityNote: describeEvidence(evidence),
  };
}
