import {Session} from './wire'
import WebSocket from 'ws'

export default function SessionManager(root){
    const sessions = this
    let env
    if(root.isNode)env = global
    else env = window
    env = env || {};
    root.WebSocket = root.WebSocket || env.WebSocket || env.webkitWebSocket || env.mozWebSocket || WebSocket;
    
    sessions.state = {}
    sessions.clients = new Map()
    sessions.connect = function(server){
        let wait = 2 * 1000;
        let doc = 'undefined' !== typeof document && document;
        if(!server){ return }
        let ipAddr = server.address
        let url = ipAddr.replace('http', 'ws');
        let wire = new root.WebSocket(url);
        if(!(server instanceof Session)){console.warn('must supply a Session object to make a connection');return}
        server.wire = wire
        if(!root.isNode)server.wire.binaryType = 'arraybuffer'
        wire.onclose = function(){//if whoever we are connecting to closes
            console.log('connection lost to server: ',server.id)
            server.onclose()
            reconnect(server);
        };
        wire.onerror = function(error){
            reconnect(server);
        };
        wire.onopen = function(){
            console.log('ws connected to server')
        }
        wire.onmessage = function(raw){
            server.recv(raw)
        };
        return server
        function reconnect(peer){//move reconnect in to Peer object?
            if(root.isNode)return
            console.log('attempting reconnect')
            clearTimeout(peer.defer);
            if(doc && peer.retry <= 0){ return } 
            peer.retry = (peer.retry || 60) - 1;
            peer.defer = setTimeout(function to(){
                if(doc && doc.hidden){ return setTimeout(to,wait) }
                sessions.connect(peer.id);
            }, wait);
        }
    }
}
