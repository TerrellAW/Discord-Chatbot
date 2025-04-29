import { REST, Routes } from 'discord.js';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import fs from 'fs';

import 'dotenv/config';

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commands = [];

// Read all command files in the commands directory
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Loop through each command file and import it
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);

    // Convert the file path to a proper file URL format
    const fileUrl = pathToFileURL(filePath).href;

    import(fileUrl).then((commandModule) => {
        const command = commandModule.default;
        commands.push(command.data.toJSON());
    }).catch(err => {
        console.error(`Error loading command file ${filePath}:`, err);
    });
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        // Parse command line arguments
        const args = process.argv.slice(2);
        const forceGuild = args.includes('--guild') || args.includes('-g');
        const forceGlobal = args.includes('--global') || args.includes('-G');
        const dontDelete = args.includes('--preserve') || args.includes('-p');

        // Choose global or guild deployment
        let globalDeploy = false;
        let guildDeploy = false;
        if (forceGuild) {
            guildDeploy = true;
        }
        if (forceGlobal) {
            globalDeploy = true;
        }

        // Delete all existing commands
        if (!dontDelete) { // Default to deleting commands if no flags are provided
            await rest.put(Routes.applicationCommands(process.env.APP_ID), { body: [] });
            await rest.put(Routes.applicationGuildCommands(process.env.APP_ID, process.env.SERVER_ID), { body: [] });
            console.log('Successfully deleted all existing commands.');
        }

        // Register the commands with Discord
        if (globalDeploy) {
            await rest.put(Routes.applicationCommands(process.env.APP_ID), { body: commands });
            console.log('Successfully registered application (/) commands globally.');
        }
        if (guildDeploy) {
            await rest.put(Routes.applicationGuildCommands(process.env.APP_ID, process.env.SERVER_ID), { body: commands });
            console.log('Successfully registered application (/) commands for the guild.');
        }
        else if (!globalDeploy) { // Default to guild deployment if no flags are provided
            await rest.put(Routes.applicationGuildCommands(process.env.APP_ID, process.env.SERVER_ID), { body: commands });
            console.log('Successfully registered application (/) commands for the guild.');
        }
    } catch (error) {
        console.error(error);
    }
})(); // Recursively call the function to ensure all commands are registered