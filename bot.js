require('dotenv').config();
console.log("Running HypeBot...");
var Discord = require('discord.js');
var logger = require('winston');
var schedule = require('node-schedule');
const { Console } = require('winston/lib/winston/transports');
const TOKEN = process.env.TOKEN;

// The below vars are the state of the bot
var scheduled = [];
var postHour;
var postMinute;
var currItem = 0;
var roleId;
var roleName;
var channelId = "";
var channelName;
var postMessage = "";
var currentlyPosting = false;
var timer;

// Below are the bot commands and descriptions.
var botCommands =
{
    help: "print this help message",
    status: "print a description of the bot's current setup",
    setpostmessage: "set a message to start with whenever posting from the scheduled list",
    curritem: "see which item the bot is going to post next",
    startover: "restart the schedule to post from the beginning again",
    setnextindex: "set the number of the item from the list to post next (see printlist for item numbers)",
    setnextitem: "set the item from the list to post to next",
    setchannel: "set the channel that you want the bot to automatically post to **(REQUIRED)**",
    settagrole: "set a role you want the bot to tag when it posts",
    startposting: "set the bot to begin posting at the configured time each day",
    stopposting: "cancel the bot's daily posting (when started again, it will pick up where it left off",
    setposttime: "set the time of day that you want the bot to post at **(REQUIRED)**",
    printlist: "print the list of items that the bot is posting from, numbered by their indices",
    removefromschedule: "remove an item from the schedule by item content",
    removeindex: "remove an item from the schedule by its index (see printlist for item numbers)",
    clearschedule: "empty the schedule list",
    addtoschedule: "add a list of dollar sign separated items to the schedule. (REQUIRED)",
    init: "initialize the bot with all required values to get started! Input channel, followed by time, followed by the list of items."

}
var botUsage =
{
    help: "*No Arguments*",
    status: "*No Arguments*",
    setpostmessage: "[Any message]",
    curritem: "*No Arguments*",
    startover: "*No Arguments*",
    setnextindex: "[Number from post list]",
    setnextitem: "[Value of item from post list]",
    setchannel: "[#channel_to_post_to]",
    settagrole: "[@role_to_tag]",
    startposting: "*No Arguments*",
    stopposting: "*No Arguments*",
    setposttime: "[hh:MM] [AM/PM] (Examples: 5:30 PM, 10:00 AM)",
    printlist: "*No Arguments*",
    removefromschedule: "[Value of item from post list]",
    removeindex: "[Number of item from post list]",
    clearschedule: "*No Arguments*",
    addtoschedule: "[Any message for item 1]$[Any message for item 2]$[Any message for item 3]$[Etc.]",
    init: "[#channel] [hh:MM] [AM/PM] [Item1]$[Item2]$[Etc]"
}

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';
// Initialize Discord Bot
var bot = new Discord.Client();

bot.once('ready', () => {
	console.log('Ready!');
});

bot.login(TOKEN);

bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
});

bot.on('message', message => {
    // Bot will listen for messages that will start with `!`
    if (message.content.substring(0, 1) == '!') {
        var args = message.content.substring(1).split(' ');
        var cmd = args[0];
       
        args = args.splice(1);
        switch(cmd) {
            case 'status':
                message.channel.send(getStatusString());
            break;
            case 'setpostmessage':
                postMessage = args.join(' ');
                message.channel.send("Posting message set to: " + postMessage);
            break;
            case 'curritem':
                if (scheduled.length != 0) {
                    message.channel.send("Next item is " + (currItem + 1) + ": " + scheduled[currItem]);
                } else {
                    message.channel.send("List is empty! There's nothing to post next.");
                }
            break;
            case 'startover':
                currItem = 0;
                if (scheduled.length != 0) {
                    message.channel.send("Set to start at the beginning,  item 1:  " + scheduled[currItem]);
                } else {
                    message.channel.send("Set to start at the beginning, though there's currently no items.");
                }
            break;
            case 'setnextindex':
                if (args.length == 1 && !isNaN(args[0])) {
                    var newIndex = parseInt(args[0]);
                    if (newIndex >= 1 && newIndex <= scheduled.length) {
                        currItem = newIndex - 1;
                        message.channel.send("Next item set to " + newIndex + ": " + scheduled[currItem]);
                    } else {
                        message.channel.send("Sorry, that number isn't in the list! See !printlist for valid indices.");
                    }
                } else {
                    message.channel.send("The index has to be a single number! Couldn't complete command.");
                }
            break;
            case 'setnextitem':
                if (args.length != 0) {
                    var newIndex = scheduled.indexOf(args.join(' '));
                    if (newIndex >= 0 && newIndex < scheduled.length) {
                        currItem = newIndex;
                        message.channel.send("Next item set to " + (newIndex + 1) + ": " + scheduled[currItem]);
                    } else {
                        message.channel.send("Sorry, that item isn't in the list! See !printlist for valid items.");
                    }
                } else {
                    message.channel.send("Nothing to set! You need to give me an item.");
                }
            break;
            case 'help':
                var helpStr =
                "Welcome to the Hype Bot Post Scheduler! Here are the commands: \n" +
                "---------------------------------------------------------------\n";
                var commands = Object.keys(botCommands);
                for (i = 0; i < commands.length; i++) {
                    helpStr += "**!" + commands[i] + "**: " + botCommands[commands[i]] + "\n";
                }
                message.channel.send(helpStr);
                helpStr = 
                "And below is how the commands are used:\n" +
                "---------------------------------------\n";
                for (i = 0; i < commands.length; i++) {
                    helpStr += "`!" + commands[i] + " " + botUsage[commands[i]] + "`\n";
                }
                message.channel.send(helpStr);
            break;
            case 'setchannel':
                setChannel(message);
            break;
            case 'settagrole':
                if (message.mentions.roles.size != 1) {
                    message.channel.send("Wrong number of roles! You need to give me one (1) role to tag.");
                    break;
                }
                var mentionedRole = message.mentions.roles.first();
                roleId = mentionedRole.id;
                roleName = mentionedRole.name;
                message.channel.send("Tag role set to @" + roleName);
            break;
            case 'startposting':
                if (currentlyPosting) {
                    message.channel.send("Already set to post!");
                } else if (canPost(message)){
                    var postTimeMillis = getPostTimeMillis();
                    var now = new Date();
                    message.channel.send("Posting at " + new Date(now.getTime() + postTimeMillis));
                    startPosting();
                    currentlyPosting = true;
                }
            break;
            case 'stopposting':
                if (currentlyPosting) {
                    timer.cancel();
                    message.channel.send("Posting canceled. To start again, run !startposting.");
                    currentlyPosting = false;
                } else {
                    message.channel.send("Already not set to post. I'm double canceled now ;)");
                }
                
            break;
            // !setposttime 10:00 PM
            case 'setposttime':
                setPostTime(message, args);
                if (currentlyPosting) {
                    timer.cancel();
                    startPosting();
                }
            break;
            case 'printlist':
                if (scheduled.length != 0) {
                    var scheduleList = "Here is the scheduled posting list!\n-------------------------------\n";
                    for (i = 0; i < scheduled.length; i++) {
                        scheduleList = scheduleList.concat(i+1, ": ", scheduled[i], "\n");
                    }
                    message.channel.send(scheduleList);
                } else {
                    message.channel.send("There's nothing to post! Add to the schedule using !addtoschedule.");
                }
            break;
            case 'removefromschedule':
                var str = args.join(' ');
                var index = scheduled.indexOf(str);
                if (index > -1) {
                    scheduled.splice(index, 1);
                    message.channel.send("Removed item " + (index + 1) + ": " + str + ".\n");
                } else {
                    message.channel.send("This item not found in the list: " + str + "\n");
                }
                
                if (args.length == 0) {
                    message.channel.send("Nothing to remove!");
                }
                checkStillPosting(message);
            break;
            case 'removeindex':
                for (i = 0; i < args.length; i++) {
                    if(!isNaN(args[i])) {
                        var index = parseInt(args[i]) - 1;
                        if (index > -1 && index <= scheduled.length) {
                            var removed = scheduled.splice(index, 1);
                            message.channel.send("Removed item " + (index + 1) + ": " + removed + ".\n")
                        } else {
                            message.channel.send("That index does not correspond to a number in the list. See !printlist for valid numbers.");
                        }
                    }
                }
                checkStillPosting(message);
            break;
            case 'clearschedule':
                scheduled = [];
                message.channel.send("Schedule cleared!");
                checkStillPosting(message);
            break;
            // !addtoschedule 
            case 'addtoschedule':
                addToSchedule(message, args);
            break;
            case 'init':
                setChannel(message);
                setPostTime(message, args.slice(1,3));
                addToSchedule(message, args.slice(3));
            break;
         }
     }
});

function startPosting() {
    //timer = schedule.scheduleJob(`${postMinute} ${postHour} * * *`, postFromSchedule);
    timer = schedule.scheduleJob(`${postMinute} * * * *`, () => {
        console.log("Here is a post.");
    });
    console.log("Next post is at " + timer.nextInvocation());
}

function checkStillPosting(message) {
    if (!canPost(message) && currentlyPosting) {
        message.channel.send("Posting canceled.");
        timer.cancel();
        currentlyPosting = false;
        return false;
    }
    return true;
}

function canPost(message) {
    var canPost = true;

    if (scheduled.length == 0) {
        canPost = false;
        message.channel.send("Can't post, the post list is empty.");
    }
    if (channelId == "") {
        canPost = false;
        message.channel.send("Can't post, the channel to post to is not set.");
    }
    if (typeof postHour == "undefined" || postMinute == "undefined") {
        canPost = false;
        message.channel.send("Can't post, the time to post at is not set.");
    }
    return canPost;
}

function addToSchedule(message, args) {
    var listStr = args.join(' ');
    var list = listStr.split('$');
    for (i = 0; i < list.length; i++) {
        scheduled.push(list[i]);
        message.channel.send("Added '" + list[i] + "' to list.");
    }
    if (list.length == 0) {
        message.channel.send("Nothing to add! I need a $-separated list of items after !addotschedule.");
    }
}

function setChannel(message) {
    if (message.mentions.channels.size != 1) {
        message.channel.send("Wrong number of channels! You need to tag one (1) channel to post to.");
        return;
    }
    channelId = message.mentions.channels.first().id;
    channelName = message.mentions.channels.first().name;
    message.channel.send("Posting channel set to #" + channelName);
}

function setPostTime(message, args) {
    if (args.length != 2) {
        message.channel.send("Wrong number of arguments! I need the time and AM/PM. Like this: \n `!setposttime 10:00 PM`");
        return;
    }
    var times = args[0].split(':');
    if (times.length != 2 || isNaN(times[0]) || isNaN(times[1])) {
        message.channel.send("Bad time format! The format should look like this: \n `!setposttime 10:00 PM`");
        return;
    }
    var newHour = parseInt(times[0]);
    var newMinute = parseInt(times[1]);

    if (!(newHour >= 0 && newHour < 24)) {
        message.channel.send("Hour is wrong! ".concat(newHour," is not a time of day."));
        return;
    }
    if (!(newMinute >= 0 && newMinute < 60)) {
        message.channel.send("Minute is wrong! It needs to be at least 0, and no more than 59.");
        return;
    }
    if (args[1] == "AM") {
        postHour = newHour;
    } else if (args[1] == "PM") {
        postHour = newHour + 12;
    } else {
        message.channel.send("Your second argument needs to be AM or PM!");
        return;
    }
    postMinute = newMinute;
    var displayMinute;
    if (newMinute <  10) {
        displayMinute = "0" + postMinute;
    } else  {
        displayMinute = postMinute;
    }
    message.channel.send("Posting time set to " + newHour + ":" + displayMinute + " " + args[1]);
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
    var msg = `${id}${postMessage} \n------\n**${item}**`;
    bot.channels.fetch(channelId)
    .then(
        // Run the below if channel fetch succeeded
        c => {sendPostAndCheckFinished(c, msg)}, 
        // Run the below if failed to fetch channel
        c => 
        {
              console.log(`Could not fetch channel to post to: ${c}`); 
              timer.cancel();
        });
}

function sendPostAndCheckFinished(c, msg) {
    c.send(msg); 
    if (currItem < scheduled.length - 1) {
        currItem += 1;
        console.log("Next post is at " + timer.nextInvocation());
    }
    else {
        currItem = 0;
        currentlyPosting = false;
        c.send(`-----------
*That was the last item in the list! Posting discontinued.
To begin again, simply type !startposting and I'll start from the beginning.
To start from a place other than the beginning, use !setindex.*`);
        timer.cancel();
    }
}

function getPostTimeMillis() {
    var now = new Date();
    var postDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), postHour, postMinute, 0);
    var millisTillPost = postDate.getTime() - now.getTime();
    console.log(millisTillPost);
    
    if (millisTillPost < 0) {
        console.log("Posting tomorrow");
        millisTillPost += 86400000; // it's after posting time, try tomorrow.
    }

    console.log("Posting at " + new Date(now.getTime() + millisTillPost));
    return millisTillPost;
}

function getStatusString() {
    var status = "Here is the current state of HypeBot:\n===========================\n"

    // First format the values to display
    var tagRole = "*NOT SET*";
    var postingChannel = "*NOT SET*";
    var displayTime = "*NOT SET*";
    var scheduleList = "**Posting List**:\n";
    var displayMessage = "*NOT SET*";
    var isPosting = "No";
    var displayItem = "*No items to post*";


    // Format posting list
    for (i = 0; i < scheduled.length; i++) {
        scheduleList = scheduleList.concat(i+1, ": ", scheduled[i], "\n");
    }
    if (scheduled.length == 0) {
        scheduleList = scheduleList.concat("*No items in list*");
    }

    // Format posting time
    if (typeof postHour != "undefined" && typeof postMinute != "undefined") {
        var displayHour = postHour;
        var displayMinute = "" + postMinute;
        var amOrPm = "AM";
        if (displayHour > 12) {
            displayHour -= 12;
            amOrPm = "PM";
        }
        if (postMinute < 10)  {
            displayMinute = "0" + postMinute;
        }
        displayTime = displayHour + ":" + displayMinute + " " + amOrPm;
    }
    
    // Format role to tag
    if (typeof roleName != "undefined") {
        tagRole = `@${roleName}`
    }

    // Format channel to post to
    if (typeof channelName != "undefined") {
        postingChannel = channelName;
    }
    
    // Format posting message
    if (postMessage != "") {
        displayMessage = postMessage;
    }

    // Format isPosting
    if (currentlyPosting) {
        isPosting = "Yes";
    }

    // Format current item
    if (scheduled.length != 0) {
        displayItem = (currItem + 1) + ": " + scheduled[currItem];
    }

    status += `**Role to tag:** ${tagRole}\n`;
    status += `**Channel to post to:** ${postingChannel}\n`;
    status += `**Posting time:** ${displayTime}\n`;
    status += `**Posting message:** ${displayMessage}\n`;
    status += `**Currently Posting:** ${isPosting}\n`;
    status += `**Next Item:** ${displayItem}\n`;
    status += `${scheduleList}`

    return status;
    
}
