var BinaryWriter = require('./BinaryWriter');

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
    var step = this.gameServer.step;

    var writer = new BinaryWriter();

    writer.writeUInt32(step);
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

    writer.writeUInt8(this.hasId ? 1 : 0);
    if (this.hasId) {
        writer.writeUInt32(this.SELF_ID);
    }

    //Terminate record
    writer.writeUInt8(0 >> 0);
    return writer.toBuffer();
};

module.exports = Packet;