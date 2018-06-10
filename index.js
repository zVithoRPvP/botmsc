const Discord = require("discord.js");
const YouTube = require('simple-youtube-api');
const ytdl = require('ytdl-core');
const PREFIX = "kk!";
const JSONdb = require('simple-json-db');
var prefix = "kk!";
const db = new JSONdb("./database.json");
const fs = require('fs')
var databaseteste = require("./umdatabaseteste.js")





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
		if (!serverQueue) return msg.channel.send(' Nada tocando.');
		return msg.channel.send(`
__**Lista de musicas:**__
${serverQueue.songs.map(song => `**-** ${song.title}`).join('\n')}
**Tocando agora:** ${serverQueue.songs[0].title}
		`);
	} else if (command === 'pausar') {
		if (serverQueue && serverQueue.playing) {
			serverQueue.playing = false;
			serverQueue.connection.dispatcher.pause();
			return msg.channel.send('Pausei a música pra tu , pra voltar é só digitar kk!resume.');
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
		else return msg.channel.send(`<:correto:438399398733414401> **${song.title}** Foi adicionado á lista!`);
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

	serverQueue.textChannel.send(`<:correto:438399398733414401> Começando a tocar a música **${song.title}**`);
}






client.on('message', msg => {

	if(msg.channel.type === "dm") return;
const mention = msg.mentions.users.first();
let messageArray = msg.content.split(" ");
let args = messageArray.slice(1);
let cmd = messageArray[0];

if(cmd === 'kk!report'){
	let rUser = msg.guild.member(msg.mentions.users.first());
	if(!rUser) return msg.channel.send('Não consegui achar esse membro!');
	let reason = args.join(" ").slice(22)

	let embed = new Discord.RichEmbed()
	.setThumbnail(rUser.avatarURL)
	.setDescription('Uma pessoa foi reportada!!')
	.setTitle('REPORT')
	.addField('Pessoa reportada:', `${rUser}`)
	.addField('Reportado por:', `${msg.author} Com o ID: ${msg.author.id}`)
	.addField('Razão do report:', reason)
	.setFooter(`Comando feito por: ${msg.author.username}`)
	.setColor('#0e0f0e')

	let reportchannel = msg.guild.channels.find('name', "starters");
	if(!reportchannel) return msg.channel.send('Precisa ter um canal específico para isso');

	msg.delete().catch(O_o=>{})
	msg.channel.send('<:correto:438399398733414401> Usuário reportado com sucesso - pelo motivo:');
	msg.channel.send(reason)

	reportchannel.send(embed)
}
  if(cmd === 'kk!add'){
	if (msg.author.id !== "202614106962919424") return msg.channel.send('Apenas meu dono dollynho pode usar esse comando!');
	if(msg.author.bot) return;
	  if(!mention) return msg.channel.send('Quem você deseja adicionar?');
	  msg.channel.send('Usuário mencionado adicionado!!!');
	  db.set(mention.id, '/Usuário adicionado/') ;
	  console.log(`${msg.author.username} Adicionou ${mention.username}`);
	  // if(!db.has(msg.author.id)) return msg.channel.send('Sem permissão');
      // command args0 args1 args2 args3 args4 args5
}else if(cmd === 'kk!remove'){
 const unban = msg.mentions.users.first();
 if(!unban) return msg.channel.send('Quem você gostaria de remover?');
 db.delete(mention.id)
 msg.channel.send('Usuário removido com sucesso.');
}
if(cmd === 'kk!help'){
 var helpembed = new Discord.RichEmbed()
  .setThumbnail(msg.author.avatarURL)
  .setTitle('Ajuda do BOT')
  .setDescription('Esta é uma lista de comandos do bot')
  .addField('COMANDOS DE MÚSICA!', 'kk!tocar')
  .addField( 'kk!parar', 'kk!volume')
  .addField( 'kk!tocando', 'kk!pausar')
  .addField( 'kk!resumir', 'kk!pular')
  .addBlankField()
  .addField('Comandos especiais (apenas membros que eu adicionar podem usar)', 'kk!eval')
  .addBlankField()
  .addField('Comandos para diversão! (eu acho inúteis)', 'kk!rasengan')
  .addField('kk!susanoo', 'kk!modohacker')
  .addField('kk!centipedeinyourears','Só isso')
  .setAuthor('zVithoRPvP#7805')
  .setColor('#2bba0e')

  msg.author.send(helpembed)
  msg.channel.send('Enviei uma lista de comandos no seu privado , acesse lá :D')


}
if(cmd === 'kk!eval'){
	try {
	if(!db.has(msg.author.id)) return msg.channel.send('Sem permissão');
	var codigo = args.join(" ").slice(8)
	var resultado = eval(codigo);
	if(!codigo) return  msg.reply('Você precisa descrever um código')
	var evalembed = new Discord.RichEmbed()
	.setTitle('EVAL')
	.addField('Entrada:', codigo)
	.addField('Saída:', resultado)
    .setFooter(`Comando feito por: ${msg.author.username}`)
	.setColor('#05275e')
	
	msg.channel.send(evalembed);
	console.log(`Ocorreu um EVAL feito por ${msg.author.username}`)
	} catch(err) {
		msg.channel.send(err)
	}
}
if(cmd === 'kk!rasengan'){
	var alvo = msg.mentions.users.first()
	if(!alvo) return msg.reply('Você precisa escolher um alvo!')
	var rasenganfile = new Discord.Attachment()
	.setAttachment('https://media.tenor.com/images/34c5d041263e2b89d137639836fdd881/tenor.gif','rasengandokaneki.gif')

    msg.channel.send('Você <@' + msg.author.id + '> usou um Rasengan em <@' + alvo.id + ">",rasenganfile)
}
if(cmd === 'kk!susanoo'){
	var susanofile = new Discord.Attachment()
	.setAttachment('https://media1.tenor.com/images/23063a29107056820f59355f79374840/tenor.gif','susanoodokaneki.gif')

    msg.channel.send('Você <@' + msg.author.id + '> ativou seu susano para se defender e ficar blindão',susanofile)
}
if(cmd === 'kk!modohacker'){
	var kaneki1file = new Discord.Attachment()
	.setAttachment('https://i.makeagif.com/media/4-07-2015/01k4pr.gif','modohackerdokaneki.gif')

    msg.channel.send('Você <@' + msg.author.id + '> Ativou o modo hacker do kaneki , o mais fodástico e você consegue matar o jason',kaneki1file)
}
if(cmd === 'kk!centipedeinyourears'){
	var centipedeinyourearsfile = new Discord.Attachment()
	.setAttachment('https://i.pinimg.com/originals/69/5e/d7/695ed78c1acfe15c360020f5af903080.gif','centipedeinyourearsdokaneki.gif')

    msg.channel.send('Você <@' + msg.author.id + '> Consegue retirar uma centopéia de seus ouvidos!',centipedeinyourearsfile)
}
if(cmd === 'kk!'){
	msg.channel.send('O que você gostaria de fazer?')
}
if(cmd === 'kk!botinfo'){
	var Botinfoembed = new Discord.RichEmbed()
	.setFooter(`Comando utilizado por: ${msg.author.username}`)
	.setTitle('Informações do KanekiKen!')
	.setDescription('Meu nome é Kaneki, fui criado pelo zVithoRPvP#7805')
	.addField(':speaking_head:️ Minha linguagem:', 'JavaScript', true)
	.addField(':books: Minha livraria:', 'Discord.js', true)
	.addField('Para ver meus comandos utilize:','kk!help', true)
	.setThumbnail('https://image.freepik.com/icones-gratis/roda-com-engrenagens_318-64451.jpg')
	.setAuthor(msg.author.tag)

	msg.channel.send(Botinfoembed)
 }
 if(cmd === 'kk!serverinfo'){
   var serverinfoembed = new Discord.RichEmbed()
   .setFooter(`Comando utilizado por: ${msg.author.username}`)
   .setTitle(`Informações de ${msg.guild.name}`)
   .addField('Dono:', `${msg.guild.owner}`, true)
   .addField('Membros:', `${msg.guild.memberCount}`)
   .addField('<:gordox:432410931297779712> Número total de canais:', `${msg.guild.channels.size}`)
	
   
    msg.channel.send(serverinfoembed)

    
}


})
client.login('NDQ0MjUyNTIyNTk3NzExODcz.DeyqwQ.SQ1U9LDSSWAvuauEmut-mQ5aLeU');