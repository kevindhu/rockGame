var B2 = require('../../modules/B2');
var B2Common = require('../../modules/B2Common');

function Miner(x, y, parent) {
    this.gameServer = parent.gameServer;
    this.packetHandler = parent.packetHandler;
    this.chunk = parent.chunk;

    this.id = Math.random();

    this.parent = parent;

    this.body = B2Common.createSensorDefault(x, y, 1, this.gameServer.box2d_world, this);
    this.health = 10;

    this.packetHandler.addRockPackets(this);
}


Miner.prototype.tick = function () {
    this.health -= 1;

    if (this.health <= 0) {
        this.onDelete();
    }
};

Miner.prototype.onDelete = function () {
    this.parent.removeMiner(this);
    this.gameServer.box2d_world.DestroyBody(this.body);

    this.packetHandler.deleteRockPackets(this);
};

module.exports = Miner;