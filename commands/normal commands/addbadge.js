const { 
    ContainerBuilder, 
    MessageFlags, 
    SeparatorSpacingSize,
    TextDisplayBuilder,      
    SeparatorBuilder,        
    PermissionFlagsBits
} = require('discord.js');

// Reliable source for badge images (Public GitHub Raw Links)
const BADGE_URLS = {
    // --- Standard Badges ---
    'staff': 'https://raw.githubusercontent.com/mezotv/discord-badges/master/assets/discordstaff.png',
    'partner': 'https://raw.githubusercontent.com/mezotv/discord-badges/master/assets/discordpartner.png',
    'hypesquad': 'https://raw.githubusercontent.com/mezotv/discord-badges/master/assets/hypesquadevents.png',
    'bravery': 'https://raw.githubusercontent.com/mezotv/discord-badges/master/assets/hypesquadbravery.png',
    'brilliance': 'https://raw.githubusercontent.com/mezotv/discord-badges/master/assets/hypesquadbrilliance.png',
    'balance': 'https://raw.githubusercontent.com/mezotv/discord-badges/master/assets/hypesquadbalance.png',
    'bughunter': 'https://raw.githubusercontent.com/mezotv/discord-badges/master/assets/bughunter1.png',
    'bughunter_gold': 'https://raw.githubusercontent.com/mezotv/discord-badges/master/assets/bughunter2.png',
    'developer': 'https://raw.githubusercontent.com/mezotv/discord-badges/master/assets/verifieddeveloper.png',
    'active_dev': 'https://raw.githubusercontent.com/mezotv/discord-badges/master/assets/activedeveloper.png',
    'early_supporter': 'https://raw.githubusercontent.com/mezotv/discord-badges/master/assets/earlysupporter.png',
    'nitro': 'https://raw.githubusercontent.com/mezotv/discord-badges/master/assets/nitro.png',
    'moderator': 'https://raw.githubusercontent.com/mezotv/discord-badges/master/assets/certifiedmoderator.png',

    // --- Boost Evolution Badges ---
    'boost_1m': 'https://raw.githubusercontent.com/mezotv/discord-badges/master/assets/boost1month.png',
    'boost_2m': 'https://raw.githubusercontent.com/mezotv/discord-badges/master/assets/boost2month.png',
    'boost_3m': 'https://raw.githubusercontent.com/mezotv/discord-badges/master/assets/boost3month.png',
    'boost_6m': 'https://raw.githubusercontent.com/mezotv/discord-badges/master/assets/boost6month.png',
    'boost_9m': 'https://raw.githubusercontent.com/mezotv/discord-badges/master/assets/boost9month.png',
    'boost_12m': 'https://raw.githubusercontent.com/mezotv/discord-badges/master/assets/boost12month.png',
    'boost_15m': 'https://raw.githubusercontent.com/mezotv/discord-badges/master/assets/boost15month.png',
    'boost_18m': 'https://raw.githubusercontent.com/mezotv/discord-badges/master/assets/boost18month.png',
    'boost_24m': 'https://raw.githubusercontent.com/mezotv/discord-badges/master/assets/boost24month.png'
};

module.exports = {
    name: 'addbadge',
    aliases: ['badge', 'badges'],
    description: 'Automatically adds Discord Badge emojis to the server',
   // channels: ['1456197056510165026', '1456197056510165029', '1456197056988319870'], 

    async execute(message, args) {
        try {
            // 1. Permission Check
            if (!message.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
                return message.reply({ content: `You need **Manage Emojis** permission.`, flags: [MessageFlags.Ephemeral] });
            }
            if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
                return message.reply({ content: `I need **Manage Emojis** permission.`, flags: [MessageFlags.Ephemeral] });
            }

            // 2. Determine what to add
            const query = args[0] ? args[0].toLowerCase() : null;
            let toAdd = {};

            if (!query) {
                // Show condensed list
                const list = Object.keys(BADGE_URLS).map(k => `\`${k}\``).join(', ');
                return message.reply(`**Usage:** \`addbadge <name>\`, \`addbadge boosts\`, or \`addbadge all\`\n**Available:** ${list}`);
            }

            // Keyword: 'all' adds everything
            if (query === 'all') {
                toAdd = BADGE_URLS;
            } 
            // Keyword: 'boosts' adds only boost badges
            else if (query === 'boosts' || query === 'boost') {
                for (const key in BADGE_URLS) {
                    if (key.startsWith('boost')) toAdd[key] = BADGE_URLS[key];
                }
            }
            // Single badge
            else if (BADGE_URLS[query]) {
                toAdd = { [query]: BADGE_URLS[query] };
            } else {
                return message.reply(`❌ Badge \`${query}\` not found in my list.`);
            }

            // 3. Process Uploads
            await message.channel.sendTyping();
            
            const added = [];
            const failed = [];
            const keys = Object.keys(toAdd);

            for (const name of keys) {
                const url = toAdd[name];
                try {
                    const emoji = await message.guild.emojis.create({ attachment: url, name: name });
                    added.push(emoji);
                } catch (error) {
                    console.error(`Failed to add ${name}`, error);
                    failed.push(name);
                }
            }

            // 4. Build Result Container
            const title = query === 'all' ? 'Badge Import Complete' : 'Badge Added';
            const color = added.length > 0 ? 0x43B581 : 0xFF0000;

            let description = "";
            if (added.length > 0) {
                description += `**Successfully added ${added.length} badge(s):**\n`;
                description += added.map(e => `${e} \`:${e.name}:\``).join(' ');
            }
            
            if (failed.length > 0) {
                description += added.length > 0 ? `\n\n` : ``;
                description += `**Failed to add:** ${failed.map(n => \`\`${n}\`\`).join(', ')} (Slots full?)`;
            }

            const container = new ContainerBuilder()
                .setAccentColor(color)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${title}`),
                    new TextDisplayBuilder().setContent(description)
                );

            if (added.length > 0) {
                container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
            }

            // 5. Reply
            await message.reply({ 
                components: [container], 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.SuppressNotifications] 
            });

        } catch (error) {
            console.error(error);
            message.reply("An error occurred while adding badges.");
        }
    }
};
