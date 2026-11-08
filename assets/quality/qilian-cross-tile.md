# 祁连山跨瓦片 GeoTIFF 的质量掩膜

配套文件 `qilian-cross-tile.valid.bin` 绑定的 GeoTIFF SHA-256 为 `191dd5bcb269308b895f4af839fcf61627bb7fd0d95e8765782cc779720f1ead`。两者均由 Copernicus DEM GLO-30 Public 2021 版的 N38E099 和 N38E100 瓦片裁剪并在原网格上拼接。网格为 3554 × 134，像元中心起点为 99.30166666666666°E、38.75833333333333°N，经纬度步长分别为 +1 和 −1 角秒。

质量掩膜按行存储，每像元一位，每字节从最低位开始。置位要求 EDM 1、FLM 2、WBM 0、HEM 有限且非负，同时高程有效。网页检查起终点及各采样点参与双线性插值的非零权重像元。原线路按 100 米间距采样时，843 个点中 687 个通过，两个端点通过。局部核验可识别已核验点的遮挡，无遮挡或净空达标需要全线采样点通过。

Produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved.

[Copernicus 数据与许可](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM) · [AWS 发布目录](https://registry.opendata.aws/copernicus-dem/)
