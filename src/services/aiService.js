/**
 * AI Service for tweet generation
 * Supports multiple AI providers: DeepSeek, OpenAI
 */

const OpenAI = require("openai");
const fs = require('fs');
const path = require('path');

// Constants
const REQUIRED_TAGS = "@giverep @PawtatoFinance $REP";

/**
 * Language detection utility
 * @param {string} text - Text to detect language
 * @returns {string} - Detected language code
 */
function detectLanguage(text) {
  // Simple language detection - for a real project, use language detection libraries
  const langPatterns = {
    'fa': /[\u0600-\u06FF]/,
    'ar': /[\u0621-\u064A]/,
    'en': /^[A-Za-z0-9\s\W]*$/,
    'ru': /[\u0400-\u04FF]/,
    'zh': /[\u4E00-\u9FFF]/,
    'ja': /[\u3040-\u30FF]/,
    'ko': /[\uAC00-\uD7AF]/,
  };
  
  for (const [lang, pattern] of Object.entries(langPatterns)) {
    if (pattern.test(text)) {
      return lang;
    }
  }
  
  return 'unknown';
}

/**
 * Initialize the AI client based on available API keys
 * @param {object} config - Configuration with API keys
 * @returns {object} - AI client and service name
 */
function initializeAI(config) {
  // Look for API keys in environment variables first, then in config
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || config.openaiApiKey || "";
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || config.deepseekApiKey || "";

  let openai;
  let aiServiceName = "";

  // Changed order to prioritize OpenAI over DeepSeek due to balance issues
  if (OPENAI_API_KEY) {
    console.log('🤖 Using OpenAI for AI tweet generation');
    openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
    aiServiceName = "OpenAI";
  } else if (DEEPSEEK_API_KEY) {
    console.log('🤖 Using DeepSeek for AI tweet generation');
    openai = new OpenAI({
      apiKey: DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com/v1",
    });
    aiServiceName = "DeepSeek";
  } else {
    console.log("⚠️ No AI API key found or insufficient balance. Using fallback text generation.");
    aiServiceName = "Fallback";
  }

  return { openai, aiServiceName };
}

/**
 * Generate fallback text when AI services fail
 * @returns {Promise<string>} - Fallback text for the tweet
 */
async function getAlternativeAIText() {
  try {
    console.log('Attempting to use alternative text generation method...');
    
    // Load fallback tweets from the JSON file
    const fallbackTweetsPath = path.join(__dirname, '..', '..', 'fallback_tweets.json');
    
    // Check if fallback tweets file exists
    if (fs.existsSync(fallbackTweetsPath)) {
      const fallbackTweetsData = JSON.parse(fs.readFileSync(fallbackTweetsPath, 'utf8'));
      
      if (fallbackTweetsData && fallbackTweetsData.fallbackTweets && fallbackTweetsData.fallbackTweets.length > 0) {
        // Select a random tweet from the predefined list
        const selectedText = fallbackTweetsData.fallbackTweets[Math.floor(Math.random() * fallbackTweetsData.fallbackTweets.length)];
        console.log('Selected fallback text from predefined list: ' + selectedText.substring(0, 40) + '...');
        return selectedText;
      }
    }
    
    // Fallback to hardcoded responses if file doesn't exist or is empty
    console.log('Fallback tweets file not found or empty. Using hardcoded responses.');
    
    // Enhanced predefined responses (English only as requested)
    const englishResponses = [
      'GiveRep project on Sui network is now distributing airdrops! Join the community and earn rewards by participating. Register now before rewards run out!',
      'GiveRep airdrop on Sui network is live! Join the community and earn rewards by participating. Register now!',
      'The GiveRep reputation protocol on Sui blockchain is revolutionizing community engagement. Join now to earn rewards!',
      'Want to earn rewards for your participation? Join GiveRep on Sui network and start earning today! Limited spots available.',
      'GiveRep airdrop alert! Participate in the Sui blockchain community and get rewarded for your contributions. #Crypto',
      'GiveRep brings reputation management to Sui blockchain! Participate in the airdrop and be among the first to experience it.',
      'New on Sui network: GiveRep reputation protocol with community rewards! Register now before the airdrop ends.',
      'Earn tokens on Sui network with GiveRep! Join the reputation protocol that rewards community participation.',
      'GiveRep is launching their token airdrop on Sui network! Verify your account now to qualify for rewards.',
      "Missed previous airdrops? Don't miss GiveRep on Sui network! Join now and earn reputation tokens!",
    ];
    
    // Select a random English response
    const selectedText = englishResponses[Math.floor(Math.random() * englishResponses.length)];
    console.log('Selected fallback text: ' + selectedText.substring(0, 40) + '...');
    return selectedText;
  } catch (error) {
    console.error('Failed to get text from alternative sources:', error.message);
    return 'GiveRep airdrop on Sui network is now live! Join the community and earn rewards by participating.';
  }
}

/**
 * Generate a tweet using AI or fallback to alternatives
 * @param {object} aiClient - The AI client object
 * @param {string} aiServiceName - The name of the AI service being used
 * @param {object} template - Optional template to guide generation
 * @returns {Promise<string>} - The generated tweet
 */
async function generateTweet(aiClient, aiServiceName, template = null) {
  try {
    // If no AI client available or it's set to Fallback, use alternative text immediately
    if (!aiClient || aiServiceName === "Fallback") {
      console.log('No API available, using fallback text generation directly...');
      const alternativeText = await getAlternativeAIText();
      return `${alternativeText} ${REQUIRED_TAGS}`;
    }

    let promptType, promptText;
    
    // Set a prompt based on template or default
    if (template) {
      promptType = "template";
      promptText = `Write a tweet about the GiveRep project based on this template: "${template.content}" The style should match the template but the content must be unique and varied to avoid detection as duplicate. Keep it under 250 characters. Include hashtags when relevant. Write ONLY in English language. Do not include the tags ${REQUIRED_TAGS} as they will be added separately.`;
    } else {
      // Random prompt types for variety
      const promptTypes = [
        "standard",
        "news",
        "benefits",
        "tutorial",
        "announcement"
      ];
      promptType = promptTypes[Math.floor(Math.random() * promptTypes.length)];
      
      switch(promptType) {
        case "news":
          promptText = "Write a tweet announcing a recent update or feature of the GiveRep reputation protocol on the Sui network. Focus on why users should be excited. Keep it under 250 characters. Write ONLY in English language. Include hashtags when relevant but do not include these tags: " + REQUIRED_TAGS;
          break;
        case "benefits":
          promptText = "Write a tweet highlighting a benefit of using GiveRep reputation protocol on the Sui blockchain network. Keep it under 250 characters. Write ONLY in English language. Include hashtags when relevant but do not include these tags: " + REQUIRED_TAGS;
          break;
        case "tutorial":
          promptText = "Write a tweet with a quick tip about using the GiveRep protocol or participating in their community. Keep it under 250 characters. Write ONLY in English language. Include hashtags when relevant but do not include these tags: " + REQUIRED_TAGS;
          break;
        case "announcement":
          promptText = "Write a tweet announcing that GiveRep airdrop is open for participation. Focus on urgency and benefits. Keep it under 250 characters. Write ONLY in English language. Include hashtags when relevant but do not include these tags: " + REQUIRED_TAGS;
          break;
        default: // standard
          promptText = "Write an engaging tweet about the GiveRep reputation protocol on the Sui blockchain. Keep it under 250 characters. Write ONLY in English language. Include hashtags when relevant but do not include these tags: " + REQUIRED_TAGS;
      }
    }
    
    console.log(`Using ${promptType} prompt`);
    
    try {
      // Both DeepSeek and OpenAI use the same API format with the openai client
      const response = await aiClient.chat.completions.create({
        model: aiServiceName === "DeepSeek" ? "deepseek-chat" : "gpt-3.5-turbo", // Using gpt-3.5-turbo instead of gpt-4 to reduce costs
        messages: [
          { role: "system", content: "You are an expert in writing engaging social media content. Your task is to write unique, creative tweets about the GiveRep project. Write ONLY in English language." },
          { role: "user", content: promptText }
        ],
        max_tokens: 150, // Reduced to save costs
        temperature: 0.8,
      });
      
      let tweet = response.choices[0]?.message?.content.trim();
      
      // Check for empty response
      if (!tweet) {
        throw new Error("Empty response from AI");
      }
      
      // Enforce English language tweets
      const lang = detectLanguage(tweet);
      if (lang !== 'en') {
        console.log(`Tweet is in ${lang} language. Using fallback English text...`);
        // Use fallback instead of trying again to avoid unnecessary API calls
        const alternativeText = await getAlternativeAIText();
        return `${alternativeText} ${REQUIRED_TAGS}`;
      }
      
      // Add the required tags
      const tweetText = `${tweet} ${REQUIRED_TAGS}`;
      
      // Validate tweet length
      if (tweetText.length > 280) {
        console.warn('⚠️ Generated tweet is too long, truncating...');
        // Truncate the main text to make room for tags
        const maxMainTextLength = 280 - REQUIRED_TAGS.length - 1; // -1 for the space
        const truncatedText = tweet.substring(0, maxMainTextLength) + '...';
        const finalTweet = `${truncatedText} ${REQUIRED_TAGS}`;
        
        console.log("\n--- Final Tweet (Truncated) ---");
        console.log(finalTweet);
        console.log("--- End of Tweet ---\n");
        console.log(`Tweet length: ${finalTweet.length} characters (max: 280)`);
        
        return finalTweet;
      }
      
      console.log("\n--- Final Tweet ---");
      console.log(tweetText);
      console.log("--- End of Tweet ---\n");
      console.log(`Tweet length: ${tweetText.length} characters (max: 280)`);
      
      return tweetText;
    } catch (apiError) {
      // Handle API errors (including Insufficient Balance)
      console.error(`API Error (${aiServiceName}):`, apiError.message);
      console.log("\n⚠️ API call failed. Using fallback text generation...");
      
      // Get alternative text as fallback
      const alternativeText = await getAlternativeAIText();
      const tweetText = `${alternativeText} ${REQUIRED_TAGS}`;
      
      // Ensure the tweet is not too long
      if (tweetText.length > 280) {
        const maxMainTextLength = 280 - REQUIRED_TAGS.length - 1; // -1 for the space
        return `${alternativeText.substring(0, maxMainTextLength)}... ${REQUIRED_TAGS}`;
      }
      
      return tweetText;
    }
  } catch (error) {
    console.error("Error in tweet generation process:", error);
    if (error.response) {
      console.error("API Response:", error.response.data);
    }
    
    // Final fallback if everything else fails - English only
    const finalFallbackTweet = `GiveRep airdrop on Sui network is now live! Join the community and earn rewards by participating. Register now! ${REQUIRED_TAGS}`;
    console.log("\n--- Emergency Fallback Tweet ---");
    console.log(finalFallbackTweet);
    console.log("--- End of Tweet ---\n");
    return finalFallbackTweet;
  }
}

/**
 * Select a smart template based on performance history
 * @param {Array} templates - Available content templates
 * @param {Array} history - Tweet history
 * @returns {object} - Selected template
 */
function selectSmartTemplate(templates, history) {
  if (!templates || templates.length === 0) {
    return null;
  }
  
  // If no history, select a random template
  if (!history || history.length === 0) {
    return templates[Math.floor(Math.random() * templates.length)];
  }
  
  try {
    // Calculate score for each template based on past success
    const templateScores = templates.map(template => {
      let score = 0;
      let matches = 0;
      
      // Review recent tweets (up to 20)
      const recentTweets = history.slice(-20);
      
      recentTweets.forEach(tweet => {
        // Check if this tweet used this template
        if (tweet.text && tweet.text.includes(template.content.substring(0, 20))) {
          matches++;
          // Calculate success rate for this tweet
          const successRate = tweet.accounts.filter(a => a.success).length / tweet.accounts.length;
          score += successRate;
        }
      });
      
      // If no matches found, give a base score
      if (matches === 0) {
        return { template, score: 0.5 }; // Base score
      }
      
      return { template, score: score / matches };
    });
    
    // Sort templates by score
    templateScores.sort((a, b) => b.score - a.score);
    
    // Choose one of the top three templates randomly for variety
    const topThree = templateScores.slice(0, Math.min(3, templateScores.length));
    const selected = topThree[Math.floor(Math.random() * topThree.length)].template;
    
    console.log(`📝 Template "${selected.name}" selected with high performance score.`);
    return selected;
  } catch (error) {
    console.error('❌ Error in smart template selection:', error);
    
    // In case of error, select a random template
    return templates[Math.floor(Math.random() * templates.length)];
  }
}

module.exports = {
  initializeAI,
  detectLanguage,
  generateTweet,
  getAlternativeAIText,
  selectSmartTemplate,
  REQUIRED_TAGS
};