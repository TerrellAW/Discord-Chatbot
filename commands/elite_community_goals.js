import {
    SlashCommandBuilder,
    EmbedBuilder,
    time
} from "discord.js";

const inaraApiUrl = "https://inara.cz/inapi/v1/";

// Cache mechanism
let lastRequestTime = 0;
let cachedResponse = null;
const cacheDuration = 3600000; // 1 hour in milliseconds

// Get the current date and time
const currentDate = new Date();
const timezoneOffset = -currentDate.getTimezoneOffset() / 60; // Timezone offset in hours
const timezoneSign = timezoneOffset >= 0 ? '+' : ''; // Sign for the timezone offset

function formatDate(currentDate) {
    const year = (currentDate.getFullYear()).toString();
    const month = (currentDate.getMonth()).toString().padStart(2, '0');
    const day = (currentDate.getDate()).toString().padStart(2, '0');
    const hour = (currentDate.getHours()).toString().padStart(2, '0');
    const minute = (currentDate.getMinutes()).toString().padStart(2, '0');
    const second = (currentDate.getSeconds()).toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hour}:${minute}:${second}${timezoneSign}${timezoneOffset}:00`;
}

export default {
    data: new SlashCommandBuilder()
        .setName("elite_community_goals")
        .setDescription("Find out if there is a community goal in Elite Dangerous"),
    async execute(interaction) {
        await interaction.deferReply();

        // Check if the cached response is still valid
        const currentTime = Date.now();
        if (cachedResponse && currentTime - lastRequestTime < cacheDuration) {
            console.log("Using cached community goals data");
            return await interaction.editReply(/* Parse cached response into embed */);
        }

        console.log("Fetching new community goals data from INARA API");
        // Fetch community goals from the INARA API
        try {
            const response = await fetch(inaraApiUrl, {
                method: 'POST',
                body: JSON.stringify({
                    "header": {
                        "appName": process.env.INARA_APP_NAME,
                        "appVersion": "1.0",
                        "isBeingDeveloped": true,
                        "APIKey": process.env.INARA_API_KEY,
                        "commanderName": process.env.INARA_COMMANDER_NAME,
                        "commanderFrontierID": process.env.INARA_COMMANDER_FRONTIER_ID,
                    },
                    "events": [
                        {
                            "eventName": "getCommunityGoalsRecent",
                            "eventTimestamp": formatDate(currentDate),
                            "eventData": []
                        }
                    ]
                })
            });

            const data = await response.json();
        }
        catch (error) {
            console.error("Error fetching community goals:", error);
            return await interaction.editReply("Error fetching community goals. Please try again later.");
        }
    }        
}

// Process API response
function processData(data) {

}