const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const binaryDir = path.dirname(process.execPath);
const buildDir = path.resolve(binaryDir, 'build');
const port = parseInt(process.env.PORT || '3000', 10);

const MIME = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.ico': 'image/x-icon',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.txt': 'text/plain'
};

const server = http.createServer((req, res) => {
	let filePath = path.join(buildDir, req.url === '/' ? 'index.html' : req.url);

	fs.stat(filePath, (err, stat) => {
		if (err || !stat.isFile()) {
			filePath = path.join(buildDir, '200.html');
		}

		const ext = path.extname(filePath);
		const contentType = MIME[ext] || 'application/octet-stream';

		fs.readFile(filePath, (readErr, data) => {
			if (readErr) {
				res.writeHead(500);
				res.end('Internal Server Error');
				return;
			}
			res.writeHead(200, { 'Content-Type': contentType });
			res.end(data);
		});
	});
});

server.listen(port, () => {
	console.log(`Server running on http://localhost:${port}`);
});
