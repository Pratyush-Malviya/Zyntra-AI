// Vercel serverless entry point
// Imports the Express app from the compiled server bundle
const app = require('../dist/server.cjs');
module.exports = app;
