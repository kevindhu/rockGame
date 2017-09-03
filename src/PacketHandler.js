const entityConfig = require('./entity/entityConfig');
const Arithmetic = require('./modules/Arithmetic');
const BinaryWriter = require('./packet/BinaryWriter');
var B2 = require('./modules/B2');


function PacketHandler(gameServer) {
    this.gameServer = gameServer;

    this.CHUNK_PACKETS = {};

    this.B_CHUNK_PACKETS = {};


    this.masterPacket = [];
    this.resetChunkPackets();
}


function Packet(gameServer) {
    this.gameServer = gameServer;

    this.addRocks = new BinaryWriter();
    this.addRocks.length = 0;

    this.addPlayers = new BinaryWriter();
    this.addPlayers.length = 0;

    this.updateRocks = new BinaryWriter();
    this.updateRocks.length = 0;
    this.updatePlayers = new BinaryWriter();
    this.updatePlayers.length = 0;

    this.deleteRocks = new BinaryWriter();
    this.deleteRocks.length = 0;
    this.deletePlayers = new BinaryWriter();
    this.deletePlayers.length = 0;
}

Packet.prototype.build = function () {
    var writer = new BinaryWriter();

    writer.writeUInt32(this.gameServer.step);

    // Write update record
    writer.writeUInt8(this.addRocks.length);
    writer.writeBytes(this.addRocks.toBuffer());

    writer.writeUInt8(this.addPlayers.length);
    writer.writeBytes(this.addPlayers.toBuffer());

    writer.writeUInt8(this.updateRocks.length);
    writer.writeBytes(this.updateRocks.toBuffer());

    writer.writeUInt8(this.updatePlayers.length);
    writer.writeBytes(this.updatePlayers.toBuffer());

    writer.writeUInt8(this.deleteRocks.length);
    writer.writeBytes(this.deleteRocks.toBuffer());

    writer.writeUInt8(this.deletePlayers.length);
    writer.writeBytes(this.deletePlayers.toBuffer());

    //Terminate record
    writer.writeUInt8(0 >> 0);
    return writer.toBuffer();
};


PacketHandler.prototype.sendVerificationPackets = function (socket) {
    socket.emit('initVerification', {}); //make this more secure
};

PacketHandler.prototype.resetChunkPackets = function () {
    for (var i = 0; i < entityConfig.CHUNKS; i++) {
        this.CHUNK_PACKETS[i] = [];
        this.B_CHUNK_PACKETS[i] = new Packet(this.gameServer);
    }

    this.masterPacket = [];
};


PacketHandler.prototype.sendChunkInitPackets = function (socket, chunk) {
    socket.emit('updateEntities', this.createChunkPacket(chunk, socket.id));
    socket.emit('updateBinary', this.b_createChunkPacket(chunk));
};


PacketHandler.prototype.createChunkPacket = function (chunk, id) {
    var PLAYER_LIST = this.gameServer.CHUNKS[chunk].PLAYER_LIST;
    var ROCK_LIST = this.gameServer.CHUNKS[chunk].ROCK_LIST;
    var initPacket = [];
    var populate = function (list, call) {
        for (var i in list) {
            var entity = list[i];
            initPacket.push(call(entity, true));
        }
    };

    populate(PLAYER_LIST, this.addPlayerPackets);
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


PacketHandler.prototype.b_createChunkPacket = function (chunk) {
    var PLAYER_LIST = this.gameServer.CHUNKS[chunk].PLAYER_LIST;
    var ROCK_LIST = this.gameServer.CHUNKS[chunk].ROCK_LIST;

    var populateBit = function (list, writer, call) {
        for (var i in list) {
            var entity = list[i];
            call(entity, writer);
        }
    };

    var packet = new Packet(this.gameServer);

    populateBit(PLAYER_LIST, packet.addPlayers, this.b_addPlayerPackets);
    populateBit(ROCK_LIST, packet.addRocks, this.b_addRockPackets);

    return packet.build();
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
    populate(this.gameServer.CHUNKS[chunk].ROCK_LIST, this.deleteRockPackets);
    return deletePacket;
};


PacketHandler.prototype.b_addPlayerPackets = function (player, writer) {
    var info = player.handler.addInfo();

    writer = writer ? writer : this.B_CHUNK_PACKETS[player.chunk].addPlayers;
    writer.writeBytes(info);
    writer.length++;
};


PacketHandler.prototype.b_addRockPackets = function (rock, writer) {
    var info = rock.handler.addInfo();

    writer = writer ? writer : this.B_CHUNK_PACKETS[rock.chunk].addRocks;
    writer.writeBytes(info);
    writer.length++;
};


PacketHandler.prototype.b_updateRockPackets = function (rock) {
    var info = rock.handler.updateInfo();
    var writer = this.B_CHUNK_PACKETS[rock.chunk].updateRocks;

    writer.writeBytes(info);
    writer.length++;
};

PacketHandler.prototype.b_updatePlayerPackets = function (player) {
    var info = player.handler.updateInfo();
    var writer = this.B_CHUNK_PACKETS[player.chunk].updatePlayers;

    writer.writeBytes(info);
    writer.length++;
};


PacketHandler.prototype.b_deletePlayerPackets = function (player) {
    var info = player.handler.deleteInfo();
    var writer = this.B_CHUNK_PACKETS[player.chunk].deleteRocks;

    writer.writeBytes(info);
    writer.length ++;
};

PacketHandler.prototype.b_deleteRockPackets = function (rock) {
    var info = rock.handler.deleteInfo();
    var writer = this.B_CHUNK_PACKETS[rock.chunk].deleteRocks;

    writer.writeBytes(info);
    writer.length ++;
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
        x: player.x * 100,
        y: player.y * 100,
        radius: player.radius,
        name: player.name,
        health: player.health,
        maxHealth: player.maxHealth,
        theta: player.theta,
        level: player.level,
        vertices: player.vertices
    };
    if (ifInit) {
        return info;
    }
    else {
        this.CHUNK_PACKETS[player.chunk].push(info);
    }
};

PacketHandler.prototype.addChatPackets = function (name, message) {
    this.masterPacket.push({
        master: "add",
        class: "chatInfo",
        name: name,
        chatMessage: message
    });
};

PacketHandler.prototype.updatePlayerPackets = function (player) {
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
        vulnerable: player.vulnerable,
        vertices: player.vertices
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


PacketHandler.prototype.sendPing = function (timestamp) {
    var id;
    for (var index in this.gameServer.SOCKET_LIST) {
        var socket = this.gameServer.SOCKET_LIST[index];
        if (socket.player) {
            socket.emit('ping', timestamp);
        }
        socket.closeTimer -= 1;
        if (socket.closeTimer <= 0) {
            console.log("CLIENT " + socket.id + "LEFT BUT SOCKET STILL UP");
            socket.disconnect();
        }
    }
};


PacketHandler.prototype.sendPackets = function () {
    var id;


    for (var index in this.gameServer.SOCKET_LIST) {
        var socket = this.gameServer.SOCKET_LIST[index];
        if (socket.player) {
            var player = socket.player;

            //TODO: Change this
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
                socket.emit('updateBinary', this.B_CHUNK_PACKETS[id].build());
            }
        }
    }
    this.resetChunkPackets();
};


module.exports = PacketHandler;