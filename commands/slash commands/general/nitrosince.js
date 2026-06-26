const { SlashCommandBuilder } = require('discord.js');
const { fetchAdvancedProfile } = require('../../../utils/v9Scraper'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nitro-since')
        .setDescription('Check exactly when a user started their Nitro subscription.')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The user you want to check.')
                .setRequired(false)
        ),

    async execute(interaction) {
        // Defer the reply to give the scraper time to fetch the API
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('target') || interaction.user;

        try {
            // Fetch the advanced profile data
            const v10Data = await fetchAdvancedProfile(targetUser.id).catch(() => null);

            if (!v10Data) {
                return interaction.editReply(`❌ Could not fetch advanced profile data for **${targetUser.username}**.`);
            }

            // Extract the Nitro date (usually sits at the root of the payload)
            const premiumSince = v10Data.premium_since;

            if (!premiumSince) {
                return interaction.editReply(`<:nitro_gray:1519654030899417128> **${targetUser.globalName || targetUser.username}** does not currently have an active Nitro subscription.`);
            }

            // Convert Discord's ISO timestamp into a UNIX timestamp (seconds)
            const unixTimestamp = Math.floor(new Date(premiumSince).getTime() / 1000);

            // Display using the 'F' flag for Full Date/Time and 'R' for Relative
            return interaction.editReply(
                `<:nitro:1519654030899417128> **${targetUser.globalName || targetUser.username}** has been subscribed to Nitro since:\n` +
                `> **<t:${unixTimestamp}:F>** (<t:${unixTimestamp}:R>)`
            );

        } catch (error) {
            console.error("Nitro-Since Error:", error);
            return interaction.editReply("❌ **API Error:** Something went wrong while fetching the profile.");
        }
    }
};
