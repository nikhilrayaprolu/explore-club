const path = require('path');
const fs = require('fs');
const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';

const client = new MongoClient(uri);
client
  .connect()
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch(error => {
    console.log(`Failed to connect to MongoDB, because: ${error.message}`);
  });
const database = client.db('spectrum');

const migrationFileNames = fs.readdirSync(__dirname).filter(name => {
  return name.indexOf('-') > 0;
});

const upPromises = [];

for (let fileName of migrationFileNames) {
  try {
    //console.log(`Attempting to run migration '${fileName}'`);
    const migration = require('./' + fileName);
    const up = migration.up;

    const upPromise = up(database);

    upPromise
      .then(() => {
        //console.log(`Migration '${fileName}' successful`);
      })
      .catch(error => {
        console.warn(
          `Migration '${fileName}' failed, because: ${error.message}`
        );
      });

    upPromises.push(upPromise);
  } catch (error) {
    console.warn(`Migration '${fileName}' failed, because: ${error.message}`);
  }
}

Promise.all(upPromises).then(() => {
  console.log('All migrations complete');
});
