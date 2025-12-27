const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createWelcomeImage } = require('../../../welcomeCanvas.js'); // Check your path!

module.exports = {
    data: new SlashCommandBuilder()
        .setName('testwelcome')
        .setDescription('Simulate the V2 welcome card for a specific user')
        .addUserOption(option => 
            option.setName('target')
            .setDescription('The user to generate the image for (default is you)')
        ),
    
    async execute(interaction) {
        await interaction.deferReply(); 

        try {
            // 1. Get the target member (or yourself)
            const member = interaction.options.getMember('target') || interaction.member;

            // 2. Generate the Image
            const welcomeImageBuffer = await createWelcomeImage(member);
            const attachment = new AttachmentBuilder(welcomeImageBuffer, { name: 'welcome-image.png' });

            // 3. Mock Data
            const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;
            const memberCount = interaction.guild.memberCount;
            
            // Fake inviter data
            const inviterName = interaction.user.username;
            const inviterId = interaction.user.id;
            const inviteCode = 'TEST-CODE';
            const colourEmbed = '#2b2d31'; // Or your variable
            const hexColor = parseInt(colourEmbed.replace('#', ''), 16);

            // 4. Construct V2 Payload
            const v2Payload = {
                flags: 1 << 15, // REQUIRED for V2
                components: [
                    // --- PART 1: Top Container (Text) ---
                    {
                        type: 1,
                        components: [{
                            type: 6, // Container
                            accent_color: hexColor,
                            components: [
                                {
                                    type: 7, // Header
                                    content: [
                                        { type: 8, content: "### Welcome to A2-Q Server" },
                                        { type: 8, content: `-# <@${member.user.id}> \`(${member.user.username})\`` }
                                    ],
                                    accessory: { 
                                        type: 2, style: 2, thumbnail: { url: member.user.displayAvatarURL() } 
                                    }
                                },
                                {
                                    type: 7, // Stats
                                    content: [
                                        { type: 8, content: `-# <:calendar:1439970556534329475> Account Created: ${accountCreated}` },
                                        { type: 8, content: `-# <:users:1439970561953501214> Member Count: \`${memberCount}\`` },
                                        { type: 8, content: `-# <:chain:1439970559105564672> Invited by <@${inviterId}> \`(${inviterName})\`` }
                                    ]
                                }
                            ]
                        }]
                    },

                    // --- PART 2: Website Button (Middle) ---
                    {
                        type: 1, 
                        components: [{
                            type: 2, // Button
                            style: 5, // Link
                            label: `Visit Website`,
                            url: 'https://ridouan.xyz/'
                        }]
                    },

                    // --- PART 3: Image Container (Bottom) ---
                    {
                        type: 1,
                        components: [{
                            type: 6, // Container
                            accent_color: hexColor,
                            components: [{
                                type: 7,
                                content: [],
                                accessory: {
                                    type: 3, // Media
                                    src: "attachment://welcome-image.png",
                                    width: 0,
                                    height: 0
                                }
                            }]
                        }]
                    },

                    // --- PART 4: ID Button (Footer) ---
                    {
                        type: 1,
                        components: [{
                            type: 2,
                            style: 2, // Secondary
                            label: `${member.user.id}`,
                            emoji: { id: '1441133157855395911' },
                            custom_id: 'hello_button_disabled',
                            disabled: true
                        }]
                    }
                ]
            };

            // 5. Send Result
            // Note: We use the spread operator (...) to merge v2Payload properties into the editReply options
            await interaction.editReply({ 
                content: `**[SIMULATION]** Welcome card for ${member.user.tag}`,
                ...v2Payload,
                files: [attachment]
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'Something went wrong generating the test image.' });
        }
    }
};
