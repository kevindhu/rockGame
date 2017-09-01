const entityConfig = require('../entityConfig');
const BinaryWriter = require('../../packet/BinaryWriter');

function RockHandler(rock, gameServer) {
    this.rock = rock;
    this.gameServer = gameServer;
}



RockHandler.prototype.addInfo = function () {
    var writer = new BinaryWriter();
    var rock = this.rock;

    var x = rock.body.GetPosition().x;
    var y = rock.body.GetPosition().y;
    var theta = rock.body.GetAngle();



    // Write update record
    writer.writeUInt32(rock.id >>> 0); //id
    (rock.owner) ? writer.writeUInt32(rock.owner.id >>> 0) : writer.writeUInt32(0 >>> 0); //owner id

    writer.writeUInt32(x * 100 >> 0);                // x
    writer.writeUInt32(y * 100 >> 0);                // y

    writer.writeUInt16(rock.radius >>> 0);             //radius

    writer.writeUInt8(rock.health >>> 0);              //health
    writer.writeUInt8(rock.maxHealth >>> 0);           //maxHealth

    writer.writeUInt8(theta * 100 >>> 0);              //theta
    //writer.writeUInt8(rock.texture >>> 0);            //texture

    var flags = 0;
    if (rock.neutral)
        flags |= 0x01;               // neutral
    if (rock.fast)
        flags |= 0x10;               // fast

    writer.writeUInt8(flags >>> 0);
    return writer.toBuffer();
};


RockHandler.prototype.updateInfo = function () {
    var writer = new BinaryWriter();
    var rock = this.rock;

    var x = rock.body.GetPosition().x;
    var y = rock.body.GetPosition().y;
    var theta = rock.body.GetAngle();



    // Write update record
    writer.writeUInt32(rock.id >>> 0); //id
    (rock.owner) ? writer.writeUInt32(rock.owner.id >>> 0) : writer.writeUInt32(0 >>> 0); //owner id

    writer.writeUInt32(x * 100 >> 0);                // x
    writer.writeUInt32(y * 100 >> 0);                // y

    writer.writeUInt16(rock.radius >>> 0);             //radius

    writer.writeUInt8(rock.health >>> 0);              //health
    writer.writeUInt8(rock.maxHealth >>> 0);           //maxHealth

    writer.writeUInt8(theta * 100 >>> 0);              //theta
    //writer.writeUInt8(rock.texture >>> 0);            //texture

    var flags = 0;
    if (rock.neutral)
        flags |= 0x01;               // neutral
    if (rock.fast)
        flags |= 0x10;               // fast

    writer.writeUInt8(flags >>> 0);
    return writer.toBuffer();
};


RockHandler.prototype.deleteInfo = function () {
    var writer = new BinaryWriter();
    var rock = this.rock;

    // Write delete record
    writer.writeUInt32(rock.id >>> 0);         // Rock ID
    writer.writeUInt32(0 >> 0); //terminate rock record
};

module.exports = RockHandler;