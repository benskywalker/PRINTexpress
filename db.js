//// filepath: c:\Users\benja\Documents\School\UCF\PRINTexpress\db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const useSsh = process.env.USE_SSH === "true";

if (useSsh) {
  // SSH tunnel mode with generic‑pool
  const { Client } = require('ssh2');
  const genericPool = require('generic-pool');

  const dbServer = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  };

  const tunnelConfig = {
    host: process.env.DB_SSH_HOST,
    port: 22,
    username: process.env.DB_SSH_USER,
    password: process.env.DB_SSH_PASSWORD,
  };

  const forwardConfig = {
    srcHost: '127.0.0.1',          // local side
    srcPort: 0,                    // let the OS assign an ephemeral port
    dstHost: dbServer.host,        // DB server as seen from SSH
    dstPort: dbServer.port,        // MySQL port
  };

  const factory = {
    create: () =>
      new Promise((resolve, reject) => {
        const sshClient = new Client();
        sshClient
          .on('ready', () => {
            sshClient.forwardOut(
              forwardConfig.srcHost,
              forwardConfig.srcPort,
              forwardConfig.dstHost,
              forwardConfig.dstPort,
              async (err, stream) => {
                if (err) {
                  reject(err);
                  return;
                }
                try {
                  // You can also set a short connectTimeout for testing if needed.
                  const connection = await mysql.createConnection({
                    ...dbServer,
                    stream: stream,
                    multipleStatements: true,
                  });
                  // Attach the SSH client so it can be closed later.
                  connection._sshClient = sshClient;
                  console.log('Created a new MySQL connection via SSH tunnel');
                  resolve(connection);
                } catch (connErr) {
                  sshClient.end();
                  reject(connErr);
                }
              }
            );
          })
          .on('error', (err) => {
            console.error('SSH connection error:', err);
            reject(err);
          })
          .connect(tunnelConfig);
      }),
    // Validate by running a trivial query.
    validate: async (connection) => {
      try {
        await connection.query('SELECT 1');
        return true;
      } catch (err) {
        console.log("Removing invalid connection. This should prevent a crash.");
        return false;
      }
    },
    destroy: async (connection) => {
      try {
        await connection.end();
      } catch (err) {
        console.error("Error ending MySQL connection:", err);
      }
      try {
        if (connection._sshClient) {
          connection._sshClient.end();
        }
      } catch (err) {
        console.error("Error ending SSH tunnel:", err);
      }
    },
  };

  const poolOpts = {
    max: 10, // maximum concurrent connections
    min: 2,
    testOnBorrow: true,
  };

  const pool = genericPool.createPool(factory, poolOpts);
  module.exports.getPool = async () => pool;
} else {
	console.log("Direct connection attempted");
  // Direct MySQL connection using mysql2's createPool
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true,
  });
  console.log("Created direct connection!");

  // Optional: you might add your own connection-checking logic in your controllers.
  module.exports.getPool = async () => pool;
}