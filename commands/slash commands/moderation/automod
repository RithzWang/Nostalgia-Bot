const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    AutoModerationRuleEventType, 
    AutoModerationRuleTriggerType, 
    AutoModerationRuleKeywordPresetType, 
    AutoModerationActionType,
    MessageFlags
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Manage AutoMod Badge Grinding')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => 
            sub.setName('setup')
               .setDescription('🚀 One-Click: Create MAX rules instantly (Best for Badge)')
        )
        .addSubcommand(sub => 
            sub.setName('delete-all')
               .setDescription('🗑️ Delete all AutoMod rules created by this bot')
        ),

    async execute(interaction) {
        const { guild } = interaction;
        const subcommand = interaction.options.getSubcommand();

        await interaction.deferReply();

        // ============================================
        // 🚀 ONE-CLICK SETUP (Max Rules)
        // ============================================
        if (subcommand === 'setup') {
            let createdCount = 0;
            let errors = [];

            // Define the 6 rules we want to create to hit the limit
            const rulesToCreate = [
                {
                    name: '🛡️ Block Profanity & Slurs',
                    eventType: AutoModerationRuleEventType.MessageSend,
                    triggerType: AutoModerationRuleTriggerType.KeywordPreset,
                    triggerMetadata: {
                        presets: [
                            AutoModerationRuleKeywordPresetType.Profanity,
                            AutoModerationRuleKeywordPresetType.Slurs,
                            AutoModerationRuleKeywordPresetType.SexualContent
                        ]
                    },
                    actions: [{ type: AutoModerationActionType.BlockMessage }]
                },
                {
                    name: '🛡️ Anti-Spam',
                    eventType: AutoModerationRuleEventType.MessageSend,
                    triggerType: AutoModerationRuleTriggerType.Spam,
                    triggerMetadata: {},
                    actions: [{ type: AutoModerationActionType.BlockMessage }]
                },
                {
                    name: '🛡️ Mention Spam (Max 5)',
                    eventType: AutoModerationRuleEventType.MessageSend,
                    triggerType: AutoModerationRuleTriggerType.MentionSpam,
                    triggerMetadata: { mentionTotalLimit: 5 },
                    actions: [{ type: AutoModerationActionType.BlockMessage }]
                },
                // Dummy Keyword Rules to fill up slots (Max 6 usually)
                {
                    name: '🛡️ Keyword: Test1',
                    eventType: AutoModerationRuleEventType.MessageSend,
                    triggerType: AutoModerationRuleTriggerType.Keyword,
                    triggerMetadata: { keywordFilter: ['badword123'] },
                    actions: [{ type: AutoModerationActionType.BlockMessage }]
                },
                {
                    name: '🛡️ Keyword: Test2',
                    eventType: AutoModerationRuleEventType.MessageSend,
                    triggerType: AutoModerationRuleTriggerType.Keyword,
                    triggerMetadata: { keywordFilter: ['anotherbadword'] },
                    actions: [{ type: AutoModerationActionType.BlockMessage }]
                },
                {
                    name: '🛡️ Keyword: Test3',
                    eventType: AutoModerationRuleEventType.MessageSend,
                    triggerType: AutoModerationRuleTriggerType.Keyword,
                    triggerMetadata: { keywordFilter: ['donottypethis'] },
                    actions: [{ type: AutoModerationActionType.BlockMessage }]
                }
            ];

            // Loop through and create them one by one
            for (const rule of rulesToCreate) {
                try {
                    await guild.autoModerationRules.create({
                        name: rule.name,
                        creatorId: interaction.client.user.id,
                        enabled: true,
                        eventType: rule.eventType,
                        triggerType: rule.triggerType,
                        triggerMetadata: rule.triggerMetadata,
                        actions: rule.actions
                    });
                    createdCount++;
                    // Small delay to prevent rate limits
                    await new Promise(r => setTimeout(r, 1000));
                } catch (err) {
                    // Usually error 30035 means Max Rules Reached
                    if (err.code === 30035) {
                        errors.push(`Limit Reached (Max ${guild.autoModerationRules.cache.size})`);
                        break; // Stop trying if full
                    } else {
                        errors.push(err.message);
                    }
                }
            }

            let response = `<:yes:1297814648417943565> **Process Complete!**\n✅ Successfully created **${createdCount}** rules.`;
            
            if (errors.length > 0) {
                response += `\n⚠️ Stopped early: ${errors[0]}`;
            }

            if (createdCount >= 6) {
                response += `\n🔥 **Perfect!** This server is now maxed out for badge grinding. Move to the next server!`;
            }

            await interaction.editReply(response);
        }

        // ============================================
        // 🗑️ DELETE ALL (Cleanup)
        // ============================================
        else if (subcommand === 'delete-all') {
            try {
                // Fetch all rules first
                const rules = await guild.autoModerationRules.fetch();
                // Filter only ones created by THIS bot
                const myRules = rules.filter(r => r.creatorId === interaction.client.user.id);

                if (myRules.size === 0) {
                    return interaction.editReply('❌ No rules found created by me.');
                }

                let deleted = 0;
                for (const rule of myRules.values()) {
                    await rule.delete();
                    deleted++;
                }

                await interaction.editReply(`<:yes:1297814648417943565> Deleted **${deleted}** rules created by me.`);
            } catch (err) {
                console.error(err);
                await interaction.editReply(`<:no:1297814819105144862> Failed to delete rules: ${err.message}`);
            }
        }
    }
};
