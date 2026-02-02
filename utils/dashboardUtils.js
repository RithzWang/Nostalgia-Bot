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

        // 2. GREET MESSAGE
        .addSubcommand(sub => 
            sub.setName('greetmessage')
                .setDescription('Configure welcome message for a server')
                .addBooleanOption(o => o.setName('enable').setDescription('Turn welcome ON or OFF').setRequired(true))
                .addChannelOption(o => o.setName('channel').setDescription('Which channel to send welcomes in?').setRequired(false))
                .addStringOption(o => o.setName('server_id').setDescription('(Optional) Target a specific Server ID remotely').setRequired(false))
        )

        // 3. TAG USER ROLE (MISSING IN YOUR CODE)
        .addSubcommand(sub => 
            sub.setName('tag_user_role')
                .setDescription('Set the LOCAL role given to users who wear the tag in this server')
                .addRoleOption(o => o.setName('role').setDescription('The role to give inside this server').setRequired(true))
                .addStringOption(o => o.setName('server_id').setDescription('(Optional) Target Server ID').setRequired(false))
        ),

    async execute(interaction) {
        // 🛑 SECURITY: LOCK TO OWNER
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ content: '⛔ **Owner Only**', flags: MessageFlags.Ephemeral });
        }

        const sub = interaction.options.getSubcommand();

        // ====================================================
        // 📝 1. ADD SERVER (MODAL)
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

        // ====================================================
        // 🏷️ 3. TAG USER ROLE (MISSING LOGIC RESTORED)
        // ====================================================
        if (sub === 'tag_user_role') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const role = interaction.options.getRole('role');
            const targetServerId = interaction.options.getString('server_id') || interaction.guild.id;

            try {
                const updatedServer = await TrackedServer.findOneAndUpdate(
                    { guildId: targetServerId },
                    { localRoleId: role.id },
                    { new: true }
                );

                if (!updatedServer) return interaction.editReply(`❌ **Error:** Server ID \`${targetServerId}\` not found.`);

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 🏷️ Local Tag Role Configured`))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `**Server:** ${updatedServer.displayName}\n` +
                        `**Local Role:** ${role} (\`${role.id}\`)\n`
                    ));

                return interaction.editReply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
            } catch (e) {
                return interaction.editReply(`❌ **Database Error:** ${e.message}`);
            }
        }

        // ====================================================
        // 👋 2. GREET MESSAGE
        // ====================================================
        if (sub === 'greetmessage') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const isEnabled = interaction.options.getBoolean('enable');
            const targetChannel = interaction.options.getChannel('channel');
            const targetServerId = interaction.options.getString('server_id') || interaction.guild.id; 

            if (isEnabled && !targetChannel) {
                return interaction.editReply("❌ **Error:** You must select a `channel` when enabling the system.");
            }

            try {
                const updateData = isEnabled ? { welcomeChannelId: targetChannel.id } : { welcomeChannelId: null };            
                const updatedServer = await TrackedServer.findOneAndUpdate(
                    { guildId: targetServerId },
                    updateData,
                    { new: true } 
                );

                if (!updatedServer) {
                    return interaction.editReply(`❌ **Error:** Server ID \`${targetServerId}\` is not in your database yet.`);
                }

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 👋 Welcome Configuration`))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `**Server:** ${updatedServer.displayName}\n` +
                        `**Status:** ${isEnabled ? '✅ Enabled' : '🚫 Disabled'}\n` +
                        (isEnabled ? `**Channel:** <#${targetChannel.id}>` : '')
                    ));

                return interaction.editReply({ components: [container], flags: [MessageFlags.IsComponentsV2] });

            } catch (e) {
                console.error(e);
                return interaction.editReply(`❌ **Database Error:** ${e.message}`);
            }
        }

        // ====================================================
        // 🟢 3. OTHER DASHBOARD COMMANDS
        // ====================================================
        
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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

        // ====================================================
        // ✅ 4. ENABLE (FIXED WITH IMMEDIATE UPDATE)
        // ====================================================
        if (sub === 'enable') {
             const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
             
             // 1. Save Location
             await DashboardLocation.findOneAndUpdate(
                 { guildId: interaction.guild.id }, 
                 { channelId: targetChannel.id }, 
                 { upsert: true }
             );

             // 2. TRIGGER IMMEDIATE UPDATE (This was missing!)
             await interaction.editReply(`✅ **Dashboard Enabled** in ${targetChannel}. Spawning message now...`);
             
             try {
                 await updateAllDashboards(interaction.client);
                 await interaction.followUp({ content: "✅ Dashboard Spawned!", flags: MessageFlags.Ephemeral });
             } catch (e) {
                 console.error(e);
                 await interaction.followUp({ content: `⚠️ Saved, but failed to spawn: ${e.message}`, flags: MessageFlags.Ephemeral });
             }
        }
    }
};
