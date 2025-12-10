
const mongoose = require('mongoose');

class Database {
  constructor() {
    this._connected = false;
  }

  async connect(uri) {
    if (this._connected) {
      return mongoose.connection;
    }

    mongoose.set('strictQuery', true);

    await mongoose.connect(uri, {
      dbName: process.env.MONGO_DB_NAME || 'flashcards_db',
    });

    this._connected = true;
    console.log('MongoDB connected');
    return mongoose.connection;
  }
}

const dbInstance = new Database();

module.exports = {
  getDbInstance: () => dbInstance,
};
