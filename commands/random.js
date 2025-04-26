import { 
    SlashCommandBuilder, 
    EmbedBuilder
} from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName("random")
        .setDescription("`/random option1, option2, option3, ...` to create a poll")
        .addStringOption(option =>
            option
                .setName("options")
                .setDescription("The options to choose between (max 10)")
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();

        const options = interaction.options.getString('options');
        const optionsArray = options.split(", ").map(option => option.trim()).filter(option => option !== "");

        // Error prevention
        if (optionsArray.length < 2) {
            return interaction.followUp("Please provide at least two options to choose between.");
        }
        if (optionsArray.length > 10) {
            return interaction.followUp("Please provide no more than 10 options.");
        }

        // Randomly select an option
        const randomIndex = Math.floor(Math.random() * optionsArray.length);
        const chosenOption = optionsArray[randomIndex];

        // Create the poll embed
        const pollEmbed = new EmbedBuilder()
            .setColor("#0099ff")
            .setTitle("Random Choice!")
            .setDescription(optionsArray.map((option, index) => `${index + 1}. ${option}`).join('\n'))
            .addFields({ name: 'Result:', value: `**${chosenOption}**`, inline: false })

        // Send embed message
        await interaction.followUp({
            embeds: [pollEmbed],
        });
    }
}