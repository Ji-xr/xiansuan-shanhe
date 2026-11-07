# AW3D30 原线路核验裁片

原始数据由 Japan Aerospace Exploration Agency（JAXA）的 ALOS World 3D-30m v3.2 提供，经 JAXA Earth API 读取。裁片保留源格网，无重采样。高程采用 EGM96，每像元由小端有符号 16 位高程和原始 8 位 MSK 构成。范围、来源、裁剪窗口和文件 SHA-256 见 [manifest.json](manifest.json)。

只将双线性插值用到的非零权重像元全部为 MSK 0 的采样点用于独立交叉核验。裁片中的 MSK 8 为 NASA/JPL SRTM-1 v3 填补数据，MSK 40 为 NASA/METI ASTER GDEM v3 填补数据。

- [JAXA AW3D30 v3.2 产品说明](https://www.eorc.jaxa.jp/ALOS/en/dataset/aw3d30/data/aw3d30v3.2_product_e_e1.0.pdf)
- [JAXA 数据使用条款](https://earth.jaxa.jp/en/data/policy/)
