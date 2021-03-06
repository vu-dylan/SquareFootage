"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleCleanup = exports.roleSetup = exports.ft = exports.downgrade = exports.upgrade = exports.evict = exports.movein = exports.buy = exports.slots = exports.gamble = exports.work = exports.showTenants = exports.goStudy = void 0;
const Discord = __importStar(require("discord.js"));
const constants_1 = require("../constants");
const util_1 = require("./util");
const mongo_1 = require("./mongo");
/**
 * joke command to tell my friends to go study
 * @param msg message to pull mentions from
 * @param channel channel to send messages to
 */
const goStudy = (mongoclient, msg, channel) => __awaiter(void 0, void 0, void 0, function* () {
    // find out who sent the message
    // check if they're a tenant
    let author = msg.author.username;
    const collection = yield mongoclient.db().collection(constants_1.mongoDBcollection);
    const authorId = msg.author.id;
    const authorCursor = yield collection.findOne({ id: authorId });
    if (authorCursor) {
        // use their name
        author = authorCursor.name;
    }
    // parse out all mentions
    let mentionArray = [];
    const args = (0, util_1.SplitArgs)(msg.content);
    if (args.length > 1) {
        // get out all mentions
        for (const arg of args) {
            const mention = (0, util_1.ParseMention)(arg);
            if (mention) {
                mentionArray.push(arg);
            }
        }
        // send the message
        let message;
        if (mentionArray.length > 1) {
            message = `Hey guys! **${author}** is telling you all to go study! `;
        }
        else {
            message = `Hey you! **${author}** is telling you to go study! `;
        }
        for (const mention of mentionArray) {
            message = message + `${mention}! `;
        }
        channel.send(message);
    }
    else {
        channel.send(`Who are you trying to make study, ${author}? Maybe you should go study!`);
    }
});
exports.goStudy = goStudy;
/**
 * Send a single embed of all the tenants in the closet
 * @param mongoclient MongoDB client
 * @param channel channel to send message to
 */
const showTenants = (mongoclient, channel) => __awaiter(void 0, void 0, void 0, function* () {
    let closet = yield mongoclient.db().collection(constants_1.mongoDBcollection);
    // get list of all tenants and square footage, anyone can do this !tenants
    // embed message
    let embed = new Discord.MessageEmbed().setColor("#F1C40F");
    let globalClosetSpace = 0;
    const allTenants = yield closet.find();
    if ((yield closet.estimatedDocumentCount()) === 0) {
        embed.setDescription(`No one's gonna live in ${constants_1.landlordName}'s closet... sadge.`);
    }
    else {
        yield allTenants.forEach((tenant) => {
            embed.addField(tenant.name, `${tenant.ft} ft^2 \n$${(tenant.money).toLocaleString()} in bank account\n${constants_1.maxGamble - tenant.gambleCount} gambles remaining`);
            if (tenant.ft > 0) {
                globalClosetSpace += tenant.ft;
            }
        });
        embed.setTitle(`${constants_1.landlordName}'s Future Closet Tenants - ${globalClosetSpace.toFixed(3)} ft^2 large`);
        channel.send({ embeds: [embed] });
    }
});
exports.showTenants = showTenants;
/**
 * Increment the bank account of the command user by the default wage
 * @param mongoclient mongoDB client
 * @param channel channel to send response to
 * @param msg message object to get user id from
 */
const work = (mongoclient, channel, msg) => __awaiter(void 0, void 0, void 0, function* () {
    // work for minimum wage !work
    // check if person is in the closet
    // check if the person is in debt
    // give them the appropriate amount
    const id = msg.author.id;
    let closet = yield mongoclient.db().collection(constants_1.mongoDBcollection);
    const userCursor = yield closet.findOne({ id: id });
    if (!userCursor) {
        msg.reply(`You don't appear to own square feet in ${constants_1.landlordName}'s closet! Ask him to move you in.`);
    }
    else {
        // check if person has worked
        if (userCursor.worked) {
            channel.send(`**${userCursor.name}**, you've already worked this hour! Have some work-life balance, will you?`);
            console.log(`${userCursor.name} has already worked`);
        }
        else {
            // add money
            const oldMoney = userCursor.money;
            const newMoney = (0, util_1.randomNumber)(constants_1.wage - constants_1.range, constants_1.wage + constants_1.range); // generate a random wage
            yield closet.updateOne({ id: id }, {
                $set: {
                    money: oldMoney + newMoney,
                    worked: true
                }
            });
            channel.send(`**${userCursor.name}**, you ${constants_1.jobs[Math.floor(Math.random() * constants_1.jobs.length)]}. You made **$${newMoney.toLocaleString()}** and now have **$${(oldMoney + newMoney).toLocaleString()}** in your bank account!`);
        }
    }
});
exports.work = work;
/**
 * Flip a coin to get money
 * @param mongoclient mongodb client
 * @param channel channel to send feedback to
 * @param msg message object to parse arguments and user from
 * @returns
 */
const gamble = (mongoclient, channel, msg) => __awaiter(void 0, void 0, void 0, function* () {
    // check if user is in the closet
    const id = msg.author.id;
    let closet = yield mongoclient.db().collection(constants_1.mongoDBcollection);
    const userCursor = yield closet.findOne({ id: id });
    if (!userCursor) {
        msg.reply(`You don't appear to own square feet in ${constants_1.landlordName}'s closet! Ask him to move you in before you can gamble.`);
    }
    else {
        // check if person has gambled the maximum number of times already
        if (userCursor.gambleCount >= constants_1.maxGamble) {
            channel.send(`**${userCursor.name}**, you've already gambled too much this hour! Let's not develop any gambling addictions, ok? :D`);
            console.log(`${userCursor.name} has already gambled maximum amount of times`);
        }
        else {
            // arguments should be like: !gamble <result> <amount>
            const args = (0, util_1.SplitArgs)(msg.content);
            if (args.length <= 1) {
                channel.send(`**${userCursor.name}**, both a result and an amount of money to bet must be specified`);
                return;
            }
            else {
                // check if the user owes money
                if (userCursor.money < 0) {
                    channel.send(`**${userCursor.name}**, you can't gamble while owing **$${(-1 * userCursor.money).toLocaleString()}**! Go to work you bum. (Or ask the landlord to reset your money if the debt is impossible to pay off)`);
                    return;
                }
                // check inputs
                const moneyBet = parseInt(args[1]); // moneybet
                const outcomeBet = args[0].toLowerCase(); // result bet
                if (isNaN(moneyBet) || moneyBet <= 0) {
                    // check if bet is a number
                    channel.send(`**${userCursor.name}**, ${args[1]} is not a valid number.`);
                }
                else if (!constants_1.validGamblingArgs.includes(outcomeBet)) {
                    // check if proposed outcome is valid
                    channel.send(`**${userCursor.name}**, ${outcomeBet} is not a valid option. Choose one of the following: ${constants_1.validGamblingArgs}`);
                }
                else {
                    // create random number
                    const outcome = (0, util_1.randomNumber)(0, 1); // let 0 be heads, 1 be tails
                    let win = false; // flag if won
                    let adjustment = -1 * moneyBet; // how much to add or subtract by
                    if (outcome === 0) {
                        // heads
                        channel.send("**HEADS**");
                        if (constants_1.heads.includes(outcomeBet)) {
                            win = true;
                        }
                    }
                    if (outcome === 1) {
                        channel.send("**TAILS**");
                        if (constants_1.tails.includes(outcomeBet)) {
                            win = true;
                        }
                    }
                    if (win) {
                        adjustment = -1 * adjustment; // make this a positive number to add cash
                    }
                    // increment gambling count
                    const currGamble = userCursor.gambleCount;
                    const oldMoney = userCursor.money;
                    yield closet.updateOne({ id: id }, {
                        $set: {
                            gambleCount: currGamble + 1,
                            money: oldMoney + adjustment
                        }
                    });
                    // send the messages
                    if (win) {
                        channel.send(`**${userCursor.name}**, you guessed correctly! You made **$${adjustment.toLocaleString()}** and now have **$${(oldMoney + adjustment).toLocaleString()}** in your bank account!\n\nYou can gamble ${constants_1.maxGamble - (currGamble + 1)} more times this hour.`);
                    }
                    else {
                        channel.send(`**${userCursor.name}**, you guessed incorrectly. You lost **$${(-1 * adjustment).toLocaleString()}** and now have **$${(oldMoney + adjustment).toLocaleString()}** in your bank account... sadge\n\nYou can gamble ${constants_1.maxGamble - (currGamble + 1)} more times this hour.`);
                    }
                }
            }
        }
    }
    // TODO: create like an array of length 10 and then spam edit with alternating heads/tails to simulate flipping, then end on **result** in bold. Maybe about 5 edits per second -> 3 seconds in length?
});
exports.gamble = gamble;
const slots = (mongoclient, channel, msg) => __awaiter(void 0, void 0, void 0, function* () {
    // !slots
    // check if user is in the closet
    const id = msg.author.id;
    let closet = yield mongoclient.db().collection(constants_1.mongoDBcollection);
    const userCursor = yield closet.findOne({ id: id });
    if (!userCursor) {
        msg.reply(`You don't appear to own square feet in ${constants_1.landlordName}'s closet! Ask him to move you in before you can gamble.`);
    }
    else {
        // check if person has gambled the maximum number of times already
        if (userCursor.slotCount >= constants_1.maxSlots) {
            channel.send(`**${userCursor.name}**, you've already gambled too much this hour! Let's not develop any gambling addictions, ok? :D`);
            console.log(`${userCursor.name} has already rolled slots the maximum amount of times`);
        }
        else {
            // arguments should be like: !slots <amount>
            const args = (0, util_1.SplitArgs)(msg.content);
            // check if the user owes money
            if (userCursor.money < 0) {
                channel.send(`**${userCursor.name}**, you can't roll slots while owing **$${(-1 * userCursor.money).toLocaleString()}**! Go to work you bum. (Or ask the landlord to reset your money if the debt is impossible to pay off)`);
                return;
            }
            // check inputs
            // default to 1 if no money specified
            let moneyBet;
            if (args.length < 1) {
                moneyBet = 1;
            }
            else {
                moneyBet = parseInt(args[0]);
            }
            if (isNaN(moneyBet) || moneyBet <= 0) {
                // check if bet is a number
                channel.send(`**${userCursor.name}**, ${moneyBet} is not a valid number.`);
            }
            else {
                // create the finished outcome
                const outcome = [];
                outcome.push((0, util_1.randomNumber)(0, constants_1.slotSymbols.length - 1));
                outcome.push((0, util_1.randomNumber)(0, constants_1.slotSymbols.length - 1));
                outcome.push((0, util_1.randomNumber)(0, constants_1.slotSymbols.length - 1));
                console.log(`Slot roll by ${userCursor.name}`, outcome);
                let win = false; // flag if won
                let jackpot = false;
                let adjustment = -1 * moneyBet; // how much to add or subtract by
                // check if we have a match
                if (outcome.filter((num) => num === outcome[0]).length === outcome.length) {
                    // all numbers are the same
                    // check if jackpot is won, which is all 0's set by default
                    win = true;
                    if (outcome[0] === 0) {
                        jackpot = true;
                    }
                }
                // send results to channel
                let message = "";
                for (const symbol of outcome) {
                    message = message + `:${constants_1.slotSymbols[symbol]}: `;
                }
                channel.send(message);
                const currSlot = userCursor.slotCount;
                const oldMoney = userCursor.money;
                // proceess the score
                // expected value is like +$126
                if (win && jackpot) {
                    // jackpot payout
                    adjustment = -1 * adjustment * 400000;
                    // this is about a 0.0125% chance of happening
                    channel.send(`**${userCursor.name}**, JACKPOT!! :${constants_1.slotSymbols[0]}: :${constants_1.slotSymbols[0]}: :${constants_1.slotSymbols[0]}: \nYou made **$${adjustment.toLocaleString()}** and now have **$${(oldMoney + adjustment).toLocaleString()}** in your bank account!\n\nYou can roll slots **${constants_1.maxSlots - (currSlot + 1)}** more times this hour.`);
                }
                else if (win) {
                    // normal payout
                    adjustment = -1 * adjustment * 2000;
                    channel.send(`**${userCursor.name}**, you WIN! You made **$${adjustment.toLocaleString()}** and now have **$${(oldMoney + adjustment).toLocaleString()}** in your bank account!\n\nYou can roll slots **${constants_1.maxSlots - (currSlot + 1)}** more times this hour.`);
                }
                else {
                    channel.send(`**${userCursor.name}**, you didn't win. You lost **$${(-1 * adjustment).toLocaleString()}** and now have **$${(oldMoney + adjustment).toLocaleString()}** in your bank account... rip\n\nYou can roll slots **${constants_1.maxSlots - (currSlot + 1)}** more times this hour.`);
                }
                // adjustment is negative
                // increment gambling count and adjust money
                yield closet.updateOne({ id: id }, {
                    $set: {
                        slotCount: currSlot + 1,
                        money: oldMoney + adjustment
                    }
                });
            }
        }
    }
});
exports.slots = slots;
/**
 * Displays a list of purchasable roles as defined in constants.ts if no arguments, or buys a role for a tenant
 * @param mongoclient mongodb client
 * @param channel channel to send feedback to
 * @param msg message to get info from
 */
const buy = (mongoclient, channel, msg) => __awaiter(void 0, void 0, void 0, function* () {
    // !buy
    // check if user is part of the closet
    const collection = yield mongoclient.db().collection(constants_1.mongoDBcollection);
    const id = msg.author.id;
    const member = msg.member;
    const userCursor = yield collection.findOne({ id: id });
    if (!userCursor) {
        channel.send("Sorry, you aren't a tenant so you can't purchase anything. Please ask to be moved in.");
        return;
    }
    const args = (0, util_1.SplitArgs)(msg.content);
    // if no arguments, bring up the menu of purchasable roles
    if (args.length === 0) {
        // show menu of purchasable roles
        let embeds = [];
        let i = 0;
        let embed = new Discord.MessageEmbed().setColor("#F1C40F");
        embed.setTitle(`Possible Roles to Buy and Price`);
        embed.setDescription('Use !buy [role name] (case and space sensitive) to purchase a title\nUse !buy sq $[number] OR !buy sq [number] ft to either convert money to square feet, or buy a certain amount of square feet');
        for (const role of constants_1.roles) {
            embed.addField(role.role, `$${(role.price).toLocaleString()}`);
            i++;
            if (i >= 25) {
                console.log("creating new embed");
                // 25 field limit per embed
                embeds.push(embed);
                embed = new Discord.MessageEmbed().setColor("#F1C40F");
                embed.setTitle(`Possible Roles to Buy and Price Continued`);
                i = 0;
            }
        }
        embeds.push(embed);
        // send list of roles to channel
        for (const embed of embeds) {
            yield channel.send({ embeds: [embed] });
        }
    }
    else if (args[0] === "sq") {
        // buying square feet, second argument is the  amount of money to spend on square feet
        if (args.length < 2) {
            channel.send(`**${userCursor.name}**, you need to specify the money to convert to square feet!`);
        }
        else {
            // check if either ft or $ is specified
            if (args.length >= 3) {
                // check if third argument is "ft"
                if (args[2] === "ft" || args[2] === "ft^2" || args[2] === "sq") {
                    // check if the user has enough money
                    const newSq = parseInt(args[1]);
                    if (isNaN(newSq)) {
                        channel.send(`**${userCursor.name}**, ${args[1]} is not a number. I can't give you square feet like this.`);
                    }
                    else {
                        const cost = newSq * constants_1.costPerSqFt;
                        // check if there is enough money for the user
                        const balance = userCursor.money;
                        if (balance < cost) {
                            channel.send(`**${userCursor.name}**, You don't have enough money to buy **${newSq}** ft^2. You need to have **$${cost.toLocaleString()}** in your bank account.`);
                        }
                        else {
                            // deduct money and set
                            const oldMoney = userCursor.money;
                            const oldSq = userCursor.ft;
                            yield collection.updateOne({ id: id }, {
                                $set: {
                                    ft: oldSq + newSq,
                                    money: oldMoney - cost
                                }
                            });
                            channel.send(`**${userCursor.name}**, congratulations! You bought **${newSq}** ft^2 and now have **${oldSq + newSq}** ft^2 in the closet!`);
                        }
                    }
                }
                else {
                    channel.send(`**${userCursor.name}**, are you buying square feet? If so, please have "ft" or "ft^2" after your number, like: \`!buy sq 10 ft\``);
                }
            }
            else {
                // check if we have a dollar sign
                if (args[1].includes("$")) {
                    // parse out the $ then convert to money
                    let moneyArg = args[1];
                    moneyArg = moneyArg.replace("$", "");
                    // parse out the amount
                    const toSpend = parseInt(moneyArg);
                    if (isNaN(toSpend)) {
                        channel.send(`**${userCursor.name}**, you need to input a valid amount of money to convert to square feet!`);
                    }
                    else {
                        // calculate the square feet and update mongoDB
                        const newSq = (0, util_1.roundToDecimal)(toSpend / constants_1.costPerSqFt, 3);
                        const oldSq = userCursor.ft;
                        yield collection.updateOne({ id: id }, {
                            $set: {
                                ft: oldSq + newSq
                            }
                        });
                        channel.send(`**${userCursor.name}**, congratulations! You bought **${newSq} ft^2** and now have **${oldSq + newSq} ft^2** in the closet!`);
                    }
                }
                else {
                    channel.send(`**${userCursor.name}**, are you trying to buy square feet using ${args[1]} dollars? If so, please have "$" in front of the number, like: \`!buy sq $10\``);
                }
            }
        }
    }
    else {
        // turn the array of objects into an array of strings for the role name and array of numbers for the price. Same index.
        const roleToPurchase = args.join(" ");
        const roleNames = constants_1.roles.map((role => role.role));
        const rolePrices = constants_1.roles.map((role => role.price));
        if (roleNames.includes(roleToPurchase)) {
            // check if role exists in server
            const roleCache = msg.guild.roles.cache;
            const foundRole = roleCache.find(x => x.name == roleToPurchase);
            if (!foundRole) {
                yield channel.send(`${roleToPurchase} doesn't exist as a role in the server, but it should. Have the landlord run !rolesetup`);
                return;
            }
            // check if user already has the role
            if (member) {
                const userRole = member.roles.cache.some(role => role.name === roleToPurchase);
                if (userRole) {
                    channel.send(`**${userCursor.name}**, you already have bought ${roleToPurchase}!`);
                    return;
                }
                const index = roleNames.findIndex((role) => role === roleToPurchase);
                const deduction = rolePrices[index];
                // check if user has enough money
                if (userCursor.money >= deduction) {
                    // deduct money and assign role
                    const oldMoney = userCursor.money;
                    member.roles.add(foundRole);
                    yield collection.updateOne({ id: id }, {
                        $set: {
                            money: oldMoney - deduction
                        }
                    });
                    channel.send(`Congratulations, **${userCursor.name}**, you have **$${(oldMoney - deduction).toLocaleString()}** left but also have a brand new title to flex on people: **${roleToPurchase}**`);
                }
                else {
                    yield channel.send(`**${userCursor.name}**, you're too poor to buy that title! Go gamble or work some more.`);
                }
            }
            else {
                channel.send("There was an issue with buying the role. Something broke in the code, complain to the developer that member doesn't exist");
            }
        }
        else {
            channel.send(`**${userCursor.name}**, ${roleToPurchase} is not a valid title. Try !buy to see the entire list`);
        }
    }
});
exports.buy = buy;
// LANDLORD COMMANDS
/**
 * add a new user to the database
 * @param collection mongodb collection to add user to
 * @param channel discord channel to send the feedback to
 * @param msg message object to parse the user mention out of to move in
 */
const movein = (collection, channel, msg) => __awaiter(void 0, void 0, void 0, function* () {
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
        let someCursor = yield collection.findOne({ id: id });
        if (someCursor) {
            channel.send(`${name} has already moved into the closet!`);
        }
        else {
            yield (0, mongo_1.createTenant)(collection, id, name);
            // send verification message
            channel.send(`**${name}** has moved into ${constants_1.landlordName}'s closet!`);
        }
    }
});
exports.movein = movein;
/**
 * remove a user from the database
 * @param collection mongodb collection to remove user from
 * @param channel discord channel to send the feedback to
 * @param msg message object to parse the user mention out of to evict from db
 */
const evict = (collection, channel, msg) => __awaiter(void 0, void 0, void 0, function* () {
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
        let someCursor = yield collection.findOne({ id: id });
        if (!someCursor) {
            channel.send(`That person does not currently own any square feet in the closet. Perhaps they're an illegal squatter...`);
        }
        else {
            const name = someCursor.name;
            collection.deleteOne({
                id: id,
            });
            // send verification message
            channel.send(`**${name}** has been **EVICTED**. No square feet for them!`);
        }
    }
});
exports.evict = evict;
/**
 * increase a user's square feet based on the number of +
 * @param collection mongodb collection to modify user stats
 * @param channel discord channel to send the feedback to
 * @param msg message object to parse the user mention out of to increase square footage of
 */
const upgrade = (collection, channel, msg) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
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
    const someCursor = yield collection.findOne({ id: id });
    if (!someCursor) {
        channel.send("That person you're increasing square feet of doesn't seem to have moved in yet!");
    }
    else {
        // increase feet
        const newFootage = (0, util_1.roundToDecimal)(someCursor.ft + increase, 3);
        yield collection.updateOne({ id: id }, {
            $set: {
                ft: newFootage
            }
        });
        channel.send(`**${someCursor.name}** has **${newFootage} ft^2** now! That's a ${increase} **increase** in ft^2! Wow!`);
    }
});
exports.upgrade = upgrade;
/**
 * decrease a user's square feet based on the number of -
 * @param collection mongodb collection to modify user stats
 * @param channel discord channel to send the feedback to
 * @param msg message object to parse the user mention out of to decrease square footage of
 */
const downgrade = (collection, channel, msg) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    // remove random square footage weighted?
    // arguments: @mention and number of - for the factor
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
    const someCursor = yield collection.findOne({ id: id });
    if (!someCursor) {
        channel.send("That person you're reducing the square feet of doesn't seem to have moved in yet!");
    }
    else {
        // increase feet
        const newFootage = (0, util_1.roundToDecimal)(someCursor.ft - decrease, 3);
        yield collection.updateOne({ id: id }, {
            $set: {
                ft: newFootage
            }
        });
        channel.send(`**${someCursor.name}** has **${newFootage} ft^2** now! That's a ${decrease} **decrease** in ft^2...`);
    }
});
exports.downgrade = downgrade;
/**
 * directly set a user's square footage !ft
 * @param collection mongodb collection to modify user stats
 * @param channel discord channel to send the feedback to
 * @param msg message object to parse the user mention out of to modify the square footage of
 */
const ft = (collection, channel, msg) => __awaiter(void 0, void 0, void 0, function* () {
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
    const someCursor = yield collection.findOne({ id: id });
    if (!someCursor) {
        channel.send("That person you're changing the square feet of doesn't seem to have moved in yet!");
    }
    else {
        // parse out the number
        const newFootage = (0, util_1.roundToDecimal)(parseFloat(args[0]), 3); // a bit weird but the message content is a string, so need to convert to number then round
        if (newFootage === NaN) {
            channel.send(args[0] + " isn't a number you fool!");
            return;
        }
        const old = someCursor.ft;
        yield collection.updateOne({ id: id }, {
            $set: {
                ft: newFootage
            }
        });
        channel.send(`**${someCursor.name}** now has **${newFootage} ft^2** now! They previously had **${old} ft^2**.`);
    }
});
exports.ft = ft;
/**
 * Create all the roles in the constants.ts
 * @param guild Discord guild object from message
 */
const roleSetup = (guild, channel) => __awaiter(void 0, void 0, void 0, function* () {
    // !rolesetup
    const roleCache = guild.roles.cache;
    let roleAdded = [];
    for (const role of constants_1.roles) {
        if (!roleCache.find(x => x.name == role.role)) {
            // role doesn't exist
            yield guild.roles.create({
                name: role.role,
                color: [(0, util_1.randomNumber)(0, 255), (0, util_1.randomNumber)(0, 255), (0, util_1.randomNumber)(0, 255)]
            });
            roleAdded.push(role.role);
        }
        else {
            console.log(`${role.role} already exists`);
        }
    }
    if (roleAdded.length > 0) {
        channel.send(`Roles have been created: ${roleAdded}`);
    }
    else {
        channel.send(`No new roles were created.`);
    }
});
exports.roleSetup = roleSetup;
/**
 * Delete all the roles in the constants.ts
 * @param guild Discord guild object from message
 */
const roleCleanup = (guild) => __awaiter(void 0, void 0, void 0, function* () {
    const roleCache = guild.roles.cache;
    for (const role of constants_1.roles) {
        const foundRole = roleCache.find(x => x.name == role.role);
        if (foundRole) {
            // delete
            yield guild.roles.delete(foundRole);
            console.log(`Deleted ${role}`);
        }
        else {
            console.log(`Could not find ${role}`);
        }
    }
});
exports.roleCleanup = roleCleanup;
