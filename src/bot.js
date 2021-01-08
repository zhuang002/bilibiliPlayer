const BilibiliPlayer = require("./bilibilyPlayer.js")
require('dotenv').config();
console.log(process.env.DISCORD_BOT_TOKEN);

const { Client } = require('discord.js');
const client = new Client();

client.on('ready', async () => {
    console.log(`The bot '${client.user.username}' has logged in.`);
}).on('message', async (message) => {
    if (!message.author.bot) {
        console.log(`message received:${message.content}`);
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            console.log('not connect to a voice channle');
            return;
        }
        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
            return message.channel.send(
                "I need the permissions to join and speak in your voice channel!"
            );
        }
        var connection = await voiceChannel.join();
        //var file = "C:\\Users\\zhuan\\Downloads\\test." + message.content;
        //var file = "http://localhost/song/test." + message.content;
        //console.log(file);
        //const dispatcher = connection.play(file).on("error", (error) => console.error(error));

        var player = new BilibiliPlayer();
        const dispatcher = player.play(connection, message.content).on("error",(error)=>console.error(error));

    }
}); 

client.login(process.env.DISCORD_BOT_TOKEN);

