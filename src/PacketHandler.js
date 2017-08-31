const entityConfig = require('./entity/entityConfig');
const Arithmetic = require('./modules/Arithmetic');
const BinaryWriter = require('./packet/BinaryWriter');
var B2 = require('./modules/B2');


function PacketHandler(gameServer) {
    this.gameServer = gameServer;

    this.CHUNK_PACKETS = {};

    this._CHUNK_PACKETS = {};


    this.masterPacket = [];
    this.resetChunkPackets();
}


function Packet() {
    this.addAsteroids = new BinaryWriter();
    this.addAsteroids.length = 0;
    this.addPlayers = new BinaryWriter();
    this.addAsteroids.length = 0;

    this.updateAsteroids = new BinaryWriter();
    this.addAsteroids.length = 0;
    this.updatePlayers = new BinaryWriter();
    this.addAsteroids.length = 0;

    this.deleteAsteroids = new BinaryWriter();
    this.addAsteroids.length = 0;
    this.deletePlayers = new BinaryWriter();
    this.addAsteroids.length = 0;
}

Packet.prototype.build = function () {
    var writer = new BinaryWriter();

    // Write update record
    writer.writeUInt8(this.addAsteroids.length);
    writer.writeBytes(this.addAsteroids.toBuffer());

    writer.writeUInt8(this.addPlayers.length);
    writer.writeBytes(this.addPlayers.toBuffer());

    writer.writeUInt8(0x3);
    writer.writeBytes(this.deleteAsteroids.toBuffer());

    writer.writeUInt8(0x4);
    writer.writeBytes(this.deletePlayers.toBuffer());

    writer.writeUInt8(0x5);
    writer.writeBytes(this.updateAsteroids.toBuffer());

    writer.writeUInt8(0x6);
    writer.writeBytes(this.updatePlayers.toBuffer());

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
    var PLAYER_LIST = this.gameServer.CHUNKS[chunk].PLAYER_LIST;
    var ASTEROID_LIST = this.gameServer.CHUNKS[chunk].ASTEROID_LIST;
    var initPacket = [];
    var populate = function (list, call) {
        for (var i in list) {
            var entity = list[i];
            initPacket.push(call(entity, true));
        }
    };

    populate(PLAYER_LIST, this.addPlayerPackets);
    populate(ASTEROID_LIST, this.addAsteroidPackets);
    populate(this.gameServer.CHUNKS[chunk].TILE_LIST, this.addTilePackets);
    populate(this.gameServer.CHUNKS[chunk].ROCK_LIST, this.addRockPackets);
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
    var PLAYER_LIST = this.gameServer.CHUNKS[chunk].PLAYER_LIST;
    var ASTEROID_LIST = this.gameServer.CHUNKS[chunk].ASTEROID_LIST;

    var populateBit = function (list, writer, call) {
        for (var i in list) {
            var entity = list[i];
            call(entity, writer);
        }
    };

    var packet = new Packet();

    //populateBit(PLAYER_LIST, this._addPlayerPackets, packet.addPlayers);
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

    populate(this.gameServer.CHUNKS[chunk].PLAYER_LIST, this.deletePlayerPackets);
    //populate(this.gameServer.CHUNKS[chunk].TILE_LIST, this.deleteTilePackets); //make this thing work
    populate(this.gameServer.CHUNKS[chunk].ASTEROID_LIST, this.deleteAsteroidPackets);
    return deletePacket;
};


PacketHandler.prototype._addPlayerPackets = function (player, ifInit) {
    var info = player.handler.addInfo();
    if (ifInit) {
        return info;
    }
    else {
        this._CHUNK_PACKETS[player.chunk].addPlayers.writeBytes(info);
    }
};
PacketHandler.prototype._addAsteroidPackets = function (asteroid, writer) {
    var info = asteroid.handler.addInfo();

    writer = writer ? writer : this._CHUNK_PACKETS[asteroid.chunk].addAsteroids;
    writer.writeBytes(info);
    writer.length++;
};
PacketHandler.prototype._updatePlayersPackets = function (player) {
    var temp = {
        master: "update",
        class: "playerInfo",
        id: player.id,
        x: player.x * 100,
        y: player.y * 100,
        health: player.health,
        maxHealth: player.maxHealth,
        theta: player.theta,
        level: player.level,
        selected: player.selected,
        active: player.active,
        slash: player.slash,
        radius: player.radius,
        range: player.range
    };

    var info = player.handler.updateInfo();
    this._CHUNK_PACKETS[player.chunk].updatePlayers.writeBytes(info);
};
PacketHandler.prototype._updateAsteroidsPackets = function (asteroid) {
    var info = asteroid.handler.updateInfo();
    this._CHUNK_PACKETS[asteroid.chunk].updateAsteroids.writeBytes(info);
};
PacketHandler.prototype._deletePlayerPackets = function (player, chunk) {
    var info = player.handler.deleteInfo();
    if (chunk) {
        return info;
    } else {
        this._CHUNK_PACKETS[player.chunk].deletePlayers.writeBytes(info);
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
        x: tile.x * 100,
        y: tile.y * 100,
        length: tile.length * 100,
        color: tile.color,
        alert: tile.alert
    };
};

PacketHandler.prototype.addPlayerPackets = function (player, ifInit) {
    var info = {
        master: "add",
        class: "playerInfo",
        id: player.id,
        name: player.name,
        x: player.x * 100,
        y: player.y * 100,
        health: player.health,
        maxHealth: player.maxHealth,
        theta: player.theta,
        level: player.level,
        radius: player.radius,
        active: player.active,
        vertices: player.vertices
    };
    if (ifInit) {
        return info;
    }
    else {
        this.CHUNK_PACKETS[player.chunk].push(info);
    }
};
PacketHandler.prototype.addAsteroidPackets = function (asteroid, ifInit) {
    var info = {
        master: "add",
        class: "asteroidInfo",
        id: asteroid.id,
        x: asteroid.x * 100,
        y: asteroid.y * 100,
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
PacketHandler.prototype.addSlashAnimationPackets = function (player, x, y, id) {
    this.CHUNK_PACKETS[player.chunk].push(
        {
            master: "add",
            class: "animationInfo",
            type: "slash",
            id: player.id,
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


PacketHandler.prototype.addRockPackets = function (rock, ifInit) {
    var vector = rock.body.GetPosition();
    var realPos = new B2.b2Vec2(vector.x * 100, vector.y * 100);
    var theta = rock.body.GetAngle();

    var info = {
        master: "add",
        class: "rockInfo",
        id: rock.id,
        x: realPos.x,
        y: realPos.y,
        vertices: rock.vertices,
        theta: theta,
        texture: rock.texture,
        neutral: rock.neutral
    };
    if (ifInit) {
        return info;
    }
    else {
        this.CHUNK_PACKETS[rock.chunk].push(info);
    }
};


PacketHandler.prototype.updateRockPackets = function (rock) {
    var pos = rock.body.GetPosition();
    pos = new B2.b2Vec2(pos.x * 100, pos.y * 100);

    var owner = rock.owner ? rock.owner.id : null;
    var theta = rock.body.GetAngle();

    var info = {
        master: "update",
        class: "rockInfo",
        id: rock.id,
        x: pos.x,
        y: pos.y,
        theta: theta,
        owner: owner,
        neutral: rock.neutral,
        maxHealth: rock.maxHealth,
        health: rock.health,
        fast: rock.fast
    };


    this.CHUNK_PACKETS[rock.chunk].push(info);

};

PacketHandler.prototype.updatePlayersPackets = function (player) {
    this.CHUNK_PACKETS[player.chunk].push({
        master: "update",
        class: "playerInfo",
        id: player.id,
        x: player.x * 100,
        y: player.y * 100,
        health: player.health,
        maxHealth: player.maxHealth,
        theta: player.theta,
        level: player.level,
        shooting: player.shooting,
        radius: player.radius,
        vulnerable: player.vulnerable
    });
};


PacketHandler.prototype.deletePlayerPackets = function (player, chunk) {
    var info = {
        master: "delete",
        class: "playerInfo",
        id: player.id
    };
    if (chunk) {
        return info;
    } else {
        this.CHUNK_PACKETS[player.chunk].push(info);
    }
};


PacketHandler.prototype.deleteRockPackets = function (rock, chunk) {
    var info = {
        master: "delete",
        class: "rockInfo",
        id: rock.id
    };
    if (chunk) {
        return info;
    }
    this.CHUNK_PACKETS[rock.chunk].push(info);
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



PacketHandler.prototype.sendPing = function (timestamp) {
    var id;
    for (var index in this.gameServer.SOCKET_LIST) {
        var socket = this.gameServer.SOCKET_LIST[index];
        if (socket.player) {
            socket.emit('ping', timestamp);
        }
    }
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