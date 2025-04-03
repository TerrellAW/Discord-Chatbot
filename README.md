## AI-Powered Discord Chatbot
This AI-powered chatbot uses discord.js and the LM Studio sdk to allow a Large Language Model to communicate with users on Discord.

To run this project, you will need to have Node.js installed on your machine. You can download it from the official website: https://nodejs.org/en/download/

Additionally you will need to install the necessary dependencies by running the following command in your terminal:
```
npm install
```
Once you have installed the dependencies, you can start the bot by running the following command:
```
node index.js
```
## Configuration
To configure the bot, you will need to create a .env file in the root directory of the project and add the following environment variables:
```
DISCORD_TOKEN=your-discord-bot-token
```
You can find your Discord bot token by following these steps:
 1. Go to the Discord Developer Portal: https://discord.com/developers/applications
 2. Click on the "New Application" button.
 3. Give your application a name and click on the "Create" button.
 4. Click on the "Bot" tab on the left-hand side of the page.
 5. Click on the "Add Bot" button.
 6. Click on the "Copy" button next to the "Token" field.
 7. Paste the token into the .env file as the value of the DISCORD_TOKEN environment variable.

You will also need to install LM Studio and create a model. You can find more information on how to do this in the LM Studio documentation: https://docs.lmstudio.ai/

## Usage
Once the bot is running, you can interact with it by sending messages in a Discord channel that the bot has access to. The bot will respond to your messages with a response generated by the LM Studio model.
