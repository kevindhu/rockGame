const entityConfig = require('./entity/entityConfig');
const Arithmetic = require('./modules/Arithmetic');
function PacketHandler(gameServer) {
    this.gameServer = gameServer;
    this.CHUNK_PACKETS = {};
    this.masterPacket = [];
    this.initChunkPackets();
}


PacketHandler.prototype.sendVerificationPackets = function (socket) {
    socket.emit('initVerification', {}); //make this more secure
};

PacketHandler.prototype.initChunkPackets = function () {
    for (var i = 0; i < entityConfig.CHUNKS; i++) {
        this.CHUNK_PACKETS[i] = [];
    }
};


PacketHandler.prototype.sendChunkInitPackets = function (socket, chunk) {
     socket.emit('updateEntities', this.createChunkPacket(chunk, socket.id));
};

PacketHandler.prototype.createChunkPacket = function (chunk, id) {
    var initPacket = [];
    var populate = function (list, call) {
        var count = 0;
        for (var i in list) {
            var entity = list[i];
            initPacket.push(call(entity, true));
            count++;
        }
    };

    populate(this.gameServer.CHUNKS[chunk].CONTROLLER_LIST, this.addControllerPackets);
    populate(this.gameServer.CHUNKS[chunk].ASTEROID_LIST, this.addAsteroidPackets);
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
    populate(this.gameServer.CHUNKS[chunk].TILE_LIST, this.deleteTilePackets);
    populate(this.gameServer.CHUNKS[chunk].ASTEROID_LIST, this.deleteAsteroidPackets);
    return deletePacket;
};


PacketHandler.prototype.addPromptMsgPackets = function (player, message) {
    this.CHUNK_PACKETS[player.chunk].push(
        {
            master: "add",
            class: "UIInfo",
            playerId: player.id,
            action: "gameMsgPrompt",
            message: message
        });
};


PacketHandler.prototype.addUIPackets = function (player, home, action) {
    var homeId;
    if (home === null) {
        homeId = null;
    }
    else {
        homeId = home.id;
    }

    this.CHUNK_PACKETS[player.chunk].push(
        {
            master: "add",
            class: "UIInfo",
            playerId: player.id,
            homeId: homeId,
            action: action
        });
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
        thetas : asteroid.thetas
    };
    if (ifInit) {
        return info;
    }
    else {
        this.CHUNK_PACKETS[asteroid.chunk].push(info);
    }
}

PacketHandler.prototype.addAsteroidAnimationPackets = function (asteroid) {
    this.CHUNK_PACKETS[asteroid.chunk].push(
        {
            master: "add",
            class: "animationInfo",
            type: "asteroidDeath",
            id: asteroid.id,
            x: asteroid.x,
            y: asteroid.y
        })
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


PacketHandler.prototype.addChatPackets = function (name, message) {
    this.masterPacket.push({
        master: "add",
        class: "chatInfo",
        name: name,
        chatMessage: message
    });
};




PacketHandler.prototype.updateUIPackets = function (player, home, action) {
    var homeId;
    if (home === null) {
        homeId = null;
    }
    else {
        homeId = home.id;
    }

    this.CHUNK_PACKETS[player.chunk].push(
        {
            master: "update",
            class: "UIInfo",
            playerId: player.id,
            homeId: homeId,
            action: action
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
    if (asteroid.theta > 300) {
        console.log("ASS");
    }


    this.CHUNK_PACKETS[asteroid.chunk].push({
        master: "update",
        class: "asteroidInfo",
        id: asteroid.id,
        x: asteroid.x,
        y: asteroid.y,
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


PacketHandler.prototype.deleteUIPackets = function (player, action) {
    if (!player.id) {
        var meme = player.id.sdf;
    }
    this.CHUNK_PACKETS[player.chunk].push({
        master: "delete",
        class: "UIInfo",
        id: player.id,
        action: action
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
            socket.emit('updateEntities', this.masterPacket);
            var chunks = player.findNeighboringChunks();
            for (id in chunks) {
                socket.emit('updateEntities', this.CHUNK_PACKETS[id]);
            }
        }
    }
    this.resetPackets();
};

PacketHandler.prototype.findChunks = function (socket) {
    var rowLength = Math.sqrt(entityConfig.CHUNKS);
    var chunks = [];

    for (var i = 0; i < 9; i++) {
        var chunk = socket.player.chunk;
        var xIndex = i % 3 - 1;
        var yIndex = Math.floor(i / 3) - 1;

        while (!(chunk % rowLength + xIndex).between(0, rowLength - 1) ||
        !(Math.floor(chunk / rowLength) + yIndex).between(0, rowLength - 1)) {
            i++;
            if (i > 8) {
                return chunks;
            }
            xIndex = i % 3 - 1;
            yIndex = Math.floor(i / 3) - 1;
        }
        chunk += xIndex + rowLength * yIndex;
        chunks.push(chunk);
    }
    return chunks;
};


PacketHandler.prototype.resetPackets = function () {
    var id;
    for (id in this.CHUNK_PACKETS) {
        this.CHUNK_PACKETS[id] = [];
    }
    this.masterPacket = [];
};


module.exports = PacketHandler;