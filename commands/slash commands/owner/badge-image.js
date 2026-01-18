const { 
    SlashCommandBuilder, 
    AttachmentBuilder, 
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    ComponentType
} = require('discord.js');

const REPO = 'https://raw.githubusercontent.com/mezotv/discord-badges/main/assets';

const BADGES = {
    // --- 1. SYSTEM & UI TAGS ---
    automod:            { name: 'Automod System', url: `${REPO}/automod.png` },
    supports_commands:  { name: 'Supports Commands (Slash)', url: `${REPO}/supports_commands.png` },
    system:             { name: 'System User', url: 'https://i.imgur.com/K9enj8J.png' }, // Custom asset for System
    
    // --- 2. SERVER / GUILD BADGES ---
    guild_owner:        { name: 'Server Owner (Crown)', url: `${REPO}/owner.png` },
    guild_verified:     { name: 'Verified Server', url: `${REPO}/verified.png` },
    guild_partner:      { name: 'Partnered Server', url: `${REPO}/partner.png` },
    
    // --- 3. STAFF & RARE ---
    staff:              { name: 'Discord Staff', url: `${REPO}/discord_staff.png` },
    partner_user:       { name: 'Partnered User', url: `${REPO}/partner.png` },
    mod_alumni:         { name: 'Moderator Alumni', url: `${REPO}/moderator_programs_alumni.png` },
    certified_mod:      { name: 'Certified Moderator', url: `${REPO}/certified_moderator.png` },
    translator:         { name: 'Crowdin Translator', url: `${REPO}/crowdin_translator.png` },

    // --- 4. NITRO & BOOSTS ---
    nitro:              { name: 'Nitro Subscriber', url: `${REPO}/nitro.png` },
    boost_1m:           { name: 'Boost 1 Month', url: `${REPO}/boosts/1_month.png` },
    boost_24m:          { name: 'Boost 24 Months', url: `${REPO}/boosts/24_months.png` },

    // --- 5. DEVELOPER & BUGS ---
    active_dev:         { name: 'Active Developer', url: `${REPO}/active_developer.png` },
    verified_dev:       { name: 'Verified Bot Developer', url: `${REPO}/early_verified_bot_developer.png` },
    bughunter_1:        { name: 'Bug Hunter (Green)', url: `${REPO}/bug_hunter_level_1.png` },
    bughunter_2:        { name: 'Bug Hunter (Gold)', url: `${REPO}/bug_hunter_level_2.png` },

    // --- 6. HYPESQUAD ---
    hypesquad_events:   { name: 'HypeSquad Events', url: `${REPO}/hypesquad_events.png` },
    bravery:            { name: 'HypeSquad Bravery', url: `${REPO}/hypesquad_bravery.png` },
    brilliance:         { name: 'HypeSquad Brilliance', url: `${REPO}/hypesquad_brilliance.png` },
    balance:            { name: 'HypeSquad Balance', url: `${REPO}/hypesquad_balance.png` },
    
    // --- 7. LEGACY ---
    legacy_username:    { name: 'Legacy Username', url: `${REPO}/legacy_username.png` },
    early_supporter:    { name: 'Early Supporter', url: `${REPO}/early_supporter.png` },
    quest_completed:    { name: 'Completed a Quest', url: `${REPO}/completed_a_quest.png` }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('badge-image')
        .setDescription('Get Discord System Tags & Badges (Admin Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Select a badge')
                .setRequired(true)
                .addChoices(
                    { name: '🌟 ALL BADGES (View & Upload)', value: 'all' },
                    { name: '🤖 Automod Tag', value: 'automod' },
                    { name: '⚡ Supports Commands Tag', value: 'supports_commands' },
                    { name: '👑 Server Owner Crown', value: 'guild_owner' },
                    { name: '✅ Verified Server Shield', value: 'guild_verified' },
                    { name: '♾️ Partner Server', value: 'guild_partner' },
                    { name: '🛡️ Certified Moderator', value: 'certified_mod' },
                    { name: '🌍 Translator', value: 'translator' },
                    { name: '💎 Nitro', value: 'nitro' },
                    { name: '👨‍💻 Active Developer', value: 'active_dev' }
                )
        ),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '<:no:1297814819105144862> Admin permission required.', ephemeral: true });
        }

        const choice = interaction.options.getString('name');

        // ============================================
        // 1. ALL BADGES MODE
        // ============================================
        if (choice === 'all') {
            await interaction.deferReply();

            const allValues = Object.values(BADGES);
            // Preview the "System" ones first as they are new
            const previewFiles = [
                new AttachmentBuilder(BADGES.automod.url, { name: 'automod.png' }),
                new AttachmentBuilder(BADGES.guild_verified.url, { name: 'verified.png' }),
                new AttachmentBuilder(BADGES.guild_owner.url, { name: 'crown.png' })
            ];

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('upload_badges')
                    .setLabel(`Upload ALL (${allValues.length}) as Emojis`)
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📤')
            );

            const msg = await interaction.editReply({ 
                content: `**Found ${allValues.length} Badges**\nIncludes: System Tags, Server Flags, Boosts, and Profile Badges.\n\nClick below to upload them to this server.`,
                files: previewFiles,
                components: [row]
            });

            const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

            collector.on('collect', async (i) => {
                if (i.customId === 'upload_badges') {
                    if (!i.member.permissions.has(PermissionFlagsBits.Administrator)) return i.reply({ content: 'Admin only.', ephemeral: true });

                    await i.update({ components: [] });
                    const status = await i.followUp('⏳ **Uploading...**');

                    let success = 0;
                    let fail = 0;

                    for (const [key, badge] of Object.entries(BADGES)) {
                        try {
                            await interaction.guild.emojis.create({ attachment: badge.url, name: key });
                            success++;
                        } catch (e) {
                            fail++;
                            if (e.code === 30008) {
                                await status.edit(`⚠️ **Stopped:** Server emoji limit reached!`);
                                break;
                            }
                        }
                    }

                    await status.edit(`<:yes:1297814648417943565> **Finished!**\n✅ Uploaded: ${success}\n❌ Skipped/Failed: ${fail}`);
                }
            });
            return;
        }

        // ============================================
        // 2. SINGLE BADGE MODE
        // ============================================
        const badge = BADGES[choice];
        if (!badge) return interaction.reply({ content: '<:no:1297814819105144862> Badge not found.', ephemeral: true });

        const file = new AttachmentBuilder(badge.url, { name: 'badge.png' });
        const embed = new EmbedBuilder()
            .setTitle(badge.name)
            .setImage('attachment://badge.png')
            .setColor(0x5865F2);

        await interaction.reply({ embeds: [embed], files: [file] });
    }
};
