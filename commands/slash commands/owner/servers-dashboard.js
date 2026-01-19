const { 
    SlashCommandBuilder, PermissionFlagsBits, MessageFlags, 
    ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
    StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ContainerBuilder, TextDisplayBuilder
} = require('discord.js');

const TrackedServer = require('../../../src/models/TrackedServerSchema');
const DashboardLocation = require('../../../src/models/DashboardLocationSchema');
const { generateDashboardPayload, updateAllDashboards } = require('../../../utils/dashboardUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('servers-dashboard')
        .setDescription('Manage the A2-Q Server Dashboard')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        
        // 1. ENABLE
        .addSubcommand(sub => 
            sub.setName('enable')
                .setDescription('Create or link a dashboard message here')
                .addStringOption(opt => opt.setName('message_id').setDescription('Optional: Convert existing text message'))
                .addChannelOption(opt => opt.setName('channel').setDescription('Optional: Target channel')))
        
        // 2. ADD SERVER
        .addSubcommand(sub => 
            sub.setName('addserver')
                .setDescription('Add a new server to the global list'))
        
        // 3. REMOVE SERVER
        .addSubcommand(sub => 
            sub.setName('removeserver')
                .setDescription('Remove a server from the global list'))

        // 4. EDIT SERVER (Fixed: Uses Select Menu)
        .addSubcommand(sub => 
            sub.setName('edit')
                .setDescription('Edit details of an existing server'))

        // 5. MANUAL UPDATE
        .addSubcommand(sub => 
            sub.setName('update')
                .setDescription('Force update all dashboards immediately')),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return;

        const sub = interaction.options.getSubcommand();

        // ====================================================
        // 🛑 MODAL COMMANDS (ADD) - CANNOT DEFER
        // ====================================================
        if (sub === 'addserver') {
            const modal = new ModalBuilder().setCustomId('dashboard_add_server').setTitle('Add Server');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('server_id').setLabel("Server ID").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('display_name').setLabel("Display Name").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('tag_text').setLabel("Tag Text (Display Only)").setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('role_id').setLabel("Role ID (For Tracking)").setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('invite_link').setLabel("Invite Link").setStyle(TextInputStyle.Short).setRequired(true))
            );
            return interaction.showModal(modal);
        }

        // ====================================================
        // 🟢 OTHER COMMANDS - DEFER ALLOWED
        // ====================================================
        await interaction.deferReply({ ephemeral: true });

        // --- EDIT SERVER (SELECT MENU) ---
        if (sub === 'edit') {
            const servers = await TrackedServer.find();
            if (servers.length === 0) return interaction.editReply("❌ No servers found to edit.");

            // Create Dropdown
            const options = servers.map(s => 
                new StringSelectMenuOptionBuilder()
                    .setLabel(s.displayName)
                    .setDescription(`ID: ${s.guildId}`)
                    .setValue(s.guildId)
            );

            const select = new StringSelectMenuBuilder()
                .setCustomId('dashboard_edit_select')
                .setPlaceholder('Pick a server to edit...')
                .addOptions(options);
            
            return interaction.editReply({ 
                content: "📋 **Select the server you want to edit:**", 
                components: [new ActionRowBuilder().addComponents(select)] 
            });
        }

        // --- REMOVE SERVER ---
        if (sub === 'removeserver') {
            const servers = await TrackedServer.find();
            if (servers.length === 0) return interaction.editReply("❌ No servers found.");

            const options = servers.map(s => new StringSelectMenuOptionBuilder().setLabel(s.displayName).setDescription(s.guildId).setValue(s.guildId));
            const select = new StringSelectMenuBuilder().setCustomId('dashboard_remove_server').setPlaceholder('Select to remove').addOptions(options);
            return interaction.editReply({ content: "Select server to remove:", components: [new ActionRowBuilder().addComponents(select)] });
        }

        // --- ENABLE ---
        if (sub === 'enable') {
            const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
            const msgId = interaction.options.getString('message_id');

            try {
                const payload = await generateDashboardPayload(interaction.client);
                let message;

                if (msgId) {
                    try {
                        message = await targetChannel.messages.fetch(msgId);
                        const loading = new ContainerBuilder().addTextDisplayComponents(
                            new TextDisplayBuilder().setContent('### 🔄 Syncing Dashboard...')
                        );
                        await message.edit({ content: '', embeds: [], components: [loading], flags: MessageFlags.IsComponentsV2 });
                        await message.edit({ components: payload, flags: MessageFlags.IsComponentsV2 });
                    } catch (e) {
                        return interaction.editReply(`❌ Failed to convert: ${e.message}`);
                    }
                } else {
                    message = await targetChannel.send({ components: payload, flags: MessageFlags.IsComponentsV2 });
                }

                await DashboardLocation.findOneAndUpdate(
                    { guildId: interaction.guild.id },
                    { guildId: interaction.guild.id, channelId: targetChannel.id, messageId: message.id },
                    { upsert: true, new: true }
                );
                interaction.editReply(`✅ **Dashboard Enabled!** Saved to ${targetChannel}.`);

            } catch (e) { interaction.editReply(`❌ Error: ${e.message}`); }
        }

        // --- MANUAL UPDATE ---
        if (sub === 'update') {
            await updateAllDashboards(interaction.client);
            return interaction.editReply("✅ **Force Update Complete!** All dashboards have been refreshed.");
        }
    }
};
