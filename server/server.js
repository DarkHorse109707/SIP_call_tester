#!/usr/bin/env node

'use strict';

process.title = 'sipcaller-server';

const config = require('./config');
const fs = require('fs');
const https = require('https');
const http = require('http');
const express = require('express');
const compression = require('compression');
const Logger = require('./lib/Logger');
const path = require('path');

const logger = new Logger();

// Add debug logging for certificate paths
logger.info('Certificate path:', config.tls.cert);
logger.info('Key path:', config.tls.key);

// TLS server configuration with better error handling
let tls;
try {
    // Check if files exist first
    if (!fs.existsSync(config.tls.cert)) {
        throw new Error(`Certificate file not found: ${config.tls.cert}`);
    }
    if (!fs.existsSync(config.tls.key)) {
        throw new Error(`Key file not found: ${config.tls.key}`);
    }

    tls = {
        cert: fs.readFileSync(config.tls.cert),
        key: fs.readFileSync(config.tls.key)
    };

    // Validate that the files contain actual certificate/key data
    if (!tls.cert.includes('-----BEGIN CERTIFICATE-----')) {
        throw new Error('Invalid certificate file content');
    }
    if (!tls.key.includes('-----BEGIN PRIVATE KEY-----') && 
        !tls.key.includes('-----BEGIN RSA PRIVATE KEY-----')) {
        throw new Error('Invalid key file content');
    }

} catch (error) {
    logger.error('SSL Configuration Error:', error.message);
    logger.error('Current working directory:', process.cwd());
    process.exit(1);
}

const app = express();

app.use(compression());

app.all('*', (req, res, next) =>
{
	if(req.secure)
	{
		return next();
	}

	res.redirect('https://' + req.hostname + req.url);
});

// Serve all files in the public folder as static files.
app.use(express.static('public'));

app.use((req, res) => res.sendFile(`${__dirname}/public/index.html`));

const httpsServer = https.createServer(tls, app);

httpsServer.listen(config.listeningPort, '0.0.0.0', () =>
{
	logger.info('Server running on port: ', config.listeningPort);
});

const httpServer = http.createServer(app);

httpServer.listen(config.listeningRedirectPort, '0.0.0.0', () =>
{
	logger.info('Server redirecting port: ', config.listeningRedirectPort);
});
