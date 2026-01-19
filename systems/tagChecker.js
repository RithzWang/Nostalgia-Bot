const TAG_CONFIG = {
    targetServerID: "1456197054782111756",      // YOUR SERVER ID
    rewardRoleID: "1462217123433545812",        // THE ROLE ID
    logChannelID: "1456197056510165026"         // LOG CHANNEL ID
};

module.exports = (client) => {
    
    // 1. STARTUP & INTERVAL LOOP
    // We listen for "ready" here so this file handles its own startup
    if (client.isReady()) {
        startLoop(client);
    } else {
        client.once('clientReady', () => startLoop(client));
    }

    // 2. INSTANT MESSAGE CHECKER
    client.on('messageCreate', async (message) => {
        if (!message.guild || message.guild.id !== TAG_CONFIG.targetServerID || message.author.bot) return;

        // Use the check function for a single member
        await checkMemberTag(message.member, message.guild, client);
    });
};

// --- LOGIC FUNCTIONS ---

function startLoop(client) {
    console.log("✅ Tag Checker System Loaded.");
    
    // Run once immediately
    runSweep(client);

    // Run every 60 seconds
    setInterval(() => {
        runSweep(client);
    }, 60 * 1000);
}

async function runSweep(client) {
    const guild = client.guilds.cache.get(TAG_CONFIG.targetServerID);
    if (!guild) return;

    // Fetch all members to ensure cache is fresh
    try { await guild.members.fetch(); } catch (e) {}

    // Loop through everyone
    guild.members.cache.forEach(async (member) => {
        if (member.user.bot) return;
        await checkMemberTag(member, guild, client, true); // true = isSweep mode
    });
}

async function checkMemberTag(member, guild, client, isSweep = false) {
    const role = guild.roles.cache.get(TAG_CONFIG.rewardRoleID);
    const logChannel = client.channels.cache.get(TAG_CONFIG.logChannelID);
    if (!role) return;

    // --- THE MAGIC CHECK ---
    // Reads the property from the custom User class you showed me
    const userTagData = member.user.primaryGuild;
    
    const isWearingTag = userTagData && 
                         userTagData.identityGuildId === TAG_CONFIG.targetServerID;
    
    const hasRole = member.roles.cache.has(role.id);

    // A. GIVE ROLE
    if (isWearingTag && !hasRole) {
        try {
            await member.roles.add(role);
            console.log(`✅ [Tag System] Gave role to ${member.user.tag}`);

            // Only send log message if it's the Loop (Sweep) 
            // OR if you want it on message event too, remove "&& isSweep"
            if (logChannel && isSweep) {
                await logChannel.send({
                    content: `🎉 Thanks <@${member.user.id}> for wearing our server tag!`
                });
            }
        } catch (e) { console.error(e); }
    }

    // B. REMOVE ROLE
    else if (!isWearingTag && hasRole) {
        try {
            await member.roles.remove(role);
            console.log(`❌ [Tag System] Removed role from ${member.user.tag}`);
        } catch (e) { console.error(e); }
    }
}
