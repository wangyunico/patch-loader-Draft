// requireCocoa 使用iOS 的类
// require('UIView','LuProductModel')
// 返回{UIView:对象的定义, LuProductModel:对象的定义}
import {
    declare,
    evaluate,
    getCallbackId,
    logger
} from './bridge.js'

import {metafuncName} from './metafunc.js'

import {
  instanceCommand,
  classCommand,
  protocolCommand,
  funcCommand} from './commandParsers.js'

import {
  objcSelectorConvert
} from './helper.js'

import global from './global.js'
import {} from './container.js'
import blockDefine from './block.js'
const ClassCache = {};
global.lambdaDefine = blockDefine;

function deCase(caseValue){
    if(caseValue.__octransfer){
           switch (caseValue.type){
             case "array":
             return  new OCArray(caseValue.object,caseValue.origin);
             default:
              return new OCDictionary(caseValue.object,caseValue.origin);
           } 
        }else{
          return caseValue;
        }
}

function commandParser(command){
  if(command == undefined)
  return command;
   switch (command.__type) {
     case "instance":
      return instanceCommand(command.__content,function(instance){
        // 返回实例对象
       return deCase(instance.objInstance);
      })
     case "class":
     return classCommand(command.__content,function(clsName){
         if(ClassCache [clsName] == null) {
           let kls = new Klass(clsName);
           ClassCache[clsName] = kls;
           return kls;
         }else {
          return ClassCache [clsName];
         }
      })
     case "function":
     return funcCommand(command.__content,null)
     case "protocol":
     return protocolCommand(command.__content,null)
     default:
      return command;
   }

}

Object.defineProperty(Object.prototype,metafuncName,{value: function(selector,...args){
     var slf = this;
    if (slf[selector] && typeof slf[selector] == "function") {
        return  slf[selector].apply(slf,args);
    }else {
     let sel = objcSelectorConvert(selector, args.length);
     let that = this;
     let ret =  evaluate({__type: 'method_i', __content: {selName:sel, object: that, arguments:args}});
      return commandParser(ret);
    }
},
writable: true
})

Object.defineProperties(Object.prototype, {
  "oc_get_prop" :{
    value: function(name){
      let slf = this;
      if(slf[name]) return slf[name]; //如果当前有该属性直接返回，如果没有则发送后端通知
      let ret = evaluate({__type: 'property_i', __content:{ propName:name, object:slf, type:'getter'}});
      let val =  commandParser(ret);
      return val;
    },
    writable: true
  },
  "oc_set_prop":{
    value: function(name,val){
    // TODO对函数的支持!!!目前没有同步到后端
    if(typeof val === "function"){
        this["name"] = val;
        return;
      }
    let slf = this;
    let ret = evaluate({__type: 'property_i', __content:{ propName:name, object:slf, value:val, type:'setter'}});
     if (!commandParser(ret)){
       slf[name] = val;
     }
    },
    writable: true
  },
  "strongify":{
    value: function(){
      let ret = evaluate({__type: 'arc',__content:{object:this,type: 'strong'}});
      return commandParser(ret);
    },
    writable:false
  },
    "weakify":{
    value: function(){
     let ret = evaluate({__type: 'arc',__content:{object:this,type: 'weak'}});
      return commandParser(ret); 
    },
    writable:false
  }
});

// 1 针对于mutableDictionary对象我们生成的OC类
class OCDictionary {
  //构造方法
   constructor(object, origin){
     Object.freeze(origin);
     this["getOrigin"]= function(){return origin};
     Object.assign(this,object); 
   }
}

OCDictionary.prototype.oc_get_prop = function(name){
  if(this[name]) return this[name];
  let slf = this.getOrigin();
  return Object.prototype.oc_get_prop.call(slf,name);
}
OCDictionary.prototype.oc_set_prop = function(name,val){
 if(typeof val === 'function'){this["name"] = val; return};
 if(val === null){delete this[name];}; 
  return Object.prototype.oc_set_prop.call(this.getOrigin(),name,val);
}
OCDictionary.prototype[metafuncName] = function(selector, ...args){
  let slf = this.getOrigin();
   if (this[selector] && typeof this[selector] == "function") {
        return  this[selector].apply(this,args);
    }
  return Object.prototype[metafuncName].apply(slf,arguments); 
}

// 针对于mutableArray对象我们生成的OC类

function OCArray(object,origin){
  Array.call(this);
  this.push(...object);
  Object.freeze(origin); 
  this["getOrigin"]= function(){return origin};
  this["preEle"] = object; //初始化对象 
}
OCArray.prototype = Object.create(Array.prototype);
OCArray.prototype.constructor = OCArray;
OCArray.prototype.commit = function(){
  let tmp = Array.from(this); 
  evaluate({__type: 'method_i',__content:{selName:'jsDiff:', object: this.getOrigin(), arguments:[tmp]}})
  this.preEle = tmp;
}
 OCArray.prototype.oc_set_prop = function(name,val){
    if(typeof name === 'number'){
      this[name] = val;
      this.commit();
    }else{
      Object.prototype.oc_set_prop.apply(this,arguments);
    }
 }
  
  OCArray.prototype[metafuncName] = function(selector,...args){
    let slf = this;
    if (this[selector] && typeof this[selector] == "function"){
      if (['pop','push','shift','unshift','splice','sort','reverse'].includes(selector)){
        let tmp = slf[selector].apply(slf,args); 
        this.commit();
        return tmp;
      }else {
        if (typeof slf.preEle[selector]=== 'function'&& selector !== 'oc_set_prop'){
          //如果preEle 响应优先对preEle做
          return slf.preEle[selector].apply(slf.preEle,args); 
        }
        return slf[selector].apply(slf,args); 
      }
    }
  }

// 覆盖log方法 babel 不支持Proxy的转换
// global.console = new Proxy(console, {  
//   get: function(target, key, proxy) {
//     var value = target[key];
//     return function(...args) {
//       evaluate({__type:'log_i',__content:{info:args}});
//       return Reflect.apply(value, target, args);
//     };
//   }
// });


// Super 对象的封装 Super 需要export 出去
class Super {
  constructor(instance){
    this.isSuper = true;
    this.instance = instance;
    // if (instance instanceof Klass) {
    //    return {};
    // }
  }
}
Super.prototype[metafuncName]= function(selector, ...args){
     let slf = commandParser(this.instance); //取出真实的参数
    if (slf[selector] == null) {
      let sel = objcSelectorConvert(selector,args.length);
      // 定义新的命令，super_i 调用实例方法的super 就是oc 生成该父亲类方法的
      let ret ;
      if (slf instanceof Klass){
         ret =  evaluate({__type: 'super_c', __content: {selName:sel, className: slf.className,arguments:args}});
      }else{
         ret =  evaluate({__type: 'super_i', __content: {selName:sel, object: slf,arguments:args}});
      }
     return commandParser(ret);
    }else {
    return  Object.prototype[metafuncName].apply(slf,arguments);
    }
}
global.Super = Super;

class Klass {
  constructor (klsName){
    this.className = klsName;
  }
 // 重新定义类方法
  renewClsMethods(methodsMap){
    let functionNames = Object.keys(methodsMap);
    // 封装指令进行调用：取出函数的名字转成selector 然后将对应的function做关联
    // 调用把class 的name 传入调用后端的命令
    for (var functionName of functionNames) {
      const fn  = methodsMap[functionName]; // 取到对应的函数
      if (!(fn instanceof Function)) continue;
      let selector = objcSelectorConvert(functionName,fn.length);// 转换oc 要的selector
      function boxingFn(instance,...args) {
         // 绑定self & 改变调用关系
         let thatInstance = commandParser(instance);
        let ret = fn.apply(thatInstance, args);
        return ret;
      }
      let cbId = getCallbackId(boxingFn);
        // 调用类方法 调用方法时候需要把当前的instance 传递到oc 环境当中作为调用boxingFn的第一个参数
     declare({__type : 'method_c', __content:{selName: selector, jsFn:cbId , clsName: this.className}});
    }
  }

  // 重新定义实例方法
  renewInstanceMethods(methodsMap){
    let functionNames = Object.keys(methodsMap);
    for (var functionName of  functionNames) {
      const fn  = methodsMap[functionName]; // 取到对应的函数
      if (!(fn instanceof Function)) continue;
      let selector = objcSelectorConvert(functionName,fn.length);// 转换oc 要的selector
      function boxingFn(instance,...args) {
         // 绑定self & 改变调用关系
        let thatInstance = commandParser(instance);
        let ret = fn.apply(thatInstance, args);
        return ret;
      }
        let cbId = getCallbackId(boxingFn);
        // 调用实例方法 调用方法时候需要把当前的instance 传递到oc 环境当中作为调用boxingFn的第一个参数
     declare({__type : 'method_i', __content:{selName: selector, jsFn:cbId , clsName: this.className}});

    }
  }
  // 创建实例方法 
  createInstanceMethods(...args){
   let instanceMethods = this.methodEncodingHelper(...args);
   for (var instanceMethod of instanceMethods){
      instanceMethod["clsName"] = this.className;
      declare({__type: 'method_create_i',__content:instanceMethod});
   }
  }
//创建类方法
  createClassMethods(...args){
     let instanceMethods = this.methodEncodingHelper(...args);
   for (var instanceMethod of instanceMethods){
      instanceMethod["clsName"] = this.className;
      declare({__type: 'method_create_c',__content:instanceMethod});
   }
  }
  methodEncodingHelper(){
     return Array.prototype.map.call(arguments,function(fn){
        let encoding,selName;
        let func = fn(function(type,sel){encoding = type;selName=sel});
        function boxingFn(instance,...args){
          let thatInstance = commandParser(instance);
          return func.apply(thatInstance,args);
        } 
        return {type:encoding,selName:objcSelectorConvert(selName,func.length),jsFn:getCallbackId(boxingFn)};
   });
  }

}
// 该对象的元函数写特殊的方法
Klass.prototype[metafuncName] = function(selector, ...args){
     let slf = this;
    if (slf[selector] == null) {
      let sel = objcSelectorConvert(selector,args.length);
      let that= this;
      // 调用原函数方法,返回封装后的值
      let  ret =  evaluate({__type: 'method_c', __content: {selName:sel,className: this.className, object: that,arguments:args}});
     return commandParser(ret);
    }else {
    return  Object.prototype[metafuncName].apply(slf,arguments);
    }
   };

// 生成类对象返回
export function requireCocoa (...args){
 let  klass = {};
  for (var val of args){
    if (ClassCache[val] == null){
    klass[val] = new Klass(val);
    }
     }
  Object.assign(ClassCache,klass);
 return  Object.freeze( Object.assign({},ClassCache));
}
