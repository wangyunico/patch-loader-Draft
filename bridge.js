
import global from './global'

let callbackSet = {};
let cbId = 0;
// 用于与oc 通信表示方法的定义
export function declare (...arg){
 try {
   _lufix_declare(...arg);
 }
 catch(e){
  // console.log(e);
 }
}


// 用于与oc 通信表示表示指令的执行
export function evaluate(...arg){
  //return undefined;
  let ret;
  try {
    ret = _lufix_evaluate(...arg);
  }catch(e){
   // console.log(e);
  }finally{
    return ret ;
  } 
 
}


global["_lufix_callback"] = function(callbackId) {
  let fn = callbackSet[callbackId];
   delete callbackSet[callbackId];
  return fn;
}
// 可能存在溢出，这块儿的算法需要调整一下
export function getCallbackId(fn){
 callbackSet[++cbId] = fn;
 return cbId;
}
const jsLogger = global.console.log;
global.console.log = function(...args) {
 evaluate({__type:'log_i',__content:{info:args}});
 jsLogger.apply(global.console,args);
}
export let  logger = jsLogger;