export const EXAMPLES=Object.freeze({
 qilian:{name:'祁连山示例（张掖南部地区）',url:'./assets/dem/cop-dem-n38-e100.tif',parts:["./assets/dem/cop-dem-n38-e100.tif.part1","./assets/dem/cop-dem-n38-e100.tif.part2"],source:'Copernicus DEM GLO-30 Public · AWS COG（2021 版，原瓦片）',verticalDatum:'EGM2008 (EPSG:3855)',unit:'m',dataType:'DSM',version:'2021；文件最后修改 2022-05-09',a:{lon:100.28,lat:38.75,antenna:2},b:{lon:100.31,lat:38.73,antenna:3}},
 hexi:{name:'河西走廊 · 嘉峪关市周边',url:'./assets/dem/hexi-jyg.tif',source:'Copernicus DEM GLO-30 Public · AWS（2021 版，N39E098 裁剪）',verticalDatum:'EGM2008 (EPSG:3855)',unit:'m',dataType:'DSM',version:'2021；原始瓦片裁剪',a:{lon:98.205,lat:39.83,antenna:2},b:{lon:98.31,lat:39.76,antenna:3}},
 yellow:{name:'黄河上游 · 永靖县刘家峡周边',url:'./assets/dem/yellow-liujiaxia.tif',source:'Copernicus DEM GLO-30 Public · AWS（2021 版，N35E103 裁剪）',verticalDatum:'EGM2008 (EPSG:3855)',unit:'m',dataType:'DSM',version:'2021；原始瓦片裁剪',a:{lon:103.31,lat:35.955,antenna:2},b:{lon:103.37,lat:35.91,antenna:3}},
 dingxi:{name:'定西 · 陇中黄土丘陵沟壑区',url:'./assets/dem/dingxi-loess.tif',source:'Copernicus DEM GLO-30 Public · AWS（2021 版，N35E104 无重采样裁剪）',verticalDatum:'EGM2008 (EPSG:3855)',unit:'m',dataType:'DSM',version:'2021；EDM/FLM/HEM/WBM 同版核验',qualityVerified:true,qualitySummary:'预设线路 105 个采样点所用 261 个插值像元：EDM=1、FLM=2、WBM=0；HEM 0.212–1.868 m；原 DEM 未声明 NoData，裁片依据 EDM void=0 写入 -32767。',licenseNotice:'produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved',a:{lon:104.57,lat:35.66722222222222,antenna:2},b:{lon:104.64222222222222,lat:35.595,antenna:3}},
 maqu:{name:'玛曲 · 高寒草甸区',url:'./assets/dem/maqu-meadow.tif',source:'Copernicus DEM GLO-30 Public · AWS（2021 版，N33E102 无重采样裁剪）',verticalDatum:'EGM2008 (EPSG:3855)',unit:'m',dataType:'DSM',version:'2021；EDM/FLM/HEM/WBM 同版核验',qualityVerified:true,qualitySummary:'预设线路 127 个采样点所用 487 个插值像元：EDM=1、FLM=2、WBM=0；HEM 0.153–0.521 m；原 DEM 未声明 NoData，裁片依据 EDM void=0 写入 -32767。',licenseNotice:'produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved',a:{lon:102.13666666666667,lat:33.958333333333336,antenna:2},b:{lon:102.05,lat:33.87166666666667,antenna:3}}
});

// Alternate demonstration routes use the same DSM and quality mask as each original route.
export const VERIFIED_DEMO_ROUTES = Object.freeze({
  hexi: {
    a: { lon: 98.1819444444, lat: 39.8091666667, antenna: 2 },
    b: { lon: 98.2869444444, lat: 39.7391666667, antenna: 3 },
  },
  yellow: {
    a: { lon: 103.3094444444, lat: 35.9697222222, antenna: 2 },
    b: { lon: 103.3694444444, lat: 35.9247222222, antenna: 3 },
  },
});
