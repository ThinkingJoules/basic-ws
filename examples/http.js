const fs = require('fs');
const config = { port: process.env.OPENSHIFT_NODEJS_PORT || process.env.VCAP_APP_PORT || process.env.PORT || process.argv[2] || 8765 };
const App = require('../dist/bws.cjs');

let http
const requestHandler = (req, res) => {
    if(req.url === "/dist/bws.umd.js"){
        res.writeHead(200, {'Content-Type': 'text/javascript'});
        res.end(fs.readFileSync(__dirname + '/../dist/bws.umd.js'))
    }else{
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write('<script src="../dist/bws.umd.js"></script>');
        res.end();
    }
}

if(process.env.HTTPS_KEY){
    config.key = fs.readFileSync(process.env.HTTPS_KEY);
    config.cert = fs.readFileSync(process.env.HTTPS_CERT);
    http = require('https')
    config.server = http.createServer(config);
} else {
    http = require('http')
    config.server = http.createServer(requestHandler);
}
const app = App({web:config.server.listen(config.port)})

console.log('App WS server started on ' + config.port + ' with /socket');
