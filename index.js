import { Client, Collection, Events, GatewayIntentBits, Partials } from 'discord.js';
import path from 'path';
import fs from 'fs';
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
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageTyping,
    ],
    partials: [Partials.Channel, Partials.Message]
});

// Set up a collection for commands
client.commands = new Collection();

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

// Receive commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

async function loadCommands() {
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const fileUrl = pathToFileURL(filePath).href;
        
        try {
            const command = await import(fileUrl);
            if ('data' in command.default && 'execute' in command.default) {
                client.commands.set(command.default.data.name, command.default);
                console.log(`Loaded command: ${command.default.data.name}`);
            } else {
                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        } catch (error) {
            console.error(`Error loading command file ${filePath}:`, error);
        }
    }
}

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`Error executing command ${interaction.commandName}:`, error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
});

// Run code once when the client is ready
client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    loadCommands().catch(error => {
        console.error('Failed to load commands:', error);
        process.exit(1);
    });
});

// Log in to Discord with your app's token
client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error('Failed to login:', err);
    process.exit(1);
});