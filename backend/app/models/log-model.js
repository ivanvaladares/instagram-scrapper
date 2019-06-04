const baseModel = require('./base-model.js');
const collection = "is-log";

exports.save = (entry) => {
	return baseModel.save(collection, entry);
};