const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder,
    ContainerBuilder, 
    TextDisplayBuilder, 
    SeparatorBuilder, 
    SeparatorSpacingSize,
    MessageFlags 
} = require('discord.js');

const { Panel, ServerList, GreetConfig } = require('../../../src/models/Qabilatan'); 
const { 
    generateDetailedPayload, 
    updateAllPanels 
} = require('../../../utils/qabilatanManager'); 

const ALLOWED_USER_ID = '837741275603009626';
const MAIN_SERVER_ID = '1456197054782111756'; 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('qabilatan')
        .setDescription('Manage the A2-Q Server Network')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => 
            sub.setName('disable')
               .setDescription('Stop updating a specific statistics panel')
               .addStringOption(opt => opt.setName('message_id').setDescription('The Message ID to stop updating').setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName('enable')
               .setDescription('Enable statistics dashboard in the Main Server')
               .addStringOption(opt => opt.setName('message_id').setDescription('Existing Message ID to edit').setRequired(false))
               .addChannelOption(opt => opt.setName('channel').setDescription('Channel to send/edit').setRequired(false))
        )
        .addSubcommand(sub => sub.setName('add').setDescription('Add a server to the network'))
        .addSubcommand(sub => sub.setName('edit').setDescription('Edit a server in the network'))
        .addSubcommand(sub => sub.setName('delete').setDescription('Remove a server from the network'))
        .addSubcommand(sub => sub.setName('refresh').setDescription('Force update the main dashboard'))
        .addSubcommand(sub => 
            sub.setName('greet-message')
               .setDescription('Setup greet/kick logic for this server')
               .addStringOption(opt => opt.setName('server_id').setDescription('The ID of this server in the list').setRequired(true))
               .addBooleanOption(opt => opt.setName('enable').setDescription('Enable or disable').setRequired(true))
               .addChannelOption(opt => opt.setName('channel').setDescription('Welcome channel (required if enabling for the first time)').setRequired(false))
        )
        .addSubcommand(sub => 
            sub.setName('tag-user-role')
               .setDescription('Give a role to tag adopters in a satellite server')
               .addStringOption(opt => opt.setName('server_id').setDescription('The Dashboard Server ID').setRequired(true))
               .addBooleanOption(opt => opt.setName('enable').setDescription('Enable or disable').setRequired(true))
               .addRoleOption(opt => opt.setName('role').setDescription('Role in this server to give').setRequired(false))
        ),

    async execute(interaction, client) {
        if (interaction.user.id !== ALLOWED_USER_ID) {
            return interaction.reply({ 
                content: "❌ **Access Denied.** Only the Bot Owner can use this command.", 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            // --- DISABLE ---
            if (subcommand === 'disable') {
                const targetMsgId = interaction.options.getString('message_id');
                const result = await Panel.deleteOne({ messageId: targetMsgId });

                if (result.deletedCount === 0) {
                    return interaction.reply({ content: `❌ No active panel found with ID \`${targetMsgId}\`.`, flags: [MessageFlags.Ephemeral] });
                }
                return interaction.reply({ content: `✅ Panel disabled.`, flags: [MessageFlags.Ephemeral] });
            }

            // --- ENABLE ---
            if (subcommand === 'enable') {
                if (interaction.guild.id !== MAIN_SERVER_ID) {
                    return interaction.reply({ 
                        content: "❌ **The Statistics Dashboard is exclusive to the Main Server.**", 
                        flags: [MessageFlags.Ephemeral] 
                    });
                }

                const messageId = interaction.options.getString('message_id');
                const channel = interaction.options.getChannel('channel') || interaction.channel;

                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

                const components = await generateDetailedPayload(client);

                let msg;
                if (messageId) {
                    try {
                        msg = await channel.messages.fetch(messageId);
                        await msg.edit({ components, flags: [MessageFlags.IsComponentsV2] });
                    } catch (e) {
                        return interaction.editReply({ content: "❌ Message not found or invalid ID." });
                    }
                } else {
                    msg = await channel.send({ components, flags: [MessageFlags.IsComponentsV2] });
                }

                await Panel.findOneAndUpdate(
                    { guildId: interaction.guild.id },
                    { 
                        guildId: interaction.guild.id, 
                        channelId: channel.id, 
                        messageId: msg.id 
                    },
                    { upsert: true, new: true }
                );

                return interaction.editReply({ content: "✅ Main Statistics Panel Enabled/Updated!" });
            }

            // --- REFRESH ---
            if (subcommand === 'refresh') {
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                await updateAllPanels(client);
                return interaction.editReply("✅ Dashboard refreshed.");
            }

            // --- ADD ---
            if (subcommand === 'add') {
                const modal = new ModalBuilder()
                    .setCustomId('qabilatan_add_modal')
                    .setTitle('Add Server to Qabilatan');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('srv_id').setLabel("Server ID").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('srv_invite').setLabel("Invite Link").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('srv_tag').setLabel("Tag Text (Optional)").setStyle(TextInputStyle.Short).setRequired(false)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('srv_role').setLabel("Tag Role ID (Optional)").setStyle(TextInputStyle.Short).setRequired(false)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('srv_name').setLabel("Server Name Override (Optional)").setStyle(TextInputStyle.Short).setRequired(false))
                );
                return interaction.showModal(modal);
            }

            // --- EDIT ---
            if (subcommand === 'edit') {
                const servers = await ServerList.find();
                if (servers.length === 0) return interaction.reply({ content: "No servers found.", flags: [MessageFlags.Ephemeral] });

                const options = servers.slice(0, 25).map(s => 
                    new StringSelectMenuOptionBuilder().setLabel(s.name ? s.name.substring(0, 25) : s.serverId).setValue(s.serverId).setDescription(`ID: ${s.serverId}`)
                );

                const components = [
                    new ContainerBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent("## A2-Q Statistics Edit"))
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
                        .addActionRowComponents(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId("qabilatan_edit_select").setPlaceholder("Select a server to edit").addOptions(options)))
                ];
                return interaction.reply({ components, flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
            }

            // --- DELETE ---
            if (subcommand === 'delete') {
                const servers = await ServerList.find();
                if (servers.length === 0) return interaction.reply({ content: "No servers found.", flags: [MessageFlags.Ephemeral] });

                const options = servers.slice(0, 25).map(s => 
                    new StringSelectMenuOptionBuilder().setLabel(s.name ? s.name.substring(0, 25) : s.serverId).setValue(s.serverId).setDescription(`ID: ${s.serverId}`)
                );

                const components = [
                    new ContainerBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent("## A2-Q Statistics Remove Server"))
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
                        .addActionRowComponents(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId("qabilatan_delete_select").setPlaceholder("Select a server to remove").addOptions(options)))
                ];
                return interaction.reply({ components, flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
            }

            // --- GREET MESSAGE ---
            if (subcommand === 'greet-message') {
                const srvId = interaction.options.getString('server_id');
                const enable = interaction.options.getBoolean('enable');
                const channel = interaction.options.getChannel('channel');

                const exists = await ServerList.findOne({ serverId: srvId });
                if (!exists) return interaction.reply({ content: `❌ Server ID not found in dashboard.`, flags: [MessageFlags.Ephemeral] });

                const currentGreet = await GreetConfig.findOne({ guildId: srvId });

                if (enable) {
                    if (currentGreet && !channel) {
                        return interaction.reply({ 
                            content: `✅ Greet system is already set up for **${exists.name || srvId}** in <#${currentGreet.channelId}>.`, 
                            flags: [MessageFlags.Ephemeral] 
                        });
                    }
                    
                    if (!currentGreet && !channel) {
                        return interaction.reply({ 
                            content: `❌ You must provide a \`channel\` when enabling the greet message for the first time.`, 
                            flags: [MessageFlags.Ephemeral] 
                        });
                    }
                    
                    const targetChannelId = channel ? channel.id : currentGreet.channelId;

                    await GreetConfig.findOneAndUpdate(
                        { guildId: srvId }, 
                        { guildId: srvId, channelId: targetChannelId }, 
                        { upsert: true, new: true }
                    );

                    return interaction.reply({ 
                        content: `✅ Greet system ${currentGreet && channel ? 'updated' : 'enabled'} for **${exists.name || srvId}** in <#${targetChannelId}>.`, 
                        flags: [MessageFlags.Ephemeral] 
                    });

                } else {
                    if (!currentGreet) {
                        return interaction.reply({ 
                            content: `⚠️ Greet system has not been set up for **${exists.name || srvId}** yet.`, 
                            flags: [MessageFlags.Ephemeral] 
                        });
                    }

                    await GreetConfig.findOneAndDelete({ guildId: srvId });
                    return interaction.reply({ 
                        content: `✅ Greet system disabled for **${exists.name || srvId}**.`, 
                        flags: [MessageFlags.Ephemeral] 
                    });
                }
            }

            // --- TAG USER ROLE ---
            if (subcommand === 'tag-user-role') {
                const srvId = interaction.options.getString('server_id');
                const enable = interaction.options.getBoolean('enable');
                const role = interaction.options.getRole('role');

                const server = await ServerList.findOne({ serverId: srvId });
                if (!server) {
                    return interaction.reply({ content: `❌ Server ID \`${srvId}\` is not in the dashboard.`, flags: [MessageFlags.Ephemeral] });
                }

                if (enable && !role && !server.satelliteRoleId) {
                    return interaction.reply({ content: `❌ You must select a \`role\` when enabling this feature for the first time.`, flags: [MessageFlags.Ephemeral] });
                }

                server.satelliteRoleEnabled = enable;
                if (role) server.satelliteRoleId = role.id;
                await server.save();

                return interaction.reply({ 
                    content: `✅ Satellite Tag Role for **${server.name || srvId}** has been **${enable ? 'enabled' : 'disabled'}**.${enable ? `\nRole: <@&${server.satelliteRoleId}>` : ''}`, 
                    flags: [MessageFlags.Ephemeral] 
                });
            }

        } catch (error) {
            console.error("❌ Qabilatan Command Error:", error);
            const errMsg = `❌ Error: ${error.message}`;
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: errMsg, flags: [MessageFlags.Ephemeral] }).catch(() => {});
            } else {
                await interaction.reply({ content: errMsg, flags: [MessageFlags.Ephemeral] }).catch(() => {});
            }
        }
    }
};
