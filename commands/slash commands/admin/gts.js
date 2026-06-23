const { 
    SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, 
    TextInputStyle, ActionRowBuilder, MessageFlags, ContainerBuilder, 
    TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, 
    StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
    LabelBuilder, RoleSelectMenuBuilder, ChannelSelectMenuBuilder 
} = require('discord.js');
const { GTSHub, GTSServer } = require('../../../src/models/GTS');

// --- SMART FORMATTERS ---
function formatRole(client, currentGuildId, targetGuildId, roleId) {
    if (!roleId) return "Not Setup";
    if (currentGuildId === targetGuildId) return `<@&${roleId}>`; 
    
    const targetGuild = client.guilds.cache.get(targetGuildId);
    const role = targetGuild?.roles.cache.get(roleId);
    return role ? `**${role.name}** (\`${roleId}\`)` : `**Unknown Role** (\`${roleId}\`)`;
}

function formatChannel(client, currentGuildId, channelId) {
    if (!channelId) return "Not Setup";
    
    const channel = client.channels.cache.get(channelId);
    if (channel && channel.guildId === currentGuildId) return `<#${channelId}>`; 
    return channel ? `**#${channel.name}** (\`${channelId}\`)` : `**Unknown Channel** (\`${channelId}\`)`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gts')
        .setDescription('Manage the Grouped Tags Stats (GTS) Ecosystem.')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => sub.setName('setup')
            .setDescription('Setup the Main Server.')
            .addStringOption(opt => opt.setName('main_server_id').setDescription('Main Server ID').setRequired(true))
            .addStringOption(opt => opt.setName('invite_link').setDescription('Invite Link').setRequired(true))
            .addStringOption(opt => opt.setName('message_id').setDescription('Message ID to edit (Optional)').setRequired(false))
            .addChannelOption(opt => opt.setName('channel').setDescription('Dashboard Channel (Optional)').setRequired(false))
        )
        .addSubcommand(sub => sub.setName('addserver')
            .setDescription('Add a satellite server.')
            .addStringOption(opt => opt.setName('server_id').setDescription('Server ID').setRequired(true))
            .addStringOption(opt => opt.setName('invite_link').setDescription('Invite Link').setRequired(false))
        )
        .addSubcommand(sub => sub.setName('removeserver')
            .setDescription('Remove a satellite server from the network and database.')
            .addStringOption(opt => opt.setName('server_id').setDescription('Server ID to remove').setRequired(true))
        )
        .addSubcommand(sub => sub.setName('view-server')
            .setDescription('View/Edit a specific server.')
            .addStringOption(opt => opt.setName('server_id').setDescription('Server ID').setRequired(true))
        )
        .addSubcommand(sub => sub.setName('dashboard')
            .setDescription('View the global GTS dashboard settings.')
        )
        .addSubcommand(sub => sub.setName('tags-stats')
            .setDescription('Deploy the tags statistics dashboard in a satellite server.')
            .addStringOption(opt => opt.setName('message_id').setDescription('Message ID to edit (Optional)').setRequired(false))
            .addChannelOption(opt => opt.setName('channel').setDescription('Dashboard Channel (Optional)').setRequired(false))
        )
        .addSubcommand(sub => sub.setName('default-ta-role')
            .setDescription('Set the default Tag Adopters role.')
            .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
        )
        .addSubcommand(sub => sub.setName('alert-channel') 
            .setDescription('Set the global alert channel for the GTS Gatekeeper.')
            .addChannelOption(opt => opt.setName('channel').setDescription('Alert Channel').setRequired(true))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const hub = await GTSHub.findOne();

        // ====================================================
        // 🛡️ GLOBAL SECURITY GUARD
        // ====================================================
        if (hub && interaction.guildId !== hub.mainServerId) {
            if (sub !== 'tags-stats') {
                return interaction.reply({ 
                    content: "❌ **Security Block:** For network integrity, GTS configuration commands can only be executed inside the **Main Hub Server**.", 
                    flags: [MessageFlags.Ephemeral] 
                });
            }
        }

        // ====================================================
        // 1. SETUP MAIN SERVER
        // ====================================================
        if (sub === 'setup') {
            const mainId = interaction.options.getString('main_server_id');
            const invite = interaction.options.getString('invite_link');
            const msgId = interaction.options.getString('message_id');
            const channel = interaction.options.getChannel('channel');

            const existingSatellite = await GTSServer.findOne({ serverId: mainId });
            const existingHub = await GTSHub.findOne({ mainServerId: mainId });

            if (existingSatellite && !existingHub) return interaction.reply({ content: "❌ **Security Block:** Already a Satellite Server!", flags: [MessageFlags.Ephemeral] });

            const hubUpdateFields = { mainServerId: mainId };
            if (channel) hubUpdateFields.dashboardChannelId = channel.id;
            if (msgId) hubUpdateFields.dashboardMessageId = msgId;

            await GTSHub.findOneAndUpdate({ mainServerId: mainId }, hubUpdateFields, { upsert: true });
            await GTSServer.findOneAndUpdate({ serverId: mainId }, { inviteLink: invite }, { upsert: true });

            const modal = new ModalBuilder().setCustomId(`gts_setup_modal_${mainId}`).setTitle('Main Server Setup');
            const tagTextLabel = new LabelBuilder().setLabel("Server Tag Text").setDescription("The exact text for the tag.").setTextInputComponent(new TextInputBuilder().setCustomId('tag_text').setStyle(TextInputStyle.Short).setRequired(true));
            const roleLabel = new LabelBuilder().setLabel("Tag Adopter Role").setDescription("Role given to users adopting the tag").setRoleSelectMenuComponent(new RoleSelectMenuBuilder().setCustomId('tag_role').setRequired(false));
            const channelLabel = new LabelBuilder().setLabel("Log Channel").setDescription("Channel to log tag adoptions").setChannelSelectMenuComponent(new ChannelSelectMenuBuilder().setCustomId('log_channel').setRequired(false));

            modal.addLabelComponents(tagTextLabel, roleLabel, channelLabel);
            return interaction.showModal(modal);
        }

        // ====================================================
        // 2. ADD SATELLITE SERVER
        // ====================================================
        if (sub === 'addserver') {
            const srvId = interaction.options.getString('server_id');
            const invite = interaction.options.getString('invite_link');

            const existingHubCheck = await GTSHub.findOne({ mainServerId: srvId });
            if (existingHubCheck) return interaction.reply({ content: "❌ **Security Block:** Already registered as a Main Server!", flags: [MessageFlags.Ephemeral] });

            const existingSatellite = await GTSServer.findOne({ serverId: srvId });
            if (existingSatellite) return interaction.reply({ content: "❌ **Security Block:** Already grouped in the network!", flags: [MessageFlags.Ephemeral] });

            await GTSServer.findOneAndUpdate({ serverId: srvId }, { inviteLink: invite }, { upsert: true });

            // ✅ NEW: Layout for Add Server Modal
            const modal = new ModalBuilder()
                .setCustomId(`gts_addserver_modal_${srvId}`)
                .setTitle('Configure Server Tags');

            const textLabel = new LabelBuilder()
                .setLabel("Server Tag Text")
                .setTextInputComponent(new TextInputBuilder().setCustomId('tag_text').setStyle(TextInputStyle.Short).setRequired(true));

            const badgeLabel = new LabelBuilder()
                .setLabel("Server Tag Badge Pack")
                .setStringSelectMenuComponent(
                    new StringSelectMenuBuilder()
                        .setCustomId('badge_pack')
                        .setPlaceholder('Select a badge pack (Default if skipped)...')
                        .addOptions(
                            new StringSelectMenuOptionBuilder().setLabel("Default Badge Pack").setValue("default"),
                            new StringSelectMenuOptionBuilder().setLabel("Creepy Crawlies Badge Packs").setDescription("2 Boosts").setValue("creepy_crawlies"),
                            new StringSelectMenuOptionBuilder().setLabel("Pet Badge Pack").setDescription("3 Boosts").setValue("pet"),
                            new StringSelectMenuOptionBuilder().setLabel("Plant Badge Pack").setDescription("3 Boosts").setValue("plant"),
                            new StringSelectMenuOptionBuilder().setLabel("Flex Badge Pack").setDescription("5 Boosts").setValue("flex")
                        )
                );

            modal.addLabelComponents(textLabel, badgeLabel);
            return interaction.showModal(modal);
        }

        // ====================================================
        // 3. REMOVE SATELLITE SERVER 
        // ====================================================
        if (sub === 'removeserver') {
            const srvId = interaction.options.getString('server_id');

            if (hub && hub.mainServerId === srvId) {
                return interaction.reply({ 
                    content: "❌ **Security Block:** You cannot delete the Main Server with this command. To wipe the network, you must drop the database manually.", 
                    flags: [MessageFlags.Ephemeral] 
                });
            }

            const deletedServer = await GTSServer.findOneAndDelete({ serverId: srvId });

            if (!deletedServer) {
                return interaction.reply({ 
                    content: `❌ **Error:** Server ID \`${srvId}\` is not currently registered in the database.`, 
                    flags: [MessageFlags.Ephemeral] 
                });
            }

            await interaction.reply({ 
                content: `✅ Successfully removed server \`${srvId}\` from the GTS ecosystem. Forcing dashboard update now...`, 
                flags: [MessageFlags.Ephemeral] 
            });

            // Instantly wipe it from the dashboards
            const { updateGTSDashboard } = require('../../../utils/gtsManager');
            await updateGTSDashboard(interaction.client);
            return;
        }

        // ====================================================
        // 4. SATELLITE TAGS STATS DASHBOARD
        // ====================================================
        if (sub === 'tags-stats') {
            const currentGuildId = interaction.guildId;
            const msgId = interaction.options.getString('message_id');
            const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

            const srvData = await GTSServer.findOne({ serverId: currentGuildId });
            if (!srvData) return interaction.reply({ content: "❌ **Error:** Not registered in the GTS network.", flags: [MessageFlags.Ephemeral] });

            srvData.localDashboardChannelId = targetChannel.id;
            if (msgId) srvData.localDashboardMessageId = msgId;
            await srvData.save();

            await interaction.reply({ content: "⏳ Deploying and rendering the Server Tags Stats Container...", flags: [MessageFlags.Ephemeral] });

            const { updateGTSDashboard } = require('../../../utils/gtsManager');
            return updateGTSDashboard(interaction.client);
        }

        // ====================================================
        // 5. VIEW SERVER 
        // ====================================================
        if (sub === 'view-server') {
            const srvId = interaction.options.getString('server_id');
            const srvData = await GTSServer.findOne({ serverId: srvId });
            if (!srvData) return interaction.reply({ content: "Server not found in DB.", flags: [MessageFlags.Ephemeral] });

            const guild = interaction.client.guilds.cache.get(srvId);
            const srvName = guild ? guild.name : "Unknown Server";
            const mainGuildId = hub ? hub.mainServerId : null;

            const mainRoleStr = formatRole(interaction.client, interaction.guildId, mainGuildId, srvData.mainTagRole);
            const localRoleStr = formatRole(interaction.client, interaction.guildId, srvId, srvData.localTagRole);
            const mainLogStr = formatChannel(interaction.client, interaction.guildId, srvData.mainLogChannel);
            const localLogStr = formatChannel(interaction.client, interaction.guildId, srvData.localLogChannel);
            const greetStr = formatChannel(interaction.client, interaction.guildId, srvData.greetChannel); 
            
            const badgePackStr = srvData.tagBadgePack === 'creepy_crawlies' ? "Creepy Crawlies Badge Packs (2 Boosts)" :
                                 srvData.tagBadgePack === 'pet' ? "Pet Badge Pack (3 Boosts)" :
                                 srvData.tagBadgePack === 'plant' ? "Plant Badge Pack (3 Boosts)" :
                                 srvData.tagBadgePack === 'flex' ? "Flex Badge Pack (5 Boosts)" : "Default Badge Pack";

            const hasMainRole = !!srvData.mainTagRole;
            const hasMainLog = !!srvData.mainLogChannel;
            const hasLocalRole = !!srvData.localTagRole;
            const hasLocalLog = !!srvData.localLogChannel;
            const hasGreetChannel = !!srvData.greetChannel; 

            const menuOptions = [
                new StringSelectMenuOptionBuilder().setLabel("Edit Invite Link").setValue("edit_invite").setEmoji("✏️"),
                new StringSelectMenuOptionBuilder().setLabel("Edit Server Tag Text").setValue("edit_tag").setEmoji("✏️"),
                new StringSelectMenuOptionBuilder().setLabel("Edit Tag Badge Pack").setValue("edit_badge_pack").setEmoji("🏅")
            ];

            if (!hasMainRole) menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Set Adopters Role (Main)").setValue("set_main_role").setEmoji("⚙️"));
            else menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Edit Adopters Role (Main)").setValue("edit_main_role").setEmoji("✏️"), new StringSelectMenuOptionBuilder().setLabel("Remove Adopters Role (Main)").setValue("remove_main_role").setEmoji("🗑️"));

            if (!hasMainLog) menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Set Log Channel (Main)").setValue("set_main_log").setEmoji("⚙️"));
            else menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Edit Log Channel (Main)").setValue("edit_main_log").setEmoji("✏️"), new StringSelectMenuOptionBuilder().setLabel("Remove Log Channel (Main)").setValue("remove_main_log").setEmoji("🗑️"));

            if (!hasLocalRole) menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Set Local Adopters Role").setValue("set_local_role").setEmoji("⚙️"));
            else menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Edit Local Adopters Role").setValue("edit_local_role").setEmoji("✏️"), new StringSelectMenuOptionBuilder().setLabel("Remove Local Adopters Role").setValue("remove_local_role").setEmoji("🗑️"));

            if (!hasLocalLog) menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Set Local Log Channel").setValue("set_local_log").setEmoji("⚙️"));
            else menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Edit Local Log Channel").setValue("edit_local_log").setEmoji("✏️"), new StringSelectMenuOptionBuilder().setLabel("Remove Local Log Channel").setValue("remove_local_log").setEmoji("🗑️"));

            if (!hasGreetChannel) menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Set Greet Channel").setValue("set_greet").setEmoji("⚙️"));
            else menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Edit Greet Channel").setValue("edit_greet").setEmoji("✏️"), new StringSelectMenuOptionBuilder().setLabel("Remove Greet Channel").setValue("remove_greet").setEmoji("🗑️"));

            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${srvName}`))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**Invite Link:** \`${srvData.inviteLink || "None"}\`\n` +
                    `**Server Tag Text:** \`${srvData.tagText || "None"}\`\n` +
                    `**Server Tag Badge Pack:** **${badgePackStr}**\n` +
                    `**Adopters Role:** ${mainRoleStr}\n` +
                    `**Tag Adopted/Removed Log Channel:** ${mainLogStr}\n` +
                    `**Local Adopters Role:** ${localRoleStr}\n` +
                    `**Local Log Channel:** ${localLogStr}\n` +
                    `**Greet Channel:** ${greetStr}`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addActionRowComponents(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`gts_edit_menu_${srvId}`).addOptions(menuOptions)));

            return interaction.reply({ components: [container], flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral] });
        }

        // ====================================================
        // 6. DASHBOARD GLOBALS 
        // ====================================================
        if (sub === 'dashboard') {
            if (!hub) return interaction.reply({ content: "Hub not setup. Run `/gts setup` first.", flags: [MessageFlags.Ephemeral] });
            const guild = interaction.client.guilds.cache.get(hub.mainServerId);

            const defaultRoleStr = formatRole(interaction.client, interaction.guildId, hub.mainServerId, hub.defaultTagRole);
            const alertChannelStr = formatChannel(interaction.client, interaction.guildId, hub.alertChannelId);
            
            const hasDefaultRole = !!hub.defaultTagRole;
            const hasAlertChannel = !!hub.alertChannelId;

            const menuOptions = [new StringSelectMenuOptionBuilder().setLabel("Edit Server Stats Message").setValue("edit_msg").setEmoji("✏️")];

            if (!hasDefaultRole) {
                menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Set Default Tag Adopters Role").setValue("set_default_role").setEmoji("⚙️"));
            } else {
                menuOptions.push(
                    new StringSelectMenuOptionBuilder().setLabel("Edit Default Tag Adopters Role").setValue("edit_default_role").setEmoji("✏️"), 
                    new StringSelectMenuOptionBuilder().setLabel("Remove Default Tag Adopters Role").setValue("remove_default_role").setEmoji("🗑️")
                );
            }

            if (!hasAlertChannel) {
                menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Set Alert Channel").setValue("set_alert").setEmoji("⚙️"));
            } else {
                menuOptions.push(
                    new StringSelectMenuOptionBuilder().setLabel("Edit Alert Channel").setValue("edit_alert").setEmoji("✏️"),
                    new StringSelectMenuOptionBuilder().setLabel("Remove Alert Channel").setValue("remove_alert").setEmoji("🗑️")
                );
            }

            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${guild ? guild.name : "Hub Server"}`))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**Message ID:** \`${hub.dashboardMessageId || "None"}\`\n` +
                    `**Default Tag Adopters Role:** ${defaultRoleStr}\n` +
                    `**Alert Channel:** ${alertChannelStr}` 
                ))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addActionRowComponents(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId("gts_hub_menu").addOptions(menuOptions)));

            return interaction.reply({ components: [container], flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral] });
        }

        // ====================================================
        // 7. SINGLE COMMAND SETTERS
        // ====================================================
        if (sub === 'default-ta-role') {
            const role = interaction.options.getRole('role');
            await GTSHub.findOneAndUpdate({}, { defaultTagRole: role.id });
            return interaction.reply({ content: `✅ Default Tag Adopter role set to ${role}.`, flags: [MessageFlags.Ephemeral] });
        }

        if (sub === 'alert-channel') {
            const channel = interaction.options.getChannel('channel');
            await GTSHub.findOneAndUpdate({}, { alertChannelId: channel.id });
            return interaction.reply({ content: `✅ Global Alert Channel set to ${channel}.`, flags: [MessageFlags.Ephemeral] });
        }
    }
};
