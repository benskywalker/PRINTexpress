// const mysql = require('mysql2');
// require('dotenv').config();

//     const db = mysql.createConnection({
//         host: process.env.DB_HOST,
//         user: process.env.DB_USER,
//         password: process.env.DB_PASS,
//         database: process.env.DB_NAME
//       });

// db.connect((err) => {
//     if (err) {
//         console.error('Error connecting to the database:', err);
//         return;
//     }
//     console.log('Connected to the database');
// });

// module.exports = db; // Export the database connection




const mysql = require('mysql2');
const { Client } = require('ssh2');
require('dotenv').config();

const sshClient = new Client();
const dbServer = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
};

const tunnelConfig = {
    host: process.env.DB_SSH_HOST,
    port: 22,
    username: process.env.DB_SSH_USER,
    password: process.env.DB_SSH_PASSWORD
};

const forwardConfig = {
    srcHost: '127.0.0.1', // Localhost for the SSH tunnel
    srcPort: 3306, // Local port (can be any free port)
    dstHost: dbServer.host, // Destination host (database host, as seen from the SSH server)
    dstPort: dbServer.port // Destination port
};

const SSHConnection = new Promise((resolve, reject) => {
    sshClient.on('ready', () => {
        sshClient.forwardOut(
            forwardConfig.srcHost,
            forwardConfig.srcPort,
            forwardConfig.dstHost,
            forwardConfig.dstPort,
            (err, stream) => {
                if (err) reject(err);
                // Create a MySQL connection over the SSH tunnel
                const updatedDbServer = {
                    ...dbServer,
                    stream,
                    multipleStatements: true // Enable executing multiple statements (if needed)
                };
                const connection = mysql.createConnection(updatedDbServer);
                connection.connect(error => {
                    if (error) {
                        reject(error);
                    }
                    console.log('Connected to the database via SSH tunnel');
                    resolve(connection);
                });
            }
        );
    }).connect(tunnelConfig);
});

SSHConnection.then(db => {
    // Use the db connection here
    module.exports = db;
}).catch(err => {
    console.error('Failed to connect to the database via SSH tunnel:', err);
    process.exit(1);
});


// In db.js
module.exports = SSHConnection; // SSHConnection is the promise that resolves to the db connection
