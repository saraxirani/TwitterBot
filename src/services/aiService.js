/**
 * AI Service for tweet generation
 * Supports multiple AI providers: AIML, DeepSeek, OpenAI
 */

const OpenAI = require("openai");

// Constants
const DEFAULT_AIML_API_KEY = "e9e0f18961c44e03a6008196d4d781e6";
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
  const AIML_API_KEY = process.env.AIML_API_KEY || config.aimlApiKey || DEFAULT_AIML_API_KEY;
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || config.deepseekApiKey || "";
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || config.openaiApiKey || "";

  let openai;
  let aiServiceName = "";

  if (AIML_API_KEY) {
    console.log('🤖 Using AIML API for AI tweet generation');
    aiServiceName = "AIML";
  } else if (DEEPSEEK_API_KEY) {
    console.log('🤖 Using DeepSeek for AI tweet generation');
    openai = new OpenAI({
      apiKey: DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com/v1",
    });
    aiServiceName = "DeepSeek";
  } else if (OPENAI_API_KEY) {
    console.log('🤖 Using OpenAI for AI tweet generation');
    openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
    aiServiceName = "OpenAI";
  } else {
    console.error("❌ No AI API key found. Please set an API key for AIML, DeepSeek or OpenAI.");
    console.log("You can set the key in environment variables, config.json, or directly in the code.");
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
    
    // Predefined responses in different languages
    const languages = [
      // Arabic
      'مشروع GiveRep على شبكة Sui يوزع الآن! انضم وشارك في المجتمع للحصول على مكافآت. سارع بالتسجيل الآن قبل نفاذ الجوائز',
      
      // Spanish
      '¡El airdrop de GiveRep en la red Sui ya está activo! Únete y participa en la comunidad para obtener recompensas. ¡Regístrate ahora antes de que se agoten los premios!',
      
      // Korean
      'GiveRep 프로젝트가 Sui 네트워크에서 에어드롭을 시작했습니다! 지금 참여하고 보상을 받으세요. 커뮤니티에 가입하고 경험을 공유하세요.',
      
      // French
      'Projet GiveRep sur le réseau Sui distribue des tokens! Rejoignez la communauté pour recevoir des récompenses. Inscrivez-vous maintenant avant la fin de l\'airdrop!',
      
      // Chinese
      'GiveRep项目在Sui网络上发放空投！加入社区并参与互动来获取奖励。立即注册，奖励有限，先到先得！',
      
      // Japanese
      'GiveRepプロジェクトは、Suiネットワークでエアドロップを開始しました！今すぐ参加して報酬を獲得してください。コミュニティに参加して体験を共有しましょう。',
      
      // English
      'GiveRep project on Sui network is now distributing airdrops! Join the community and earn rewards by participating. Register now before rewards run out!',
      
      // Persian
      'پروژه GiveRep در شبکه Sui ایردراپ را آغاز کرده است! همین حالا مشارکت کنید و پاداش دریافت کنید. به جامعه بپیوندید و تجربه خود را به اشتراک بگذارید!'
    ];
    
    console.log(`Using predefined text in a random language as fallback (from ${languages.length} available languages)`);
    const randomLang = languages[Math.floor(Math.random() * languages.length)];
    console.log(`Selected language sample: ${randomLang.substring(0, 30)}...`);
    
    return randomLang;
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
    // Skip AI call if no API keys are available
    if (aiServiceName === "Fallback") {
      console.log('No AI API key available, using fallback text...');
      const alternativeText = await getAlternativeAIText();
      const tweetText = `${alternativeText} ${REQUIRED_TAGS}`;
      
      // Ensure the tweet is not too long
      if (tweetText.length > 280) {
        // Truncate the main text to make room for tags
        const maxMainTextLength = 280 - REQUIRED_TAGS.length - 1; // -1 for the space
        const finalTweet = `${alternativeText.substring(0, maxMainTextLength)}... ${REQUIRED_TAGS}`;
        
        console.log("\n--- Fallback Tweet ---");
        console.log(finalTweet);
        console.log("--- End of Tweet ---\n");
        console.log(`Tweet length: ${finalTweet.length} characters (max: 280)`);
        
        return finalTweet;
      }
      
      console.log("\n--- Fallback Tweet ---");
      console.log(tweetText);
      console.log("--- End of Tweet ---\n");
      console.log(`Tweet length: ${tweetText.length} characters (max: 280)`);
      
      return tweetText;
    }
    
    // Template-based prompt if available
    let promptBase = 'Create a 250-character text about the GiveRep airdrop project in a random human language';
    
    if (template) {
      promptBase = `Create a 250-character text based on this theme: "${template.content}" for the GiveRep airdrop project in a random human language`;
    }
    
    // Exactly what was used in the original code
    const prompt = 'یک متن 250 حرفی در رابطه با پروژه ایردراپ giverep برام درست کن به یک زبان انسان بصورت رندوم';

    console.log(`Connecting to ${aiServiceName} AI for tweet generation...`);
    
    try {
      let generatedText;
      
      if (aiServiceName === "AIML") {
        // Use AIML API
        const response = await fetch('https://api.aimlapi.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.AIML_API_KEY || DEFAULT_AIML_API_KEY}`
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 300,
            temperature: 0.7
          })
        });

        if (!response.ok) {
          throw new Error(`AIML API error: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          throw new Error('Invalid response from AIML API');
        }

        generatedText = data.choices[0].message.content.trim();
      } else {
        // Use OpenAI/DeepSeek
        const response = await aiClient.chat.completions.create({
          model: aiServiceName === "DeepSeek" ? "deepseek-chat" : "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 300,
          temperature: 0.7,
        });
        
        if (!response.choices || !response.choices[0] || !response.choices[0].message) {
          throw new Error(`Invalid response from ${aiServiceName} API`);
        }
        
        generatedText = response.choices[0].message.content.trim();
      }
      
      console.log("\n--- AI Generated Text ---");
      console.log(generatedText);
      console.log("--- End of AI Text ---\n");
      
      // Add the required tags
      const tweetText = `${generatedText} ${REQUIRED_TAGS}`;
      
      // Validate tweet length
      if (tweetText.length > 280) {
        console.warn('⚠️ Generated tweet is too long, truncating...');
        // Truncate the main text to make room for tags
        const maxMainTextLength = 280 - REQUIRED_TAGS.length - 1; // -1 for the space
        const truncatedText = generatedText.substring(0, maxMainTextLength) + '...';
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
    } catch (aiError) {
      console.error(`${aiServiceName} API Error:`, aiError.message);
      
      // Try to get alternative AI text if primary AI fails
      console.log(`\n⚠️ ${aiServiceName} API call failed. Trying alternative source...`);
      const alternativeText = await getAlternativeAIText();
      
      // Combine with required tags
      let tweetText = `${alternativeText} ${REQUIRED_TAGS}`;
      
      // Ensure the tweet is not too long
      if (tweetText.length > 280) {
        // Truncate the main text to make room for tags
        const maxMainTextLength = 280 - REQUIRED_TAGS.length - 1; // -1 for the space
        tweetText = `${alternativeText.substring(0, maxMainTextLength)}... ${REQUIRED_TAGS}`;
      }
      
      console.log("\n--- Alternative Tweet ---");
      console.log(tweetText);
      console.log("--- End of Tweet ---\n");
      console.log(`Tweet length: ${tweetText.length} characters (max: 280)`);
      
      return tweetText;
    }
  } catch (error) {
    console.error("Error in tweet generation process:", error);
    if (error.response) {
      console.error("API Response:", error.response.data);
    }
    
    // Final fallback if everything else fails
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