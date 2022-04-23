"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const dotenv = __importStar(require("dotenv"));
const Discord = __importStar(require("discord.js"));
const mongo = __importStar(require("mongodb"));
const express_1 = __importDefault(require("express"));
dotenv.config();
const APP = (0, express_1.default)();
const PORT = 3000;
APP.get('/', (req, res) => res.send('UCSB AIChE LinkedIn Bot!'));
APP.listen(PORT, () => console.log(`Closet bot app listening at http://localhost:${PORT}`));
const client = new Discord.Client({
    intents: [
        Discord.Intents.FLAGS.GUILDS,
        // Discord.Intents.FLAGS.GUILD_MEMBERS,
        Discord.Intents.FLAGS.GUILD_MESSAGES,
        Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS
        // Discord.Intents.FLAGS.GUILD_VOICE_STATES,
    ],
}); // Client requires one parameter, which is intents.
if (!client) {
    throw new Error("Client is undefined");
}
else {
}
if (client && client.options && client.options.http) {
    client.options.http.api = "https://discord.com/api"; // Avoid 429 Status: https://support.glitch.com/t/discord-bot-not-connecting-or-429-status-code/28349
}
else {
    throw new Error("Something unexpected happened with the client options");
}
// MongoDB client
const mongoclient = new mongo.MongoClient(process.env.MONGO_DB_CONNECTION); // Use the ! for non null assertion operator: https://stackoverflow.com/questions/54496398/typescript-type-string-undefined-is-not-assignable-to-type-string
// Connect to MongoDB, you only have to do this once at the beginning
const MongoConnect = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield mongoclient.connect();
    }
    catch (e) {
        console.error(e);
    }
});
MongoConnect();
client.on("ready", () => {
    var _a;
    console.log(`Logged in as ${(_a = client.user) === null || _a === void 0 ? void 0 : _a.tag}!`); // Use ? to enable this to be undefined: https://stackoverflow.com/questions/37632760/what-is-the-question-mark-for-in-a-typescript-parameter-name
});
const defaultFt = 1.0;
const commandList = ["!movein", "!evict", "!upgrade", "!downgrade", "!ft"];
client.on('messageCreate', (msg) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    // console.log(msg.content);
    // console.log(msg.author);
    // console.log(ParseMention(msg.content));
    const channel = client.channels.cache.get(msg.channelId);
    if (msg.content === "!tenants") {
        let closet = yield mongoclient.db().collection("closet");
        // get list of all tenants and square footage, anyone can do this
        // embed message
        let embed = new Discord.MessageEmbed().setColor("#F1C40F");
        let globalClosetSpace = 0;
        const allTenants = yield closet.find();
        if ((yield closet.estimatedDocumentCount()) === 0) {
            embed.setDescription("No one's gonna live in Dylan's closet... sadge.");
        }
        else {
            yield allTenants.forEach((tenant) => {
                embed.addField(tenant.name, tenant.ft + " ft^2");
                if (tenant.ft > 0) {
                    globalClosetSpace += tenant.ft;
                }
            });
            embed.setTitle(`Dylan's Future Closet Tenants - ${globalClosetSpace} ft^2 large`);
            channel.send({ embeds: [embed] });
        }
    }
    else if (msg.author.id === "129686495303827456") {
        let closet = yield mongoclient.db().collection("closet");
        // only I have control of this bot
        if (msg.content.includes("!movein")) {
            // arguments: @mention and name
            const args = (0, util_1.SplitArgs)(msg.content);
            if (args.length < 2) {
                channel.send("You need the @mention and their legal name as arguments.");
            }
            else {
                // get the id and the name out
                const mention = args.shift();
                if (!mention) {
                    // do nothing
                    channel.send("You need the @mention to move someone in");
                    return;
                }
                const id = (0, util_1.ParseMention)(mention);
                const name = args.join(" "); // make the rest of the message their name
                // add user to closet list with default 1 square foot space
                let someCursor = yield closet.findOne({ id: id });
                if (someCursor) {
                    channel.send(`${name} has already moved into the closet!`);
                }
                else {
                    yield closet.insertOne({
                        id: id,
                        name: name,
                        ft: defaultFt
                    });
                    // send verification message
                    channel.send(`${name} has moved into Dylan's closet!`);
                }
            }
        }
        else if (msg.content.includes("!evict")) {
            // remove user from the database
            // arguments: @mention
            const args = (0, util_1.SplitArgs)(msg.content);
            if (args.length < 1) {
                channel.send("You need the @mention to evict someone!");
            }
            else {
                // get the id and the name out
                const mention = args.shift();
                if (!mention) {
                    // do nothing
                    channel.send("You need the @mention to evict someone.");
                    return;
                }
                const id = (0, util_1.ParseMention)(mention);
                // add user to closet list with default 1 square foot space
                let someCursor = yield closet.findOne({ id: id });
                if (!someCursor) {
                    channel.send(`That person does not currently own any square feet in the closet. Perhaps they're an illegal squatter...`);
                }
                else {
                    const name = someCursor.name;
                    closet.deleteOne({
                        id: id,
                    });
                    // send verification message
                    channel.send(`${name} has been **EVICTED**. No square feet for them!`);
                }
            }
        }
        else if (msg.content.includes("!upgrade")) {
            // add random square footage weighted?
            // arguments: @mention and number of + for the factor
            const args = (0, util_1.SplitArgs)(msg.content);
            if (args.length < 2) {
                channel.send("You need the @mention and a plus factor to give someone more square feet!");
            }
            const mention = args.shift();
            if (!mention) {
                // do nothing
                channel.send("You need the @mention to give someone more square feet.");
                return;
            }
            const id = (0, util_1.ParseMention)(mention);
            if (!args[0].includes("+")) {
                channel.send("Missing at least one plus (+)! Can't add square feet!");
            }
            // figure out the weight
            const plusFactor = (_a = args[0].match(/\+/g)) === null || _a === void 0 ? void 0 : _a.length;
            let increase;
            if (plusFactor) {
                increase = (0, util_1.RandomFt)(plusFactor);
            }
            else {
                channel.send("There was an issue figuring out the plusFactor. Code the bot better next time...");
                return;
            }
            // store in database
            const someCursor = yield closet.findOne({ id: id });
            if (!someCursor) {
                channel.send("That person you're increasing square feet of doesn't seem to have moved in yet!");
            }
            else {
                // increase feet
                const newFootage = parseFloat((someCursor.ft + increase).toFixed(3));
                yield closet.updateOne({ id: id }, {
                    $set: {
                        ft: newFootage
                    }
                });
                channel.send(`${someCursor.name} has ${newFootage} ft^2 now! That's a ${increase} increase in ft^2! Wow!`);
            }
        }
        else if (msg.content.includes("!downgrade")) {
            // remove random square footage weighted?
            // add random square footage weighted?
            // arguments: @mention and number of + for the factor
            const args = (0, util_1.SplitArgs)(msg.content);
            if (args.length < 2) {
                channel.send("You need the @mention and a minus factor to give someone more square feet!");
            }
            const mention = args.shift();
            if (!mention) {
                // do nothing
                channel.send("You need the @mention to remove someone's square feet.");
                return;
            }
            const id = (0, util_1.ParseMention)(mention);
            if (!args[0].includes("-")) {
                channel.send("Missing at least one minus (-)! Can't remove square feet!");
            }
            // figure out the weight
            const minusFactor = (_b = args[0].match(/\-/g)) === null || _b === void 0 ? void 0 : _b.length;
            let decrease;
            if (minusFactor) {
                decrease = (0, util_1.RandomFt)(minusFactor);
            }
            else {
                channel.send("There was a problem figuring out the minusFactor. This is like your fourth bot and it still doesn't work right...");
                return;
            }
            // store in database
            const someCursor = yield closet.findOne({ id: id });
            if (!someCursor) {
                channel.send("That person you're reducing the square feet of doesn't seem to have moved in yet!");
            }
            else {
                // increase feet
                const newFootage = parseFloat((someCursor.ft - decrease).toFixed(3));
                yield closet.updateOne({ id: id }, {
                    $set: {
                        ft: newFootage
                    }
                });
                channel.send(`${someCursor.name} has ${newFootage} ft^2 now! That's a ${decrease} decrease in ft^2!`);
            }
        }
        else if (msg.content.includes("!ft")) {
            const args = (0, util_1.SplitArgs)(msg.content);
            if (args.length < 2) {
                channel.send("You need the @mention and a new square feet for that person!");
            }
            const mention = args.shift();
            if (!mention) {
                // do nothing
                channel.send("You need the @mention to change someone's square feet.");
                return;
            }
            const id = (0, util_1.ParseMention)(mention);
            const someCursor = yield closet.findOne({ id: id });
            if (!someCursor) {
                channel.send("That person you're changing the square feet of doesn't seem to have moved in yet!");
            }
            else {
                // parse out the number
                const newFootage = parseFloat(parseFloat(args[0]).toFixed(3)); // this is kinda horrific
                if (newFootage === NaN) {
                    channel.send(args[0] + " isn't a number you fool!");
                    return;
                }
                const old = someCursor.ft;
                yield closet.updateOne({ id: id }, {
                    $set: {
                        ft: newFootage
                    }
                });
                channel.send(`${someCursor.name} now has ${newFootage} ft^2 now! They previously had ${old} ft^2.`);
            }
        }
    }
    else if (commandList.includes(msg.content) && msg.author.id !== "129686495303827456") {
        // DEDUCT SQUARE FEET
        const id = msg.author.id;
        let closet = yield mongoclient.db().collection("closet");
        let someCursor = yield closet.findOne({ id: id });
        if (!someCursor) {
            // forcibly move them in
            yield closet.insertOne({
                name: msg.author.username,
                id: msg.author.id,
                ft: defaultFt
            });
            channel.send(`${msg.author.username} has been forcibly moved into the closet!`);
            someCursor = yield closet.findOne({ id: id }); // find again
        }
        if (someCursor) {
            // deduct square feet
            const decrease = (0, util_1.RandomFt)(5);
            const newFootage = parseFloat((someCursor.ft - decrease).toFixed(5));
            yield closet.updateOne({ id: id }, {
                $set: {
                    ft: newFootage
                }
            });
            channel.send(`HEY YOU! YOU AREN'T THE LANDLORD! This is an **illegal** move. ${someCursor.name} now has ${newFootage} ft^2 now. That's a ${decrease} decrease in ft^2. Serves you right.`);
        }
    }
}));
// debug
client.on('debug', debug => {
    console.log(debug);
});
client.login(process.env.DISCORD_BOT_TOKEN);