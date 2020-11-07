require('dotenv').config()
const { Telegraf } = require('telegraf')
const session = require('telegraf/session')
const Stage = require('telegraf/stage')
const Scene = require('telegraf/scenes/base')
const WizardScene = require('telegraf/scenes/wizard')
const { leave } = Stage
const { axios } = require('axios')
const Markup = require('telegraf/markup')
const LocalSession = require('telegraf-session-local')
const _ = require('lodash')
const {get_cuisine_list, get_restaurants_suggestions, send_feedback} = require('./api.js')
// const { pollPreferenceScene } = require('./pollPreferenceScene.js')

const constructUsersData = (pollsObject, locationsObject, cuisineList) => {
    const usersData = pollsObject.data
    let res = []
    _.forOwn(usersData, function(value, key) { 
        console.log('Indexed choices: ', value, key)
        let preferences = value.map(el => cuisineList[el])
        console.log('Preferences: ', preferences)
        res.push({
            user_id: key,
            preferences,
            location: locationsObject
        })
    });

    return res
}

const bot = new Telegraf(process.env.BOT_TOKEN)
bot.context.db = {
    polls: {},
    votes: {},
    locations: {},
    cuisineList: [],
    restaurants: {},
    chosenRestaurantIndex: {}
}

const restaurantRequestScene = new Scene('restaurantRequest')
restaurantRequestScene.enter(ctx => {
    // Here I should query and receive a suggestion
    ctx.reply(JSON.stringify(ctx.scene.state, null, 2))
})


const pollPreferenceScene = new Scene('pollPreference')
pollPreferenceScene.enter(async (ctx) => {
    bot.context.db.cuisineList[ctx.chat.id] = await get_cuisine_list(limit=10)
    console.log('cuisine list: ', bot.context.db.cuisine_list)
    const pollMessage = await ctx.replyWithPoll(
        'What are your food preferences',
        bot.context.db.cuisineList[ctx.chat.id],
        {is_anonymous: false, allows_multiple_answers: true,
        reply_markup: JSON.stringify({
            inline_keyboard: [[
                // Guess that the poll message id will be the next after the one received
                {text: 'Stop poll', callback_data: `stop_poll_${ctx.chat.id}_${ctx.message.message_id+1}`}
            ]]
        })})
    try {
        const pollId = pollMessage.poll.id
        const chatId = pollMessage.chat.id
        bot.context.db.polls[chatId] = {
            poll_id: pollId,
            data: {}
        }
        console.log('New poll: ', bot.context.db.polls)
    } catch (error) {
        console.log(error)
    }
    ctx.reply('Click on stop poll when you\'re done choosing')
    ctx.scene.leave()
})

pollPreferenceScene.action(/stop_poll/, ctx => {
    console.log('answer', ctx.pollAnswer)
    ctx.stopPoll()
    ctx.scene.enter('locationRequestScene')
})

const requestLocationScene = new Scene('requestLocation')
requestLocationScene.enter(async ctx => {
    console.log('Scene: ', ctx.scene.state.poll)
    const usersIds = Object.keys(ctx.scene.state.poll.data)
    const chatId = ctx.chat.id
    console.log('Votes: ', bot.context.db.votes)
    bot.context.db.votes[chatId] = {}
    bot.context.db.locations[chatId] = {}
    bot.context.db.votes[chatId].remainingUsers = usersIds
    console.log('Users ids for location: ', usersIds)
    ctx.reply('Send your location 📌')
    bot.context.db.scene = 'requestLocation'
    ctx.scene.leave()
})

bot.on('location', async ctx => {
    if (bot.context.db.scene !== 'requestLocation') {
        return
    }
    const chatId = ctx.chat.id
    const userId = ctx.from.id
    let remainingUsers
    try {
        remainingUsers = bot.context.db.votes[chatId].remainingUsers
    } catch (error) {
        return
    }
    const location = [ctx.message.location.latitude, ctx.message.location.longitude]
    bot.context.db.locations[chatId] = location
    console.log('Locations single: ', bot.context.db.locations)
    console.log('Id and Remaining users before: ', userId, remainingUsers)
    _.pull(remainingUsers, userId.toString())
    console.log('Remaining users after: ', remainingUsers)
    bot.context.db.votes[chatId].remainingUsers = remainingUsers
    if (remainingUsers.length === 0) {
        // TODO Add query here
        // Here I should call a function to send the restaurant list
        const polls = bot.context.db.polls[chatId]
        const locations = bot.context.db.locations[chatId]
        const cuisineList = bot.context.db.cuisineList[chatId]
        console.log('Locations: ', locations)
        usersData = constructUsersData(polls, locations, cuisineList)

        const restaurants = await get_restaurants_suggestions(usersData)
        console.log('Resturants', restaurants)
        const chosenRestaurantIndex = bot.context.db.chosenRestaurantIndex[chatId] || 0
        bot.context.db.restaurants[chatId] = restaurants.hits
        bot.context.db.chosenRestaurantIndex[chatId] = chosenRestaurantIndex
        const { Adress, City, Latitude, Longitude, Name, Venue_ID } = bot.context.db.restaurants[chatId][chosenRestaurantIndex]
        bot.context.db.state = 'restaurantChoice'
        bot.telegram.sendMessage(chatId, "Here's what I found for you all. What do you think?")
        bot.telegram.sendVenue(chatId, Latitude, Longitude, Name, Adress, {
            foursquare_id: Venue_ID, 
            reply_markup: JSON.stringify({
                inline_keyboard: [[
                {text: "👍 0", callback_data: `vote_l_${Venue_ID}_${userId}`},
                {text: "👎 0", callback_data: `vote_d_${Venue_ID}_${userId}`},
            ]] } ) }
        )
        return
    }
    await ctx.reply(`Thanks! Waiting for ${remainingUsers.length} users to send their location`)
    console.log('Thanks message sent', ctx.message.location)
})


const stage = new Stage([pollPreferenceScene, requestLocationScene, restaurantRequestScene])
// bot.use((new LocalSession({ database: 'db.json' })).middleware())
bot.use(session())
bot.use(stage.middleware())

bot.on('poll_answer', (ctx) => {
    const userId = ctx.pollAnswer.user.id
    const pollId = ctx.pollAnswer.poll_id.toString()
    let chatId = 0;
    for (const [key, value] of Object.entries(bot.context.db.polls)) {
        console.log('Searching for ', key, ' in ', bot.context.db.polls)
        if (value.poll_id === pollId) {
            chatId = key
        }
      }
    if (chatId === 0) {
        return
    }
    const selectedIds = ctx.pollAnswer.option_ids
    bot.context.db.polls[chatId].data[userId] = selectedIds
    console.log('Poll answer', bot.context.db.polls, pollId)
})

bot.action(/stop_poll_(-?\d+)_(-?\d+)/, ctx => {
    console.log(`Poll stop ${ctx.match}`, console.log(ctx.pollAnswer))
    ctx.stopPoll(ctx.match[2], ctx.match[1])
    ctx.answerCbQuery(`Poll Stopped`)
    const chatId = ctx.chat.id
    ctx.scene.state.poll = bot.context.db.polls[chatId]
    ctx.scene.enter('requestLocation', ctx.scene.state)
})

bot.action(/vote_(.)_(.+)_(\d+)/, ctx => {
    console.log('CB query text', ctx.text)
    const chatId = ctx.chat.id
    console.log('CB query chat', ctx.chat)
    const [fullMatch, reaction, foursquare_id, original_id] = ctx.match
    const userId = ctx.from.id
    console.log('Parsed: ', fullMatch, reaction, foursquare_id, userId)
    bot.context.db.restaurant_votes[chatId] = bot.context.db.restaurant_votes[chatId] || {}
    bot.context.db.restaurant_votes[chatId][foursquare_id] = bot.context.db.restaurant_votes[chatId][foursquare_id] || {}
    bot.context.db.restaurant_votes[chatId][foursquare_id][userId] = reaction
    if (!(userId in bot.context.db.restaurant_votes[chatId][foursquare_id])) {
        return
    }
    console.log(bot.context.db.restaurant_votes[chatId])
    const reactions = Object.values(bot.context.db.restaurant_votes[chatId][foursquare_id])
    const numLikes = reactions.filter(x => x === 'l').length
    const numDislikes = reactions.filter(x => x === 'd').length
    console.log('Reactions: ', reactions, numLikes, numDislikes)
    if (numDislikes >= 1) {
        let chosenRestaurantIndex = bot.context.db.chosenRestaurantIndex[chatId]
        chosenRestaurantIndex += 1
        if  (chosenRestaurantIndex === bot.context.db.restaurants[chatId].length) {
            bot.telegram.sendMessage(chatId, 'Seems like you can\'t make up your mind 🤯 Try to /eat again 🥙')
            return
        }
        bot.context.db.chosenRestaurantIndex[chatId] = chosenRestaurantIndex
        console.log('Index: ', chosenRestaurantIndex)
        bot.context.db.chosenRestaurantIndex[chatId]
        const { Adress, City, Latitude, Longitude, Name, Venue_ID } = bot.context.db.restaurants[chatId][chosenRestaurantIndex]
        bot.context.db.state = 'restaurantChoice'
        bot.telegram.sendMessage(chatId, 'What about this place instead?')
        bot.telegram.sendVenue(chatId, Latitude, Longitude, Name, Adress, {
            foursquare_id: Venue_ID, 
            reply_markup: JSON.stringify({
                inline_keyboard: [[
                {text: "👍 0", callback_data: `vote_l_${Venue_ID}_${userId}`},
                {text: "👎 0", callback_data: `vote_d_${Venue_ID}_${userId}`},
            ]] } ) }
        )
    }
    if (numLikes === ctx.getChatMembersCount() - 1) {
        bot.telegram.sendMessage("Glad you liked this place! 🔝")
    }

    send_feedback(bot.context.db.restaurant_votes[chatId])
    ctx.editMessageReplyMarkup({
        inline_keyboard: [[
            {text: `👍 ${numLikes}`, callback_data: `vote_l_${foursquare_id}_${userId}`},
            {text: `👎 ${numDislikes}`, callback_data: `vote_d_${foursquare_id}_${userId}`},
        ]]
    })
    ctx.answerCbQuery('Thanks for your feedback!')
})

bot.start(ctx => {
    bot.context.db.polls = {}
    bot.context.db.votes = {}
    bot.context.db.locations = {}
    bot.context.db.restaurant_votes = {}
    ctx.session.poll = []
    ctx.reply('Let me help you find a place 🙂. Start by using /eat')
})

bot.command('eat', async (ctx) => await ctx.scene.enter('pollPreference'))
bot.launch()

