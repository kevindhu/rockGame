var B2 = require('../../modules/B2');
var B2Common = require('../../modules/B2Common');

function PlayerSensor(parent, range) {
    this.parent = parent;
    this.id = Math.random();
    this.parent = parent;

    B2Common.createCircleSensor(parent.body, this, range);
}





module.exports = PlayerSensor;