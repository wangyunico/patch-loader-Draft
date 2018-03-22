import global from './global.js'

class Point {
    constructor(x,y){
        this.x = x;
        this.y = y;
    }
}
class Size {
    constructor(width,height){
        this.width = width;
        this.height = height;
    }
}

class Rect{
    constructor(point,size){
        function Rect(){};
       return Object.assign(new Rect(),point,size);
    }
}

class LFRange{
    constructor(location,length){
        this.location = location;
        this.length = length;
    }
}

[global.Point,global.Size,global.Rect,global.NSRange] = [function(...arg){return new Point(...arg)},function(...arg){return new Size(...arg)},function(...arg){return new Rect(...arg)},function(...arg){return new LFRange(...arg)}]