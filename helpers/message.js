const util = require('util');
const request = require('request');
const auth = require('./auth')

const post = util.promisify(request.post);
const get = util.promisify(request.get);
const del = util.promisify(request.delete);


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

let generateWelcomeMessage = async() => {
    const requestConfig = {
        url: 'https://api.twitter.com/1.1/direct_messages/welcome_messages/new.json',
        oauth: auth.twitter_oauth,
        json: true,
        body: {
            name: 'simple-welcome-message',
            welcome_message: {
                message_data: {
                    "text": `Welcome to Quoted Replies. Share a link to a tweet you want to see the replies.
                    \nIf the link doesn't come immediately kindly resend the link.`,
                    "ctas": [{
                        type: "web_url",
                        label: "Buy me coffee",
                        url: "https://www.buymeacoffee.com/TZc3Nfp"
                    }]
                },
            }
        }
    };
    await post(requestConfig).then(async function(resp) {
        const requestConfig = {
            url: 'https://api.twitter.com/1.1/direct_messages/welcome_messages/rules/new.json',
            oauth: auth.twitter_oauth,
            json: true,
            body: {
                welcome_message_rule: {
                    welcome_message_id: resp.body.welcome_message.id
                }
            }
        };
        await post(requestConfig).then(resp => console.log("welcome message was set"))
    }).catch(function(err) {
        console.log(err)
    });
}

let deleteWelcomeMessage = async() => {

    const requestConfig = {
        url: 'https://api.twitter.com/1.1/direct_messages/welcome_messages/rules/list.json',
        oauth: auth.twitter_oauth,
    };

    // get 
    await get(requestConfig)
        .then(async response => {
            if (typeof response.body != 'object') {
                response.body = JSON.parse(response.body)
            }

            if (response.body.welcome_message_rules) {
                let welcome_message_id = response.body.welcome_message_rules[0].id

                const requestConfig = {
                    url: 'https://api.twitter.com/1.1/direct_messages/welcome_messages/rules/destroy.json',
                    oauth: auth.twitter_oauth,
                    qs: {
                        id: welcome_message_id
                    }
                };

                await del(requestConfig)
                    .then(() => { console.log("deleted message") })
                    .catch(err => console.log(err))

            }
        }).catch(err => console.log(err))

}


let message = {
    sayHi,
    sendMessage,
    indicateTyping,
    markAsRead
}
deleteWelcomeMessage()
generateWelcomeMessage()

module.exports = message