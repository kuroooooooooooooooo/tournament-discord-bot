require('dotenv').config(); // Load environment variables
console.log("Token loaded:", process.env.TOKEN); // Token verification

const { Client, GatewayIntentBits, MessageEmbed } = require('discord.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMessageReactions, // Required for tracking reaction
		GatewayIntentBits.GuildMembers // Required to get user info in reactions
    ] 
});

const tournamentChannelId = "1337487554056028270"; // Replace with the channel ID
const participants = []; // liste des participants
let registrationMessageId; // declare globally
let pools = [];
let currentRound = 1;
let tournamentStartTime = null; // Dynamic start time

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log('Bot is ready to manage tournaments!');
});

// ✅ Command to set tournament date and start automatically
client.on("messageCreate", async (message) => {
    if (message.content.startsWith("!setTournament")) {
        const args = message.content.split(" ");
        if (args.length < 3) {
            message.channel.send("⚠️Please use the format: `!setTournament DD-MM-YYYY HH:MM UTC`.");
            return;
        }

        const dateStr = args[1]; // Example: "20-03-2025"
        const timeStr = args[2]; // Example: "09:30"

        const [day, month, year] = dateStr.split("-").map(Number);
        const [hour, minute] = timeStr.split(":").map(Number);

        tournamentStartTime = new Date(Date.UTC(year, month - 1, day, hour, minute));

        if (isNaN(tournamentStartTime.getTime())) {
            message.channel.send("⚠️Invalid date format. Use `DD-MM-YYYY HH:MM UTC`.");
            return;
        }

            //  Use original UTC formatting
        const formattedTime = tournamentStartTime.toUTCString();

        try {
            //  Send confirmation message
            const confirmationMessage = await message.channel.send(`✅ Tournament scheduled for **${formattedTime} (UTC)**.`);

            //  Correctly store message ID (if needed)
            const confirmationMessageid = confirmationMessage.id;

            //  Add the custom emoji reaction (apply react() to the Message object, not its ID)
            await confirmationMessage.react("<:CoinHead:1351413590120464456>");
            console.log("✅Added CoinHead reaction!");

            //  Proceed with scheduling the tournament
            scheduleTournamentStart();
        } catch (error) {
            console.error(" Error scheduling tournament:", error);
        }
    }
});

// ✅ Handle participant registration via reactions
client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return; // Ignore bot reactions
	
	console.log(`🔹Current Participants List:`, participants);
	console.log(`✅Successfully registered: ${user.username} (ID: {user.id})`);
	if (!registrationMessageId) {
		console.error("⚠️ Error: registrationMessageId is undefined!");
		return;
	}
	// Check if reaction is on the correct message and emoji	
	if (reaction.message.channel.id === TournamentChannelId && reaction.message.id === registrationMessageId) {
		if (reaction.emoji.id === "1351413590120464456") { // Check for Coinhead reaction
		    if (!participants.includes(user.id)) {
		        participants.push(user.id); // Add user ID to list
                console.log(`✅ successfully registered: ${user.tag} (ID: ${user.id}) for the tournament`);
		    } else {
				console.log(`⚠️ ${user.username} is already registered.`);
				console.log("📃 Current Participants List:", participants);				
			}
		}
	}
});   

// 🔄 Handle participant unregistration if they remove their reaction
client.on('messageReactionRemove', async (reaction, user) => {
	if (user.bot) return; // Ignore bot reactions
	
	console.log(`🔄Unregistered: ${user.username} (ID: {user.id})`);
	console.log(`✅Updated Participants List:`, participants);
	
	if (reaction.message.id !== registrationMessageId) return; // Check for the correct message
	if (reaction.emoji.id !== "1351413590120464456") return; // Check for the correct emoji
	// Find and remove participants of the list
	const index = participants.indexOf(user.id);
		if (index !== -1) {
			participants.splice(index, 1);
			console.log(`🔄${user.username} (ID: ${user.id}) has unregistred.`);
		console.log("📃 Current Participants List:", participants);
	}
});
 
// Debugging command: Print current participants list
client.on('messageCreate', async (message) => {
    if (message.content === "!participants") {
        if (participants.length === 0) {
            message.channel.send(`🚫 No participants registered yet.`);
        } else {
            message.channel.send(`✅ Current Participants: ${participants.map(id => `<@${id}>`).join(", ")}`);
		}
	}
});

// 🔹 Command to manually start the tournament
client.on('messageCreate', async (message) => {
    if (message.content === "!startTournament" && message.channel.id === tournamentChannelId) {
		// 🟢 Debugging: Log all registered participants
        console.log("🔹 Current Registered Participants:", participants);
		
        if (participants.length < 2) {
            message.channel.send("⚠️ Not enough participants to start the tournament!");
            return;
        }

        shuffleParticipants();
        createPools();
        displayTournament(message.channel);
    }
});

// ✅ Command to stop the tournament
client.on('messageCreate', async (message) => {
    if (message.content === "!stopTournament") {
        if (participants.length === 0) {
            message.channel.send("⚠️ No tournament is currently running.");
            return;
        }

        // Reset everything
        participants.length = 0;
        pools = [];
        currentRound = 1;
        tournamentStartTime = null;

        message.channel.send("❌ The tournament has been canceled.");
        console.log("Tournament stopped by user.");
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
const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("Bot is running"));

app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Web server running on port ${PORT}`));

// Keep the process alive to prevent Fly.io from shutting it down
process.stdin.resume();

process.on("SIGINT", () => {
	console.log("⚠️ Bot is shutting down (SIGINT)...");
	process.exit(0);
});

process.on("SIGTERM", () => {
	console.log("⚠️ Bot received termination signal (SIGTERM), cleaning up...");
	process.exit(0);
});

// Log every 4 minutes to show the bot is running
setInterval(() => {
	console.log("✅ Bot is still running...");
}, 6000) // every 60 sec

// ✅ Connect the bot
client.login(process.env.TOKEN);
