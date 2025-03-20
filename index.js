require('dotenv').config(); // Load environment variables
console.log("Token loaded:", process.env.TOKEN); // Token verification

const { Client, GatewayIntentBits, MessageEmbed } = require('discord.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMessageReactions
    ] 
});

const tournamentChannelId = "1337487554056028270"; // Replace with the channel ID
const registrationMessageId = "1351677265926426726"; // Replace with the message ID for reactions
const participants = [];
let pools = [];
let currentRound = 1;
let tournamentStartTime = null; // Dynamic start time

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log('Bot is ready to manage tournaments!');
});

// ✅ Command to set tournament date and start automatically
client.on('messageCreate', async (message) => {
    if (message.content.startsWith("!setTournament")) {
        const args = message.content.split(" ");
        if (args.length < 3) {
            message.channel.send("⚠️ Please use the format: `!setTournament DD-MM-YYYY HH:MM`");
            return;
        }

        const dateStr = args[1];
        const timeStr = args[2];
        tournamentStartTime = new Date(`${dateStr}T${timeStr}:00`);

        if (isNaN(tournamentStartTime)) {
            message.channel.send("⚠️ Invalid date format. Use `DD-MM-YYYY HH:MM`.");
            return;
        }

        message.channel.send(`✅ Tournament scheduled for **${tournamentStartTime.toLocaleString()}**.`);
        scheduleTournamentStart();
    }
});

// ✅ Handle participant registration via reactions
client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return; // Ignore bot reactions

    if (reaction.message.channel.id === tournamentChannelId && reaction.message.id === registrationMessageId) {
        if (!participants.includes(user.id)) {
            participants.push(user.id);
            console.log(`${user.username} has registered!`);
        }
    }
});

// 🔹 Command to manually start the tournament
client.on('messageCreate', async (message) => {
    if (message.content === "!startTournament" && message.channel.id === tournamentChannelId) {
        if (participants.length < 2) {
            message.channel.send("⚠️ Not enough participants to start the tournament!");
            return;
        }

        shuffleParticipants();
        createPools();
        displayTournament(message.channel);
    }
});

// 🔹 Shuffle participants
function shuffleParticipants() {
    for (let i = participants.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [participants[i], participants[j]] = [participants[j], participants[i]];
    }
}

// 🔹 Create 1v1 pools
function createPools() {
    pools = [];
    for (let i = 0; i < participants.length; i += 2) {
        if (i + 1 < participants.length) {
            pools.push([participants[i], participants[i + 1]]);
        } else {
            pools.push([participants[i], "AUTO_WIN"]); // If odd number, one player auto wins
        }
    }
}

// 🔹 Display tournament brackets
async function displayTournament(channel) {
    let embed = new MessageEmbed()
        .setTitle(`🏆 Tournament - Round ${currentRound}`)
        .setColor("BLUE");

    pools.forEach((match, index) => {
        const player1 = `<@${match[0]}>`;
        const player2 = match[1] === "AUTO_WIN" ? "✅ Auto Win" : `<@${match[1]}>`;
        embed.addField(`Match ${index + 1}`, `${player1} vs ${player2}`, false);
    });

    const tournamentMessage = await channel.send({ embeds: [embed] });

    for (let i = 0; i < pools.length; i++) {
        if (pools[i][1] !== "AUTO_WIN") {
            await tournamentMessage.react(`${i + 1}️⃣`);
        }
    }

    client.on('messageReactionAdd', async (reaction, user) => {
        if (user.bot) return;

        const matchIndex = parseInt(reaction.emoji.name[0]) - 1;
        if (!isNaN(matchIndex) && pools[matchIndex]) {
            advanceToNextRound(pools[matchIndex][0]); // First player advances
            checkNextRound(channel);
        }
    });
}

// 🔹 Advance to the next round
function advanceToNextRound(winnerId) {
    participants.push(winnerId);
}

// 🔹 Check for tournament completion
function checkNextRound(channel) {
    if (participants.length === 1) {
        channel.send(`🏆 **Congratulations to <@${participants[0]}> who wins the tournament!** 🏆`);
        participants.length = 0; // Reset
        return;
    }

    currentRound++;
    createPools();
    displayTournament(channel);
}

// 🔹 Schedule automatic tournament start
function scheduleTournamentStart() {
    if (!tournamentStartTime) return;

    const currentTime = new Date();
    const timeUntilStart = tournamentStartTime - currentTime;

    if (timeUntilStart <= 0) {
        // If time has passed, start immediately
        console.log('Scheduled tournament time reached, starting now...');
        startTournament();
    } else {
        // Otherwise, schedule the start
        console.log(`The tournament will start at ${tournamentStartTime.toLocaleString()}.`);
        setTimeout(() => {
            console.log('Scheduled tournament time reached, starting now...');
            startTournament();
        }, timeUntilStart);
    }
}
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot is running and managed by Fly.io!');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(🚀 Keep-alive server running on port ${PORT});
});
// ✅ Connect the bot
client.login(process.env.TOKEN);
