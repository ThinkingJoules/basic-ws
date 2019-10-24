"use strict";
let isNode=new Function("try {return this===global;}catch(e){return false;}")()

import SessionManager from './sessionManager'
import commsInit from '../server/listen'
import Aegis from './aegis';
import DiskStore from '../server/disk.js.js';

export default function App(initialPeers){
    if(!new.target){ return new App(initialPeers) }
    let root = this
    root.isNode = isNode

    root.aegis = new Aegis(root)
    root.sm = new SessionManager(root)

    if(isNode){
        root.store = new DiskStore(root)
        root.get = root.store.get
        root.put = root.store.put
        //fs
        //root.aegis.addDecryptKey()
        commsInit(root)
    }else{
        if(!initialPeers)throw new Error('Must specify at least one server ip address')
        if(initialPeers && !Array.isArray(initialPeers))initialPeers = [initialPeers]
        root.auth = function(email,password){}
        root.query = function(args){}
        
        for (let i = 0; i < initialPeers.length; i++) {
            root.sm.connect(initialPeers[i])
        }
    }
    
}



