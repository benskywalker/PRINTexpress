// app.js
const express = require('express');
const mysql = require('mysql2');
const routes = require('./routes');
require('dotenv').config();

const app = express();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to the database');
});

app.use('/', routes);

module.exports = app;