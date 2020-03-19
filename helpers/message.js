const util = require('util');
const request = require('request');
const auth = require('./auth')

const post = util.promisify(request.post);


let sayHi = async(event) => {
    if (!event.direct_message_events) {
        return;
    }

    // Messages are wrapped in an array, so we'll extract the first element
    const message = event.direct_message_events.shift();

    // We check that the message is valid
    if (typeof message === 'undefined' || typeof message.message_create === 'undefined') {
        return;
    }

    // We filter out message you send, to avoid an infinite loop
    if (message.message_create.sender_id === message.message_create.target.recipient_id) {
        return;
    }
    // mark received message as seen
    await markAsRead(message.message_create.id, message.message_create.sender_id, auth.twitter_oauth);
    // show typing effect
    await indicateTyping(message.message_create.sender_id, auth.twitter_oauth);
    // username of the sender
    const senderScreenName = event.users[message.message_create.sender_id].screen_name;
    // send message
    await sendMessage(message.message_create.sender_id, `Hi @${senderScreenName}! 👋`)
}

// send message function
let sendMessage = async(recipient, message) => {
    const requestConfig = {
        url: 'https://api.twitter.com/1.1/direct_messages/events/new.json',
        oauth: oAuthConfig,
        json: {
            event: {
                type: 'message_create',
                message_create: {
                    target: {
                        recipient_id: recipient,
                    },
                    message_data: {
                        text: message,
                    },
                },
            },
        },
    };
    await post(requestConfig)
}

let indicateTyping = async(senderId, auth) => {
    const requestConfig = {
        url: 'https://api.twitter.com/1.1/direct_messages/indicate_typing.json',
        form: {
            recipient_id: senderId,
        },
        oauth: auth,
    };

    await post(requestConfig);
}

let markAsRead = async(messageId, senderId, auth) => {
    const requestConfig = {
        url: 'https://api.twitter.com/1.1/direct_messages/mark_read.json',
        form: {
            last_read_event_id: messageId,
            recipient_id: senderId,
        },
        oauth: auth,
    };

    await post(requestConfig);
}


let message = {
    sayHi,
    sendMessage,
    indicateTyping,
    markAsRead
}

module.exports = message