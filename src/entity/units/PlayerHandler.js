const entityConfig = require('../entityConfig');
const BinaryWriter = require('../../packet/BinaryWriter');

function PlayerHandler(player, gameServer) {
    this.player = player;
    this.gameServer = gameServer;
}


PlayerHandler.prototype.addInfo = function () {
    var writer = new BinaryWriter();
    var player = this.player;

    var x = player.body.GetPosition().x;
    var y = player.body.GetPosition().y;
    var theta = player.theta;



    // Write update record
    writer.writeUInt32(player.id >>> 0);             //id
    writer.writeUInt32(x * 100 >> 0);                // x
    writer.writeUInt32(y * 100 >> 0);                // y

    writer.writeUInt16(player.radius >>> 0);             //radius


    var nameNum = "";
    for (var i = 0; i<player.name.length; i++) {
        const val = player.name.toLowerCase().charCodeAt(i) - 97 + 1;

        nameNum = nameNum + "" + val;
    }
    writer.writeUInt32(parseInt(nameNum) >>> 0);              //name


    console.log(parseInt(player.name));

    writer.writeUInt8(player.health >>> 0);              //health
    writer.writeUInt8(player.maxHealth >>> 0);           //maxHealth

    writer.writeUInt8(this.theta * 100 >>> 0);            //theta
    writer.writeUInt8(player.level >>> 0);                //level

    var flags = 0;
    if (player.vulnerable)
        flags |= 0x01;               // neutral
    if (player.shooting)
        flags |= 0x10;               // fast
    writer.writeUInt8(flags >>> 0);

    return writer.toBuffer();
};


PlayerHandler.prototype.updateInfo = function () {
    var writer = this.adder;
    var player = this.player;

    // Write update record
    writer.writeUInt32(player.id >>> 0);         // Rock ID

    (player.owner) ? writer.writeUInt32(player.owner.id >>> 0) : //Rock owner id
        writer.writeUInt32(0 >>> 0);


    writer.writeUInt32(player.x >> 0);                // Coordinate X
    writer.writeUInt32(player.y >> 0);                // Coordinate Y
    writer.writeUInt16(player.radius >>> 0);             //Radius

    writer.writeUInt8(player.health >>> 0);
    writer.writeUInt8(player.maxHealth >>> 0);
    writer.writeUInt8(player.displayTheta >>> 0); // display theta

    var flags = 0;
    if (player.glowing)
        flags |= 0x01;               // isGlowing
    if (player.fast)
        flags |= 0x10;               // isFast
    writer.writeUInt8(flags >>> 0);
    writer.writeUInt16(0);           //terminate flags

    writer.writeUInt32(0 >> 0); //terminate player record

    return writer.toBuffer();
};


PlayerHandler.prototype.deleteInfo = function () {
    var writer = this.deleter;
    var player = this.player;

    // Write delete record
    writer.writeUInt32(player.id >>> 0);         // Rock ID
    writer.writeUInt32(0 >> 0); //terminate player record
};



module.exports = PlayerHandler;