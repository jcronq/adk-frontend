const { createProxyMiddleware } = require('http-proxy-middleware');

/**
 * Setup proxy middleware for development environment
 * This allows the React app to communicate with the backend API server
 * without running into CORS issues
 */
module.exports = function(app) {
  // Create a proxy middleware for API endpoints
  const apiProxy = createProxyMiddleware({
    target: 'http://localhost:8000',
    changeOrigin: true,
    logLevel: 'debug', // Change to debug for more detailed logging
    pathRewrite: function (path, req) {
      // Remove /api prefix when forwarding to the backend
      return path.replace(/^\/api/, '');
    }
  });

  // Create a proxy middleware for MCP WebSocket server
  const mcpProxy = createProxyMiddleware({
    target: 'http://localhost:8083',
    changeOrigin: true,
    logLevel: 'debug',
    ws: true, // Enable WebSocket proxying
  });

  // Apply proxy to specific endpoints
  app.use('/api', apiProxy); // This will catch all /api/* requests
  app.use('/ws', mcpProxy); // This will catch all WebSocket connections to /ws
};
