const Scene = require('telegraf/scenes/base')
const Telegraf = require('telegraf')
const { Extra, Markup } = Telegraf
const TEST = {
    preferences: ['Italian', 'French', 'Indian', 'Vegan',
    'Steakhouse', 'Fast Food', 'Deluxe', 'Libanese',
    'Japanese', 'Korean', 'Traditional']
}

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
    console.log('Poll id: ', pollMessage)
    try {
        const poll = ctx.session.poll || {}
        poll[pollMessage.id] = {
            data: {}
        }
        ctx.session.poll = poll
    } catch (error) {
        console.log(error)
    }
    
    console.log('New poll', ctx.session)
    ctx.scene.leave()
})
pollPreferenceScene.action(/stop_poll/, ctx => {
    console.log('answer', ctx.pollAnswer)
    ctx.stopPoll()
    ctx.scene.enter('locationRequestScene')
})


module.exports = { pollPreferenceScene }