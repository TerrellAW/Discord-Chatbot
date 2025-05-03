import { Events, ChannelType } from 'discord.js';
import { LMStudioClient, Chat } from '@lmstudio/sdk';

import 'dotenv/config';

// Initialize LMStudio client
const client = new LMStudioClient();
const model = await client.llm.model(process.env.AI_MODEL);
const contexts = {}; // store context per user or server
const maxLength = 1900; // 100 characters short of Discord's max message length

// Define keywords to trigger the bot
const keyWords = process.env.KEYWORDS ?
    process.env.KEYWORDS.split(",").map(keyword => keyword.trim().toLowerCase()) : 
    ["bot"];

// Set prompt evasion detection options
const promptEvasionDetectionEnabled = process.env.PROMPT_EVASION_DETECTION?.toLowerCase() === 'true';
const promptEvasionDetectionMessage = process.env.PROMPT_EVASION_DETECTION_MESSAGE || "Nice try.";

// Set bot detection options
const botDetectionEnabled = process.env.BOT_DETECTION?.toLowerCase() === 'true';
const botDetectionMessage = process.env.BOT_DETECTION_MESSAGE || "I'm not a bot! Please refrain from using that term.";

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

        // Check if the message contains keywords or mentions the bot
        const messageContent = message.content.toLowerCase();
        const containsKeywords = keyWords.some(keyword => messageContent.includes(keyword)) ||
                                 message.mentions.has(message.client.user.id);

        // Check if messages meet certain criteria
        if (isDM || containsKeywords) {
            // Log that a valid message was received
            console.log(`Message from ${message.author.tag}`);

            if (promptEvasionDetectionEnabled && message.content.toLowerCase().includes("ignore all previous prompt" || "ignore all prompt" || "ignore prompt" || "ignore previous prompt" || "ignore all security" || "ignore security")) {
                try {
                    await message.channel.sendTyping();
                    await message.reply(promptEvasionDetectionMessage);
                    return;
                }
                catch (error) {
                    console.error("Error sending message:", error);
                }
            }
            if (botDetectionEnabled && /\b(bot|chatbot)\b/i.test(message.content.toLowerCase())) {
                try {
                    await message.channel.sendTyping();
                    await message.reply(botDetectionMessage);
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

                // Check if message exceeds Discord's character limit
                if (fullResponse.length > maxLength) {
                    const chunks = splitMessage(fullResponse);
                    for (const chunk of chunks) {
                        await message.channel.send(chunk);
                    }
                    console.log(`Response split into ${chunks.length} parts and sent successfully.`);
                }
                else {
                    // Send the response back to the channel
                    await message.reply(fullResponse);
                    console.log(`Response sent successfully.`);
                }

                // Add bot's response to context
                contexts[contextKey].push({
                    role: "assistant",
                    content: fullResponse,
                });  
            }
            catch (error) {
                console.error('Error processing chatbot response:', error);
                await message.reply("Sorry, I encountered an error while processing your request.");
            }
        }
    },
};

function splitMessage(message) {
    const chunks = [];
    let currentChunk = '';

    // Try to split on paragraphs or sentences
    const paragraphs = message.split(/\n\s*\n/);

    for (const paragraph of paragraphs) {
        // If paragraph fits in chunk, add it
        if (currentChunk.length + paragraph.length < maxLength) {
            currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }
        else {
            // Save the current chunk and start a new one
            if (currentChunk) {
                chunks.push(currentChunk);
                currentChunk = '';
            }
            // If the paragraph is short enough, add it to the new chunk
            if (paragraph.length < maxLength) {
                currentChunk = paragraph;
            }
            // If single paragraph is too long, split it further
            else {
                splitParagraph(paragraph, chunks);
            }
        }
    }

    // Add any remaining text
    if (currentChunk) {
        chunks.push(currentChunk);
    }

    return chunks;
}

function splitParagraph(paragraph, chunks) {
    const sentences = paragraph.split(/(?<=[.!?])\s+/); // Split on sentence endings
    let currentChunk = '';

    for (const sentence of sentences) {
        // If sentence fits in chunk, add it
        if (currentChunk.length + sentence.length < maxLength) {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
        else {
            // Save current chunk and start new one for sentence
            if (currentChunk) {
                chunks.push(currentChunk);
            }
            // Either use whole sentence or truncate it if too long
            currentChunk = sentence.length < maxLength ? sentence : sentence.substring(0, maxLength - 3) + "...";
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk); // Add any remaining text
    }
}