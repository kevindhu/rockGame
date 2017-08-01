const entityConfig = require('../entityConfig');
const Arithmetic = require('../../modules/Arithmetic');
var EntityFunctions = require('../EntityFunctions');
var Player = require('../units/Player');
var Headquarter = require('../structures/Headquarter');

function Faction(name, gameServer) {
    this.id = Math.random();
    this.gameServer = gameServer;
    this.packetHandler = gameServer.packetHandler;
    this.name = name;
    this.controllers = [];
    this.homes = [];
    this.init();
}

Faction.prototype.init = function () {
    this.getInitCoords();
    this.gameServer.FACTION_LIST[this.name] = this;
    this.chunk = EntityFunctions.findChunk(this.gameServer, this);
    this.gameServer.CHUNKS[this.chunk].FACTION_LIST[this.name] = this;
    this.packetHandler.addFactionPackets(this);

    this.addHeadquarter();
};

Faction.prototype.getInitCoords = function () {
    var tile = null;
    var coords = {};
    while (tile === null || tile.faction !== null) {
        coords['x'] = Arithmetic.getRandomInt(entityConfig.BORDER_WIDTH, entityConfig.WIDTH - entityConfig.BORDER_WIDTH);
        coords['y'] = Arithmetic.getRandomInt(entityConfig.BORDER_WIDTH, entityConfig.WIDTH - entityConfig.BORDER_WIDTH);
        tile = this.gameServer.getEntityTile(coords);
    }
    this.x = tile.x + tile.length / 2;
    this.y = tile.y + tile.length / 2;
};

Faction.prototype.updateCoords = function () {
    var avgCoords = [0, 0];
    for (var i = 0; i < this.homes.length; i++) {
        var home = this.gameServer.HOME_LIST[this.homes[i]];
        avgCoords[0] += home.x;
        avgCoords[1] += home.y;
    }
    this.x = avgCoords[0] / this.homes.length;
    this.y = avgCoords[1] / this.homes.length;

    this.packetHandler.updateFactionPackets(this);
};

Faction.prototype.addPlayer = function (id, playerName) {
    var player = new Player(id, playerName, this, this.gameServer);
    this.controllers.push(player.id);
    return player;
};



Faction.prototype.addHeadquarter = function () {
    if (!this.headquarter) {
        var headquarter = new Headquarter(this, this.x, this.y, this.gameServer);
        this.headquarter = headquarter.id;
        this.homes.push(headquarter.id);
        this.updateCoords();
    }
};





Faction.prototype.removeHome = function (home) {
    var index = this.homes.indexOf(home.id);
    this.homes.splice(index, 1);
    this.checkStatus();
};

Faction.prototype.removeController = function (player) {
    var index = this.controllers.indexOf(player.id);
    this.controllers.splice(index, 1);
    this.checkStatus();
};


Faction.prototype.checkStatus = function () {
    if (this.homes.length === 0 && this.controllers.length === 0) {
        this.onDelete();
    }
};


Faction.prototype.onDelete = function () {
    delete this.gameServer.FACTION_LIST[this.name];
    delete this.gameServer.CHUNKS[this.chunk].FACTION_LIST[this.name];
    this.packetHandler.deleteFactionPackets(this);
};


module.exports = Faction;