/**
 * Twitter Service for handling API interactions
 */
const { TwitterApi } = require("twitter-api-v2");
const fs = require('fs');
const path = require('path');
const { fileExists } = require('../config');

/**
 * Sleep function to add delay between API calls
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} - Promise that resolves after the specified time
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Initialize Twitter clients for all accounts
 * @param {Array} accounts - Array of account credentials
 * @returns {Array} - Array of Twitter client objects
 */
function initializeTwitterClients(accounts) {
  if (!accounts || accounts.length === 0) {
    console.error('❌ No Twitter accounts provided for initialization');
    return [];
  }
  
  const twitterClients = accounts.map(account => {
    return {
      client: new TwitterApi({
        appKey: account.appKey,
        appSecret: account.appSecret,
        accessToken: account.accessToken,
        accessSecret: account.accessSecret,
      }),
      accountNumber: account.accountNumber
    };
  });

  console.log(`🔄 Loaded ${twitterClients.length} Twitter accounts`);
  return twitterClients;
}

/**
 * Parse Twitter API errors for more helpful messages
 * @param {Error} error - The error from Twitter API
 * @param {number} accountNumber - Account number that encountered the error
 * @returns {string} - Human readable error message with suggestions
 */
function parseTwitterError(error, accountNumber) {
  const errorMessage = error.message || '';
  let explanation = `Twitter account #${accountNumber} encountered an error.`;
  let suggestion = "Please try again later.";
  
  // Check error code
  if (error.code) {
    switch (error.code) {
      case 32:
        explanation = "Authentication error.";
        suggestion = "Check your Twitter API credentials in accounts.txt.";
        break;
      case 88:
        explanation = "Rate limit exceeded.";
        suggestion = "Wait a while before trying again or increase the delay between requests.";
        break;
      case 89:
        explanation = "Token invalid or expired.";
        suggestion = "Regenerate your access token and update accounts.txt.";
        break;
      case 99:
        explanation = "Invalid or expired token.";
        suggestion = "Regenerate your access token and update accounts.txt.";
        break;
      case 161:
        explanation = "You don't have permission to follow.";
        suggestion = "Check if your app has the proper permissions.";
        break;
      case 179:
        explanation = "Not authorized to view this tweet or account.";
        suggestion = "The account may be private or suspended.";
        break;
      case 187:
        explanation = "Duplicate tweet content.";
        suggestion = "Modify the tweet text to make it unique.";
        break;
      case 215:
        explanation = "Bad authentication data.";
        suggestion = "Verify your API credentials in accounts.txt.";
        break;
      case 226:
        explanation = "Tweet content appears automated.";
        suggestion = "Make your tweet content more unique.";
        break;
      case 261:
        explanation = "Application is not permitted to perform this action.";
        suggestion = "Verify your app has the necessary permissions.";
        break;
      case 326:
        explanation = "Account temporarily locked.";
        suggestion = "Check your Twitter account for any security notices.";
        break;
      case 401:
        explanation = "Unauthorized access.";
        suggestion = "Check your API credentials and account permissions.";
        break;
      case 403:
        explanation = "Forbidden - Access denied.";
        suggestion = "Your app may lack write permissions. Check Twitter Developer Portal.";
        break;
      case 404:
        explanation = "Resource not found.";
        suggestion = "The endpoint or resource you're trying to access doesn't exist.";
        break;
      case 429:
        explanation = "Too many requests / Rate limit exceeded.";
        suggestion = "Increase the delay between requests and reduce posting frequency.";
        break;
      case 503:
        explanation = "Twitter service unavailable.";
        suggestion = "Twitter is experiencing issues. Try again later.";
        break;
      default:
        explanation = `Twitter error code: ${error.code}`;
    }
  } else if (errorMessage.includes("duplicate")) {
    explanation = "Duplicate tweet content.";
    suggestion = "Modify the tweet content to make it unique or add a timestamp/random characters.";
  } else if (errorMessage.includes("authenticate")) {
    explanation = "Authentication failed.";
    suggestion = "Check your Twitter API credentials in accounts.txt.";
  } else if (errorMessage.includes("rate limit")) {
    explanation = "Rate limit exceeded.";
    suggestion = "Wait a while before trying again or increase delay between requests.";
  }
  
  return `❌ ${explanation} ${suggestion}`;
}

/**
 * Saves tweet history to a local file
 * @param {string} tweetText - The text of the tweet
 * @param {object} results - The results of the posting operation
 */
function saveTweetHistory(tweetText, results) {
  try {
    const historyPath = path.join(__dirname, '..', '..', 'tweet_history.json');
    let history = [];
    
    // Read existing history if available
    if (fs.existsSync(historyPath)) {
      const historyData = fs.readFileSync(historyPath, 'utf8');
      try {
        history = JSON.parse(historyData);
      } catch (error) {
        console.warn('⚠️ Error parsing tweet history file. Starting fresh.');
      }
    }
    
    // Add new tweet to history
    const tweetRecord = {
      timestamp: new Date().toISOString(),
      text: tweetText,
      accounts: results.map(result => ({
        accountNumber: result.accountNumber,
        success: result.success,
        simulated: result.simulated || false,
        tweetId: result.success || result.simulated ? 
          (result.response?.data?.id || 'unknown') : null,
        error: result.success ? null : (result.error?.message || 'Unknown error')
      }))
    };
    
    history.push(tweetRecord);
    
    // Save history back to file (keep only last 100 tweets)
    if (history.length > 100) {
      history = history.slice(history.length - 100);
    }
    
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
    console.log('📝 Tweet saved to history file.');
    
    return history;
  } catch (error) {
    console.error('Error saving tweet history:', error);
    return [];
  }
}

/**
 * Save failed tweets to retry later
 * @param {string} tweetText - The text of the tweet
 * @param {number} accountNumber - The account number that failed
 */
function saveFailedTweet(tweetText, accountNumber) {
  try {
    const failedTweetsPath = path.join(__dirname, '..', '..', 'failed_tweets.json');
    let failedTweets = [];
    
    // Read existing failed tweets if available
    if (fs.existsSync(failedTweetsPath)) {
      const failedData = fs.readFileSync(failedTweetsPath, 'utf8');
      try {
        failedTweets = JSON.parse(failedData);
      } catch (error) {
        console.warn('⚠️ Error parsing failed tweets file. Starting fresh.');
      }
    }
    
    // Add failed tweet to the list
    failedTweets.push({
      timestamp: new Date().toISOString(),
      text: tweetText,
      accountNumber: accountNumber
    });
    
    // Save to file
    fs.writeFileSync(failedTweetsPath, JSON.stringify(failedTweets, null, 2));
    console.log(`📝 Failed tweet saved to failed_tweets.json for later retry.`);
  } catch (error) {
    console.error('Error saving failed tweet:', error);
  }
}

/**
 * Calculate smart delay between posts based on previous success
 * @param {number} accountNumber - Account number
 * @param {Array} history - Tweet history
 * @returns {number} - Delay in milliseconds
 */
function calculateSmartDelay(accountNumber, history) {
  try {
    const defaultDelay = 30000; // Default 30 seconds
    
    if (!history || history.length === 0) {
      return defaultDelay;
    }
    
    // Check last 10 tweets for this account
    const accountHistory = [];
    for (let i = history.length - 1; i >= 0 && accountHistory.length < 10; i--) {
      const tweet = history[i];
      const accountTweet = tweet.accounts.find(a => a.accountNumber === accountNumber);
      if (accountTweet) {
        accountHistory.push(accountTweet);
      }
    }
    
    // If not enough history
    if (accountHistory.length < 3) {
      return defaultDelay;
    }
    
    // Check error rate and adjust delay
    const errorCount = accountHistory.filter(t => !t.success).length;
    const errorRate = errorCount / accountHistory.length;
    
    // Adjust delay based on error rate
    if (errorRate > 0.5) { // More than 50% errors
      return 120000; // 2 minutes
    } else if (errorRate > 0.3) { // More than 30% errors
      return 60000; // 1 minute
    } else if (errorRate > 0.1) { // More than 10% errors
      return 45000; // 45 seconds
    } else {
      return 30000; // 30 seconds (minimum)
    }
  } catch (error) {
    console.error('Error calculating smart delay:', error);
    return 30000; // 30 seconds as fallback
  }
}

/**
 * Posts a tweet to Twitter or simulates posting if there are API issues
 * @param {string} tweetText - The text of the tweet to post
 * @param {object} twitterClientObj - Object containing the Twitter client and account number
 * @param {object} config - Configuration object
 * @param {number} retryCount - Number of retry attempts remaining
 * @returns {Promise<object>} - Response from Twitter API
 */
async function postTweetWithClient(tweetText, twitterClientObj, config, retryCount = 1) {
  const { client: twitterClient, accountNumber } = twitterClientObj;
  const maxRetries = config.twitterConfig?.maxRetries || 1;
  
  try {
    console.log(`\nPosting tweet to Twitter account #${accountNumber}...`);
    
    try {
      // Validate tweet text before posting
      if (!tweetText || tweetText.length === 0) {
        throw new Error('Tweet text is empty');
      }
      
      if (tweetText.length > 280) {
        throw new Error('Tweet text exceeds maximum length of 280 characters');
      }
      
      // Try to post to Twitter
      const response = await twitterClient.v2.tweet(tweetText);
      
      if (!response || !response.data || !response.data.id) {
        throw new Error('Invalid response from Twitter API');
      }
      
      console.log(`✅ Account #${accountNumber}: Tweet posted successfully!`);
      console.log(`   Tweet ID: ${response.data.id}`);
      console.log(`   Tweet URL: https://twitter.com/user/status/${response.data.id}`);
      
      return { 
        success: true, 
        response,
        accountNumber
      };
    } catch (twitterError) {
      // Get a more detailed error message
      const detailedError = parseTwitterError(twitterError, accountNumber);
      console.error(detailedError);
      
      // Handle rate limiting with longer waits
      if (twitterError.code === 429 && retryCount > 0) {
        const waitTime = (config.twitterConfig?.retryDelay || 300) * 1000; // Default: 5 minutes
        const minutes = waitTime / 60000;
        console.log(`Rate limited. Waiting ${minutes} minutes before retrying...`);
        await sleep(waitTime);
        console.log(`Retrying post for account #${accountNumber} (${retryCount} attempts left)...`);
        return postTweetWithClient(tweetText, twitterClientObj, config, retryCount - 1);
      }
      
      // Try to handle duplicate content error
      if (twitterError.code === 187 && retryCount > 0) {
        console.log("Detected duplicate tweet. Adding timestamp to make it unique...");
        const timestamp = new Date().toISOString().slice(11, 19); // HH:MM:SS
        
        // Add timestamp to make content unique
        let uniqueTweet = tweetText;
        if (uniqueTweet.includes("@giverep")) {
          // Insert timestamp before the required tags
          const tagIndex = uniqueTweet.indexOf("@giverep");
          uniqueTweet = uniqueTweet.substring(0, tagIndex) + `[${timestamp}] ` + uniqueTweet.substring(tagIndex);
        } else {
          // Add timestamp at the end
          uniqueTweet = `${uniqueTweet} [${timestamp}]`;
        }
        
        await sleep(2000); // Short wait
        console.log("Retrying with timestamped tweet...");
        return postTweetWithClient(uniqueTweet, twitterClientObj, config, retryCount - 1);
      }
      
      // Save failed tweets to a file for later retry
      saveFailedTweet(tweetText, accountNumber);
      
      return { 
        success: false, 
        error: twitterError,
        accountNumber
      };
    }
  } catch (error) {
    console.error(`Error in tweet posting process for account #${accountNumber}:`, error);
    return { 
      success: false, 
      error,
      accountNumber
    };
  }
}

/**
 * Posts a tweet to all Twitter accounts with a delay between each
 * @param {string} tweetText - The text of the tweet to post
 * @param {Array} twitterClients - Array of Twitter client objects
 * @param {object} config - Configuration object
 * @returns {Promise<Array>} - Array of results from all account posting attempts
 */
async function postTweetToAllAccounts(tweetText, twitterClients, config) {
  if (!twitterClients || twitterClients.length === 0) {
    console.error("❌ No Twitter accounts configured. Please add accounts to accounts.txt");
    return [];
  }

  console.log(`\nAttempting to post tweet to ${twitterClients.length} Twitter accounts...`);
  
  const results = [];
  let history = [];
  
  // Post to each account sequentially with smart delays to avoid rate limits
  for (const clientObj of twitterClients) {
    // Post to this account
    const result = await postTweetWithClient(
      tweetText, 
      clientObj, 
      config,
      config.twitterConfig?.maxRetries || 1
    );
    
    results.push(result);
    
    // Save progress after each account for resilience
    history = saveTweetHistory(tweetText, results);
    
    // Add a smart delay between requests to avoid rate limits
    if (clientObj !== twitterClients[twitterClients.length - 1]) {
      const delayMs = calculateSmartDelay(clientObj.accountNumber, history);
      console.log(`Waiting ${delayMs/1000} seconds before posting to next account to avoid rate limits...`);
      await sleep(delayMs);
    }
  }
  
  // Summary of results
  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;
  
  console.log("\n=== POSTING SUMMARY ===");
  console.log(`Total accounts: ${results.length}`);
  console.log(`✅ Successfully posted: ${successCount}`);
  console.log(`❌ Failed posts: ${failedCount}`);
  
  return results;
}

/**
 * Retry posting failed tweets
 * @param {Array} twitterClients - Array of Twitter client objects
 * @param {object} config - Configuration object
 * @returns {Promise<boolean>} - Success status
 */
async function retryFailedTweets(twitterClients, config) {
  try {
    const failedTweetsPath = path.join(__dirname, '..', '..', 'failed_tweets.json');
    
    if (!fs.existsSync(failedTweetsPath)) {
      console.log('\n💤 No failed tweets to retry.');
      return false;
    }
    
    const failedData = fs.readFileSync(failedTweetsPath, 'utf8');
    let failedTweets = [];
    
    try {
      failedTweets = JSON.parse(failedData);
    } catch (error) {
      console.error('⚠️ Error parsing failed tweets file:', error);
      return false;
    }
    
    if (failedTweets.length === 0) {
      console.log('\n💤 No failed tweets to retry.');
      return false;
    }
    
    console.log(`\n🔄 Retrying ${failedTweets.length} failed tweets...`);
    
    // Group by account number
    const tweetsByAccount = {};
    failedTweets.forEach(tweet => {
      if (!tweetsByAccount[tweet.accountNumber]) {
        tweetsByAccount[tweet.accountNumber] = [];
      }
      tweetsByAccount[tweet.accountNumber].push(tweet);
    });
    
    // For each account, retry tweets
    for (const accountNumber in tweetsByAccount) {
      const accountTweets = tweetsByAccount[accountNumber];
      const clientObj = twitterClients.find(c => c.accountNumber === parseInt(accountNumber));
      
      if (!clientObj) {
        console.log(`⚠️ Account #${accountNumber} not found, skipping ${accountTweets.length} tweets.`);
        continue;
      }
      
      console.log(`\n🔄 Retrying ${accountTweets.length} tweets for account #${accountNumber}...`);
      
      // Retry each tweet with a delay between
      for (const tweet of accountTweets) {
        console.log(`\n📝 Retrying tweet from ${new Date(tweet.timestamp).toLocaleString()}:`);
        console.log(tweet.text.substring(0, 50) + '...');
        
        try {
          await postTweetWithClient(tweet.text, clientObj, config, 1);
          // Wait between retries to avoid rate limits
          await sleep(30000); // 30 seconds
        } catch (error) {
          console.error(`❌ Failed to retry tweet:`, error);
        }
      }
    }
    
    // Clear the failed tweets file
    fs.writeFileSync(failedTweetsPath, JSON.stringify([], null, 2));
    console.log('\n✅ Retry process completed!');
    return true;
  } catch (error) {
    console.error('Error retrying failed tweets:', error);
    return false;
  }
}

/**
 * Lazy load a Twitter client
 * @param {number} accountNumber - Account number to load
 * @param {Array} twitterClients - Array of existing Twitter clients
 * @returns {object|null} - The loaded Twitter client or null
 */
function lazyLoadTwitterClient(accountNumber, twitterClients) {
  // Check if client already loaded
  const existingClient = twitterClients.find(c => c.accountNumber === accountNumber);
  if (existingClient) {
    return existingClient;
  }
  
  // Load account from file
  try {
    const accountsFilePath = path.join(__dirname, '..', '..', 'accounts.txt');
    const fileContent = fs.readFileSync(accountsFilePath, 'utf8');
    
    let lineCount = 0;
    let account = null;
    
    fileContent.split('\n').forEach((line) => {
      lineCount++;
      // Skip empty lines and comments
      if (line.trim() === '' || line.trim().startsWith('#')) {
        return;
      }
      
      try {
        const parts = line.split(',').map(item => item.trim());
        if (parts.length === 4) {
          const currentAccountNumber = lineCount - (fileContent.split('\n').filter(l => l.trim() === '' || l.trim().startsWith('#')).length);
          
          if (currentAccountNumber === accountNumber) {
            const [appKey, appSecret, accessToken, accessSecret] = parts;
            if (appKey && appSecret && accessToken && accessSecret) {
              account = {
                appKey,
                appSecret,
                accessToken,
                accessSecret,
                accountNumber
              };
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️ Error parsing line ${lineCount} in accounts.txt: ${error.message}`);
      }
    });
    
    if (account) {
      const client = {
        client: new TwitterApi({
          appKey: account.appKey,
          appSecret: account.appSecret,
          accessToken: account.accessToken,
          accessSecret: account.accessSecret,
        }),
        accountNumber: account.accountNumber
      };
      
      // Add to clients array
      twitterClients.push(client);
      return client;
    }
    
    console.error(`❌ Account #${accountNumber} not found.`);
    return null;
  } catch (error) {
    console.error(`Error lazy loading account ${accountNumber}:`, error);
    return null;
  }
}

/**
 * Optimize memory usage for Twitter clients
 * @param {Array} twitterClients - Array of Twitter client objects
 * @returns {Array} - Optimized array of clients
 */
function optimizeMemoryUsage(twitterClients) {
  try {
    console.log('🧹 Optimizing memory usage...');
    
    // Memory usage before optimization
    const memoryBefore = process.memoryUsage();
    console.log(`💾 Memory usage before optimization: ${Math.round(memoryBefore.heapUsed / 1024 / 1024)} MB`);
    
    // Clear non-essential data from clients
    for (const clientObj of twitterClients) {
      // Clear any cached data
      if (clientObj.client._requestCache) {
        clientObj.client._requestCache.clear();
      }
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Memory usage after optimization
    const memoryAfter = process.memoryUsage();
    console.log(`💾 Memory usage after optimization: ${Math.round(memoryAfter.heapUsed / 1024 / 1024)} MB`);
    console.log(`🔍 Memory saved: ${Math.round((memoryBefore.heapUsed - memoryAfter.heapUsed) / 1024 / 1024)} MB`);
    
    return twitterClients;
  } catch (error) {
    console.error('Error optimizing memory:', error);
    return twitterClients;
  }
}

/**
 * Get tweet history from file
 * @returns {Array} - Array of tweet history objects
 */
function getTweetHistory() {
  try {
    const historyPath = path.join(__dirname, '..', '..', 'tweet_history.json');
    
    if (!fileExists(historyPath)) {
      return [];
    }
    
    const historyData = fs.readFileSync(historyPath, 'utf8');
    return JSON.parse(historyData);
  } catch (error) {
    console.error('Error reading tweet history:', error);
    return [];
  }
}

module.exports = {
  sleep,
  initializeTwitterClients,
  postTweetWithClient,
  postTweetToAllAccounts,
  saveTweetHistory,
  saveFailedTweet,
  parseTwitterError,
  calculateSmartDelay,
  retryFailedTweets,
  lazyLoadTwitterClient,
  optimizeMemoryUsage,
  getTweetHistory
}; 