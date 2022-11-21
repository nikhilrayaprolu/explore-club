const { v4: uuidv4 } = require('uuid');

const insertOne = (db, collectionName, document) => {
  if (!db) {
    throw new Error('db must be specified');
  }
  const id = uuidv4();
  const iddDocument = {
    ...document,
    _id: id,
    id: id,
  };
  return db
    .collection(collectionName)
    .insertOne(iddDocument)
    .then(() => {
      return iddDocument;
    });
};

const createCollections = (db, ...collectionNames) => {
  if (!db) {
    throw new Error('db must be specified');
  }
  return Promise.all(
    collectionNames.map(collectionName => {
      return db
        .createCollection(collectionName)
        .then(() => {
          return true;
        })
        .catch(error => {
          console.log(
            `Failed to create collection '${collectionName}', because: ${
              error.message
            }`
          );
          return false;
        });
    })
  );
};

const dropCollections = (...collectionNames) => {
  if (!db) {
    throw new Error('db must be specified');
  }
  return Promise.all(
    collectionNames.map(collectionName => {
      return db
        .collection(collectionName)
        .drop()
        .then(() => {
          return true;
        })
        .catch(error => {
          console.log(
            `Failed to drop collection '${collectionName}', because: ${
              error.message
            }`
          );
          return false;
        });
    })
  );
};

module.exports = { insertOne, createCollections, dropCollections };
