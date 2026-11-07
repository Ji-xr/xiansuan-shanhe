export const PROJECT = Object.freeze({name:'先算山河',stage:2.5,version:'0.2.5-repair.1'});
// 所有环境参数为待实测校准的演示假设，不对应真实坐标。
export const ENVIRONMENTS = Object.freeze({open:{label:'开阔地',n:2,extra:0},vegetation:{label:'植被遮挡',n:2.5,extra:8},mountain:{label:'山地遮挡',n:3,extra:15}});
export const SCENARIOS = Object.freeze({forest:{name:'祁连山高海拔林区',environment:'vegetation',n:2.8,extra:12,power:17,sf:10,bw:125,distance:3},desert:{name:'河西走廊戈壁',environment:'open',n:2,extra:2,power:14,sf:9,bw:125,distance:5},valley:{name:'黄河上游河谷',environment:'mountain',n:2.7,extra:10,power:17,sf:10,bw:125,distance:4},meadow:{name:'高寒草甸生态监测',environment:'open',n:2,extra:2,power:14,sf:9,bw:125,distance:5},oasis:{name:'绿洲农业环境监测',environment:'vegetation',n:2.5,extra:8,power:14,sf:9,bw:125,distance:3}});
export const DEFAULTS = Object.freeze({power:14,sf:9,bw:125,distance:3,environment:'open',frequency:868,gt:0,gr:0,n:2,extra:0,nf:6,threshold:10,payload:20,cr:1,preamble:8,crc:1,implicit:0,interval:60,capacity:2000,effective:0.8,sleep:0.005,tx:45,awake:4.6,awakeSeconds:1});
export const SNR = Object.freeze({7:-7.5,8:-10,9:-12.5,10:-15,11:-17.5,12:-20});




