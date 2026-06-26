const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const NitroConfig = require('../../../src/models/NitroConfig'); 
const { fetchAdvancedProfile } = require('../../../utils/v9Scraper'); // ✅ Import your scraper!

module.exports = {
    data: new SlashCommandBuilder()
        .setName('w-nitro')
        .setDescription('Configure or check Nitro role assignments.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        
        // 1. SET Subcommand
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
        
        // 2. DISABLE Subcommand
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Clear the Nitro role configuration.')
        )
        
        // 3. CHECK Subcommand (The new manual trigger)
        .addSubcommand(subcommand =>
            subcommand
                .setName('check')
                .setDescription('Manually check a user and apply the correct Nitro roles.')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('The user to check (leave blank to check yourself)')
                        .setRequired(false)
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const sub = interaction.options.getSubcommand();

        // ==============================
        // ACTION: SET
        // ==============================
        if (sub === 'set') {
            const withNitro = interaction.options.getRole('with_nitro_role');
            const noNitro = interaction.options.getRole('no_nitro_role');

            await NitroConfig.findOneAndUpdate(
                { guildId: interaction.guild.id },
                { withNitroRoleId: withNitro.id, noNitroRoleId: noNitro.id },
                { upsert: true, new: true }
            );

            return interaction.editReply(`✅ **Auto-Nitro Roles Configured!**\n<:nitro:1519654030899417128> **Has Nitro:** ${withNitro}\n⛔ **No Nitro:** ${noNitro}`);
        }

        // ==============================
        // ACTION: DISABLE
        // ==============================
        if (sub === 'disable') {
            await NitroConfig.findOneAndDelete({ guildId: interaction.guild.id });
            return interaction.editReply("🛑 **Auto-Nitro Roles Disabled.** The bot will no longer assign Nitro roles.");
        }

        // ==============================
        // ACTION: CHECK (Manual Sync)
        // ==============================
        if (sub === 'check') {
            // 1. Fetch Config
            const config = await NitroConfig.findOne({ guildId: interaction.guild.id });
            if (!config) {
                return interaction.editReply("⚠️ You need to set up the roles first! Run `/w-nitro set`.");
            }

            // 2. Fetch Target Member
            const targetUser = interaction.options.getUser('target') || interaction.user;
            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

            if (!targetMember) {
                return interaction.editReply("❌ That user is not in this server.");
            }

            // 3. Check the Burner Account API
            const v10Data = await fetchAdvancedProfile(targetUser.id).catch(() => null);
            if (!v10Data) {
                return interaction.editReply(`❌ Failed to fetch profile data for **${targetUser.username}**.`);
            }

            // 4. Determine Status & Apply Logic
            const hasNitro = !!(v10Data.premium_type || v10Data.premium_since);
            const hasNitroRole = targetMember.roles.cache.has(config.withNitroRoleId);
            const hasNoNitroRole = targetMember.roles.cache.has(config.noNitroRoleId);

            let addedRole = "None";
            let removedRole = "None";

            if (hasNitro) {
                if (!hasNitroRole) { 
                    await targetMember.roles.add(config.withNitroRoleId).catch(() => {}); 
                    addedRole = `<@&${config.withNitroRoleId}>`; 
                }
                if (hasNoNitroRole) { 
                    await targetMember.roles.remove(config.noNitroRoleId).catch(() => {}); 
                    removedRole = `<@&${config.noNitroRoleId}>`; 
                }

                return interaction.editReply(`✅ **${targetUser.username}** has Nitro!\n> **Added:** ${addedRole}\n> **Removed:** ${removedRole}`);
            } else {
                if (!hasNoNitroRole) { 
                    await targetMember.roles.add(config.noNitroRoleId).catch(() => {}); 
                    addedRole = `<@&${config.noNitroRoleId}>`; 
                }
                if (hasNitroRole) { 
                    await targetMember.roles.remove(config.withNitroRoleId).catch(() => {}); 
                    removedRole = `<@&${config.withNitroRoleId}>`; 
                }

                return interaction.editReply(`⛔ **${targetUser.username}** does not have Nitro.\n> **Added:** ${addedRole}\n> **Removed:** ${removedRole}`);
            }
        }
    }
};
