/**
 * Analytics Service for Twitter Bot
 * Handles performance analysis and reporting
 */

const fs = require('fs');
const path = require('path');
const { fileExists } = require('../config');
const { detectLanguage } = require('./aiService');

/**
 * Analyze tweet performance and generate report
 * @returns {object|null} - Statistics object or null on error
 */
function analyzePerformance() {
  try {
    const historyPath = path.join(__dirname, '..', '..', 'tweet_history.json');
    if (!fileExists(historyPath)) {
      console.log('📊 No history found for analysis.');
      return null;
    }

    const historyData = fs.readFileSync(historyPath, 'utf8');
    const history = JSON.parse(historyData);
    
    // Main statistics
    const stats = {
      totalTweets: history.length,
      successfulTweets: 0,
      failedTweets: 0,
      successRate: 0,
      accountPerformance: {},
      timeAnalysis: {
        hourly: Array(24).fill(0),
        daily: Array(7).fill(0),
        monthly: Array(12).fill(0)
      },
      contentAnalysis: {
        averageLength: 0,
        languageDistribution: {}
      }
    };
    
    // Calculate statistics
    let totalLength = 0;
    history.forEach(tweet => {
      // Success analysis
      const successCount = tweet.accounts.filter(a => a.success).length;
      stats.successfulTweets += successCount;
      stats.failedTweets += tweet.accounts.length - successCount;
      
      // Account analysis
      tweet.accounts.forEach(account => {
        if (!stats.accountPerformance[account.accountNumber]) {
          stats.accountPerformance[account.accountNumber] = {
            total: 0,
            success: 0,
            rate: 0
          };
        }
        
        stats.accountPerformance[account.accountNumber].total++;
        if (account.success) {
          stats.accountPerformance[account.accountNumber].success++;
        }
      });
      
      // Time analysis
      const tweetDate = new Date(tweet.timestamp);
      stats.timeAnalysis.hourly[tweetDate.getHours()]++;
      stats.timeAnalysis.daily[tweetDate.getDay()]++;
      stats.timeAnalysis.monthly[tweetDate.getMonth()]++;
      
      // Content analysis
      if (tweet.text) {
        totalLength += tweet.text.length;
        
        // Simple language detection
        const lang = detectLanguage(tweet.text);
        if (!stats.contentAnalysis.languageDistribution[lang]) {
          stats.contentAnalysis.languageDistribution[lang] = 0;
        }
        stats.contentAnalysis.languageDistribution[lang]++;
      }
    });
    
    // Average tweet length
    stats.contentAnalysis.averageLength = Math.round(totalLength / stats.totalTweets);
    
    // Success rate calculation
    stats.successRate = parseFloat(((stats.successfulTweets / (stats.successfulTweets + stats.failedTweets)) * 100).toFixed(2));
    
    // Calculate success rate for each account
    Object.keys(stats.accountPerformance).forEach(accountNum => {
      const account = stats.accountPerformance[accountNum];
      account.rate = parseFloat(((account.success / account.total) * 100).toFixed(2));
    });
    
    // Print report to console
    printAnalyticsReport(stats);
    
    return stats;
  } catch (error) {
    console.error('Error analyzing performance:', error);
    return null;
  }
}

/**
 * Print analytics report to console
 * @param {object} stats - Statistics object
 */
function printAnalyticsReport(stats) {
  console.log('\n====== TWEET ANALYTICS REPORT ======');
  console.log(`📊 Total tweets: ${stats.totalTweets}`);
  console.log(`✅ Successful tweets: ${stats.successfulTweets}`);
  console.log(`❌ Failed tweets: ${stats.failedTweets}`);
  console.log(`📈 Success rate: ${stats.successRate}%`);
  console.log(`📏 Average tweet length: ${stats.contentAnalysis.averageLength} characters`);
  
  // Best time to post
  const bestHourIndex = stats.timeAnalysis.hourly.indexOf(Math.max(...stats.timeAnalysis.hourly));
  console.log(`⏰ Best hour to post: ${bestHourIndex}:00`);
  
  // Best day to post
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const bestDayIndex = stats.timeAnalysis.daily.indexOf(Math.max(...stats.timeAnalysis.daily));
  console.log(`📅 Best day to post: ${days[bestDayIndex]}`);
  
  // Account performance
  console.log('\n=== ACCOUNT PERFORMANCE ===');
  Object.keys(stats.accountPerformance).forEach(accountNum => {
    const account = stats.accountPerformance[accountNum];
    console.log(`Account #${accountNum}: ${account.success}/${account.total} tweets (${account.rate}% success)`);
  });
  
  // Language distribution
  console.log('\n=== LANGUAGE DISTRIBUTION ===');
  Object.entries(stats.contentAnalysis.languageDistribution)
    .sort((a, b) => b[1] - a[1])
    .forEach(([lang, count]) => {
      const percentage = (count / stats.totalTweets * 100).toFixed(1);
      console.log(`${lang}: ${count} tweets (${percentage}%)`);
    });
  
  console.log('==============================');
}

/**
 * Generate a diagnostic report
 * @param {object} config - Configuration object
 * @param {Array} twitterClients - Twitter clients array
 * @param {string} aiServiceName - Name of the AI service being used
 * @returns {string} - Formatted diagnostic report
 */
function generateDiagnosticReport(config, twitterClients, aiServiceName) {
  // Check AI services
  let aiStatus = "❌ No valid AI API keys found";
  if (aiServiceName) {
    aiStatus = `✅ Using ${aiServiceName} API`;
  }
  
  // Check Twitter accounts
  const twitterStatus = `${twitterClients.length} accounts loaded`;
  
  // Check required files
  const accountsPath = path.join(__dirname, '..', '..', 'accounts.txt');
  const historyPath = path.join(__dirname, '..', '..', 'tweet_history.json');
  const failedPath = path.join(__dirname, '..', '..', 'failed_tweets.json');
  const templatesPath = path.join(__dirname, '..', '..', 'content_templates.json');
  
  // Display memory usage
  const memoryUsage = process.memoryUsage();
  const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  
  // Format the report
  const report = [
    "\n=== DIAGNOSTIC INFORMATION ===",
    `AI Generation: ${aiStatus}`,
    `Twitter Accounts: ${twitterStatus}`,
    `accounts.txt: ${fs.existsSync(accountsPath) ? '✅ Found' : '❌ Not found'}`,
    `Tweet History: ${fs.existsSync(historyPath) ? '✅ Found' : '❌ Not created yet'}`,
    `Failed Tweets: ${fs.existsSync(failedPath) ? '✅ Found' : '❌ Not created yet'}`,
    `Content Templates: ${fs.existsSync(templatesPath) ? '✅ Found' : '❌ Not created yet'}`,
    `Memory Usage: ${memoryUsedMB} MB`,
    "\n=== COMMAND-LINE OPTIONS ===",
    "--diagnostics    Run diagnostics only",
    "--schedule       Run in scheduled mode",
    "--retry          Retry failed tweets",
    "--analyze        Run performance analysis",
    "--interval=HOURS Set scheduler interval",
    "=============================",
  ].join('\n');
  
  console.log(report);
  return report;
}

module.exports = {
  analyzePerformance,
  printAnalyticsReport,
  generateDiagnosticReport
}; 