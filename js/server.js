const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const port = process.env.PORT || 3000;
const rootDir = path.resolve(__dirname, '..');
const instructorsDir = path.join(rootDir, 'instructors');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(payload, null, 2));
}

function sendText(res, statusCode, content, contentType) {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
  });
  res.end(content);
}

function getAvailableCategories() {
  try {
    if (!fs.existsSync(instructorsDir)) {
      return [];
    }

    return fs
      .readdirSync(instructorsDir)
      .filter((item) => fs.statSync(path.join(instructorsDir, item)).isDirectory())
      .sort();
  } catch (error) {
    console.error('Error reading categories:', error);
    return [];
  }
}

function listInstructorFiles(category) {
  const categoryDir = path.join(instructorsDir, category);

  if (!fs.existsSync(categoryDir)) {
    return null;
  }

  return fs
    .readdirSync(categoryDir)
    .filter((file) => file.endsWith('.json'))
    .sort();
}

function sendStaticFile(res, requestPath) {
  const normalizedPath = requestPath === '/' ? '/index.html' : requestPath;
  const resolvedPath = path.resolve(rootDir, `.${normalizedPath}`);

  if (!resolvedPath.startsWith(rootDir + path.sep) && resolvedPath !== path.join(rootDir, 'index.html')) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  fs.stat(resolvedPath, (statErr, stats) => {
    if (statErr || !stats.isFile()) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    fs.readFile(resolvedPath, (readErr, data) => {
      if (readErr) {
        sendJson(res, 500, { error: 'Failed to read file', details: readErr.message });
        return;
      }

      sendText(res, 200, data, contentType);
    });
  });
}

function renderInstructorsList() {
  let html = '<h1>Instructors Files</h1>';

  getAvailableCategories().forEach((category) => {
    const files = listInstructorFiles(category) || [];
    html += `<h2>${category}</h2><ul>`;

    files.forEach((file) => {
      html += `<li><a href="/instructors/${category}/${file}">${file}</a></li>`;
    });

    html += '</ul>';
  });

  return html;
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const { pathname } = parsedUrl;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  if (pathname === '/api/categories') {
    sendJson(res, 200, getAvailableCategories());
    return;
  }

  if (pathname.startsWith('/api/instructors/')) {
    const parts = pathname.split('/').filter(Boolean);

    if (parts.length === 3) {
      const category = decodeURIComponent(parts[2]);
      const files = listInstructorFiles(category);

      if (files === null) {
        sendJson(res, 404, {
          error: `Category '${category}' not found`,
          available: getAvailableCategories(),
        });
        return;
      }

      sendJson(res, 200, files);
      return;
    }

    if (parts.length === 4) {
      const category = decodeURIComponent(parts[2]);
      const filename = decodeURIComponent(parts[3]);
      const filePath = path.join(instructorsDir, category, filename);

      if (!fs.existsSync(filePath)) {
        sendJson(res, 404, { error: 'File not found' });
        return;
      }

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        sendJson(res, 200, JSON.parse(content));
      } catch (error) {
        console.error('Error reading file:', error);
        sendJson(res, 500, {
          error: 'Failed to read file',
          details: error.message,
        });
      }
      return;
    }
  }

  if (pathname === '/instructors-list') {
    sendText(res, 200, renderInstructorsList(), 'text/html; charset=utf-8');
    return;
  }

  sendStaticFile(res, pathname);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Server running at http://127.0.0.1:${port}`);
  console.log(`Instructors directory: ${instructorsDir}`);
  console.log(`API endpoint: http://127.0.0.1:${port}/api/instructors/assessment_tools`);
});
