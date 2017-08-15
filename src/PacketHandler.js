const entityConfig = require('./entity/entityConfig');
const Arithmetic = require('./modules/Arithmetic');
const BinaryWriter = require('./packet/BinaryWriter');


function PacketHandler(gameServer) {
    this.gameServer = gameServer;

    this.CHUNK_PACKETS = {};

    this._CHUNK_PACKETS = {};


    this.masterPacket = [];
    this.resetChunkPackets();
}


function Packet() {
    this.addAsteroids = new BinaryWriter();
    this.addControllers = new BinaryWriter();

    this.updateAsteroids = new BinaryWriter();
    this.updateControllers = new BinaryWriter();

    this.deleteAsteroids = new BinaryWriter();
    this.deleteControllers = new BinaryWriter();
}

Packet.prototype.build = function () {
    var writer = new BinaryWriter();

    // Write update record
    writer.writeUInt8(0x13);
    writer.writeBytes(this.addAsteroids.toBuffer());

    writer.writeUInt8(0x2);
    writer.writeBytes(this.addControllers.toBuffer());

    writer.writeUInt8(0x3);
    writer.writeBytes(this.deleteAsteroids.toBuffer());

    writer.writeUInt8(0x4);
    writer.writeBytes(this.deleteControllers.toBuffer());

    writer.writeUInt8(0x5);
    writer.writeBytes(this.updateAsteroids.toBuffer());

    writer.writeUInt8(0x6);
    writer.writeBytes(this.updateControllers.toBuffer());

    writer.writeUInt16(0 >> 0); //terminate record
    return writer.toBuffer();
};


PacketHandler.prototype.sendVerificationPackets = function (socket) {
    socket.emit('initVerification', {}); //make this more secure
};

PacketHandler.prototype.resetChunkPackets = function () {
    for (var i = 0; i < entityConfig.CHUNKS; i++) {
        this.CHUNK_PACKETS[i] = [];
        this._CHUNK_PACKETS[i] = new Packet();
    }

    this.masterPacket = [];
};


PacketHandler.prototype.sendChunkInitPackets = function (socket, chunk) {
    socket.emit('updateEntities', this.createChunkPacket(chunk, socket.id));
    socket.emit('updateLOL', this._createChunkPacket(chunk));
};


PacketHandler.prototype.createChunkPacket = function (chunk, id) {
    var CONTROLLER_LIST = this.gameServer.CHUNKS[chunk].CONTROLLER_LIST;
    var ASTEROID_LIST = this.gameServer.CHUNKS[chunk].ASTEROID_LIST;
    var initPacket = [];
    var populate = function (list, call) {
        for (var i in list) {
            var entity = list[i];
            initPacket.push(call(entity, true));
        }
    };

    populate(CONTROLLER_LIST, this.addControllerPackets);
    populate(ASTEROID_LIST, this.addAsteroidPackets);
    populate(this.gameServer.CHUNKS[chunk].TILE_LIST, this.addTilePackets);
    if (id) {
        initPacket.push({
            master: "add",
            class: "selfId",
            selfId: id
        });
    }

    return initPacket;
};


PacketHandler.prototype._createChunkPacket = function (chunk) {
    var CONTROLLER_LIST = this.gameServer.CHUNKS[chunk].CONTROLLER_LIST;
    var ASTEROID_LIST = this.gameServer.CHUNKS[chunk].ASTEROID_LIST;

    var populateBit = function (list, writer, call) {
        for (var i in list) {
            var entity = list[i];
            writer.writeBytes(call(entity,true));
        }
    };

    var packet = new Packet();
    //populateBit(CONTROLLER_LIST, packet.addControllers, this._addControllerPackets);
    populateBit(ASTEROID_LIST, packet.addAsteroids, this._addAsteroidPackets);

    var buffer = packet.build();
    return buffer;
};


PacketHandler.prototype.deleteChunkPacket = function (chunk) {
    var deletePacket = [];
    var populate = function (list, call) {
        var count = 0;
        for (var i in list) {
            var entity = list[i];
            deletePacket.push(call(entity, true));
            count++;
        }
    };

    populate(this.gameServer.CHUNKS[chunk].CONTROLLER_LIST, this.deleteControllerPackets);
    populate(this.gameServer.CHUNKS[chunk].TILE_LIST, this.deleteTilePackets); //make this thing work
    populate(this.gameServer.CHUNKS[chunk].ASTEROID_LIST, this.deleteAsteroidPackets);
    return deletePacket;
};


PacketHandler.prototype._addControllerPackets = function (controller, ifInit) {
    var info = controller.handler.addInfo();
    if (ifInit) {
        return info;
    }
    else {
        this._CHUNK_PACKETS[controller.chunk].addControllers.writeBytes(info);
    }
};
PacketHandler.prototype._addAsteroidPackets = function (asteroid, ifInit) {
    var info = asteroid.handler.addInfo();
    if (ifInit) {
        return info;
    }
    else {
        this._CHUNK_PACKETS[asteroid.chunk].addAsteroids.writeBytes(info);
    }
};


PacketHandler.prototype._updateControllersPackets = function (controller) {
    var temp = {
        master: "update",
        class: "controllerInfo",
        id: controller.id,
        x: controller.x,
        y: controller.y,
        health: controller.health,
        maxHealth: controller.maxHealth,
        theta: controller.theta,
        level: controller.level,
        selected: controller.selected,
        active: controller.active,
        slash: controller.slash,
        radius: controller.radius,
        range: controller.range
    };

    var info = controller.handler.updateInfo();
    this._CHUNK_PACKETS[controller.chunk].updateControllers.writeBytes(info);
};


PacketHandler.prototype._updateAsteroidsPackets = function (asteroid) {
    var info = asteroid.handler.updateInfo();
    this._CHUNK_PACKETS[asteroid.chunk].updateAsteroids.writeBytes(info);
};

PacketHandler.prototype._deleteControllerPackets = function (controller, chunk) {
    var info = controller.handler.deleteInfo();
    if (chunk) {
        return info;
    } else {
        this._CHUNK_PACKETS[controller.chunk].deleteControllers.writeBytes(info);
    }
};


PacketHandler.prototype._deleteAsteroidPackets = function (asteroid, chunk) {
    var info = asteroid.handler.deleteInfo();
    if (chunk) {
        return info;
    } else {
        this._CHUNK_PACKETS[asteroid.chunk].deleteAsteroids.writeBytes(info);
    }
};


PacketHandler.prototype.addTilePackets = function (tile, ifInit) {
    return {
        master: "add",
        class: "tileInfo",
        id: tile.id,
        x: tile.x,
        y: tile.y,
        color: tile.color,
        length: tile.length,
        alert: tile.alert
    };
};

PacketHandler.prototype.addControllerPackets = function (controller, ifInit) {
    var info = {
        master: "add",
        class: "controllerInfo",
        id: controller.id,
        name: controller.name,
        x: controller.x,
        y: controller.y,
        health: controller.health,
        maxHealth: controller.maxHealth,
        theta: controller.theta,
        level: controller.level,
        radius: controller.radius,
        active: controller.active,
        range: controller.range
    };
    if (ifInit) {
        return info;
    }
    else {
        this.CHUNK_PACKETS[controller.chunk].push(info);
    }
};
PacketHandler.prototype.addAsteroidPackets = function (asteroid, ifInit) {
    var info = {
        master: "add",
        class: "asteroidInfo",
        id: asteroid.id,
        x: asteroid.x,
        y: asteroid.y,
        radius: asteroid.radius,
        health: asteroid.health,
        maxHealth: asteroid.maxHealth,
        material: asteroid.material,
        displayTheta: asteroid.displayTheta,
        theta: asteroid.theta,
        thetas: asteroid.thetas
    };
    if (ifInit) {
        return info;
    }
    else {
        this.CHUNK_PACKETS[asteroid.chunk].push(info);
    }
};
PacketHandler.prototype.addSlashAnimationPackets = function (controller, x, y, id) {
    this.CHUNK_PACKETS[controller.chunk].push(
        {
            master: "add",
            class: "animationInfo",
            type: "slash",
            id: controller.id,
            x: x,
            y: y,
            slashId: id
        })
};
PacketHandler.prototype.addChatPackets = function (name, message) {
    this.masterPacket.push({
        master: "add",
        class: "chatInfo",
        name: name,
        chatMessage: message
    });
};

PacketHandler.prototype.updateControllersPackets = function (controller) {
    this.CHUNK_PACKETS[controller.chunk].push({
        master: "update",
        class: "controllerInfo",
        id: controller.id,
        x: controller.x,
        y: controller.y,
        health: controller.health,
        maxHealth: controller.maxHealth,
        theta: controller.theta,
        level: controller.level,
        selected: controller.selected,
        active: controller.active,
        slash: controller.slash,
        radius: controller.radius,
        range: controller.range
    });
};
PacketHandler.prototype.updateAsteroidsPackets = function (asteroid) {
    var owner;
    if (asteroid.owner) {
        owner = asteroid.owner.id;
    }
    else {
        owner = null;
    }


    this.CHUNK_PACKETS[asteroid.chunk].push({
        master: "update",
        class: "asteroidInfo",
        id: asteroid.id,
        x: asteroid.x,
        y: asteroid.y,
        owner: owner,
        radius: asteroid.radius,
        currPath: asteroid.currPath,
        queuePosition: asteroid.queuePosition,
        targetPt: asteroid.targetPt,
        health: asteroid.health,
        maxHealth: asteroid.maxHealth,
        theta: asteroid.theta,
        displayTheta: asteroid.displayTheta,
        shooting: asteroid.shooting,
        glowing: asteroid.glowing,
        fast: asteroid.fast
    });
};

PacketHandler.prototype.deleteControllerPackets = function (controller, chunk) {
    var info = {
        master: "delete",
        class: "controllerInfo",
        id: controller.id
    };
    if (chunk) {
        return info;
    } else {
        this.CHUNK_PACKETS[controller.chunk].push(info);
    }
};
PacketHandler.prototype.deleteAsteroidPackets = function (asteroid, chunk) {
    var info = {
        master: "delete",
        class: "asteroidInfo",
        id: asteroid.id
    };
    if (chunk) {
        return info;
    }
    this.CHUNK_PACKETS[asteroid.chunk].push(info);
};
PacketHandler.prototype.deleteUIPackets = function (player, action) {
    this.CHUNK_PACKETS[player.chunk].push({
        master: "delete",
        class: "UIInfo",
        id: player.id,
        action: action
    });
};


PacketHandler.prototype.sendPackets = function () {
    var id;
    for (var index in this.gameServer.SOCKET_LIST) {
        var socket = this.gameServer.SOCKET_LIST[index];
        if (socket.player) {
            var player = socket.player;

            if (player.chunkAdd) {
                for (id in player.chunkAdd) {
                    socket.emit('updateEntities', this.createChunkPacket(id));
                }
            }
            if (player.chunkDelete) {
                for (id in player.chunkDelete) {
                    socket.emit('updateEntities', this.deleteChunkPacket(id));
                }
            }


            socket.emit('updateEntities', this.masterPacket); //global updates


            var chunks = player.findNeighboringChunks();
            for (id in chunks) {
                socket.emit('updateEntities', this.CHUNK_PACKETS[id]);
                socket.emit('updateLOLE', this._CHUNK_PACKETS[id].build());
            }
        }
    }
    this.resetChunkPackets();
};


module.exports = PacketHandler;