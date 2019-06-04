const express = require('express');
const compression = require('compression');
const cors = require('cors');
const expressSwagger = require('express-swagger-generator');
const WebSocketServer = require('ws').Server;
const bodyParser = require("body-parser");
const logger = require("./logger.js");
const eventBus = require('./eventBus.js');
const path = require("path");

class HttpServer {

    constructor () {

        this.app = express();
        this.server = null;

        const swagger = expressSwagger(this.app);

        let options = {
            swaggerDefinition: {
                info: {
                    description: '',
                    title: 'Instagram Scrapper API',
                    version: '1.0.0'
                },
                basePath: '/',
                produces: [
                    "application/json"
                ]
            },
            basedir: __dirname, //app absolute path
            files: ['./routes/**/*.js'] //Path to the API handle folder
        };

        swagger(options);


        this.app.use(cors());
        this.app.use(compression());
        this.app.use(bodyParser.urlencoded({limit: "1mb", extended: true}));
        this.app.use(bodyParser.json({limit: "1mb"}));
        this.app.use(express.static(path.join(__dirname, "public")));

        this.app.get("/", (req, res) => {            
            res.sendFile(path.join(__dirname, "/public/index.html"));
        });

        require("./routes/index").init(this.app);

        return this;
    }

    open (options, callBack) {

        options = options || {};
        let port = options.port;

        this.server = this.app.listen(port, (err) => {
            if (err) {
                logger.error("HTTP Server error!", err);

                if (callBack) {
                    callBack(err);
                }

                return;
            }

            this.startWebSocketServer();

            eventBus.on("newMessage", (message) => {
                this.broadcast(message);
            });

            eventBus.on("newLog", (message) => {
                this.broadcast(message);
            });          

            logger.info(`HTTP Server is listening on ${port}`);

            if (callBack) {
                callBack();
            }

        }).on("error", (err) => {
            logger.error("HTTP Server error!", err);
            if (callBack) {
                callBack(err);
            }                 
        });
    }

    startWebSocketServer () {
        this.wss = new WebSocketServer({
            server: this.server
        });

        this.wss.on("connection", ws => {   

            ws.isAlive = true;
            ws.on('pong', () => { ws.isAlive = true; });

            ws.send(JSON.stringify({connection: "OK"}));

        });
        
        setInterval(() => {
            this.wss.clients.forEach((ws) => {
                if (ws.isAlive === false) {
                    return ws.terminate();
                }
                ws.isAlive = false;
                ws.ping(null);
            });
        }, 30000);   
    }

    broadcast (message) {
        this.wss.clients.forEach(client => {       
            client.send(message);
        });
    }
}

module.exports.init = () => {
    return new HttpServer();
}; 