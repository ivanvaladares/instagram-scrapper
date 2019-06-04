const logger = require("../logger.js");
const MongoClient = require('mongodb').MongoClient;
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DBNAME;

let isCreating = false;
let isConnecting = false;

let _connection = null;

const createCollection = (dbase, colName) => {

    return new Promise((resolve, reject) => {

        dbase.createCollection(colName, err => {
            if (err) return reject(err);

            resolve();
        });

    });
};

const createIndex = (collection, index, options) => {

    return new Promise((resolve, reject) => {

        collection.createIndex(index, options, err => {
            if (err) return reject(err);

            resolve();
        });

    });
};

const createDatabase = async (connection) => {

    var colls = [
        'is-log',
        'is-post',
        'is-post-history',
        'is-post-queue',
        'is-profile',
        'is-profile-history',
        'is-profile-queue'
    ];

    let indexes = [
        {
            collection: 'is-post',
            fields: { "scrapped": 1, "uploadDate": 1, "lastScrapDate": 1, "removed": 1, "notFoundCount": 1 },
            options: { "unique": false, "name": "ix-post" }
        },
        {
            collection: 'is-post',
            fields: { "username": 1, "likePercentage": -1, "commentPercentage": -1 },
            options: { "unique": false, "name": "ix-post-stats" }
        },
        {
            collection: 'is-post',
            fields: { "username": 1 },
            options: { "unique": false, "name": "ix-post-username" }
        },
        {
            collection: 'is-post',
            fields: { "path": 1 },
            options: { "unique": true, "name": "ix-post-path" }
        },
        {
            collection: 'is-post-history',
            fields: { "path": 1, "date": 1 },
            options: { "unique": false, "name": "ix-post-history" }
        },
        {
            collection: 'is-post-queue',
            fields: { "path": 1 },
            options: { "unique": true, "name": "ix-post-queue" }
        },
        {
            collection: 'is-profile',
            fields: { "username": 1 },
            options: { "unique": true, "name": "ix-profile-username" }
        },
        {
            collection: 'is-profile-history',
            fields: { "username": 1 },
            options: { "unique": false, "name": "ix-profile-history-username" }
        },
        {
            collection: 'is-profile-history',
            fields: { "username": 1, "date": 1 },
            options: { "unique": true, "name": "ix-profile-history" }
        },
        {
            collection: 'is-profile-queue',
            fields: { "username": 1 },
            options: { "unique": true, "name": "ix-profile-queue-username" }
        }
    ];

    for await (const col of colls) {
        //console.log(`Creating collection ${col}...`);
        await createCollection(connection, col).then(() => {
            //console.log(`Created!`);
        }).catch(err => {
            logger.error(err);
        });
    }

    for await (const col of colls) {

        for await (const index of indexes) {

            if (index.collection === col) {

                let collection = await connection.collection(index.collection);

                //console.log(`Creating index on ${index.collection}...`);
                await createIndex(collection, index.fields, index.options).then(() => {
                    //console.log(`Created!`);
                }).catch(err => {
                    logger.error(err);
                });

            }
        }
    }
};

const connectDB = (callback) => {
    try {

        if (isCreating || isConnecting) {
            setTimeout(connectDB, 500, callback);
            return;
        }

        if (_connection) {
            return callback(null, _connection);
        }

        logger.info("Connectingto MongoDb");

        isConnecting = true;

        MongoClient.connect(uri, { useNewUrlParser: true, poolSize: 10 }, async (err, connection) => {
            if (err) {
                logger.error("Could not connect to MongoDb", err);
                isCreating = false;
                isConnecting = false;                
                return callback(err, null);
            }

            _connection = connection.db(dbName);

            if (process.env.MONGODB_CREATE !== undefined && process.env.MONGODB_CREATE.toLowerCase() === "true" && !isCreating) {
                isCreating = true;
                await createDatabase(_connection);
                isCreating = false;
            }

            isConnecting = false;
            return callback(null, _connection);
        });

    } catch (err) {
        logger.error("Could not connect to mongo", err);
        isCreating = false;
        isConnecting = false;
        return callback(err, null);
    }
};

exports.connectDB = connectDB;