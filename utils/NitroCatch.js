// File Location: ./utils/NitroCatch.js

const { fetchAdvancedProfile } = require('./v9Scraper');
const NitroConfig = require('../models/NitroConfig');

// Cooldown memory stays here so it persists in the background
const recentChecks = new Set(); 

// Export the function so other files can use it
module.exports = async function checkNitroRoles(message) {
    if (message.author.bot || !message.guild) return;

    // 1. Cooldown Check
    if (recentChecks.has(message.author.id)) return;

    // 2. Database Check
    const config = await NitroConfig.findOne({ guildId: message.guild.id });
    if (!config) return;

    try {
        // Add user to cooldown
        recentChecks.add(message.author.id);
        setTimeout(() => recentChecks.delete(message.author.id), 12 * 60 * 60 * 1000); 

        // 3. Hit the API
        const v10Data = await fetchAdvancedProfile(message.author.id).catch(() => null);
        if (!v10Data) return;

        // 4. Determine Nitro Status
        const hasNitro = !!(v10Data.premium_type || v10Data.premium_since);
        const member = message.member;

        // 5. Apply/Remove Roles
        const hasNitroRole = member.roles.cache.has(config.withNitroRoleId);
        const hasNoNitroRole = member.roles.cache.has(config.noNitroRoleId);

        if (hasNitro) {
            if (!hasNitroRole) await member.roles.add(config.withNitroRoleId).catch(() => {});
            if (hasNoNitroRole) await member.roles.remove(config.noNitroRoleId).catch(() => {});
        } else {
            if (!hasNoNitroRole) await member.roles.add(config.noNitroRoleId).catch(() => {});
            if (hasNitroRole) await member.roles.remove(config.withNitroRoleId).catch(() => {});
        }

    } catch (error) {
        console.error("Auto-Nitro Sync Error:", error);
    }
};
