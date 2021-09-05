require('dotenv').config();
console.log("Running HypeBot...");
var fs = require('fs');
var Discord = require('discord.js');
const TOKEN = process.env.TOKEN;

// The below vars are the state of the bot
var scheduled = [];
var currItem = 0;
var roleId = "623338510103085077";
var channelId = "760932105454092338";
var postMessage = "Here's today's question!";

// Initialize schedule
fs.readFile('schedule.txt', function(err, data) {
    scheduled = data.toString().split('\n');
    console.log("Schedule: " + scheduled);
});



// Initialize current item
fs.readFile('curritem.txt', function(err, data) {
    currItem = parseInt(data.toString());
    console.log("Current item: " + currItem);
});


// Initialize Discord Bot
var bot = new Discord.Client();

bot.once('ready', () => {
	console.log('Ready!');
});

bot.login(TOKEN).then(() => {
    if (canPost()) {
        postFromSchedule();
        fs.writeFile('curritem.txt', (currItem + 1).toString(), function(err) {
            if (err) throw err;
        });
    } else {
        bot.destroy();
    }
});

function canPost() {
    var canPost = true;

    if (scheduled.length == 0) {
        canPost = false;
    }
    if (channelId == "") {
        canPost = false;
    }

    if (currItem >= scheduled.length) {
        canPost = false;
    }
    return canPost;
}

function postFromSchedule() {
    console.log(new Date() + ": Scheduler pinged, posting");
    var item = scheduled[currItem];
    var id;
    if (typeof roleId == "undefined") {
        id = "";
    } else {
        id = `<@&${roleId}> `;
    }
    var msg = `${id}${postMessage} \n-----------\n**${item}**`;
    console.log("About to get channel");
    bot.channels.fetch(channelId)
    .then(
        // Run the below if channel fetch succeeded
        c => {sendPostAndCheckFinished(c, msg);}, 
        // Run the below if failed to fetch channel
        c => 
        {
              console.log(`Could not fetch channel to post to: ${c}`); 
        });
}

function sendPostAndCheckFinished(c, msg) {
    if (currItem + 1 >= scheduled.length) {
        msg.concat(`\n-----------
*That was the last item in the list! Posting discontinued.*`);
    }
    c.send(msg).then(() => {bot.destroy();console.log("Just destroyed");}); 
    console.log("After sending");
}
