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
const { pollPreferenceScene } = require('./pollPreferenceScene.js')

const bot = new Telegraf(process.env.BOT_TOKEN)
const stage = new Stage([pollPreferenceScene])
// bot.use((new LocalSession({ database: 'db.json' })).middleware())
bot.use(session())
bot.use(stage.middleware())
bot.context.db = {
    polls: []
}

bot.on('poll_answer', (ctx) => {
    console.log('poll answer', ctx.pollAnswer)
    const userId = ctx.pollAnswer.user.id
    const selectedIds = ctx.pollAnswer.option_ids
    console.log('Poll Answer', ctx.session)
})

bot.action(/stop_poll/, ctx => {
    console.log(`Poll stop ${ctx.match[0]}`, console.log(ctx.session.poll))
    return ctx.answerCbQuery(`Oh, ${ctx.match[0]}!`)
})

bot.start(ctx => {
    bot.context.db.poll = {}
    ctx.session.poll = []
    ctx.reply('Welcome message. Use /preferences to choose what to eat')
})

bot.command('preferences', async (ctx) => await ctx.scene.enter('pollPreference'))
bot.launch()

