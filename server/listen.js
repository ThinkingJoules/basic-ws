import url from 'url'
import WebSocket from 'ws'
import {Session, Msg} from '../src/wire'
import { rand } from '../src/util';

export default function commsInit(root){
	let ws = {};
	ws.server = root.web;
	if(ws.server && !ws.web){
		root.WebSocket = WebSocket
		ws.path = '/socket';
		ws.maxPayload = ws.maxPayload; // || opt.pack || (opt.memory? (opt.memory * 1000 * 1000) : 1399000000) * 0.3;
		ws.web = new WebSocket.Server(ws);
		console.log('listening')
		ws.web.on('connection', function(wire,req){ 
			let session;
			console.log('new connection')
			wire.upgradeReq = wire.upgradeReq || {};
			wire.url = url.parse(wire.upgradeReq.url||'', true);
			let id = rand(16)
			session = new Session(root,id,wire)//if it is another peer, can we see their ip from the wire and use that instead??
			session.send(new Msg(false,'sid',false,id))
			wire.on('message', function(msg){
				session.recv(msg,session)
			});
			wire.on('close', function(){//server does not try to reconnect to a peerer
				console.log('client disconnected')
				session.onclose()

			});
			wire.on('error', function(e){});
		});
	}
	

}

