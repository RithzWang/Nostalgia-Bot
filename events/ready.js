// ✅ NEW: Added MessageFlags, ContainerBuilder, TextDisplayBuilder to the require
const { REST, Routes, ActivityType, Collection, MessageFlags, ContainerBuilder, TextDisplayBuilder } = require('discord.js');
const moment = require('moment-timezone');
const { serverID } = require('../config.json'); 

const { updateServerStatsPanels } = require('../utils/serverStatsManager'); 
const { updateGTSDashboard } = require('../utils/gtsManager'); 

const fs = require('fs');
const path = require('path');

// ✅ NEW: Import the Scheduled Message Model (Double check this path matches your folder structure!)
const ScheduledMessage = require('../src/models/ScheduledMessage'); 

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

        // 3. TIMERS (Status + Server Stats + GTS Dashboard)
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
                // Updates the local Server Stats Dashboard
                updateServerStatsPanels(client).catch(err => console.error(err));
                
                // Updates the Global Tags Stats Dashboard every minute
                updateGTSDashboard(client).catch(err => console.error(err));
            }

        }, 5000); 

        // ==========================================
        // 4. SCHEDULED MESSAGES LOOP (Runs every 10s)
        // ==========================================
        setInterval(async () => {
            try {
                const now = new Date();
                
                // Find all messages where the sendAt time has passed
                const pendingMessages = await ScheduledMessage.find({ sendAt: { $lte: now } });

                if (pendingMessages.length > 0) {
                    console.log(`[SCHEDULER] Found ${pendingMessages.length} message(s) ready to send.`);
                }

                for (const msg of pendingMessages) {
                    console.log(`[SCHEDULER] Attempting to send ${msg.type} to channel ${msg.channelId}`);
                    
                    const channel = await client.channels.fetch(msg.channelId).catch(() => null);
                    if (!channel) {
                        console.log(`[SCHEDULER] Channel ${msg.channelId} not found or inaccessible. Deleting schedule.`);
                        await ScheduledMessage.findByIdAndDelete(msg._id);
                        continue; 
                    }

                    const allowedMentions = msg.mention ? { parse: ['users', 'roles', 'everyone'] } : { parse: [] };
                    
                    // Build payload based on type
                    if (msg.type === 'send') {
                        const payload = { content: msg.content, allowedMentions };
                        if (msg.image) payload.files = [msg.image];
                        
                        await channel.send(payload)
                            .then(() => console.log(`[SCHEDULER] Successfully sent 'send' message.`))
                            .catch(err => console.error(`[SCHEDULER] FAILED to send 'send' message:`, err));
                    } 
                    else if (msg.type === 'reply') {
                        const targetMessage = await channel.messages.fetch(msg.replyMessageId).catch(() => null);
                        if (targetMessage) {
                            const payload = { content: msg.content, allowedMentions };
                            if (msg.image) payload.files = [msg.image];
                            
                            await targetMessage.reply(payload)
                                .then(() => console.log(`[SCHEDULER] Successfully sent 'reply' message.`))
                                .catch(err => console.error(`[SCHEDULER] FAILED to send 'reply':`, err));
                        } else {
                            console.log(`[SCHEDULER] Target message ${msg.replyMessageId} to reply to was deleted/not found.`);
                        }
                    } 
                    else if (msg.type === 'container') {
                        const components = [
                            new ContainerBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(msg.content)
                                ),
                        ];
                        const containerPayload = { 
                            components: components, 
                            allowedMentions: allowedMentions,
                            flags: MessageFlags.IsComponentsV2 
                        };
                        
                        await channel.send(containerPayload)
                            .then(() => console.log(`[SCHEDULER] Successfully sent 'container' message.`))
                            .catch(err => console.error(`[SCHEDULER] FAILED to send 'container':`, err));
                    }

                    // Remove it from the database after attempting to send
                    await ScheduledMessage.findByIdAndDelete(msg._id);
                    console.log(`[SCHEDULER] Deleted message ${msg._id} from database after processing.`);
                }
            } catch (error) {
                console.error("[SCHEDULER ERROR] Error processing scheduled messages:", error);
            }
        }, 10000); 
    }
};
