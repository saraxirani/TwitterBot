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
        suggestion = "Check if the tweet or user exists.";
        break;
      case 429:
        explanation = "Rate limit exceeded.";
        suggestion = "You've hit the Twitter API rate limit. Wait a while before trying again.";
        break;
    }
  }
  
  // Check for common error messages
  if (errorMessage.includes('authentication')) {
    explanation = "Authentication problem with Twitter.";
    suggestion = "Check your Twitter API credentials and permissions.";
  } else if (errorMessage.includes('permission')) {
    explanation = "Your app lacks the necessary permissions.";
    suggestion = "In Twitter Developer Portal, check app permissions. Should be set to 'Read and Write'.";
  } else if (errorMessage.includes('rate limit')) {
    explanation = "Rate limit reached.";
    suggestion = "You've hit Twitter's API limits. Wait before trying again or reduce frequency.";
  }
  
  // Create readable message
  return `❌ Twitter Error (Account #${accountNumber}): ${explanation} ${suggestion}`;
}

/**
 * Saves tweet history to a local file
 * @param {string} tweetText - The text of the tweet
 * @param {object} results - The results of the posting operation
 * @returns {Array} - Updated tweet history
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
    
    // Add new tweet to history with links
    const tweetRecord = {
      timestamp: new Date().toISOString(),
      text: tweetText,
      accounts: results.map(result => {
        // Generate tweet URL if we have an ID
        let tweetUrl = null;
        const tweetId = result.success || result.simulated ? 
          (result.response?.data?.id || (result.simulated ? `simulated-${Date.now()}` : 'unknown')) : null;
        
        if (tweetId && tweetId !== 'unknown' && !tweetId.includes('simulated')) {
          tweetUrl = `https://twitter.com/i/status/${tweetId}`;
        }
        
        return {
          accountNumber: result.accountNumber,
          success: result.success,
          simulated: result.simulated || false,
          tweetId,
          tweetUrl,
          error: result.success ? null : (result.error?.message || 'Unknown error')
        };
      })
    };
    
    history.push(tweetRecord);
    
    // Save history back to file (keep only last 100 tweets)
    if (history.length > 100) {
      history = history.slice(history.length - 100);
    }
    
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
    console.log('📝 Tweet saved to history file.');
    
    // Display links of recently posted tweets
    const successfulTweets = tweetRecord.accounts.filter(a => a.success && a.tweetUrl);
    if (successfulTweets.length > 0) {
      console.log('\n📊 Tweet Links:');
      successfulTweets.forEach(account => {
        console.log(`   Account #${account.accountNumber}: ${account.tweetUrl || 'No link available (simulation mode)'}`);
      });
      console.log();
    }
    
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
    
    // Read existing failed tweets
    if (fs.existsSync(failedTweetsPath)) {
      const failedData = fs.readFileSync(failedTweetsPath, 'utf8');
      try {
        failedTweets = JSON.parse(failedData);
      } catch (error) {
        console.warn('⚠️ Error parsing failed tweets file. Starting fresh.');
      }
    }
    
    // Add new failed tweet
    failedTweets.push({
      timestamp: new Date().toISOString(),
      text: tweetText,
      accountNumber: accountNumber
    });
    
    fs.writeFileSync(failedTweetsPath, JSON.stringify(failedTweets, null, 2));
    console.log(`📝 Failed tweet saved for account #${accountNumber} for later retry.`);
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
    // Base delay (30 seconds)
    let delay = 30000;
    
    // Random factor to avoid patterns (between 0.8 and 1.2 of the base delay)
    const randomFactor = 0.8 + (Math.random() * 0.4);
    
    // If this account had failures, add more delay
    if (history && history.length > 0) {
      const recentTweets = history.slice(-20);
      const accountTweets = recentTweets.filter(tweet => 
        tweet.accounts && tweet.accounts.some(a => a.accountNumber === accountNumber)
      );
      
      if (accountTweets.length > 0) {
        // Calculate success rate for this account
        let failCount = 0;
        let totalCount = 0;
        
        accountTweets.forEach(tweet => {
          const accountResult = tweet.accounts.find(a => a.accountNumber === accountNumber);
          if (accountResult) {
            totalCount++;
            if (!accountResult.success) {
              failCount++;
            }
          }
        });
        
        const failRate = failCount / totalCount;
        
        // Adjust delay based on failure rate
        if (failRate > 0.5) {
          // If more than 50% failures, double the delay
          delay = 60000;
        } else if (failRate > 0.2) {
          // If more than 20% failures, increase delay by 50%
          delay = 45000;
        }
      }
    }
    
    // Apply random factor and return
    return Math.floor(delay * randomFactor);
  } catch (error) {
    console.error('Error calculating smart delay:', error);
    return 30000; // Default to 30 seconds on error
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
  try {
    const { client, accountNumber } = twitterClientObj;
    const simulationMode = process.env.SIMULATION_MODE === 'true' || config.simulationMode === true;
    
    console.log(`Posting tweet to Twitter account #${accountNumber}...`);
    
    // Check if simulation mode is enabled
    if (simulationMode) {
      console.log('\n🔄 SIMULATION MODE: Tweet would look like this:');
      console.log('------------------------------------------');
      console.log(tweetText);
      console.log('------------------------------------------');
      console.log('✅ Simulation successful for account #' + accountNumber);
      
      // Generate a simulated tweet ID
      const simulatedId = 'simulated-tweet-' + Date.now();
      
      return {
        success: true,
        simulated: true,
        response: {
          data: {
            id: simulatedId,
            text: tweetText
          }
        },
        accountNumber
      };
    }
    
    try {
      // Validate tweet text before posting
      if (!tweetText || tweetText.length === 0) {
        throw new Error('Tweet text is empty');
      }
      
      if (tweetText.length > 280) {
        throw new Error('Tweet text exceeds maximum length of 280 characters');
      }
      
      // Try to post to Twitter
      const response = await client.v2.tweet(tweetText);
      
      if (!response || !response.data || !response.data.id) {
        throw new Error('Invalid response from Twitter API');
      }
      
      // Generate tweet URL
      const tweetUrl = `https://twitter.com/i/status/${response.data.id}`;
      
      console.log(`✅ Account #${accountNumber}: Tweet posted successfully!`);
      console.log(`   Tweet ID: ${response.data.id}`);
      console.log(`   Tweet URL: ${tweetUrl}`);
      
      return { 
        success: true, 
        response,
        accountNumber,
        tweetUrl
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
 * Display a summary of tweet posting results including links
 * @param {Array} results - Results of posting tweets
 */
function displayTweetSummary(results) {
  // Count successes and failures
  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;
  const simulatedCount = results.filter(r => r.simulated).length;
  
  console.log("\n=== POSTING SUMMARY ===");
  console.log(`Total accounts: ${results.length}`);
  console.log(`✅ Successfully posted: ${successCount}`);
  if (simulatedCount > 0) {
    console.log(`🔄 Simulated posts: ${simulatedCount}`);
  }
  console.log(`❌ Failed posts: ${failedCount}`);
  
  // Display tweet links if not in simulation mode
  const realTweets = results.filter(r => r.success && !r.simulated && r.tweetUrl);
  if (realTweets.length > 0) {
    console.log("\n📊 TWEET LINKS (SAVE THESE):");
    realTweets.forEach(result => {
      console.log(`✅ Account #${result.accountNumber}: ${result.tweetUrl}`);
    });
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
    
    // If this isn't the last account, wait before posting to the next one
    if (clientObj !== twitterClients[twitterClients.length - 1]) {
      const delayMs = calculateSmartDelay(clientObj.accountNumber, getTweetHistory());
      console.log(`Waiting ${delayMs/1000} seconds before posting to next account to avoid rate limits...`);
      await sleep(delayMs);
    }
  }
  
  // Save all results to history and display summary with links
  saveTweetHistory(tweetText, results);
  displayTweetSummary(results);
  
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
    
    // Process each account's failed tweets
    for (const accountNumber in tweetsByAccount) {
      const accountTweets = tweetsByAccount[accountNumber];
      const clientObj = twitterClients.find(c => c.accountNumber === parseInt(accountNumber));
      
      if (!clientObj) {
        console.log(`⚠️ Account #${accountNumber} not found for retry. Will try to lazy load...`);
        const lazyClient = lazyLoadTwitterClient(parseInt(accountNumber), twitterClients);
        if (!lazyClient) {
          console.error(`❌ Could not load account #${accountNumber} for retry. Skipping...`);
          continue;
        }
      }
      
      console.log(`👉 Processing ${accountTweets.length} failed tweets for account #${accountNumber}...`);
      
      for (const tweet of accountTweets) {
        console.log(`▶️ Retrying tweet: ${tweet.text.substring(0, 40)}...`);
        
        // Try to post the tweet
        const result = await postTweetWithClient(
          tweet.text,
          clientObj || lazyLoadTwitterClient(parseInt(accountNumber), twitterClients),
          config
        );
        
        if (result.success) {
          console.log(`✅ Successfully retried tweet for account #${accountNumber}!`);
          
          // Remove from failed tweets
          failedTweets = failedTweets.filter(t => 
            !(t.accountNumber === tweet.accountNumber && t.text === tweet.text)
          );
          
          // Save updated failed tweets
          fs.writeFileSync(failedTweetsPath, JSON.stringify(failedTweets, null, 2));
        } else {
          console.error(`❌ Retry failed for account #${accountNumber}:`, result.error?.message);
        }
        
        // Add a delay between retries
        await sleep(5000);
      }
    }
    
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
  getTweetHistory,
  displayTweetSummary
};
