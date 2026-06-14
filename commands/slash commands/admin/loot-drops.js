const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    MessageFlags, 
    ChannelType,
    TextDisplayBuilder, 
    SeparatorBuilder, 
    SeparatorSpacingSize, 
    ButtonBuilder, 
    ButtonStyle, 
    ActionRowBuilder, 
    ContainerBuilder
} = require('discord.js');

// --- ADDED UserLootTracking to the imports ---
const { GuildConfig, LootDrop, UserLootTracking } = require('../../../src/models/LootDropSchema'); // Adjust path

// Helper function to build the Container
const buildLootContainer = (type, data) => {
    // 1. Title section
    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("# 💰 Loot Drops")
        );

    // 2. Content logic
    let desc = "-# A new loot drop is available!\n\n";

    if (type === 'link') {
        desc += `**Loot:** ${data.lootName}\n**Amount:** ${data.maxAmount}\n`;
        if (data.expireTime) desc += `**Expire Time:** <t:${Math.floor(data.expireTime / 1000)}:R>\n`;
        if (data.supporterId) desc += `**Supporter:** <@${data.supporterId}>\n`;
    } else {
        desc += `**Loot:** <@&${data.rolePrizeId}>\n`;
        if (data.maxAmount) desc += `**Amount:** ${data.maxAmount}\n`;
        if (data.expireTime) desc += `**Expire Time:** <t:${Math.floor(data.expireTime / 1000)}:R>\n`;
        if (data.specialRole) desc += `**Requirement:** <@&${data.specialRole}>\n`;
    }

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(desc)
    ).addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    // Check if expired based on time
    const isExpired = data.expireTime ? Date.now() > data.expireTime : false;

    // Disable primary button if closed, max claimed, or expired
    const isClosed = Boolean(data.status === 'closed' || (data.maxAmount && data.claimedCount >= data.maxAmount) || isExpired);
    
    let secondaryLabel = data.maxAmount 
        ? `Claimed ${data.claimedCount}/${data.maxAmount}` 
        : `Claimed ${data.claimedCount}`;

    container.addActionRowComponents(
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Success)
                    .setLabel("Claim Loot")
                    .setCustomId("536bd0f667bc4218861e4760b5fff9cd") 
                    .setDisabled(isClosed),
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Secondary)
                    .setLabel(secondaryLabel)
                    .setDisabled(true)
                    .setCustomId("68df599500984f22fdcfeff6168abdd7") 
            )
    );

    return [container];
};

// Helper function to parse time string (e.g. "30s", "5m", "2h") into milliseconds
const parseDuration = (input) => {
    if (!input) return null;
    const match = input.trim().match(/^(\d+)([smh])$/i);
    if (!match) return false; 
    
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    
    if (unit === 's') return value * 1000;
    if (unit === 'm') return value * 60000;
    if (unit === 'h') return value * 3600000;
    
    return null;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loot-drops')
        .setDescription('Manage Loot Drops')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        // --- 1. SET CHANNEL ---
        .addSubcommand(sub => 
            sub.setName('set-channel')
                .setDescription('Set the channel where loot drops are sent')
                .addChannelOption(opt => opt.setName('channel').setDescription('Target Channel').addChannelTypes(ChannelType.GuildText).setRequired(true))
        )

        // --- 2. PRIZE LINK ---
        .addSubcommand(sub => {
            sub.setName('prize-link')
               .setDescription('Create a link-based loot drop')
               .addStringOption(opt => opt.setName('loot').setDescription('Loot name').setRequired(true))
               .addStringOption(opt => opt.setName('prize_1').setDescription('First prize link').setRequired(true))
               .addRoleOption(opt => opt.setName('special_role').setDescription('Role requirement (Optional)'))
               .addStringOption(opt => opt.setName('expire_time').setDescription('e.g. 30s, 5m, 2h (Optional)'))
               .addUserOption(opt => opt.setName('supporter').setDescription('Supporter user (Optional)'));
            
            for (let i = 2; i <= 15; i++) {
                sub.addStringOption(opt => opt.setName(`prize_${i}`).setDescription(`Prize link ${i} (Optional)`));
            }
            return sub;
        })

        // --- 3. PRIZE ROLE ---
        .addSubcommand(sub => 
            sub.setName('prize-role')
                .setDescription('Create a role-based loot drop')
                .addRoleOption(opt => opt.setName('role_prize').setDescription('The role to give').setRequired(true))
                .addStringOption(opt => opt.setName('expire_time').setDescription('e.g. 30s, 5m, 2h (Optional)'))
                .addRoleOption(opt => opt.setName('special_role').setDescription('Role requirement (Optional)'))
                .addIntegerOption(opt => opt.setName('amount').setDescription('Max amount of claims (Optional)'))
        )

        // --- 4. CLOSE ---
        .addSubcommand(sub => 
            sub.setName('close')
                .setDescription('Force close a loot drop')
                .addStringOption(opt => opt.setName('loot_id').setDescription('Message ID of the loot').setRequired(true))
        )

        // --- 5. RESET CLAIM LIMIT ---
        .addSubcommand(sub => 
            sub.setName('reset-claim-limit')
                .setDescription('Reset the daily claim limit for a specific user')
                .addUserOption(opt => opt.setName('target').setDescription('The user to reset').setRequired(true))
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            // SET-CHANNEL
            if (sub === 'set-channel') {
                const channel = interaction.options.getChannel('channel');
                await GuildConfig.findOneAndUpdate(
                    { guildId }, 
                    { lootChannelId: channel.id }, 
                    { upsert: true }
                );
                return interaction.editReply(`<:yes:1297814648417943565> Loot drops channel set to ${channel}`);
            }

            // RESET CLAIM LIMIT
            if (sub === 'reset-claim-limit') {
                const targetUser = interaction.options.getUser('target');
                
                // Try to find and delete their tracking record for today
                const result = await UserLootTracking.findOneAndDelete({ userId: targetUser.id });
                
                if (result) {
                    return interaction.editReply(`<:yes:1297814648417943565> Successfully reset the daily link claim limit for ${targetUser}.`);
                } else {
                    return interaction.editReply(`<:yes:1297814648417943565> ${targetUser} didn't have an active limit to reset, they are already good to go!`);
                }
            }

            // Fetch Config for the remaining subcommands
            const config = await GuildConfig.findOne({ guildId });
            if (!config) return interaction.editReply(`<:no:1297814819105144862> Please use \`/loot-drops set-channel\` first!`);
            
            const targetChannel = await interaction.guild.channels.fetch(config.lootChannelId).catch(() => null);
            if (!targetChannel) return interaction.editReply(`<:no:1297814819105144862> The configured drop channel no longer exists.`);

            // PRIZE-LINK
            if (sub === 'prize-link') {
                const lootName = interaction.options.getString('loot');
                const specialRole = interaction.options.getRole('special_role');
                const expireInput = interaction.options.getString('expire_time');
                const supporter = interaction.options.getUser('supporter');

                // Parse duration
                const expireMs = parseDuration(expireInput);
                if (expireMs === false) {
                    return interaction.editReply(`<:no:1297814819105144862> Invalid expire time format! Please use \`s\` for seconds, \`m\` for minutes, or \`h\` for hours (e.g., \`30s\`, \`5m\`, \`2h\`).`);
                }

                const prizes = [];
                for (let i = 1; i <= 15; i++) {
                    const p = interaction.options.getString(`prize_${i}`);
                    if (p) prizes.push(p);
                }

                const data = {
                    type: 'link',
                    lootName,
                    prizes,
                    maxAmount: prizes.length,
                    claimedCount: 0,
                    expireTime: expireMs ? Date.now() + expireMs : null,
                    specialRole: specialRole ? specialRole.id : null,
                    supporterId: supporter ? supporter.id : null,
                    status: 'active'
                };

                const components = buildLootContainer('link', data);
                const msg = await targetChannel.send({ 
                    components, 
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] } 
                });

                await LootDrop.create({ ...data, messageId: msg.id, guildId });

                // AUTO-CLOSE TIMER
                if (expireMs) {
                    setTimeout(async () => {
                        const checkDrop = await LootDrop.findOne({ messageId: msg.id });
                        if (checkDrop && checkDrop.status === 'active') {
                            checkDrop.status = 'closed';
                            await checkDrop.save();
                            const updatedComponents = buildLootContainer(checkDrop.type, checkDrop);
                            await msg.edit({ 
                                components: updatedComponents, 
                                flags: MessageFlags.IsComponentsV2,
                                allowedMentions: { parse: [] } 
                            }).catch(() => {});
                        }
                    }, expireMs);
                }

                return interaction.editReply(`<:yes:1297814648417943565> Link Drop created!`);
            }

            // PRIZE-ROLE
            if (sub === 'prize-role') {
                const rolePrize = interaction.options.getRole('role_prize');
                const expireInput = interaction.options.getString('expire_time');
                const specialRole = interaction.options.getRole('special_role');
                const amount = interaction.options.getInteger('amount');

                // Parse duration
                const expireMs = parseDuration(expireInput);
                if (expireMs === false) {
                    return interaction.editReply(`<:no:1297814819105144862> Invalid expire time format! Please use \`s\` for seconds, \`m\` for minutes, or \`h\` for hours (e.g., \`30s\`, \`5m\`, \`2h\`).`);
                }

                const data = {
                    type: 'role',
                    rolePrizeId: rolePrize.id,
                    maxAmount: amount || null,
                    claimedCount: 0,
                    expireTime: expireMs ? Date.now() + expireMs : null,
                    specialRole: specialRole ? specialRole.id : null,
                    status: 'active'
                };

                const components = buildLootContainer('role', data);
                const msg = await targetChannel.send({ 
                    components, 
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] } 
                });

                await LootDrop.create({ ...data, messageId: msg.id, guildId });

                // AUTO-CLOSE TIMER
                if (expireMs) {
                    setTimeout(async () => {
                        const checkDrop = await LootDrop.findOne({ messageId: msg.id });
                        if (checkDrop && checkDrop.status === 'active') {
                            checkDrop.status = 'closed';
                            await checkDrop.save();
                            const updatedComponents = buildLootContainer(checkDrop.type, checkDrop);
                            await msg.edit({ 
                                components: updatedComponents, 
                                flags: MessageFlags.IsComponentsV2,
                                allowedMentions: { parse: [] } 
                            }).catch(() => {});
                        }
                    }, expireMs);
                }

                return interaction.editReply(`<:yes:1297814648417943565> Role Drop created!`);
            }

            // CLOSE
            if (sub === 'close') {
                const messageId = interaction.options.getString('loot_id');
                const drop = await LootDrop.findOne({ messageId, guildId });
                
                if (!drop) return interaction.editReply(`<:no:1297814819105144862> Loot drop not found.`);
                if (drop.status === 'closed') return interaction.editReply(`<:no:1297814819105144862> This drop is already closed.`);

                drop.status = 'closed';
                await drop.save();

                const msg = await targetChannel.messages.fetch(messageId).catch(() => null);
                if (msg) {
                    const components = buildLootContainer(drop.type, drop);
                    await msg.edit({ 
                        components, 
                        flags: MessageFlags.IsComponentsV2,
                        allowedMentions: { parse: [] } 
                    });
                }

                return interaction.editReply(`<:yes:1297814648417943565> Drop successfully forced closed.`);
            }

        } catch (error) {
            console.error(error);
            return interaction.editReply(`<:no:1297814819105144862> Error: ${error.message}`);
        }
    }
};

module.exports.buildLootContainer = buildLootContainer;
