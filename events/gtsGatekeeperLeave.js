const { Events, MessageFlags } = require('discord.js');
const { GTSHub, GTSServer } = require('../src/models/GTS');
const { startTimer } = require('../utils/gtsTimerManager');
const { buildAlertPayload } = require('../utils/gtsAlerts'); // Need this to build the combined alert

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        if (member.user.bot) return;

        const client = member.client;
        const hub = await GTSHub.findOne();
        
        // ==========================================
        // 🚨 SCENARIO: User Leaves the Main Hub
        // ==========================================
        if (hub && member.guild.id === hub.mainServerId) {
            const satellites = await GTSServer.find({ serverId: { $ne: hub.mainServerId } });
            
            const startedServerNames = []; // 📦 Store the server names here

            for (const sat of satellites) {
                const guild = client.guilds.cache.get(sat.serverId);
                if (!guild) continue;
                
                const satMember = await guild.members.fetch(member.id).catch(() => null);
                if (satMember) {
                    // ⏱️ Start timer SILENTLY (true)
                    const didStart = await startTimer(satMember, client, hub, "Left Main Server", "will be kicked in **__10__** mins if they don’t return", true);
                    
                    if (didStart) {
                        startedServerNames.push(guild.name); // Add name to our list
                    }
                }
            }

            // 📤 Build and send ONE combined alert if any timers started
            if (startedServerNames.length > 0 && hub.alertChannelId) {
                const combinedServerNames = startedServerNames.join(', '); // Example: "Server A, Server B"
                
                const payload = buildAlertPayload(
                    'start', 
                    member.user, 
                    combinedServerNames, 
                    "Left Main Server", 
                    "will be kicked in **__10__** mins if they don’t return"
                );

                const mainGuild = client.guilds.cache.get(hub.mainServerId);
                const alertChannel = mainGuild?.channels.cache.get(hub.alertChannelId);
                
                if (alertChannel) {
                    await alertChannel.send({ 
                        components: payload, 
                        flags: [MessageFlags.IsComponentsV2] 
                    }).catch(() => {});
                }
            }
        }
    }
};
