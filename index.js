import path from 'path';
import fs from 'fs';
import { Client, Events, GatewayIntentBits } from 'discord.js';

import { fileURLToPath, pathToFileURL } from 'url';
import 'dotenv/config';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a new client instance
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ] 
});

// Run code once when the client is ready
client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Log in to Discord with your app's token
client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error('Failed to login:', err);
    process.exit(1);
});

// Receive messages
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);

    // Convert the file path to a URL format
    const fileUrl = pathToFileURL(filePath).href;

    import(fileUrl).then((eventModule) => {
        const event = eventModule.default;
        if(event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
    }).catch(err => {
        console.error(`Error loading event file ${filePath}:`, err);
    });
}
