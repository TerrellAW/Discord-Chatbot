import {
    SlashCommandBuilder,
    EmbedBuilder,
    time
} from "discord.js";

const inaraApiUrl = "https://inara.cz/inapi/v1/";

// Cache mechanism
let lastRequestTime = 0;
let cachedResponse = null;
const cacheDuration = 14400000; // 4 hours in milliseconds

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
            return await interaction.editReply({ embeds: [cachedResponse] });
        }

        console.log("Fetching new community goals data from INARA API");
        // Fetch community goals from the INARA API
        try {
            const response = await fetch(inaraApiUrl, {
                method: 'POST',
                body: JSON.stringify({
                    "header": {
                        "appName": process.env.INARA_APP_NAME,
                        "appVersion": process.env.INARA_APP_VERSION,
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

            const embed = processData(data);

            // Update the cache
            cachedResponse = embed;
            lastRequestTime = currentTime;

            // Send the embed as a reply
            return await interaction.editReply({ embeds: [embed] });
        }
        catch (error) {
            console.error("Error fetching community goals:", error);
            return await interaction.editReply("Error fetching community goals. Please try again later.");
        }
    }        
}

// Process API response
function processData(data) {
    // Create new embed
    const embed = new EmbedBuilder()
        .setColor("#0099FF")
        .setTitle("Elite Dangerous Community Goals")
        .setURL("https://inara.cz/elite/communitygoals/")
        .setFooter({ text: "Data provided by INARA, click to view on their site" });

    // Check if the response contains community goals data
    if (!data.events || !data.events[0] || !data.events[0].eventData) {
        embed.setDescription("There are currently no active community goals in Elite Dangerous.");
        return embed;
    }

    // Extract community goals data
    const communityGoals = data.events[0].eventData;

    // Check if there are any community goals
    if (!communityGoals || communityGoals.length === 0) {
        embed.setDescription("There are currently no active community goals in Elite Dangerous.");
        return embed;
    }

    // Count valid goals with names
    const validGoals = communityGoals.filter(goal => goal.communitygoalName).length;
    if (validGoals === 0) {
        embed.setDescription("There are currently no active community goals in Elite Dangerous.");
        return embed;
    }

    // Add information about each community goal to the embed
    communityGoals.forEach((goal, index) => {
        // Skip if goal does not have a name
        if (!goal.communitygoalName) {
            return;
        }

        // Format goal information
        const goalNumber = index + 1;
        const goalName = goal.communitygoalName;
        const goalSystem = goal.starsystemName || "Unknown System";
        const goalStation = goal.stationName || "Unknown Station";
        const goalExpiry = goal.goalExpiry || "Unknown Expiry Date";
        const goalObjective = goal.goalObjectiveText || "No objective specified";

        // Format the expiry date
        let timeRemaining = "Unknown";
        if (goalExpiry) {
            const expiryDate = new Date(goalExpiry);
            timeRemaining = `Expires ${time(expiryDate, "R")}`;
        }

        // Progress variables
        const progress = (goal.tierReached / goal.tierMax) * 100;
        const avgContributions = (goal.contributionsTotal / goal.contributorsNum);
        const tierMax = goal.tierMax || 0;
        const tierReached = goal.tierReached || 0;

        // Format progress bar
        const progressBar = "█".repeat(Math.floor(progress / 10)) + "░".repeat(10 - Math.floor(progress / 10));
        const progressText = `Tier ${tierReached}/${tierMax} (${progress.toFixed(2)}%)`;
        const avgContributionsText = `${avgContributions} Cr`;

        // Add fields to the embed for each community goal
        embed.addFields({
            name: `${goalNumber}. ${goalName}`,
            value: `**Location:** ${goalSystem} - ${goalStation}\n` +
                   `**Time Remaining:** ${timeRemaining}\n` +
                   `**Objective:** ${goalObjective}\n` +
                   `${progressBar}\n` +
                   `${progressText}\n` +
                   `**Average Contribution:** ${avgContributionsText}`,
        });
    });

    return embed;
}