const entityConfig = require('../entityConfig');
const B2Common = require('../../modules/B2Common');

function Wall(x, y, width, length, gameServer) {
    this.gameServer = gameServer;
    this.packetHandler = gameServer.packetHandler;

    this.id = Math.random() * 10000;
    this.x = x;
    this.y = y;

    this.width = width;
    this.length = length;

    this.init();
}

Wall.prototype.init = function () {
    this.initB2();
};


Wall.prototype.initB2 = function () {
    B2Common.createBox(this.gameServer.box2d_world, this,
        this.x, this.y, this.width, this.length);
};


module.exports = Wall;
