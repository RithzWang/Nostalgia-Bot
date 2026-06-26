const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
// Assuming you have a Mongoose model named NitroConfig
const NitroConfig = require('../../../src/models/NitroConfig'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('w-nitro')
        .setDescription('Configure automatic Nitro role assignment.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set the Nitro and Non-Nitro roles for the server.')
                .addRoleOption(option =>
                    option.setName('with_nitro_role')
                        .setDescription('Role to give if they HAVE Nitro')
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option.setName('no_nitro_role')
                        .setDescription('Role to give if they DO NOT have Nitro')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable automatic Nitro role assignment.')
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const sub = interaction.options.getSubcommand();

        if (sub === 'set') {
            const withNitro = interaction.options.getRole('with_nitro_role');
            const noNitro = interaction.options.getRole('no_nitro_role');

            // Save or update the configuration in your database
            await NitroConfig.findOneAndUpdate(
                { guildId: interaction.guild.id },
                { 
                    withNitroRoleId: withNitro.id, 
                    noNitroRoleId: noNitro.id 
                },
                { upsert: true, new: true }
            );

            return interaction.editReply(`✅ **Auto-Nitro Roles Configured!**\n<:nitro:1519654030899417128> **Has Nitro:** ${withNitro}\n⛔ **No Nitro:** ${noNitro}`);
        }

        if (sub === 'disable') {
            // Remove the configuration from your database
            await NitroConfig.findOneAndDelete({ guildId: interaction.guild.id });
            return interaction.editReply("🛑 **Auto-Nitro Roles Disabled.** The bot will no longer assign Nitro roles automatically.");
        }
    }
};
