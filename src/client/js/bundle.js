(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
function BinaryReader(data) {
    this._offset = 0;
    this._buffer = new DataView(data);
    //console.log(data.byteLength);
}

module.exports = BinaryReader;


BinaryReader.prototype.readInt8 = function () {
    var value = this._buffer.getInt8(this._offset);
    this._offset += 1;
    return value;
};

BinaryReader.prototype.readUInt8 = function () {
    var value = this._buffer.getUint8(this._offset);
    this._offset += 1;
    return value;
};


BinaryReader.prototype.readInt16 = function () {
    var value = this._buffer.getInt16(this._offset);
    this._offset += 2;
    return value;
};

BinaryReader.prototype.readUInt16 = function () {
    var value = this._buffer.getUint16(this._offset);
    this._offset += 2;
    return value;
};



BinaryReader.prototype.readInt32 = function () {
    var value = this._buffer.getInt32(this._offset);
    this._offset += 4;
    return value;
};


BinaryReader.prototype.readUInt32 = function () {
    var value = this._buffer.getUint32(this._offset);
    this._offset += 4;
    return value;
};

BinaryReader.prototype.skipBytes = function (length) {
    this._offset += length;
};

BinaryReader.prototype.length = function () {
    return this._buffer.byteLength;
};


},{}],2:[function(require,module,exports){
var Entity = require('./entity');
var MainUI = require('./ui/MainUI');
var BinaryReader = require('./BinaryReader');

function Client() {
    this.SELF_ID = null;
    this.SELF_PLAYER = null;
    this.TRAIL = null;
    this.updates = [];

    this.currPing = 0;

    this.init();
}

Client.prototype.init = function () {
    this.initSocket();
    this.initCanvases();
    this.initLists();
    this.initViewers();
};
Client.prototype.initSocket = function () {
    this.socket = io();
    this.socket.verified = false;

    this.socket.on('initVerification', this.verify.bind(this));

    this.socket.on('updateEntities', this.handlePacket.bind(this));
    this.socket.on('updateBinary', this.handleBinary.bind(this));


    this.socket.on('chatMessage', this.mainUI);
    this.socket.on('ping', this.sendPong.bind(this));
    this.socket.on('finalPing', function (message) {
        //console.log("PING: " + message);
        this.currPing = message;
        if (this.currPing > 90000) {
            this.currPing = 10;
        }
    });


};

Client.prototype.sendPong = function (message) {
    this.socket.emit("pong123", message);
};


Client.prototype.initCanvases = function () {
    this.mainCanvas = document.getElementById("main_canvas");
    this.mainCanvas.style.border = '1px solid #000000';
    this.mainCanvas.style.visibility = "hidden";
    this.mainCtx = this.mainCanvas.getContext("2d");


    document.addEventListener("mousedown", function (event) {
        if (!this.SELF_ID) {
            return;
        }
        var x = ((event.x / this.mainCanvas.offsetWidth * 1000) - this.mainCanvas.width / 2) / this.scaleFactor;
        var y = ((event.y / this.mainCanvas.offsetHeight * 500) - this.mainCanvas.height / 2) / this.scaleFactor;


        if (Math.abs(x) + Math.abs(y) < 200) {
            this.playerClicked = true;
            this.circleConstruct = [];
            this.circleStageCount = 0;
        }
        else {
            this.clickTemp = true;
            this.clickTimer = 0;
        }
    }.bind(this));
    document.addEventListener("mouseup", function (event) {
        if (!this.SELF_ID) {
            return;
        }
        var x = ((event.x / this.mainCanvas.offsetWidth * 1000) - this.mainCanvas.width / 2) / this.scaleFactor;
        var y = ((event.y / this.mainCanvas.offsetHeight * 500) - this.mainCanvas.height / 2) / this.scaleFactor;

        this.socket.emit("shootSelf", {
            id: this.SELF_ID,
            x: x,
            y: y
        });

        this.clickTemp = false;
        this.clickTimer = 0;

    }.bind(this));


    document.addEventListener("mousemove", function (event) {
        if (!this.SELF_PLAYER) {
            return;
        }

        var x = ((event.x / this.mainCanvas.offsetWidth * 1000) -
            this.mainCanvas.width / 2) / this.scaleFactor;
        var y = ((event.y / this.mainCanvas.offsetHeight * 500) -
            this.mainCanvas.height / 2) / this.scaleFactor;

        if (square(x) + square(y) > square(this.SELF_PLAYER.range)) { //if not in range
            return;
        }

        if (!this.pre) {
            this.pre = {x: x, y: y}
        }
        else if (square(this.pre.x - x) + square(this.pre.y - y) > 80) {
            this.pre = {x: x, y: y};

            if (Math.abs(x) < 50 && Math.abs(y) < 50) {
                x = 0;
                y = 0;
            }

            this.socket.emit('move', {
                id: this.SELF_ID,
                x: x,
                y: y
            });

            this.SELF_PLAYER.setMove(x, y);
        }
    }.bind(this));
};


Client.prototype.sendCircle = function (construct) {

    var radiiNormal = function (vector) {
        if (!vector) {
            return 0;
        }
        return (vector.x * vector.x + vector.y * vector.y);
    };

    var maxRadius = Math.sqrt(Math.max(
        radiiNormal(construct[0]),
        radiiNormal(construct[1]),
        radiiNormal(construct[2]),
        radiiNormal(construct[3])));

    if (maxRadius) {
        this.socket.emit("createCircle", {
            id: this.SELF_ID,
            radius: maxRadius
        });
    }
};

Client.prototype.initLists = function () {
    this.PLAYER_LIST = {};
    this.TILE_LIST = {};
    this.ROCK_LIST = {};
    this.ASTEROID_LIST = {};
    this.ANIMATION_LIST = {};

    this.PLAYER_ARRAY = [];
};
Client.prototype.initViewers = function () {
    this.keys = [];
    this.scaleFactor = 1;
    this.mainScaleFactor = 0.5;
    this.mainUI = new MainUI(this, this.socket);
    this.mainUI.playerNamerUI.open();
};

Client.prototype.verify = function (data) {
    if (!this.socket.verified) {
        console.log("VERIFIED CLIENT");
        this.socket.emit("verify", {});
        this.socket.verified = true;
    }
};


Client.prototype.applyUpdate = function (reader) {
    var i;

    var rockLength = reader.readUInt16(); //add rocks
    for (i = 0; i < rockLength; i++) {
        rock = new Entity.Rock(reader, this);
        this.ROCK_LIST[rock.id] = rock;
    }

    var playerLength = reader.readUInt8(); //add players
    if (playerLength > 0) {
        console.log("ATTEMPTING ADD NEW PLAYER");
    }
    for (i = 0; i < playerLength; i++) {
        player = new Entity.Player(reader, this);
        if (player.id === this.SELF_ID) {
            this.SELF_PLAYER = player;
        }
        this.PLAYER_LIST[player.id] = player;
    }

    var rock2Length = reader.readUInt16(); //update rocks
    for (i = 0; i < rock2Length; i++) {
        var id = reader.readUInt32();
        rock = this.ROCK_LIST[id];
        if (rock) {
            rock.update(reader);
        }
        else {
            console.log("FUCK YOU MATE " + id);

            var fakeRock = new Entity.Rock(null, this);
            fakeRock.update(reader);

            this.ROCK_LIST[id] = fakeRock;

            this.socket.emit("getRock", {
                id: id
            });
        }
    }


    var player2Length = reader.readUInt8();
    //console.log("PLAYER UPDATE LENGTH: " + player2Length);
    for (i = 0; i < player2Length; i++) {
        id = reader.readUInt32();
        var player = this.PLAYER_LIST[id];
        if (player) {
            player.update(reader);
        }
        else {
            //console.log("NO PLAYER ADDED: " + id);
            var fakePlayer = new Entity.Player(null, this);
            fakePlayer.update(reader);

            this.PLAYER_LIST[id] = fakePlayer;

            this.socket.emit("getPlayer", {
                id: id
            });

            console.log("EMITTING GETPLAYER");
        }
    }

    var rock3Length = reader.readUInt16(); //delete rocks
    for (i = 0; i < rock3Length; i++) {
        id = reader.readUInt32();
        delete this.ROCK_LIST[id];

        //console.log("DELETED ROCK: " + id);
    }

    var player3Length = reader.readUInt8();
    for (i = 0; i < player3Length; i++) {
        id = reader.readUInt32();
        delete this.PLAYER_LIST[id];

        console.log("DELETED PLAYER: " + id);
    }
};


Client.prototype.handleBinary = function (data) {
    var reader = new BinaryReader(data);
    if (reader.length() < 1) {
        return;
    }
    var step = reader.readUInt32();

    if (!this.initialStep) {
        this.initialStep = step;
    }
    else if (this.initialStep === step) {
        return;
    }
    this.lastStep = step;

    //console.log("LAST STEP: " + step);

    if (!this.currStep) {
        this.currStep = step - 3;
    }


    this.updates.push({
        step: step,
        reader: reader
    });
};


Client.prototype.handlePacket = function (data) {
    var packet, i;
    for (i = 0; i < data.length; i++) {
        packet = data[i];
        switch (packet.master) {
            case "add":
                this.addEntities(packet);
                break;
            case "delete":
                this.deleteEntities(packet);
                break;
            case "update":
                this.updateEntities(packet);
                break;
        }
    }
};


Client.prototype.addEntities = function (packet) {
    var addEntity = function (packet, list, entity, array) {
        if (!packet) {
            return;
        }
        list[packet.id] = new entity(packet, this);
        if (array && array.indexOf(packet.id) === -1) {
            array.push(packet.id);
        }
    }.bind(this);

    switch (packet.class) {
        case "tileInfo":
            addEntity(packet, this.TILE_LIST, Entity.Tile);
            break;
        case "playerInfo":
            //addEntity(packet, this.PLAYER_LIST, Entity.Player, this.PLAYER_ARRAY);
            break;
        case "animationInfo":
            if (packet.id === this.SELF_ID) {
                addEntity(packet, this.ANIMATION_LIST, Entity.Animation);
            }
            break;
        case "UIInfo":
            if (this.SELF_ID === packet.playerId) {
                this.mainUI.open(packet);
            }
            break;
        case "selfId":
            if (!this.SELF_ID) {
                this.SELF_ID = packet.selfId;
                this.mainUI.gameUI.open();
            }
            break;
        case "chatInfo":
            this.mainUI.gameUI.chatUI.addMessage(packet);
            break;
    }
};

Client.prototype.updateEntities = function (packet) {
    function updateEntity(packet, list) {
        if (!packet) {
            return;
        }
        var entity = list[packet.id];
        if (!entity) {
            return;
        }
        entity.update(packet);
    }

    switch (packet.class) {
        case "playerInfo":
            //updateEntity(packet, this.PLAYER_LIST);
            break;
        case "tileInfo":
            updateEntity(packet, this.TILE_LIST);
            break;
        case "UIInfo":
            if (this.SELF_ID === packet.playerId) {
                this.mainUI.update(packet);
            }
            break;
    }
};

Client.prototype.deleteEntities = function (packet) {
    var deleteEntity = function (packet, list, array) {
        if (!packet) {
            return;
        }
        if (array) {
            var index = array.indexOf(packet.id);
            array.splice(index, 1);
        }
        delete list[packet.id];
    };

    switch (packet.class) {
        case "tileInfo":
            deleteEntity(packet, this.TILE_LIST);
            break;
        case "playerInfo":
            //deleteEntity(packet, this.PLAYER_LIST, this.PLAYER_ARRAY);
            break;
        case "animationInfo":
            deleteEntity(packet, this.ANIMATION_LIST);
            break;
        case "UIInfo":
            if (this.SELF_ID === packet.id) {
                this.mainUI.close(packet.action);
            }
            break;
    }
};

Client.prototype.drawScene = function (data) {
    this.mainUI.updateLeaderBoard();

    var id;
    var entityList = [
        this.TILE_LIST,
        this.PLAYER_LIST,
        this.ASTEROID_LIST,
        this.ANIMATION_LIST,
        this.ROCK_LIST
    ];

    var inBounds = function (player, x, y) {
        var range = this.mainCanvas.width / (0.7 * this.scaleFactor);
        return x < (player.x + range) && x > (player.x - range)
            && y < (player.y + range) && y > (player.y - range);
    }.bind(this);

    var translateScene = function () {
        this.mainCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.scaleFactor = lerp(this.scaleFactor, this.mainScaleFactor, 0.3);
        this.mainCtx.translate(this.mainCanvas.width / 2, this.mainCanvas.height / 2);
        this.mainCtx.scale(this.scaleFactor, this.scaleFactor);
        this.mainCtx.translate(-this.SELF_PLAYER.x, -this.SELF_PLAYER.y);
    }.bind(this);



    this.SELF_PLAYER.tick();


    translateScene();
    this.mainCtx.clearRect(0, 0, 50000, 50000);

    this.mainCtx.fillStyle = "#1d1f21";
    this.mainCtx.fillRect(0, 0, 50000, 50000);


    for (var i = 0; i < entityList.length; i++) {
        var list = entityList[i];
        for (id in list) {
            var entity = list[id];
            if (inBounds(this.SELF_PLAYER, entity.x, entity.y)) {
                entity.show();
            }
        }
    }
    if (this.TRAIL && !this.active) {
        this.TRAIL.show();
    }
};

Client.prototype.clientUpdate = function () {
    this.updateStep();


    if (!this.SELF_PLAYER) {
        if (this.SELF_ID) {
            this.SELF_PLAYER = this.PLAYER_LIST[this.SELF_ID];
            return;
        }
        else {
            return;
        }
    }
    this.drawScene();
};

Client.prototype.updateStep = function () {
    var stepRange = this.lastStep - this.currStep;
    var update;

    if (!stepRange) {
        return;
    }
    //console.log(this.updates[0]);

    if (this.currStep < this.initialStep) {
        this.currStep += 1;
        return;
    }
    if (this.currStep > this.lastStep) {
        //console.log("STEP RANGE TOO SMALL: SERVER TOO SLOW");
        return;
    } //too fast

    while (this.lastStep - this.currStep > 5 + this.currPing / 50) {
        //console.log("STEP RANGE TOO LARGE: CLIENT IS TOO SLOW FOR STEP: " + this.currStep);
        update = this.findUpdatePacket(this.currStep);
        if (!update) {
            console.log("UPDATE NOT FOUND!!!!");
            this.currStep += 1;
            return;
        }
        if (update.reader._offset > 10) {
            console.log("OFFSET IS TOO LARGE");
            this.currStep += 1;
            return;
        }

        this.applyUpdate(update.reader);
        this.currStep += 1;
    } //too slow

    update = this.findUpdatePacket(this.currStep);
    if (!update) {
        console.log("CANNOT FIND UPDATE FOR STEP: " + this.currStep);
        this.currStep += 1;
        return;
    }
    if (update.reader._offset > 10) {
        console.log("OFFSET IS TOO LARGE FOR STEP: " + this.currStep);
        console.log(this.updates[0]);
        this.currStep += 1;
        return;
    }
    this.applyUpdate(update.reader);
    this.currStep += 1;
};


Client.prototype.findUpdatePacket = function (step) {
    var length = this.updates.length;

    for (var i = length - 1; i >= 0; i--) {
        var update = this.updates[i];

        if (update.step === step) {
            this.updates.splice(0, i);
            return update;
        }
    }
    console.log('COULD NOT FIND PACKET FOR STEP: ' + step);
    console.log(this.updates[0]);
    console.log(this.updates[1]);
    console.log(this.updates[2]);


    return null;
};


Client.prototype.start = function () {
    setInterval(this.clientUpdate.bind(this), 1000 / 25);
};

function lerp(a, b, ratio) {
    return a + ratio * (b - a);
}


function square(a) {
    return a * a;
}

function vectorNormal(a) {
    return a.x * a.x + a.y * a.y;
}

module.exports = Client;
},{"./BinaryReader":1,"./entity":8,"./ui/MainUI":10}],3:[function(require,module,exports){
function Animation(animationInfo, client) {

    this.client = client;
    this.type = animationInfo.type;
    this.id = animationInfo.id;
    this.x = animationInfo.x;
    this.y = animationInfo.y;
    //this.theta = 15;
    this.timer = getRandom(10, 14);

    if (this.type === "slash") {
        this.slashId = animationInfo.slashId;
        var slash = this.client.findSlash(this.slashId);
        this.pre = slash[0];
        this.post = slash[1];
    }
}


Animation.prototype.show = function () {
    var ctx = this.client.mainCtx;
    var player = this.client.SELF_PLAYER;

    if (this.type === "slash" && player) {
        ctx.beginPath();

        ctx.strokeStyle = "rgba(242, 31, 66, 0.6)";
        ctx.lineWidth = 15;

        ctx.moveTo(player.x + this.pre.x, player.y + this.pre.y);
        ctx.lineTo(player.x + this.post.x, player.y + this.post.y);

        ctx.stroke();
        ctx.closePath();
    }
    

    if (this.type === "shardDeath") { //deprecated but could pull some good code from here
        ctx.font = 60 - this.timer + "px Arial";
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(-Math.PI / 50 * this.theta);
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255, 168, 86, " + this.timer * 10 / 100 + ")";
        ctx.fillText(this.name, 0, 15);
        ctx.restore();

        ctx.fillStyle = "#000000";
        this.theta = lerp(this.theta, 0, 0.08);
        this.x = lerp(this.x, this.endX, 0.1);
        this.y = lerp(this.y, this.endY, 0.1);
    }


    this.timer--;
    if (this.timer <= 0) {
        delete this.client.ANIMATION_LIST[this.id];
    }
};


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

function lerp(a, b, ratio) {
    return a + ratio * (b - a);
}

module.exports = Animation;



},{}],4:[function(require,module,exports){
function MiniMap() { //deprecated, please update
}

MiniMap.prototype.draw = function () {
    if (mapTimer <= 0 || serverMap === null) {
        var tileLength = Math.sqrt(Object.size(TILE_LIST));
        if (tileLength === 0 || !selfPlayer) {
            return;
        }
        var imgData = mainCtx.createImageData(tileLength, tileLength);
        var tile;
        var tileRGB;
        var i = 0;


        for (var id in TILE_LIST) {
            tileRGB = {};
            tile = TILE_LIST[id];
            if (tile.color && tile.alert || inBounds(selfPlayer, tile.x, tile.y)) {
                tileRGB.r = tile.color.r;
                tileRGB.g = tile.color.g;
                tileRGB.b = tile.color.b;
            }
            else {
                tileRGB.r = 0;
                tileRGB.g = 0;
                tileRGB.b = 0;
            }

            imgData.data[i] = tileRGB.r;
            imgData.data[i + 1] = tileRGB.g;
            imgData.data[i + 2] = tileRGB.b;
            imgData.data[i + 3] = 255;
            i += 4;
        }
        console.log(400 / Object.size(TILE_LIST));
        imgData = scaleImageData(imgData, Math.floor(400 / Object.size(TILE_LIST)), mainCtx);

        mMapCtx.putImageData(imgData, 0, 0);

        mMapCtxRot.rotate(90 * Math.PI / 180);
        mMapCtxRot.scale(1, -1);
        mMapCtxRot.drawImage(mMap, 0, 0);
        mMapCtxRot.scale(1, -1);
        mMapCtxRot.rotate(270 * Math.PI / 180);

        serverMap = mMapRot;
        mapTimer = 25;
    }

    else {
        mapTimer -= 1;
    }

    mainCtx.drawImage(serverMap, 800, 400);
}; //deprecated

MiniMap.prototype.scaleImageData = function (imageData, scale, mainCtx) {
    var scaled = mainCtx.createImageData(imageData.width * scale, imageData.height * scale);
    var subLine = mainCtx.createImageData(scale, 1).data;
    for (var row = 0; row < imageData.height; row++) {
        for (var col = 0; col < imageData.width; col++) {
            var sourcePixel = imageData.data.subarray(
                (row * imageData.width + col) * 4,
                (row * imageData.width + col) * 4 + 4
            );
            for (var x = 0; x < scale; x++) subLine.set(sourcePixel, x * 4)
            for (var y = 0; y < scale; y++) {
                var destRow = row * scale + y;
                var destCol = col * scale;
                scaled.data.set(subLine, (destRow * scaled.width + destCol) * 4)
            }
        }
    }

    return scaled;
};

module.exports = MiniMap;
},{}],5:[function(require,module,exports){
function Player(reader, client) {
    if (!reader) {
        console.log("MAKING NEW FAKE PLAYER");
        this.client = client;
        return; //for fake rock purposes
    }

    this.id = reader.readUInt32(); //player id
    this.x = reader.readUInt32() / 100; //real x
    this.y = reader.readUInt32() / 100; //real y

    this.radius = reader.readUInt16(); //radius
    this.name = reader.readUInt32(); //name

    this.vertices = [];            //vertices
    var count = reader.readUInt8();
    for (var i = 0; i < count; i++) {
        this.vertices[i] = [];
        this.vertices[i][0] = reader.readInt16() / 1000;
        this.vertices[i][1] = reader.readInt16() / 1000;
    }

    this.health = reader.readUInt16(); //health
    this.maxHealth = reader.readUInt16(); //maxHealth

    this.theta = reader.readInt16() / 100; //theta
    this.level = reader.readUInt8(); //level

    switch (reader.readUInt8()) {    //flags
        case 1:
            this.vulnerable = true;
            break;
        case 16:
            this.shooting = true;
            break;
        case 17:
            this.vulnerable = true;
            this.shooting = true;
            break;
    }

    this.client = client;

    if (!this.client.SELF_PLAYER && this.id === this.client.SELF_ID) {
        this.client.SELF_PLAYER = this;
    }

    this.mover = {
        x: 0,
        y: 0
    };

    this.realMover = {
        x: 0,
        y: 0
    };
}


Player.prototype.update = function (reader) {
    this.updateTimer = 50;
    this.x = reader.readUInt32() / 100; //real x
    this.y = reader.readUInt32() / 100; //real y

    var  radius = reader.readUInt16(); //radius
    if (radius !== this.radius) {
        console.log("UPDATED PLAYER RADIUS: " + this.radius);
        this.radius = radius;
    }


    this.name = reader.readInt32(); //name

    this.health = reader.readUInt16(); //health
    this.maxHealth = reader.readUInt16(); //maxHealth

    this.theta = reader.readInt16() / 100; //theta
    this.level = reader.readUInt8(); //level

    var flags = reader.readUInt16();

    this.shooting = Number(String(flags).charAt(0)) === 1;
    this.vulnerable = Number(String(flags).charAt(1)) === 1;
    this.colliding = Number(String(flags).charAt(2)) === 1;

};


Player.prototype.tick = function () {
    if (this.realMover) {
        this.mover.x = lerp(this.mover.x, this.realMover.x, 0.15);
        this.mover.y = lerp(this.mover.y, this.realMover.y, 0.15);
    }
    //this.move(this.mover.x, this.mover.y);
};


Player.prototype.setMove = function (x, y) {
    this.realMover = {
        x: x,
        y: y
    };
};


Player.prototype.getTheta = function (target, origin) {
    this.theta = Math.atan2(target.y - origin.y, target.x - origin.x) % (2 * Math.PI);
};

Player.prototype.move = function (x, y) {
    var target = {
        x: this.x + x,
        y: this.y + y
    };
    var origin = {
        x: this.x,
        y: this.y
    };

    this.getTheta(target, origin);


    var normalVel = normal(x, y);
    if (normalVel < 1) {
        normalVel = 1;
    }

    var velBuffer = 3; //change soon

    this.x += 100 * x / normalVel / velBuffer;
    this.y += 100 * y / normalVel / velBuffer;

};


Player.prototype.show = function () {
    this.updateTimer -= 1;
    if (this.updateTimer <= 0) {
        delete this.client.PLAYER_LIST[this.id];
    }

    var ctx = this.client.mainCtx;
    var fillAlpha;
    var strokeAlpha;
    var i;


    fillAlpha = this.health / (4 * this.maxHealth);
    strokeAlpha = 1;

    ctx.font = "20px Arial";


    ctx.strokeStyle = "rgba(252, 102, 37," + strokeAlpha + ")";
    if (this.shooting) {
        ctx.fillStyle = "green";
    }
    else if (this.vulnerable) {
        ctx.fillStyle = "red";
    }
    else {
        ctx.fillStyle = "rgba(123,0,0," + fillAlpha + ")";
    }
    ctx.lineWidth = 10;


    ctx.beginPath();

    ctx.translate(this.x, this.y);
    ctx.rotate(this.theta);

    if (this.vertices) {
        var v = this.vertices;
        ctx.moveTo(v[0][0] * this.radius, v[0][1] * this.radius);
        for (i = 1; i < v.length; i++) {
            ctx.lineTo(v[i][0] * this.radius, v[i][1] * this.radius);
        }
        ctx.lineTo(v[0][0] * this.radius, v[0][1] * this.radius);
        ctx.fill();
        ctx.stroke();
    }
    else {
        ctx.fillRect(0, 0, 30, 30);
    }
    ctx.fill();
    ctx.stroke();

    ctx.rotate(2 * Math.PI - this.theta);


    if (!this.vulnerable) {
        ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
        ctx.arc(0, 0, this.radius * 2, 0, 2 * Math.PI);
        ctx.fill();
    }

    ctx.translate(-this.x, -this.y);


    ctx.closePath();


    ctx.fillStyle = "#ff9d60";
    ctx.fillText(this.name, this.x, this.y + 70);


    if (this.health && this.maxHealth && this.health > 0) { //health bar
        if (this.health > this.maxHealth) {
            console.log(this.health, this.maxHealth);
        }
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.strokeStyle = "black";
        ctx.rect(this.x, this.y, 100, 20);
        ctx.stroke();
        ctx.closePath();

        ctx.beginPath();
        ctx.fillStyle = "green";
        ctx.rect(this.x, this.y, 100 * this.health / this.maxHealth, 20);
        ctx.fill();
        ctx.closePath();
    } //display health bar


    ctx.closePath();
};


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}


function normal(x, y) {
    return Math.sqrt(x * x + y * y);
}

function lerp(a, b, ratio) {
    return a + ratio * (b - a);
}


module.exports = Player;
},{}],6:[function(require,module,exports){
function Rock(reader, client) {
    if (!reader) {
        console.log("MAKING NEW FAKE ROCK");
        this.client = client;
        return; //for fake rock purposes
    }
    var prev = reader._offset;


    this.id = reader.readUInt32();
    //console.log("NEW ROCK: " + this.id);

    this.owner = reader.readUInt32();
    this.x = reader.readUInt32() / 100;
    this.y = reader.readUInt32() / 100;

    this.vertices = [];
    var count = reader.readUInt16();
    //console.log("COUNT: " + count);
    for (var i = 0; i < count; i++) {
        this.vertices[i] = [];
        this.vertices[i][0] = reader.readInt16() / 1000;
        this.vertices[i][1] = reader.readInt16() / 1000;
    }

    this.health = reader.readInt16();
    this.maxHealth = reader.readInt16();

    this.theta = reader.readInt16() / 100;
    this.texture = reader.readUInt8();

    switch (reader.readUInt8()) {
        case 1:
            this.neutral = true;
            break;
        case 16:
            this.fast = true;
            break;
        case 17:
            this.neutral = true;
            this.fast = true;
            break;
    }
    var delta = reader._offset - prev;
    //console.log("DELTA: " + delta);

    this.updates = [];

    this.client = client;
}


Rock.prototype.update = function (reader) {
    this.updateTimer = 50;

    this.owner = reader.readUInt32();
    this.x = reader.readUInt32() / 100;
    this.y = reader.readUInt32() / 100;

    this.health = reader.readInt16();
    this.maxHealth = reader.readInt16();

    this.theta = reader.readInt16() / 100;

    this.neutral = false;
    this.fast = false;
    switch (reader.readUInt8()) { //flags
        case 1:
            this.neutral = true;
            break;
        case 16:
            this.fast = true;
            break;
        case 17:
            this.neutral = true;
            this.fast = true;
            break;
    }
};


Rock.prototype.show = function () {
    this.updateTimer -= 1;

    if (this.updateTimer <= 0) {
        delete this.client.ROCK_LIST[this.id];
        return;
    }

    var ctx = this.client.mainCtx;
    var SCALE = 100;


    ctx.fillStyle = "pink"; //default color
    switch (this.texture) {
        case 1:
            ctx.fillStyle = "brown";
            break;
        case 2:
            ctx.fillStyle = "grey";
            break;
        case 3:
            ctx.fillStyle = "yellow";
            break;
        case 4:
            ctx.fillStyle = "green";
            break;
    }


    ctx.strokeStyle = !this.owner ? "blue" : "green";
    ctx.strokeStyle = this.fast ? "red" : ctx.strokeStyle;


    ctx.beginPath();

    ctx.translate(this.x, this.y);
    ctx.rotate(this.theta);

    if (this.vertices) {
        var v = this.vertices;
        ctx.moveTo(v[0][0] * SCALE, v[0][1] * SCALE);

        for (var i = 1; i < v.length; i++) {
            ctx.lineTo(v[i][0] * SCALE, v[i][1] * SCALE);
        }
        ctx.lineTo(v[0][0] * SCALE, v[0][1] * SCALE);
    }
    else {
        ctx.fillRect(0, 0, 30, 30);
    }

    ctx.fill();
    ctx.stroke();

    ctx.rotate(2 * Math.PI - this.theta);
    ctx.translate(-this.x, -this.y);

    ctx.closePath();

    if (1 === 2 && this.health && this.maxHealth && this.health > 0) { //health bar
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.strokeStyle = "black";
        ctx.rect(this.x, this.y, 100, 20);
        ctx.stroke();
        ctx.closePath();

        ctx.beginPath();
        ctx.fillStyle = "green";
        ctx.rect(this.x, this.y, 100 * this.health / this.maxHealth, 20);
        ctx.fill();
        ctx.closePath();
    } //display health bar
};


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

module.exports = Rock;
},{}],7:[function(require,module,exports){
function Tile(thisInfo, client) {
    this.id = thisInfo.id;
    this.x = thisInfo.x;
    this.y = thisInfo.y;
    this.length = thisInfo.length;
    this.color = thisInfo.color;
    this.topColor = {
        r: this.color.r + 10,
        g: this.color.g + 10,
        b: this.color.b + 10
    };
    this.borderColor = {
        r: this.color.r - 10,
        g: this.color.g - 10,
        b: this.color.b - 10
    };
    this.alert = thisInfo.alert;
    this.random = Math.floor(getRandom(0, 3));

    this.client = client;
}

Tile.prototype.update = function (thisInfo) {
    this.color = thisInfo.color;
    this.topColor = {
        r: this.color.r + 100,
        g: this.color.g + 100,
        b: this.color.b + 100
    };
    this.borderColor = {
        r: this.color.r - 10,
        g: this.color.g - 10,
        b: this.color.b - 10
    };
    this.alert = thisInfo.alert;
};

Tile.prototype.show = function () {
    var ctx = this.client.mainCtx;
    ctx.beginPath();

    ctx.strokeStyle = "rgb(" + this.borderColor.r + "," + this.borderColor.g + "," + this.borderColor.b + ")";
    ctx.lineWidth = 20;


    var grd = ctx.createLinearGradient(this.x + this.length * 3/4, this.y, this.x + this.length/4, this.y + this.length);
    grd.addColorStop(0, "rgb(" + this.topColor.r + "," + this.topColor.g + "," + this.topColor.b + ")");
    grd.addColorStop(1, "rgb(" + this.color.r + "," + this.color.g + "," + this.color.b + ")");
    ctx.fillStyle = grd;


    ctx.rect(this.x + 30, this.y + 30, this.length - 30, this.length - 30);

    ctx.stroke();
    ctx.fill();


};


module.exports = Tile;


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}
},{}],8:[function(require,module,exports){
module.exports = {
    Animation: require('./Animation'),
    Player: require('./Player'),
    MiniMap: require('./MiniMap'),
    Tile: require('./Tile'),
    Rock: require('./Rock')
};
},{"./Animation":3,"./MiniMap":4,"./Player":5,"./Rock":6,"./Tile":7}],9:[function(require,module,exports){
var Client = require('./Client.js');
var MainUI = require('./ui/MainUI');

var client = new Client();
client.start();



document.onkeydown = function (event) {
    client.keys[event.keyCode] = true;

    if (event.keyCode === 32) {
        console.log("SPACE");
        client.socket.emit("shootSelf", {
            id: client.SELF_ID
        });
    }
}.bind(this);

document.onkeyup = function (event) {
    if (event.keyCode === 84) {
        client.mainUI.gameUI.chatUI.textInput.click();
    }
    client.keys[event.keyCode] = false;
    client.socket.emit('keyEvent', {id: event.keyCode, state: false});
};


$(window).bind('mousewheel DOMMouseScroll', function (event) {
    if (event.ctrlKey === true) {
        event.preventDefault();
    }
    if (client.CHAT_SCROLL) {
        client.CHAT_SCROLL = false;
        return;
    }

    if(event.originalEvent.wheelDelta /120 > 0 && client.mainScaleFactor < 2) {
        client.mainScaleFactor += 0.05;
    }
    else if (client.mainScaleFactor > 0.25) {
        client.mainScaleFactor -= 0.05;
    }
});

document.addEventListener('contextmenu', function (e) { //prevent right-click context menu
    e.preventDefault();
}, false);
},{"./Client.js":2,"./ui/MainUI":10}],10:[function(require,module,exports){
document.documentElement.style.overflow = 'hidden';  // firefox, chrome
document.body.scroll = "no";

var PlayerNamerUI = require('./PlayerNamerUI');
var GameUI = require('./game/GameUI');

function MainUI(client, socket) {
    this.client = client;
    this.socket = socket;

    this.gameUI = new GameUI(this.client, this.socket, this);

    this.playerNamerUI = new PlayerNamerUI(this.client, this.socket);
}

MainUI.prototype.open = function (info) {
    var action = info.action;
    var home;
    if (action === "gameMsgPrompt") {
        this.gameUI.gameMsgPrompt.open(info.message);
    }
};


MainUI.prototype.close = function (action) {
    if (action === "gameMsgPrompt") {
        this.gameUI.gameMsgPrompt.close();
    }
};


MainUI.prototype.updateLeaderBoard = function () {
    var leaderboard = document.getElementById("leaderboard");
    var PLAYER_ARRAY = this.client.PLAYER_ARRAY;


    var playerSort = function (a, b) {
        var playerA = this.client.PLAYER_LIST[a];
        var playerB = this.client.PLAYER_LIST[b];
        return playerA.radius - playerB.radius;
    }.bind(this);

    PLAYER_ARRAY.sort(playerSort);


    leaderboard.innerHTML = "";
    for (var i = PLAYER_ARRAY.length - 1; i >= 0; i--) {
        var player = this.client.PLAYER_LIST[PLAYER_ARRAY[i]];
        var entry = document.createElement('li');
        entry.appendChild(document.createTextNode(player.name + " - " + player.radius));
        leaderboard.appendChild(entry);
    }
};



module.exports = MainUI;
},{"./PlayerNamerUI":11,"./game/GameUI":14}],11:[function(require,module,exports){
function PlayerNamerUI (client, socket) {
    this.client = client;
    this.socket = socket;

    this.leaderboard = document.getElementById("leaderboard_container");
    this.nameBtn = document.getElementById("nameSubmit");
    this.playerNameInput = document.getElementById("playerNameInput");
    this.playerNamer = document.getElementById("player_namer");
}

PlayerNamerUI.prototype.open = function () {
    this.playerNameInput.addEventListener("keyup", function (event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            this.nameBtn.click();
        }
    }.bind(this));

    this.nameBtn.addEventListener("click", function () {
        this.client.mainCanvas.style.visibility = "visible";
        this.leaderboard.style.visibility = "visible";
        this.socket.emit("newPlayer",
            {
                name: this.playerNameInput.value,
            });
        this.playerNamer.style.display = 'none';
    }.bind(this));

    this.playerNamer.style.visibility = "visible";
    this.playerNameInput.focus();
    this.leaderboard.style.visibility = "hidden";
};

module.exports = PlayerNamerUI;
},{}],12:[function(require,module,exports){
function ChatUI(parent) {
    this.parent = parent;
    this.template = document.getElementById("chat_container");
    this.textInput = document.getElementById('chat_input');
    this.chatList = document.getElementById('chat_list');


    this.textInput.addEventListener('click', function () {
        this.textInput.focus();

        this.parent.client.CHAT_OPEN = true;
        this.chatList.style.height = "80%";
        this.chatList.style.overflowY = "auto";

        this.textInput.style.background = "rgba(34, 48, 71, 1)";
    }.bind(this));
    this.textInput.addEventListener('keydown', function (e) {
        if (e.keyCode === 13) {
            this.sendMessage();
        }
    }.bind(this));


    this.template.addEventListener('mousewheel', function () {
        this.parent.client.CHAT_SCROLL = true;
    }.bind(this));

    this.template.addEventListener('mousedown', function () {
        this.parent.client.CHAT_CLICK = true;
    }.bind(this));
}

ChatUI.prototype.open = function (message) {
    this.template.style.display = "block";
    this.close();
};


ChatUI.prototype.close = function () {
    this.textInput.blur();
    this.parent.client.CHAT_OPEN = false;
    this.chatList.style.height = "30%";
    this.chatList.style.background = "rgba(182, 193, 211, 0.02)";
    this.textInput.style.background = "rgba(182, 193, 211, 0.1)";
    this.parent.client.CHAT_SCROLL = false;
    $('#chat_list').animate({scrollTop: $('#chat_list').prop("scrollHeight")}, 100);
    this.chatList.style.overflowY = "none";
};


ChatUI.prototype.addMessage = function (packet) {
    var entry = document.createElement('li');
    entry.appendChild(document.createTextNode(packet.name + " : " + packet.chatMessage));
    this.chatList.appendChild(entry);

    $('#chat_list').animate({scrollTop: $('#chat_list').prop("scrollHeight")}, 100);
};


ChatUI.prototype.sendMessage = function () {
    var socket = this.parent.socket;


    if (this.textInput.value && this.textInput.value !== "") {
        socket.emit('chatMessage', {
            id: this.parent.client.SELF_ID,
            message: this.textInput.value
        });
        this.textInput.value = "";
    }
    this.close();
};

module.exports = ChatUI;



},{}],13:[function(require,module,exports){
function GameMsgPrompt(parent) {
    this.parent = parent;
    this.template = document.getElementById("prompt_container");
    this.message = document.getElementById('game_msg_prompt');
}

GameMsgPrompt.prototype.open = function (message) {
    this.template.style.display = "block";
    this.message.innerHTML = message;
};

GameMsgPrompt.prototype.close = function () {
    this.template.style.display = "none";
};

module.exports = GameMsgPrompt;



},{}],14:[function(require,module,exports){
var GameMsgPrompt = require('./GameMsgPrompt');
var ChatUI = require('./ChatUI');

function GameUI(client, socket, parent) {
    this.client = client;
    this.socket = socket;
    this.parent = parent;
    this.gameMsgPrompt = new GameMsgPrompt(this);
    this.chatUI = new ChatUI(this);
}

GameUI.prototype.open = function () {
    console.log("OPENING GAME UI");
    this.chatUI.open();
};

module.exports =  GameUI;
},{"./ChatUI":12,"./GameMsgPrompt":13}]},{},[9])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2xpZW50L2pzL0JpbmFyeVJlYWRlci5qcyIsInNyYy9jbGllbnQvanMvQ2xpZW50LmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvQW5pbWF0aW9uLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvTWluaU1hcC5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L1BsYXllci5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L1JvY2suanMiLCJzcmMvY2xpZW50L2pzL2VudGl0eS9UaWxlLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvaW5kZXguanMiLCJzcmMvY2xpZW50L2pzL2luZGV4LmpzIiwic3JjL2NsaWVudC9qcy91aS9NYWluVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL1BsYXllck5hbWVyVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL2dhbWUvQ2hhdFVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9nYW1lL0dhbWVNc2dQcm9tcHQuanMiLCJzcmMvY2xpZW50L2pzL3VpL2dhbWUvR2FtZVVJLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiZnVuY3Rpb24gQmluYXJ5UmVhZGVyKGRhdGEpIHtcclxuICAgIHRoaXMuX29mZnNldCA9IDA7XHJcbiAgICB0aGlzLl9idWZmZXIgPSBuZXcgRGF0YVZpZXcoZGF0YSk7XHJcbiAgICAvL2NvbnNvbGUubG9nKGRhdGEuYnl0ZUxlbmd0aCk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQmluYXJ5UmVhZGVyO1xyXG5cclxuXHJcbkJpbmFyeVJlYWRlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9idWZmZXIuZ2V0SW50OCh0aGlzLl9vZmZzZXQpO1xyXG4gICAgdGhpcy5fb2Zmc2V0ICs9IDE7XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbn07XHJcblxyXG5CaW5hcnlSZWFkZXIucHJvdG90eXBlLnJlYWRVSW50OCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciB2YWx1ZSA9IHRoaXMuX2J1ZmZlci5nZXRVaW50OCh0aGlzLl9vZmZzZXQpO1xyXG4gICAgdGhpcy5fb2Zmc2V0ICs9IDE7XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbn07XHJcblxyXG5cclxuQmluYXJ5UmVhZGVyLnByb3RvdHlwZS5yZWFkSW50MTYgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9idWZmZXIuZ2V0SW50MTYodGhpcy5fb2Zmc2V0KTtcclxuICAgIHRoaXMuX29mZnNldCArPSAyO1xyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG59O1xyXG5cclxuQmluYXJ5UmVhZGVyLnByb3RvdHlwZS5yZWFkVUludDE2ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHZhbHVlID0gdGhpcy5fYnVmZmVyLmdldFVpbnQxNih0aGlzLl9vZmZzZXQpO1xyXG4gICAgdGhpcy5fb2Zmc2V0ICs9IDI7XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbn07XHJcblxyXG5cclxuXHJcbkJpbmFyeVJlYWRlci5wcm90b3R5cGUucmVhZEludDMyID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHZhbHVlID0gdGhpcy5fYnVmZmVyLmdldEludDMyKHRoaXMuX29mZnNldCk7XHJcbiAgICB0aGlzLl9vZmZzZXQgKz0gNDtcclxuICAgIHJldHVybiB2YWx1ZTtcclxufTtcclxuXHJcblxyXG5CaW5hcnlSZWFkZXIucHJvdG90eXBlLnJlYWRVSW50MzIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9idWZmZXIuZ2V0VWludDMyKHRoaXMuX29mZnNldCk7XHJcbiAgICB0aGlzLl9vZmZzZXQgKz0gNDtcclxuICAgIHJldHVybiB2YWx1ZTtcclxufTtcclxuXHJcbkJpbmFyeVJlYWRlci5wcm90b3R5cGUuc2tpcEJ5dGVzID0gZnVuY3Rpb24gKGxlbmd0aCkge1xyXG4gICAgdGhpcy5fb2Zmc2V0ICs9IGxlbmd0aDtcclxufTtcclxuXHJcbkJpbmFyeVJlYWRlci5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX2J1ZmZlci5ieXRlTGVuZ3RoO1xyXG59O1xyXG5cclxuIiwidmFyIEVudGl0eSA9IHJlcXVpcmUoJy4vZW50aXR5Jyk7XHJcbnZhciBNYWluVUkgPSByZXF1aXJlKCcuL3VpL01haW5VSScpO1xyXG52YXIgQmluYXJ5UmVhZGVyID0gcmVxdWlyZSgnLi9CaW5hcnlSZWFkZXInKTtcclxuXHJcbmZ1bmN0aW9uIENsaWVudCgpIHtcclxuICAgIHRoaXMuU0VMRl9JRCA9IG51bGw7XHJcbiAgICB0aGlzLlNFTEZfUExBWUVSID0gbnVsbDtcclxuICAgIHRoaXMuVFJBSUwgPSBudWxsO1xyXG4gICAgdGhpcy51cGRhdGVzID0gW107XHJcblxyXG4gICAgdGhpcy5jdXJyUGluZyA9IDA7XHJcblxyXG4gICAgdGhpcy5pbml0KCk7XHJcbn1cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuaW5pdFNvY2tldCgpO1xyXG4gICAgdGhpcy5pbml0Q2FudmFzZXMoKTtcclxuICAgIHRoaXMuaW5pdExpc3RzKCk7XHJcbiAgICB0aGlzLmluaXRWaWV3ZXJzKCk7XHJcbn07XHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdFNvY2tldCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuc29ja2V0ID0gaW8oKTtcclxuICAgIHRoaXMuc29ja2V0LnZlcmlmaWVkID0gZmFsc2U7XHJcblxyXG4gICAgdGhpcy5zb2NrZXQub24oJ2luaXRWZXJpZmljYXRpb24nLCB0aGlzLnZlcmlmeS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICB0aGlzLnNvY2tldC5vbigndXBkYXRlRW50aXRpZXMnLCB0aGlzLmhhbmRsZVBhY2tldC5iaW5kKHRoaXMpKTtcclxuICAgIHRoaXMuc29ja2V0Lm9uKCd1cGRhdGVCaW5hcnknLCB0aGlzLmhhbmRsZUJpbmFyeS5iaW5kKHRoaXMpKTtcclxuXHJcblxyXG4gICAgdGhpcy5zb2NrZXQub24oJ2NoYXRNZXNzYWdlJywgdGhpcy5tYWluVUkpO1xyXG4gICAgdGhpcy5zb2NrZXQub24oJ3BpbmcnLCB0aGlzLnNlbmRQb25nLmJpbmQodGhpcykpO1xyXG4gICAgdGhpcy5zb2NrZXQub24oJ2ZpbmFsUGluZycsIGZ1bmN0aW9uIChtZXNzYWdlKSB7XHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIlBJTkc6IFwiICsgbWVzc2FnZSk7XHJcbiAgICAgICAgdGhpcy5jdXJyUGluZyA9IG1lc3NhZ2U7XHJcbiAgICAgICAgaWYgKHRoaXMuY3VyclBpbmcgPiA5MDAwMCkge1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJQaW5nID0gMTA7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG5cclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUuc2VuZFBvbmcgPSBmdW5jdGlvbiAobWVzc2FnZSkge1xyXG4gICAgdGhpcy5zb2NrZXQuZW1pdChcInBvbmcxMjNcIiwgbWVzc2FnZSk7XHJcbn07XHJcblxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5pbml0Q2FudmFzZXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLm1haW5DYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1haW5fY2FudmFzXCIpO1xyXG4gICAgdGhpcy5tYWluQ2FudmFzLnN0eWxlLmJvcmRlciA9ICcxcHggc29saWQgIzAwMDAwMCc7XHJcbiAgICB0aGlzLm1haW5DYW52YXMuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICB0aGlzLm1haW5DdHggPSB0aGlzLm1haW5DYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG5cclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGlmICghdGhpcy5TRUxGX0lEKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHggPSAoKGV2ZW50LnggLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0V2lkdGggKiAxMDAwKSAtIHRoaXMubWFpbkNhbnZhcy53aWR0aCAvIDIpIC8gdGhpcy5zY2FsZUZhY3RvcjtcclxuICAgICAgICB2YXIgeSA9ICgoZXZlbnQueSAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRIZWlnaHQgKiA1MDApIC0gdGhpcy5tYWluQ2FudmFzLmhlaWdodCAvIDIpIC8gdGhpcy5zY2FsZUZhY3RvcjtcclxuXHJcblxyXG4gICAgICAgIGlmIChNYXRoLmFicyh4KSArIE1hdGguYWJzKHkpIDwgMjAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMucGxheWVyQ2xpY2tlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuY2lyY2xlQ29uc3RydWN0ID0gW107XHJcbiAgICAgICAgICAgIHRoaXMuY2lyY2xlU3RhZ2VDb3VudCA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmNsaWNrVGVtcCA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuY2xpY2tUaW1lciA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZXVwXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGlmICghdGhpcy5TRUxGX0lEKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHggPSAoKGV2ZW50LnggLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0V2lkdGggKiAxMDAwKSAtIHRoaXMubWFpbkNhbnZhcy53aWR0aCAvIDIpIC8gdGhpcy5zY2FsZUZhY3RvcjtcclxuICAgICAgICB2YXIgeSA9ICgoZXZlbnQueSAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRIZWlnaHQgKiA1MDApIC0gdGhpcy5tYWluQ2FudmFzLmhlaWdodCAvIDIpIC8gdGhpcy5zY2FsZUZhY3RvcjtcclxuXHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcInNob290U2VsZlwiLCB7XHJcbiAgICAgICAgICAgIGlkOiB0aGlzLlNFTEZfSUQsXHJcbiAgICAgICAgICAgIHg6IHgsXHJcbiAgICAgICAgICAgIHk6IHlcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5jbGlja1RlbXAgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLmNsaWNrVGltZXIgPSAwO1xyXG5cclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG5cclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLlNFTEZfUExBWUVSKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciB4ID0gKChldmVudC54IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldFdpZHRoICogMTAwMCkgLVxyXG4gICAgICAgICAgICB0aGlzLm1haW5DYW52YXMud2lkdGggLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3I7XHJcbiAgICAgICAgdmFyIHkgPSAoKGV2ZW50LnkgLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0SGVpZ2h0ICogNTAwKSAtXHJcbiAgICAgICAgICAgIHRoaXMubWFpbkNhbnZhcy5oZWlnaHQgLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3I7XHJcblxyXG4gICAgICAgIGlmIChzcXVhcmUoeCkgKyBzcXVhcmUoeSkgPiBzcXVhcmUodGhpcy5TRUxGX1BMQVlFUi5yYW5nZSkpIHsgLy9pZiBub3QgaW4gcmFuZ2VcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLnByZSkge1xyXG4gICAgICAgICAgICB0aGlzLnByZSA9IHt4OiB4LCB5OiB5fVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChzcXVhcmUodGhpcy5wcmUueCAtIHgpICsgc3F1YXJlKHRoaXMucHJlLnkgLSB5KSA+IDgwKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHJlID0ge3g6IHgsIHk6IHl9O1xyXG5cclxuICAgICAgICAgICAgaWYgKE1hdGguYWJzKHgpIDwgNTAgJiYgTWF0aC5hYnMoeSkgPCA1MCkge1xyXG4gICAgICAgICAgICAgICAgeCA9IDA7XHJcbiAgICAgICAgICAgICAgICB5ID0gMDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5zb2NrZXQuZW1pdCgnbW92ZScsIHtcclxuICAgICAgICAgICAgICAgIGlkOiB0aGlzLlNFTEZfSUQsXHJcbiAgICAgICAgICAgICAgICB4OiB4LFxyXG4gICAgICAgICAgICAgICAgeTogeVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuU0VMRl9QTEFZRVIuc2V0TW92ZSh4LCB5KTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG59O1xyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuc2VuZENpcmNsZSA9IGZ1bmN0aW9uIChjb25zdHJ1Y3QpIHtcclxuXHJcbiAgICB2YXIgcmFkaWlOb3JtYWwgPSBmdW5jdGlvbiAodmVjdG9yKSB7XHJcbiAgICAgICAgaWYgKCF2ZWN0b3IpIHtcclxuICAgICAgICAgICAgcmV0dXJuIDA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiAodmVjdG9yLnggKiB2ZWN0b3IueCArIHZlY3Rvci55ICogdmVjdG9yLnkpO1xyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgbWF4UmFkaXVzID0gTWF0aC5zcXJ0KE1hdGgubWF4KFxyXG4gICAgICAgIHJhZGlpTm9ybWFsKGNvbnN0cnVjdFswXSksXHJcbiAgICAgICAgcmFkaWlOb3JtYWwoY29uc3RydWN0WzFdKSxcclxuICAgICAgICByYWRpaU5vcm1hbChjb25zdHJ1Y3RbMl0pLFxyXG4gICAgICAgIHJhZGlpTm9ybWFsKGNvbnN0cnVjdFszXSkpKTtcclxuXHJcbiAgICBpZiAobWF4UmFkaXVzKSB7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcImNyZWF0ZUNpcmNsZVwiLCB7XHJcbiAgICAgICAgICAgIGlkOiB0aGlzLlNFTEZfSUQsXHJcbiAgICAgICAgICAgIHJhZGl1czogbWF4UmFkaXVzXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLmluaXRMaXN0cyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuUExBWUVSX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuVElMRV9MSVNUID0ge307XHJcbiAgICB0aGlzLlJPQ0tfTElTVCA9IHt9O1xyXG4gICAgdGhpcy5BU1RFUk9JRF9MSVNUID0ge307XHJcbiAgICB0aGlzLkFOSU1BVElPTl9MSVNUID0ge307XHJcblxyXG4gICAgdGhpcy5QTEFZRVJfQVJSQVkgPSBbXTtcclxufTtcclxuQ2xpZW50LnByb3RvdHlwZS5pbml0Vmlld2VycyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMua2V5cyA9IFtdO1xyXG4gICAgdGhpcy5zY2FsZUZhY3RvciA9IDE7XHJcbiAgICB0aGlzLm1haW5TY2FsZUZhY3RvciA9IDAuNTtcclxuICAgIHRoaXMubWFpblVJID0gbmV3IE1haW5VSSh0aGlzLCB0aGlzLnNvY2tldCk7XHJcbiAgICB0aGlzLm1haW5VSS5wbGF5ZXJOYW1lclVJLm9wZW4oKTtcclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUudmVyaWZ5ID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgIGlmICghdGhpcy5zb2NrZXQudmVyaWZpZWQpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlZFUklGSUVEIENMSUVOVFwiKTtcclxuICAgICAgICB0aGlzLnNvY2tldC5lbWl0KFwidmVyaWZ5XCIsIHt9KTtcclxuICAgICAgICB0aGlzLnNvY2tldC52ZXJpZmllZCA9IHRydWU7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5hcHBseVVwZGF0ZSA9IGZ1bmN0aW9uIChyZWFkZXIpIHtcclxuICAgIHZhciBpO1xyXG5cclxuICAgIHZhciByb2NrTGVuZ3RoID0gcmVhZGVyLnJlYWRVSW50MTYoKTsgLy9hZGQgcm9ja3NcclxuICAgIGZvciAoaSA9IDA7IGkgPCByb2NrTGVuZ3RoOyBpKyspIHtcclxuICAgICAgICByb2NrID0gbmV3IEVudGl0eS5Sb2NrKHJlYWRlciwgdGhpcyk7XHJcbiAgICAgICAgdGhpcy5ST0NLX0xJU1Rbcm9jay5pZF0gPSByb2NrO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBwbGF5ZXJMZW5ndGggPSByZWFkZXIucmVhZFVJbnQ4KCk7IC8vYWRkIHBsYXllcnNcclxuICAgIGlmIChwbGF5ZXJMZW5ndGggPiAwKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJBVFRFTVBUSU5HIEFERCBORVcgUExBWUVSXCIpO1xyXG4gICAgfVxyXG4gICAgZm9yIChpID0gMDsgaSA8IHBsYXllckxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgcGxheWVyID0gbmV3IEVudGl0eS5QbGF5ZXIocmVhZGVyLCB0aGlzKTtcclxuICAgICAgICBpZiAocGxheWVyLmlkID09PSB0aGlzLlNFTEZfSUQpIHtcclxuICAgICAgICAgICAgdGhpcy5TRUxGX1BMQVlFUiA9IHBsYXllcjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5QTEFZRVJfTElTVFtwbGF5ZXIuaWRdID0gcGxheWVyO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciByb2NrMkxlbmd0aCA9IHJlYWRlci5yZWFkVUludDE2KCk7IC8vdXBkYXRlIHJvY2tzXHJcbiAgICBmb3IgKGkgPSAwOyBpIDwgcm9jazJMZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBpZCA9IHJlYWRlci5yZWFkVUludDMyKCk7XHJcbiAgICAgICAgcm9jayA9IHRoaXMuUk9DS19MSVNUW2lkXTtcclxuICAgICAgICBpZiAocm9jaykge1xyXG4gICAgICAgICAgICByb2NrLnVwZGF0ZShyZWFkZXIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJGVUNLIFlPVSBNQVRFIFwiICsgaWQpO1xyXG5cclxuICAgICAgICAgICAgdmFyIGZha2VSb2NrID0gbmV3IEVudGl0eS5Sb2NrKG51bGwsIHRoaXMpO1xyXG4gICAgICAgICAgICBmYWtlUm9jay51cGRhdGUocmVhZGVyKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuUk9DS19MSVNUW2lkXSA9IGZha2VSb2NrO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcImdldFJvY2tcIiwge1xyXG4gICAgICAgICAgICAgICAgaWQ6IGlkXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgdmFyIHBsYXllcjJMZW5ndGggPSByZWFkZXIucmVhZFVJbnQ4KCk7XHJcbiAgICAvL2NvbnNvbGUubG9nKFwiUExBWUVSIFVQREFURSBMRU5HVEg6IFwiICsgcGxheWVyMkxlbmd0aCk7XHJcbiAgICBmb3IgKGkgPSAwOyBpIDwgcGxheWVyMkxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgaWQgPSByZWFkZXIucmVhZFVJbnQzMigpO1xyXG4gICAgICAgIHZhciBwbGF5ZXIgPSB0aGlzLlBMQVlFUl9MSVNUW2lkXTtcclxuICAgICAgICBpZiAocGxheWVyKSB7XHJcbiAgICAgICAgICAgIHBsYXllci51cGRhdGUocmVhZGVyKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJOTyBQTEFZRVIgQURERUQ6IFwiICsgaWQpO1xyXG4gICAgICAgICAgICB2YXIgZmFrZVBsYXllciA9IG5ldyBFbnRpdHkuUGxheWVyKG51bGwsIHRoaXMpO1xyXG4gICAgICAgICAgICBmYWtlUGxheWVyLnVwZGF0ZShyZWFkZXIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5QTEFZRVJfTElTVFtpZF0gPSBmYWtlUGxheWVyO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcImdldFBsYXllclwiLCB7XHJcbiAgICAgICAgICAgICAgICBpZDogaWRcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkVNSVRUSU5HIEdFVFBMQVlFUlwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHJvY2szTGVuZ3RoID0gcmVhZGVyLnJlYWRVSW50MTYoKTsgLy9kZWxldGUgcm9ja3NcclxuICAgIGZvciAoaSA9IDA7IGkgPCByb2NrM0xlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgaWQgPSByZWFkZXIucmVhZFVJbnQzMigpO1xyXG4gICAgICAgIGRlbGV0ZSB0aGlzLlJPQ0tfTElTVFtpZF07XHJcblxyXG4gICAgICAgIC8vY29uc29sZS5sb2coXCJERUxFVEVEIFJPQ0s6IFwiICsgaWQpO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBwbGF5ZXIzTGVuZ3RoID0gcmVhZGVyLnJlYWRVSW50OCgpO1xyXG4gICAgZm9yIChpID0gMDsgaSA8IHBsYXllcjNMZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGlkID0gcmVhZGVyLnJlYWRVSW50MzIoKTtcclxuICAgICAgICBkZWxldGUgdGhpcy5QTEFZRVJfTElTVFtpZF07XHJcblxyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiREVMRVRFRCBQTEFZRVI6IFwiICsgaWQpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaGFuZGxlQmluYXJ5ID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgIHZhciByZWFkZXIgPSBuZXcgQmluYXJ5UmVhZGVyKGRhdGEpO1xyXG4gICAgaWYgKHJlYWRlci5sZW5ndGgoKSA8IDEpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB2YXIgc3RlcCA9IHJlYWRlci5yZWFkVUludDMyKCk7XHJcblxyXG4gICAgaWYgKCF0aGlzLmluaXRpYWxTdGVwKSB7XHJcbiAgICAgICAgdGhpcy5pbml0aWFsU3RlcCA9IHN0ZXA7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmICh0aGlzLmluaXRpYWxTdGVwID09PSBzdGVwKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5sYXN0U3RlcCA9IHN0ZXA7XHJcblxyXG4gICAgLy9jb25zb2xlLmxvZyhcIkxBU1QgU1RFUDogXCIgKyBzdGVwKTtcclxuXHJcbiAgICBpZiAoIXRoaXMuY3VyclN0ZXApIHtcclxuICAgICAgICB0aGlzLmN1cnJTdGVwID0gc3RlcCAtIDM7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIHRoaXMudXBkYXRlcy5wdXNoKHtcclxuICAgICAgICBzdGVwOiBzdGVwLFxyXG4gICAgICAgIHJlYWRlcjogcmVhZGVyXHJcbiAgICB9KTtcclxufTtcclxuXHJcblxyXG5DbGllbnQucHJvdG90eXBlLmhhbmRsZVBhY2tldCA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICB2YXIgcGFja2V0LCBpO1xyXG4gICAgZm9yIChpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBwYWNrZXQgPSBkYXRhW2ldO1xyXG4gICAgICAgIHN3aXRjaCAocGFja2V0Lm1hc3Rlcikge1xyXG4gICAgICAgICAgICBjYXNlIFwiYWRkXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFkZEVudGl0aWVzKHBhY2tldCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcImRlbGV0ZVwiOlxyXG4gICAgICAgICAgICAgICAgdGhpcy5kZWxldGVFbnRpdGllcyhwYWNrZXQpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJ1cGRhdGVcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlRW50aXRpZXMocGFja2V0KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuXHJcblxyXG5DbGllbnQucHJvdG90eXBlLmFkZEVudGl0aWVzID0gZnVuY3Rpb24gKHBhY2tldCkge1xyXG4gICAgdmFyIGFkZEVudGl0eSA9IGZ1bmN0aW9uIChwYWNrZXQsIGxpc3QsIGVudGl0eSwgYXJyYXkpIHtcclxuICAgICAgICBpZiAoIXBhY2tldCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxpc3RbcGFja2V0LmlkXSA9IG5ldyBlbnRpdHkocGFja2V0LCB0aGlzKTtcclxuICAgICAgICBpZiAoYXJyYXkgJiYgYXJyYXkuaW5kZXhPZihwYWNrZXQuaWQpID09PSAtMSkge1xyXG4gICAgICAgICAgICBhcnJheS5wdXNoKHBhY2tldC5pZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG5cclxuICAgIHN3aXRjaCAocGFja2V0LmNsYXNzKSB7XHJcbiAgICAgICAgY2FzZSBcInRpbGVJbmZvXCI6XHJcbiAgICAgICAgICAgIGFkZEVudGl0eShwYWNrZXQsIHRoaXMuVElMRV9MSVNULCBFbnRpdHkuVGlsZSk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJwbGF5ZXJJbmZvXCI6XHJcbiAgICAgICAgICAgIC8vYWRkRW50aXR5KHBhY2tldCwgdGhpcy5QTEFZRVJfTElTVCwgRW50aXR5LlBsYXllciwgdGhpcy5QTEFZRVJfQVJSQVkpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiYW5pbWF0aW9uSW5mb1wiOlxyXG4gICAgICAgICAgICBpZiAocGFja2V0LmlkID09PSB0aGlzLlNFTEZfSUQpIHtcclxuICAgICAgICAgICAgICAgIGFkZEVudGl0eShwYWNrZXQsIHRoaXMuQU5JTUFUSU9OX0xJU1QsIEVudGl0eS5BbmltYXRpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJVSUluZm9cIjpcclxuICAgICAgICAgICAgaWYgKHRoaXMuU0VMRl9JRCA9PT0gcGFja2V0LnBsYXllcklkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW5VSS5vcGVuKHBhY2tldCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcInNlbGZJZFwiOlxyXG4gICAgICAgICAgICBpZiAoIXRoaXMuU0VMRl9JRCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5TRUxGX0lEID0gcGFja2V0LnNlbGZJZDtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFpblVJLmdhbWVVSS5vcGVuKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImNoYXRJbmZvXCI6XHJcbiAgICAgICAgICAgIHRoaXMubWFpblVJLmdhbWVVSS5jaGF0VUkuYWRkTWVzc2FnZShwYWNrZXQpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgIH1cclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUudXBkYXRlRW50aXRpZXMgPSBmdW5jdGlvbiAocGFja2V0KSB7XHJcbiAgICBmdW5jdGlvbiB1cGRhdGVFbnRpdHkocGFja2V0LCBsaXN0KSB7XHJcbiAgICAgICAgaWYgKCFwYWNrZXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgZW50aXR5ID0gbGlzdFtwYWNrZXQuaWRdO1xyXG4gICAgICAgIGlmICghZW50aXR5KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgZW50aXR5LnVwZGF0ZShwYWNrZXQpO1xyXG4gICAgfVxyXG5cclxuICAgIHN3aXRjaCAocGFja2V0LmNsYXNzKSB7XHJcbiAgICAgICAgY2FzZSBcInBsYXllckluZm9cIjpcclxuICAgICAgICAgICAgLy91cGRhdGVFbnRpdHkocGFja2V0LCB0aGlzLlBMQVlFUl9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcInRpbGVJbmZvXCI6XHJcbiAgICAgICAgICAgIHVwZGF0ZUVudGl0eShwYWNrZXQsIHRoaXMuVElMRV9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcIlVJSW5mb1wiOlxyXG4gICAgICAgICAgICBpZiAodGhpcy5TRUxGX0lEID09PSBwYWNrZXQucGxheWVySWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFpblVJLnVwZGF0ZShwYWNrZXQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5kZWxldGVFbnRpdGllcyA9IGZ1bmN0aW9uIChwYWNrZXQpIHtcclxuICAgIHZhciBkZWxldGVFbnRpdHkgPSBmdW5jdGlvbiAocGFja2V0LCBsaXN0LCBhcnJheSkge1xyXG4gICAgICAgIGlmICghcGFja2V0KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGFycmF5KSB7XHJcbiAgICAgICAgICAgIHZhciBpbmRleCA9IGFycmF5LmluZGV4T2YocGFja2V0LmlkKTtcclxuICAgICAgICAgICAgYXJyYXkuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZGVsZXRlIGxpc3RbcGFja2V0LmlkXTtcclxuICAgIH07XHJcblxyXG4gICAgc3dpdGNoIChwYWNrZXQuY2xhc3MpIHtcclxuICAgICAgICBjYXNlIFwidGlsZUluZm9cIjpcclxuICAgICAgICAgICAgZGVsZXRlRW50aXR5KHBhY2tldCwgdGhpcy5USUxFX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwicGxheWVySW5mb1wiOlxyXG4gICAgICAgICAgICAvL2RlbGV0ZUVudGl0eShwYWNrZXQsIHRoaXMuUExBWUVSX0xJU1QsIHRoaXMuUExBWUVSX0FSUkFZKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImFuaW1hdGlvbkluZm9cIjpcclxuICAgICAgICAgICAgZGVsZXRlRW50aXR5KHBhY2tldCwgdGhpcy5BTklNQVRJT05fTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJVSUluZm9cIjpcclxuICAgICAgICAgICAgaWYgKHRoaXMuU0VMRl9JRCA9PT0gcGFja2V0LmlkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW5VSS5jbG9zZShwYWNrZXQuYWN0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgIH1cclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUuZHJhd1NjZW5lID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgIHRoaXMubWFpblVJLnVwZGF0ZUxlYWRlckJvYXJkKCk7XHJcblxyXG4gICAgdmFyIGlkO1xyXG4gICAgdmFyIGVudGl0eUxpc3QgPSBbXHJcbiAgICAgICAgdGhpcy5USUxFX0xJU1QsXHJcbiAgICAgICAgdGhpcy5QTEFZRVJfTElTVCxcclxuICAgICAgICB0aGlzLkFTVEVST0lEX0xJU1QsXHJcbiAgICAgICAgdGhpcy5BTklNQVRJT05fTElTVCxcclxuICAgICAgICB0aGlzLlJPQ0tfTElTVFxyXG4gICAgXTtcclxuXHJcbiAgICB2YXIgaW5Cb3VuZHMgPSBmdW5jdGlvbiAocGxheWVyLCB4LCB5KSB7XHJcbiAgICAgICAgdmFyIHJhbmdlID0gdGhpcy5tYWluQ2FudmFzLndpZHRoIC8gKDAuNyAqIHRoaXMuc2NhbGVGYWN0b3IpO1xyXG4gICAgICAgIHJldHVybiB4IDwgKHBsYXllci54ICsgcmFuZ2UpICYmIHggPiAocGxheWVyLnggLSByYW5nZSlcclxuICAgICAgICAgICAgJiYgeSA8IChwbGF5ZXIueSArIHJhbmdlKSAmJiB5ID4gKHBsYXllci55IC0gcmFuZ2UpO1xyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG5cclxuICAgIHZhciB0cmFuc2xhdGVTY2VuZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLm1haW5DdHguc2V0VHJhbnNmb3JtKDEsIDAsIDAsIDEsIDAsIDApO1xyXG4gICAgICAgIHRoaXMuc2NhbGVGYWN0b3IgPSBsZXJwKHRoaXMuc2NhbGVGYWN0b3IsIHRoaXMubWFpblNjYWxlRmFjdG9yLCAwLjMpO1xyXG4gICAgICAgIHRoaXMubWFpbkN0eC50cmFuc2xhdGUodGhpcy5tYWluQ2FudmFzLndpZHRoIC8gMiwgdGhpcy5tYWluQ2FudmFzLmhlaWdodCAvIDIpO1xyXG4gICAgICAgIHRoaXMubWFpbkN0eC5zY2FsZSh0aGlzLnNjYWxlRmFjdG9yLCB0aGlzLnNjYWxlRmFjdG9yKTtcclxuICAgICAgICB0aGlzLm1haW5DdHgudHJhbnNsYXRlKC10aGlzLlNFTEZfUExBWUVSLngsIC10aGlzLlNFTEZfUExBWUVSLnkpO1xyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG5cclxuXHJcblxyXG4gICAgdGhpcy5TRUxGX1BMQVlFUi50aWNrKCk7XHJcblxyXG5cclxuICAgIHRyYW5zbGF0ZVNjZW5lKCk7XHJcbiAgICB0aGlzLm1haW5DdHguY2xlYXJSZWN0KDAsIDAsIDUwMDAwLCA1MDAwMCk7XHJcblxyXG4gICAgdGhpcy5tYWluQ3R4LmZpbGxTdHlsZSA9IFwiIzFkMWYyMVwiO1xyXG4gICAgdGhpcy5tYWluQ3R4LmZpbGxSZWN0KDAsIDAsIDUwMDAwLCA1MDAwMCk7XHJcblxyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZW50aXR5TGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBsaXN0ID0gZW50aXR5TGlzdFtpXTtcclxuICAgICAgICBmb3IgKGlkIGluIGxpc3QpIHtcclxuICAgICAgICAgICAgdmFyIGVudGl0eSA9IGxpc3RbaWRdO1xyXG4gICAgICAgICAgICBpZiAoaW5Cb3VuZHModGhpcy5TRUxGX1BMQVlFUiwgZW50aXR5LngsIGVudGl0eS55KSkge1xyXG4gICAgICAgICAgICAgICAgZW50aXR5LnNob3coKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGlmICh0aGlzLlRSQUlMICYmICF0aGlzLmFjdGl2ZSkge1xyXG4gICAgICAgIHRoaXMuVFJBSUwuc2hvdygpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5jbGllbnRVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnVwZGF0ZVN0ZXAoKTtcclxuXHJcblxyXG4gICAgaWYgKCF0aGlzLlNFTEZfUExBWUVSKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuU0VMRl9JRCkge1xyXG4gICAgICAgICAgICB0aGlzLlNFTEZfUExBWUVSID0gdGhpcy5QTEFZRVJfTElTVFt0aGlzLlNFTEZfSURdO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgdGhpcy5kcmF3U2NlbmUoKTtcclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUudXBkYXRlU3RlcCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBzdGVwUmFuZ2UgPSB0aGlzLmxhc3RTdGVwIC0gdGhpcy5jdXJyU3RlcDtcclxuICAgIHZhciB1cGRhdGU7XHJcblxyXG4gICAgaWYgKCFzdGVwUmFuZ2UpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICAvL2NvbnNvbGUubG9nKHRoaXMudXBkYXRlc1swXSk7XHJcblxyXG4gICAgaWYgKHRoaXMuY3VyclN0ZXAgPCB0aGlzLmluaXRpYWxTdGVwKSB7XHJcbiAgICAgICAgdGhpcy5jdXJyU3RlcCArPSAxO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLmN1cnJTdGVwID4gdGhpcy5sYXN0U3RlcCkge1xyXG4gICAgICAgIC8vY29uc29sZS5sb2coXCJTVEVQIFJBTkdFIFRPTyBTTUFMTDogU0VSVkVSIFRPTyBTTE9XXCIpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH0gLy90b28gZmFzdFxyXG5cclxuICAgIHdoaWxlICh0aGlzLmxhc3RTdGVwIC0gdGhpcy5jdXJyU3RlcCA+IDUgKyB0aGlzLmN1cnJQaW5nIC8gNTApIHtcclxuICAgICAgICAvL2NvbnNvbGUubG9nKFwiU1RFUCBSQU5HRSBUT08gTEFSR0U6IENMSUVOVCBJUyBUT08gU0xPVyBGT1IgU1RFUDogXCIgKyB0aGlzLmN1cnJTdGVwKTtcclxuICAgICAgICB1cGRhdGUgPSB0aGlzLmZpbmRVcGRhdGVQYWNrZXQodGhpcy5jdXJyU3RlcCk7XHJcbiAgICAgICAgaWYgKCF1cGRhdGUpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJVUERBVEUgTk9UIEZPVU5EISEhIVwiKTtcclxuICAgICAgICAgICAgdGhpcy5jdXJyU3RlcCArPSAxO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh1cGRhdGUucmVhZGVyLl9vZmZzZXQgPiAxMCkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIk9GRlNFVCBJUyBUT08gTEFSR0VcIik7XHJcbiAgICAgICAgICAgIHRoaXMuY3VyclN0ZXAgKz0gMTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5hcHBseVVwZGF0ZSh1cGRhdGUucmVhZGVyKTtcclxuICAgICAgICB0aGlzLmN1cnJTdGVwICs9IDE7XHJcbiAgICB9IC8vdG9vIHNsb3dcclxuXHJcbiAgICB1cGRhdGUgPSB0aGlzLmZpbmRVcGRhdGVQYWNrZXQodGhpcy5jdXJyU3RlcCk7XHJcbiAgICBpZiAoIXVwZGF0ZSkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQ0FOTk9UIEZJTkQgVVBEQVRFIEZPUiBTVEVQOiBcIiArIHRoaXMuY3VyclN0ZXApO1xyXG4gICAgICAgIHRoaXMuY3VyclN0ZXAgKz0gMTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBpZiAodXBkYXRlLnJlYWRlci5fb2Zmc2V0ID4gMTApIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIk9GRlNFVCBJUyBUT08gTEFSR0UgRk9SIFNURVA6IFwiICsgdGhpcy5jdXJyU3RlcCk7XHJcbiAgICAgICAgY29uc29sZS5sb2codGhpcy51cGRhdGVzWzBdKTtcclxuICAgICAgICB0aGlzLmN1cnJTdGVwICs9IDE7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5hcHBseVVwZGF0ZSh1cGRhdGUucmVhZGVyKTtcclxuICAgIHRoaXMuY3VyclN0ZXAgKz0gMTtcclxufTtcclxuXHJcblxyXG5DbGllbnQucHJvdG90eXBlLmZpbmRVcGRhdGVQYWNrZXQgPSBmdW5jdGlvbiAoc3RlcCkge1xyXG4gICAgdmFyIGxlbmd0aCA9IHRoaXMudXBkYXRlcy5sZW5ndGg7XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IGxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcbiAgICAgICAgdmFyIHVwZGF0ZSA9IHRoaXMudXBkYXRlc1tpXTtcclxuXHJcbiAgICAgICAgaWYgKHVwZGF0ZS5zdGVwID09PSBzdGVwKSB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlcy5zcGxpY2UoMCwgaSk7XHJcbiAgICAgICAgICAgIHJldHVybiB1cGRhdGU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29uc29sZS5sb2coJ0NPVUxEIE5PVCBGSU5EIFBBQ0tFVCBGT1IgU1RFUDogJyArIHN0ZXApO1xyXG4gICAgY29uc29sZS5sb2codGhpcy51cGRhdGVzWzBdKTtcclxuICAgIGNvbnNvbGUubG9nKHRoaXMudXBkYXRlc1sxXSk7XHJcbiAgICBjb25zb2xlLmxvZyh0aGlzLnVwZGF0ZXNbMl0pO1xyXG5cclxuXHJcbiAgICByZXR1cm4gbnVsbDtcclxufTtcclxuXHJcblxyXG5DbGllbnQucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgc2V0SW50ZXJ2YWwodGhpcy5jbGllbnRVcGRhdGUuYmluZCh0aGlzKSwgMTAwMCAvIDI1KTtcclxufTtcclxuXHJcbmZ1bmN0aW9uIGxlcnAoYSwgYiwgcmF0aW8pIHtcclxuICAgIHJldHVybiBhICsgcmF0aW8gKiAoYiAtIGEpO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gc3F1YXJlKGEpIHtcclxuICAgIHJldHVybiBhICogYTtcclxufVxyXG5cclxuZnVuY3Rpb24gdmVjdG9yTm9ybWFsKGEpIHtcclxuICAgIHJldHVybiBhLnggKiBhLnggKyBhLnkgKiBhLnk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ2xpZW50OyIsImZ1bmN0aW9uIEFuaW1hdGlvbihhbmltYXRpb25JbmZvLCBjbGllbnQpIHtcclxuXHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxuICAgIHRoaXMudHlwZSA9IGFuaW1hdGlvbkluZm8udHlwZTtcclxuICAgIHRoaXMuaWQgPSBhbmltYXRpb25JbmZvLmlkO1xyXG4gICAgdGhpcy54ID0gYW5pbWF0aW9uSW5mby54O1xyXG4gICAgdGhpcy55ID0gYW5pbWF0aW9uSW5mby55O1xyXG4gICAgLy90aGlzLnRoZXRhID0gMTU7XHJcbiAgICB0aGlzLnRpbWVyID0gZ2V0UmFuZG9tKDEwLCAxNCk7XHJcblxyXG4gICAgaWYgKHRoaXMudHlwZSA9PT0gXCJzbGFzaFwiKSB7XHJcbiAgICAgICAgdGhpcy5zbGFzaElkID0gYW5pbWF0aW9uSW5mby5zbGFzaElkO1xyXG4gICAgICAgIHZhciBzbGFzaCA9IHRoaXMuY2xpZW50LmZpbmRTbGFzaCh0aGlzLnNsYXNoSWQpO1xyXG4gICAgICAgIHRoaXMucHJlID0gc2xhc2hbMF07XHJcbiAgICAgICAgdGhpcy5wb3N0ID0gc2xhc2hbMV07XHJcbiAgICB9XHJcbn1cclxuXHJcblxyXG5BbmltYXRpb24ucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgY3R4ID0gdGhpcy5jbGllbnQubWFpbkN0eDtcclxuICAgIHZhciBwbGF5ZXIgPSB0aGlzLmNsaWVudC5TRUxGX1BMQVlFUjtcclxuXHJcbiAgICBpZiAodGhpcy50eXBlID09PSBcInNsYXNoXCIgJiYgcGxheWVyKSB7XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG5cclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoMjQyLCAzMSwgNjYsIDAuNilcIjtcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gMTU7XHJcblxyXG4gICAgICAgIGN0eC5tb3ZlVG8ocGxheWVyLnggKyB0aGlzLnByZS54LCBwbGF5ZXIueSArIHRoaXMucHJlLnkpO1xyXG4gICAgICAgIGN0eC5saW5lVG8ocGxheWVyLnggKyB0aGlzLnBvc3QueCwgcGxheWVyLnkgKyB0aGlzLnBvc3QueSk7XHJcblxyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcbiAgICB9XHJcbiAgICBcclxuXHJcbiAgICBpZiAodGhpcy50eXBlID09PSBcInNoYXJkRGVhdGhcIikgeyAvL2RlcHJlY2F0ZWQgYnV0IGNvdWxkIHB1bGwgc29tZSBnb29kIGNvZGUgZnJvbSBoZXJlXHJcbiAgICAgICAgY3R4LmZvbnQgPSA2MCAtIHRoaXMudGltZXIgKyBcInB4IEFyaWFsXCI7XHJcbiAgICAgICAgY3R4LnNhdmUoKTtcclxuICAgICAgICBjdHgudHJhbnNsYXRlKHRoaXMueCwgdGhpcy55KTtcclxuICAgICAgICBjdHgucm90YXRlKC1NYXRoLlBJIC8gNTAgKiB0aGlzLnRoZXRhKTtcclxuICAgICAgICBjdHgudGV4dEFsaWduID0gXCJjZW50ZXJcIjtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDI1NSwgMTY4LCA4NiwgXCIgKyB0aGlzLnRpbWVyICogMTAgLyAxMDAgKyBcIilcIjtcclxuICAgICAgICBjdHguZmlsbFRleHQodGhpcy5uYW1lLCAwLCAxNSk7XHJcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcclxuXHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiIzAwMDAwMFwiO1xyXG4gICAgICAgIHRoaXMudGhldGEgPSBsZXJwKHRoaXMudGhldGEsIDAsIDAuMDgpO1xyXG4gICAgICAgIHRoaXMueCA9IGxlcnAodGhpcy54LCB0aGlzLmVuZFgsIDAuMSk7XHJcbiAgICAgICAgdGhpcy55ID0gbGVycCh0aGlzLnksIHRoaXMuZW5kWSwgMC4xKTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgdGhpcy50aW1lci0tO1xyXG4gICAgaWYgKHRoaXMudGltZXIgPD0gMCkge1xyXG4gICAgICAgIGRlbGV0ZSB0aGlzLmNsaWVudC5BTklNQVRJT05fTElTVFt0aGlzLmlkXTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5mdW5jdGlvbiBnZXRSYW5kb20obWluLCBtYXgpIHtcclxuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikgKyBtaW47XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxlcnAoYSwgYiwgcmF0aW8pIHtcclxuICAgIHJldHVybiBhICsgcmF0aW8gKiAoYiAtIGEpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEFuaW1hdGlvbjtcclxuXHJcblxyXG4iLCJmdW5jdGlvbiBNaW5pTWFwKCkgeyAvL2RlcHJlY2F0ZWQsIHBsZWFzZSB1cGRhdGVcclxufVxyXG5cclxuTWluaU1hcC5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmIChtYXBUaW1lciA8PSAwIHx8IHNlcnZlck1hcCA9PT0gbnVsbCkge1xyXG4gICAgICAgIHZhciB0aWxlTGVuZ3RoID0gTWF0aC5zcXJ0KE9iamVjdC5zaXplKFRJTEVfTElTVCkpO1xyXG4gICAgICAgIGlmICh0aWxlTGVuZ3RoID09PSAwIHx8ICFzZWxmUGxheWVyKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGltZ0RhdGEgPSBtYWluQ3R4LmNyZWF0ZUltYWdlRGF0YSh0aWxlTGVuZ3RoLCB0aWxlTGVuZ3RoKTtcclxuICAgICAgICB2YXIgdGlsZTtcclxuICAgICAgICB2YXIgdGlsZVJHQjtcclxuICAgICAgICB2YXIgaSA9IDA7XHJcblxyXG5cclxuICAgICAgICBmb3IgKHZhciBpZCBpbiBUSUxFX0xJU1QpIHtcclxuICAgICAgICAgICAgdGlsZVJHQiA9IHt9O1xyXG4gICAgICAgICAgICB0aWxlID0gVElMRV9MSVNUW2lkXTtcclxuICAgICAgICAgICAgaWYgKHRpbGUuY29sb3IgJiYgdGlsZS5hbGVydCB8fCBpbkJvdW5kcyhzZWxmUGxheWVyLCB0aWxlLngsIHRpbGUueSkpIHtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuciA9IHRpbGUuY29sb3IucjtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuZyA9IHRpbGUuY29sb3IuZztcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuYiA9IHRpbGUuY29sb3IuYjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuciA9IDA7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLmcgPSAwO1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5iID0gMDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2ldID0gdGlsZVJHQi5yO1xyXG4gICAgICAgICAgICBpbWdEYXRhLmRhdGFbaSArIDFdID0gdGlsZVJHQi5nO1xyXG4gICAgICAgICAgICBpbWdEYXRhLmRhdGFbaSArIDJdID0gdGlsZVJHQi5iO1xyXG4gICAgICAgICAgICBpbWdEYXRhLmRhdGFbaSArIDNdID0gMjU1O1xyXG4gICAgICAgICAgICBpICs9IDQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnNvbGUubG9nKDQwMCAvIE9iamVjdC5zaXplKFRJTEVfTElTVCkpO1xyXG4gICAgICAgIGltZ0RhdGEgPSBzY2FsZUltYWdlRGF0YShpbWdEYXRhLCBNYXRoLmZsb29yKDQwMCAvIE9iamVjdC5zaXplKFRJTEVfTElTVCkpLCBtYWluQ3R4KTtcclxuXHJcbiAgICAgICAgbU1hcEN0eC5wdXRJbWFnZURhdGEoaW1nRGF0YSwgMCwgMCk7XHJcblxyXG4gICAgICAgIG1NYXBDdHhSb3Qucm90YXRlKDkwICogTWF0aC5QSSAvIDE4MCk7XHJcbiAgICAgICAgbU1hcEN0eFJvdC5zY2FsZSgxLCAtMSk7XHJcbiAgICAgICAgbU1hcEN0eFJvdC5kcmF3SW1hZ2UobU1hcCwgMCwgMCk7XHJcbiAgICAgICAgbU1hcEN0eFJvdC5zY2FsZSgxLCAtMSk7XHJcbiAgICAgICAgbU1hcEN0eFJvdC5yb3RhdGUoMjcwICogTWF0aC5QSSAvIDE4MCk7XHJcblxyXG4gICAgICAgIHNlcnZlck1hcCA9IG1NYXBSb3Q7XHJcbiAgICAgICAgbWFwVGltZXIgPSAyNTtcclxuICAgIH1cclxuXHJcbiAgICBlbHNlIHtcclxuICAgICAgICBtYXBUaW1lciAtPSAxO1xyXG4gICAgfVxyXG5cclxuICAgIG1haW5DdHguZHJhd0ltYWdlKHNlcnZlck1hcCwgODAwLCA0MDApO1xyXG59OyAvL2RlcHJlY2F0ZWRcclxuXHJcbk1pbmlNYXAucHJvdG90eXBlLnNjYWxlSW1hZ2VEYXRhID0gZnVuY3Rpb24gKGltYWdlRGF0YSwgc2NhbGUsIG1haW5DdHgpIHtcclxuICAgIHZhciBzY2FsZWQgPSBtYWluQ3R4LmNyZWF0ZUltYWdlRGF0YShpbWFnZURhdGEud2lkdGggKiBzY2FsZSwgaW1hZ2VEYXRhLmhlaWdodCAqIHNjYWxlKTtcclxuICAgIHZhciBzdWJMaW5lID0gbWFpbkN0eC5jcmVhdGVJbWFnZURhdGEoc2NhbGUsIDEpLmRhdGE7XHJcbiAgICBmb3IgKHZhciByb3cgPSAwOyByb3cgPCBpbWFnZURhdGEuaGVpZ2h0OyByb3crKykge1xyXG4gICAgICAgIGZvciAodmFyIGNvbCA9IDA7IGNvbCA8IGltYWdlRGF0YS53aWR0aDsgY29sKyspIHtcclxuICAgICAgICAgICAgdmFyIHNvdXJjZVBpeGVsID0gaW1hZ2VEYXRhLmRhdGEuc3ViYXJyYXkoXHJcbiAgICAgICAgICAgICAgICAocm93ICogaW1hZ2VEYXRhLndpZHRoICsgY29sKSAqIDQsXHJcbiAgICAgICAgICAgICAgICAocm93ICogaW1hZ2VEYXRhLndpZHRoICsgY29sKSAqIDQgKyA0XHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGZvciAodmFyIHggPSAwOyB4IDwgc2NhbGU7IHgrKykgc3ViTGluZS5zZXQoc291cmNlUGl4ZWwsIHggKiA0KVxyXG4gICAgICAgICAgICBmb3IgKHZhciB5ID0gMDsgeSA8IHNjYWxlOyB5KyspIHtcclxuICAgICAgICAgICAgICAgIHZhciBkZXN0Um93ID0gcm93ICogc2NhbGUgKyB5O1xyXG4gICAgICAgICAgICAgICAgdmFyIGRlc3RDb2wgPSBjb2wgKiBzY2FsZTtcclxuICAgICAgICAgICAgICAgIHNjYWxlZC5kYXRhLnNldChzdWJMaW5lLCAoZGVzdFJvdyAqIHNjYWxlZC53aWR0aCArIGRlc3RDb2wpICogNClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gc2NhbGVkO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNaW5pTWFwOyIsImZ1bmN0aW9uIFBsYXllcihyZWFkZXIsIGNsaWVudCkge1xyXG4gICAgaWYgKCFyZWFkZXIpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIk1BS0lORyBORVcgRkFLRSBQTEFZRVJcIik7XHJcbiAgICAgICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbiAgICAgICAgcmV0dXJuOyAvL2ZvciBmYWtlIHJvY2sgcHVycG9zZXNcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmlkID0gcmVhZGVyLnJlYWRVSW50MzIoKTsgLy9wbGF5ZXIgaWRcclxuICAgIHRoaXMueCA9IHJlYWRlci5yZWFkVUludDMyKCkgLyAxMDA7IC8vcmVhbCB4XHJcbiAgICB0aGlzLnkgPSByZWFkZXIucmVhZFVJbnQzMigpIC8gMTAwOyAvL3JlYWwgeVxyXG5cclxuICAgIHRoaXMucmFkaXVzID0gcmVhZGVyLnJlYWRVSW50MTYoKTsgLy9yYWRpdXNcclxuICAgIHRoaXMubmFtZSA9IHJlYWRlci5yZWFkVUludDMyKCk7IC8vbmFtZVxyXG5cclxuICAgIHRoaXMudmVydGljZXMgPSBbXTsgICAgICAgICAgICAvL3ZlcnRpY2VzXHJcbiAgICB2YXIgY291bnQgPSByZWFkZXIucmVhZFVJbnQ4KCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcclxuICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0gW107XHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXVswXSA9IHJlYWRlci5yZWFkSW50MTYoKSAvIDEwMDA7XHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXVsxXSA9IHJlYWRlci5yZWFkSW50MTYoKSAvIDEwMDA7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5oZWFsdGggPSByZWFkZXIucmVhZFVJbnQxNigpOyAvL2hlYWx0aFxyXG4gICAgdGhpcy5tYXhIZWFsdGggPSByZWFkZXIucmVhZFVJbnQxNigpOyAvL21heEhlYWx0aFxyXG5cclxuICAgIHRoaXMudGhldGEgPSByZWFkZXIucmVhZEludDE2KCkgLyAxMDA7IC8vdGhldGFcclxuICAgIHRoaXMubGV2ZWwgPSByZWFkZXIucmVhZFVJbnQ4KCk7IC8vbGV2ZWxcclxuXHJcbiAgICBzd2l0Y2ggKHJlYWRlci5yZWFkVUludDgoKSkgeyAgICAvL2ZsYWdzXHJcbiAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICB0aGlzLnZ1bG5lcmFibGUgPSB0cnVlO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDE2OlxyXG4gICAgICAgICAgICB0aGlzLnNob290aW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAxNzpcclxuICAgICAgICAgICAgdGhpcy52dWxuZXJhYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5zaG9vdGluZyA9IHRydWU7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG5cclxuICAgIGlmICghdGhpcy5jbGllbnQuU0VMRl9QTEFZRVIgJiYgdGhpcy5pZCA9PT0gdGhpcy5jbGllbnQuU0VMRl9JRCkge1xyXG4gICAgICAgIHRoaXMuY2xpZW50LlNFTEZfUExBWUVSID0gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLm1vdmVyID0ge1xyXG4gICAgICAgIHg6IDAsXHJcbiAgICAgICAgeTogMFxyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLnJlYWxNb3ZlciA9IHtcclxuICAgICAgICB4OiAwLFxyXG4gICAgICAgIHk6IDBcclxuICAgIH07XHJcbn1cclxuXHJcblxyXG5QbGF5ZXIucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIChyZWFkZXIpIHtcclxuICAgIHRoaXMudXBkYXRlVGltZXIgPSA1MDtcclxuICAgIHRoaXMueCA9IHJlYWRlci5yZWFkVUludDMyKCkgLyAxMDA7IC8vcmVhbCB4XHJcbiAgICB0aGlzLnkgPSByZWFkZXIucmVhZFVJbnQzMigpIC8gMTAwOyAvL3JlYWwgeVxyXG5cclxuICAgIHZhciAgcmFkaXVzID0gcmVhZGVyLnJlYWRVSW50MTYoKTsgLy9yYWRpdXNcclxuICAgIGlmIChyYWRpdXMgIT09IHRoaXMucmFkaXVzKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJVUERBVEVEIFBMQVlFUiBSQURJVVM6IFwiICsgdGhpcy5yYWRpdXMpO1xyXG4gICAgICAgIHRoaXMucmFkaXVzID0gcmFkaXVzO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICB0aGlzLm5hbWUgPSByZWFkZXIucmVhZEludDMyKCk7IC8vbmFtZVxyXG5cclxuICAgIHRoaXMuaGVhbHRoID0gcmVhZGVyLnJlYWRVSW50MTYoKTsgLy9oZWFsdGhcclxuICAgIHRoaXMubWF4SGVhbHRoID0gcmVhZGVyLnJlYWRVSW50MTYoKTsgLy9tYXhIZWFsdGhcclxuXHJcbiAgICB0aGlzLnRoZXRhID0gcmVhZGVyLnJlYWRJbnQxNigpIC8gMTAwOyAvL3RoZXRhXHJcbiAgICB0aGlzLmxldmVsID0gcmVhZGVyLnJlYWRVSW50OCgpOyAvL2xldmVsXHJcblxyXG4gICAgdmFyIGZsYWdzID0gcmVhZGVyLnJlYWRVSW50MTYoKTtcclxuXHJcbiAgICB0aGlzLnNob290aW5nID0gTnVtYmVyKFN0cmluZyhmbGFncykuY2hhckF0KDApKSA9PT0gMTtcclxuICAgIHRoaXMudnVsbmVyYWJsZSA9IE51bWJlcihTdHJpbmcoZmxhZ3MpLmNoYXJBdCgxKSkgPT09IDE7XHJcbiAgICB0aGlzLmNvbGxpZGluZyA9IE51bWJlcihTdHJpbmcoZmxhZ3MpLmNoYXJBdCgyKSkgPT09IDE7XHJcblxyXG59O1xyXG5cclxuXHJcblBsYXllci5wcm90b3R5cGUudGljayA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmICh0aGlzLnJlYWxNb3Zlcikge1xyXG4gICAgICAgIHRoaXMubW92ZXIueCA9IGxlcnAodGhpcy5tb3Zlci54LCB0aGlzLnJlYWxNb3Zlci54LCAwLjE1KTtcclxuICAgICAgICB0aGlzLm1vdmVyLnkgPSBsZXJwKHRoaXMubW92ZXIueSwgdGhpcy5yZWFsTW92ZXIueSwgMC4xNSk7XHJcbiAgICB9XHJcbiAgICAvL3RoaXMubW92ZSh0aGlzLm1vdmVyLngsIHRoaXMubW92ZXIueSk7XHJcbn07XHJcblxyXG5cclxuUGxheWVyLnByb3RvdHlwZS5zZXRNb3ZlID0gZnVuY3Rpb24gKHgsIHkpIHtcclxuICAgIHRoaXMucmVhbE1vdmVyID0ge1xyXG4gICAgICAgIHg6IHgsXHJcbiAgICAgICAgeTogeVxyXG4gICAgfTtcclxufTtcclxuXHJcblxyXG5QbGF5ZXIucHJvdG90eXBlLmdldFRoZXRhID0gZnVuY3Rpb24gKHRhcmdldCwgb3JpZ2luKSB7XHJcbiAgICB0aGlzLnRoZXRhID0gTWF0aC5hdGFuMih0YXJnZXQueSAtIG9yaWdpbi55LCB0YXJnZXQueCAtIG9yaWdpbi54KSAlICgyICogTWF0aC5QSSk7XHJcbn07XHJcblxyXG5QbGF5ZXIucHJvdG90eXBlLm1vdmUgPSBmdW5jdGlvbiAoeCwgeSkge1xyXG4gICAgdmFyIHRhcmdldCA9IHtcclxuICAgICAgICB4OiB0aGlzLnggKyB4LFxyXG4gICAgICAgIHk6IHRoaXMueSArIHlcclxuICAgIH07XHJcbiAgICB2YXIgb3JpZ2luID0ge1xyXG4gICAgICAgIHg6IHRoaXMueCxcclxuICAgICAgICB5OiB0aGlzLnlcclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5nZXRUaGV0YSh0YXJnZXQsIG9yaWdpbik7XHJcblxyXG5cclxuICAgIHZhciBub3JtYWxWZWwgPSBub3JtYWwoeCwgeSk7XHJcbiAgICBpZiAobm9ybWFsVmVsIDwgMSkge1xyXG4gICAgICAgIG5vcm1hbFZlbCA9IDE7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHZlbEJ1ZmZlciA9IDM7IC8vY2hhbmdlIHNvb25cclxuXHJcbiAgICB0aGlzLnggKz0gMTAwICogeCAvIG5vcm1hbFZlbCAvIHZlbEJ1ZmZlcjtcclxuICAgIHRoaXMueSArPSAxMDAgKiB5IC8gbm9ybWFsVmVsIC8gdmVsQnVmZmVyO1xyXG5cclxufTtcclxuXHJcblxyXG5QbGF5ZXIucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnVwZGF0ZVRpbWVyIC09IDE7XHJcbiAgICBpZiAodGhpcy51cGRhdGVUaW1lciA8PSAwKSB7XHJcbiAgICAgICAgZGVsZXRlIHRoaXMuY2xpZW50LlBMQVlFUl9MSVNUW3RoaXMuaWRdO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5tYWluQ3R4O1xyXG4gICAgdmFyIGZpbGxBbHBoYTtcclxuICAgIHZhciBzdHJva2VBbHBoYTtcclxuICAgIHZhciBpO1xyXG5cclxuXHJcbiAgICBmaWxsQWxwaGEgPSB0aGlzLmhlYWx0aCAvICg0ICogdGhpcy5tYXhIZWFsdGgpO1xyXG4gICAgc3Ryb2tlQWxwaGEgPSAxO1xyXG5cclxuICAgIGN0eC5mb250ID0gXCIyMHB4IEFyaWFsXCI7XHJcblxyXG5cclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwicmdiYSgyNTIsIDEwMiwgMzcsXCIgKyBzdHJva2VBbHBoYSArIFwiKVwiO1xyXG4gICAgaWYgKHRoaXMuc2hvb3RpbmcpIHtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJncmVlblwiO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAodGhpcy52dWxuZXJhYmxlKSB7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwicmVkXCI7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDEyMywwLDAsXCIgKyBmaWxsQWxwaGEgKyBcIilcIjtcclxuICAgIH1cclxuICAgIGN0eC5saW5lV2lkdGggPSAxMDtcclxuXHJcblxyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG5cclxuICAgIGN0eC50cmFuc2xhdGUodGhpcy54LCB0aGlzLnkpO1xyXG4gICAgY3R4LnJvdGF0ZSh0aGlzLnRoZXRhKTtcclxuXHJcbiAgICBpZiAodGhpcy52ZXJ0aWNlcykge1xyXG4gICAgICAgIHZhciB2ID0gdGhpcy52ZXJ0aWNlcztcclxuICAgICAgICBjdHgubW92ZVRvKHZbMF1bMF0gKiB0aGlzLnJhZGl1cywgdlswXVsxXSAqIHRoaXMucmFkaXVzKTtcclxuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgdi5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBjdHgubGluZVRvKHZbaV1bMF0gKiB0aGlzLnJhZGl1cywgdltpXVsxXSAqIHRoaXMucmFkaXVzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY3R4LmxpbmVUbyh2WzBdWzBdICogdGhpcy5yYWRpdXMsIHZbMF1bMV0gKiB0aGlzLnJhZGl1cyk7XHJcbiAgICAgICAgY3R4LmZpbGwoKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgMzAsIDMwKTtcclxuICAgIH1cclxuICAgIGN0eC5maWxsKCk7XHJcbiAgICBjdHguc3Ryb2tlKCk7XHJcblxyXG4gICAgY3R4LnJvdGF0ZSgyICogTWF0aC5QSSAtIHRoaXMudGhldGEpO1xyXG5cclxuXHJcbiAgICBpZiAoIXRoaXMudnVsbmVyYWJsZSkge1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcInJnYmEoMCwgMjU1LCAwLCAwLjMpXCI7XHJcbiAgICAgICAgY3R4LmFyYygwLCAwLCB0aGlzLnJhZGl1cyAqIDIsIDAsIDIgKiBNYXRoLlBJKTtcclxuICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGN0eC50cmFuc2xhdGUoLXRoaXMueCwgLXRoaXMueSk7XHJcblxyXG5cclxuICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuXHJcblxyXG4gICAgY3R4LmZpbGxTdHlsZSA9IFwiI2ZmOWQ2MFwiO1xyXG4gICAgY3R4LmZpbGxUZXh0KHRoaXMubmFtZSwgdGhpcy54LCB0aGlzLnkgKyA3MCk7XHJcblxyXG5cclxuICAgIGlmICh0aGlzLmhlYWx0aCAmJiB0aGlzLm1heEhlYWx0aCAmJiB0aGlzLmhlYWx0aCA+IDApIHsgLy9oZWFsdGggYmFyXHJcbiAgICAgICAgaWYgKHRoaXMuaGVhbHRoID4gdGhpcy5tYXhIZWFsdGgpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2codGhpcy5oZWFsdGgsIHRoaXMubWF4SGVhbHRoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDEwO1xyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcImJsYWNrXCI7XHJcbiAgICAgICAgY3R4LnJlY3QodGhpcy54LCB0aGlzLnksIDEwMCwgMjApO1xyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcblxyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJncmVlblwiO1xyXG4gICAgICAgIGN0eC5yZWN0KHRoaXMueCwgdGhpcy55LCAxMDAgKiB0aGlzLmhlYWx0aCAvIHRoaXMubWF4SGVhbHRoLCAyMCk7XHJcbiAgICAgICAgY3R4LmZpbGwoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcbiAgICB9IC8vZGlzcGxheSBoZWFsdGggYmFyXHJcblxyXG5cclxuICAgIGN0eC5jbG9zZVBhdGgoKTtcclxufTtcclxuXHJcblxyXG5mdW5jdGlvbiBnZXRSYW5kb20obWluLCBtYXgpIHtcclxuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikgKyBtaW47XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBub3JtYWwoeCwgeSkge1xyXG4gICAgcmV0dXJuIE1hdGguc3FydCh4ICogeCArIHkgKiB5KTtcclxufVxyXG5cclxuZnVuY3Rpb24gbGVycChhLCBiLCByYXRpbykge1xyXG4gICAgcmV0dXJuIGEgKyByYXRpbyAqIChiIC0gYSk7XHJcbn1cclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFBsYXllcjsiLCJmdW5jdGlvbiBSb2NrKHJlYWRlciwgY2xpZW50KSB7XHJcbiAgICBpZiAoIXJlYWRlcikge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiTUFLSU5HIE5FVyBGQUtFIFJPQ0tcIik7XHJcbiAgICAgICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbiAgICAgICAgcmV0dXJuOyAvL2ZvciBmYWtlIHJvY2sgcHVycG9zZXNcclxuICAgIH1cclxuICAgIHZhciBwcmV2ID0gcmVhZGVyLl9vZmZzZXQ7XHJcblxyXG5cclxuICAgIHRoaXMuaWQgPSByZWFkZXIucmVhZFVJbnQzMigpO1xyXG4gICAgLy9jb25zb2xlLmxvZyhcIk5FVyBST0NLOiBcIiArIHRoaXMuaWQpO1xyXG5cclxuICAgIHRoaXMub3duZXIgPSByZWFkZXIucmVhZFVJbnQzMigpO1xyXG4gICAgdGhpcy54ID0gcmVhZGVyLnJlYWRVSW50MzIoKSAvIDEwMDtcclxuICAgIHRoaXMueSA9IHJlYWRlci5yZWFkVUludDMyKCkgLyAxMDA7XHJcblxyXG4gICAgdGhpcy52ZXJ0aWNlcyA9IFtdO1xyXG4gICAgdmFyIGNvdW50ID0gcmVhZGVyLnJlYWRVSW50MTYoKTtcclxuICAgIC8vY29uc29sZS5sb2coXCJDT1VOVDogXCIgKyBjb3VudCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcclxuICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0gW107XHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXVswXSA9IHJlYWRlci5yZWFkSW50MTYoKSAvIDEwMDA7XHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXVsxXSA9IHJlYWRlci5yZWFkSW50MTYoKSAvIDEwMDA7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5oZWFsdGggPSByZWFkZXIucmVhZEludDE2KCk7XHJcbiAgICB0aGlzLm1heEhlYWx0aCA9IHJlYWRlci5yZWFkSW50MTYoKTtcclxuXHJcbiAgICB0aGlzLnRoZXRhID0gcmVhZGVyLnJlYWRJbnQxNigpIC8gMTAwO1xyXG4gICAgdGhpcy50ZXh0dXJlID0gcmVhZGVyLnJlYWRVSW50OCgpO1xyXG5cclxuICAgIHN3aXRjaCAocmVhZGVyLnJlYWRVSW50OCgpKSB7XHJcbiAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICB0aGlzLm5ldXRyYWwgPSB0cnVlO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDE2OlxyXG4gICAgICAgICAgICB0aGlzLmZhc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDE3OlxyXG4gICAgICAgICAgICB0aGlzLm5ldXRyYWwgPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLmZhc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgIH1cclxuICAgIHZhciBkZWx0YSA9IHJlYWRlci5fb2Zmc2V0IC0gcHJldjtcclxuICAgIC8vY29uc29sZS5sb2coXCJERUxUQTogXCIgKyBkZWx0YSk7XHJcblxyXG4gICAgdGhpcy51cGRhdGVzID0gW107XHJcblxyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbn1cclxuXHJcblxyXG5Sb2NrLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAocmVhZGVyKSB7XHJcbiAgICB0aGlzLnVwZGF0ZVRpbWVyID0gNTA7XHJcblxyXG4gICAgdGhpcy5vd25lciA9IHJlYWRlci5yZWFkVUludDMyKCk7XHJcbiAgICB0aGlzLnggPSByZWFkZXIucmVhZFVJbnQzMigpIC8gMTAwO1xyXG4gICAgdGhpcy55ID0gcmVhZGVyLnJlYWRVSW50MzIoKSAvIDEwMDtcclxuXHJcbiAgICB0aGlzLmhlYWx0aCA9IHJlYWRlci5yZWFkSW50MTYoKTtcclxuICAgIHRoaXMubWF4SGVhbHRoID0gcmVhZGVyLnJlYWRJbnQxNigpO1xyXG5cclxuICAgIHRoaXMudGhldGEgPSByZWFkZXIucmVhZEludDE2KCkgLyAxMDA7XHJcblxyXG4gICAgdGhpcy5uZXV0cmFsID0gZmFsc2U7XHJcbiAgICB0aGlzLmZhc3QgPSBmYWxzZTtcclxuICAgIHN3aXRjaCAocmVhZGVyLnJlYWRVSW50OCgpKSB7IC8vZmxhZ3NcclxuICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgIHRoaXMubmV1dHJhbCA9IHRydWU7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMTY6XHJcbiAgICAgICAgICAgIHRoaXMuZmFzdCA9IHRydWU7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMTc6XHJcbiAgICAgICAgICAgIHRoaXMubmV1dHJhbCA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuZmFzdCA9IHRydWU7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcblJvY2sucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnVwZGF0ZVRpbWVyIC09IDE7XHJcblxyXG4gICAgaWYgKHRoaXMudXBkYXRlVGltZXIgPD0gMCkge1xyXG4gICAgICAgIGRlbGV0ZSB0aGlzLmNsaWVudC5ST0NLX0xJU1RbdGhpcy5pZF07XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5tYWluQ3R4O1xyXG4gICAgdmFyIFNDQUxFID0gMTAwO1xyXG5cclxuXHJcbiAgICBjdHguZmlsbFN0eWxlID0gXCJwaW5rXCI7IC8vZGVmYXVsdCBjb2xvclxyXG4gICAgc3dpdGNoICh0aGlzLnRleHR1cmUpIHtcclxuICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBcImJyb3duXCI7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiZ3JleVwiO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDM6XHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBcInllbGxvd1wiO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDQ6XHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBcImdyZWVuXCI7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSAhdGhpcy5vd25lciA/IFwiYmx1ZVwiIDogXCJncmVlblwiO1xyXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gdGhpcy5mYXN0ID8gXCJyZWRcIiA6IGN0eC5zdHJva2VTdHlsZTtcclxuXHJcblxyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG5cclxuICAgIGN0eC50cmFuc2xhdGUodGhpcy54LCB0aGlzLnkpO1xyXG4gICAgY3R4LnJvdGF0ZSh0aGlzLnRoZXRhKTtcclxuXHJcbiAgICBpZiAodGhpcy52ZXJ0aWNlcykge1xyXG4gICAgICAgIHZhciB2ID0gdGhpcy52ZXJ0aWNlcztcclxuICAgICAgICBjdHgubW92ZVRvKHZbMF1bMF0gKiBTQ0FMRSwgdlswXVsxXSAqIFNDQUxFKTtcclxuXHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCB2Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGN0eC5saW5lVG8odltpXVswXSAqIFNDQUxFLCB2W2ldWzFdICogU0NBTEUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjdHgubGluZVRvKHZbMF1bMF0gKiBTQ0FMRSwgdlswXVsxXSAqIFNDQUxFKTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCAzMCwgMzApO1xyXG4gICAgfVxyXG5cclxuICAgIGN0eC5maWxsKCk7XHJcbiAgICBjdHguc3Ryb2tlKCk7XHJcblxyXG4gICAgY3R4LnJvdGF0ZSgyICogTWF0aC5QSSAtIHRoaXMudGhldGEpO1xyXG4gICAgY3R4LnRyYW5zbGF0ZSgtdGhpcy54LCAtdGhpcy55KTtcclxuXHJcbiAgICBjdHguY2xvc2VQYXRoKCk7XHJcblxyXG4gICAgaWYgKDEgPT09IDIgJiYgdGhpcy5oZWFsdGggJiYgdGhpcy5tYXhIZWFsdGggJiYgdGhpcy5oZWFsdGggPiAwKSB7IC8vaGVhbHRoIGJhclxyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAxMDtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJibGFja1wiO1xyXG4gICAgICAgIGN0eC5yZWN0KHRoaXMueCwgdGhpcy55LCAxMDAsIDIwKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG5cclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiZ3JlZW5cIjtcclxuICAgICAgICBjdHgucmVjdCh0aGlzLngsIHRoaXMueSwgMTAwICogdGhpcy5oZWFsdGggLyB0aGlzLm1heEhlYWx0aCwgMjApO1xyXG4gICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfSAvL2Rpc3BsYXkgaGVhbHRoIGJhclxyXG59O1xyXG5cclxuXHJcbmZ1bmN0aW9uIGdldFJhbmRvbShtaW4sIG1heCkge1xyXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pbjtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSb2NrOyIsImZ1bmN0aW9uIFRpbGUodGhpc0luZm8sIGNsaWVudCkge1xyXG4gICAgdGhpcy5pZCA9IHRoaXNJbmZvLmlkO1xyXG4gICAgdGhpcy54ID0gdGhpc0luZm8ueDtcclxuICAgIHRoaXMueSA9IHRoaXNJbmZvLnk7XHJcbiAgICB0aGlzLmxlbmd0aCA9IHRoaXNJbmZvLmxlbmd0aDtcclxuICAgIHRoaXMuY29sb3IgPSB0aGlzSW5mby5jb2xvcjtcclxuICAgIHRoaXMudG9wQ29sb3IgPSB7XHJcbiAgICAgICAgcjogdGhpcy5jb2xvci5yICsgMTAsXHJcbiAgICAgICAgZzogdGhpcy5jb2xvci5nICsgMTAsXHJcbiAgICAgICAgYjogdGhpcy5jb2xvci5iICsgMTBcclxuICAgIH07XHJcbiAgICB0aGlzLmJvcmRlckNvbG9yID0ge1xyXG4gICAgICAgIHI6IHRoaXMuY29sb3IuciAtIDEwLFxyXG4gICAgICAgIGc6IHRoaXMuY29sb3IuZyAtIDEwLFxyXG4gICAgICAgIGI6IHRoaXMuY29sb3IuYiAtIDEwXHJcbiAgICB9O1xyXG4gICAgdGhpcy5hbGVydCA9IHRoaXNJbmZvLmFsZXJ0O1xyXG4gICAgdGhpcy5yYW5kb20gPSBNYXRoLmZsb29yKGdldFJhbmRvbSgwLCAzKSk7XHJcblxyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbn1cclxuXHJcblRpbGUucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICh0aGlzSW5mbykge1xyXG4gICAgdGhpcy5jb2xvciA9IHRoaXNJbmZvLmNvbG9yO1xyXG4gICAgdGhpcy50b3BDb2xvciA9IHtcclxuICAgICAgICByOiB0aGlzLmNvbG9yLnIgKyAxMDAsXHJcbiAgICAgICAgZzogdGhpcy5jb2xvci5nICsgMTAwLFxyXG4gICAgICAgIGI6IHRoaXMuY29sb3IuYiArIDEwMFxyXG4gICAgfTtcclxuICAgIHRoaXMuYm9yZGVyQ29sb3IgPSB7XHJcbiAgICAgICAgcjogdGhpcy5jb2xvci5yIC0gMTAsXHJcbiAgICAgICAgZzogdGhpcy5jb2xvci5nIC0gMTAsXHJcbiAgICAgICAgYjogdGhpcy5jb2xvci5iIC0gMTBcclxuICAgIH07XHJcbiAgICB0aGlzLmFsZXJ0ID0gdGhpc0luZm8uYWxlcnQ7XHJcbn07XHJcblxyXG5UaWxlLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50Lm1haW5DdHg7XHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcblxyXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gXCJyZ2IoXCIgKyB0aGlzLmJvcmRlckNvbG9yLnIgKyBcIixcIiArIHRoaXMuYm9yZGVyQ29sb3IuZyArIFwiLFwiICsgdGhpcy5ib3JkZXJDb2xvci5iICsgXCIpXCI7XHJcbiAgICBjdHgubGluZVdpZHRoID0gMjA7XHJcblxyXG5cclxuICAgIHZhciBncmQgPSBjdHguY3JlYXRlTGluZWFyR3JhZGllbnQodGhpcy54ICsgdGhpcy5sZW5ndGggKiAzLzQsIHRoaXMueSwgdGhpcy54ICsgdGhpcy5sZW5ndGgvNCwgdGhpcy55ICsgdGhpcy5sZW5ndGgpO1xyXG4gICAgZ3JkLmFkZENvbG9yU3RvcCgwLCBcInJnYihcIiArIHRoaXMudG9wQ29sb3IuciArIFwiLFwiICsgdGhpcy50b3BDb2xvci5nICsgXCIsXCIgKyB0aGlzLnRvcENvbG9yLmIgKyBcIilcIik7XHJcbiAgICBncmQuYWRkQ29sb3JTdG9wKDEsIFwicmdiKFwiICsgdGhpcy5jb2xvci5yICsgXCIsXCIgKyB0aGlzLmNvbG9yLmcgKyBcIixcIiArIHRoaXMuY29sb3IuYiArIFwiKVwiKTtcclxuICAgIGN0eC5maWxsU3R5bGUgPSBncmQ7XHJcblxyXG5cclxuICAgIGN0eC5yZWN0KHRoaXMueCArIDMwLCB0aGlzLnkgKyAzMCwgdGhpcy5sZW5ndGggLSAzMCwgdGhpcy5sZW5ndGggLSAzMCk7XHJcblxyXG4gICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgY3R4LmZpbGwoKTtcclxuXHJcblxyXG59O1xyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVGlsZTtcclxuXHJcblxyXG5mdW5jdGlvbiBnZXRSYW5kb20obWluLCBtYXgpIHtcclxuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikgKyBtaW47XHJcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIEFuaW1hdGlvbjogcmVxdWlyZSgnLi9BbmltYXRpb24nKSxcclxuICAgIFBsYXllcjogcmVxdWlyZSgnLi9QbGF5ZXInKSxcclxuICAgIE1pbmlNYXA6IHJlcXVpcmUoJy4vTWluaU1hcCcpLFxyXG4gICAgVGlsZTogcmVxdWlyZSgnLi9UaWxlJyksXHJcbiAgICBSb2NrOiByZXF1aXJlKCcuL1JvY2snKVxyXG59OyIsInZhciBDbGllbnQgPSByZXF1aXJlKCcuL0NsaWVudC5qcycpO1xyXG52YXIgTWFpblVJID0gcmVxdWlyZSgnLi91aS9NYWluVUknKTtcclxuXHJcbnZhciBjbGllbnQgPSBuZXcgQ2xpZW50KCk7XHJcbmNsaWVudC5zdGFydCgpO1xyXG5cclxuXHJcblxyXG5kb2N1bWVudC5vbmtleWRvd24gPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGNsaWVudC5rZXlzW2V2ZW50LmtleUNvZGVdID0gdHJ1ZTtcclxuXHJcbiAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMzIpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlNQQUNFXCIpO1xyXG4gICAgICAgIGNsaWVudC5zb2NrZXQuZW1pdChcInNob290U2VsZlwiLCB7XHJcbiAgICAgICAgICAgIGlkOiBjbGllbnQuU0VMRl9JRFxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59LmJpbmQodGhpcyk7XHJcblxyXG5kb2N1bWVudC5vbmtleXVwID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gODQpIHtcclxuICAgICAgICBjbGllbnQubWFpblVJLmdhbWVVSS5jaGF0VUkudGV4dElucHV0LmNsaWNrKCk7XHJcbiAgICB9XHJcbiAgICBjbGllbnQua2V5c1tldmVudC5rZXlDb2RlXSA9IGZhbHNlO1xyXG4gICAgY2xpZW50LnNvY2tldC5lbWl0KCdrZXlFdmVudCcsIHtpZDogZXZlbnQua2V5Q29kZSwgc3RhdGU6IGZhbHNlfSk7XHJcbn07XHJcblxyXG5cclxuJCh3aW5kb3cpLmJpbmQoJ21vdXNld2hlZWwgRE9NTW91c2VTY3JvbGwnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGlmIChldmVudC5jdHJsS2V5ID09PSB0cnVlKSB7XHJcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgIH1cclxuICAgIGlmIChjbGllbnQuQ0hBVF9TQ1JPTEwpIHtcclxuICAgICAgICBjbGllbnQuQ0hBVF9TQ1JPTEwgPSBmYWxzZTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgaWYoZXZlbnQub3JpZ2luYWxFdmVudC53aGVlbERlbHRhIC8xMjAgPiAwICYmIGNsaWVudC5tYWluU2NhbGVGYWN0b3IgPCAyKSB7XHJcbiAgICAgICAgY2xpZW50Lm1haW5TY2FsZUZhY3RvciArPSAwLjA1O1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoY2xpZW50Lm1haW5TY2FsZUZhY3RvciA+IDAuMjUpIHtcclxuICAgICAgICBjbGllbnQubWFpblNjYWxlRmFjdG9yIC09IDAuMDU7XHJcbiAgICB9XHJcbn0pO1xyXG5cclxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY29udGV4dG1lbnUnLCBmdW5jdGlvbiAoZSkgeyAvL3ByZXZlbnQgcmlnaHQtY2xpY2sgY29udGV4dCBtZW51XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbn0sIGZhbHNlKTsiLCJkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUub3ZlcmZsb3cgPSAnaGlkZGVuJzsgIC8vIGZpcmVmb3gsIGNocm9tZVxyXG5kb2N1bWVudC5ib2R5LnNjcm9sbCA9IFwibm9cIjtcclxuXHJcbnZhciBQbGF5ZXJOYW1lclVJID0gcmVxdWlyZSgnLi9QbGF5ZXJOYW1lclVJJyk7XHJcbnZhciBHYW1lVUkgPSByZXF1aXJlKCcuL2dhbWUvR2FtZVVJJyk7XHJcblxyXG5mdW5jdGlvbiBNYWluVUkoY2xpZW50LCBzb2NrZXQpIHtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcblxyXG4gICAgdGhpcy5nYW1lVUkgPSBuZXcgR2FtZVVJKHRoaXMuY2xpZW50LCB0aGlzLnNvY2tldCwgdGhpcyk7XHJcblxyXG4gICAgdGhpcy5wbGF5ZXJOYW1lclVJID0gbmV3IFBsYXllck5hbWVyVUkodGhpcy5jbGllbnQsIHRoaXMuc29ja2V0KTtcclxufVxyXG5cclxuTWFpblVJLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKGluZm8pIHtcclxuICAgIHZhciBhY3Rpb24gPSBpbmZvLmFjdGlvbjtcclxuICAgIHZhciBob21lO1xyXG4gICAgaWYgKGFjdGlvbiA9PT0gXCJnYW1lTXNnUHJvbXB0XCIpIHtcclxuICAgICAgICB0aGlzLmdhbWVVSS5nYW1lTXNnUHJvbXB0Lm9wZW4oaW5mby5tZXNzYWdlKTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5NYWluVUkucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKGFjdGlvbikge1xyXG4gICAgaWYgKGFjdGlvbiA9PT0gXCJnYW1lTXNnUHJvbXB0XCIpIHtcclxuICAgICAgICB0aGlzLmdhbWVVSS5nYW1lTXNnUHJvbXB0LmNsb3NlKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuTWFpblVJLnByb3RvdHlwZS51cGRhdGVMZWFkZXJCb2FyZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBsZWFkZXJib2FyZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibGVhZGVyYm9hcmRcIik7XHJcbiAgICB2YXIgUExBWUVSX0FSUkFZID0gdGhpcy5jbGllbnQuUExBWUVSX0FSUkFZO1xyXG5cclxuXHJcbiAgICB2YXIgcGxheWVyU29ydCA9IGZ1bmN0aW9uIChhLCBiKSB7XHJcbiAgICAgICAgdmFyIHBsYXllckEgPSB0aGlzLmNsaWVudC5QTEFZRVJfTElTVFthXTtcclxuICAgICAgICB2YXIgcGxheWVyQiA9IHRoaXMuY2xpZW50LlBMQVlFUl9MSVNUW2JdO1xyXG4gICAgICAgIHJldHVybiBwbGF5ZXJBLnJhZGl1cyAtIHBsYXllckIucmFkaXVzO1xyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG5cclxuICAgIFBMQVlFUl9BUlJBWS5zb3J0KHBsYXllclNvcnQpO1xyXG5cclxuXHJcbiAgICBsZWFkZXJib2FyZC5pbm5lckhUTUwgPSBcIlwiO1xyXG4gICAgZm9yICh2YXIgaSA9IFBMQVlFUl9BUlJBWS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgICAgIHZhciBwbGF5ZXIgPSB0aGlzLmNsaWVudC5QTEFZRVJfTElTVFtQTEFZRVJfQVJSQVlbaV1dO1xyXG4gICAgICAgIHZhciBlbnRyeSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XHJcbiAgICAgICAgZW50cnkuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUocGxheWVyLm5hbWUgKyBcIiAtIFwiICsgcGxheWVyLnJhZGl1cykpO1xyXG4gICAgICAgIGxlYWRlcmJvYXJkLmFwcGVuZENoaWxkKGVudHJ5KTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNYWluVUk7IiwiZnVuY3Rpb24gUGxheWVyTmFtZXJVSSAoY2xpZW50LCBzb2NrZXQpIHtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcblxyXG4gICAgdGhpcy5sZWFkZXJib2FyZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibGVhZGVyYm9hcmRfY29udGFpbmVyXCIpO1xyXG4gICAgdGhpcy5uYW1lQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJuYW1lU3VibWl0XCIpO1xyXG4gICAgdGhpcy5wbGF5ZXJOYW1lSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsYXllck5hbWVJbnB1dFwiKTtcclxuICAgIHRoaXMucGxheWVyTmFtZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsYXllcl9uYW1lclwiKTtcclxufVxyXG5cclxuUGxheWVyTmFtZXJVSS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMucGxheWVyTmFtZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMykge1xyXG4gICAgICAgICAgICB0aGlzLm5hbWVCdG4uY2xpY2soKTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMubmFtZUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuY2xpZW50Lm1haW5DYW52YXMuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgIHRoaXMubGVhZGVyYm9hcmQuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJuZXdQbGF5ZXJcIixcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogdGhpcy5wbGF5ZXJOYW1lSW5wdXQudmFsdWUsXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMucGxheWVyTmFtZXIuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgdGhpcy5wbGF5ZXJOYW1lci5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICB0aGlzLnBsYXllck5hbWVJbnB1dC5mb2N1cygpO1xyXG4gICAgdGhpcy5sZWFkZXJib2FyZC5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUGxheWVyTmFtZXJVSTsiLCJmdW5jdGlvbiBDaGF0VUkocGFyZW50KSB7XHJcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcclxuICAgIHRoaXMudGVtcGxhdGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNoYXRfY29udGFpbmVyXCIpO1xyXG4gICAgdGhpcy50ZXh0SW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2hhdF9pbnB1dCcpO1xyXG4gICAgdGhpcy5jaGF0TGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjaGF0X2xpc3QnKTtcclxuXHJcblxyXG4gICAgdGhpcy50ZXh0SW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy50ZXh0SW5wdXQuZm9jdXMoKTtcclxuXHJcbiAgICAgICAgdGhpcy5wYXJlbnQuY2xpZW50LkNIQVRfT1BFTiA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5jaGF0TGlzdC5zdHlsZS5oZWlnaHQgPSBcIjgwJVwiO1xyXG4gICAgICAgIHRoaXMuY2hhdExpc3Quc3R5bGUub3ZlcmZsb3dZID0gXCJhdXRvXCI7XHJcblxyXG4gICAgICAgIHRoaXMudGV4dElucHV0LnN0eWxlLmJhY2tncm91bmQgPSBcInJnYmEoMzQsIDQ4LCA3MSwgMSlcIjtcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcbiAgICB0aGlzLnRleHRJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAxMykge1xyXG4gICAgICAgICAgICB0aGlzLnNlbmRNZXNzYWdlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcblxyXG4gICAgdGhpcy50ZW1wbGF0ZS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXdoZWVsJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMucGFyZW50LmNsaWVudC5DSEFUX1NDUk9MTCA9IHRydWU7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMudGVtcGxhdGUuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMucGFyZW50LmNsaWVudC5DSEFUX0NMSUNLID0gdHJ1ZTtcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcbn1cclxuXHJcbkNoYXRVSS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uIChtZXNzYWdlKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcbiAgICB0aGlzLmNsb3NlKCk7XHJcbn07XHJcblxyXG5cclxuQ2hhdFVJLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudGV4dElucHV0LmJsdXIoKTtcclxuICAgIHRoaXMucGFyZW50LmNsaWVudC5DSEFUX09QRU4gPSBmYWxzZTtcclxuICAgIHRoaXMuY2hhdExpc3Quc3R5bGUuaGVpZ2h0ID0gXCIzMCVcIjtcclxuICAgIHRoaXMuY2hhdExpc3Quc3R5bGUuYmFja2dyb3VuZCA9IFwicmdiYSgxODIsIDE5MywgMjExLCAwLjAyKVwiO1xyXG4gICAgdGhpcy50ZXh0SW5wdXQuc3R5bGUuYmFja2dyb3VuZCA9IFwicmdiYSgxODIsIDE5MywgMjExLCAwLjEpXCI7XHJcbiAgICB0aGlzLnBhcmVudC5jbGllbnQuQ0hBVF9TQ1JPTEwgPSBmYWxzZTtcclxuICAgICQoJyNjaGF0X2xpc3QnKS5hbmltYXRlKHtzY3JvbGxUb3A6ICQoJyNjaGF0X2xpc3QnKS5wcm9wKFwic2Nyb2xsSGVpZ2h0XCIpfSwgMTAwKTtcclxuICAgIHRoaXMuY2hhdExpc3Quc3R5bGUub3ZlcmZsb3dZID0gXCJub25lXCI7XHJcbn07XHJcblxyXG5cclxuQ2hhdFVJLnByb3RvdHlwZS5hZGRNZXNzYWdlID0gZnVuY3Rpb24gKHBhY2tldCkge1xyXG4gICAgdmFyIGVudHJ5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcclxuICAgIGVudHJ5LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHBhY2tldC5uYW1lICsgXCIgOiBcIiArIHBhY2tldC5jaGF0TWVzc2FnZSkpO1xyXG4gICAgdGhpcy5jaGF0TGlzdC5hcHBlbmRDaGlsZChlbnRyeSk7XHJcblxyXG4gICAgJCgnI2NoYXRfbGlzdCcpLmFuaW1hdGUoe3Njcm9sbFRvcDogJCgnI2NoYXRfbGlzdCcpLnByb3AoXCJzY3JvbGxIZWlnaHRcIil9LCAxMDApO1xyXG59O1xyXG5cclxuXHJcbkNoYXRVSS5wcm90b3R5cGUuc2VuZE1lc3NhZ2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgc29ja2V0ID0gdGhpcy5wYXJlbnQuc29ja2V0O1xyXG5cclxuXHJcbiAgICBpZiAodGhpcy50ZXh0SW5wdXQudmFsdWUgJiYgdGhpcy50ZXh0SW5wdXQudmFsdWUgIT09IFwiXCIpIHtcclxuICAgICAgICBzb2NrZXQuZW1pdCgnY2hhdE1lc3NhZ2UnLCB7XHJcbiAgICAgICAgICAgIGlkOiB0aGlzLnBhcmVudC5jbGllbnQuU0VMRl9JRCxcclxuICAgICAgICAgICAgbWVzc2FnZTogdGhpcy50ZXh0SW5wdXQudmFsdWVcclxuICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLnRleHRJbnB1dC52YWx1ZSA9IFwiXCI7XHJcbiAgICB9XHJcbiAgICB0aGlzLmNsb3NlKCk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENoYXRVSTtcclxuXHJcblxyXG4iLCJmdW5jdGlvbiBHYW1lTXNnUHJvbXB0KHBhcmVudCkge1xyXG4gICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XHJcbiAgICB0aGlzLnRlbXBsYXRlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwcm9tcHRfY29udGFpbmVyXCIpO1xyXG4gICAgdGhpcy5tZXNzYWdlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dhbWVfbXNnX3Byb21wdCcpO1xyXG59XHJcblxyXG5HYW1lTXNnUHJvbXB0LnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKG1lc3NhZ2UpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcclxuICAgIHRoaXMubWVzc2FnZS5pbm5lckhUTUwgPSBtZXNzYWdlO1xyXG59O1xyXG5cclxuR2FtZU1zZ1Byb21wdC5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR2FtZU1zZ1Byb21wdDtcclxuXHJcblxyXG4iLCJ2YXIgR2FtZU1zZ1Byb21wdCA9IHJlcXVpcmUoJy4vR2FtZU1zZ1Byb21wdCcpO1xyXG52YXIgQ2hhdFVJID0gcmVxdWlyZSgnLi9DaGF0VUknKTtcclxuXHJcbmZ1bmN0aW9uIEdhbWVVSShjbGllbnQsIHNvY2tldCwgcGFyZW50KSB7XHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxuICAgIHRoaXMuc29ja2V0ID0gc29ja2V0O1xyXG4gICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XHJcbiAgICB0aGlzLmdhbWVNc2dQcm9tcHQgPSBuZXcgR2FtZU1zZ1Byb21wdCh0aGlzKTtcclxuICAgIHRoaXMuY2hhdFVJID0gbmV3IENoYXRVSSh0aGlzKTtcclxufVxyXG5cclxuR2FtZVVJLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKCkge1xyXG4gICAgY29uc29sZS5sb2coXCJPUEVOSU5HIEdBTUUgVUlcIik7XHJcbiAgICB0aGlzLmNoYXRVSS5vcGVuKCk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9ICBHYW1lVUk7Il19
