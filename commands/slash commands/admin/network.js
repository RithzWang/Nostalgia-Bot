const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const NetworkConfig = require('../../../src/models/NetworkConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('network')
        .setDescription('Manage your server network ecosystem.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Strictly Admin Only
        
        .addSubcommand(subcommand =>
            subcommand.setName('create-hub')
                .setDescription('Set this current server as a Main Hub.')
        )
        .addSubcommand(subcommand =>
            subcommand.setName('link-satellite')
                .setDescription('Link this server to your Main Hub.')
                .addStringOption(option => 
                    option.setName('hub_id')
                        .setDescription('The Server ID of your Main Hub')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('unlink')
                .setDescription('Disconnect this server from the network.')
        )
        .addSubcommand(subcommand =>
            subcommand.setName('gatekeeper')
                .setDescription('Toggle Auto-Kick for members who are not in your Main Hub.')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Enable or Disable Gatekeeper mode')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('global-role')
                .setDescription('Set a role that syncs from the Hub to this satellite.')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The Adopter/Global role to sync')
                        .setRequired(true)
                )
        ),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        let config = await NetworkConfig.findOne({ guildId });
        if (!config) config = new NetworkConfig({ guildId });

        // ==========================================
        // 1. CREATE HUB
        // ==========================================
        if (sub === 'create-hub') {
            // Guard: Prevent a satellite from becoming a hub without unlinking first
            if (config.mainServerId && !config.isMainServer) {
                return interaction.reply({ content: "❌ This server is currently linked as a satellite to another network! You must run `/network unlink` first.", flags: [MessageFlags.Ephemeral] });
            }

            config.isMainServer = true;
            config.mainServerId = guildId; 
            await config.save();

            return interaction.reply({ 
                content: `✅ **${interaction.guild.name}** has been successfully registered as a **Main Hub**.\nYou can now go to your other servers and run \`/network link-satellite hub_id:${guildId}\`.`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        // ==========================================
        // 2. LINK SATELLITE (With Cross-Server Auth)
        // ==========================================
        if (sub === 'link-satellite') {
            const hubId = interaction.options.getString('hub_id');

            if (hubId === guildId) {
                return interaction.reply({ content: "❌ You cannot link a server to itself. Use `/network create-hub` instead.", flags: [MessageFlags.Ephemeral] });
            }

            // ✅ GUARD: Prevent linking if already a Hub
            if (config.isMainServer) {
                return interaction.reply({ content: "❌ This server is currently registered as a Main Hub! You must run `/network unlink` first before it can become a satellite.", flags: [MessageFlags.Ephemeral] });
            }

            // ✅ GUARD: Prevent linking if already linked to another Hub
            if (config.mainServerId) {
                return interaction.reply({ content: `❌ This server is already linked to a network. You must run \`/network unlink\` first before joining a new one.`, flags: [MessageFlags.Ephemeral] });
            }

            const targetHub = client.guilds.cache.get(hubId);
            if (!targetHub) {
                return interaction.reply({ content: "❌ I cannot find that server! Make sure I am invited to the Main Hub first.", flags: [MessageFlags.Ephemeral] });
            }

            try {
                const memberInHub = await targetHub.members.fetch(interaction.user.id);
                if (!memberInHub.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ content: "⛔ **Security Denied:** You must be an Administrator in the target Main Hub to link servers to it.", flags: [MessageFlags.Ephemeral] });
                }
            } catch (err) {
                return interaction.reply({ content: "⛔ **Security Denied:** You are not a member of the target Main Hub, or I cannot verify your permissions.", flags: [MessageFlags.Ephemeral] });
            }

            const hubConfig = await NetworkConfig.findOne({ guildId: hubId });
            if (!hubConfig || !hubConfig.isMainServer) {
                return interaction.reply({ content: "❌ The target server is not registered as a Hub. Run `/network create-hub` in that server first.", flags: [MessageFlags.Ephemeral] });
            }

            config.isMainServer = false;
            config.mainServerId = hubId;
            await config.save();

            return interaction.reply({ 
                content: `🔗 **Success!** This server is now a satellite linked to **${targetHub.name}**.`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        // ==========================================
        // 3. UNLINK
        // ==========================================
        if (sub === 'unlink') {
            config.isMainServer = false;
            config.mainServerId = null;
            config.kickIfNoMain = false;
            config.globalTagRoleId = null;
            await config.save();

            return interaction.reply({ content: "🔌 This server has been disconnected from the network.", flags: [MessageFlags.Ephemeral] });
        }

        // ==========================================
        // 4. GATEKEEPER SECURITY
        // ==========================================
        if (sub === 'gatekeeper') {
            if (!config.mainServerId) {
                return interaction.reply({ content: "❌ This server must be linked to a Main Hub before enabling gatekeeper security.", flags: [MessageFlags.Ephemeral] });
            }

            const isEnabled = interaction.options.getBoolean('enabled');
            config.kickIfNoMain = isEnabled;
            await config.save();

            return interaction.reply({ 
                content: `🛡️ **Gatekeeper Mode:** ${isEnabled ? '`ENABLED` 🟢\nAny new or existing members who are not in the Main Hub will be automatically kicked.' : '`DISABLED` 🔴'}`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        // ==========================================
        // 5. GLOBAL ROLE SYNC
        // ==========================================
        if (sub === 'global-role') {
            if (!config.mainServerId) {
                return interaction.reply({ content: "❌ This server must be linked to a network before setting a global role.", flags: [MessageFlags.Ephemeral] });
            }

            const role = interaction.options.getRole('role');
            config.globalTagRoleId = role.id;
            await config.save();

            return interaction.reply({ 
                content: `🔖 **Global Role Synced:** Members with the designated tag role in the Main Hub will automatically receive ${role.toString()} here.`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }
    }
};
