import { SlashCommandBuilder } from "discord.js";

import { clearMemory } from "../events/message.js";

export default {
  data: new SlashCommandBuilder()
    .setName("reset")
    .setDescription("Reset the bot's memory. Soft reboot."),
  async execute(interaction) {
    await interaction.reply("Resetting...");
    // Reset bot's memory and soft reboot
    clearMemory(interaction);
  },
};
