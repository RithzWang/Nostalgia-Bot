const { 
    SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, 
    TextInputBuilder, TextInputStyle, ActionRowBuilder, 
    StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, 
    SeparatorSpacingSize 
} = require('discord.js');

// ⚠️ MAKE SURE THESE PATHS POINT TO YOUR ACTUAL FILES
const { Panel, ServerList, GreetConfig } = require('../../../src/models/Qabilatan'); 
const { buildDashboard, updateAllPanels } = require('../../../utils/qabilatanManager'); 

const ALLOWED_USER_ID = '837741275603009626';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('qabilatan')
        .setDescription('Manage the A2-Q Server Network')
        // We keep Administrator here so random members don't see it, 
        // but we double-check the ID in execute() just to be safe.
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => 
            sub.setName('enable')
               .setDescription('Enable statistics panel here or update an existing message')
               .addStringOption(opt => opt.setName('message_id').setDescription('Existing Message ID to edit').setRequired(false))
               .addChannelOption(opt => opt.setName('channel').setDescription('Channel to send/edit').setRequired(false))
        )
        .addSubcommand(sub => sub.setName('add').setDescription('Add a server to the network'))
        .addSubcommand(sub => sub.setName('edit').setDescription('Edit a server in the network'))
        .addSubcommand(sub => sub.setName('delete').setDescription('Remove a server from the network'))
        .addSubcommand(sub => sub.setName('refresh').setDescription('Force update all statistics panels'))
        .addSubcommand(sub => 
            sub.setName('greet-message')
               .setDescription('Setup greet/kick logic for this server')
               .addChannelOption(opt => opt.setName('channel').setDescription('Welcome channel').setRequired(true))
               .addStringOption(opt => opt.setName('server_id').setDescription('The ID of this server in the list').setRequired(true))
        ),

    async execute(interaction, client) {
        // 🔒 SECURITY CHECK
        if (interaction.user.id !== ALLOWED_USER_ID) {
            return interaction.reply({ 
                content: "❌ **Access Denied.** Only the Bot Owner can use this command.", 
                ephemeral: true 
            });
        }

        const subcommand = interaction.options.getSubcommand();

        // --- ENABLE ---
        if (subcommand === 'enable') {
            const messageId = interaction.options.getString('message_id');
            const channel = interaction.options.getChannel('channel') || interaction.channel;

            const components = await buildDashboard(client);
            let msg;

            if (messageId) {
                try {
                    msg = await channel.messages.fetch(messageId);
                    await msg.edit({ components });
                } catch (e) {
                    return interaction.reply({ content: "❌ Message not found or invalid ID.", ephemeral: true });
                }
            } else {
                msg = await channel.send({ components });
            }

            // Save to DB
            await Panel.findOneAndUpdate(
                { guildId: interaction.guild.id },
                { 
                    guildId: interaction.guild.id, 
                    channelId: channel.id, 
                    messageId: msg.id 
                },
                { upsert: true, new: true }
            );

            return interaction.reply({ content: "✅ Statistics Panel Enabled/Updated!", ephemeral: true });
        }

        // --- REFRESH ---
        if (subcommand === 'refresh') {
            await interaction.deferReply({ ephemeral: true });
            await updateAllPanels(client);
            return interaction.editReply("✅ All panels have been refreshed.");
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
            if (servers.length === 0) return interaction.reply({ content: "No servers found.", ephemeral: true });

            const options = servers.map(s => 
                new StringSelectMenuOptionBuilder()
                    .setLabel(s.name || s.serverId)
                    .setValue(s.serverId) // Passing ID as value
                    .setDescription(`ID: ${s.serverId}`)
            );

            const components = [
                new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent("## A2-Q Statistics Edit"))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId("qabilatan_edit_select")
                                .setPlaceholder("Select a server to edit")
                                .addOptions(options)
                        )
                    )
            ];

            return interaction.reply({ components, ephemeral: true });
        }

        // --- DELETE ---
        if (subcommand === 'delete') {
            const servers = await ServerList.find();
            if (servers.length === 0) return interaction.reply({ content: "No servers found.", ephemeral: true });

            const options = servers.map(s => 
                new StringSelectMenuOptionBuilder()
                    .setLabel(s.name || s.serverId)
                    .setValue(s.serverId)
                    .setDescription(`ID: ${s.serverId}`)
            );

            const components = [
                new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent("## A2-Q Statistics Remove Server"))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId("qabilatan_delete_select")
                                .setPlaceholder("Select a server to remove")
                                .addOptions(options)
                        )
                    )
            ];

            return interaction.reply({ components, ephemeral: true });
        }

        // --- GREET MESSAGE ---
        if (subcommand === 'greet-message') {
            const channel = interaction.options.getChannel('channel');
            const srvId = interaction.options.getString('server_id');

            // Verify server is in list
            const exists = await ServerList.findOne({ serverId: srvId });
            if (!exists) return interaction.reply({ content: `❌ Server ID \`${srvId}\` is not in the Qabilatan list. Please add it first.`, ephemeral: true });

            await GreetConfig.findOneAndUpdate(
                { guildId: interaction.guild.id },
                { guildId: interaction.guild.id, channelId: channel.id },
                { upsert: true, new: true }
            );

            return interaction.reply({ content: `✅ Greet/Kick system enabled for <#${channel.id}>. Members not in Main Server will be warned and kicked after 10m (unless boosting).`, ephemeral: true });
        }
    }
};
