// 传参数的clsName 和 args数目

export  function objcSelectorConvert (clsName,argsNum) {
let tmpSEL = clsName.replace(/__/g,'-').replace(/_/g,':').replace(/-/g,'_');
     if (tmpSEL.split(':').length - 1 < argsNum ){
        tmpSEL = tmpSEL + ':'  ;
     }
 return tmpSEL;
  }
