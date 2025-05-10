/**
 * Configuration module for Twitter Auto Poster Bot
 */
const fs = require('fs');
const path = require('path');

/**
 * Check if a file exists
 * @param {string} filePath - Path to the file
 * @returns {boolean} - Whether the file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    console.error(`Error checking if file exists: ${filePath}`, error);
    return false;
  }
}

/**
 * Check and create default configuration
 * @returns {object} - The loaded configuration
 */
function checkAndCreateConfig() {
  const CONFIG_FILE = path.join(__dirname, '..', '..', 'config.json');
  if (!fileExists(CONFIG_FILE)) {
    console.log('📄 Creating default config.json file...');
    const defaultConfig = {
      deepseekApiKey: "",
      openaiApiKey: "",
      aimlApiKey: "e9e0f18961c44e03a6008196d4d781e6",
      twitterConfig: {
        postInterval: 24, // hours
        retryDelay: 300, // seconds
        maxRetries: 1
      }
    };
    
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
      console.log('✅ Default config.json created. Please update it with your API keys.');
    } catch (writeError) {
      console.error('❌ Error creating config.json:', writeError.message);
    }
    
    return defaultConfig;
  }
  
  try {
    const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(configData);
  } catch (configError) {
    console.error('❌ Error loading config.json:', configError.message);
    return {
      aimlApiKey: "e9e0f18961c44e03a6008196d4d781e6",
      twitterConfig: {
        postInterval: 24,
        retryDelay: 300,
        maxRetries: 1
      }
    };
  }
}

/**
 * Read accounts from accounts.txt file
 * @returns {Array} Array of account objects with credentials
 */
function readAccountsFromFile() {
  try {
    const accountsFilePath = path.join(__dirname, '..', '..', 'accounts.txt');
    if (!fileExists(accountsFilePath)) {
      console.log('⚠️ accounts.txt file not found. Creating sample file...');
      const sampleContent = `# Twitter accounts in format: APP_KEY,APP_SECRET,ACCESS_TOKEN,ACCESS_SECRET
# Each line represents one account
# Example: YOUR_APP_KEY,YOUR_APP_SECRET,YOUR_ACCESS_TOKEN,YOUR_ACCESS_SECRET
# Add more accounts as needed, one per line in the same format`;
      fs.writeFileSync(accountsFilePath, sampleContent);
      console.log('Sample accounts.txt file created. Please add your Twitter API credentials.');
      return [];
    }

    let fileContent;
    try {
      fileContent = fs.readFileSync(accountsFilePath, 'utf8');
    } catch (readError) {
      console.error('❌ Error reading accounts.txt file:', readError.message);
      return [];
    }
    
    const accounts = [];
    let accountCount = 0;
    let lineCount = 0;
    
    fileContent.split('\n').forEach((line) => {
      lineCount++;
      // Skip empty lines and comments
      if (line.trim() === '' || line.trim().startsWith('#')) {
        return;
      }
      
      try {
        const parts = line.split(',').map(item => item.trim());
        if (parts.length === 4) {
          const [appKey, appSecret, accessToken, accessSecret] = parts;
          if (appKey && appSecret && accessToken && accessSecret) {
            accountCount++;
            accounts.push({
              appKey,
              appSecret,
              accessToken,
              accessSecret,
              accountNumber: accountCount
            });
            console.log(`✅ Loaded Twitter account #${accountCount}`);
          } else {
            console.warn(`⚠️ Line ${lineCount} has invalid credentials in accounts.txt. Skipping.`);
          }
        } else {
          console.warn(`⚠️ Line ${lineCount} has invalid format in accounts.txt. Expected 4 comma-separated values.`);
        }
      } catch (error) {
        console.warn(`⚠️ Error parsing line ${lineCount} in accounts.txt: ${error.message}`);
      }
    });
    
    if (accounts.length === 0) {
      console.error('❌ No valid accounts found in accounts.txt. Please check the file format.');
      return [];
    }
    
    return accounts;
  } catch (error) {
    console.error('Error processing accounts file:', error);
    return [];
  }
}

/**
 * Creates a backup of a file
 * @param {string} filePath - Path to the file
 */
function backupFile(filePath) {
  try {
    if (fileExists(filePath)) {
      // Skip backup for accounts.txt file
      if (filePath.endsWith('accounts.txt')) {
        return;
      }
      const backupPath = `${filePath}.backup.${Date.now()}`;
      fs.copyFileSync(filePath, backupPath);
      console.log(`📦 Backup created: ${backupPath}`);
    }
  } catch (error) {
    console.error(`Error creating backup of file: ${filePath}`, error);
  }
}

/**
 * Get content templates for tweet generation
 * @returns {Array} - Array of content templates
 */
function getContentTemplates() {
  const contentPath = path.join(__dirname, '..', '..', 'content_templates.json');
  
  // Create templates file if it doesn't exist
  if (!fileExists(contentPath)) {
    const defaultTemplates = {
      templates: [
        {
          id: 1,
          name: "Project Introduction",
          content: "GiveRep project on Sui network is launching an airdrop! Join now and earn rewards. Join the community and share your experience!",
          tags: ["introduction", "airdrop", "Sui"]
        },
        {
          id: 2,
          name: "How to Participate",
          content: "To participate in GiveRep project and receive rewards, simply register on the official website and complete the verification steps.",
          tags: ["tutorial", "participation", "rewards"]
        }
      ],
      customTags: {
        primary: ["GiveRep", "Airdrop", "Sui", "Crypto"],
        secondary: ["Rewards", "Community", "Token", "Blockchain"]
      }
    };
    
    try {
      fs.writeFileSync(contentPath, JSON.stringify(defaultTemplates, null, 2));
      console.log('✅ Content templates file created.');
    } catch (error) {
      console.error('❌ Error creating content templates file:', error);
      return [];
    }
    
    return defaultTemplates.templates;
  }
  
  // Read templates file
  try {
    const contentData = fs.readFileSync(contentPath, 'utf8');
    const templates = JSON.parse(contentData);
    return templates.templates;
  } catch (error) {
    console.error('❌ Error reading content templates file:', error);
    return [];
  }
}

module.exports = {
  fileExists,
  checkAndCreateConfig,
  readAccountsFromFile,
  backupFile,
  getContentTemplates
}; 