// 用于实现function type 到 
import {
    declare,
    evaluate,
    getCallbackId
} from './bridge.js'


export default function convertToOCBlock(signature, fn){
   // 如果是block 得到block的type
   // 返回后端的函数block的定义 
   let cbId = getCallbackId(fn);
   // 返回自定义的一个block 值，一个block 可以直接eval的
   return evaluate({__type:'block',__content:{typeEncoding:signature,jsFn:cbId}}); 
};