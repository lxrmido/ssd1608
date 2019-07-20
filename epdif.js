var SPI = require('pi-spi');
var gpio = require('rpi-gpio');
var gpiop = gpio.promise;

// Pin definition
const RST_PIN         = 11 // BCM 17
const DC_PIN          = 22 // BCM 25
const CS_PIN          = 24 // BCM 8
const BUSY_PIN        = 18 // BCM 24

let spi = null;

function epd_digital_write (pin, value) {
    return gpiop.write(pin, value);
}

function epd_digital_read (pin) {
    return gpiop.read(pin)
}

function spi_transfer (data) {
    return new Promise(function (resolve, reject) {
        function done(error) {
            if (error) return reject(error);
            resolve();
        }
        spi.write(data, done);
    })
}

function epd_init (dev = "/dev/spidev0.0") {
    return new Promise(function (resolve, reject) {

        spi = SPI.initialize(de);
        spi.clockSpeed(2000000);

        Promise.all([
            gpiop.setup(RST_PIN, gpio.DIR_OUT),
            gpiop.setup(DC_PIN, gpio.DIR_OUT),
            gpiop.setup(CS_PIN, gpio.DIR_OUT),
            gpiop.setup(BUSY_PIN, gpio.DIR_OUT)
        ]).then(() => {
            resolve();
        }).catch(error => {
            reject(error);
        })
        
    });
    
}

module.exports = {
    epd_digital_write: epd_digital_write,
    epd_digital_read: epd_digital_read,
    spi_transfer: spi_transfer,
    epd_init: epd_init,

    RST_PIN: RST_PIN,
    DC_PIN: DC_PIN,
    CS_PIN: CS_PIN,
    BUSY_PIN: BUSY_PIN
};