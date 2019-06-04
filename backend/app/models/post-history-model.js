const baseModel = require('./base-model.js');
const collection = "is-post-history";

exports.find = (criteria, sortBy, limit) => {
	return baseModel.find(collection, criteria, sortBy, limit);
};

exports.save = (entry) => {
	return baseModel.save(collection, entry);
};

exports.remove = (criteria) => {
	return baseModel.remove(collection, criteria);
};