"use strict";
let isNode=true

import SessionManager from '../src/sessionManager'
import commsInit from './listen'
import Aegis from './aegis';
import DiskStore from './disk.js';
import fs from 'fs'

export default function App(opt){
    if(!new.target){ return new App(opt) }
    let root = this
    root.isNode = isNode

    root.aegis = new Aegis(root)
    root.sm = new SessionManager(root)
    root.store = new DiskStore(root)
    root.get = root.store.get
    root.put = root.store.put
    root.web = opt.web
    //fs get creds
    //root.aegis.addDecryptKey()
    commsInit(root)
}



