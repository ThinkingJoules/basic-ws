import {encode,decode,rand, mergeObj} from './util'
import pako from 'pako'
export function Msg(replying,type,msgID,body){
    let msg = this
    this.replying = !!replying
    if(replying && !msgID)throw new Error('Must provide a msgID to reply to')
    setType()
    this.id = msgID || rand(16)
    this.body = body || null
    this.transform = function(){return [this.replying,this.tid,this.id,this.body]}
    function setType(){
        let types = [//these are the wire message types
            ['sid',  0],
            ['createUser',1],
            ['authUser', 2],
            ['getUser',  3],
            ['putUser',  4],
            ['query',8]
        ]
        let select = types.filter((value)=>{return value.includes(type)}).shift()
        if(!select)throw new Error('Invalid message type given')
        msg.type = select[0]
        msg.tid = select[1]
    }
}

export function Session(root,id,socket){
    let self = this
    this.wire = socket
    this.id = id
    this.verified = false //this is if their proof passes AND they signed our challenge
    this.query = null
    this.pending = new Map()
    this.user = false
    this.send = function(msg,cb,level){
        let peer = this
        if(peer.wire.send instanceof Function){
            if(!(msg instanceof Msg))throw new Error('Must provide a "wire Msg" to send.')
            let enc = encode(msg.transform())
            let beforePack = enc.length
            let payload = enc
            if(level){
                let packed = pako.deflate(enc,{level})
                if(packed.length < beforePack) payload = packed //see if compression helped
            }
            let raw = Buffer.concat([Buffer.from([beforePack==payload.length?0:1]),payload],payload.length+1)
            console.log('sent',msg,raw[0]?`beforePack bytes:${beforePack} AfterPack bytes:${payload.length}`:`Bytes: ${payload.length}`)
            if(!msg.replying)peer.pending.set(msg.id, cb)
            peer.wire.send(raw);
            return true
        }
    }
    this.recv = function(raw){
        if(!raw){ return }
        let msg,session = self
        try {
            raw = raw.data || raw
            raw = Buffer.from(raw,raw.byteOffset,raw.length)
            let payload = raw.slice(1)
            payload = raw[0]?pako.inflate(payload):payload
            msg = new Msg(...decode(payload))
            msg.from = session
            console.log('on.in',msg)
            if(msg.replying){//browser will run this
                let waiting = session.pending.get(msg.id)
                if(waiting && waiting instanceof Function){
                    waiting.call(waiting,msg.body)
                    session.pending.delete(msg.id)
                }
            }else{//server wll run this
                if(!root.isNode && msg.tid !== 0)return
                if(!session.user && msg.tid > 2)return//drop all messages until the user is authd, except their sessionID
                switch (msg.tid) {//on type
                    case 0: root.isNode? session.id : session.id = msg.body;break //only thing the browser will get from the server that isn't a response
                    case 1: createUser();break
                    case 2: authUser();break
                    case 3: getUser();break
                    case 4: putUser();break //partial updates to the userObj from client
                    case 8: query();break
                }
                async function createUser(){
                    let [email,pw] = msg.body
                    let userObj = await root.get(email)
                    console.log(userObj)
                    if(userObj){resp('User already exists');return}
                    let salt = root.aegis.random(16)
                    let extendpw = root.aegis.extend(pw,salt)
                    userObj = new User({email,pw:extendpw,salt})
                    session.user = userObj
                    let success = await root.put(userObj.email,userObj)
                    resp(success?userObj:'failed to write to disk')
                }
                async function authUser(){
                    let [email,pw] = msg.body
                    let userObj = await root.get(email)
                    if(!userObj){resp('Cannot find account with that email address');return}
                    if(userObj.pw && userObj.pw === pw){
                        //success, the pw sent from client should already be extended
                        resp(userObj)
                        
                    }else resp('Invalid password')
                }
                async function getUser(){
                    let userObj = await root.get(session.user.email)
                    if(userObj)delete userObj.oAuth
                    resp(userObj)
                }
                async function putUser(){
                    if(!session.user){resp(false);return}
                    let userObj = await root.get(session.user.email)
                    let updated = mergeObj(userObj,msg.body)
                    let success = await root.put(session.user.email,updated)
                    resp(success)
                }
                async function query(){
                    //do stuff through their qbo client api
                    //respond with result
                    resp('results',6)//6 it compresses the results for sending it w/ less bandwidth
                }
                function resp(body,compress){
                    session.send(new Msg(true,msg.type,msg.id,body),false,compress)
                }
            }
        } catch (error) {
            console.warn('wire.onMsg Error: ',error)
        }
    }
    this.disconnect = function(){//if we disconnect, we want to cancel their disconnects counter increment
        close()
    }
    this.onclose = function(){//this is when they break connection
        close()
    }
    function close(){
        if(self.wire && self.wire.close)self.wire.close()
        self.verified = false
    }
}
export function User(o){
    let user = this
    this.email = o.email || null
    this.pw = o.pw || null
    this.salt = o.salt || null
    this.status = o.status || null
    this.created = o.created || Date.now()
    this.savedQueries = parseQueries()
    this.oAuth = o.oAuth || null
    function parseQueries(){
        if(!o.savedQueries)return null
        user.savedQueries = {}
        for (const qName in o.savedQueries) {
            user.savedQueries[qName] = new Query(o.savedQueries[qName])
        }
    }
}
export function Query(o){
    this.name = o.name
    this.params = o.params //break these out as own keys once we know
    //need all things
}