import lmdb from 'node-lmdb'
import fs from 'fs'
import {encode,decode} from '../src/util'
export default function DiskStore(root){
    this.env = new lmdb.Env()
    const self = this
    const envConfig = {path: __dirname+'/../../DATA_STORE'}
    const dbiConfig = {name:'data',create:true,keyIsBuffer:true}
    const {path} = envConfig

    if (!fs.existsSync(path)){
        fs.mkdirSync(path);
    }
    self.env.open(envConfig)
    this.dbi = self.env.openDbi(dbiConfig)
    this.get = async function(key){
        key = (key instanceof Buffer || key instanceof Uint8Array)?key:encode(key)
        let txn = self.env.beginTxn({readOnly:true})
        let data
        try {
            data = txn.getBinary(self.dbi,key,{keyIsBuffer:true})
            if(data)data = await root.decrypt(decode(data))
            txn.commit()
            return data
        } catch (error) {
            txn.abort()
            return error
        }
    }
    this.put = async function(key,value){
        key = (key instanceof Buffer || key instanceof Uint8Array)?key:encode(key)
        let txn = self.env.beginTxn()
        try {
            txn.putBinary(self.dbi,key,encode(await root.encrypt(value)),{keyIsBuffer:true})
            txn.commit()
            return true
        } catch (error) {
            txn.abort()
            return false
        }
    }
}