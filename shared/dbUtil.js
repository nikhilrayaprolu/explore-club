const uniqid = require('uniqid');
var objectPath = require('object-path');
const flatten = require('flat');
const { v4: uuidv4 } = require('uuid');
const { PubSub } = require('apollo-server-express');

const idDocument = document => {
  if (!document || typeof document != 'object') {
    throw new Error(
      `invalid param 'document', expected object, got: ${document}`
    );
  }
  const id = uniqid();
  return {
    ...document,
    _id: id,
    id: id,
  };
};

const insertOne = (db, collection, document) => {
  if (!db) {
    throw new Error('param db expected');
  } else if (!collection || typeof collection != 'string') {
    throw new Error(
      `invalid param 'collection', string expected got: ${collection}`
    );
  } else if (!document || typeof document != 'object') {
    throw new Error(
      `invalid param 'document', object expected got: ${document}`
    );
  }

  const iddDocument = idDocument(document);
  return db
    .collection(collection)
    .insertOne(iddDocument)
    .then(() => {
      return [iddDocument];
    });
};

const insertMany = (db, collection, array) => {
  if (!db) {
    throw new Error('param db expected');
  } else if (!collection || typeof collection != 'string') {
    throw new Error(
      `invalid param 'collection', string expected got: ${collection}`
    );
  } else if (!array || !Array.isArray(array)) {
    throw new Error(`invalid param 'array', array expected, got: ${array}`);
  }

  const invalidElementIndex = array.indexOf(element => {
    return typeof element != 'object';
  });
  if (invalidElementIndex > -1) {
    throw new Error(`Invalid element found at index ${invalidElementIndex}`);
  }

  const documentsIdd = array.map(document => {
    return idDocument(document);
  });
  return db
    .collection(collection)
    .insertMany(documentsIdd)
    .then(() => {
      return documentsIdd;
    });
};

const insert = (db, collection, value) => {
  if (!db) {
    throw new Error('param db expected');
  } else if (!collection || typeof collection != 'string') {
    throw new Error(
      `invalid param 'collection', string expected got: ${collection}`
    );
  }

  if (!value) {
    throw new Error('invalid param value, truthy value expected');
  }

  if (typeof value == 'object') {
    return insertOne(db, collection, value);
  } else if (Array.isArray(value)) {
    return insertMany(db, collection, value);
  } else {
    throw new Error('invalid value type');
  }
};

const updateOne = async (db, collection, filter, update) => {
  if (!db) {
    throw new Error('param db expected');
  } else if (!collection || typeof collection != 'string') {
    throw new Error(
      `invalid param 'collection', string expected got: ${collection}`
    );
  } else if (!filter || typeof filter != 'object') {
    throw new Error(`invalid param 'filter', object expected, got: ${filter}`);
  } else if (!update || typeof update != 'object') {
    throw new Error(`invalid param 'update', object expected, got: ${filter}`);
  }

  const matchedDocument = await db.collection(collection).findOne(filter);

  return db
    .collection(collection)
    .updateOne(filter, update)
    .then(async () => {
      return [await db.collection(collection).findOne({ id: matchedDocument.id })];
    });
};

const updateMany = async (db, collection, filter, update) => {
  if (!db) {
    throw new Error('param db expected');
  } else if (!collection || typeof collection != 'string') {
    throw new Error(
      `invalid param 'collection', string expected got: ${collection}`
    );
  } else if (!filter || typeof filter != 'object') {
    throw new Error(`invalid param 'filter', object expected, got: ${filter}`);
  } else if (!update || typeof update != 'object') {
    throw new Error(`invalid param 'update', object expected, got: ${filter}`);
  }

  const matchedDocuments = await db
    .collection(collection)
    .find(filter)
    .toArray();

  return db
    .collection(collection)
    .updateMany(filter, update)
    .then(() => {
      return db
        .collection(collection)
        .find({
          id: {
            $in: matchedDocuments.map(matchedDocument => {
              return matchedDocument.id;
            }),
          },
        })
        .toArray();
    });
};

const withoutOne = (document, filter) => {
  if (!document || typeof document != 'object') {
    throw new Error(
      `invalid param 'document' expected object got: ${document}`
    );
  } else if (
    !filter ||
    (typeof filter != 'string' && typeof filter != 'object')
  ) {
    throw new Error(
      `invalid param 'filter', string or object expected, got: ${filter}`
    );
  }

  const documentClone = { ...document };
  if (typeof filter == 'string') {
    delete documentClone[filter];
  } else if (typeof filter == 'object') {
    const filterFlat = flatten(filter, {
      safe: true,
    });

    for (let [filterPath, filterValue] of Object.entries(filterFlat)) {
      const selectedValue = objectPath.get(documentClone, filterPath);
      if (!selectedValue) {
        continue;
      }

      if (typeof filterValue == 'boolean' && filterValue == true) {
        objectPath.del(documentClone, filterPath);
      } else if (typeof filterValue == 'string') {
        delete selectedValue[filterValue];
      } else if (Array.isArray(filterValue)) {
        for (let field of filterValue) {
          delete selectedValue[field];
        }
      }
    }
  }

  return documentClone;
};

const without = (array, selector) => {
  if (!array || !Array.isArray(array)) {
    throw new Error(`invalid param 'array', array expected, got: ${array}`);
  } else if (!selector) {
    throw new Error('selector cannot be undefined or null');
  } else if (typeof selector != 'string' && typeof selector != 'object') {
    throw new Error('selector must be a string or an object');
  }

  return array.map(document => {
    return withoutOne(document, selector);
  });
};

const eqJoin = async (
  db,
  leftDocuments,
  leftField,
  rightCollection,
  rightField
) => {
  const rightDocuments = await db
    .collection(rightCollection)
    .find({
      [rightField || 'id']: {
        $in: leftDocuments.map(leftDocument => {
          return leftDocument[leftField];
        }),
      },
    })
    .toArray();

  return leftDocuments.reduce((rows, leftDocument) => {
    return [
      ...rows,
      ...rightDocuments
        .filter(rightDocument => {
          return rightDocument[rightField || 'id'] == leftDocument[leftField];
        })
        .map(rightDocument => {
          return { left: leftDocument, right: rightDocument };
        }),
    ];
  }, []);
};

const groupByFieldSelector = (array, selector) => {
  return array.reduce((groups, document) => {
    const fieldVal = selector(document);
    let curGroup = groups.find(group => {
      return group.group == fieldVal;
    });
    if (!curGroup) {
      const newGroup = {
        group: fieldVal,
        reduction: [],
      };
      groups.push(newGroup);
      curGroup = newGroup;
    }
    curGroup.reduction.push(document);
    return groups;
  }, []);
};

const groupByField = (array, field) => {
  return groupByFieldSelector(array, document => {
    return document[field];
  });
};

const group = (array, value) => {
  if (!array) {
    throw new Error('param array null or undefined');
  }

  if (typeof value == 'string') {
    return groupByField(array, value);
  } else if (typeof value == 'function') {
    return groupByFieldSelector(value);
  } else {
    throw new Error('param value unexpected type');
  }
};

const groupCount = groups => {
  return groups.map(group => {
    return {
      ...group,
      reduction: group.length,
    };
  });
};

const zip = rows => {
  return rows.map(row => {
    return { ...row.left, ...row.right };
  });
};

const pluckOne = (obj, ...selectors) => {
  const projection = {};
  for (let selector of selectors) {
    if (typeof selector == 'string') {
      projection[selector] = obj[selector];
    } else if (Array.isArray(selector)) {
      for (let field of selector) {
        projection[field] = obj[field];
      }
    } else if (typeof selector == 'object') {
      const selectorFlat = flatten(selector, {
        safe: true,
      });
      for (let [selectorPath, selectorValue] of Object.entries(selectorFlat)) {
        if (typeof selectorValue == 'boolean' && selectorValue == true) {
          objectPath.set(
            projection,
            selectorPath,
            objectPath.get(obj, selectorPath)
          );
        } else if (Array.isArray(selectorValue)) {
          for (let field of selectorValue) {
            const fieldPath = selectorPath + '.' + field;
            objectPath.set(
              projection,
              fieldPath,
              objectPath.get(obj, fieldPath)
            );
          }
        }
      }
    }
  }
  return projection;
};

const pluck = (array, ...selectors) => {
  return array.map(document => {
    return pluckOne(document, ...selectors);
  });
};

const tryCallAsync = (funcName, params, func, defaultValue) => {
  if (!funcName || typeof funcName != 'string' || funcName == '') {
    throw new Error(
      'invalid param funcName non-null non-empty string expected'
    );
  } else if (!params || typeof params != 'object') {
    throw new Error("invalid param 'params' expected object value");
  } else if (!func) {
    throw new Error('invalid param func - function expected got nothing');
  }

  try {
    const value = func();
    if (!value || !value.then) {
      throw new Error(
        `\n[Query] ${funcName} -- Promise Expected\n\tParams:`,
        params,
        '\n'
      );
    }

    return value
      .then(result => {
        if (result != undefined && result != null) {
          console.log(
            `\n[Query] ${funcName} -- Returned Value:`,
            result,
            '\n\tParams:',
            params,
            '\n'
          );
          return result;
        } else {
          console.warn(
            `\n!!!!!!!!!! [Query] ${funcName} -- No Value Returned\n\tParams:`,
            params,
            '\n'
          );
          return defaultValue;
        }
      })
      .catch(error => {
        console.error(
          `\n!!!!!!!!!! [Query] ${funcName} -- Failed - Error:`,
          error,
          '\n\tParams:',
          params,
          '\n'
        );
        return defaultValue;
      });
  } catch (error) {
    console.error(
      `\n!!!!!!!!!! [Query] ${funcName} -- Failed - Error:`,
      error,
      '\n\tParams:',
      params,
      '\n'
    );
    return defaultValue;
  }
};

const tryCall = (funcName, func, defaultValue) => {
  try {
    const value = func();
    if (value) {
      console.log(`${funcName} called, value:`, value);
      return value;
    } else {
      console.log(`${funcName} called, no value returned`);
      return defaultValue;
    }
  } catch (error) {
    console.log(`Failed to call function '${funcName}', because:`, error);
    return defaultValue;
  }
};

const flattenSafe = obj => {
  const flattenedObj = flatten(obj, {
    safe: true,
  });
  console.log("flattenedObj:", flattenedObj)
  for (let key in flattenedObj) {
    if (!flattenedObj[key]) {
      console.log("deleting key", key, "in flattened object as value is falsey")
      delete flattenedObj[key];
    }
  }
  return flattenedObj;
};

const generateUuid = () => {
  return uuidv4();
};

const generateUniqueId = () => {
  return uniqid();
};

const skip = (arr, count) => {
  return arr.slice(count);
};

const limit = (arr, count) => {
  return arr.slice(0, count);
};

const groupMap = (groups, mapFunc) => {
  return groups.map(group => {
    const reduction = group.reduction.map(mapFunc);
    return {
      group: group.group,
      reduction: reduction,
    };
  });
};

const groupReduce = (groups, reduceFunc) => {
  return groups.map(group => {
    const reduction = group.reduction.reduce(reduceFunc);
    return {
      group: group.group,
      reduction: reduction,
    };
  });
};

const minDate = () => new Date(8640000000000000);
const maxDate = () => new Date(-8640000000000000);
const currDate = () => new Date();

const distinct = arr => {
  return arr.filter((value, index, self) => {
    return self.indexOf(value) === index;
  });
};

const count = arr => {
  if (!Array.isArray(arr)) {
    throw new Error('arr is not an array');
  }
  return arr.length;
};

const createCollections = (db, ...names) => {
  return Promise.all(
    names.map(name => {
      return db.createCollection(name, {});
    })
  );
};

const dropCollections = (db, ...names) => {
  return Promise.all(
    names.map(name => {
      return db.collection(name).drop();
    })
  );
};

const now = () => {
  return new Date();
};

const then = value => {
  return Promise.resolve(value);
};

const pubsub = new PubSub();

module.exports = {
  pubsub: pubsub,
  then,
  now,
  createCollections,
  dropCollections,
  count,
  distinct,
  currDate,
  groupMap,
  skip,
  limit,
  generateUniqueId,
  insertOne,
  insertMany,
  insert,
  withoutOne,
  without,
  eqJoin,
  group,
  groupByField,
  groupByFieldSelector,
  groupCount,
  groupReduce,
  zip,
  updateOne,
  updateMany,
  pluckOne,
  pluck,
  tryCall,
  tryCallAsync,
  flattenSafe,
  generateUuid,
  minDate,
  maxDate,
};
