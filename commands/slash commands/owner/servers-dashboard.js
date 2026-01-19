const { 
    SlashCommandBuilder, PermissionFlagsBits, MessageFlags, 
    ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
    StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ContainerBuilder, TextDisplayBuilder
} = require('discord.js');

const TrackedServer = require('../../../src/models/TrackedServerSchema');
const DashboardLocation = require('../../../src/models/DashboardLocationSchema');
const { generateDashboardPayload, runRoleUpdates } = require('../../../utils/dashboardUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('servers-dashboard')
        .setDescription('Manage the A2-Q Server Dashboard')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => 
            sub.setName('enable')
                .setDescription('Create or link a dashboard message here')
                .addStringOption(opt => opt.setName('message_id').setDescription('Optional: Convert existing text message'))
                .addChannelOption(opt => opt.setName('channel').setDescription('Optional: Target channel')))
        
        .addSubcommand(sub => 
            sub.setName('addserver')
                .setDescription('Add a new server to the global list'))
        
        .addSubcommand(sub => 
            sub.setName('removeserver')
                .setDescription('Remove a server from the global list')),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return;

        const sub = interaction.options.getSubcommand();

        // ==========================================
        // 1. ENABLE DASHBOARD
        // ==========================================
        if (sub === 'enable') {
            await interaction.deferReply({ ephemeral: true });
            const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
            const msgId = interaction.options.getString('message_id');

            try {
                const payload = await generateDashboardPayload(interaction.client);
                let message;

                if (msgId) {
                    // Conversion Logic
                    try {
                        message = await targetChannel.messages.fetch(msgId);
                        
                        // Force conversion trick (Wipe -> Set Flag)
                        const loading = new ContainerBuilder().addTextDisplayComponents(
                            new TextDisplayBuilder().setContent('### 🔄 Syncing Dashboard...')
                        );
                        await message.edit({ 
                            content: '', embeds: [], components: [loading], 
                            flags: MessageFlags.IsComponentsV2 
                        });
                        
                        // Apply Final
                        await message.edit({ components: payload, flags: MessageFlags.IsComponentsV2 });
                    } catch (e) {
                        return interaction.editReply(`❌ Failed to convert message: ${e.message}`);
                    }
                } else {
                    // Send New
                    message = await targetChannel.send({ 
                        components: payload, 
                        flags: MessageFlags.IsComponentsV2 
                    });
                }

                // Save Location
                await DashboardLocation.findOneAndUpdate(
                    { guildId: interaction.guild.id },
                    { 
                        guildId: interaction.guild.id,
                        channelId: targetChannel.id,
                        messageId: message.id
                    },
                    { upsert: true, new: true }
                );

                interaction.editReply(`✅ **Dashboard Enabled!** Saved to ${targetChannel}. It will auto-update.`);

            } catch (e) {
                console.error(e);
                interaction.editReply(`❌ Error: ${e.message}`);
            }
        }

        // ==========================================
        // 2. ADD SERVER (MODAL)
        // ==========================================
        if (sub === 'addserver') {
            const modal = new ModalBuilder()
                .setCustomId('dashboard_add_server')
                .setTitle('Add Server to Dashboard');

            const idInput = new TextInputBuilder()
                .setCustomId('server_id')
                .setLabel("Server ID")
                .setPlaceholder("1456197054782111756")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const nameInput = new TextInputBuilder()
                .setCustomId('display_name')
                .setLabel("Display Name")
                .setPlaceholder("A2-Q Qahtani")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const tagInput = new TextInputBuilder()
                .setCustomId('tag_text')
                .setLabel("Tag Text (e.g. A2-Q)")
                .setStyle(TextInputStyle.Short)
                .setRequired(false);

            const roleInput = new TextInputBuilder()
                .setCustomId('role_id')
                .setLabel("Role ID (For Tagged Users)")
                .setStyle(TextInputStyle.Short)
                .setRequired(false);

            const inviteInput = new TextInputBuilder()
                .setCustomId('invite_link')
                .setLabel("Invite Link")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(idInput),
                new ActionRowBuilder().addComponents(nameInput),
                new ActionRowBuilder().addComponents(tagInput),
                new ActionRowBuilder().addComponents(roleInput),
                new ActionRowBuilder().addComponents(inviteInput)
            );

            await interaction.showModal(modal);
        }

        // ==========================================
        // 3. REMOVE SERVER (SELECT MENU)
        // ==========================================
        if (sub === 'removeserver') {
            await interaction.deferReply({ ephemeral: true });
            const servers = await TrackedServer.find();

            if (servers.length === 0) return interaction.editReply("❌ No servers to remove.");

            const options = servers.map(s => 
                new StringSelectMenuOptionBuilder()
                    .setLabel(s.displayName)
                    .setDescription(`ID: ${s.guildId}`)
                    .setValue(s.guildId)
            );

            const select = new StringSelectMenuBuilder()
                .setCustomId('dashboard_remove_server')
                .setPlaceholder('Select a server to remove')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(select);
            
            await interaction.editReply({ 
                content: "Select the server you want to remove from the dashboard:",
                components: [row] 
            });
        }
    }
};
