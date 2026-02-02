const { 
    SlashCommandBuilder, PermissionFlagsBits, MessageFlags, 
    ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
    StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ContainerBuilder, TextDisplayBuilder,
    SeparatorBuilder, SeparatorSpacingSize
} = require('discord.js');

const TrackedServer = require('../../../src/models/TrackedServerSchema');
const DashboardLocation = require('../../../src/models/DashboardLocationSchema');
const { updateAllDashboards } = require('../../../utils/dashboardUtils');

// 🔒 OWNER CONFIGURATION
const OWNER_ID = '837741275603009626';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('our-servers')
        .setDescription('Manage the A2-Q Server Network')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        
        // 1. DASHBOARD CONTROLS
        .addSubcommand(sub => sub.setName('enable').setDescription('Enable dashboard here').addStringOption(o=>o.setName('message_id').setDescription('Msg ID')).addChannelOption(o=>o.setName('channel').setDescription('Channel')))
        .addSubcommand(sub => sub.setName('update').setDescription('Force update all dashboards'))
        .addSubcommand(sub => sub.setName('addserver').setDescription('Add a new server to database'))
        .addSubcommand(sub => sub.setName('removeserver').setDescription('Remove a server from database'))
        .addSubcommand(sub => sub.setName('edit').setDescription('Edit a server details'))

        // 2. WELCOME / GREET MESSAGE
        .addSubcommand(sub => 
            sub.setName('greetmessage')
                .setDescription('Configure welcome message')
                .addBooleanOption(o => o.setName('enable').setDescription('Turn welcome ON or OFF').setRequired(true))
                .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(false))
                .addStringOption(o => o.setName('server_id').setDescription('(Optional) Target Server ID').setRequired(false))
        )

        // 3. TAG USER ROLE (LOCAL) 👈 UPDATED LOGIC
        .addSubcommand(sub => 
            sub.setName('tag_user_role')
                .setDescription('Set the LOCAL role given inside THIS server')
                .addRoleOption(o => o.setName('role').setDescription('The role to give inside this server').setRequired(true))
                .addStringOption(o => o.setName('server_id').setDescription('(Optional) Target Server ID').setRequired(false))
        ),

    async execute(interaction) {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ content: '⛔ **Owner Only**', flags: MessageFlags.Ephemeral });
        }

        const sub = interaction.options.getSubcommand();

        // ====================================================
        // 🏷️ 3. TAG USER ROLE (SAVES TO localRoleId)
        // ====================================================
        if (sub === 'tag_user_role') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const role = interaction.options.getRole('role');
            // Default to current guild ID if not specified
            const targetServerId = interaction.options.getString('server_id') || interaction.guild.id;

            try {
                // Save to localRoleId (NOT roleId)
                const updatedServer = await TrackedServer.findOneAndUpdate(
                    { guildId: targetServerId },
                    { localRoleId: role.id }, // 👈 Saving to the new field
                    { new: true }
                );

                if (!updatedServer) {
                    return interaction.editReply(`❌ **Error:** Server ID \`${targetServerId}\` is not in your database yet.`);
                }

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 🏷️ Local Tag Role Configured`))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `**Server:** ${updatedServer.displayName}\n` +
                        `**Local Role:** ${role} (\`${role.id}\`)\n` +
                        `Users in **${updatedServer.displayName}** who wear the tag will get this role.`
                    ));

                return interaction.editReply({ components: [container], flags: [MessageFlags.IsComponentsV2] });

            } catch (e) {
                console.error(e);
                return interaction.editReply(`❌ **Database Error:** ${e.message}`);
            }
        }

        // ... (The rest of your command: greetmessage, addserver, etc. stays exactly the same) ...
        // I've omitted the rest for brevity, but keep your existing code for other subcommands.
        
        // ====================================================
        // 👋 2. GREET MESSAGE
        // ====================================================
        if (sub === 'greetmessage') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const isEnabled = interaction.options.getBoolean('enable');
            const targetChannel = interaction.options.getChannel('channel');
            const targetServerId = interaction.options.getString('server_id') || interaction.guild.id; 

            if (isEnabled && !targetChannel) return interaction.editReply("❌ **Error:** Select a channel.");

            try {
                const updateData = isEnabled ? { welcomeChannelId: targetChannel.id } : { welcomeChannelId: null };            
                const updatedServer = await TrackedServer.findOneAndUpdate({ guildId: targetServerId }, updateData, { new: true });
                if (!updatedServer) return interaction.editReply(`❌ **Error:** Server ID not found.`);

                return interaction.editReply({ content: `✅ **Welcome Config Updated:** ${updatedServer.displayName}`, flags: MessageFlags.Ephemeral });
            } catch (e) {
                return interaction.editReply(`❌ Error: ${e.message}`);
            }
        }

        // ====================================================
        // 📝 1. ADD SERVER & DASHBOARD (Standard Logic)
        // ====================================================
        if (sub === 'addserver') {
            const modal = new ModalBuilder().setCustomId('dashboard_add_server').setTitle('Add New Server');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('server_id').setLabel("Server ID").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('display_name').setLabel("Display Name").setStyle(TextInputStyle.Short).setPlaceholder("e.g. My Server").setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('tag_text').setLabel("Tag Text").setStyle(TextInputStyle.Short).setPlaceholder("e.g. ABC").setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('role_id').setLabel("Tag User Role ID (Main)").setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('invite_link').setLabel("Invite Link").setStyle(TextInputStyle.Short).setRequired(true))
            );
            return interaction.showModal(modal);
        }

        // (Include existing edit/remove/enable logic here...)
        if (sub === 'edit') { /* ... */ }
        if (sub === 'removeserver') { /* ... */ }
        if (sub === 'update') { updateAllDashboards(interaction.client); return interaction.reply({ content: "✅ Updated", flags: MessageFlags.Ephemeral }); }
        if (sub === 'enable') { /* ... */ }
    }
};
