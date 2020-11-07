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
// const { pollPreferenceScene } = require('./pollPreferenceScene.js')

const TEST = {
    preferences: ['Italian', 'French', 'Indian', 'Vegan',
    'Steakhouse', 'Fast Food', 'Deluxe', 'Libanese',
    'Japanese', 'Korean', 'Traditional']
}

const bot = new Telegraf(process.env.BOT_TOKEN)
bot.context.db = {
    polls: {},
    votes: {}
}

const restaurantRequestScene = new Scene('restaurantRequest')
restaurantRequestScene.enter(ctx => {
    // Here I should query and receive a suggestion
    ctx.reply(JSON.stringify(ctx.scene.state, null, 2))
})


const pollPreferenceScene = new Scene('pollPreference')
pollPreferenceScene.enter(async (ctx) => {
    const pollMessage = await ctx.replyWithPoll(
        'What are your food preferences',
        TEST.preferences.slice(0, 10),
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
    bot.context.db.votes[chatId].remainingUsers = usersIds
    console.log('Users ids for location: ', usersIds)
    ctx.reply('Send your location')
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
    console.log('Id and Remaining users before: ', userId, remainingUsers)
    _.pull(remainingUsers, userId.toString())
    console.log('Remaining users after: ', remainingUsers)
    bot.context.db.votes[chatId].remainingUsers = remainingUsers
    if (remainingUsers.length === 0) {
        // Here I should call a function to send the restaurant list
        bot.context.db.state = 'restaurantChoice'
        bot.telegram.sendVenue(chatId, 46.203199, 6.139999, 'KYtaly', '12 Boulevard George Favon', {foursquare_id: '54402325498e91d43f19d9ad'})
        return
    }
    const message = await ctx.reply(`Thanks! Only ${remainingUsers.length} users left`)
    console.log('Thanks message sent', ctx.message.location)
    const [latitude, longitude] = [ctx.message.location.latitude, ctx.message.location.longitude]
    // ctx.scene[userId] = [latitude, longitude]
})


const stage = new Stage([pollPreferenceScene, requestLocationScene, restaurantRequestScene])
// bot.use((new LocalSession({ database: 'db.json' })).middleware())
bot.use(session())
bot.use(stage.middleware())
bot.context.db = {
    polls: []
}

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

bot.start(ctx => {
    bot.context.db.polls = {}
    bot.context.db.votes = {}
    ctx.session.poll = []
    ctx.reply('Welcome message. Use /preferences to choose what to eat')
})

bot.command('preferences', async (ctx) => await ctx.scene.enter('pollPreference'))
bot.launch()

