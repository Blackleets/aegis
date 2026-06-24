const { config } = await import('dotenv');
const { Client, GatewayIntentBits, EmbedBuilder } = await import('discord.js');

config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on("ready", async () => {
    console.log("[AEGIS] Preparing to send announcement...");
    const guild = client.guilds.cache.first();
    if (!guild) {
        console.log("No guild found.");
        process.exit(1);
    }

    try {
        let targetChannel = guild.channels.cache.find(c => c.name.includes("announce") || c.name === "general" || c.type === 0);
        
        if (!targetChannel) {
            console.log("No suitable text channel found.");
            process.exit(1);
        }

        const embed = new EmbedBuilder()
            .setColor("#D4AF37")
            .setTitle("🚀 MASSIVE RECON TOOLKIT UPGRADE DEPLOYED")
            .setDescription("**Attention @everyone!**\n\nWe just deployed a huge update to the AEGIS OSINT Platform, and the Recon Toolkit is now vastly more powerful.\n\n**Here is what is new in the toolkit:**\n\n📱 **Phone Intel Node**: Perform carrier and region lookups globally.\n🏴‍☠️ **Data Leaks Node**: Scan massive databases to see if emails have been exposed.\n🐙 **GitHub Recon**: Pull deep intelligence and language stats on target developers.\n🔍 **Shodan Integration**: We have implemented a slick new integration for host scanning.\n🌐 **BGP & MAC**: Major upgrades to networking and hardware tracing accuracy.\n\nThe server has been fully updated with zero downtime, and all scanners are live now. Go test them out!\n\nStay sharp, team. 👁️")
            .setFooter({ text: "AEGIS Core Systems" })
            .setTimestamp();

        await targetChannel.send({ content: "@everyone", embeds: [embed] });
        console.log("[AEGIS] Announcement sent successfully!");
        
        setTimeout(() => process.exit(0), 3000);

    } catch (e) {
        console.error("Failed to send announcement:", e);
        process.exit(1);
    }
});

client.login(process.env.DISCORD_TOKEN);
