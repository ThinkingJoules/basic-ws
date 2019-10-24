"use strict";

import SessionManager from '../src/sessionManager'
import { Session, Msg, User } from '../src/wire';
import { isObj } from '../src/util';

export default function App(serverURL){
    if(!new.target){ return new App(serverURL) }
    let root = this
    root.isNode = false

    root.sm = new SessionManager(root)
    if(!serverURL)throw new Error('Must specify one server url address')
    let server = new Session(root,false)
    server.address = serverURL
    root.server = root.sm.connect(server)
    root.create = function(email,password){
        root.server.send(new Msg(false,'createUser',false,[email,password]))
    }
    root.auth = function(email,password){
        root.server.send(new Msg(false,'authUser',false,[email,password]),function(resp){
            if (resp && isObj(resp,true))root.user = new User(resp)
            else throw new Error('auth failed')
        })
    }
    root.put = function(userObj){
        root.server.send(new Msg(false,'putUser',false,userObj),function(resp){
            if (resp)console.log('written successfully')
            else throw new Error('write failed')
        })
    }
    root.query = function(args,cb){
        root.server.send(new Msg(false,'query',false,args),function(resp){
            if (typeof resp === 'string')throw new Error(resp)
            else{
                if(cb && cb instanceof Function)cb(resp)
            }
        })
    }
      
}



