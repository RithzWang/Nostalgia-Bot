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

// Standard Discord Badge Assets
const BADGES = {
    staff: { name: 'Discord Staff', url: 'https://cdn.discordapp.com/badge-icons/5e74e9b6d94a4d6e45f94d9361d743a6.png' },
    partner: { name: 'Partner', url: 'https://cdn.discordapp.com/badge-icons/3f9748e53446a137aa8df69548880a0e.png' },
    hypesquad_events: { name: 'HypeSquad Events', url: 'https://cdn.discordapp.com/badge-icons/bf01d1073931f921909045f3a39fd264.png' },
    bravery: { name: 'HypeSquad Bravery', url: 'https://cdn.discordapp.com/badge-icons/8a88d638f3f8a71cd5e3e275f2735274.png' },
    brilliance: { name: 'HypeSquad Brilliance', url: 'https://cdn.discordapp.com/badge-icons/011940fd013da3f7fb9c6db115273dfa.png' },
    balance: { name: 'HypeSquad Balance', url: 'https://cdn.discordapp.com/badge-icons/3aa41de486fa12454c3761e8e223442e.png' },
    bughunter_1: { name: 'Bug Hunter 1', url: 'https://cdn.discordapp.com/badge-icons/2717692c7dca7250b23a36240955836a.png' },
    bughunter_2: { name: 'Bug Hunter 2', url: 'https://cdn.discordapp.com/badge-icons/848f0136b4c215e61d3dda19f79e2464.png' },
    developer: { name: 'Active Developer', url: 'https://cdn.discordapp.com/badge-icons/6bdc42827a38498929531b0bf29c94b7.png' },
    early_supporter: { name: 'Early Supporter', url: 'https://cdn.discordapp.com/badge-icons/7060786766c9c840eb3019e725d2b358.png' },
    nitro: { name: 'Nitro', url: 'https://cdn.discordapp.com/badge-icons/2ba85e8026a8614b640c2837bcdfe21b.png' },
    boost: { name: 'Booster', url: 'https://cdn.discordapp.com/badge-icons/723784dd5773fe8088192911609a5f74.png' },
    verified_bot_dev: { name: 'Verified Dev', url: 'https://cdn.discordapp.com/badge-icons/6df5d9d24f94660c0f6854261b206471.png' }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('badge-image')
        .setDescription('Get badge images or upload them as emojis')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // 🔒 LOCK COMMAND TO ADMINS
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Which badge?')
                .setRequired(true)
                .addChoices(
                    { name: '🌟 All Badges (View/Upload)', value: 'all' },
                    { name: 'Discord Staff', value: 'staff' },
                    { name: 'Partner', value: 'partner' },
                    { name: 'HypeSquad Events', value: 'hypesquad_events' },
                    { name: 'HypeSquad Bravery', value: 'bravery' },
                    { name: 'HypeSquad Brilliance', value: 'brilliance' },
                    { name: 'HypeSquad Balance', value: 'balance' },
                    { name: 'Bug Hunter (Green)', value: 'bughunter_1' },
                    { name: 'Bug Hunter (Gold)', value: 'bughunter_2' },
                    { name: 'Active Developer', value: 'developer' },
                    { name: 'Early Supporter', value: 'early_supporter' },
                    { name: 'Nitro', value: 'nitro' },
                    { name: 'Server Booster', value: 'boost' },
                    { name: 'Verified Bot Dev', value: 'verified_bot_dev' }
                )
        ),

    async execute(interaction) {
        // Double check in case of permission sync issues
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '<:no:1297814819105144862> You must be an Administrator to use this.', ephemeral: true });
        }

        const choice = interaction.options.getString('name');

        // ============================================
        // 1. ALL BADGES + UPLOAD BUTTON
        // ============================================
        if (choice === 'all') {
            await interaction.deferReply();

            const allBadges = Object.values(BADGES);
            const batch1 = allBadges.slice(0, 9); 
            const files1 = batch1.map(b => new AttachmentBuilder(b.url, { name: `${b.name.replace(/ /g, '_')}.png` }));
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('upload_badges')
                    .setLabel('Make all as Emojis')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📤')
            );

            const message = await interaction.editReply({ 
                content: `**All Discord Badges (Preview)**\nClick the button below to upload these to your server emojis!`,
                files: files1,
                components: [row]
            });

            // Create Collector
            const collector = message.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                time: 60000 
            });

            collector.on('collect', async (i) => {
                if (i.customId === 'upload_badges') {
                    // 🔒 LOCK BUTTON TO ADMINS
                    if (!i.member.permissions.has(PermissionFlagsBits.Administrator)) {
                        return i.reply({ content: '<:no:1297814819105144862> Only Administrators can perform this action.', ephemeral: true });
                    }

                    await i.update({ components: [] }); // Remove button to prevent double clicks
                    const statusMsg = await i.followUp({ content: '⏳ **Processing...** Uploading emojis to server...' });

                    let successCount = 0;
                    let failCount = 0;
                    const entries = Object.entries(BADGES);

                    for (const [key, badge] of entries) {
                        try {
                            await interaction.guild.emojis.create({ 
                                attachment: badge.url, 
                                name: key 
                            });
                            successCount++;
                        } catch (error) {
                            failCount++;
                            if (error.code === 30008) {
                                await statusMsg.edit(`⚠️ **Stopped:** Server emoji slots are full!`);
                                break;
                            }
                        }
                    }

                    await statusMsg.edit(
                        `<:yes:1297814648417943565> **Operation Complete**\n` +
                        `✅ Uploaded: ${successCount}\n` +
                        `❌ Failed: ${failCount} (Duplicates or Full)`
                    );
                }
            });
            return;
        }

        // ============================================
        // 2. SPECIFIC BADGE
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
