'use strict';

var util = require('kinda-util').create();
var WebSQL = require('kinda-web-sql');
var CordovaSQLite = require('kinda-cordova-sqlite');
var SQLStore = require('kinda-sql-store');

var WebSQLStore = SQLStore.extend('WebSQLStore', function() {
  this.setCreator(function(url, options) {
    var name = url;
    if (util.startsWith(name, 'websql:')) {
      name = name.substr('websql:'.length);
      this.connection = WebSQL.create(name, options);
    } else if (util.startsWith(name, 'sqlite:')) {
      name = name.substr('sqlite:'.length);
      this.connection = CordovaSQLite.create(name, options);
    } else {
      throw new Error('invalid url');
    }
    this.store = this;
    this.setOptions(options);
  });

  this.initializeDatabase = function *() {
    if (this.store.databaseHasBeenInitialized) return;
    var sql = "CREATE TABLE IF NOT EXISTS `pairs` (\
      `key` longblob NOT NULL,\
      `value` longblob,\
      PRIMARY KEY (`key`)\
    );";
    yield this.connection.query(sql);
    this.store.databaseHasBeenInitialized = true;
  };

  this.transaction = function *(fn, options) {
    return yield fn(this); // FIXME: remove this to enable transactions
    if (this.isInsideTransaction()) return yield fn(this);
    yield this.initializeDatabase();
    return yield this.connection.transaction(function *(tr) {
      var transaction = Object.create(this);
      transaction.connection = tr;
      return yield fn(transaction);
    }.bind(this), options);
  };

  this.isInsideTransaction = function() {
    return this !== this.store;
  };
});

module.exports = WebSQLStore;
