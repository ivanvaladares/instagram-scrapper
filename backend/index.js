require('dotenv').config();

if (!process.env.MONGODB_URI || !process.env.MONGODB_DBNAME){
	throw new Error("MongoDB not specified!");
}

let aiClient;

if (process.env.APPLICATION_INSIGHTS_KEY){
	const appInsights = require('applicationinsights');
	appInsights.setup(process.env.APPLICATION_INSIGHTS_KEY).start();
	aiClient = appInsights.defaultClient;
}

process.env.TZ = "utc";

//#############################################################################

const eventBus = require('./app/eventBus.js');
const scrapper = require("./app/scrapper.js");
const logger = require("./app/logger.js");

process.on("uncaughtException", (err) => {
	logger.error("uncaughtException", err);
});

eventBus.on("newLog", (msg) => {
	if (!process.env.APPLICATION_INSIGHTS_KEY) {
		return;
	}

	let log = JSON.parse(msg);
	if (log.type === "error"){
		let err = new Error(log.message);
		err.details = log.details;
		if (aiClient){
			aiClient.trackException({exception: err });
		}
	}else{
		if (aiClient){
			aiClient.trackEvent({name: log.message, properties: {details: log.details}});
		}
	}
});   

//#############################################################################

const Server = require("./app/server.js").init();

Server.open({ port: (process.env.PORT || 3001) }, (err) => {
	if (err) {
		logger.error("HTTP Server error!!!", err);
	}
	scrapper.init({maxProfiles: process.env.MAX_PROFILES, maxDownloads: process.env.MAX_DOWNLOADS});
}); 