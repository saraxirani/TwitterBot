# Automate your Twitter / X account to post tweets regularly using the power of AI

Everyone wants to become an influencer or at least be active on social media nowadays, but we know it's not easy to plan, create, schedule, and post content every day. It's a headache for most people, and many don't even start their journey to becoming an influencer because of these hurdles. But don't worry, you can use this repository to automate your Twitter/X account so that you only need to set it up once, and it will work every day without any intervention. You won't even need to think about content or scheduling. I have tried to write a beginner-friendly and easy to understand blog:

### [Check it out to understand how to set it up](https://blog.itsvg.in/ultimate-guide-to-automating-twitterx-posts-with-ai)
[![GPT](https://github.com/VishwaGauravIn/twitter-auto-poster-bot-ai/assets/81325730/d84e72dd-2a1c-4ab9-be21-280920745163)](https://blog.itsvg.in/ultimate-guide-to-automating-twitterx-posts-with-ai)

# Twitter Auto Poster Bot for GiveRep

A Twitter bot that automatically generates and posts tweets about the GiveRep project on the Sui network using AI.

## Features

- Automatic tweet generation using AI (DeepSeek, OpenAI, or AIML)
- Support for multiple Twitter accounts
- Scheduled automatic posting
- Failed tweet storage and retry capability
- Multilingual tweet generation
- Performance analysis and reporting
- Smart templates based on previous performance

## Prerequisites

- Node.js 14 or higher
- Twitter account(s) with API credentials
- AI API keys (optional, has fallback mechanisms)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/twitter-auto-poster-bot-ai.git
cd twitter-auto-poster-bot-ai
```

2. Install dependencies:
```bash
npm install
```

3. Configure your Twitter accounts:
   - Create an `accounts.txt` file in the root directory
   - Add Twitter API credentials in the format: `APP_KEY,APP_SECRET,ACCESS_TOKEN,ACCESS_SECRET`
   - Each line represents one account
   - Lines starting with # are treated as comments

4. Configure AI API keys:
   - Create a `config.json` file or set environment variables
   - Set either DeepSeek, OpenAI, or AIML API keys

## Configuration

### Environment Variables

You can use the following environment variables:
- `DEEPSEEK_API_KEY`: Your DeepSeek API key
- `OPENAI_API_KEY`: Your OpenAI API key
- `AIML_API_KEY`: Your AIML API key

### Config File

The bot will automatically create a default `config.json` if it doesn't exist. You can edit this file to include your API keys:

```json
{
  "deepseekApiKey": "your-deepseek-api-key",
  "openaiApiKey": "your-openai-api-key",
  "aimlApiKey": "your-aiml-api-key",
  "twitterConfig": {
    "postInterval": 24,
    "retryDelay": 300,
    "maxRetries": 1
  }
}
```

## Usage

### Basic Run

To run the bot once:

```bash
npm start
```

### Scheduled Mode

To run the bot on a schedule:

```bash
# Run every 24 hours (default)
npm run schedule

# Run every 6 hours
node index.js --schedule --interval=6
```

### Diagnostics

To check your configuration without posting:

```bash
npm run diagnostics
```

### Retry Failed Tweets

To retry previously failed tweets:

```bash
npm run retry
```

### Performance Analysis

To analyze tweet performance:

```bash
npm run analyze
```

## Project Structure

```
twitter-auto-poster-bot-ai/
├── src/
│   ├── config/          # Configuration handling
│   │   └── config.json          # Configuration
│   ├── services/        # Core services
│   │   ├── aiService.js     # AI text generation
│   │   ├── twitterService.js # Twitter API interactions
│   │   └── analyticsService.js # Performance analysis
│   ├── utils/           # Utility functions
│   └── index.js         # Main application
├── accounts.txt         # Twitter credentials
├── tweet_history.json   # Tweet history storage
├── failed_tweets.json   # Failed tweets for retry
├── content_templates.json # Tweet templates
└── index.js             # Entry point
```

## Troubleshooting

### Twitter Rate Limiting

If you encounter rate limiting:
1. Increase the interval between posts
2. Add more Twitter accounts
3. Use the retry functionality later

### API Key Issues

If you have issues with AI API keys:
1. The bot includes fallback mechanisms with predefined texts
2. Try using a different AI service (DeepSeek, OpenAI, or AIML)
3. Check that your API keys are correctly formatted

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

Mohammed hamzeh
