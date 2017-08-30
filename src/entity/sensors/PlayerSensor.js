var B2 = require('../../modules/B2');
var B2Common = require('../../modules/B2Common');

function PlayerSensor(parent) {
    this.parent = parent;
    this.id = Math.random();
    this.parent = parent;

    B2Common.createCircleSensor(parent.body, this, 6);
}





module.exports = PlayerSensor;