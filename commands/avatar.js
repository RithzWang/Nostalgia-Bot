const Discord = require('discord.js');

module.exports = {
    name: 'avatar',
    description: 'Shows the avatar of a user.',
    execute(message, args, client) {
        let user;
        
        // Check if someone was mentioned
        if (message.mentions.users.first()) {
            user = message.mentions.users.first();
        } 
        // Check if user ID is provided
        else if (args[0]) {
            client.users.fetch(args[0])
                .then(fetchedUser => {
                    user = fetchedUser;
                    sendAvatarEmbed(user);
                })
                .catch(err => message.channel.send('Could not find a user with that ID.'));
            return;
        } 
        // Default: command author
        else {
            user = message.author;
        }

       const target = message.mentions.members.first() || message.member;

        // If user is already known (mentioned or self)
        if (user) sendAvatarEmbed(user);

        function sendAvatarEmbed(user) {
            const embed = new Discord.MessageEmbed()
                .setTitle(`Avatar For ${target.nickname}`)
                .setImage(user.displayAvatarURL({ dynamic: true, size: 1024 }))
                .setColor('#888888')
                .setTimestamp();

            message.channel.send(embed);
        }
    },
};