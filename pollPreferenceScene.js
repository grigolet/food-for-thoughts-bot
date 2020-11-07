const Scene = require('telegraf/scenes/base')
const Telegraf = require('telegraf')
const { Extra, Markup } = Telegraf
const TEST = {
    preferences: ['Italian', 'French', 'Indian', 'Vegan',
    'Steakhouse', 'Fast Food', 'Deluxe', 'Libanese',
    'Japanese', 'Korean', 'Traditional']
}

const pollPreferenceScene = new Scene('pollPreference')
pollPreferenceScene.enter((ctx) => {
    ctx.replyWithPoll(
        'What are your food preferences',
        TEST.preferences.slice(0, 10),
        {is_anonymous: false, allows_multiple_answers: true,
        reply_markup: JSON.stringify({
            inline_keyboard: [[
                {text: 'Stop poll', callback_data: 'stop_poll'}
            ]]
        })})
    try {
        ctx.session.poll = [...ctx.session.poll, {
            chat_id: ctx.chat.id,
            message_id: ctx.message.message_id
        }]
    } catch (error) {
        console.error(error)
    }
    
    console.log('New poll', ctx.session)
    ctx.scene.leave()
})
pollPreferenceScene.action(/stop_poll/, ctx => {
    console.log('answer', ctx.pollAnswer)
    ctx.stopPoll()
})


module.exports = { pollPreferenceScene }