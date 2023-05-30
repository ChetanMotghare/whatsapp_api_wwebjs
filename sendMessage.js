const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const path = require('path');
const fs = require('fs');
const sessions = require('./sessions');

async function sendMessage(req, res) {
    const { sessionId, mobileNumbers, texts, mediaData = [], mimeTypes = [], captions = [] } = req.body;
 
   
    try {
        const sessionFolder = path.join(__dirname, '.wwebjs_auth', `session-${sessionId}`);
        const folderExists = await fs.promises.access(sessionFolder).then(() => true).catch(() => false);

        if (!folderExists) {
            return res.status(401).send("Session not found. Please generate a QR code and login again.")
        }
      
      let client = sessions[sessionId]?.client;

        if (!client) {
            console.log("initializing new client")
            client = initializeClient(sessionId);
        }

        client.on('ready', () => {
            console.log('Session stored successfully', sessionId);
            sendMessageWithClient(client, mobileNumbers, texts, mediaData, mimeTypes, captions)
                .then(() => {
                    sessions[sessionId] = { client };
                    res.status(200).send("Message Sent....")
                })
                .catch(error => {
                    res.status(401).json({ error: error.message });
                });
        });

        client.initialize();

    } catch (error) {
        console.error("catch block",error.message);
        res.status(401).send("Invalid json body")
    }
}

function initializeClient(sessionId) {
    const client = new Client({
        authStrategy: new LocalAuth({ clientId: sessionId })
    });
    return client;
}

async function sendMediaMessage(client, mobileNumber, mimeType, base64Data, captiontext) {
    const media = new MessageMedia(mimeType, base64Data);
    console.log(client, mobileNumber, mimeType, base64Data, captiontext);
    await client.sendMessage(`${mobileNumber}@s.whatsapp.net`, media, { caption: captiontext });
}

async function sendMessageWithClient(client, mobileNumbers, texts, mediaData, mimeTypes, captions) {
    for (let i = 0; i < mobileNumbers.length; i++) {
        const mobileNumber = mobileNumbers[i];
        const text = texts[i];
        const mimeType = mimeTypes[i];
        const base64Data = mediaData[i];
        const captiontext = captions[i];

        if (base64Data && mimeType && captiontext && text) {
            await sendMediaMessage(client, mobileNumber, mimeType, base64Data, captiontext);
            await client.sendMessage(`${mobileNumber}@s.whatsapp.net`, text);
        } else if (base64Data && mimeType) {
            await sendMediaMessage(client, mobileNumber, mimeType, base64Data, captiontext);
        } else {
            await client.sendMessage(`${mobileNumber}@s.whatsapp.net`, text);
        }
    }
}




module.exports.sendMessage = sendMessage;













