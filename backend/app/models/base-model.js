const mongoDB = require('./mongodb.js');

exports.get = (collection, criteria) => {

	return new Promise((resolve, reject) => { 

		mongoDB.connectDB((err, connection) => {

			if (err) {
				return reject(err);
			}

			connection.collection(collection).find(criteria).toArray((err, item) => {
				if (err) {
					return reject(err);
				}

				
				resolve(item);
			});

		});
	});
};

exports.find = (collection, criteria, sortBy, limit) => {

	return new Promise((resolve, reject) => {

		mongoDB.connectDB((err, connection) => {

			if (err) {
				return reject(err);
			}

			connection.collection(collection).find(criteria).limit(limit).sort(sortBy).toArray((err, items) => {
				if (err) {
					return reject(err);
				}

				resolve(items);
			});

		});
	});

};

exports.save = (collection, entry) => {

	return new Promise((resolve, reject) => {

		mongoDB.connectDB((err, connection) => {

			if (err) {
				return reject(err);
			}

			connection.collection(collection).insertOne(entry, (err, item) => {
				if (err) {
					return reject(err);
				}

				resolve(item.ops[0]);
			});
		});

	});

};

exports.replace = (collection, query, entry) => {

	return new Promise((resolve, reject) => {

		mongoDB.connectDB((err, connection) => {

			if (err) {
				return reject(err);
			}

			connection.collection(collection).replaceOne(query, entry, {upsert: false, multiple: false}, (err, item) => {
				if (err) {
					return reject(err);
				}

				resolve(item);
			});

		});
	});

};


exports.update = (collection, query, update) => {

	return new Promise((resolve, reject) => {

		mongoDB.connectDB((err, connection) => {

			if (err) {
				return reject(err);
			}

			connection.collection(collection).updateMany(query, update, {upsert: false, multiple: true}, (err, item) => {
				if (err) {
					return reject(err);
				}

				resolve(item);
			});

		});
	});

};


exports.remove = (collection, criteria) => {

	return new Promise((resolve, reject) => {

		mongoDB.connectDB((err, connection) => {

			if (err) {
				return reject(err);
			}

			connection.collection(collection).deleteMany(criteria, { multiple: true }, (err, numRemoved) => {
				if (err) {
					return reject(err);
				}

				resolve(numRemoved);
			});

		});
	});

};

exports.count = (collection, criteria) => {

	return new Promise((resolve, reject) => {

		mongoDB.connectDB((err, connection) => {

			if (err) {
				return reject(err);
			}

			connection.collection(collection).countDocuments(criteria, (err, count) => {
				if (err) {
					return reject(err);
				}

				resolve(count);
			});
		});
	});
};

exports.aggregate = (collection, criteria) => {

	return new Promise((resolve, reject) => {

		mongoDB.connectDB((err, connection) => {
			
			if (err) {
				return reject(err);
			}

			connection.collection(collection).aggregate(criteria).toArray((err, items) => {
				if (err) {
					return reject(err);
				}

				resolve(items);
			});
		});
	});
};


exports.aggregateToStream = (collection, criteria, pageSize, pageNum) => {

	return new Promise((resolve, reject) => {

		mongoDB.connectDB((err, connection) => {
			
			if (err) {
				return reject(err);
			}

			let cursor;
			if (pageSize === undefined || pageNum === undefined){
				cursor = connection.collection(collection).aggregate(criteria).batchSize(100).stream();
			} else {
				let intPageSize = parseInt(pageSize, 10);
				let skip = intPageSize * (parseInt(pageNum, 10) - 1);

				cursor = connection.collection(collection).aggregate(criteria).skip(skip).limit(intPageSize).batchSize(intPageSize).stream();				
			}

			resolve(cursor);

		});
	});
};