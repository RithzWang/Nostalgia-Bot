const TAG_CONFIG = {
    targetServerID: "1456197054782111756",      // YOUR SERVER ID
    rewardRoleID: "1462217123433545812"         // THE ROLE ID
    // Removed logChannelID because we are not sending messages anymore
};

module.exports = (client) => {
    
    // 1. STARTUP & INTERVAL LOOP
    if (client.isReady()) {
        startLoop(client);
    } else {
        client.once('clientReady', () => startLoop(client));
    }

    // 2. INSTANT MESSAGE CHECKER
    client.on('messageCreate', async (message) => {
        if (!message.guild || message.guild.id !== TAG_CONFIG.targetServerID || message.author.bot) return;

        // Check silently when they chat
        await checkMemberTag(message.member, message.guild);
    });
};

// --- LOGIC FUNCTIONS ---

function startLoop(client) {
    console.log("✅ Tag Checker System Loaded (Silent Mode).");
    
    // Run once immediately
    runSweep(client);

    // Run every 60 seconds
    setInterval(() => {
        runSweep(client);
    }, 2 * 1000);
}

async function runSweep(client) {
    const guild = client.guilds.cache.get(TAG_CONFIG.targetServerID);
    if (!guild) return;

    // Force Fetch all members to ensure we see the latest tags
    try { await guild.members.fetch({ force: true }); } catch (e) {}

    // Loop through everyone
    guild.members.cache.forEach(async (member) => {
        if (member.user.bot) return;
        await checkMemberTag(member, guild);
    });
}

async function checkMemberTag(member, guild) {
    const role = guild.roles.cache.get(TAG_CONFIG.rewardRoleID);
    if (!role) return;

    // --- GET DATA ---
    const userTagData = member.user.primaryGuild;
    
    // --- CHECK ---
    const isWearingTag = userTagData && 
                         userTagData.identityGuildId === TAG_CONFIG.targetServerID;
    
    const hasRole = member.roles.cache.has(role.id);

    // A. GIVE ROLE (Silent)
    if (isWearingTag && !hasRole) {
        try {
            await member.roles.add(role);
            console.log(`✅ [Tag System] Gave role to ${member.user.tag} (Silent)`);
        } catch (e) { console.error(`Failed to add role: ${e.message}`); }
    }

    // B. REMOVE ROLE (Silent)
    else if (!isWearingTag && hasRole) {
        try {
            await member.roles.remove(role);
            console.log(`❌ [Tag System] Removed role from ${member.user.tag} (Silent)`);
        } catch (e) { console.error(`Failed to remove role: ${e.message}`); }
    }
}
