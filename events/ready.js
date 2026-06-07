const { REST, Routes, ActivityType, Collection } = require('discord.js');
const moment = require('moment-timezone');
const { serverID } = require('../config.json'); 

// ✅ CHANGED: Updated path to networkManager and imported enforceNetworkRules
const { updateAllPanels, enforceNetworkRules } = require('../utils/networkManager'); 
const { updateServerStatsPanels } = require('../utils/serverStatsManager'); 

const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'clientReady', 
    once: true,
    async execute(client) {
        console.log(`Logged in as ${client.user.tag}`);

        if (!client.slashCommands) client.slashCommands = new Collection();
        if (!client.invitesCache) client.invitesCache = new Collection();

        // 1. SLASH COMMAND REGISTRATION
        const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
        const globalDatas = client.slashCommands.filter(c => !c.guildOnly).map(c => c.data.toJSON());
        const guildDatas = client.slashCommands.filter(c => c.guildOnly).map(c => c.data.toJSON());

        try {
            console.log(`Started refreshing ${globalDatas.length} global and ${guildDatas.length} guild commands.`);
            if (guildDatas.length > 0) {
                await rest.put(Routes.applicationGuildCommands(client.user.id, serverID), { body: guildDatas });
                console.log('✅ Guild-only commands registered.');
            }
            if (globalDatas.length > 0) {
                await rest.put(Routes.applicationCommands(client.user.id), { body: globalDatas });
                console.log('✅ Global commands registered.');
            }
        } catch (e) { console.error("Command Register Error:", e); }

        // 2. INVITE TRACKER CACHE
        const guild = client.guilds.cache.get(serverID);
        if(guild) {
            try {
                const currentInvites = await guild.invites.fetch();
                currentInvites.each(invite => client.invitesCache.set(invite.code, invite.uses));
                console.log('✅ Invites cached.');
            } catch (e) { console.log('⚠️ Could not cache invites'); }
        }

        // 4. TIMERS (Status + Network Stats + Server Stats)
        setInterval(() => {
            const now = moment().tz('Asia/Bangkok');
            const formattedTime = now.format('HH:mm');
            const currentHour = now.hour();

            let timeEmoji = '🌙'; 
            if (currentHour >= 6 && currentHour < 9) timeEmoji = '🌄'; 
            else if (currentHour >= 9 && currentHour < 16) timeEmoji = '☀️'; 
            else if (currentHour >= 16 && currentHour < 18) timeEmoji = '🌇'; 

            client.user.setPresence({
                activities: [{ 
                    name: 'customstatus', 
                    type: ActivityType.Custom, 
                    state: `${timeEmoji} ${formattedTime} (GMT+7)` 
                }],
                status: 'idle'
            });

            // This runs roughly at the start of every new minute (when seconds are 0, 1, 2, 3, or 4)
            if (now.seconds() < 5) {
                // ✅ Updates Network Main Dashboard
                updateAllPanels(client, false).catch(err => console.error(err));
                
                // ✅ Updates the local Server Stats Dashboard
                updateServerStatsPanels(client).catch(err => console.error(err));
                
                // ✅ NEW: Validates network positions and syncs cross-server roles!
                enforceNetworkRules(client).catch(err => console.error(err));
            }

        }, 5000); 
    }
};
