const fs = require('fs');
const path = require('path');
const scpClient = require('scp2');
require('dotenv').config();

const sshConfig = {
    host: process.env.DB_HOST,
    username: process.env.DB_SSH_USER,
    password: process.env.DB_SSH_PASSWORD,
    port: 22
};

exports.getPdf = (req, res) => {
    const pdfName = req.params.pdfName;
    const localPdfPath = path.join(__dirname, `../public/pdf/${pdfName}`);
    const remotePdfPath = `/home/print/print_na/pdf_documents/${pdfName}`;

    if (fs.existsSync(localPdfPath)) {
        return res.sendFile(localPdfPath);
    }

    scpClient.scp(
        {
            host: sshConfig.host,
            username: sshConfig.username,
            password: sshConfig.password,
            path: remotePdfPath,
        },
        localPdfPath,
        function (err) {
            if (err) {
                return res.status(500).send('Error downloading the file from the remote server.');
            }
            res.sendFile(localPdfPath);
        }
    );
};
