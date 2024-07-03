const mysql = require('mysql2');
require('dotenv').config();


const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    connectTimeout: 10000 // 10 seconds
  });

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to the database');
});

module.exports = db;