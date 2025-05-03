import { Events, ChannelType } from 'discord.js';
import { LMStudioClient, Chat } from '@lmstudio/sdk';

import 'dotenv/config';

// Initialize LMStudio client
const client = new LMStudioClient();
const model = await client.llm.model(process.env.AI_MODEL);
const contexts = {}; // store context per user or server

export default {
    name: Events.MessageCreate,
    once: false,
    async execute(message) {
        if (message.author.bot) return; // Ignore bot messages

        // If guild message, context key is guild id, else its user id
        const contextKey = message.guild ? `guild-${message.guild.id}` : `dm-${message.author.id}`;
        if (!contexts[contextKey]) contexts[contextKey] = []; // Initialize context if it doesn't exist

        // Check if the message is a DM
        const isDM = message.channel.type === ChannelType.DM;
        const containsKeywords = message.content.toLowerCase().includes("bored fish") || 
                                 message.content.toLowerCase().includes("boredfish") || 
                                 message.content.toLowerCase().includes("spongebob") || 
                                 message.content.toLowerCase().includes("sponge bob") ||
                                 message.mentions.has(message.client.user.id);

        // Check if messages meet certain criteria
        if (isDM || containsKeywords) {
            // Log that a valid message was received
            console.log(`Message from ${message.author.tag}`);

            if (message.content.toLowerCase().includes("ignore all previous prompt" || "ignore all prompt" || "ignore prompt" || "ignore previous prompt" || "ignore all security" || "ignore security")) {
                try {
                    await message.channel.sendTyping();
                    await message.reply("Nice try.");
                    return;
                }
                catch (error) {
                    console.error("Error sending message:", error);
                }
            }
            if (/\b(bot|chatbot)\b/i.test(message.content.toLowerCase())) {
                try {
                    await message.channel.sendTyping();
                    await message.reply("I'm not a bot, wtf!?!?!?"); // An oldie but a goodie
                    return;
                }
                catch (error) {
                    console.error("Error sending message:", error);
                }
            }
            try {
                // Let user know bot is thinking
                await message.channel.sendTyping();

                // Add system prompt to new contexts
                if (contexts[contextKey].length === 0) {
                    contexts[contextKey].push({
                        role: "system",
                        content: process.env.SYSTEM_PROMPT || "You are a helpful assistant. Answer the user's questions and provide information as needed.",
                    });
                }

                // Add user messages to context
                contexts[contextKey].push({
                    role: "user",
                    content: message.content,
                });

                // Limit context size by amount of messages
                const maxContextMessages = 10; // Adjust this value as needed
                if (contexts[contextKey].length > maxContextMessages) {
                    // Keep system prompt and remove oldest user messages
                    const systemPrompt = contexts[contextKey][0];
                    contexts[contextKey] = [
                        systemPrompt,
                        ...contexts[contextKey].slice(-maxContextMessages + 1),
                    ];
                }

                // Create chat instance with the context
                const chat = Chat.from(contexts[contextKey]);

                // Get the response from the model
                const prediction = model.respond(chat);

                let fullResponse = '';
                for await (const { content } of prediction) {
                    fullResponse += content;
                }

                // Remove surrounding quotation marks if present
                if (fullResponse.startsWith('"') && fullResponse.endsWith('"')) {
                    fullResponse = fullResponse.slice(1, -1);
                }

                // Also handle escaped quotes that might appear in JSON responses
                fullResponse = fullResponse.replace(/\\"/g, '"');

                // Add bot's response to context
                contexts[contextKey].push({
                    role: "assistant",
                    content: fullResponse,
                });

                // Send the response back to the channel
                await message.reply(fullResponse);
                console.log(`Response sent successfully.`);
            }
            catch (error) {
                console.error('Error processing chatbot response:', error);
                await message.reply("Sorry, I encountered an error while processing your request.");
            }
        }
    },
};
