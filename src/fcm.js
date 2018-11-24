const FCM = require('fcm-node');
const serverKey = 'AAAAec-VnUM:APA91bEHq2pXYOgNlcdonXnhQ-6Q_9EImw_O6SLDsZ_xbSo2vIf5ms9YG-lYxcHicyIzwo5xjtaPYFDw7gr9eAjS9y5RPn_VOjkcfGW_Qyyrlo1MKe4ss04t7mqMoeiyCHuNHC5YaMJp'
const fcm = new FCM(serverKey);

const createMessage = (to, body) => ({
    to,
    collapse_key: 'QueHaceres',

    notification: {
        title: 'Nueva Notificación',
        body
    }
})

module.exports = function (token, message) {
    if (process.env.NODE_ENV === 'production') {
        fcm.send(createMessage(token, message), (err, res) => {
            if (err) {
                console.log('Error')
            } else {
                console.log('Message sent')
            }
        })
    }
}