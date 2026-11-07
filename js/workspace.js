import {DEFAULTS} from './config.js';
import {evaluate} from './schemes.js';
export const WORKSPACE_KEY='longyuan-lora.workspace.v1';
export function createWorkspace(storage){
 let params={...DEFAULTS},warning='',writable=true,state='new',updatedAt=null,revision=null;
 try{const raw=storage.getItem(WORKSPACE_KEY);revision=raw;if(raw!==null){const data=JSON.parse(raw);if(!data||data.version!==1||!data.params)throw Error('版本或格式不兼容');params=evaluate(data.params).params;state='valid';updatedAt=typeof data.updatedAt==='string'&&!Number.isNaN(Date.parse(data.updatedAt))?data.updatedAt:null;}}
 catch(error){warning=`工作配置不可用或损坏（${error.message}）；仅在当前页面使用，原数据未覆盖。`;writable=false;state='invalid';}
 return {get warning(){return warning;},get state(){return state;},get revision(){return revision;},get updatedAt(){return updatedAt;},get(){return {...params};},save(p){params=evaluate(p).params;if(writable)try{updatedAt=new Date().toISOString();const revisionId=globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random()}`;revision=JSON.stringify({version:1,updatedAt,revisionId,params});storage.setItem(WORKSPACE_KEY,revision);state='valid';}catch{writable=false;state='invalid';warning='工作配置无法写入，本次修改仅在当前页面有效。';}return this.get();}};
}
export function storageRevision(storage,keys){return JSON.stringify(keys.map(k=>[k,storage.getItem(k)]));}
