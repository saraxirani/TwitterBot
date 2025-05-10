/**
 * Utility functions for Twitter Auto Poster Bot
 */

/**
 * Parse command line arguments
 * @returns {object} - Object with parsed command line options
 */
function parseCommandLineArgs() {
  const args = process.argv.slice(2);
  
  return {
    runDiagnosticsOnly: args.includes('--diagnostics'),
    runScheduled: args.includes('--schedule'),
    retryFailed: args.includes('--retry'),
    analyzeOnly: args.includes('--analyze'),
    scheduleHours: parseScheduleHours(args),
  };
}

/**
 * Parse schedule hours from command line arguments
 * @param {Array} args - Command line arguments
 * @returns {number} - Hours for scheduling (default: 24)
 */
function parseScheduleHours(args) {
  const scheduleArg = args.find(arg => arg.startsWith('--interval='));
  let intervalHours = 24; // Default to 24 hours
  
  if (scheduleArg) {
    const hours = parseInt(scheduleArg.split('=')[1]);
    if (!isNaN(hours) && hours > 0) {
      intervalHours = hours;
    }
  }
  
  return intervalHours;
}

/**
 * Schedule repeated runs
 * @param {Function} runFunction - Function to run
 * @param {number} intervalHours - Hours between posts
 */
function scheduleRuns(runFunction, intervalHours = 24) {
  const intervalMs = intervalHours * 60 * 60 * 1000;
  console.log(`\n🕒 Scheduling to run every ${intervalHours} hour(s)...`);
  
  // Run immediately
  runFunction(false, false);
  
  // Then schedule future runs
  setInterval(() => {
    const now = new Date();
    console.log(`\n⏰ Scheduled run started at ${now.toISOString()}`);
    runFunction(false, false);
  }, intervalMs);
}

/**
 * Format date and time for display
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} - Formatted date and time
 */
function formatDateTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

/**
 * Generate a timestamp for uniqueness
 * @returns {string} - Timestamp string
 */
function generateTimestamp() {
  return new Date().toISOString().replace(/[^0-9]/g, '').substring(8, 14);
}

/**
 * Print application header
 */
function printAppHeader() {
  console.log("==========================================================");
  console.log("🐦 Twitter Auto Poster Bot (Multi-Account Version)");
  console.log("==========================================================");
}

module.exports = {
  parseCommandLineArgs,
  scheduleRuns,
  formatDateTime,
  generateTimestamp,
  printAppHeader
}; 