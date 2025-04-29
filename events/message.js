import { Events, ChannelType } from 'discord.js';
import { LMStudioClient, Chat } from '@lmstudio/sdk';

import 'dotenv/config';

export default {
    name: Events.MessageCreate,
    once: false,
    async execute(message) {
        if (message.author.bot) return; // Ignore bot messages

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

                // Initialize LMStudio client
                const client = new LMStudioClient();
                const model = await client.llm.model(process.env.AI_MODEL);

                // Create a chat instance with the system prompt and the user's message
                const chat = Chat.from([
                    {
                        role: "system",
                        content: process.env.SYSTEM_PROMPT || "You are a helpful assistant. Answer the user's questions and provide information as needed.",
                    },
                    {
                        role: "user",
                        content: message.content,
                    }
                ]);

                // Get the response from the model
                const prediction = model.respond(chat);

                let fullResponse = '';
                for await (const { content } of prediction) {
                    fullResponse += content;
                }

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
