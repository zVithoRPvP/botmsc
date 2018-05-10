const Discord = require("discord.js");
const YouTube = require('simple-youtube-api');
const ytdl = require('ytdl-core');
const PREFIX = "k!";
var prefix = "k!";

var client = new Discord.Client();
const youtube = new YouTube('AIzaSyA8LJ0PQBU7heQAeeXCs5npuRJ6dpj6Et8');

const queue = new Map();

client.on('warn', console.warn);

client.on('error', console.error);

client.on('ready', () => console.log('Yo this ready!'));

client.on('disconnect', () => console.log('Eu cai aqui , to reconectando novamente.'));

client.on('reconnecting', () => console.log('Estou reconectando agora!'));

client.on('message', async msg => { // eslint-disable-line
	if (msg.author.bot) return undefined;
	if (!msg.content.startsWith(PREFIX)) return undefined;

	const args = msg.content.split(' ');
	const searchString = args.slice(1).join(' ');
	const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
	const serverQueue = queue.get(msg.guild.id);

	let command = msg.content.toLowerCase().split(' ')[0];
	command = command.slice(PREFIX.length)

	if (command === 'tocar') {
		const voiceChannel = msg.member.voiceChannel;
		if (!voiceChannel) return msg.channel.send('Você precisa estar em um canal!');
		const permissions = voiceChannel.permissionsFor(msg.client.user);
		if (!permissions.has('CONNECT')) {
			return msg.channel.send('Não consigo conectar ao seu canal de voz , sem permissões!');
		}
		if (!permissions.has('SPEAK')) {
			return msg.channel.send('Não consigo falar no seu canal de voz , sem permissão!');
		}

		if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
			const playlist = await youtube.getPlaylist(url);
			const videos = await playlist.getVideos();
			for (const video of Object.values(videos)) {
				const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
				await handleVideo(video2, msg, voiceChannel, true); // eslint-disable-line no-await-in-loop
			}
			return msg.channel.send(`✅ Playlist: **${playlist.title}** Foi adicionada á lista!`);
		} else {
			try {
				var video = await youtube.getVideo(url);
			} catch (error) {
				try {
					var videos = await youtube.searchVideos(searchString, );
					let index = 0;
					msg.channel.send(`
__**Seleção de música:**__
${videos.map(video2 => `**${++index} -** ${video2.title}`).join('\n')}
Por favor escolha um número de 1 a 10.
					`);
					// eslint-disable-next-line max-depth
					try {
						var response = await msg.channel.awaitMessages(msg2 => msg2.content > 0 && msg2.content < 11, {
							maxMatches: 1,
							time: 10000,
							errors: ['time']
						});
					} catch (err) {
						console.error(err);
						return msg.channel.send('Valor entrado inválido');
					}
					const videoIndex = parseInt(response.first().content);
					var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
				} catch (err) {
					console.error(err);
					return msg.channel.send('Não consegui achar resultados.');
				}
			}
			return handleVideo(video, msg, voiceChannel);
		}
	} else if (command === 'pular') {
		if (!msg.member.voiceChannel) return msg.channel.send('Você precisa estar em um canal de voz!');
		if (!serverQueue) return msg.channel.send('Não está tocando nada.');
		serverQueue.connection.dispatcher.end('Música skippada!');
		return undefined;
	} else if (command === 'parar') {
		if (!msg.member.voiceChannel) return msg.channel.send('Você precisa estar em um canal de voz!!');
		if (!serverQueue) return msg.channel.send('Não está tocando nada.');
		serverQueue.songs = [];
		serverQueue.connection.dispatcher.end('Parei a música!');
		return undefined;
	} else if (command === 'volume') {
		if (!msg.member.voiceChannel) return msg.channel.send('Você precisa estar em um canal de voz!');
		if (!serverQueue) return msg.channel.send('Não está tocando nada.');
		if (!args[1]) return msg.channel.send(`Volume atual é: **${serverQueue.volume}**`);
		serverQueue.volume = args[1];
		serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);
		return msg.channel.send(`Setei o volume para: **${args[1]}**`);
	} else if (command === 'tocando') {
		if (!serverQueue) return msg.channel.send('Não está tocando nada.');
		return msg.channel.send(`🎶 Tocando agora: **${serverQueue.songs[0].title}**`);
	} else if (command === 'lista') {
		if (!serverQueue) return msg.channel.send('Nada tocando.');
		return msg.channel.send(`
__**Lista de musicas:**__
${serverQueue.songs.map(song => `**-** ${song.title}`).join('\n')}
**Tocando agora:** ${serverQueue.songs[0].title}
		`);
	} else if (command === 'pausar') {
		if (serverQueue && serverQueue.playing) {
			serverQueue.playing = false;
			serverQueue.connection.dispatcher.pause();
			return msg.channel.send('Pausei a música pra tu , pra voltar é só digitar k!resume.');
		}
		return msg.channel.send('Não está tocando nada.');
	} else if (command === 'resumir') {
		if (serverQueue && !serverQueue.playing) {
			serverQueue.playing = true;
			serverQueue.connection.dispatcher.resume();
			return msg.channel.send('▶ Música resumida!');
		}
		return msg.channel.send('Nada tocando.');
	}

	return undefined;
});

async function handleVideo(video, msg, voiceChannel, playlist = false) {
	const serverQueue = queue.get(msg.guild.id);
	const song = {
		id: video.id,
		title: (video.title),
		url: `https://www.youtube.com/watch?v=${video.id}`
	};
	if (!serverQueue) {
		const queueConstruct = {
			textChannel: msg.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 5,
			playing: true
		};
		queue.set(msg.guild.id, queueConstruct);

		queueConstruct.songs.push(song);

		try {
			var connection = await voiceChannel.join();
			queueConstruct.connection = connection;
			play(msg.guild, queueConstruct.songs[0]);
		} catch (error) {
			console.error(`Deu um erro aqui: ${error}`);
			queue.delete(msg.guild.id);
			return msg.channel.send(`Deu um erro aqui: ${error}`);
		}
	} else {
		serverQueue.songs.push(song);
		if (playlist) return undefined;
		else return msg.channel.send(`✅ **${song.title}** Foi adicionado á lista!`);
	}
	return undefined;
}

function play(guild, song) {
	const serverQueue = queue.get(guild.id);

	if (!song) {
		serverQueue.voiceChannel.leave();
		queue.delete(guild.id);
		return;
	}

	const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
		.on('end', reason => {
			if (reason === 'Stream is not generating quickly enough.');
			serverQueue.songs.shift();
			play(guild, serverQueue.songs[0]);
		})
		.on('error', error => console.error(error));
	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

	serverQueue.textChannel.send(`🎶 Começou a tocar: **${song.title}**`);
}

client.on('message', msg => {
    if(msg.author.bot) return;
    if(msg.content.startsWith('k!help')){
    msg.channel.send('**MÚSICA** \n k!tocar Para tocar uma música! \n k!parar Para parar a música! \n k!tocando Para saber o que está tocando! \n k!lista Para ver a lista de músicas! \n k!pausar Para pausar a música! \n k!resumir Para resumir a música pausada! \n k!volume Para alterar o volume do bot! \n k!pular Para pular a música!');
}

})

client.on('message', msg => {
    if(msg.author.bot) return;
    if(msg.content.startsWith('k!ping')){
    msg.channel.send(Math.round(client.ping));
}

})







client.login(process.env.TOKEN);
