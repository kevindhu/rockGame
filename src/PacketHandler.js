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

Packet.prototype.build = function (init) {
    var step = this.gameServer.step;
    if (init) {
        console.log(step);
    }

    var writer = new BinaryWriter();

    writer.writeUInt32(step);
    // Write update record
    writer.writeUInt16(this.addRocks.length);
    writer.writeBytes(this.addRocks.toBuffer());

    writer.writeUInt8(this.addPlayers.length);
    writer.writeBytes(this.addPlayers.toBuffer());


    writer.writeUInt16(this.updateRocks.length);
    writer.writeBytes(this.updateRocks.toBuffer());

    writer.writeUInt8(this.updatePlayers.length);
    writer.writeBytes(this.updatePlayers.toBuffer());


    writer.writeUInt16(this.deleteRocks.length);
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
    console.log("STEP: " + this.gameServer.step + " CHUNK: " + chunk);

    socket.emit('updateEntities', this.createChunkPacket(chunk, socket.id));
    socket.emit('updateBinary', this.b_createChunkPacket(chunk).build());
};


PacketHandler.prototype.createChunkPacket = function (chunk, id) {
    var initPacket = [];
    var populate = function (list, call) {
        for (var i in list) {
            var entity = list[i];
            initPacket.push(call(entity, true));
        }
    };

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

    return packet;
};


PacketHandler.prototype.b_deleteChunkPacket = function (chunk) {
    var PLAYER_LIST = this.gameServer.CHUNKS[chunk].PLAYER_LIST;
    var ROCK_LIST = this.gameServer.CHUNKS[chunk].ROCK_LIST;

    var populateBit = function (list, writer, call) {
        for (var i in list) {
            var entity = list[i];
            call(entity, writer);
        }
    };

    var packet = new Packet(this.gameServer);

    populateBit(PLAYER_LIST, packet.deletePlayers, this.b_deletePlayerPackets);
    populateBit(ROCK_LIST, packet.deleteRocks, this.b_deleteRockPackets);
    return packet;
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


PacketHandler.prototype.b_deletePlayerPackets = function (player, writer) {
    var info = player.handler.deleteInfo();
    writer = writer ? writer : this.B_CHUNK_PACKETS[player.chunk].deleteRocks;

    writer.writeBytes(info);
    writer.length++;
};

PacketHandler.prototype.b_deleteRockPackets = function (rock, writer) {
    var info = rock.handler.deleteInfo();
    writer = writer ? writer : this.B_CHUNK_PACKETS[rock.chunk].deleteRocks;

    writer.writeBytes(info);
    writer.length++;
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
        if (socket.initialized) {
            var player = socket.player;

            //socket.emit('updateEntities', this.masterPacket); //global updates

            var packets = [];
            var packet;
            if (player.chunkAdd) {
                for (id in player.chunkAdd) {
                    console.log("NEW CHUNK " + id);
                    packet = this.b_createChunkPacket(id);
                    packets.push(packet);
                }
                player.chunkAdd = false;
            }
            if (player.chunkDelete) {
                for (id in player.chunkDelete) {
                    packet = this.b_deleteChunkPacket(id);
                    packets.push(packet);
                }
                player.chunkDelete = false;
            }

            var chunks = player.findNeighboringChunks();
            for (id in chunks) {
                packet = this.B_CHUNK_PACKETS[id];
                packets.push(packet);
            }
            socket.emit('updateBinary', this.buildAllPackets(packets));
        }
    }
    this.resetChunkPackets();
};

PacketHandler.prototype.buildAllPackets = function (packets) {
    var step = this.gameServer.step;
    var writer = new BinaryWriter();

    var totalLength, tempWriter;

    writer.writeUInt32(step);

    // Write update record

    //addRocks
    totalLength = 0;
    tempWriter = new BinaryWriter();
    for (var i = 0; i < packets.length; i++) {
        var packet = packets[i];
        totalLength += packet.addRocks.length;
        tempWriter.writeBytes(packet.addRocks.toBuffer());
    }
    writer.writeUInt16(totalLength);
    writer.writeBytes(tempWriter.toBuffer());

    //console.log("ADD ROCKS: " + writer.allocLength);


    //addPlayers
    totalLength = 0;
    tempWriter = new BinaryWriter();
    for (var i = 0; i < packets.length; i++) {
        var packet = packets[i];
        totalLength += packet.addPlayers.length;
        tempWriter.writeBytes(packet.addPlayers.toBuffer());
    }
    writer.writeUInt8(totalLength);
    writer.writeBytes(tempWriter.toBuffer());


    //updateRocks
    totalLength = 0;
    tempWriter = new BinaryWriter();
    for (var i = 0; i < packets.length; i++) {
        var packet = packets[i];
        totalLength += packet.updateRocks.length;
        tempWriter.writeBytes(packet.updateRocks.toBuffer());
    }
    writer.writeUInt16(totalLength);
    writer.writeBytes(tempWriter.toBuffer());


    //updatePlayers
    totalLength = 0;
    tempWriter = new BinaryWriter();
    for (var i = 0; i < packets.length; i++) {
        var packet = packets[i];
        totalLength += packet.updatePlayers.length;
        tempWriter.writeBytes(packet.updatePlayers.toBuffer());
    }
    writer.writeUInt8(totalLength);
    writer.writeBytes(tempWriter.toBuffer());


    //deleteRocks
    totalLength = 0;
    tempWriter = new BinaryWriter();
    for (var i = 0; i < packets.length; i++) {
        var packet = packets[i];
        totalLength += packet.deleteRocks.length;
        tempWriter.writeBytes(packet.deleteRocks.toBuffer());
    }
    writer.writeUInt16(totalLength);
    writer.writeBytes(tempWriter.toBuffer());


    //deletePlayers
    totalLength = 0;
    tempWriter = new BinaryWriter();
    for (var i = 0; i < packets.length; i++) {
        var packet = packets[i];
        totalLength += packet.deletePlayers.length;
        tempWriter.writeBytes(packet.deletePlayers.toBuffer());
    }
    writer.writeUInt8(totalLength);
    writer.writeBytes(tempWriter.toBuffer());


    //Terminate record
    writer.writeUInt8(0 >> 0);
    return writer.toBuffer();
};


module.exports = PacketHandler;