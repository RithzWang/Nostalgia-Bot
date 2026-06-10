const { 
    SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, 
    TextInputStyle, ActionRowBuilder, MessageFlags, ContainerBuilder, 
    TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, 
    StringSelectMenuBuilder, StringSelectMenuOptionBuilder 
} = require('discord.js');
const { GTSHub, GTSServer } = require('../../../src/models/GTS');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gts')
        .setDescription('Manage the Grouped Tags Stats (GTS) Ecosystem.')
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
        .addSubcommand(sub => sub.setName('view-server')
            .setDescription('View/Edit a specific server.')
            .addStringOption(opt => opt.setName('server_id').setDescription('Server ID').setRequired(true))
        )
        .addSubcommand(sub => sub.setName('dashboard')
            .setDescription('View the global GTS dashboard settings.')
        )
        .addSubcommand(sub => sub.setName('default-ta-role')
            .setDescription('Set the default Tag Adopters role.')
            .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
        )
        .addSubcommand(sub => sub.setName('join-main-required')
            .setDescription('Toggle Main Server requirement.')
            .addBooleanOption(opt => opt.setName('status').setDescription('Enable?').setRequired(true))
        )
        .addSubcommand(sub => sub.setName('greet-message')
            .setDescription('Set a greet channel for a server.')
            .addStringOption(opt => opt.setName('server_id').setDescription('Server ID').setRequired(true))
            .addChannelOption(opt => opt.setName('channel').setDescription('Greet Channel').setRequired(true))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        // ====================================================
        // 1. SETUP MAIN SERVER
        // ====================================================
        if (sub === 'setup') {
            const mainId = interaction.options.getString('main_server_id');
            const invite = interaction.options.getString('invite_link');
            const msgId = interaction.options.getString('message_id');
            const channel = interaction.options.getChannel('channel');

            // 🛡️ GUARD: Cannot register as Main if it's already a Satellite!
            const existingSatellite = await GTSServer.findOne({ serverId: mainId });
            const existingHub = await GTSHub.findOne({ mainServerId: mainId });

            if (existingSatellite && !existingHub) {
                return interaction.reply({ 
                    content: "❌ **Security Block:** This server is already grouped as a Satellite Server! You cannot register it as a Main Server.", 
                    flags: [MessageFlags.Ephemeral] 
                });
            }

            // Build the database update object dynamically
            const hubUpdateFields = { mainServerId: mainId };
            if (channel) hubUpdateFields.dashboardChannelId = channel.id;
            if (msgId) hubUpdateFields.dashboardMessageId = msgId;

            // Save Hub Config
            await GTSHub.findOneAndUpdate({ mainServerId: mainId }, hubUpdateFields, { upsert: true });
            await GTSServer.findOneAndUpdate({ serverId: mainId }, { inviteLink: invite }, { upsert: true });

            // Pop open the Modal Form
            const modal = new ModalBuilder().setCustomId(`gts_setup_modal_${mainId}`).setTitle('Main Server Setup');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('tag_text').setLabel("Server Tag Text").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('tag_role').setLabel("Tag Adopter Role ID").setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('log_channel').setLabel("Log Channel ID").setStyle(TextInputStyle.Short).setRequired(false))
            );
            
            return interaction.showModal(modal);
        }

        // ====================================================
        // 2. ADD SATELLITE SERVER
        // ====================================================
        if (sub === 'addserver') {
            const srvId = interaction.options.getString('server_id');
            const invite = interaction.options.getString('invite_link');

            // 🛡️ GUARD 1: Main server aren't allowed to group as satellite server
            const existingHub = await GTSHub.findOne({ mainServerId: srvId });
            if (existingHub) {
                return interaction.reply({ 
                    content: "❌ **Security Block:** This server is already registered as a Main Server! It cannot be added as a satellite.", 
                    flags: [MessageFlags.Ephemeral] 
                });
            }

            // 🛡️ GUARD 2: Cannot group with other main servers if already grouped
            const existingSatellite = await GTSServer.findOne({ serverId: srvId });
            if (existingSatellite) {
                return interaction.reply({ 
                    content: "❌ **Security Block:** This server is already grouped in the network! Use `/gts view-server` to edit it instead.", 
                    flags: [MessageFlags.Ephemeral] 
                });
            }

            // Only save basic data once the guards are passed
            await GTSServer.findOneAndUpdate({ serverId: srvId }, { inviteLink: invite }, { upsert: true });

            const modal = new ModalBuilder().setCustomId(`gts_add_modal_${srvId}`).setTitle('Satellite Server Setup');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('tag_text').setLabel("Server Tag Text").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('main_tag_role').setLabel("Tag Role ID (In Main Server)").setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('main_log_channel').setLabel("Log Channel ID (In Main)").setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('local_tag_role').setLabel("Local Tag Role ID").setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('local_log_channel').setLabel("Local Log Channel ID").setStyle(TextInputStyle.Short).setRequired(false))
            );
            return interaction.showModal(modal);
        }

        // ====================================================
        // 3. VIEW SERVER (Dynamic Menu)
        // ====================================================
        if (sub === 'view-server') {
            const srvId = interaction.options.getString('server_id');
            const srvData = await GTSServer.findOne({ serverId: srvId });
            if (!srvData) return interaction.reply({ content: "Server not found in DB. Add it first using `/gts addserver`.", flags: [MessageFlags.Ephemeral] });

            const guild = interaction.client.guilds.cache.get(srvId);
            const srvName = guild ? guild.name : "Unknown Server";

            // Check current states
            const hasMainRole = !!srvData.mainTagRole;
            const hasMainLog = !!srvData.mainLogChannel;
            const hasLocalRole = !!srvData.localTagRole;
            const hasLocalLog = !!srvData.localLogChannel;

            // Build dynamic options array
            const menuOptions = [
                new StringSelectMenuOptionBuilder().setLabel("Edit Invite Link").setValue("edit_invite").setEmoji("✏️"),
                new StringSelectMenuOptionBuilder().setLabel("Edit Server Tag Text").setValue("edit_tag").setEmoji("✏️")
            ];

            // 1. Main Adopters Role
            if (!hasMainRole) {
                menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Set Adopters Role (Main)").setValue("set_main_role").setEmoji("⚙️"));
            } else {
                menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Edit Adopters Role (Main)").setValue("edit_main_role").setEmoji("✏️"));
                menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Remove Adopters Role (Main)").setValue("remove_main_role").setEmoji("🗑️"));
            }

            // 2. Main Log Channel
            if (!hasMainLog) {
                menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Set Log Channel (Main)").setValue("set_main_log").setEmoji("⚙️"));
            } else {
                menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Edit Log Channel (Main)").setValue("edit_main_log").setEmoji("✏️"));
                menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Remove Log Channel (Main)").setValue("remove_main_log").setEmoji("🗑️"));
            }

            // 3. Local Adopters Role
            if (!hasLocalRole) {
                menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Set Local Adopters Role").setValue("set_local_role").setEmoji("⚙️"));
            } else {
                menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Edit Local Adopters Role").setValue("edit_local_role").setEmoji("✏️"));
                menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Remove Local Adopters Role").setValue("remove_local_role").setEmoji("🗑️"));
            }

            // 4. Local Log Channel
            if (!hasLocalLog) {
                menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Set Local Log Channel").setValue("set_local_log").setEmoji("⚙️"));
            } else {
                menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Edit Local Log Channel").setValue("edit_local_log").setEmoji("✏️"));
                menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Remove Local Log Channel").setValue("remove_local_log").setEmoji("🗑️"));
            }

            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${srvName}`))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**Invite Link:** \`${srvData.inviteLink || "None"}\`\n` +
                    `**Server Tag Text:** ${srvData.tagText || "None"}\n` +
                    `**Adopters Role:** ${hasMainRole ? `<@&${srvData.mainTagRole}>` : "Not Setup"}\n` +
                    `**Tag Adopted/Removed Log Channel:** ${hasMainLog ? `<#${srvData.mainLogChannel}>` : "Not Setup"}\n` +
                    `**Local Adopters Role:** ${hasLocalRole ? `<@&${srvData.localTagRole}>` : "Not Setup"}\n` +
                    `**Local Log Channel:** ${hasLocalLog ? `<#${srvData.localLogChannel}>` : "Not Setup"}`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId(`gts_edit_menu_${srvId}`)
                            .addOptions(menuOptions)
                    )
                );

            return interaction.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
        }

        // ====================================================
        // 4. DASHBOARD GLOBALS (Dynamic Menu)
        // ====================================================
        if (sub === 'dashboard') {
            const hub = await GTSHub.findOne();
            if (!hub) return interaction.reply({ content: "Hub not setup. Run `/gts setup` first.", flags: [MessageFlags.Ephemeral] });
            const guild = interaction.client.guilds.cache.get(hub.mainServerId);

            // Check current states
            const hasDefaultRole = !!hub.defaultTagRole;
            const isGatekeeperEnabled = hub.joinMainRequired;

            // Build dynamic options array
            const menuOptions = [
                new StringSelectMenuOptionBuilder()
                    .setLabel("Edit Server Stats Message")
                    .setValue("edit_msg")
                    .setEmoji("✏️")
            ];

            // Conditional Role Options
            if (!hasDefaultRole) {
                menuOptions.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel("Set Default Tag Adopters Role")
                        .setValue("set_default_role")
                        .setEmoji("⚙️")
                );
            } else {
                menuOptions.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel("Edit Default Tag Adopters Role")
                        .setValue("edit_default_role")
                        .setEmoji("✏️"),
                    new StringSelectMenuOptionBuilder()
                        .setLabel("Remove Default Tag Adopters Role")
                        .setValue("remove_default_role")
                        .setEmoji("🗑️")
                );
            }

            // Conditional Gatekeeper Options
            if (!isGatekeeperEnabled) {
                menuOptions.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel("Enable Required To Join Main Server")
                        .setValue("enable_gatekeeper")
                        .setEmoji("🟢")
                );
            } else {
                menuOptions.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel("Disable Required To Join Main Server")
                        .setValue("disable_gatekeeper")
                        .setEmoji("🔴")
                );
            }

            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${guild ? guild.name : "Hub Server"}`))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**Message ID:** \`${hub.dashboardMessageId || "None"}\`\n` +
                    `**Default Tag Adopters Role:** ${hasDefaultRole ? `<@&${hub.defaultTagRole}>` : "Not Setup"}\n` +
                    `**Require to join Main Server:** ${isGatekeeperEnabled ? "Yes" : "No"}`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId("gts_hub_menu")
                            .addOptions(menuOptions)
                    )
                );

            return interaction.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
        }

        if (sub === 'default-ta-role') {
            const role = interaction.options.getRole('role');
            await GTSHub.findOneAndUpdate({}, { defaultTagRole: role.id });
            return interaction.reply({ content: `✅ Default Tag Adopter role set to ${role}.`, flags: [MessageFlags.Ephemeral] });
        }

        if (sub === 'join-main-required') {
            const status = interaction.options.getBoolean('status');
            await GTSHub.findOneAndUpdate({}, { joinMainRequired: status });
            return interaction.reply({ content: `✅ Join Main requirement set to: **${status ? "Yes" : "No"}**.`, flags: [MessageFlags.Ephemeral] });
        }

        if (sub === 'greet-message') {
            const srvId = interaction.options.getString('server_id');
            const channel = interaction.options.getChannel('channel');
            await GTSServer.findOneAndUpdate({ serverId: srvId }, { greetChannel: channel.id }, { upsert: true });
            return interaction.reply({ content: `✅ Greet channel set to ${channel} for server \`${srvId}\`.`, flags: [MessageFlags.Ephemeral] });
        }
    }
};
