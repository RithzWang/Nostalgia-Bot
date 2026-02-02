const { REST, Routes, ActivityType } = require('discord.js');
const moment = require('moment-timezone');
const { serverID } = require('../config.json'); 
const { updateAllPanels } = require('../utils/qabilatanManager'); 

module.exports = {
    name: 'clientReady',
    once: true,
    async execute(client) {
        console.log(`Logged in as ${client.user.tag}`);

        // 1. SLASH COMMAND REGISTRATION
        const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
        
        // Filter commands into Global vs Guild Only
        const globalDatas = client.slashCommands.filter(c => !c.guildOnly).map(c => c.data.toJSON());
        const guildDatas = client.slashCommands.filter(c => c.guildOnly).map(c => c.data.toJSON());

        try {
            console.log(`Started refreshing ${globalDatas.length} global and ${guildDatas.length} guild commands.`);

            if (guildDatas.length > 0) {
                await rest.put(
                    Routes.applicationGuildCommands(client.user.id, serverID), 
                    { body: guildDatas }
                );
                console.log('✅ Guild-only commands registered.');
            }

            if (globalDatas.length > 0) {
                await rest.put(
                    Routes.applicationCommands(client.user.id), 
                    { body: globalDatas }
                );
                console.log('✅ Global commands registered.');
            }
        } catch (e) { 
            console.error("Command Register Error:", e); 
        }

        // 2. INVITE TRACKER CACHE
        const guild = client.guilds.cache.get(serverID);
        if(guild) {
            const currentInvites = await guild.invites.fetch().catch(() => new Map());
            currentInvites.each(invite => client.invitesCache.set(invite.code, invite.uses));
        }

        // 3. TIMERS (Status + Qabilatan Stats)
        setInterval(() => {
            const now = moment().tz('Asia/Bangkok');
            const formattedTime = now.format('HH:mm');
            const currentHour = now.hour();

            // A. Status Rotator
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
                status: 'dnd'
            });

            // B. Qabilatan Stats Auto-Update (Every minute)
            // We check if seconds are < 5 so it only triggers once per minute
            if (now.seconds() < 5) {
                updateAllPanels(client);
            }

        }, 5000); // Loop runs every 5 seconds
    }
};
