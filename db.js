const mysql = require('mysql2/promise');
const { Client } = require('ssh2');
const genericPool = require('generic-pool');
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
  srcHost: '127.0.0.1',          // local side
  srcPort: 0,                    // use 0 so OS assigns an ephemeral port
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
                // For testing, you can set a short connectTimeout (e.g., 1000 ms).
                const connection = await mysql.createConnection({
                  ...dbServer,
                  stream: stream,
                  multipleStatements: true,
                });
                // Save the SSH client reference to close the tunnel when destroying the connection.
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
  // Add validate so that before a connection is handed out, it is tested.
  validate: async (connection) => {
    try {
      // Run a trivial query to ensure the connection is still open.
      await connection.query('SELECT 1');
	  //console.log("Validated connection");
      return true;
    } catch (err) {
		console.log("Removing invalid connection. This should prevent a crash.");
      return false;
    }
  },
  destroy: async (connection) => {
    try {
		// Close the MySQL connection.
		await connection.end();
	}
	catch (err) {
		console.error("Error ending MySQL connection:", err);
	}
	try {
		// Also close the underlying SSH tunnel if still open.
		if (connection._sshClient) {
		connection._sshClient.end();
		}
	}
	catch (err) {
		console.error("Error ending SSH tunnel:", err);
	}
  },
};

const poolOpts = {
  max: 10, // maximum concurrent connections
  min: 2,

  testOnBorrow: true,      // validate a connection before giving it out
};

const pool = genericPool.createPool(factory, poolOpts);

module.exports.getPool = async () => pool;