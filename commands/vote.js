import { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName("vote")
        .setDescription("`/vote option1, option2, option3` to create a poll")
        .addStringOption(option =>
            option
                .setName("options")
                .setDescription("The options to vote between (max 5)")
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();

        const options = interaction.options.getString('options');
        const optionsArray = options.split(", ").map(option => option.trim()).filter(option => option !== "");

        // Error prevention
        if (optionsArray.length < 2) {
            return interaction.followUp("Please provide at least two options to vote between.");
        }
        if (optionsArray.length > 5) {
            return interaction.followUp("Please provide no more than 5 options (Discord button limit).");
        }

        // Create the poll embed
        const pollEmbed = new EmbedBuilder()
            .setColor("#0099ff")
            .setTitle("Vote Now!")
            .setDescription(optionsArray.map((option, index) => `${index + 1}. ${option}`).join('\n'))
            .setFooter({ text: "Poll ends in 1 hour" });

        // Create buttons for each option
        const row = new ActionRowBuilder();
        const voters = new Map();

        optionsArray.forEach((option, index) => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`vote_${index}`)
                    .setLabel(`Option ${index + 1}`)
                    .setStyle(ButtonStyle.Primary)
            );
        });

        // Send poll message with buttons
        const message = await interaction.followUp({
            embeds: [pollEmbed],
            components: [row]
        });

        // Create button collector
        const collector = message.createMessageComponentCollector({
            time: 3600000 // 1 hour
        });

        const voteCounts = new Map();
        optionsArray.forEach((_, index) => {
            voteCounts.set(`vote_${index}`, 0);
        });

        collector.on('collect', async i => {
            // Check if user has already voted
            if (voters.has(i.user.id)) {
                await i.reply({
                    content: 'You have already voted!',
                    ephemeral: true
                });
                return;
            }

            // Record the vote
            voters.set(i.user.id, i.customId);
            voteCounts.set(i.customId, (voteCounts.get(i.customId) || 0) + 1);
            
            await i.reply({
                content: `Your vote has been recorded!`,
                ephemeral: true
            });

            // Update the embed with current results
            const resultsDescription = optionsArray.map((option, index) => {
                const voteCount = voteCounts.get(`vote_${index}`) || 0;
                const percentage = (voteCount / voters.size) * 100 || 0;
                const bar = '█'.repeat(Math.round(percentage / 10)) + '▒'.repeat(10 - Math.round(percentage / 10));
                return `${index + 1}. ${option}\n${bar} ${voteCount} votes (${percentage.toFixed(1)}%)`;
            }).join('\n\n');

            pollEmbed.setDescription(resultsDescription);
            await message.edit({ embeds: [pollEmbed] });
        });

        // Handle when poll ends
        collector.on('end', async () => {
            // Calculate final results
            const finalResults = optionsArray.map((option, index) => {
                const voteCount = voteCounts.get(`vote_${index}`) || 0;
                const percentage = (voteCount / voters.size) * 100 || 0;
                const bar = '█'.repeat(Math.round(percentage / 10)) + '▒'.repeat(10 - Math.round(percentage / 10));
                return `${index + 1}. ${option}\n${bar} ${voteCount} votes (${percentage.toFixed(1)}%)`;
            }).join('\n\n');

            // Update embed with final results
            pollEmbed
                .setDescription(finalResults)
                .setTitle('Poll Results')
                .setColor('#00FF00');

            // Disable all buttons
            row.components.forEach(button => button.setDisabled(true));
            
            await message.edit({
                content: '**Voting has ended!**',
                components: [row]
            });
        });
    },
};