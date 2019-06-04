const util = require("util");
const eventBus = require("./eventBus.js");
const logModel = require("./models/log-model");

const getDetails = (details) => {
	try {
		return util.inspect(details, { showHidden: true, depth: null });
	} catch (error) {
		return details;
	}
};

const log = (type, message, details, dontPersist) => {
	let date = new Date();
	let fullDetails = "";
	if (details){
		fullDetails = getDetails(details);
	}
	let log = {type, date, message, details: fullDetails};

	if (process.env.ENVIRONMENT === "DEV"){
		console.log(type, message, fullDetails);
	}

	eventBus.emit("newLog", JSON.stringify(log));

	if (type !== "info" && !dontPersist){
		logModel.save(log);
	}
};

exports.error = (message, details, dontPersist) => {
	log("error", message, details, dontPersist);
};

exports.info = (message, details) => {
	log("info", message, details);
};

exports.warn = (message, details) => {
	log("warn", message, details);
};