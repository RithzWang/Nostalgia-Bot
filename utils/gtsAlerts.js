const { 
    ContainerBuilder, SectionBuilder, ThumbnailBuilder, 
    TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize 
} = require('discord.js');

function buildAlertPayload(type, user, serverName, reason, extraData = null) {
    // 1. Extract User Data
    const globalName = user.globalName || user.username;
    const username = user.username;
    const userId = user.id;
    const userAvatar = user.displayAvatarURL({ size: 1024, forceStatic: false }) || "https://cdn.discordapp.com/embed/avatars/0.png";
    
    // 2. Footer Timestamp <t:timestamp:f>
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const timestampText = `-# <t:${currentTimestamp}:f>`;

    // 3. Prepare the Container
    const container = new ContainerBuilder();
    const section = new SectionBuilder().setThumbnailAccessory(new ThumbnailBuilder().setURL(userAvatar));

    // ==========================================
    // 🟡 TIMER STARTED ALERT
    // ==========================================
    if (type === 'start') {
        const actionText = extraData; // extraData is the Action string
        container.setAccentColor(15105570);
        
        section.addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## Timer Started"),
            new TextDisplayBuilder().setContent(
                `**${globalName}** (${username})\n` +
                `**ID:** \`${userId}\`\n` +
                `**Server:** ${serverName}\n` +
                `**Reason:** ${reason}\n` +
                `**Action:** ${actionText}`
            )
        );
    }

    // ==========================================
    // 🟢 TIMER CANCELLED ALERT
    // ==========================================
    else if (type === 'cancel') {
        const savedCount = extraData; // extraData is the number of kicks saved
        const kickGrammar = savedCount === 1 ? "Kick" : "Kicks";
        container.setAccentColor(3066993);
        
        section.addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## Timers Cancelled"),
            new TextDisplayBuilder().setContent(
                `**${globalName}** (${username})\n` +
                `**ID:** \`${userId}\`\n` +
                `**Reason:** ${reason}\n` +
                `**Saved From:** **${savedCount}** ${kickGrammar}`
            )
        );
    }

    // ==========================================
    // 🔴 MEMBER KICKED ALERT
    // ==========================================
    else if (type === 'kick') {
        container.setAccentColor(15548997);
        
        section.addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## Member Kicked"),
            new TextDisplayBuilder().setContent(
                `**${globalName}** (${username})\n` +
                `**ID:** \`${userId}\`\n` +
                `**Server:** ${serverName}\n` +
                `**Reason:** ${reason}`
            )
        );
    }

    // 4. Assemble the final pieces (Separator + Timestamp)
    container.addSectionComponents(section);
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(timestampText));

    return [container];
}

module.exports = { buildAlertPayload };
