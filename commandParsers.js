

export function instanceCommand(command,fn){
    return fn(command);
}



export function classCommand(command, fn){
   return fn(command.className);
}


export function protocolCommand(command, fn){
   return command;
}



export function funcCommand(command, fn){
// todo:
return command;
}

