import {validateRaster} from './terrain-model.js';

export const MAX_FILE_BYTES=80*1024*1024,MAX_CELLS=16000000;

/** Only axis-aligned EPSG:4326 rasters; the raster data is interpreted at pixel centres. */
export async function readGeoTiff(source,lib,metadata={}){
 if(!source||typeof source.size!=='number'||source.size<=0)throw Error('文件为空或不可读取');
 if(source.size>MAX_FILE_BYTES)throw Error('文件超过 80 MiB 限制，请先裁剪数据');
 if(!lib||typeof lib.fromBlob!=='function')throw Error('GeoTIFF 解析库不可用');
 try{
  const tiff=await lib.fromBlob(source),image=await tiff.getImage();
  if(typeof tiff.getImageCount!=='function')throw Error('无法检查 TIFF 内部掩膜结构');
  const imageCount=await tiff.getImageCount();
  if(imageCount>128)throw Error('TIFF 图像目录过多，无法安全检查掩膜');
  for(let i=0;i<imageCount;i++){
   const dir=(i===0?image:await tiff.getImage(i)).getFileDirectory();
   if((Number(dir.NewSubfileType||0)&4)!==0||dir.SubIFDs||dir.ExtraSamples)throw Error('检测到内部掩膜、子目录或附加样本；当前不支持安全识别有效像元，请转换为单波段且将无效值写入 NoData 的 GeoTIFF');
  }
  const w=image.getWidth(),h=image.getHeight(),fd=image.getFileDirectory(),keys=image.getGeoKeys()||{};
  if(w<2||h<2||w*h>MAX_CELLS)throw Error('栅格尺寸超出限制：最多 1600 万像元');
  if(keys.GTModelTypeGeoKey!==2||keys.GeographicTypeGeoKey!==4326||keys.GeogAngularUnitsGeoKey!==9102)throw Error('仅支持经纬度单位为度、明确标注 EPSG:4326 的 GeoTIFF');
  if(![1,2].includes(keys.GTRasterTypeGeoKey))throw Error('缺少像元点/面类型，无法确定地理坐标');
  if(fd.ModelTransformation)throw Error('不支持旋转或矩阵地理变换');
  if(!fd.ModelPixelScale||!fd.ModelTiepoint||fd.ModelTiepoint.length!==6||fd.ModelTiepoint[0]!==0||fd.ModelTiepoint[1]!==0)throw Error('不支持的地理参考：需要左上像元 tiepoint 和像元比例');
  if(image.getSamplesPerPixel()!==1)throw Error('仅支持单波段高程数据');
  const origin=image.getOrigin(),res=image.getResolution(),verticalKey=keys.VerticalCSTypeGeoKey;
  let verticalDatum=verticalKey===3855?'EGM2008 (EPSG:3855)':verticalKey&&verticalKey!==32767?`EPSG:${verticalKey}`:metadata.verticalDatum||'';
  let unit=keys.VerticalUnitsGeoKey===9001?'m':keys.VerticalUnitsGeoKey?`EPSG:${keys.VerticalUnitsGeoKey}`:metadata.unit||'';
  if(!verticalDatum||!unit)throw Error('文件未标明垂直基准或单位；请先根据数据来源明确填写，不得猜测');
  if(unit!=='m')throw Error('仅支持明确以米为高程单位的数据');
  const offset=keys.GTRasterTypeGeoKey===1?.5:0,band=await image.readRasters({samples:[0],interleave:true}),nd=image.getGDALNoData();
  const r={crs:'EPSG:4326',verticalDatum,unit,width:w,height:h,originX:origin[0]+res[0]*offset,originY:origin[1]+res[1]*offset,stepX:res[0],stepY:res[1],noData:Number.isFinite(nd)?nd:null,values:band,rasterType:keys.GTRasterTypeGeoKey===1?'PixelIsArea':'PixelIsPoint',source:metadata.source||'用户上传文件',dataType:metadata.dataType||'未知',version:metadata.version||'未知',verticalSource:verticalKey&&verticalKey!==32767?'文件元数据':'用户或数据集说明，未由文件验证',qualityVerified:metadata.qualityVerified===true,qualitySummary:metadata.qualitySummary||'',licenseNotice:metadata.licenseNotice||''};
  validateRaster(r);return r;
 }catch(e){throw Error(`GeoTIFF 读取失败：${e?.message||'文件损坏、格式不支持或内存不足'}`);}
}
