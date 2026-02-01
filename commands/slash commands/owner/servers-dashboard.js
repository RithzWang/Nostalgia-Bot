const { 
    SlashCommandBuilder, PermissionFlagsBits, MessageFlags, 
    ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
    StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ContainerBuilder, TextDisplayBuilder
} = require('discord.js');

const TrackedServer = require('../../../src/models/TrackedServerSchema');
const DashboardLocation = require('../../../src/models/DashboardLocationSchema');
const { updateAllDashboards } = require('../../../utils/dashboardUtils');

const OWNER_ID = '837741275603009626';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('our-servers')
        .setDescription('Manage the A2-Q Server Dashboard')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => sub.setName('enable').setDescription('Enable dashboard').addStringOption(o=>o.setName('message_id').setDescription('Msg ID')).addChannelOption(o=>o.setName('channel').setDescription('Channel')))
        .addSubcommand(sub => sub.setName('addserver').setDescription('Add a new server'))
        .addSubcommand(sub => sub.setName('removeserver').setDescription('Remove a server'))
        .addSubcommand(sub => sub.setName('edit').setDescription('Edit a server'))
        .addSubcommand(sub => sub.setName('update').setDescription('Force update')),

    async execute(interaction) {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ content: '⛔ **Owner Only**', flags: MessageFlags.Ephemeral });
        }

        const sub = interaction.options.getSubcommand();

        // ====================================================
        // 📝 ADD SERVER (MODAL)
        // ====================================================
        if (sub === 'addserver') {
            const modal = new ModalBuilder().setCustomId('dashboard_add_server').setTitle('Add New Server');

            // 1. Server ID
            const serverId = new TextInputBuilder().setCustomId('server_id').setLabel("Server ID").setStyle(TextInputStyle.Short).setRequired(true);
            
            // 2. Display Name (We have space for it now!)
            const nameInput = new TextInputBuilder().setCustomId('display_name').setLabel("Display Name").setStyle(TextInputStyle.Short).setPlaceholder("e.g. My Server").setRequired(true);

            // 3. Tag Text
            const tagInput = new TextInputBuilder().setCustomId('tag_text').setLabel("Tag Text").setStyle(TextInputStyle.Short).setPlaceholder("e.g. ABC").setRequired(false);

            // 4. ROLES (COMBINED) 👈
            const rolesInput = new TextInputBuilder()
                .setCustomId('role_ids')
                .setLabel("Tag Roles (Main ID, Local ID)")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("e.g. 111111, 222222") // User types both here separated by comma
                .setRequired(false);

            // 5. Invite Link
            const inviteInput = new TextInputBuilder().setCustomId('invite_link').setLabel("Invite Link").setStyle(TextInputStyle.Short).setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(serverId),
                new ActionRowBuilder().addComponents(nameInput),
                new ActionRowBuilder().addComponents(tagInput),
                new ActionRowBuilder().addComponents(rolesInput),
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
            const options = servers.map(s => new StringSelectMenuOptionBuilder().setLabel(s.displayName).setDescription(s.guildId).setValue(s.guildId));
            const select = new StringSelectMenuBuilder().setCustomId('dashboard_edit_select').setPlaceholder('Select server to edit...').addOptions(options);
            return interaction.editReply({ content: "📋 **Edit Server:**", components: [new ActionRowBuilder().addComponents(select)] });
        }

        if (sub === 'removeserver') {
            const servers = await TrackedServer.find();
            if (servers.length === 0) return interaction.editReply("❌ No servers found.");
            const options = servers.map(s => new StringSelectMenuOptionBuilder().setLabel(s.displayName).setValue(s.guildId));
            const select = new StringSelectMenuBuilder().setCustomId('dashboard_remove_server').setPlaceholder('Select to remove').addOptions(options);
            return interaction.editReply({ content: "🗑️ **Remove Server:**", components: [new ActionRowBuilder().addComponents(select)] });
        }

        if (sub === 'update') {
            await updateAllDashboards(interaction.client);
            return interaction.editReply("✅ **Dashboards Updated!**");
        }

        if (sub === 'enable') {
             const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
             await DashboardLocation.findOneAndUpdate({ guildId: interaction.guild.id }, { channelId: targetChannel.id }, { upsert: true });
             interaction.editReply(`✅ **Dashboard Enabled** in ${targetChannel}`);
        }
    }
};
