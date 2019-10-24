import {encode,decode} from '../src/util'
import {Crypto} from "@peculiar/webcrypto"

export default function Aegis(root){
    const aegis = this
    aegis.crypto = new Crypto()
    aegis.subtle = aegis.crypto.subtle
    aegis.random = (len) => {
        let r = aegis.crypto.getRandomValues?aegis.crypto.getRandomValues(new Uint8Array(len)):aegis.crypto.getRandomBytes(new Uint8Array(len))
        return Buffer.from(r.buffer,r.byteOffset,r.length)
    }
    const util = aegis.util = {}
    const s = aegis.settings = {};
    s.pbkdf2 = {hash: 'SHA-256', iter: 100000, ks: 64};
    s.ecdsa = {
        pair: {name: 'ECDSA', namedCurve: 'P-256'},
        sign: {name: 'ECDSA', hash: {name: 'SHA-256'}}
    };
    s.ecdh = {name: 'ECDH', namedCurve: 'P-256'};
    
    // This creates Web Cryptography API compliant JWK for sign/verify purposes
    util.pairToJwk = function(pair){  // d === priv
        let {pub,priv:d} = pair
        pub = pub.split('.');
        const x = pub[0], y = pub[1];
        const jwk = {kty: "EC", crv: "P-256", x: x, y: y, ext: true};
        jwk.key_ops = d ? ['sign'] : ['verify'];
        if(d){ jwk.d = d }
        return jwk;
    };
    util.jwkToPair = function(jwk){
        const keys = {}
        const {x,y,d} = jwk
        keys.pub = x+'.'+y
        if(d){ keys.priv = d }
        return keys;
    }    
    aegis.pair = async function(){
        return await aegis.subtle.generateKey(s.ecdsa.pair, true, [ 'sign', 'verify' ])
        .then(async (keys) => {
            let k = {}
            k.priv = Buffer.from(await aegis.subtle.exportKey('pkcs8', keys.privateKey))
            k.pub = Buffer.from(await aegis.subtle.exportKey('raw', keys.publicKey))
            return k 
        })    
    }

    aegis.hash = async function(byteArray){
        return Buffer.from(await aegis.subtle.digest({name:'SHA-256'},byteArray))
    }
    aegis.newAesKey = async function(cb){
        return await aegis.subtle.generateKey(s.ecdh, true, [ 'encrypt', 'decrypt' ])
        .then(async (key) => {
            let k = Buffer.from(await aegis.subtle.exportKey('raw', key.secret))
            root.encrypt = aegis.encrypt(k)
            root.decrypt = aegis.decrypt(k)
            return k.toString('base64')
        }) 
    }
    aegis.loadAesKey = async function(keyBits,cb){
        let k = typeof keyBits == "string"?Buffer.from(keyBits,'base64'):keyBits
        root.encrypt = await aegis.encrypt(k)
        root.decrypt = await aegis.decrypt(k)
    }
    aegis.extend = async function(jsThing,salt){
        //entropy is string, but could be a buffer already
        //jsThing can be string (password), but could also be object, array, etc, as it will be encoded in bits
        //this returns bits for a key
        salt = (salt instanceof Buffer) ? salt : aegis.random(16)
        let srcBits = (jsThing instanceof Buffer || jsThing instanceof Uint8Array) ? jsThing : encode(jsThing,false,true)
        let keyBits = await aegis.subtle.importKey('raw', srcBits, {name:'PBKDF2'}, false, ['deriveBits'])
        .then(async(key) =>{
            console.log(key)
            return Buffer.from(await aegis.subtle.deriveBits({
                name: 'PBKDF2',
                iterations: 750000,
                salt,
                hash: {name: 'SHA-256'},
              }, key, 256))
        })
        return keyBits
    }
    aegis.encrypt = async function(keyBits){
        let cKey = await aegis.subtle.importKey('raw', keyBits, 'AES-GCM', false, ['encrypt'])
        return async function(payload,cb){
            let u
            if(u === payload){ console.warn('`undefined` not allowed. VALUE CHANGED TO `null`!!!') }
            let encPayload = encode(payload,false,true)
            let iv = aegis.random(12)
            let ct = aegis.subtle.encrypt({ name: 'AES-GCM', iv}, cKey, encPayload)
            let r = {
                ct:Buffer.from(ct),
                iv,
            }
            if(cb && cb instanceof Function)cb(r)
            return r
        }
    }
    aegis.decrypt = async function(keyBits){
        let cKey =  await aegis.subtle.importKey('raw', keyBits, 'AES-GCM', false, ['decrypt'])
        return async function(encObj,cb){
            let {ct,iv} = encObj
            let pt = aegis.subtle.decrypt({ name: 'AES-GCM', iv}, cKey, ct);
            let plainJs = decode(pt)
            if(cb && cb instanceof Function)cb(plainJs)
            return plainJs
        }
    }
}