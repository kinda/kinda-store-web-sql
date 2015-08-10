'use strict';

let _ = require('lodash');
let WebSQL = require('kinda-web-sql');
let CordovaSQLite = require('kinda-cordova-sqlite');
let SQLStore = require('kinda-sql-store');

let WebSQLStore = SQLStore.extend('WebSQLStore', function() {
  this.creator = function(options = {}) {
    if (!options.url) throw new Error('WebSQLStore url is missing');
    if (_.startsWith(options.url, 'websql:')) {
      options.name = options.url.substr('websql:'.length);
      this.connection = WebSQL.create(options);
      this.transactionsAreDisabled = true;
    } else if (_.startsWith(options.url, 'sqlite:')) {
      options.name = options.url.substr('sqlite:'.length);
      this.connection = CordovaSQLite.create(options);
    } else {
      throw new Error('invalid url');
    }
    this.store = this;
    this.setOptions(options);
  };

  this.initializeDatabase = async function() {
    if (this.store.databaseHasBeenInitialized) return;
    let sql = 'CREATE TABLE IF NOT EXISTS `pairs` (';
    sql += '`key` longblob NOT NULL, ';
    sql += '`value` longblob, ';
    sql += 'PRIMARY KEY (`key`)';
    sql += ');';
    await this.connection.query(sql);
    this.store.databaseHasBeenInitialized = true;
  };

  this.transaction = async function(fn, options) {
    if (this.transactionsAreDisabled || this.isInsideTransaction) {
      return await fn(this);
    }
    await this.initializeDatabase();
    return await this.connection.transaction(async function(tr) {
      let transaction = Object.create(this);
      transaction.connection = tr;
      return await fn(transaction);
    }.bind(this), options);
  };

  Object.defineProperty(this, 'isInsideTransaction', {
    get() {
      return this !== this.store;
    }
  });
});

module.exports = WebSQLStore;
