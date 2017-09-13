var B2 = require('../../modules/B2');
var B2Common = require('../../modules/B2Common');

function PlayerSensor(parent, range) {
    this.parent = parent;
    this.id = Math.random();
    this.parent = parent;

    this.fixture = B2Common.createCircleSensor(this.parent.body, this, range);
}



PlayerSensor.prototype.onDelete = function () {
    this.parent.body.DestroyFixture(this.fixture);
    this.fixture = null;
};



module.exports = PlayerSensor;