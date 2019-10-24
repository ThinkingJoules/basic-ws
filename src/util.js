import { decode as dec, encode as enc } from "@msgpack/msgpack";



//getter and setters
export function setValue(propertyPath, value, obj,merge){
    if(!Array.isArray(propertyPath))throw new Error('Must provide an array for propertyPath')
    if (propertyPath.length > 1) {
        if (!obj.hasOwnProperty(propertyPath[0]) || typeof obj[propertyPath[0]] !== "object") obj[propertyPath[0]] = {}
        return setValue(propertyPath.slice(1), value, obj[propertyPath[0]],merge)
    } else {
        if(merge && typeof value == 'object' && value !== null){
            if (!obj.hasOwnProperty(propertyPath[0]) || typeof obj[propertyPath[0]] !== "object") obj[propertyPath[0]] = {}
            for (const key in value) {
                obj[propertyPath[0]][key] = value[key]
            }
        }else{
            obj[propertyPath[0]] = value
        }
        return true // this is the end
    }
}
export function getValue(propertyPath, obj){
    if(typeof obj !== 'object' || Array.isArray(obj) || obj === null)return undefined
    if(!Array.isArray(propertyPath))throw new Error('Must provide an array for propertyPath')
    if (propertyPath.length > 1) {// Not yet at the last property so keep digging
      if (!obj.hasOwnProperty(propertyPath[0])){
          return undefined
      }
      return getValue(propertyPath.slice(1), obj[propertyPath[0]])
    }else{
        return obj[propertyPath[0]]
    }
}
export function mergeObj(oldO,newO){
    //console.log({oldO,newO})
    for (const key in newO) {
        const val = newO[key];
        if(isObj(val,true)){
            if(typeof oldO[key] !== 'object')oldO[key] = {}
            mergeObj(oldO[key],newO[key])
        }
        oldO[key] = newO[key]
    }
    return oldO
}



export function isObj(val,isLiteral) {
    if (typeof val !== "object" || val === null)
    return false;
    if(!isLiteral)return (typeof val === "object" && !Array.isArray(val) && val !== null);

    var hasOwnProp = Object.prototype.hasOwnProperty,
    ObjProto = val;

    // get obj's Object constructor's prototype
    while (Object.getPrototypeOf(ObjProto = Object.getPrototypeOf(ObjProto)) !== null);

    if (!Object.getPrototypeOf.isNative) // workaround if non-native Object.getPrototypeOf
        for (var prop in val)
            if (!hasOwnProp.call(val, prop) && !hasOwnProp.call(ObjProto, prop)) // inherited elsewhere
                return false;

    return Object.getPrototypeOf(val) === ObjProto;
}
export function encode(val,toStr,sortKeys){
    val = (val instanceof Set || val instanceof Map)?[...val]:val
    let e = enc(val,{sortKeys})
    return toStr?Buffer.from(e.buffer,e.byteOffset,e.byteLength).toString('base64'):Buffer.from(e.buffer,e.byteOffset,e.byteLength)
}
export function decode(binArrOrB64){
    binArrOrB64 = (typeof binArrOrB64 === 'string')?Buffer.from(binArrOrB64,'base64'):binArrOrB64
    let val = dec(binArrOrB64)
    return (val instanceof Uint8Array)?Buffer.from(val.buffer,val.byteOffset,val.byteLength):val
}

export function rand(len, charSet,all){
    var s = '';
    len = len || 24;
    charSet = charSet || '0123456789ABCDEFGHIJKLMNOPQRSTUVWXZabcdefghijklmnopqrstuvwxyz'
    while(len > 0){ s += charSet.charAt(Math.floor(Math.random() * charSet.length)); len-- }
    return s;
}
export function randInt(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min);
}

//SORT STUFF
export function naturalCompare(a, b) {
    let ax = [], bx = [];
    a = String(a).trim().toUpperCase()  //trim and uppercase good idea?
    b = String(b).trim().toUpperCase()
    a.replace(/(\d+)|(\D+)/g, function(_, $1, $2) { ax.push([$1 || Infinity, $2 || ""]) });
    b.replace(/(\d+)|(\D+)/g, function(_, $1, $2) { bx.push([$1 || Infinity, $2 || ""]) });
    
    while(ax.length && bx.length) {
        let an = ax.shift();
        let bn = bx.shift();
        let nn = (an[0] - bn[0]) || an[1].localeCompare(bn[1]);
        if(nn) return nn;
    }

    return ax.length - bx.length;
}


