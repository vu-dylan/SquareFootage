import * as mongo from 'mongodb';
import * as Discord from 'discord.js';
import { jobs, wage, range, maxGamble, landlordName, roles, costPerSqFt, mongoDBcollection } from '../../constants';
import { ParseMention, SplitArgs, randomNumber, roundToDecimal } from '../util';

/**
 * joke command to tell my friends to go study
 * @param msg message to pull mentions from
 * @param channel channel to send messages to
 */
export const goStudy = async (mongoclient: mongo.MongoClient, msg: Discord.Message, channel: Discord.TextChannel) => {
    // find out who sent the message
    // check if they're a tenant
    let author = msg.author.username;
    const collection = await mongoclient.db().collection(mongoDBcollection);
    const authorId = msg.author.id;
    const authorCursor = await collection.findOne({ id: authorId });
    if (authorCursor) {
        // use their name
        author = authorCursor.name;
    }

    // parse out all mentions
    let mentionArray: string[] = []
    const args = SplitArgs(msg.content);
    if (args.length > 1) {
        // get out all mentions
        for (const arg of args) {
            const mention = ParseMention(arg);
            if (mention) {
                mentionArray.push(arg);
            }
        }
        // send the message
        let message: string;
        if (mentionArray.length > 1) {
            message = `Hey guys! **${author}** is telling you all to go study! `;
        } else {
            message = `Hey you! **${author}** is telling you to go study! `;
        }
        for (const mention of mentionArray) {
            message = message + `${mention}! `
        }
        channel.send(message);
    } else {
        channel.send(`Who are you trying to make study, ${author}? Maybe you should go study!`)
    }
}


export const howAreYou = async (mongoclient: mongo.MongoClient, msg: Discord.Message, channel: Discord.TextChannel) => {
    let collection = await mongoclient.db().collection("ariel");
    const document = await collection.findOne();
    if (document) {
        await collection.updateOne({}, {
            $set: {
                count: document.count + 1
            }
        });
        channel.send(`${document.count + 1} times Ariel. ${document.count + 1} times.`);
    } else {
        channel.send(`There was an issue updating Ariel's "So how are you guys doing today?". Blame Dylan for bad code D:`);
    }
}

export const sigh = async (mongoclient: mongo.MongoClient, msg: Discord.Message, channel: Discord.TextChannel) => {
    let collection = mongoclient.db().collection("sigh");
    // parse arguments for names
    const names = SplitArgs(msg.content);
    const date = new Date(Date.now())
    // write a new document
    try {
        await collection.insertOne({
            time: date,
            names: names
        });
        channel.send(`sigh. It has been recorded: a sigh on ${date} with ${names}`);
    } catch (e) {
        channel.send(`sigh. There was an error: ${e}`);
    }
}

/**
 * Send a single embed of all the tenants in the closet
 * @param mongoclient MongoDB client
 * @param channel channel to send message to
 */
export const showTenants = async (mongoclient: mongo.MongoClient, channel: Discord.TextChannel) => {
    let closet = await mongoclient.db().collection(mongoDBcollection);
    // get list of all tenants and square footage, anyone can do this !tenants
    // embed message
    let embed: Discord.MessageEmbed = new Discord.MessageEmbed().setColor("#F1C40F")
    let globalClosetSpace = 0;
    const allTenants = await closet.find();
    if ((await closet.estimatedDocumentCount()) === 0) {
        embed.setDescription(`No one's gonna live in ${landlordName}'s closet... sadge.`);
    } else {
        await allTenants.forEach((tenant) => {
            embed.addField(tenant.name, `${tenant.ft} ft^2 \n$${(tenant.money).toLocaleString()} in bank account\n${maxGamble - tenant.gambleCount} gambles remaining`);
            if (tenant.ft > 0) {
                globalClosetSpace += tenant.ft;
            }
        });
        embed.setTitle(`${landlordName}'s Future Closet Tenants - ${globalClosetSpace.toFixed(3)} ft^2 large`);
        channel.send({ embeds: [embed] });
    }
}

/**
 * Increment the bank account of the command user by the default wage
 * @param mongoclient mongoDB client
 * @param channel channel to send response to
 * @param msg message object to get user id from
 */
export const work = async (mongoclient: mongo.MongoClient, channel: Discord.TextChannel, msg: Discord.Message) => {
    // work for minimum wage !work
    // check if person is in the closet
    // check if the person is in debt
    // give them the appropriate amount
    const id = msg.author.id;
    let closet = await mongoclient.db().collection(mongoDBcollection);
    const userCursor = await closet.findOne({ id: id });
    if (!userCursor) {
        msg.reply(`You don't appear to own square feet in ${landlordName}'s closet! Ask him to move you in.`)
    } else {
        // check if person has worked
        if (userCursor.worked) {
            channel.send(`**${userCursor.name}**, you've already worked this hour! Have some work-life balance, will you?`);
            console.log(`${userCursor.name} has already worked`)
        } else {
            // add money
            const oldMoney = userCursor.money;
            const newMoney = randomNumber(wage - range, wage + range); // generate a random wage
            await closet.updateOne({ id: id }, {
                $set: {
                    money: oldMoney + newMoney,
                    worked: true
                }
            });
            channel.send(`**${userCursor.name}**, you ${jobs[Math.floor(Math.random() * jobs.length)]}. You made **$${newMoney.toLocaleString()}** and now have **$${(oldMoney + newMoney).toLocaleString()}** in your bank account!`)
        }
    }
}

/**
 * Displays a list of purchasable roles as defined in constants.ts if no arguments, or buys a role for a tenant
 * @param mongoclient mongodb client
 * @param channel channel to send feedback to
 * @param msg message to get info from
 */
export const buy = async (mongoclient: mongo.MongoClient, channel: Discord.TextChannel, msg: Discord.Message) => {
    // !buy
    // check if user is part of the closet
    const collection = await mongoclient.db().collection(mongoDBcollection);
    const id = msg.author.id;
    const member = msg.member;
    const userCursor = await collection.findOne({ id: id });
    if (!userCursor) {
        channel.send("Sorry, you aren't a tenant so you can't purchase anything. Please ask to be moved in.");
        return;
    }

    const args = SplitArgs(msg.content);
    // if no arguments, bring up the menu of purchasable roles
    if (args.length === 0) {
        // show menu of purchasable roles
        let embeds: Discord.MessageEmbed[] = [];
        let i = 0;
        let embed: Discord.MessageEmbed = new Discord.MessageEmbed().setColor("#F1C40F");
        embed.setTitle(`Possible Roles to Buy and Price`);
        embed.setDescription('Use !buy [role name] (case and space sensitive) to purchase a title\nUse !buy sq $[number] OR !buy sq [number] ft to either convert money to square feet, or buy a certain amount of square feet');
        for (const role of roles) {
            embed.addField(role.role, `$${(role.price).toLocaleString()}`);
            i++
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
            await channel.send({ embeds: [embed] });
        }
    } else if (args[0] === "sq") {
        // buying square feet, second argument is the  amount of money to spend on square feet
        if (args.length < 2) {
            channel.send(`**${userCursor.name}**, you need to specify the money to convert to square feet!`)
        } else {
            // check if either ft or $ is specified
            if (args.length >= 3) {
                // check if third argument is "ft"
                if (args[2] === "ft" || args[2] === "ft^2" || args[2] === "sq") {
                    // check if the user has enough money
                    const newSq = parseInt(args[1])
                    if (isNaN(newSq)) {
                        channel.send(`**${userCursor.name}**, ${args[1]} is not a number. I can't give you square feet like this.`);
                    } else {
                        const cost = newSq * costPerSqFt;
                        // check if there is enough money for the user
                        const balance = userCursor.money;
                        if (balance < cost) {
                            channel.send(`**${userCursor.name}**, You don't have enough money to buy **${newSq}** ft^2. You need to have **$${cost.toLocaleString()}** in your bank account.`)
                        } else {
                            // deduct money and set
                            const oldMoney = userCursor.money;
                            const oldSq = userCursor.ft;
                            await collection.updateOne({ id: id }, {
                                $set: {
                                    ft: oldSq + newSq,
                                    money: oldMoney - cost
                                }
                            });
                            channel.send(`**${userCursor.name}**, congratulations! You bought **${newSq}** ft^2 and now have **${oldSq + newSq}** ft^2 in the closet!`)
                        }
                    }
                } else {
                    channel.send(`**${userCursor.name}**, are you buying square feet? If so, please have "ft" or "ft^2" after your number, like: \`!buy sq 10 ft\``)
                }
            } else {
                // check if we have a dollar sign
                if (args[1].includes("$")) {
                    // parse out the $ then convert to money
                    let moneyArg = args[1];
                    moneyArg = moneyArg.replace("$", "");
                    // parse out the amount
                    const toSpend = parseInt(moneyArg);
                    if (isNaN(toSpend)) {
                        channel.send(`**${userCursor.name}**, you need to input a valid amount of money to convert to square feet!`)
                    } else {
                        // calculate the square feet and update mongoDB
                        const newSq = roundToDecimal(toSpend / costPerSqFt, 3);
                        const oldSq = userCursor.ft;
                        await collection.updateOne({ id: id }, {
                            $set: {
                                ft: oldSq + newSq
                            }
                        });
                        channel.send(`**${userCursor.name}**, congratulations! You bought **${newSq} ft^2** and now have **${oldSq + newSq} ft^2** in the closet!`)
                    }
                } else {
                    channel.send(`**${userCursor.name}**, are you trying to buy square feet using ${args[1]} dollars? If so, please have "$" in front of the number, like: \`!buy sq $10\``)
                }
            }
        }
    } else {
        // turn the array of objects into an array of strings for the role name and array of numbers for the price. Same index.
        const roleToPurchase = args.join(" ");

        const roleNames = roles.map((role => role.role));
        const rolePrices = roles.map((role => role.price));

        if (roleNames.includes(roleToPurchase)) {
            // check if role exists in server
            const roleCache = msg.guild!.roles.cache;
            const foundRole = roleCache.find(x => x.name == roleToPurchase);
            if (!foundRole) {
                await channel.send(`${roleToPurchase} doesn't exist as a role in the server, but it should. Have the landlord run !rolesetup`);
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
                    await collection.updateOne({ id: id }, {
                        $set: {
                            money: oldMoney - deduction
                        }
                    });
                    channel.send(`Congratulations, **${userCursor.name}**, you have **$${(oldMoney - deduction).toLocaleString()}** left but also have a brand new title to flex on people: **${roleToPurchase}**`)
                } else {
                    await channel.send(`**${userCursor.name}**, you're too poor to buy that title! Go gamble or work some more.`);
                }
            } else {
                channel.send("There was an issue with buying the role. Something broke in the code, complain to the developer that member doesn't exist");
            }
        } else {
            channel.send(`**${userCursor.name}**, ${roleToPurchase} is not a valid title. Try !buy to see the entire list`);
        }

    }
}
