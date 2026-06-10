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

        if (sub === 'setup') {
            const mainId = interaction.options.getString('main_server_id');
            const invite = interaction.options.getString('invite_link');
            const msgId = interaction.options.getString('message_id');
            const channel = interaction.options.getChannel('channel');

            // Build the database update object dynamically based on what was provided
            const hubUpdateFields = { mainServerId: mainId };
            if (channel) hubUpdateFields.dashboardChannelId = channel.id;
            if (msgId) hubUpdateFields.dashboardMessageId = msgId;

            // Save Hub Config
            await GTSHub.findOneAndUpdate(
                { mainServerId: mainId }, 
                hubUpdateFields, 
                { upsert: true }
            );
            
            // Save Server Config
            await GTSServer.findOneAndUpdate(
                { serverId: mainId }, 
                { inviteLink: invite }, 
                { upsert: true }
            );

            // Pop open the Modal Form
            const modal = new ModalBuilder().setCustomId(`gts_setup_modal_${mainId}`).setTitle('Main Server Setup');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('tag_text').setLabel("Server Tag Text").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('tag_role').setLabel("Tag Adopter Role ID").setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('log_channel').setLabel("Log Channel ID").setStyle(TextInputStyle.Short).setRequired(false))
            );
            
            return interaction.showModal(modal);
        }

        if (sub === 'addserver') {
            const srvId = interaction.options.getString('server_id');
            const invite = interaction.options.getString('invite_link');

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

        if (sub === 'view-server') {
            const srvId = interaction.options.getString('server_id');
            const srvData = await GTSServer.findOne({ serverId: srvId });
            if (!srvData) return interaction.reply({ content: "Server not found in DB.", flags: [MessageFlags.Ephemeral] });

            const guild = interaction.client.guilds.cache.get(srvId);
            const srvName = guild ? guild.name : "Unknown Server";

            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${srvName}`))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**Invite Link:** \`${srvData.inviteLink || "None"}\`\n` +
                    `**Server Tag Text:** ${srvData.tagText || "None"}\n` +
                    `**Adopters Role:** ${srvData.mainTagRole ? `<@&${srvData.mainTagRole}>` : "Not Setup"}\n` +
                    `**Tag Adopted/Removed Log Channel:** ${srvData.mainLogChannel ? `<#${srvData.mainLogChannel}>` : "Not Setup"}\n` +
                    `**Local Adopters Role:** ${srvData.localTagRole ? `<@&${srvData.localTagRole}>` : "Not Setup"}\n` +
                    `**Local Log Channel:** ${srvData.localLogChannel ? `<#${srvData.localLogChannel}>` : "Not Setup"} `
                ))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder().setCustomId(`gts_edit_menu_${srvId}`).addOptions(
                            new StringSelectMenuOptionBuilder().setLabel("Edit Invite Link").setValue("edit_invite").setEmoji("✏️"),
                            new StringSelectMenuOptionBuilder().setLabel("Edit Server Tag Text").setValue("edit_tag").setEmoji("✏️"),
                            new StringSelectMenuOptionBuilder().setLabel("✏️ Edit/🗑️ Remove/⚙️ Set Adopters Role").setValue("edit_main_role"),
                            new StringSelectMenuOptionBuilder().setLabel("✏️ Edit/🗑️ Remove/⚙️ Set Log Channel").setValue("edit_main_log"),
                            new StringSelectMenuOptionBuilder().setLabel("✏️ Edit/🗑️ Remove/⚙️ Set Local Role").setValue("edit_local_role"),
                            new StringSelectMenuOptionBuilder().setLabel("✏️ Edit/🗑️ Remove/⚙️ Set Local Log Channel").setValue("edit_local_log")
                        )
                    )
                );

            return interaction.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
        }

        if (sub === 'dashboard') {
            const hub = await GTSHub.findOne();
            if (!hub) return interaction.reply({ content: "Hub not setup.", flags: [MessageFlags.Ephemeral] });
            const guild = interaction.client.guilds.cache.get(hub.mainServerId);

            const container = new ContainerBuilder()
                .setSpoiler(true)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${guild ? guild.name : "Hub Server"}`))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**Message ID:** \`${hub.dashboardMessageId || "None"}\`\n` +
                    `**Default Tag Adopters Role:** ${hub.defaultTagRole ? `<@&${hub.defaultTagRole}>` : "Not Setup"}\n` +
                    `**Require to join Main Server:** ${hub.joinMainRequired ? "Yes" : "No"}`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder().setCustomId("gts_hub_menu").addOptions(
                            new StringSelectMenuOptionBuilder().setLabel("Edit Server Stats Message").setValue("edit_msg").setEmoji("✏️"),
                            new StringSelectMenuOptionBuilder().setLabel("✏️ Edit/🗑️ Remove/⚙️ Set Default Tag Adopters Role").setValue("edit_default_role"),
                            new StringSelectMenuOptionBuilder().setLabel("🟢 Enable/🔴 Disable Requires to join Main Server").setValue("toggle_gatekeeper")
                        )
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
