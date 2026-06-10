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
        .addSubcommand(sub => sub.setName('tags-stats')
            .setDescription('Deploy the tags statistics dashboard in a satellite server.')
            .addStringOption(opt => opt.setName('message_id').setDescription('Message ID to edit (Optional)').setRequired(false))
            .addChannelOption(opt => opt.setName('channel').setDescription('Dashboard Channel (Optional)').setRequired(false))
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
            const textDisp = new TextDisplayBuilder().setContent("Configure your server below.\n-# You can easily select Roles and Channels directly from the dropdowns!");

            const tagTextLabel = new LabelBuilder().setLabel("Server Tag Text").setDescription("The exact text for the tag.").setTextInputComponent(new TextInputBuilder().setCustomId('tag_text').setStyle(TextInputStyle.Short).setRequired(true));
            const roleLabel = new LabelBuilder().setLabel("Tag Adopter Role").setDescription("Role given to users adopting the tag").setRoleSelectMenuComponent(new RoleSelectMenuBuilder().setCustomId('tag_role').setRequired(false));
            const channelLabel = new LabelBuilder().setLabel("Log Channel").setDescription("Channel to log tag adoptions").setChannelSelectMenuComponent(new ChannelSelectMenuBuilder().setCustomId('log_channel').setRequired(false));

            modal.addTextDisplayComponents(textDisp).addLabelComponents(tagTextLabel, roleLabel, channelLabel);
            return interaction.showModal(modal);
        }

        if (sub === 'addserver') {
            const srvId = interaction.options.getString('server_id');
            const invite = interaction.options.getString('invite_link');

            const existingHub = await GTSHub.findOne({ mainServerId: srvId });
            if (existingHub) return interaction.reply({ content: "❌ **Security Block:** Already registered as a Main Server!", flags: [MessageFlags.Ephemeral] });

            const existingSatellite = await GTSServer.findOne({ serverId: srvId });
            if (existingSatellite) return interaction.reply({ content: "❌ **Security Block:** Already grouped in the network!", flags: [MessageFlags.Ephemeral] });

            await GTSServer.findOneAndUpdate({ serverId: srvId }, { inviteLink: invite }, { upsert: true });

            const modal = new ModalBuilder().setCustomId(`gts_add_modal_${srvId}`).setTitle('Satellite Server Setup');

            const tagTextLabel = new LabelBuilder().setLabel("Server Tag Text").setTextInputComponent(new TextInputBuilder().setCustomId('tag_text').setStyle(TextInputStyle.Short).setRequired(true));
            const mainRoleLabel = new LabelBuilder().setLabel("Tag Role (In Main Server)").setRoleSelectMenuComponent(new RoleSelectMenuBuilder().setCustomId('main_tag_role').setRequired(false));
            const mainLogLabel = new LabelBuilder().setLabel("Log Channel (In Main)").setChannelSelectMenuComponent(new ChannelSelectMenuBuilder().setCustomId('main_log_channel').setRequired(false));
            const localRoleLabel = new LabelBuilder().setLabel("Local Tag Role").setRoleSelectMenuComponent(new RoleSelectMenuBuilder().setCustomId('local_tag_role').setRequired(false));
            const localLogLabel = new LabelBuilder().setLabel("Local Log Channel").setChannelSelectMenuComponent(new ChannelSelectMenuBuilder().setCustomId('local_log_channel').setRequired(false));
            
            modal.addLabelComponents(tagTextLabel, mainRoleLabel, mainLogLabel, localRoleLabel, localLogLabel);
            return interaction.showModal(modal);
        }

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
        // 4. VIEW SERVER (Ephemeral & Interactive)
        // ====================================================
        if (sub === 'view-server') {
            const srvId = interaction.options.getString('server_id');
            const srvData = await GTSServer.findOne({ serverId: srvId });
            if (!srvData) return interaction.reply({ content: "Server not found in DB.", flags: [MessageFlags.Ephemeral] });

            const guild = interaction.client.guilds.cache.get(srvId);
            const srvName = guild ? guild.name : "Unknown Server";

            const hub = await GTSHub.findOne();
            const mainGuildId = hub ? hub.mainServerId : null;

            const mainRoleStr = formatRole(interaction.client, interaction.guildId, mainGuildId, srvData.mainTagRole);
            const localRoleStr = formatRole(interaction.client, interaction.guildId, srvId, srvData.localTagRole);
            const mainLogStr = formatChannel(interaction.client, interaction.guildId, srvData.mainLogChannel);
            const localLogStr = formatChannel(interaction.client, interaction.guildId, srvData.localLogChannel);
            const greetStr = formatChannel(interaction.client, interaction.guildId, srvData.greetChannel); 

            const hasMainRole = !!srvData.mainTagRole;
            const hasMainLog = !!srvData.mainLogChannel;
            const hasLocalRole = !!srvData.localTagRole;
            const hasLocalLog = !!srvData.localLogChannel;
            const hasGreetChannel = !!srvData.greetChannel; 

            const menuOptions = [
                new StringSelectMenuOptionBuilder().setLabel("Edit Invite Link").setValue("edit_invite").setEmoji("✏️"),
                new StringSelectMenuOptionBuilder().setLabel("Edit Server Tag Text").setValue("edit_tag").setEmoji("✏️")
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
                    `**Server Tag Text:** ${srvData.tagText || "None"}\n` +
                    `**Adopters Role:** ${mainRoleStr}\n` +
                    `**Tag Adopted/Removed Log Channel:** ${mainLogStr}\n` +
                    `**Local Adopters Role:** ${localRoleStr}\n` +
                    `**Local Log Channel:** ${localLogStr}\n` +
                    `**Greet Channel:** ${greetStr}`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addActionRowComponents(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`gts_edit_menu_${srvId}`).addOptions(menuOptions)));

            // ✅ SENT AS EPHEMERAL
            return interaction.reply({ components: [container], flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral] });
        }

        // ====================================================
        // 5. DASHBOARD GLOBALS (Ephemeral & Interactive)
        // ====================================================
        if (sub === 'dashboard') {
            const hub = await GTSHub.findOne();
            if (!hub) return interaction.reply({ content: "Hub not setup. Run `/gts setup` first.", flags: [MessageFlags.Ephemeral] });
            const guild = interaction.client.guilds.cache.get(hub.mainServerId);

            const defaultRoleStr = formatRole(interaction.client, interaction.guildId, hub.mainServerId, hub.defaultTagRole);
            const hasDefaultRole = !!hub.defaultTagRole;
            const isGatekeeperEnabled = hub.joinMainRequired;

            const menuOptions = [new StringSelectMenuOptionBuilder().setLabel("Edit Server Stats Message").setValue("edit_msg").setEmoji("✏️")];

            if (!hasDefaultRole) menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Set Default Tag Adopters Role").setValue("set_default_role").setEmoji("⚙️"));
            else menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Edit Default Tag Adopters Role").setValue("edit_default_role").setEmoji("✏️"), new StringSelectMenuOptionBuilder().setLabel("Remove Default Tag Adopters Role").setValue("remove_default_role").setEmoji("🗑️"));

            if (!isGatekeeperEnabled) menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Enable Required To Join Main Server").setValue("enable_gatekeeper").setEmoji("🟢"));
            else menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Disable Required To Join Main Server").setValue("disable_gatekeeper").setEmoji("🔴"));

            const container = new ContainerBuilder()
                .setSpoiler(true)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${guild ? guild.name : "Hub Server"}`))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**Message ID:** \`${hub.dashboardMessageId || "None"}\`\n` +
                    `**Default Tag Adopters Role:** ${defaultRoleStr}\n` +
                    `**Require to join Main Server:** ${isGatekeeperEnabled ? "Yes" : "No"}`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addActionRowComponents(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId("gts_hub_menu").addOptions(menuOptions)));

            // ✅ SENT AS EPHEMERAL
            return interaction.reply({ components: [container], flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral] });
        }
        
        if (sub === 'default-ta-role' || sub === 'join-main-required' || sub === 'greet-message') {
            return interaction.reply({ content: `Please use the interactive \`/gts dashboard\` or \`/gts view-server\` UI to change settings now!`, flags: [MessageFlags.Ephemeral] });
        }
    }
};
