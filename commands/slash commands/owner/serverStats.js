const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const ServerStatsConfig = require('../../../../src/models/ServerStats');
const { generateServerStatsPayload } = require('../../../../utils/serverStatsManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server-stats')
        .setDescription('Manage the local server statistics dashboard')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => 
            sub.setName('enable')
               .setDescription('Enable the server stats dashboard')
               .addStringOption(opt => opt.setName('invite_link').setDescription('Optional Server Invite Link').setRequired(false))
               .addStringOption(opt => opt.setName('message_id').setDescription('Existing message ID to edit').setRequired(false))
               .addChannelOption(opt => opt.setName('channel').setDescription('Channel to send/edit in').setRequired(false))
        )
        .addSubcommand(sub => 
            sub.setName('disable')
               .setDescription('Remove the server stats dashboard')
        )
        .addSubcommand(sub => 
            sub.setName('tag-enable')
               .setDescription('Enable Tag Statistics on the dashboard & auto-role')
               .addStringOption(opt => opt.setName('tag_text').setDescription('The tag text (e.g. A2-Q)').setRequired(true))
               .addRoleOption(opt => opt.setName('tag_adopter_role').setDescription('Role to give to adopters').setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName('tag-disable')
               .setDescription('Disable Tag Statistics from the dashboard')
        ),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            // --- 1. ENABLE DASHBOARD ---
            if (subcommand === 'enable') {
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                
                const inviteLink = interaction.options.getString('invite_link') || "";
                const messageId = interaction.options.getString('message_id');
                const channel = interaction.options.getChannel('channel') || interaction.channel;

                let config = await ServerStatsConfig.findOne({ guildId });
                if (!config) {
                    config = new ServerStatsConfig({ guildId });
                }
                
                if (inviteLink) config.inviteLink = inviteLink;
                config.channelId = channel.id;

                const payload = await generateServerStatsPayload(interaction.guild, config);

                let msg;
                if (messageId) {
                    try {
                        msg = await channel.messages.fetch(messageId);
                        await msg.edit({ components: payload, flags: [MessageFlags.IsComponentsV2] });
                    } catch (e) {
                        return interaction.editReply("❌ Message not found or invalid ID.");
                    }
                } else {
                    msg = await channel.send({ components: payload, flags: [MessageFlags.IsComponentsV2] });
                }

                config.messageId = msg.id;
                await config.save();

                return interaction.editReply("✅ Server Stats Panel Enabled!");
            }

            // --- 2. DISABLE DASHBOARD ---
            if (subcommand === 'disable') {
                const deleted = await ServerStatsConfig.findOneAndDelete({ guildId });
                if (!deleted) return interaction.reply({ content: "❌ No active stats panel found for this server.", flags: [MessageFlags.Ephemeral] });
                
                return interaction.reply({ content: "✅ Server Stats Panel Disabled.", flags: [MessageFlags.Ephemeral] });
            }

            // --- 3. ENABLE TAG STATS ---
            if (subcommand === 'tag-enable') {
                const tagText = interaction.options.getString('tag_text');
                const role = interaction.options.getRole('tag_adopter_role');

                const config = await ServerStatsConfig.findOne({ guildId });
                if (!config) return interaction.reply({ content: "❌ You must enable the dashboard first using `/server-stats enable`.", flags: [MessageFlags.Ephemeral] });

                config.tagEnabled = true;
                config.tagText = tagText;
                config.tagRoleId = role.id;
                await config.save();

                return interaction.reply({ content: `✅ Server Tag Stats enabled! Tracking tag **${tagText}** and giving role <@&${role.id}>.`, flags: [MessageFlags.Ephemeral] });
            }

            // --- 4. DISABLE TAG STATS ---
            if (subcommand === 'tag-disable') {
                const config = await ServerStatsConfig.findOne({ guildId });
                if (!config || !config.tagEnabled) return interaction.reply({ content: "❌ Tag Stats are not currently enabled.", flags: [MessageFlags.Ephemeral] });

                config.tagEnabled = false;
                await config.save();

                return interaction.reply({ content: "✅ Server Tag Stats disabled.", flags: [MessageFlags.Ephemeral] });
            }

        } catch (error) {
            console.error("ServerStats Error:", error);
            const msg = "❌ An error occurred.";
            if (interaction.deferred) await interaction.followUp({ content: msg, flags: [MessageFlags.Ephemeral] }).catch(()=> {});
            else await interaction.reply({ content: msg, flags: [MessageFlags.Ephemeral] }).catch(()=> {});
        }
    }
};
