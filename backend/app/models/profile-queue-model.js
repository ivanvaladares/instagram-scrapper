const baseModel = require('./base-model.js');
const collection = "is-profile-queue";

exports.find = (criteria, sortBy, limit) => {
	return baseModel.find(collection, criteria, sortBy, limit);
};

exports.save = (entry) => {
	return baseModel.save(collection, entry);
};

exports.update = (query, update) => {
	return baseModel.update(collection, query, update);
};

exports.remove = (criteria) => {
	return baseModel.remove(collection, criteria);
};