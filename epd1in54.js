var epdif = require('./epdif');
var gpio = require('rpi-gpio');
var gpiop = gpio.promise;

// Display resolution
const EPD_WIDTH       = 200
const EPD_HEIGHT      = 200

// EPD1IN54 commands
const DRIVER_OUTPUT_CONTROL                       = 0x01;
const BOOSTER_SOFT_START_CONTROL                  = 0x0C;
const GATE_SCAN_START_POSITION                    = 0x0F;
const DEEP_SLEEP_MODE                             = 0x10;
const DATA_ENTRY_MODE_SETTING                     = 0x11;
const SW_RESET                                    = 0x12;
const TEMPERATURE_SENSOR_CONTROL                  = 0x1A;
const MASTER_ACTIVATION                           = 0x20;
const DISPLAY_UPDATE_CONTROL_1                    = 0x21;
const DISPLAY_UPDATE_CONTROL_2                    = 0x22;
const WRITE_RAM                                   = 0x24;
const WRITE_VCOM_REGISTER                         = 0x2C;
const WRITE_LUT_REGISTER                          = 0x32;
const SET_DUMMY_LINE_PERIOD                       = 0x3A;
const SET_GATE_TIME                               = 0x3B;
const BORDER_WAVEFORM_CONTROL                     = 0x3C;
const SET_RAM_X_ADDRESS_START_END_POSITION        = 0x44;
const SET_RAM_Y_ADDRESS_START_END_POSITION        = 0x45;
const SET_RAM_X_ADDRESS_COUNTER                   = 0x4E;
const SET_RAM_Y_ADDRESS_COUNTER                   = 0x4F;
const TERMINATE_FRAME_READ_WRITE                  = 0xFF;

const lut_full_update = [
    0x02, 0x02, 0x01, 0x11, 0x12, 0x12, 0x22, 0x22, 
    0x66, 0x69, 0x69, 0x59, 0x58, 0x99, 0x99, 0x88, 
    0x00, 0x00, 0x00, 0x00, 0xF8, 0xB4, 0x13, 0x51, 
    0x35, 0x51, 0x51, 0x19, 0x01, 0x00
];

const lut_partial_update  = [
    0x10, 0x18, 0x18, 0x08, 0x18, 0x18, 0x08, 0x00, 
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
    0x00, 0x00, 0x00, 0x00, 0x13, 0x14, 0x44, 0x12, 
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00
];

function EPD1IN54() {

    this.reset_pin = epdif.RST_PIN;
    this.dc_pin = epdif.DC_PIN;
    this.busy_pin = epdif.BUSY_PIN;
    this.width = EPD_WIDTH;
    this.height = EPD_HEIGHT;
    this.lut = lut_full_update;

    this.digital_write = function (pin, value) {
        return epdif.digital_write(pin, value);
    };

    this.digital_read = function (pin) {
        return epdif.digital_read(pin);
    };

    this.send_command = function (command) {
        return new Promise( (resolve, reject) => {
            epdif.digital_write(this.dc_pin, false).then(() => {
                epdif.spi_transfer(new Buffer(command)).then(() => {
                    resolve();
                }).catch(error => {
                    reject(error);
                });
            }).catch(error => {
                reject(error);
            });
        })
    };

    this.send_data = function (data) {
        return new Promise( (resolve, reject) => {
            epdif.digital_write(this.dc_pin, true).then(() => {
                epdif.spi_transfer(new Buffer([data])).then(() => {
                    resolve();
                }).catch(error => {
                    reject(error);
                });
            }).catch(error => {
                reject(error);
            });
        })
    };

    this.send_data_array = function (array) {
        return new Promise( (resolve, reject) => {
            let i = 0;
            let f = () => {
                if (i < array.length) {
                    this.send_data(array[i]).then(() => {
                        i ++;
                        f();
                    }).catch(error => {
                        reject();
                    })
                } else {
                    resolve();
                }
            };
            f();
        })
    };

    this.send_mixed_array = function (array) {
        return new Promise( (resolve, reject) => {
            let i = 0;
            let f = () => {
                if (i < array.length) {
                    let g = array[i].type == 'command' ? 
                        this.send_command :
                        this.send_data;
                    g(array[i].data).then(() => {
                        i ++;
                        f();
                    }).catch(error => {
                        reject();
                    })
                } else {
                    resolve();
                }
            };
            f();
        })
    };

    this.init = function (lut, dev = "/dev/spidev0.0") {
        return new Promise( (resolve, reject) => {
            epdif.epd_init(dev).then(() => {
                this.lut = lut;
            }).catch(error => {
                reject(error);
            })
        });
    };

    this.wait_until_idle = function () {
        return new Promise( (resolve, reject) => {
            let f = () => {
                this.epd_digital_read(this.busy_pin).then((d) => {
                    if (d) {
                        setTimeout(f, 100);
                    } else {
                        resolve();
                    }
                }).catch(error => {
                    reject(error);
                })
            };
            f();
        });
    };

    this.reset = function () {
        return new Promise( (resolve, reject) => {
            this.digital_write(this.reset_pin, false).then(() => {
                setTimeout(() => {
                    this.digital_write(this.reset_pin).then(() => {
                        setTimeout(() => {
                            resolve();
                        }, 200);
                    }).catch(error => {
                        reject(error);
                    })
                }, 200);
            }).catch(error => {
                reject(error);
            })
        })
    };

    this.set_lut = function (lut) {
        return new Promise( (resolve, reject) => {
            this.lut = lut;
            this.send_command(WRITE_LUT_REGISTER).then(() => {
                this.send_data_array(lut).then(() => {
                    resolve();
                }).catch(error => {
                    reject();
                })
            }).catch(error => {
                reject(error);
            })
        });
    };

    this.get_frame_buffer = function () {
        return new Promise( (resolve, reject) => {
            let buffer = new Buffer(this.width * this.height);
        });
    };

    this.clear_frame_memory = function (color) {
        return new Promise( (resolve, reject) => {
            this.set_memory_area(0, 0, this.width - 1, this.height - 1).then(() => {
                this.set_memory_pointer(0, 0).then(() => {
                    this.send_command(WRITE_RAM).then(() => {
                        let dataArray = [];
                        for (let i = 0; i < this.width / 8 * this.height; i ++) {
                            dataArray[i] = color;
                        }
                        this.send_data_array(dataArray).then(() => {
                            resolve();
                        })
                    })
                })
            })
        })
    };

    this.display_frame = function () {
        return new Promise( (resolve, reject) => {
            this.send_mixed_array([
                {
                    type: 'command',
                    data: DISPLAY_UPDATE_CONTROL_2
                },
                {
                    type: 'data',
                    data: 0xC4
                },
                {
                    type: 'command',
                    data: MASTER_ACTIVATION
                },
                {
                    type: 'command',
                    data: TERMINATE_FRAME_READ_WRITE
                },
            ]).then(() => {
                this.wait_until_idle().then(() => {
                    resolve();
                }).catch(error => {
                    reject(error)
                })
            }).catch(error => {
                this.reject(error)
            })
        });
    };

    this.set_memory_area = function (x_start, y_start, x_end, y_end) {
        return this.send_mixed_array([
            {
                type: 'command',
                data: SET_RAM_X_ADDRESS_START_END_POSITION
            },
            {
                type: 'data',
                data: (x_start >> 3) & 0xFF
            },
            {
                type: 'data',
                data: (x_end >> 3) & 0xFF
            },
            {
                type: 'command',
                data: SET_RAM_Y_ADDRESS_START_END_POSITION
            },
            {
                type: 'data',
                data: (y_start >> 8) & 0xFF
            },
            {
                type: 'data',
                data: y_end & 0xFF
            },
            {
                type: 'data',
                data: (y_end >> 8) & 0xFF
            },
        ])
    };

    this.set_memory_pointer = function (x, y) {
        return new Promise( (resolve, reject) => {
            this.send_mixed_array([
                {
                    type: 'command',
                    data: SET_RAM_X_ADDRESS_COUNTER
                },
                {
                    type: 'data',
                    data: (x >> 3) & 0xFF
                },
                {
                    type: 'command',
                    data: SET_RAM_Y_ADDRESS_COUNTER
                },
                {
                    type: 'data',
                    data: y & 0xFF
                },
                {
                    type: 'data',
                    data: (y >> 8) & 0xFF
                }
            ]).then(() => {
                this.wait_until_idle().then(() => {
                    resolve();
                }).catch(error => {
                    reject(error)
                })
            }).catch(error => {
                this.reject(error)
            })
        })
    }

};

module.exports = EPD1IN54;