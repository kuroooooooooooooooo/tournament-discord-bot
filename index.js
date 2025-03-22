require('dotenv').config();
console.log("Token chargé :", process.env.TOKEN); // Vérification du token
const { Client, GatewayIntentBits, EmbedBuilder, Colors, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMessageReactions, // Required for tracking reaction
		GatewayIntentBits.GuildMembers // Required to get user info in reactions
    ],
	partials: [
        Partials.Message,
		Partials.Channel,
		Partials.reaction
	]
	
});

let registrationMessageId= null;
let participants  = [];
let players = [];
let bracket = [];
let tournamentStarTime = null;
let currentRound = 1;
let playersNumbers = {};
const tournamentChannelId = "1337487554056028270";

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

            // Use original UTC formatting
        const formattedTime = tournamentStartTime.toUTCString();

        try {
            // Send confirmation message
            const confirmationMessage = await message.channel.send(`✅ Tournament scheduled for **${formattedTime} (UTC)**.`);
			const reactionMessage = await message.channel.send(`Register by reacting to the Pokeball.`);
			registrationMessageId = reactionMessage.id; // Stock message ID
			console.log("📌 Stored Registration Message ID:", registrationMessageId);

            // Proceed with scheduling the tournament
			setTimeout(async () => {
				try {
					await reactionMessage.react("<:CoinHead:1351413590120464456 >")
					console.log("✅ Added CoinHead reaction!")
				} catch (emojiError) {
					console.error("❌ Failed to add CoinHead reaction:", emojiError);
				}
			}, 500);
			
			// ✅ Schedule the tournament
			scheduleTournamentStart();
		} catch (error) {
			console.error("❌ Error scheduling tournament:", error);
		}
	}
});

// ✅ Handle participant registration via reactions
client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return; // Ignore bot reactions

    console.log(`✅ Reaction detected: ${reaction.emoji.name} (ID: ${reaction.emoji.id}) by ${user.tag}`);

    if (reaction.message.partial) {
        try {
            await reaction.message.fetch();
            console.log('✅ Message successfully fetched');
        } catch (error) {
            console.error('❌ Error fetching message:', error);
            return;
        }
    }

    console.log(`📌 Checking message ID: ${reaction.message.id}, expected: ${registrationMessageId}`);

    if (reaction.message.id !== registrationMessageId) {
        console.log('⚠️ Ignoring reaction: Message ID does not match');
        return;
    }

    console.log(`📌 Checking emoji ID: ${reaction.emoji.id}, expected: "1351413590120464456"`);

    if (reaction.emoji.id !== "1351413590120464456") {
        console.log('⚠️ Ignoring reaction: Emoji does not match');
        return;
    }

    console.log('✅ Reaction passed all checks, adding user to participants');

    if (!participants.includes(user.id)) {
        participants.push(user.id);
        console.log(`✅ Successfully registered: ${user.username} (ID: ${user.id})`);
    } else {
        console.log(`⚠️ ${user.username} is already registered`);
    }

    console.log("📜 Current Participants List:", participants);
});
				
//  Handle participant unregistration if they remove their reaction
client.on('messageReactionRemove', async (reaction, user) => {
    if (user.bot) return; // Ignore bot reactions

    console.log(`🔄 Reaction removed: ${reaction.emoji.name} (ID: ${reaction.emoji.id}) by ${user.tag}`);

    // Fetch the message if it's partial
    if (reaction.message.partial) {
        try {
            await reaction.message.fetch();
            console.log('✅ Message successfully fetched for removal check.');
        } catch (error) {
            console.error('❌ Error fetching message:', error);
            return;
        }
    }

    console.log(`📌 Checking message ID: ${reaction.message.id}, expected: ${registrationMessageId}`);

    if (reaction.message.id !== registrationMessageId) {
        console.log('⚠️ Ignoring reaction removal: Message ID does not match.');
        return;
    }

    console.log(`📌 Checking emoji ID: ${reaction.emoji.id}, expected: "1351413590120464456"`);

    if (reaction.emoji.id !== "1351413590120464456") {
        console.log('⚠️ Ignoring reaction removal: Emoji does not match.');
        return;
    }

    console.log('✅ Reaction removal passed all checks, removing user from participants.');

    // Find and remove the participant
    const index = participants.indexOf(user.id);
    if (index !== -1) {
        participants.splice(index, 1);
        console.log(`🔄 Unregistered: ${user.username} (ID: ${user.id})`);
        console.log("📜 Updated Participants List:", participants);
    } else {
        console.log("⚠️ User was not in the list!");
    }
});

//  Debugging command: Print current Participants list
client.on('messageCreate', async (message) => {
    if (message.content === "!Participants") {
        if (participants.length === 0) { //  Fixed variable name
            message.channel.send("❌ No participants registered yet.");
        } else {
            message.channel.send(`✅ Current participants: ${participants.map(id => `<@${id}>)`).join(", ")}`);
        }
    }
});

// Function to shuffle an array using Fisher-Yates algorithm
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
}

// 🔹 Create tournament brackets
function createTournamentBracket(players) {
	let bracket = []
	playerNumbers = {}; // Store number emojis for each player
	let availableNumbers = Array.from({ length: players.length }, (_, i) => (i  +  1).toString()); //["1","2","3",...]
	shuffleArray(availableNumbers); //shuffle number randomly
	
    // Assign a unique number emoji to each player
    players.forEach((player, index) => {
        playerNumbers[player] = availableNumbers[index]; // Player 1 = randomnumber Player 2 = randomnumber  etc.
    });

    // Pair players for first round
    for (let i = 0; i < players.length; i += 2) {
        if (i + 1 < players.length) {
            bracket.push([players[i], players[i + 1]]);
        } else {
            // If odd number of players, last player gets an auto-win
            bracket.push([players[i], "AUTO_WIN"]);
        }
    }

    return bracket;
}

//🔹 Tournament structure creation
function startTournament(channel) {
    console.log("🏆 Tournament is starting!");

    if (participants.length < 2) {
        console.log("❌ Not enough participants to start the tournament.");
        return;
    }
    players = [...participants]; // Copy participants into players list
    bracket = createTournamentBracket(players);  // Create 1v1 bracket
    displayTournament(channel, bracket);  // Show tournament matches

    console.log("✅ Tournament has started!");
}

// 🔹 Schedule automatic tournament start
function scheduleTournamentStart() {
    if (!tournamentStartTime) return;

    const currentTime = new Date();
    const timeUntilStart = tournamentStartTime - currentTime;

    if (timeUntilStart <= 0) {
        // If time has passed, start immediately
        console.log('Scheduled tournament time reached, starting now...');
        startTournament(client.channels.cache.get(tournamentChannelId));
    } else {
        // Otherwise, schedule the start
        console.log(`The tournament will start at ${tournamentStartTime.toLocaleString()}.`);
        setTimeout(() => {
            console.log('Scheduled tournament time reached, starting now...');
            startTournament(client.channels.cache.get(tournamentChannelId));
        }, timeUntilStart);
    }
}

//  Command to manually start the tournament
client.on('messageCreate', async (message) => {
    if (message.content === "!startTournament" && message.channel.id === tournamentChannelId) {
        // ✅ Debugging: Log all registered Participants
        console.log("🔹Current Registered Participants:", participants);
		startTournament(message.channel);
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
        bracket = [];
        currentRound = 1;
        tournamentStartTime = null;

        message.channel.send("❌ The tournament has been canceled.");
        console.log("Tournament stopped by user.");
    }
});

// 🔹 Advance to the next round
client.on("messageReactionAdd", async (reaction, user) => {
    if (user.bot) return; // Ignore bot reactions

    let matchIndex = bracket.findIndex(match => match.includes(user.id));
    if (matchIndex === -1) return; // Player not in a match

    let match = bracket[matchIndex];
    let winner = user.id;
    let loser = match.find(p => p !== winner);

    // Validate if the reaction matches the player's assigned number
    if (reaction.emoji.name !== playerNumbers[winner].toString()) return; // Ignore wrong reactions

    console.log(`🏆 Match ${matchIndex + 1} winner: <@${winner}>`);

    // Move winner to the next round bracket
    nextBracket.push(winner);

    // Remove the loser from active tournament
    players = players.filter(id => id !== loser);
    delete playerNumbers[loser]; // Remove their assigned number

    // Increment the number of completed matches
    completedMatches++;

    console.log(`✅ Match ${matchIndex + 1} completed. ${completedMatches}/${currentRoundMatches} matches finished.`);

    // Check if all matches in the round are completed
    if (completedMatches >= currentRoundMatches) {
        console.log("✅ All matches completed! Advancing to next round...");
        completedMatches = 0; // Reset for the next round
        currentRoundMatches = Math.floor(nextBracket.length / 2); // Update match count for next round

        // If only one player remains, declare the winner
        if (nextBracket.length === 1) {
            reaction.message.channel.send(`🏆 **Congratulations to <@${nextBracket[0]}>! Champion of the tournament!** 🎉`);
            return;
        }

        // Create new matchups and update the tournament bracket
        bracket = [];
        for (let i = 0; i < nextBracket.length; i += 2) {
            if (i + 1 < nextBracket.length) {
                bracket.push([nextBracket[i], nextBracket[i + 1]]);
            } else {
                bracket.push([nextBracket[i], "AUTO_WIN"]);
            }
        }
        nextBracket = []; // Clear nextBracket for the next round
        displayTournament(reaction.message.channel, bracket); // Update bracket display
    }
});

// 🔹 Check for tournament completion
function checkNextRound(channel) {
    if (participants.length === 1) {
        channel.send(`🏆 **Congratulations to <@${participants[0]}> who wins the tournament!** 🏆`);
        participants.length = 0; // Reset
        return;
    }

    currentRound++;
    createTournamentBracket(channel);
    displayTournament(channel);
}

// 🔹 Display tournament brackets
async function displayTournament(channel, bracket) {
	let embed = new EmbedBuilder()
		.setTitle("Tournament Bracket")
		.setColor("#3498db");
	bracket.forEach((match, index) => {
        let player1 = `(${playerNumbers[match[0]]}) <@${match[0]}>`;
        let player2 = match[1] === "AUTO_WIN" 
            ? " Auto Win" 
            : `(${playerNumbers[match[1]]}) <@${match[1]}>`;

        embed.addFields({
            name: `Match ${index + 1}`,
            value: `${player1} vs ${player2}`,
            inline: false
        });
	});
	
	// Create buttons for each match
  const matchButtons = bracket.map((match) => {
    return new ActionRowBuilder().addComponents(
      ...match.map((playerId) =>
        new ButtonBuilder()
          .setCustomId(`win_${playerId}`)
          .setLabel(`${playerNumbers[playerId]}`)
          .setStyle(ButtonStyle.Primary)
		)
	)	
});	
   
  // Send the tournament embed with buttons
  const tournamentMessage = await channel.send({
        embeds: [embed],
        components: matchButtons
    });
	
    return tournamentMessage;
  }

client.on('interactionCreate', async interaction => {
	try {
		if (!interaction.isButton()) return;
		
		const winnerId = interaction.customId.replace('win_', '');
		const userId = interaction.user.id;
		
		// refused if reaction doesn't comme from corresponding player
		if (userId !== winnerId) {
			await interaction.reply({
				content: `You cannot click there MOFO.`,
				flags: 64 // équivalent de ephemeral: true
			});
			return;
		}
		// Vérifie si le joueur est bien dans un match du round actuel
		let matchIndex = bracket.findIndex(match => match.includes(winnerId));
		if (matchIndex === -1) return;
		
		let match = bracket[matchIndex];
		let loser = match.find(p => p !== winnerId);
		
		// Met à jour le bracket
		bracket[matchIndex] = [winnerId, "AUTO_WIN"];
		
		await interaction.reply({
			content: `Victoire enregistrée pour <@${winnerId}>`,
			flags: 64
		});
		
		// Vérifie si tous les matchs du round sont terminés
		let allDone = bracket.every(match => match[1] === "AUTO_WIN");
		if (allDone) {
			currentRound++;
			displayTournament(interaction.channel, bracket);
		}
	} catch (error) {
		console.error("Error handling button interaction:", error);
		try {
			await interaction.reply({
				content: "YOU trying TO BREAK DA BOT?!",
				flags: 64
			});
		} catch (_) {
			// Silently ignore any fallback error
		}
	}
});
		
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