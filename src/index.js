/**
 * Twitter Auto Poster Bot - Main Application
 * Handles tweet generation and posting using AI
 * 
 * @author Mohammed hamzeh
 * @version 2.0.0
 */

// Import modules
const configService = require('./config');
const aiService = require('./services/aiService');
const twitterService = require('./services/twitterService');
const analyticsService = require('./services/analyticsService');
const utils = require('./utils');

/**
 * Main function to both generate and post a tweet
 * @param {boolean} diagnosticsOnly - If true, only runs diagnostics without posting
 * @param {boolean} analyzeOnly - If true, only runs analysis without posting
 */
async function run(diagnosticsOnly = false, analyzeOnly = false) {
  try {
    // Print app header
    utils.printAppHeader();
    
    // Load configuration
    const config = configService.checkAndCreateConfig();
    
    // Initialize AI service
    const { openai, aiServiceName } = aiService.initializeAI(config);
    
    // Read Twitter accounts and initialize clients
    const twitterAccounts = configService.readAccountsFromFile();
    const twitterClients = twitterService.initializeTwitterClients(twitterAccounts);
    
    // Print diagnostics
    analyticsService.generateDiagnosticReport(config, twitterClients, aiServiceName);
    
    // Optimize memory usage
    twitterService.optimizeMemoryUsage(twitterClients);
    
    // Run analysis if requested
    if (analyzeOnly) {
      console.log("\n📊 Running performance analysis...");
      analyticsService.analyzePerformance();
      console.log("\n✅ Analysis completed. Exiting without posting.");
      return;
    }
    
    // Exit early if only running diagnostics
    if (diagnosticsOnly) {
      console.log("\n✅ Diagnostics completed. Exiting without posting.");
      return;
    }
    
    // Check if we have any Twitter accounts
    if (twitterClients.length === 0) {
      console.error("⚠️ No Twitter accounts found in accounts.txt");
      return;
    }
    
    // Get tweet history for template selection
    const history = twitterService.getTweetHistory();
    
    // Get content templates
    const templates = configService.getContentTemplates();
    
    // Select a smart template based on performance history
    const template = aiService.selectSmartTemplate(templates, history);
    
    // Generate the tweet
    console.log("\nStep 1: Generating tweet content...");
    let tweet;
    try {
      if (template) {
        console.log(`Using template "${template.name}" as guidance for tweet generation`);
      }
      
      tweet = await aiService.generateTweet(openai, aiServiceName, template);
      if (!tweet) {
        throw new Error("Generated tweet is empty");
      }
    } catch (genError) {
      console.error("❌ Failed to generate tweet:", genError.message);
      return;
    }
    
    // Post the tweet
    console.log("\nStep 2: Posting tweet to Twitter accounts...");
    try {
      await twitterService.postTweetToAllAccounts(tweet, twitterClients, config);
    } catch (postError) {
      console.error("❌ Error during tweet posting:", postError.message);
    }
    
    // Optimize memory usage after posting
    twitterService.optimizeMemoryUsage(twitterClients);
    
    console.log("\n✅ Process completed!");
    console.log("==========================================================");
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

/**
 * Retry posting failed tweets
 */
async function retryFailedTweets() {
  try {
    // Print app header
    utils.printAppHeader();
    
    // Load configuration
    const config = configService.checkAndCreateConfig();
    
    // Read Twitter accounts and initialize clients
    const twitterAccounts = configService.readAccountsFromFile();
    const twitterClients = twitterService.initializeTwitterClients(twitterAccounts);
    
    // Retry failed tweets
    await twitterService.retryFailedTweets(twitterClients, config);
  } catch (error) {
    console.error("Error retrying failed tweets:", error);
  }
}

// Process command line arguments and perform requested action
const args = utils.parseCommandLineArgs();

if (args.retryFailed) {
  retryFailedTweets();
} else if (args.runScheduled) {
  utils.scheduleRuns(run, args.scheduleHours);
} else if (args.analyzeOnly) {
  // Run analysis only
  run(false, true);
} else {
  // Run once
  run(args.runDiagnosticsOnly);
}

module.exports = {
  run,
  retryFailedTweets
}; 