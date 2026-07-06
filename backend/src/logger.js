/**
 * logger.js
 * Verbose progress logging (page loaded, test X passed, flow step N, etc.)
 * is useful when you're running the backend locally and watching the
 * terminal, but has no business printing on a hosted production instance —
 * there's no one watching, and it just clutters the host's log stream.
 *
 * Set LOG_LEVEL=verbose (or NODE_ENV=development) to see it again, e.g.
 * while developing locally. Real errors (via logError) always print,
 * everywhere — silencing genuine failures on a hosted server would make
 * production issues impossible to diagnose.
 */
const VERBOSE = process.env.LOG_LEVEL === 'verbose' || process.env.NODE_ENV === 'development';

function log(...args) {
  if (VERBOSE) console.log(...args);
}

function logError(...args) {
  console.error(...args);
}

module.exports = { log, logError };
