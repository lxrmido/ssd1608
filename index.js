var EPD = require('./epd1in54.js');

var epd = new epd();

epd.init(EPD.lut_full_update).then(d => {
    console.log('EPD init.')
    epd.clear_frame_memory(0xFF).then(() => {
        console.log('clear_frame_memory')
        epd.display_frame().then(() => {
            console.log('display_frame')
        }).catch(error => {
            console.log('display_frame failed: ' + error)
        })
    }).catch(error => {
        console.log('clear_frame_memory failed: ' + error)
    })
}).catch(error => {
    console.log('EPD init failed: ' + error)
})