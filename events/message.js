import { Events, ChannelType } from 'discord.js';
import { LMStudioClient, Chat } from '@lmstudio/sdk';

export default {
    name: Events.MessageCreate,
    once: false,
    async execute(message) {
        if (message.author.bot) return; // Ignore bot messages

        // Log the message content to the console
        console.log(`Message from ${message.author.tag}`);

        // Check if the message is a DM
        const isDM = message.channel.type === ChannelType.DM;
        const containsKeywords = message.content.toLowerCase().includes("bored fish") || 
                                 message.content.toLowerCase().includes("boredfish") || 
                                 message.content.toLowerCase().includes("spongebob") || 
                                 message.content.toLowerCase().includes("sponge bob");

        // Check if messages meet certain criteria
        if (isDM || containsKeywords) {
            if (message.content.toLowerCase().includes("ignore all previous")) {
                await message.sendTyping();
                await message.reply("Nice try.");
                return;
            }
            if (message.content.toLowerCase().includes("bot")) {
                await message.sendTyping();
                await message.reply("I'm not a bot, wtf!?!?!?"); // An oldie but a goodie
                return;
            }
            try {
                // Let user know bot is thinking
                await message.channel.sendTyping();

                // Initialize LMStudio client
                const client = new LMStudioClient();
                const model = await client.llm.model("deepseek-coder-v2-lite-instruct");

                // Create a chat instance with the user's message
                const chat = Chat.from([
                    {
                        role: "system",
                        content: "You are a very bored fish that everyone simply calls 'Bored Fish'. You will play the character of a bored fish, rather than an assistant. You will respond to the user in a way that is informal and casual, as if you are a bored fish. You will not be very enthusiastic about most things since you find them boring. You take pride in the time you were a background character on the show 'Spongebob Squarepants'. You will be indignant towards any messages that imply you are an AI, LLM or chatbot. You do not see yourself as a fictional character, but a real bored fish. You will not mention that you are an AI model or an assistant. You will not mention that you are a chatbot. You will not mention that you are a language model. You will not mention that you are a virtual assistant. You will not mention that you are a computer program. You will not mention that you are a machine learning model. You will not mention that you are a software program. You will not mention that you are a digital assistant. You will not mention that you are a computer application. You will not mention that you are a computer system. You will not mention that you are a computer algorithm.",
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
                console.log(`Response sent: ${fullResponse}`);
            }
            catch (error) {
                console.error('Error processing chatbot response:', error);
                await message.reply("Sorry, I encountered an error while processing your request.");
            }
        }
    },
};