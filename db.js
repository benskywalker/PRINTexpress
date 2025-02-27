const mysql = require('mysql2/promise');
const { Client } = require('ssh2');
require('dotenv').config();

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
  srcHost: '127.0.0.1', // local side
  srcPort: 3306,        // local port to forward from (can be any free port)
  dstHost: dbServer.host, // where the DB is as seen from the SSH server
  dstPort: dbServer.port, // DB port
};

function createPoolThroughTunnel() {
  return new Promise((resolve, reject) => {
    const sshClient = new Client();
    sshClient.on('ready', () => {
      sshClient.forwardOut(
        forwardConfig.srcHost,
        forwardConfig.srcPort,
        forwardConfig.dstHost,
        forwardConfig.dstPort,
        (err, stream) => {
          if (err) {
            reject(err);
            return;
          }
          // Create a pool that uses the SSH forwarded stream.
          const pool = mysql.createPool({
            ...dbServer,
            stream: stream,
            waitForConnections: true,
            connectionLimit: 1,
            queueLimit: 0,
            multipleStatements: true,
          });
          console.log('Connected to the database via SSH tunnel (pool)');
          resolve(pool);
        }
      );
    }).on('error', (err) => {
   console.error('SSH connection error:', err);
   reject(err);
  }).connect(tunnelConfig);
  });
}

// Create the pool promise once.
const poolPromise = createPoolThroughTunnel();

/**
 * Export a function that returns the pool. All caller files
 * will do: const pool = await getPool(); then pool.query(...);
 */
module.exports.getPool = async () => poolPromise;