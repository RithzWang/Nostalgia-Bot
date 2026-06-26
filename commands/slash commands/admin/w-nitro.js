const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const NitroConfig = require('../../../src/models/NitroConfig'); 
const { fetchAdvancedProfile } = require('../../../utils/v9Scraper'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('w-nitro')
        .setDescription('Configure or run a mass Nitro role check.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        
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
        
        // 3. CHECK Subcommand (Mass Sync)
        .addSubcommand(subcommand =>
            subcommand
                .setName('check')
                .setDescription('Check ALL members one-by-one and sync their Nitro roles safely.')
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
        // ACTION: CHECK (Mass Sync)
        // ==============================
        if (sub === 'check') {
            // 1. Fetch Config
            const config = await NitroConfig.findOne({ guildId: interaction.guild.id });
            if (!config) {
                return interaction.editReply("⚠️ You need to set up the roles first! Run `/w-nitro set`.");
            }

            // 2. Fetch all members and filter out Bots (Bots can't buy Nitro)
            const allMembers = await interaction.guild.members.fetch();
            const humanMembers = allMembers.filter(m => !m.user.bot);
            
            // Calculate estimated time (2 seconds per member)
            const estimatedMinutes = Math.ceil((humanMembers.size * 2) / 60);

            await interaction.editReply(`⏳ **Starting Mass Nitro Sync...**\n> I am preparing to check **${humanMembers.size}** members.\n> This will take approximately **${estimatedMinutes} minute(s)** to complete safely to avoid API bans.\n\n*I will ping you in this channel when I am finished!*`);

            let nitroFoundCount = 0;
            let changesMade = 0;

            // 3. Loop through everyone ONE BY ONE
            for (const [id, member] of humanMembers) {
                try {
                    // Hit the API
                    const v10Data = await fetchAdvancedProfile(member.id).catch(() => null);
                    
                    if (v10Data) {
                        const hasNitro = !!(v10Data.premium_type || v10Data.premium_since);
                        const hasNitroRole = member.roles.cache.has(config.withNitroRoleId);
                        const hasNoNitroRole = member.roles.cache.has(config.noNitroRoleId);

                        if (hasNitro) {
                            nitroFoundCount++;
                            if (!hasNitroRole) { 
                                await member.roles.add(config.withNitroRoleId).catch(() => {}); 
                                changesMade++;
                            }
                            if (hasNoNitroRole) { 
                                await member.roles.remove(config.noNitroRoleId).catch(() => {}); 
                            }
                        } else {
                            if (!hasNoNitroRole) { 
                                await member.roles.add(config.noNitroRoleId).catch(() => {}); 
                                changesMade++;
                            }
                            if (hasNitroRole) { 
                                await member.roles.remove(config.withNitroRoleId).catch(() => {}); 
                            }
                        }
                    }

                    // ⚠️ CRITICAL: 2-Second Sleep Timer
                    // This pauses the loop for 2000 milliseconds before checking the next user.
                    // DO NOT remove this, or your burner account will be banned for API abuse!
                    await new Promise(resolve => setTimeout(resolve, 2000));

                } catch (error) {
                    console.error(`Failed to sync ${member.user.tag}:`, error);
                }
            }

            // 4. Send the final completion message!
            // We use channel.send instead of editReply just in case the process took longer than 15 minutes.
            return interaction.channel.send({
                content: `✅ <@${interaction.user.id}>, **Mass Nitro Sync Complete!**\n> Checked: **${humanMembers.size}** members.\n> Total Nitro Users Found: **${nitroFoundCount}**\n> Roles Updated: **${changesMade}**`
            }).catch(() => {});
        }
    }
};
