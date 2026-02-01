const { 
    SlashCommandBuilder, PermissionFlagsBits, MessageFlags, 
    ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
    StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ContainerBuilder, TextDisplayBuilder
} = require('discord.js');

const TrackedServer = require('../../../src/models/TrackedServerSchema');
const DashboardLocation = require('../../../src/models/DashboardLocationSchema');
const { generateDashboardPayload, updateAllDashboards } = require('../../../utils/dashboardUtils');

const OWNER_ID = '837741275603009626'; // 🔒 Bot Owner ID

module.exports = {
    data: new SlashCommandBuilder()
        .setName('our-servers')
        .setDescription('Manage the A2-Q Server Dashboard')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        
        // 1. ENABLE
        .addSubcommand(sub => 
            sub.setName('enable')
                .setDescription('Create or link a dashboard message here')
                .addStringOption(opt => opt.setName('message_id').setDescription('Optional: Convert existing text message'))
                .addChannelOption(opt => opt.setName('channel').setDescription('Optional: Target channel')))
        
        // 2. ADD SERVER (Triggers Modal)
        .addSubcommand(sub => 
            sub.setName('addserver')
                .setDescription('Add a new server to the global list'))
        
        // 3. REMOVE SERVER
        .addSubcommand(sub => 
            sub.setName('removeserver')
                .setDescription('Remove a server from the global list'))

        // 4. EDIT SERVER
        .addSubcommand(sub => 
            sub.setName('edit')
                .setDescription('Edit details of an existing server'))

        // 5. MANUAL UPDATE
        .addSubcommand(sub => 
            sub.setName('update')
                .setDescription('Force update all dashboards immediately')),

    async execute(interaction) {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ content: '⛔ **Access Denied**', flags: MessageFlags.Ephemeral });
        }

        const sub = interaction.options.getSubcommand();

        // ====================================================
        // 📝 ADD SERVER (MODAL)
        // ====================================================
        if (sub === 'addserver') {
            const modal = new ModalBuilder()
                .setCustomId('dashboard_add_server')
                .setTitle('Add New Server');

            // 1. Server ID
            const serverIdInput = new TextInputBuilder()
                .setCustomId('server_id')
                .setLabel("Server ID")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("e.g. 123456789...")
                .setRequired(true);

            // 2. Display Name
            const nameInput = new TextInputBuilder()
                .setCustomId('display_name')
                .setLabel("Display Name")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("e.g. My Awesome Server")
                .setRequired(true);

            // 3. Tag Text
            const tagInput = new TextInputBuilder()
                .setCustomId('tag_text')
                .setLabel("Tag Text (Display Only)")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("e.g. ABC")
                .setRequired(false);

            // 4. Tag User Role ID (THE NEW FIELD)
            const roleInput = new TextInputBuilder()
                .setCustomId('role_id')
                .setLabel("Tag User Role ID")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("Paste Role ID Here (Main Server Role)")
                .setRequired(false);

            // 5. Invite Link
            const inviteInput = new TextInputBuilder()
                .setCustomId('invite_link')
                .setLabel("Invite Link")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("https://discord.gg/...")
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(serverIdInput),
                new ActionRowBuilder().addComponents(nameInput),
                new ActionRowBuilder().addComponents(tagInput),
                new ActionRowBuilder().addComponents(roleInput),
                new ActionRowBuilder().addComponents(inviteInput)
            );

            return interaction.showModal(modal);
        }

        // ====================================================
        // 🟢 OTHER COMMANDS
        // ====================================================
        await interaction.deferReply({ ephemeral: true });

        if (sub === 'edit') {
            const servers = await TrackedServer.find();
            if (servers.length === 0) return interaction.editReply("❌ No servers found.");

            const options = servers.map(s => new StringSelectMenuOptionBuilder().setLabel(s.displayName).setDescription(`ID: ${s.guildId}`).setValue(s.guildId));
            const select = new StringSelectMenuBuilder().setCustomId('dashboard_edit_select').setPlaceholder('Pick a server...').addOptions(options);
            return interaction.editReply({ content: "📋 **Select server to edit:**", components: [new ActionRowBuilder().addComponents(select)] });
        }

        if (sub === 'removeserver') {
            const servers = await TrackedServer.find();
            if (servers.length === 0) return interaction.editReply("❌ No servers found.");
            const options = servers.map(s => new StringSelectMenuOptionBuilder().setLabel(s.displayName).setValue(s.guildId));
            const select = new StringSelectMenuBuilder().setCustomId('dashboard_remove_server').setPlaceholder('Select to remove').addOptions(options);
            return interaction.editReply({ content: "🗑️ **Select server to remove:**", components: [new ActionRowBuilder().addComponents(select)] });
        }

        if (sub === 'enable') {
            // ... (Same logic as before for enable) ...
            // Keeping it brief here, use previous enable logic
             const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
             await DashboardLocation.findOneAndUpdate({ guildId: interaction.guild.id }, { channelId: targetChannel.id }, { upsert: true });
             interaction.editReply(`✅ **Dashboard Enabled** in ${targetChannel}`);
        }

        if (sub === 'update') {
            await updateAllDashboards(interaction.client);
            return interaction.editReply("✅ **Dashboards Updated!**");
        }
    }
};
