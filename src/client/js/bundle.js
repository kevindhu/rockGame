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
    this.socket.on('updateLB', this.handleUpdateLB.bind(this));


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

        this.socket.emit("startShoot", {
            id: this.SELF_ID,
            x: x,
            y: y
        });
    }.bind(this));
    document.addEventListener("mouseup", function (event) {
        if (!this.SELF_ID) {
            return;
        }
        var x = ((event.x / this.mainCanvas.offsetWidth * 1000) - this.mainCanvas.width / 2) / this.scaleFactor;
        var y = ((event.y / this.mainCanvas.offsetHeight * 500) - this.mainCanvas.height / 2) / this.scaleFactor;

        this.socket.emit("endShoot", {
            id: this.SELF_ID,
        });
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
    for (i = 0; i < playerLength; i++) {
        player = new Entity.Player(reader, this);
        if (player.id === this.SELF_ID) {
            this.SELF_PLAYER = player;
        }
        this.PLAYER_LIST[player.id] = player;

        if (this.PLAYER_ARRAY.indexOf(player.id) === -1) {
            this.PLAYER_ARRAY.push(player.id);
        }
    }

    var rock2Length = reader.readUInt16(); //update rocks
    for (i = 0; i < rock2Length; i++) {
        var id = reader.readUInt32();
        rock = this.ROCK_LIST[id];
        if (rock) {
            rock.update(reader);
        }
        else {
            console.log("MAKING NEW FAKE ROCK " + id);

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

        //console.log("DELETED ROCK NORMALLY: " + id);
    }

    var player3Length = reader.readUInt8();
    for (i = 0; i < player3Length; i++) {
        id = reader.readUInt32();

        console.log("DELETING PLAYER: " + id);

        delete this.PLAYER_LIST[id];
        var index = this.PLAYER_ARRAY.indexOf(id);
        this.PLAYER_ARRAY.splice(index, 1);
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


Client.prototype.handleUpdateLB = function (data) {
    var reader = new BinaryReader(data);

    var count = reader.readUInt8();
    var id;
    for (var i = 0; i < count; i++) {
        id = reader.readUInt32();
        var player = this.PLAYER_LIST[id];
        var radius = reader.readUInt16();

        var nameLength = reader.readUInt8();
        var name = "";
        for (var j = 0; j < nameLength; j++) {
            var char = String.fromCharCode(reader.readUInt8());
            name += char;
        }
        if (!player) {
            player = new Entity.Player(null, this);
            player.id = id;
            player.radius = radius;
            player.name = name;

            this.PLAYER_LIST[player.id] = player;

            if (this.PLAYER_ARRAY.indexOf(player.id) === -1) {
                this.PLAYER_ARRAY.push(player.id);
            }
            player.fake = true;
        }
    }

};


Client.prototype.handlePacket = function (data) {
    var packet, i;
    for (i = 0; i < data.length; i++) {
        packet = data[i];
        switch (packet.master) {
            case "add":
                this.addEntities(packet);
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
            console.log("ADDED TILE");
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
        //console.log("STEP RANGE TOO SMALL: SERVER TOO SLOW");
        return;
    }

    if (this.currStep < this.initialStep) {
        this.currStep += 1;
        return;
    }
    if (this.currStep > this.lastStep) {
        //console.log("STEP RANGE TOO SMALL: SERVER TOO SLOW");
        return;
    }

    while (this.lastStep - this.currStep > 5 + this.currPing / 50) {
        console.log("STEP RANGE TOO LARGE: CLIENT IS TOO SLOW FOR STEP: " + this.currStep);
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
    setInterval(this.clientUpdate.bind(this), 1000 / 28);
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

    var nameLength = reader.readUInt8();
    var name = "";

    for (var i = 0; i < nameLength; i++) {
        var char = String.fromCharCode(reader.readUInt8());
        name += char;
    }
    this.name = name;

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

    this.realRadius = reader.readUInt16(); //radius

    if (this.id === this.client.SELF_ID) {
        //this.client.mainScaleFactor = 50 / this.realRadius;
    }
    this.health = reader.readUInt16(); //health
    this.maxHealth = reader.readUInt16(); //maxHealth

    this.shootMeter = reader.readUInt8();

    this.theta = reader.readInt16() / 100; //theta
    this.level = reader.readUInt8(); //level

    this.vulnerable = false;
    this.shooting = false;
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
    if (this.fake) {
        return;
    }

    if (!this.radius) {
        this.radius = 1;
    }
    this.radius = lerp(this.radius, this.realRadius, 0.2);
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
        if (this.health > this.maxHealth / 2) {
            ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
        }
        else {
            ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
        }

        ctx.arc(0, 0, this.radius * 2, 0, 2 * Math.PI);
        ctx.fill();
    }

    ctx.translate(-this.x, -this.y);


    ctx.closePath();


    ctx.fillStyle = "#ff9d60";
    ctx.fillText(this.name, this.x, this.y + 70);


    if (this.health && this.maxHealth && this.health > 0) { //health bar
        if (this.health > this.maxHealth) {
            console.log("PLAYER HAS TOO MUCH HEALTH: " + this.health, this.maxHealth);
        }
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.strokeStyle = "black";
        ctx.rect(this.x - 400, this.y + 200, 800, 100);
        ctx.stroke();
        ctx.closePath();

        ctx.beginPath();
        ctx.fillStyle = "green";
        ctx.rect(this.x - 400, this.y + 200, 800 * this.health / this.maxHealth, 100);
        ctx.fill();
        ctx.closePath();
    } //display health bar


    if (this.shootMeter) { //health bar
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.strokeStyle = "black";
        ctx.rect(this.x - 400, this.y + 300, 800, 50);
        ctx.stroke();
        ctx.closePath();

        ctx.beginPath();
        ctx.fillStyle = "white";
        ctx.rect(this.x - 400, this.y + 300, 800 * this.shootMeter / 30, 50);
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
    this.hitter = reader.readUInt32();
    this.x = reader.readUInt32() / 100;
    this.y = reader.readUInt32() / 100;

    this.vertices = [];
    var count = reader.readUInt16();
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
    this.updates = [];
    this.updateTimer = 20;
    this.client = client;
}


Rock.prototype.update = function (reader) {
    this.owner = reader.readUInt32();
    this.hitter = reader.readUInt32();

    var x = this.x;
    var y = this.y;

    this.x = reader.readUInt32() / 100;
    this.y = reader.readUInt32() / 100;

    if (this.x !== x || this.y !== y) {
        this.updateTimer = 200;
    }

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
        console.log("DELETING ROCK VIA TIMEOUT: " + this.id);
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


    ctx.strokeStyle = this.fast ? "pink" : ctx.strokeStyle;
    ctx.strokeStyle = !this.owner ? "blue" : "green";

    if (this.hitter) {
        ctx.strokeStyle = this.hitter === this.client.SELF_ID ? "green" : "red";
    }


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
    client.socket.emit('keyEvent', {id: event.keyCode, state: true});
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

        if (player) {
            var entry = document.createElement('li');
            entry.appendChild(document.createTextNode(player.name + " - " + Math.floor(player.radius)));
            leaderboard.appendChild(entry);
        }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2xpZW50L2pzL0JpbmFyeVJlYWRlci5qcyIsInNyYy9jbGllbnQvanMvQ2xpZW50LmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvQW5pbWF0aW9uLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvTWluaU1hcC5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L1BsYXllci5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L1JvY2suanMiLCJzcmMvY2xpZW50L2pzL2VudGl0eS9UaWxlLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvaW5kZXguanMiLCJzcmMvY2xpZW50L2pzL2luZGV4LmpzIiwic3JjL2NsaWVudC9qcy91aS9NYWluVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL1BsYXllck5hbWVyVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL2dhbWUvQ2hhdFVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9nYW1lL0dhbWVNc2dQcm9tcHQuanMiLCJzcmMvY2xpZW50L2pzL3VpL2dhbWUvR2FtZVVJLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZnQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiZnVuY3Rpb24gQmluYXJ5UmVhZGVyKGRhdGEpIHtcclxuICAgIHRoaXMuX29mZnNldCA9IDA7XHJcbiAgICB0aGlzLl9idWZmZXIgPSBuZXcgRGF0YVZpZXcoZGF0YSk7XHJcbiAgICAvL2NvbnNvbGUubG9nKGRhdGEuYnl0ZUxlbmd0aCk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQmluYXJ5UmVhZGVyO1xyXG5cclxuXHJcbkJpbmFyeVJlYWRlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9idWZmZXIuZ2V0SW50OCh0aGlzLl9vZmZzZXQpO1xyXG4gICAgdGhpcy5fb2Zmc2V0ICs9IDE7XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbn07XHJcblxyXG5CaW5hcnlSZWFkZXIucHJvdG90eXBlLnJlYWRVSW50OCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciB2YWx1ZSA9IHRoaXMuX2J1ZmZlci5nZXRVaW50OCh0aGlzLl9vZmZzZXQpO1xyXG4gICAgdGhpcy5fb2Zmc2V0ICs9IDE7XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbn07XHJcblxyXG5cclxuQmluYXJ5UmVhZGVyLnByb3RvdHlwZS5yZWFkSW50MTYgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9idWZmZXIuZ2V0SW50MTYodGhpcy5fb2Zmc2V0KTtcclxuICAgIHRoaXMuX29mZnNldCArPSAyO1xyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG59O1xyXG5cclxuQmluYXJ5UmVhZGVyLnByb3RvdHlwZS5yZWFkVUludDE2ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHZhbHVlID0gdGhpcy5fYnVmZmVyLmdldFVpbnQxNih0aGlzLl9vZmZzZXQpO1xyXG4gICAgdGhpcy5fb2Zmc2V0ICs9IDI7XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbn07XHJcblxyXG5cclxuXHJcbkJpbmFyeVJlYWRlci5wcm90b3R5cGUucmVhZEludDMyID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHZhbHVlID0gdGhpcy5fYnVmZmVyLmdldEludDMyKHRoaXMuX29mZnNldCk7XHJcbiAgICB0aGlzLl9vZmZzZXQgKz0gNDtcclxuICAgIHJldHVybiB2YWx1ZTtcclxufTtcclxuXHJcblxyXG5CaW5hcnlSZWFkZXIucHJvdG90eXBlLnJlYWRVSW50MzIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9idWZmZXIuZ2V0VWludDMyKHRoaXMuX29mZnNldCk7XHJcbiAgICB0aGlzLl9vZmZzZXQgKz0gNDtcclxuICAgIHJldHVybiB2YWx1ZTtcclxufTtcclxuXHJcbkJpbmFyeVJlYWRlci5wcm90b3R5cGUuc2tpcEJ5dGVzID0gZnVuY3Rpb24gKGxlbmd0aCkge1xyXG4gICAgdGhpcy5fb2Zmc2V0ICs9IGxlbmd0aDtcclxufTtcclxuXHJcbkJpbmFyeVJlYWRlci5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX2J1ZmZlci5ieXRlTGVuZ3RoO1xyXG59O1xyXG5cclxuIiwidmFyIEVudGl0eSA9IHJlcXVpcmUoJy4vZW50aXR5Jyk7XHJcbnZhciBNYWluVUkgPSByZXF1aXJlKCcuL3VpL01haW5VSScpO1xyXG52YXIgQmluYXJ5UmVhZGVyID0gcmVxdWlyZSgnLi9CaW5hcnlSZWFkZXInKTtcclxuXHJcbmZ1bmN0aW9uIENsaWVudCgpIHtcclxuICAgIHRoaXMuU0VMRl9JRCA9IG51bGw7XHJcbiAgICB0aGlzLlNFTEZfUExBWUVSID0gbnVsbDtcclxuICAgIHRoaXMuVFJBSUwgPSBudWxsO1xyXG4gICAgdGhpcy51cGRhdGVzID0gW107XHJcblxyXG4gICAgdGhpcy5jdXJyUGluZyA9IDA7XHJcblxyXG4gICAgdGhpcy5pbml0KCk7XHJcbn1cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuaW5pdFNvY2tldCgpO1xyXG4gICAgdGhpcy5pbml0Q2FudmFzZXMoKTtcclxuICAgIHRoaXMuaW5pdExpc3RzKCk7XHJcbiAgICB0aGlzLmluaXRWaWV3ZXJzKCk7XHJcbn07XHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdFNvY2tldCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuc29ja2V0ID0gaW8oKTtcclxuICAgIHRoaXMuc29ja2V0LnZlcmlmaWVkID0gZmFsc2U7XHJcblxyXG4gICAgdGhpcy5zb2NrZXQub24oJ2luaXRWZXJpZmljYXRpb24nLCB0aGlzLnZlcmlmeS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICB0aGlzLnNvY2tldC5vbigndXBkYXRlRW50aXRpZXMnLCB0aGlzLmhhbmRsZVBhY2tldC5iaW5kKHRoaXMpKTtcclxuICAgIHRoaXMuc29ja2V0Lm9uKCd1cGRhdGVCaW5hcnknLCB0aGlzLmhhbmRsZUJpbmFyeS5iaW5kKHRoaXMpKTtcclxuICAgIHRoaXMuc29ja2V0Lm9uKCd1cGRhdGVMQicsIHRoaXMuaGFuZGxlVXBkYXRlTEIuYmluZCh0aGlzKSk7XHJcblxyXG5cclxuICAgIHRoaXMuc29ja2V0Lm9uKCdjaGF0TWVzc2FnZScsIHRoaXMubWFpblVJKTtcclxuICAgIHRoaXMuc29ja2V0Lm9uKCdwaW5nJywgdGhpcy5zZW5kUG9uZy5iaW5kKHRoaXMpKTtcclxuICAgIHRoaXMuc29ja2V0Lm9uKCdmaW5hbFBpbmcnLCBmdW5jdGlvbiAobWVzc2FnZSkge1xyXG4gICAgICAgIC8vY29uc29sZS5sb2coXCJQSU5HOiBcIiArIG1lc3NhZ2UpO1xyXG4gICAgICAgIHRoaXMuY3VyclBpbmcgPSBtZXNzYWdlO1xyXG4gICAgICAgIGlmICh0aGlzLmN1cnJQaW5nID4gOTAwMDApIHtcclxuICAgICAgICAgICAgdGhpcy5jdXJyUGluZyA9IDEwO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuXHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLnNlbmRQb25nID0gZnVuY3Rpb24gKG1lc3NhZ2UpIHtcclxuICAgIHRoaXMuc29ja2V0LmVtaXQoXCJwb25nMTIzXCIsIG1lc3NhZ2UpO1xyXG59O1xyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdENhbnZhc2VzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5tYWluQ2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtYWluX2NhbnZhc1wiKTtcclxuICAgIHRoaXMubWFpbkNhbnZhcy5zdHlsZS5ib3JkZXIgPSAnMXB4IHNvbGlkICMwMDAwMDAnO1xyXG4gICAgdGhpcy5tYWluQ2FudmFzLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgdGhpcy5tYWluQ3R4ID0gdGhpcy5tYWluQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuXHJcblxyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBpZiAoIXRoaXMuU0VMRl9JRCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciB4ID0gKChldmVudC54IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldFdpZHRoICogMTAwMCkgLSB0aGlzLm1haW5DYW52YXMud2lkdGggLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3I7XHJcbiAgICAgICAgdmFyIHkgPSAoKGV2ZW50LnkgLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0SGVpZ2h0ICogNTAwKSAtIHRoaXMubWFpbkNhbnZhcy5oZWlnaHQgLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3I7XHJcblxyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJzdGFydFNob290XCIsIHtcclxuICAgICAgICAgICAgaWQ6IHRoaXMuU0VMRl9JRCxcclxuICAgICAgICAgICAgeDogeCxcclxuICAgICAgICAgICAgeTogeVxyXG4gICAgICAgIH0pO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZXVwXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGlmICghdGhpcy5TRUxGX0lEKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHggPSAoKGV2ZW50LnggLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0V2lkdGggKiAxMDAwKSAtIHRoaXMubWFpbkNhbnZhcy53aWR0aCAvIDIpIC8gdGhpcy5zY2FsZUZhY3RvcjtcclxuICAgICAgICB2YXIgeSA9ICgoZXZlbnQueSAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRIZWlnaHQgKiA1MDApIC0gdGhpcy5tYWluQ2FudmFzLmhlaWdodCAvIDIpIC8gdGhpcy5zY2FsZUZhY3RvcjtcclxuXHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcImVuZFNob290XCIsIHtcclxuICAgICAgICAgICAgaWQ6IHRoaXMuU0VMRl9JRCxcclxuICAgICAgICB9KTtcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG5cclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLlNFTEZfUExBWUVSKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciB4ID0gKChldmVudC54IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldFdpZHRoICogMTAwMCkgLVxyXG4gICAgICAgICAgICB0aGlzLm1haW5DYW52YXMud2lkdGggLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3I7XHJcbiAgICAgICAgdmFyIHkgPSAoKGV2ZW50LnkgLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0SGVpZ2h0ICogNTAwKSAtXHJcbiAgICAgICAgICAgIHRoaXMubWFpbkNhbnZhcy5oZWlnaHQgLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3I7XHJcblxyXG4gICAgICAgIGlmIChzcXVhcmUoeCkgKyBzcXVhcmUoeSkgPiBzcXVhcmUodGhpcy5TRUxGX1BMQVlFUi5yYW5nZSkpIHsgLy9pZiBub3QgaW4gcmFuZ2VcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLnByZSkge1xyXG4gICAgICAgICAgICB0aGlzLnByZSA9IHt4OiB4LCB5OiB5fVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChzcXVhcmUodGhpcy5wcmUueCAtIHgpICsgc3F1YXJlKHRoaXMucHJlLnkgLSB5KSA+IDgwKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHJlID0ge3g6IHgsIHk6IHl9O1xyXG5cclxuICAgICAgICAgICAgaWYgKE1hdGguYWJzKHgpIDwgNTAgJiYgTWF0aC5hYnMoeSkgPCA1MCkge1xyXG4gICAgICAgICAgICAgICAgeCA9IDA7XHJcbiAgICAgICAgICAgICAgICB5ID0gMDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5zb2NrZXQuZW1pdCgnbW92ZScsIHtcclxuICAgICAgICAgICAgICAgIGlkOiB0aGlzLlNFTEZfSUQsXHJcbiAgICAgICAgICAgICAgICB4OiB4LFxyXG4gICAgICAgICAgICAgICAgeTogeVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuU0VMRl9QTEFZRVIuc2V0TW92ZSh4LCB5KTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG59O1xyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuc2VuZENpcmNsZSA9IGZ1bmN0aW9uIChjb25zdHJ1Y3QpIHtcclxuXHJcbiAgICB2YXIgcmFkaWlOb3JtYWwgPSBmdW5jdGlvbiAodmVjdG9yKSB7XHJcbiAgICAgICAgaWYgKCF2ZWN0b3IpIHtcclxuICAgICAgICAgICAgcmV0dXJuIDA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiAodmVjdG9yLnggKiB2ZWN0b3IueCArIHZlY3Rvci55ICogdmVjdG9yLnkpO1xyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgbWF4UmFkaXVzID0gTWF0aC5zcXJ0KE1hdGgubWF4KFxyXG4gICAgICAgIHJhZGlpTm9ybWFsKGNvbnN0cnVjdFswXSksXHJcbiAgICAgICAgcmFkaWlOb3JtYWwoY29uc3RydWN0WzFdKSxcclxuICAgICAgICByYWRpaU5vcm1hbChjb25zdHJ1Y3RbMl0pLFxyXG4gICAgICAgIHJhZGlpTm9ybWFsKGNvbnN0cnVjdFszXSkpKTtcclxuXHJcbiAgICBpZiAobWF4UmFkaXVzKSB7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcImNyZWF0ZUNpcmNsZVwiLCB7XHJcbiAgICAgICAgICAgIGlkOiB0aGlzLlNFTEZfSUQsXHJcbiAgICAgICAgICAgIHJhZGl1czogbWF4UmFkaXVzXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLmluaXRMaXN0cyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuUExBWUVSX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuVElMRV9MSVNUID0ge307XHJcbiAgICB0aGlzLlJPQ0tfTElTVCA9IHt9O1xyXG4gICAgdGhpcy5BU1RFUk9JRF9MSVNUID0ge307XHJcbiAgICB0aGlzLkFOSU1BVElPTl9MSVNUID0ge307XHJcbiAgICB0aGlzLlBMQVlFUl9BUlJBWSA9IFtdO1xyXG59O1xyXG5DbGllbnQucHJvdG90eXBlLmluaXRWaWV3ZXJzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5rZXlzID0gW107XHJcbiAgICB0aGlzLnNjYWxlRmFjdG9yID0gMTtcclxuICAgIHRoaXMubWFpblNjYWxlRmFjdG9yID0gMC41O1xyXG4gICAgdGhpcy5tYWluVUkgPSBuZXcgTWFpblVJKHRoaXMsIHRoaXMuc29ja2V0KTtcclxuICAgIHRoaXMubWFpblVJLnBsYXllck5hbWVyVUkub3BlbigpO1xyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS52ZXJpZnkgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgaWYgKCF0aGlzLnNvY2tldC52ZXJpZmllZCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiVkVSSUZJRUQgQ0xJRU5UXCIpO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJ2ZXJpZnlcIiwge30pO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LnZlcmlmaWVkID0gdHJ1ZTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5DbGllbnQucHJvdG90eXBlLmFwcGx5VXBkYXRlID0gZnVuY3Rpb24gKHJlYWRlcikge1xyXG4gICAgdmFyIGk7XHJcblxyXG4gICAgdmFyIHJvY2tMZW5ndGggPSByZWFkZXIucmVhZFVJbnQxNigpOyAvL2FkZCByb2Nrc1xyXG4gICAgZm9yIChpID0gMDsgaSA8IHJvY2tMZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHJvY2sgPSBuZXcgRW50aXR5LlJvY2socmVhZGVyLCB0aGlzKTtcclxuICAgICAgICB0aGlzLlJPQ0tfTElTVFtyb2NrLmlkXSA9IHJvY2s7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHBsYXllckxlbmd0aCA9IHJlYWRlci5yZWFkVUludDgoKTsgLy9hZGQgcGxheWVyc1xyXG4gICAgZm9yIChpID0gMDsgaSA8IHBsYXllckxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgcGxheWVyID0gbmV3IEVudGl0eS5QbGF5ZXIocmVhZGVyLCB0aGlzKTtcclxuICAgICAgICBpZiAocGxheWVyLmlkID09PSB0aGlzLlNFTEZfSUQpIHtcclxuICAgICAgICAgICAgdGhpcy5TRUxGX1BMQVlFUiA9IHBsYXllcjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5QTEFZRVJfTElTVFtwbGF5ZXIuaWRdID0gcGxheWVyO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5QTEFZRVJfQVJSQVkuaW5kZXhPZihwbGF5ZXIuaWQpID09PSAtMSkge1xyXG4gICAgICAgICAgICB0aGlzLlBMQVlFUl9BUlJBWS5wdXNoKHBsYXllci5pZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHZhciByb2NrMkxlbmd0aCA9IHJlYWRlci5yZWFkVUludDE2KCk7IC8vdXBkYXRlIHJvY2tzXHJcbiAgICBmb3IgKGkgPSAwOyBpIDwgcm9jazJMZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBpZCA9IHJlYWRlci5yZWFkVUludDMyKCk7XHJcbiAgICAgICAgcm9jayA9IHRoaXMuUk9DS19MSVNUW2lkXTtcclxuICAgICAgICBpZiAocm9jaykge1xyXG4gICAgICAgICAgICByb2NrLnVwZGF0ZShyZWFkZXIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJNQUtJTkcgTkVXIEZBS0UgUk9DSyBcIiArIGlkKTtcclxuXHJcbiAgICAgICAgICAgIHZhciBmYWtlUm9jayA9IG5ldyBFbnRpdHkuUm9jayhudWxsLCB0aGlzKTtcclxuICAgICAgICAgICAgZmFrZVJvY2sudXBkYXRlKHJlYWRlcik7XHJcblxyXG4gICAgICAgICAgICB0aGlzLlJPQ0tfTElTVFtpZF0gPSBmYWtlUm9jaztcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJnZXRSb2NrXCIsIHtcclxuICAgICAgICAgICAgICAgIGlkOiBpZFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIHZhciBwbGF5ZXIyTGVuZ3RoID0gcmVhZGVyLnJlYWRVSW50OCgpO1xyXG4gICAgLy9jb25zb2xlLmxvZyhcIlBMQVlFUiBVUERBVEUgTEVOR1RIOiBcIiArIHBsYXllcjJMZW5ndGgpO1xyXG4gICAgZm9yIChpID0gMDsgaSA8IHBsYXllcjJMZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGlkID0gcmVhZGVyLnJlYWRVSW50MzIoKTtcclxuICAgICAgICB2YXIgcGxheWVyID0gdGhpcy5QTEFZRVJfTElTVFtpZF07XHJcbiAgICAgICAgaWYgKHBsYXllcikge1xyXG4gICAgICAgICAgICBwbGF5ZXIudXBkYXRlKHJlYWRlcik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiTk8gUExBWUVSIEFEREVEOiBcIiArIGlkKTtcclxuICAgICAgICAgICAgdmFyIGZha2VQbGF5ZXIgPSBuZXcgRW50aXR5LlBsYXllcihudWxsLCB0aGlzKTtcclxuICAgICAgICAgICAgZmFrZVBsYXllci51cGRhdGUocmVhZGVyKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuUExBWUVSX0xJU1RbaWRdID0gZmFrZVBsYXllcjtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJnZXRQbGF5ZXJcIiwge1xyXG4gICAgICAgICAgICAgICAgaWQ6IGlkXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJFTUlUVElORyBHRVRQTEFZRVJcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHZhciByb2NrM0xlbmd0aCA9IHJlYWRlci5yZWFkVUludDE2KCk7IC8vZGVsZXRlIHJvY2tzXHJcbiAgICBmb3IgKGkgPSAwOyBpIDwgcm9jazNMZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGlkID0gcmVhZGVyLnJlYWRVSW50MzIoKTtcclxuICAgICAgICBkZWxldGUgdGhpcy5ST0NLX0xJU1RbaWRdO1xyXG5cclxuICAgICAgICAvL2NvbnNvbGUubG9nKFwiREVMRVRFRCBST0NLIE5PUk1BTExZOiBcIiArIGlkKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgcGxheWVyM0xlbmd0aCA9IHJlYWRlci5yZWFkVUludDgoKTtcclxuICAgIGZvciAoaSA9IDA7IGkgPCBwbGF5ZXIzTGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBpZCA9IHJlYWRlci5yZWFkVUludDMyKCk7XHJcblxyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiREVMRVRJTkcgUExBWUVSOiBcIiArIGlkKTtcclxuXHJcbiAgICAgICAgZGVsZXRlIHRoaXMuUExBWUVSX0xJU1RbaWRdO1xyXG4gICAgICAgIHZhciBpbmRleCA9IHRoaXMuUExBWUVSX0FSUkFZLmluZGV4T2YoaWQpO1xyXG4gICAgICAgIHRoaXMuUExBWUVSX0FSUkFZLnNwbGljZShpbmRleCwgMSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5oYW5kbGVCaW5hcnkgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgdmFyIHJlYWRlciA9IG5ldyBCaW5hcnlSZWFkZXIoZGF0YSk7XHJcbiAgICBpZiAocmVhZGVyLmxlbmd0aCgpIDwgMSkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHZhciBzdGVwID0gcmVhZGVyLnJlYWRVSW50MzIoKTtcclxuXHJcbiAgICBpZiAoIXRoaXMuaW5pdGlhbFN0ZXApIHtcclxuICAgICAgICB0aGlzLmluaXRpYWxTdGVwID0gc3RlcDtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHRoaXMuaW5pdGlhbFN0ZXAgPT09IHN0ZXApIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLmxhc3RTdGVwID0gc3RlcDtcclxuXHJcbiAgICAvL2NvbnNvbGUubG9nKFwiTEFTVCBTVEVQOiBcIiArIHN0ZXApO1xyXG5cclxuICAgIGlmICghdGhpcy5jdXJyU3RlcCkge1xyXG4gICAgICAgIHRoaXMuY3VyclN0ZXAgPSBzdGVwIC0gMztcclxuICAgIH1cclxuXHJcblxyXG4gICAgdGhpcy51cGRhdGVzLnB1c2goe1xyXG4gICAgICAgIHN0ZXA6IHN0ZXAsXHJcbiAgICAgICAgcmVhZGVyOiByZWFkZXJcclxuICAgIH0pO1xyXG59O1xyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaGFuZGxlVXBkYXRlTEIgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgdmFyIHJlYWRlciA9IG5ldyBCaW5hcnlSZWFkZXIoZGF0YSk7XHJcblxyXG4gICAgdmFyIGNvdW50ID0gcmVhZGVyLnJlYWRVSW50OCgpO1xyXG4gICAgdmFyIGlkO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XHJcbiAgICAgICAgaWQgPSByZWFkZXIucmVhZFVJbnQzMigpO1xyXG4gICAgICAgIHZhciBwbGF5ZXIgPSB0aGlzLlBMQVlFUl9MSVNUW2lkXTtcclxuICAgICAgICB2YXIgcmFkaXVzID0gcmVhZGVyLnJlYWRVSW50MTYoKTtcclxuXHJcbiAgICAgICAgdmFyIG5hbWVMZW5ndGggPSByZWFkZXIucmVhZFVJbnQ4KCk7XHJcbiAgICAgICAgdmFyIG5hbWUgPSBcIlwiO1xyXG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbmFtZUxlbmd0aDsgaisrKSB7XHJcbiAgICAgICAgICAgIHZhciBjaGFyID0gU3RyaW5nLmZyb21DaGFyQ29kZShyZWFkZXIucmVhZFVJbnQ4KCkpO1xyXG4gICAgICAgICAgICBuYW1lICs9IGNoYXI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghcGxheWVyKSB7XHJcbiAgICAgICAgICAgIHBsYXllciA9IG5ldyBFbnRpdHkuUGxheWVyKG51bGwsIHRoaXMpO1xyXG4gICAgICAgICAgICBwbGF5ZXIuaWQgPSBpZDtcclxuICAgICAgICAgICAgcGxheWVyLnJhZGl1cyA9IHJhZGl1cztcclxuICAgICAgICAgICAgcGxheWVyLm5hbWUgPSBuYW1lO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5QTEFZRVJfTElTVFtwbGF5ZXIuaWRdID0gcGxheWVyO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuUExBWUVSX0FSUkFZLmluZGV4T2YocGxheWVyLmlkKSA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuUExBWUVSX0FSUkFZLnB1c2gocGxheWVyLmlkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBwbGF5ZXIuZmFrZSA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxufTtcclxuXHJcblxyXG5DbGllbnQucHJvdG90eXBlLmhhbmRsZVBhY2tldCA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICB2YXIgcGFja2V0LCBpO1xyXG4gICAgZm9yIChpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBwYWNrZXQgPSBkYXRhW2ldO1xyXG4gICAgICAgIHN3aXRjaCAocGFja2V0Lm1hc3Rlcikge1xyXG4gICAgICAgICAgICBjYXNlIFwiYWRkXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFkZEVudGl0aWVzKHBhY2tldCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5hZGRFbnRpdGllcyA9IGZ1bmN0aW9uIChwYWNrZXQpIHtcclxuICAgIHZhciBhZGRFbnRpdHkgPSBmdW5jdGlvbiAocGFja2V0LCBsaXN0LCBlbnRpdHksIGFycmF5KSB7XHJcbiAgICAgICAgaWYgKCFwYWNrZXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsaXN0W3BhY2tldC5pZF0gPSBuZXcgZW50aXR5KHBhY2tldCwgdGhpcyk7XHJcbiAgICAgICAgaWYgKGFycmF5ICYmIGFycmF5LmluZGV4T2YocGFja2V0LmlkKSA9PT0gLTEpIHtcclxuICAgICAgICAgICAgYXJyYXkucHVzaChwYWNrZXQuaWQpO1xyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKTtcclxuXHJcbiAgICBzd2l0Y2ggKHBhY2tldC5jbGFzcykge1xyXG4gICAgICAgIGNhc2UgXCJ0aWxlSW5mb1wiOlxyXG4gICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLlRJTEVfTElTVCwgRW50aXR5LlRpbGUpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkFEREVEIFRJTEVcIik7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJzZWxmSWRcIjpcclxuICAgICAgICAgICAgaWYgKCF0aGlzLlNFTEZfSUQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuU0VMRl9JRCA9IHBhY2tldC5zZWxmSWQ7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW5VSS5nYW1lVUkub3BlbigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJjaGF0SW5mb1wiOlxyXG4gICAgICAgICAgICB0aGlzLm1haW5VSS5nYW1lVUkuY2hhdFVJLmFkZE1lc3NhZ2UocGFja2V0KTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5kcmF3U2NlbmUgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgdGhpcy5tYWluVUkudXBkYXRlTGVhZGVyQm9hcmQoKTtcclxuXHJcbiAgICB2YXIgaWQ7XHJcbiAgICB2YXIgZW50aXR5TGlzdCA9IFtcclxuICAgICAgICB0aGlzLlRJTEVfTElTVCxcclxuICAgICAgICB0aGlzLlBMQVlFUl9MSVNULFxyXG4gICAgICAgIHRoaXMuQVNURVJPSURfTElTVCxcclxuICAgICAgICB0aGlzLkFOSU1BVElPTl9MSVNULFxyXG4gICAgICAgIHRoaXMuUk9DS19MSVNUXHJcbiAgICBdO1xyXG5cclxuICAgIHZhciBpbkJvdW5kcyA9IGZ1bmN0aW9uIChwbGF5ZXIsIHgsIHkpIHtcclxuICAgICAgICB2YXIgcmFuZ2UgPSB0aGlzLm1haW5DYW52YXMud2lkdGggLyAoMC43ICogdGhpcy5zY2FsZUZhY3Rvcik7XHJcbiAgICAgICAgcmV0dXJuIHggPCAocGxheWVyLnggKyByYW5nZSkgJiYgeCA+IChwbGF5ZXIueCAtIHJhbmdlKVxyXG4gICAgICAgICAgICAmJiB5IDwgKHBsYXllci55ICsgcmFuZ2UpICYmIHkgPiAocGxheWVyLnkgLSByYW5nZSk7XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcblxyXG4gICAgdmFyIHRyYW5zbGF0ZVNjZW5lID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMubWFpbkN0eC5zZXRUcmFuc2Zvcm0oMSwgMCwgMCwgMSwgMCwgMCk7XHJcbiAgICAgICAgdGhpcy5zY2FsZUZhY3RvciA9IGxlcnAodGhpcy5zY2FsZUZhY3RvciwgdGhpcy5tYWluU2NhbGVGYWN0b3IsIDAuMyk7XHJcbiAgICAgICAgdGhpcy5tYWluQ3R4LnRyYW5zbGF0ZSh0aGlzLm1haW5DYW52YXMud2lkdGggLyAyLCB0aGlzLm1haW5DYW52YXMuaGVpZ2h0IC8gMik7XHJcbiAgICAgICAgdGhpcy5tYWluQ3R4LnNjYWxlKHRoaXMuc2NhbGVGYWN0b3IsIHRoaXMuc2NhbGVGYWN0b3IpO1xyXG4gICAgICAgIHRoaXMubWFpbkN0eC50cmFuc2xhdGUoLXRoaXMuU0VMRl9QTEFZRVIueCwgLXRoaXMuU0VMRl9QTEFZRVIueSk7XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcblxyXG5cclxuICAgIHRoaXMuU0VMRl9QTEFZRVIudGljaygpO1xyXG5cclxuXHJcbiAgICB0cmFuc2xhdGVTY2VuZSgpO1xyXG4gICAgdGhpcy5tYWluQ3R4LmNsZWFyUmVjdCgwLCAwLCA1MDAwMCwgNTAwMDApO1xyXG5cclxuICAgIHRoaXMubWFpbkN0eC5maWxsU3R5bGUgPSBcIiMxZDFmMjFcIjtcclxuICAgIHRoaXMubWFpbkN0eC5maWxsUmVjdCgwLCAwLCA1MDAwMCwgNTAwMDApO1xyXG5cclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVudGl0eUxpc3QubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgbGlzdCA9IGVudGl0eUxpc3RbaV07XHJcbiAgICAgICAgZm9yIChpZCBpbiBsaXN0KSB7XHJcbiAgICAgICAgICAgIHZhciBlbnRpdHkgPSBsaXN0W2lkXTtcclxuICAgICAgICAgICAgaWYgKGluQm91bmRzKHRoaXMuU0VMRl9QTEFZRVIsIGVudGl0eS54LCBlbnRpdHkueSkpIHtcclxuICAgICAgICAgICAgICAgIGVudGl0eS5zaG93KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5UUkFJTCAmJiAhdGhpcy5hY3RpdmUpIHtcclxuICAgICAgICB0aGlzLlRSQUlMLnNob3coKTtcclxuICAgIH1cclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUuY2xpZW50VXBkYXRlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy51cGRhdGVTdGVwKCk7XHJcblxyXG5cclxuICAgIGlmICghdGhpcy5TRUxGX1BMQVlFUikge1xyXG4gICAgICAgIGlmICh0aGlzLlNFTEZfSUQpIHtcclxuICAgICAgICAgICAgdGhpcy5TRUxGX1BMQVlFUiA9IHRoaXMuUExBWUVSX0xJU1RbdGhpcy5TRUxGX0lEXTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHRoaXMuZHJhd1NjZW5lKCk7XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLnVwZGF0ZVN0ZXAgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgc3RlcFJhbmdlID0gdGhpcy5sYXN0U3RlcCAtIHRoaXMuY3VyclN0ZXA7XHJcbiAgICB2YXIgdXBkYXRlO1xyXG5cclxuICAgIGlmICghc3RlcFJhbmdlKSB7XHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIlNURVAgUkFOR0UgVE9PIFNNQUxMOiBTRVJWRVIgVE9PIFNMT1dcIik7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLmN1cnJTdGVwIDwgdGhpcy5pbml0aWFsU3RlcCkge1xyXG4gICAgICAgIHRoaXMuY3VyclN0ZXAgKz0gMTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5jdXJyU3RlcCA+IHRoaXMubGFzdFN0ZXApIHtcclxuICAgICAgICAvL2NvbnNvbGUubG9nKFwiU1RFUCBSQU5HRSBUT08gU01BTEw6IFNFUlZFUiBUT08gU0xPV1wiKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgd2hpbGUgKHRoaXMubGFzdFN0ZXAgLSB0aGlzLmN1cnJTdGVwID4gNSArIHRoaXMuY3VyclBpbmcgLyA1MCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiU1RFUCBSQU5HRSBUT08gTEFSR0U6IENMSUVOVCBJUyBUT08gU0xPVyBGT1IgU1RFUDogXCIgKyB0aGlzLmN1cnJTdGVwKTtcclxuICAgICAgICB1cGRhdGUgPSB0aGlzLmZpbmRVcGRhdGVQYWNrZXQodGhpcy5jdXJyU3RlcCk7XHJcbiAgICAgICAgaWYgKCF1cGRhdGUpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJVUERBVEUgTk9UIEZPVU5EISEhIVwiKTtcclxuICAgICAgICAgICAgdGhpcy5jdXJyU3RlcCArPSAxO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh1cGRhdGUucmVhZGVyLl9vZmZzZXQgPiAxMCkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIk9GRlNFVCBJUyBUT08gTEFSR0VcIik7XHJcbiAgICAgICAgICAgIHRoaXMuY3VyclN0ZXAgKz0gMTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5hcHBseVVwZGF0ZSh1cGRhdGUucmVhZGVyKTtcclxuICAgICAgICB0aGlzLmN1cnJTdGVwICs9IDE7XHJcbiAgICB9IC8vdG9vIHNsb3dcclxuXHJcbiAgICB1cGRhdGUgPSB0aGlzLmZpbmRVcGRhdGVQYWNrZXQodGhpcy5jdXJyU3RlcCk7XHJcbiAgICBpZiAoIXVwZGF0ZSkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQ0FOTk9UIEZJTkQgVVBEQVRFIEZPUiBTVEVQOiBcIiArIHRoaXMuY3VyclN0ZXApO1xyXG4gICAgICAgIHRoaXMuY3VyclN0ZXAgKz0gMTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBpZiAodXBkYXRlLnJlYWRlci5fb2Zmc2V0ID4gMTApIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIk9GRlNFVCBJUyBUT08gTEFSR0UgRk9SIFNURVA6IFwiICsgdGhpcy5jdXJyU3RlcCk7XHJcbiAgICAgICAgY29uc29sZS5sb2codGhpcy51cGRhdGVzWzBdKTtcclxuICAgICAgICB0aGlzLmN1cnJTdGVwICs9IDE7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5hcHBseVVwZGF0ZSh1cGRhdGUucmVhZGVyKTtcclxuICAgIHRoaXMuY3VyclN0ZXAgKz0gMTtcclxufTtcclxuXHJcblxyXG5DbGllbnQucHJvdG90eXBlLmZpbmRVcGRhdGVQYWNrZXQgPSBmdW5jdGlvbiAoc3RlcCkge1xyXG4gICAgdmFyIGxlbmd0aCA9IHRoaXMudXBkYXRlcy5sZW5ndGg7XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IGxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcbiAgICAgICAgdmFyIHVwZGF0ZSA9IHRoaXMudXBkYXRlc1tpXTtcclxuXHJcbiAgICAgICAgaWYgKHVwZGF0ZS5zdGVwID09PSBzdGVwKSB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlcy5zcGxpY2UoMCwgaSk7XHJcbiAgICAgICAgICAgIHJldHVybiB1cGRhdGU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29uc29sZS5sb2coJ0NPVUxEIE5PVCBGSU5EIFBBQ0tFVCBGT1IgU1RFUDogJyArIHN0ZXApO1xyXG4gICAgY29uc29sZS5sb2codGhpcy51cGRhdGVzWzBdKTtcclxuICAgIGNvbnNvbGUubG9nKHRoaXMudXBkYXRlc1sxXSk7XHJcbiAgICBjb25zb2xlLmxvZyh0aGlzLnVwZGF0ZXNbMl0pO1xyXG5cclxuXHJcbiAgICByZXR1cm4gbnVsbDtcclxufTtcclxuXHJcblxyXG5DbGllbnQucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgc2V0SW50ZXJ2YWwodGhpcy5jbGllbnRVcGRhdGUuYmluZCh0aGlzKSwgMTAwMCAvIDI4KTtcclxufTtcclxuXHJcbmZ1bmN0aW9uIGxlcnAoYSwgYiwgcmF0aW8pIHtcclxuICAgIHJldHVybiBhICsgcmF0aW8gKiAoYiAtIGEpO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gc3F1YXJlKGEpIHtcclxuICAgIHJldHVybiBhICogYTtcclxufVxyXG5cclxuZnVuY3Rpb24gdmVjdG9yTm9ybWFsKGEpIHtcclxuICAgIHJldHVybiBhLnggKiBhLnggKyBhLnkgKiBhLnk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ2xpZW50OyIsImZ1bmN0aW9uIEFuaW1hdGlvbihhbmltYXRpb25JbmZvLCBjbGllbnQpIHtcclxuXHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxuICAgIHRoaXMudHlwZSA9IGFuaW1hdGlvbkluZm8udHlwZTtcclxuICAgIHRoaXMuaWQgPSBhbmltYXRpb25JbmZvLmlkO1xyXG4gICAgdGhpcy54ID0gYW5pbWF0aW9uSW5mby54O1xyXG4gICAgdGhpcy55ID0gYW5pbWF0aW9uSW5mby55O1xyXG4gICAgLy90aGlzLnRoZXRhID0gMTU7XHJcbiAgICB0aGlzLnRpbWVyID0gZ2V0UmFuZG9tKDEwLCAxNCk7XHJcblxyXG4gICAgaWYgKHRoaXMudHlwZSA9PT0gXCJzbGFzaFwiKSB7XHJcbiAgICAgICAgdGhpcy5zbGFzaElkID0gYW5pbWF0aW9uSW5mby5zbGFzaElkO1xyXG4gICAgICAgIHZhciBzbGFzaCA9IHRoaXMuY2xpZW50LmZpbmRTbGFzaCh0aGlzLnNsYXNoSWQpO1xyXG4gICAgICAgIHRoaXMucHJlID0gc2xhc2hbMF07XHJcbiAgICAgICAgdGhpcy5wb3N0ID0gc2xhc2hbMV07XHJcbiAgICB9XHJcbn1cclxuXHJcblxyXG5BbmltYXRpb24ucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgY3R4ID0gdGhpcy5jbGllbnQubWFpbkN0eDtcclxuICAgIHZhciBwbGF5ZXIgPSB0aGlzLmNsaWVudC5TRUxGX1BMQVlFUjtcclxuXHJcbiAgICBpZiAodGhpcy50eXBlID09PSBcInNsYXNoXCIgJiYgcGxheWVyKSB7XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG5cclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoMjQyLCAzMSwgNjYsIDAuNilcIjtcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gMTU7XHJcblxyXG4gICAgICAgIGN0eC5tb3ZlVG8ocGxheWVyLnggKyB0aGlzLnByZS54LCBwbGF5ZXIueSArIHRoaXMucHJlLnkpO1xyXG4gICAgICAgIGN0eC5saW5lVG8ocGxheWVyLnggKyB0aGlzLnBvc3QueCwgcGxheWVyLnkgKyB0aGlzLnBvc3QueSk7XHJcblxyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcbiAgICB9XHJcbiAgICBcclxuXHJcbiAgICBpZiAodGhpcy50eXBlID09PSBcInNoYXJkRGVhdGhcIikgeyAvL2RlcHJlY2F0ZWQgYnV0IGNvdWxkIHB1bGwgc29tZSBnb29kIGNvZGUgZnJvbSBoZXJlXHJcbiAgICAgICAgY3R4LmZvbnQgPSA2MCAtIHRoaXMudGltZXIgKyBcInB4IEFyaWFsXCI7XHJcbiAgICAgICAgY3R4LnNhdmUoKTtcclxuICAgICAgICBjdHgudHJhbnNsYXRlKHRoaXMueCwgdGhpcy55KTtcclxuICAgICAgICBjdHgucm90YXRlKC1NYXRoLlBJIC8gNTAgKiB0aGlzLnRoZXRhKTtcclxuICAgICAgICBjdHgudGV4dEFsaWduID0gXCJjZW50ZXJcIjtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDI1NSwgMTY4LCA4NiwgXCIgKyB0aGlzLnRpbWVyICogMTAgLyAxMDAgKyBcIilcIjtcclxuICAgICAgICBjdHguZmlsbFRleHQodGhpcy5uYW1lLCAwLCAxNSk7XHJcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcclxuXHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiIzAwMDAwMFwiO1xyXG4gICAgICAgIHRoaXMudGhldGEgPSBsZXJwKHRoaXMudGhldGEsIDAsIDAuMDgpO1xyXG4gICAgICAgIHRoaXMueCA9IGxlcnAodGhpcy54LCB0aGlzLmVuZFgsIDAuMSk7XHJcbiAgICAgICAgdGhpcy55ID0gbGVycCh0aGlzLnksIHRoaXMuZW5kWSwgMC4xKTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgdGhpcy50aW1lci0tO1xyXG4gICAgaWYgKHRoaXMudGltZXIgPD0gMCkge1xyXG4gICAgICAgIGRlbGV0ZSB0aGlzLmNsaWVudC5BTklNQVRJT05fTElTVFt0aGlzLmlkXTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5mdW5jdGlvbiBnZXRSYW5kb20obWluLCBtYXgpIHtcclxuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikgKyBtaW47XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxlcnAoYSwgYiwgcmF0aW8pIHtcclxuICAgIHJldHVybiBhICsgcmF0aW8gKiAoYiAtIGEpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEFuaW1hdGlvbjtcclxuXHJcblxyXG4iLCJmdW5jdGlvbiBNaW5pTWFwKCkgeyAvL2RlcHJlY2F0ZWQsIHBsZWFzZSB1cGRhdGVcclxufVxyXG5cclxuTWluaU1hcC5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmIChtYXBUaW1lciA8PSAwIHx8IHNlcnZlck1hcCA9PT0gbnVsbCkge1xyXG4gICAgICAgIHZhciB0aWxlTGVuZ3RoID0gTWF0aC5zcXJ0KE9iamVjdC5zaXplKFRJTEVfTElTVCkpO1xyXG4gICAgICAgIGlmICh0aWxlTGVuZ3RoID09PSAwIHx8ICFzZWxmUGxheWVyKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGltZ0RhdGEgPSBtYWluQ3R4LmNyZWF0ZUltYWdlRGF0YSh0aWxlTGVuZ3RoLCB0aWxlTGVuZ3RoKTtcclxuICAgICAgICB2YXIgdGlsZTtcclxuICAgICAgICB2YXIgdGlsZVJHQjtcclxuICAgICAgICB2YXIgaSA9IDA7XHJcblxyXG5cclxuICAgICAgICBmb3IgKHZhciBpZCBpbiBUSUxFX0xJU1QpIHtcclxuICAgICAgICAgICAgdGlsZVJHQiA9IHt9O1xyXG4gICAgICAgICAgICB0aWxlID0gVElMRV9MSVNUW2lkXTtcclxuICAgICAgICAgICAgaWYgKHRpbGUuY29sb3IgJiYgdGlsZS5hbGVydCB8fCBpbkJvdW5kcyhzZWxmUGxheWVyLCB0aWxlLngsIHRpbGUueSkpIHtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuciA9IHRpbGUuY29sb3IucjtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuZyA9IHRpbGUuY29sb3IuZztcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuYiA9IHRpbGUuY29sb3IuYjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuciA9IDA7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLmcgPSAwO1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5iID0gMDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2ldID0gdGlsZVJHQi5yO1xyXG4gICAgICAgICAgICBpbWdEYXRhLmRhdGFbaSArIDFdID0gdGlsZVJHQi5nO1xyXG4gICAgICAgICAgICBpbWdEYXRhLmRhdGFbaSArIDJdID0gdGlsZVJHQi5iO1xyXG4gICAgICAgICAgICBpbWdEYXRhLmRhdGFbaSArIDNdID0gMjU1O1xyXG4gICAgICAgICAgICBpICs9IDQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnNvbGUubG9nKDQwMCAvIE9iamVjdC5zaXplKFRJTEVfTElTVCkpO1xyXG4gICAgICAgIGltZ0RhdGEgPSBzY2FsZUltYWdlRGF0YShpbWdEYXRhLCBNYXRoLmZsb29yKDQwMCAvIE9iamVjdC5zaXplKFRJTEVfTElTVCkpLCBtYWluQ3R4KTtcclxuXHJcbiAgICAgICAgbU1hcEN0eC5wdXRJbWFnZURhdGEoaW1nRGF0YSwgMCwgMCk7XHJcblxyXG4gICAgICAgIG1NYXBDdHhSb3Qucm90YXRlKDkwICogTWF0aC5QSSAvIDE4MCk7XHJcbiAgICAgICAgbU1hcEN0eFJvdC5zY2FsZSgxLCAtMSk7XHJcbiAgICAgICAgbU1hcEN0eFJvdC5kcmF3SW1hZ2UobU1hcCwgMCwgMCk7XHJcbiAgICAgICAgbU1hcEN0eFJvdC5zY2FsZSgxLCAtMSk7XHJcbiAgICAgICAgbU1hcEN0eFJvdC5yb3RhdGUoMjcwICogTWF0aC5QSSAvIDE4MCk7XHJcblxyXG4gICAgICAgIHNlcnZlck1hcCA9IG1NYXBSb3Q7XHJcbiAgICAgICAgbWFwVGltZXIgPSAyNTtcclxuICAgIH1cclxuXHJcbiAgICBlbHNlIHtcclxuICAgICAgICBtYXBUaW1lciAtPSAxO1xyXG4gICAgfVxyXG5cclxuICAgIG1haW5DdHguZHJhd0ltYWdlKHNlcnZlck1hcCwgODAwLCA0MDApO1xyXG59OyAvL2RlcHJlY2F0ZWRcclxuXHJcbk1pbmlNYXAucHJvdG90eXBlLnNjYWxlSW1hZ2VEYXRhID0gZnVuY3Rpb24gKGltYWdlRGF0YSwgc2NhbGUsIG1haW5DdHgpIHtcclxuICAgIHZhciBzY2FsZWQgPSBtYWluQ3R4LmNyZWF0ZUltYWdlRGF0YShpbWFnZURhdGEud2lkdGggKiBzY2FsZSwgaW1hZ2VEYXRhLmhlaWdodCAqIHNjYWxlKTtcclxuICAgIHZhciBzdWJMaW5lID0gbWFpbkN0eC5jcmVhdGVJbWFnZURhdGEoc2NhbGUsIDEpLmRhdGE7XHJcbiAgICBmb3IgKHZhciByb3cgPSAwOyByb3cgPCBpbWFnZURhdGEuaGVpZ2h0OyByb3crKykge1xyXG4gICAgICAgIGZvciAodmFyIGNvbCA9IDA7IGNvbCA8IGltYWdlRGF0YS53aWR0aDsgY29sKyspIHtcclxuICAgICAgICAgICAgdmFyIHNvdXJjZVBpeGVsID0gaW1hZ2VEYXRhLmRhdGEuc3ViYXJyYXkoXHJcbiAgICAgICAgICAgICAgICAocm93ICogaW1hZ2VEYXRhLndpZHRoICsgY29sKSAqIDQsXHJcbiAgICAgICAgICAgICAgICAocm93ICogaW1hZ2VEYXRhLndpZHRoICsgY29sKSAqIDQgKyA0XHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGZvciAodmFyIHggPSAwOyB4IDwgc2NhbGU7IHgrKykgc3ViTGluZS5zZXQoc291cmNlUGl4ZWwsIHggKiA0KVxyXG4gICAgICAgICAgICBmb3IgKHZhciB5ID0gMDsgeSA8IHNjYWxlOyB5KyspIHtcclxuICAgICAgICAgICAgICAgIHZhciBkZXN0Um93ID0gcm93ICogc2NhbGUgKyB5O1xyXG4gICAgICAgICAgICAgICAgdmFyIGRlc3RDb2wgPSBjb2wgKiBzY2FsZTtcclxuICAgICAgICAgICAgICAgIHNjYWxlZC5kYXRhLnNldChzdWJMaW5lLCAoZGVzdFJvdyAqIHNjYWxlZC53aWR0aCArIGRlc3RDb2wpICogNClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gc2NhbGVkO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNaW5pTWFwOyIsImZ1bmN0aW9uIFBsYXllcihyZWFkZXIsIGNsaWVudCkge1xyXG4gICAgaWYgKCFyZWFkZXIpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIk1BS0lORyBORVcgRkFLRSBQTEFZRVJcIik7XHJcbiAgICAgICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbiAgICAgICAgcmV0dXJuOyAvL2ZvciBmYWtlIHJvY2sgcHVycG9zZXNcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmlkID0gcmVhZGVyLnJlYWRVSW50MzIoKTsgLy9wbGF5ZXIgaWRcclxuICAgIHRoaXMueCA9IHJlYWRlci5yZWFkVUludDMyKCkgLyAxMDA7IC8vcmVhbCB4XHJcbiAgICB0aGlzLnkgPSByZWFkZXIucmVhZFVJbnQzMigpIC8gMTAwOyAvL3JlYWwgeVxyXG5cclxuICAgIHRoaXMucmFkaXVzID0gcmVhZGVyLnJlYWRVSW50MTYoKTsgLy9yYWRpdXNcclxuXHJcbiAgICB2YXIgbmFtZUxlbmd0aCA9IHJlYWRlci5yZWFkVUludDgoKTtcclxuICAgIHZhciBuYW1lID0gXCJcIjtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5hbWVMZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBjaGFyID0gU3RyaW5nLmZyb21DaGFyQ29kZShyZWFkZXIucmVhZFVJbnQ4KCkpO1xyXG4gICAgICAgIG5hbWUgKz0gY2hhcjtcclxuICAgIH1cclxuICAgIHRoaXMubmFtZSA9IG5hbWU7XHJcblxyXG4gICAgdGhpcy52ZXJ0aWNlcyA9IFtdOyAgICAgICAgICAgIC8vdmVydGljZXNcclxuICAgIHZhciBjb3VudCA9IHJlYWRlci5yZWFkVUludDgoKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xyXG4gICAgICAgIHRoaXMudmVydGljZXNbaV0gPSBbXTtcclxuICAgICAgICB0aGlzLnZlcnRpY2VzW2ldWzBdID0gcmVhZGVyLnJlYWRJbnQxNigpIC8gMTAwMDtcclxuICAgICAgICB0aGlzLnZlcnRpY2VzW2ldWzFdID0gcmVhZGVyLnJlYWRJbnQxNigpIC8gMTAwMDtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmhlYWx0aCA9IHJlYWRlci5yZWFkVUludDE2KCk7IC8vaGVhbHRoXHJcbiAgICB0aGlzLm1heEhlYWx0aCA9IHJlYWRlci5yZWFkVUludDE2KCk7IC8vbWF4SGVhbHRoXHJcblxyXG4gICAgdGhpcy50aGV0YSA9IHJlYWRlci5yZWFkSW50MTYoKSAvIDEwMDsgLy90aGV0YVxyXG4gICAgdGhpcy5sZXZlbCA9IHJlYWRlci5yZWFkVUludDgoKTsgLy9sZXZlbFxyXG5cclxuXHJcbiAgICBzd2l0Y2ggKHJlYWRlci5yZWFkVUludDgoKSkgeyAgICAvL2ZsYWdzXHJcbiAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICB0aGlzLnZ1bG5lcmFibGUgPSB0cnVlO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDE2OlxyXG4gICAgICAgICAgICB0aGlzLnNob290aW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAxNzpcclxuICAgICAgICAgICAgdGhpcy52dWxuZXJhYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5zaG9vdGluZyA9IHRydWU7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG5cclxuICAgIGlmICghdGhpcy5jbGllbnQuU0VMRl9QTEFZRVIgJiYgdGhpcy5pZCA9PT0gdGhpcy5jbGllbnQuU0VMRl9JRCkge1xyXG4gICAgICAgIHRoaXMuY2xpZW50LlNFTEZfUExBWUVSID0gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLm1vdmVyID0ge1xyXG4gICAgICAgIHg6IDAsXHJcbiAgICAgICAgeTogMFxyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLnJlYWxNb3ZlciA9IHtcclxuICAgICAgICB4OiAwLFxyXG4gICAgICAgIHk6IDBcclxuICAgIH07XHJcbn1cclxuXHJcblxyXG5QbGF5ZXIucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIChyZWFkZXIpIHtcclxuICAgIHRoaXMudXBkYXRlVGltZXIgPSA1MDtcclxuICAgIHRoaXMueCA9IHJlYWRlci5yZWFkVUludDMyKCkgLyAxMDA7IC8vcmVhbCB4XHJcbiAgICB0aGlzLnkgPSByZWFkZXIucmVhZFVJbnQzMigpIC8gMTAwOyAvL3JlYWwgeVxyXG5cclxuICAgIHRoaXMucmVhbFJhZGl1cyA9IHJlYWRlci5yZWFkVUludDE2KCk7IC8vcmFkaXVzXHJcblxyXG4gICAgaWYgKHRoaXMuaWQgPT09IHRoaXMuY2xpZW50LlNFTEZfSUQpIHtcclxuICAgICAgICAvL3RoaXMuY2xpZW50Lm1haW5TY2FsZUZhY3RvciA9IDUwIC8gdGhpcy5yZWFsUmFkaXVzO1xyXG4gICAgfVxyXG4gICAgdGhpcy5oZWFsdGggPSByZWFkZXIucmVhZFVJbnQxNigpOyAvL2hlYWx0aFxyXG4gICAgdGhpcy5tYXhIZWFsdGggPSByZWFkZXIucmVhZFVJbnQxNigpOyAvL21heEhlYWx0aFxyXG5cclxuICAgIHRoaXMuc2hvb3RNZXRlciA9IHJlYWRlci5yZWFkVUludDgoKTtcclxuXHJcbiAgICB0aGlzLnRoZXRhID0gcmVhZGVyLnJlYWRJbnQxNigpIC8gMTAwOyAvL3RoZXRhXHJcbiAgICB0aGlzLmxldmVsID0gcmVhZGVyLnJlYWRVSW50OCgpOyAvL2xldmVsXHJcblxyXG4gICAgdGhpcy52dWxuZXJhYmxlID0gZmFsc2U7XHJcbiAgICB0aGlzLnNob290aW5nID0gZmFsc2U7XHJcbiAgICBzd2l0Y2ggKHJlYWRlci5yZWFkVUludDgoKSkgeyAgICAvL2ZsYWdzXHJcbiAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICB0aGlzLnZ1bG5lcmFibGUgPSB0cnVlO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDE2OlxyXG4gICAgICAgICAgICB0aGlzLnNob290aW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAxNzpcclxuICAgICAgICAgICAgdGhpcy52dWxuZXJhYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5zaG9vdGluZyA9IHRydWU7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG5cclxufTtcclxuXHJcblxyXG5QbGF5ZXIucHJvdG90eXBlLnRpY2sgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBpZiAodGhpcy5yZWFsTW92ZXIpIHtcclxuICAgICAgICB0aGlzLm1vdmVyLnggPSBsZXJwKHRoaXMubW92ZXIueCwgdGhpcy5yZWFsTW92ZXIueCwgMC4xNSk7XHJcbiAgICAgICAgdGhpcy5tb3Zlci55ID0gbGVycCh0aGlzLm1vdmVyLnksIHRoaXMucmVhbE1vdmVyLnksIDAuMTUpO1xyXG4gICAgfVxyXG4gICAgLy90aGlzLm1vdmUodGhpcy5tb3Zlci54LCB0aGlzLm1vdmVyLnkpO1xyXG59O1xyXG5cclxuXHJcblBsYXllci5wcm90b3R5cGUuc2V0TW92ZSA9IGZ1bmN0aW9uICh4LCB5KSB7XHJcbiAgICB0aGlzLnJlYWxNb3ZlciA9IHtcclxuICAgICAgICB4OiB4LFxyXG4gICAgICAgIHk6IHlcclxuICAgIH07XHJcbn07XHJcblxyXG5cclxuUGxheWVyLnByb3RvdHlwZS5nZXRUaGV0YSA9IGZ1bmN0aW9uICh0YXJnZXQsIG9yaWdpbikge1xyXG4gICAgdGhpcy50aGV0YSA9IE1hdGguYXRhbjIodGFyZ2V0LnkgLSBvcmlnaW4ueSwgdGFyZ2V0LnggLSBvcmlnaW4ueCkgJSAoMiAqIE1hdGguUEkpO1xyXG59O1xyXG5cclxuUGxheWVyLnByb3RvdHlwZS5tb3ZlID0gZnVuY3Rpb24gKHgsIHkpIHtcclxuICAgIHZhciB0YXJnZXQgPSB7XHJcbiAgICAgICAgeDogdGhpcy54ICsgeCxcclxuICAgICAgICB5OiB0aGlzLnkgKyB5XHJcbiAgICB9O1xyXG4gICAgdmFyIG9yaWdpbiA9IHtcclxuICAgICAgICB4OiB0aGlzLngsXHJcbiAgICAgICAgeTogdGhpcy55XHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuZ2V0VGhldGEodGFyZ2V0LCBvcmlnaW4pO1xyXG5cclxuXHJcbiAgICB2YXIgbm9ybWFsVmVsID0gbm9ybWFsKHgsIHkpO1xyXG4gICAgaWYgKG5vcm1hbFZlbCA8IDEpIHtcclxuICAgICAgICBub3JtYWxWZWwgPSAxO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciB2ZWxCdWZmZXIgPSAzOyAvL2NoYW5nZSBzb29uXHJcblxyXG4gICAgdGhpcy54ICs9IDEwMCAqIHggLyBub3JtYWxWZWwgLyB2ZWxCdWZmZXI7XHJcbiAgICB0aGlzLnkgKz0gMTAwICogeSAvIG5vcm1hbFZlbCAvIHZlbEJ1ZmZlcjtcclxuXHJcbn07XHJcblxyXG5cclxuUGxheWVyLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgaWYgKHRoaXMuZmFrZSkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIXRoaXMucmFkaXVzKSB7XHJcbiAgICAgICAgdGhpcy5yYWRpdXMgPSAxO1xyXG4gICAgfVxyXG4gICAgdGhpcy5yYWRpdXMgPSBsZXJwKHRoaXMucmFkaXVzLCB0aGlzLnJlYWxSYWRpdXMsIDAuMik7XHJcbiAgICB0aGlzLnVwZGF0ZVRpbWVyIC09IDE7XHJcbiAgICBpZiAodGhpcy51cGRhdGVUaW1lciA8PSAwKSB7XHJcbiAgICAgICAgZGVsZXRlIHRoaXMuY2xpZW50LlBMQVlFUl9MSVNUW3RoaXMuaWRdO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5tYWluQ3R4O1xyXG4gICAgdmFyIGZpbGxBbHBoYTtcclxuICAgIHZhciBzdHJva2VBbHBoYTtcclxuICAgIHZhciBpO1xyXG5cclxuXHJcbiAgICBmaWxsQWxwaGEgPSB0aGlzLmhlYWx0aCAvICg0ICogdGhpcy5tYXhIZWFsdGgpO1xyXG4gICAgc3Ryb2tlQWxwaGEgPSAxO1xyXG5cclxuICAgIGN0eC5mb250ID0gXCIyMHB4IEFyaWFsXCI7XHJcblxyXG5cclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwicmdiYSgyNTIsIDEwMiwgMzcsXCIgKyBzdHJva2VBbHBoYSArIFwiKVwiO1xyXG4gICAgaWYgKHRoaXMuc2hvb3RpbmcpIHtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJncmVlblwiO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAodGhpcy52dWxuZXJhYmxlKSB7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwicmVkXCI7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDEyMywwLDAsXCIgKyBmaWxsQWxwaGEgKyBcIilcIjtcclxuICAgIH1cclxuICAgIGN0eC5saW5lV2lkdGggPSAxMDtcclxuXHJcblxyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG5cclxuICAgIGN0eC50cmFuc2xhdGUodGhpcy54LCB0aGlzLnkpO1xyXG4gICAgY3R4LnJvdGF0ZSh0aGlzLnRoZXRhKTtcclxuXHJcbiAgICBpZiAodGhpcy52ZXJ0aWNlcykge1xyXG4gICAgICAgIHZhciB2ID0gdGhpcy52ZXJ0aWNlcztcclxuICAgICAgICBjdHgubW92ZVRvKHZbMF1bMF0gKiB0aGlzLnJhZGl1cywgdlswXVsxXSAqIHRoaXMucmFkaXVzKTtcclxuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgdi5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBjdHgubGluZVRvKHZbaV1bMF0gKiB0aGlzLnJhZGl1cywgdltpXVsxXSAqIHRoaXMucmFkaXVzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY3R4LmxpbmVUbyh2WzBdWzBdICogdGhpcy5yYWRpdXMsIHZbMF1bMV0gKiB0aGlzLnJhZGl1cyk7XHJcbiAgICAgICAgY3R4LmZpbGwoKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgMzAsIDMwKTtcclxuICAgIH1cclxuICAgIGN0eC5maWxsKCk7XHJcbiAgICBjdHguc3Ryb2tlKCk7XHJcblxyXG4gICAgY3R4LnJvdGF0ZSgyICogTWF0aC5QSSAtIHRoaXMudGhldGEpO1xyXG5cclxuXHJcbiAgICBpZiAoIXRoaXMudnVsbmVyYWJsZSkge1xyXG4gICAgICAgIGlmICh0aGlzLmhlYWx0aCA+IHRoaXMubWF4SGVhbHRoIC8gMikge1xyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDAsIDI1NSwgMCwgMC4zKVwiO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwicmdiYSgyNTUsIDAsIDAsIDAuMylcIjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGN0eC5hcmMoMCwgMCwgdGhpcy5yYWRpdXMgKiAyLCAwLCAyICogTWF0aC5QSSk7XHJcbiAgICAgICAgY3R4LmZpbGwoKTtcclxuICAgIH1cclxuXHJcbiAgICBjdHgudHJhbnNsYXRlKC10aGlzLngsIC10aGlzLnkpO1xyXG5cclxuXHJcbiAgICBjdHguY2xvc2VQYXRoKCk7XHJcblxyXG5cclxuICAgIGN0eC5maWxsU3R5bGUgPSBcIiNmZjlkNjBcIjtcclxuICAgIGN0eC5maWxsVGV4dCh0aGlzLm5hbWUsIHRoaXMueCwgdGhpcy55ICsgNzApO1xyXG5cclxuXHJcbiAgICBpZiAodGhpcy5oZWFsdGggJiYgdGhpcy5tYXhIZWFsdGggJiYgdGhpcy5oZWFsdGggPiAwKSB7IC8vaGVhbHRoIGJhclxyXG4gICAgICAgIGlmICh0aGlzLmhlYWx0aCA+IHRoaXMubWF4SGVhbHRoKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUExBWUVSIEhBUyBUT08gTVVDSCBIRUFMVEg6IFwiICsgdGhpcy5oZWFsdGgsIHRoaXMubWF4SGVhbHRoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDEwO1xyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcImJsYWNrXCI7XHJcbiAgICAgICAgY3R4LnJlY3QodGhpcy54IC0gNDAwLCB0aGlzLnkgKyAyMDAsIDgwMCwgMTAwKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG5cclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiZ3JlZW5cIjtcclxuICAgICAgICBjdHgucmVjdCh0aGlzLnggLSA0MDAsIHRoaXMueSArIDIwMCwgODAwICogdGhpcy5oZWFsdGggLyB0aGlzLm1heEhlYWx0aCwgMTAwKTtcclxuICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuICAgIH0gLy9kaXNwbGF5IGhlYWx0aCBiYXJcclxuXHJcblxyXG4gICAgaWYgKHRoaXMuc2hvb3RNZXRlcikgeyAvL2hlYWx0aCBiYXJcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gMTA7XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiYmxhY2tcIjtcclxuICAgICAgICBjdHgucmVjdCh0aGlzLnggLSA0MDAsIHRoaXMueSArIDMwMCwgODAwLCA1MCk7XHJcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuXHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcIndoaXRlXCI7XHJcbiAgICAgICAgY3R4LnJlY3QodGhpcy54IC0gNDAwLCB0aGlzLnkgKyAzMDAsIDgwMCAqIHRoaXMuc2hvb3RNZXRlciAvIDMwLCA1MCk7XHJcbiAgICAgICAgY3R4LmZpbGwoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcbiAgICB9IC8vZGlzcGxheSBoZWFsdGggYmFyXHJcblxyXG5cclxuICAgIGN0eC5jbG9zZVBhdGgoKTtcclxufTtcclxuXHJcblxyXG5mdW5jdGlvbiBnZXRSYW5kb20obWluLCBtYXgpIHtcclxuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikgKyBtaW47XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBub3JtYWwoeCwgeSkge1xyXG4gICAgcmV0dXJuIE1hdGguc3FydCh4ICogeCArIHkgKiB5KTtcclxufVxyXG5cclxuZnVuY3Rpb24gbGVycChhLCBiLCByYXRpbykge1xyXG4gICAgcmV0dXJuIGEgKyByYXRpbyAqIChiIC0gYSk7XHJcbn1cclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFBsYXllcjsiLCJmdW5jdGlvbiBSb2NrKHJlYWRlciwgY2xpZW50KSB7XHJcbiAgICBpZiAoIXJlYWRlcikge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiTUFLSU5HIE5FVyBGQUtFIFJPQ0tcIik7XHJcbiAgICAgICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbiAgICAgICAgcmV0dXJuOyAvL2ZvciBmYWtlIHJvY2sgcHVycG9zZXNcclxuICAgIH1cclxuICAgIHZhciBwcmV2ID0gcmVhZGVyLl9vZmZzZXQ7XHJcblxyXG5cclxuICAgIHRoaXMuaWQgPSByZWFkZXIucmVhZFVJbnQzMigpO1xyXG4gICAgLy9jb25zb2xlLmxvZyhcIk5FVyBST0NLOiBcIiArIHRoaXMuaWQpO1xyXG5cclxuICAgIHRoaXMub3duZXIgPSByZWFkZXIucmVhZFVJbnQzMigpO1xyXG4gICAgdGhpcy5oaXR0ZXIgPSByZWFkZXIucmVhZFVJbnQzMigpO1xyXG4gICAgdGhpcy54ID0gcmVhZGVyLnJlYWRVSW50MzIoKSAvIDEwMDtcclxuICAgIHRoaXMueSA9IHJlYWRlci5yZWFkVUludDMyKCkgLyAxMDA7XHJcblxyXG4gICAgdGhpcy52ZXJ0aWNlcyA9IFtdO1xyXG4gICAgdmFyIGNvdW50ID0gcmVhZGVyLnJlYWRVSW50MTYoKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xyXG4gICAgICAgIHRoaXMudmVydGljZXNbaV0gPSBbXTtcclxuICAgICAgICB0aGlzLnZlcnRpY2VzW2ldWzBdID0gcmVhZGVyLnJlYWRJbnQxNigpIC8gMTAwMDtcclxuICAgICAgICB0aGlzLnZlcnRpY2VzW2ldWzFdID0gcmVhZGVyLnJlYWRJbnQxNigpIC8gMTAwMDtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmhlYWx0aCA9IHJlYWRlci5yZWFkSW50MTYoKTtcclxuICAgIHRoaXMubWF4SGVhbHRoID0gcmVhZGVyLnJlYWRJbnQxNigpO1xyXG5cclxuICAgIHRoaXMudGhldGEgPSByZWFkZXIucmVhZEludDE2KCkgLyAxMDA7XHJcbiAgICB0aGlzLnRleHR1cmUgPSByZWFkZXIucmVhZFVJbnQ4KCk7XHJcblxyXG4gICAgc3dpdGNoIChyZWFkZXIucmVhZFVJbnQ4KCkpIHtcclxuICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgIHRoaXMubmV1dHJhbCA9IHRydWU7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMTY6XHJcbiAgICAgICAgICAgIHRoaXMuZmFzdCA9IHRydWU7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMTc6XHJcbiAgICAgICAgICAgIHRoaXMubmV1dHJhbCA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuZmFzdCA9IHRydWU7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gICAgdmFyIGRlbHRhID0gcmVhZGVyLl9vZmZzZXQgLSBwcmV2O1xyXG4gICAgdGhpcy51cGRhdGVzID0gW107XHJcbiAgICB0aGlzLnVwZGF0ZVRpbWVyID0gMjA7XHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxufVxyXG5cclxuXHJcblJvY2sucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIChyZWFkZXIpIHtcclxuICAgIHRoaXMub3duZXIgPSByZWFkZXIucmVhZFVJbnQzMigpO1xyXG4gICAgdGhpcy5oaXR0ZXIgPSByZWFkZXIucmVhZFVJbnQzMigpO1xyXG5cclxuICAgIHZhciB4ID0gdGhpcy54O1xyXG4gICAgdmFyIHkgPSB0aGlzLnk7XHJcblxyXG4gICAgdGhpcy54ID0gcmVhZGVyLnJlYWRVSW50MzIoKSAvIDEwMDtcclxuICAgIHRoaXMueSA9IHJlYWRlci5yZWFkVUludDMyKCkgLyAxMDA7XHJcblxyXG4gICAgaWYgKHRoaXMueCAhPT0geCB8fCB0aGlzLnkgIT09IHkpIHtcclxuICAgICAgICB0aGlzLnVwZGF0ZVRpbWVyID0gMjAwO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuaGVhbHRoID0gcmVhZGVyLnJlYWRJbnQxNigpO1xyXG4gICAgdGhpcy5tYXhIZWFsdGggPSByZWFkZXIucmVhZEludDE2KCk7XHJcblxyXG4gICAgdGhpcy50aGV0YSA9IHJlYWRlci5yZWFkSW50MTYoKSAvIDEwMDtcclxuXHJcbiAgICB0aGlzLm5ldXRyYWwgPSBmYWxzZTtcclxuICAgIHRoaXMuZmFzdCA9IGZhbHNlO1xyXG4gICAgc3dpdGNoIChyZWFkZXIucmVhZFVJbnQ4KCkpIHsgLy9mbGFnc1xyXG4gICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgdGhpcy5uZXV0cmFsID0gdHJ1ZTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAxNjpcclxuICAgICAgICAgICAgdGhpcy5mYXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAxNzpcclxuICAgICAgICAgICAgdGhpcy5uZXV0cmFsID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5mYXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuUm9jay5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudXBkYXRlVGltZXIgLT0gMTtcclxuICAgIGlmICh0aGlzLnVwZGF0ZVRpbWVyIDw9IDApIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIkRFTEVUSU5HIFJPQ0sgVklBIFRJTUVPVVQ6IFwiICsgdGhpcy5pZCk7XHJcbiAgICAgICAgZGVsZXRlIHRoaXMuY2xpZW50LlJPQ0tfTElTVFt0aGlzLmlkXTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50Lm1haW5DdHg7XHJcbiAgICB2YXIgU0NBTEUgPSAxMDA7XHJcblxyXG5cclxuICAgIGN0eC5maWxsU3R5bGUgPSBcInBpbmtcIjsgLy9kZWZhdWx0IGNvbG9yXHJcbiAgICBzd2l0Y2ggKHRoaXMudGV4dHVyZSkge1xyXG4gICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiYnJvd25cIjtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJncmV5XCI7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMzpcclxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwieWVsbG93XCI7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgNDpcclxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiZ3JlZW5cIjtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IHRoaXMuZmFzdCA/IFwicGlua1wiIDogY3R4LnN0cm9rZVN0eWxlO1xyXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gIXRoaXMub3duZXIgPyBcImJsdWVcIiA6IFwiZ3JlZW5cIjtcclxuXHJcbiAgICBpZiAodGhpcy5oaXR0ZXIpIHtcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSB0aGlzLmhpdHRlciA9PT0gdGhpcy5jbGllbnQuU0VMRl9JRCA/IFwiZ3JlZW5cIiA6IFwicmVkXCI7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuXHJcbiAgICBjdHgudHJhbnNsYXRlKHRoaXMueCwgdGhpcy55KTtcclxuICAgIGN0eC5yb3RhdGUodGhpcy50aGV0YSk7XHJcblxyXG4gICAgaWYgKHRoaXMudmVydGljZXMpIHtcclxuICAgICAgICB2YXIgdiA9IHRoaXMudmVydGljZXM7XHJcbiAgICAgICAgY3R4Lm1vdmVUbyh2WzBdWzBdICogU0NBTEUsIHZbMF1bMV0gKiBTQ0FMRSk7XHJcblxyXG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgdi5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBjdHgubGluZVRvKHZbaV1bMF0gKiBTQ0FMRSwgdltpXVsxXSAqIFNDQUxFKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY3R4LmxpbmVUbyh2WzBdWzBdICogU0NBTEUsIHZbMF1bMV0gKiBTQ0FMRSk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgMzAsIDMwKTtcclxuICAgIH1cclxuXHJcbiAgICBjdHguZmlsbCgpO1xyXG4gICAgY3R4LnN0cm9rZSgpO1xyXG5cclxuICAgIGN0eC5yb3RhdGUoMiAqIE1hdGguUEkgLSB0aGlzLnRoZXRhKTtcclxuICAgIGN0eC50cmFuc2xhdGUoLXRoaXMueCwgLXRoaXMueSk7XHJcblxyXG4gICAgY3R4LmNsb3NlUGF0aCgpO1xyXG5cclxuICAgIGlmICgxID09PSAyICYmIHRoaXMuaGVhbHRoICYmIHRoaXMubWF4SGVhbHRoICYmIHRoaXMuaGVhbHRoID4gMCkgeyAvL2hlYWx0aCBiYXJcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gMTA7XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiYmxhY2tcIjtcclxuICAgICAgICBjdHgucmVjdCh0aGlzLngsIHRoaXMueSwgMTAwLCAyMCk7XHJcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuXHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcImdyZWVuXCI7XHJcbiAgICAgICAgY3R4LnJlY3QodGhpcy54LCB0aGlzLnksIDEwMCAqIHRoaXMuaGVhbHRoIC8gdGhpcy5tYXhIZWFsdGgsIDIwKTtcclxuICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuICAgIH0gLy9kaXNwbGF5IGhlYWx0aCBiYXJcclxufTtcclxuXHJcblxyXG5mdW5jdGlvbiBnZXRSYW5kb20obWluLCBtYXgpIHtcclxuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikgKyBtaW47XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUm9jazsiLCJmdW5jdGlvbiBUaWxlKHRoaXNJbmZvLCBjbGllbnQpIHtcclxuICAgIHRoaXMuaWQgPSB0aGlzSW5mby5pZDtcclxuICAgIHRoaXMueCA9IHRoaXNJbmZvLng7XHJcbiAgICB0aGlzLnkgPSB0aGlzSW5mby55O1xyXG4gICAgdGhpcy5sZW5ndGggPSB0aGlzSW5mby5sZW5ndGg7XHJcbiAgICB0aGlzLmNvbG9yID0gdGhpc0luZm8uY29sb3I7XHJcbiAgICB0aGlzLnRvcENvbG9yID0ge1xyXG4gICAgICAgIHI6IHRoaXMuY29sb3IuciArIDEwLFxyXG4gICAgICAgIGc6IHRoaXMuY29sb3IuZyArIDEwLFxyXG4gICAgICAgIGI6IHRoaXMuY29sb3IuYiArIDEwXHJcbiAgICB9O1xyXG4gICAgdGhpcy5ib3JkZXJDb2xvciA9IHtcclxuICAgICAgICByOiB0aGlzLmNvbG9yLnIgLSAxMCxcclxuICAgICAgICBnOiB0aGlzLmNvbG9yLmcgLSAxMCxcclxuICAgICAgICBiOiB0aGlzLmNvbG9yLmIgLSAxMFxyXG4gICAgfTtcclxuICAgIHRoaXMuYWxlcnQgPSB0aGlzSW5mby5hbGVydDtcclxuICAgIHRoaXMucmFuZG9tID0gTWF0aC5mbG9vcihnZXRSYW5kb20oMCwgMykpO1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5UaWxlLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAodGhpc0luZm8pIHtcclxuICAgIHRoaXMuY29sb3IgPSB0aGlzSW5mby5jb2xvcjtcclxuICAgIHRoaXMudG9wQ29sb3IgPSB7XHJcbiAgICAgICAgcjogdGhpcy5jb2xvci5yICsgMTAwLFxyXG4gICAgICAgIGc6IHRoaXMuY29sb3IuZyArIDEwMCxcclxuICAgICAgICBiOiB0aGlzLmNvbG9yLmIgKyAxMDBcclxuICAgIH07XHJcbiAgICB0aGlzLmJvcmRlckNvbG9yID0ge1xyXG4gICAgICAgIHI6IHRoaXMuY29sb3IuciAtIDEwLFxyXG4gICAgICAgIGc6IHRoaXMuY29sb3IuZyAtIDEwLFxyXG4gICAgICAgIGI6IHRoaXMuY29sb3IuYiAtIDEwXHJcbiAgICB9O1xyXG4gICAgdGhpcy5hbGVydCA9IHRoaXNJbmZvLmFsZXJ0O1xyXG59O1xyXG5cclxuVGlsZS5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5tYWluQ3R4O1xyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG5cclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwicmdiKFwiICsgdGhpcy5ib3JkZXJDb2xvci5yICsgXCIsXCIgKyB0aGlzLmJvcmRlckNvbG9yLmcgKyBcIixcIiArIHRoaXMuYm9yZGVyQ29sb3IuYiArIFwiKVwiO1xyXG4gICAgY3R4LmxpbmVXaWR0aCA9IDIwO1xyXG5cclxuXHJcbiAgICB2YXIgZ3JkID0gY3R4LmNyZWF0ZUxpbmVhckdyYWRpZW50KHRoaXMueCArIHRoaXMubGVuZ3RoICogMy80LCB0aGlzLnksIHRoaXMueCArIHRoaXMubGVuZ3RoLzQsIHRoaXMueSArIHRoaXMubGVuZ3RoKTtcclxuICAgIGdyZC5hZGRDb2xvclN0b3AoMCwgXCJyZ2IoXCIgKyB0aGlzLnRvcENvbG9yLnIgKyBcIixcIiArIHRoaXMudG9wQ29sb3IuZyArIFwiLFwiICsgdGhpcy50b3BDb2xvci5iICsgXCIpXCIpO1xyXG4gICAgZ3JkLmFkZENvbG9yU3RvcCgxLCBcInJnYihcIiArIHRoaXMuY29sb3IuciArIFwiLFwiICsgdGhpcy5jb2xvci5nICsgXCIsXCIgKyB0aGlzLmNvbG9yLmIgKyBcIilcIik7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gZ3JkO1xyXG5cclxuXHJcbiAgICBjdHgucmVjdCh0aGlzLnggKyAzMCwgdGhpcy55ICsgMzAsIHRoaXMubGVuZ3RoIC0gMzAsIHRoaXMubGVuZ3RoIC0gMzApO1xyXG5cclxuICAgIGN0eC5zdHJva2UoKTtcclxuICAgIGN0eC5maWxsKCk7XHJcblxyXG5cclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFRpbGU7XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0UmFuZG9tKG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluO1xyXG59IiwibW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgICBBbmltYXRpb246IHJlcXVpcmUoJy4vQW5pbWF0aW9uJyksXHJcbiAgICBQbGF5ZXI6IHJlcXVpcmUoJy4vUGxheWVyJyksXHJcbiAgICBNaW5pTWFwOiByZXF1aXJlKCcuL01pbmlNYXAnKSxcclxuICAgIFRpbGU6IHJlcXVpcmUoJy4vVGlsZScpLFxyXG4gICAgUm9jazogcmVxdWlyZSgnLi9Sb2NrJylcclxufTsiLCJ2YXIgQ2xpZW50ID0gcmVxdWlyZSgnLi9DbGllbnQuanMnKTtcclxudmFyIE1haW5VSSA9IHJlcXVpcmUoJy4vdWkvTWFpblVJJyk7XHJcblxyXG52YXIgY2xpZW50ID0gbmV3IENsaWVudCgpO1xyXG5jbGllbnQuc3RhcnQoKTtcclxuXHJcblxyXG5cclxuZG9jdW1lbnQub25rZXlkb3duID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBjbGllbnQua2V5c1tldmVudC5rZXlDb2RlXSA9IHRydWU7XHJcbiAgICBjbGllbnQuc29ja2V0LmVtaXQoJ2tleUV2ZW50Jywge2lkOiBldmVudC5rZXlDb2RlLCBzdGF0ZTogdHJ1ZX0pO1xyXG59LmJpbmQodGhpcyk7XHJcblxyXG5kb2N1bWVudC5vbmtleXVwID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gODQpIHtcclxuICAgICAgICBjbGllbnQubWFpblVJLmdhbWVVSS5jaGF0VUkudGV4dElucHV0LmNsaWNrKCk7XHJcbiAgICB9XHJcbiAgICBjbGllbnQua2V5c1tldmVudC5rZXlDb2RlXSA9IGZhbHNlO1xyXG4gICAgY2xpZW50LnNvY2tldC5lbWl0KCdrZXlFdmVudCcsIHtpZDogZXZlbnQua2V5Q29kZSwgc3RhdGU6IGZhbHNlfSk7XHJcbn07XHJcblxyXG5cclxuJCh3aW5kb3cpLmJpbmQoJ21vdXNld2hlZWwgRE9NTW91c2VTY3JvbGwnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGlmIChldmVudC5jdHJsS2V5ID09PSB0cnVlKSB7XHJcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgIH1cclxuICAgIGlmIChjbGllbnQuQ0hBVF9TQ1JPTEwpIHtcclxuICAgICAgICBjbGllbnQuQ0hBVF9TQ1JPTEwgPSBmYWxzZTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgaWYoZXZlbnQub3JpZ2luYWxFdmVudC53aGVlbERlbHRhIC8xMjAgPiAwICYmIGNsaWVudC5tYWluU2NhbGVGYWN0b3IgPCAyKSB7XHJcbiAgICAgICAgY2xpZW50Lm1haW5TY2FsZUZhY3RvciArPSAwLjA1O1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoY2xpZW50Lm1haW5TY2FsZUZhY3RvciA+IDAuMjUpIHtcclxuICAgICAgICBjbGllbnQubWFpblNjYWxlRmFjdG9yIC09IDAuMDU7XHJcbiAgICB9XHJcbn0pO1xyXG5cclxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY29udGV4dG1lbnUnLCBmdW5jdGlvbiAoZSkgeyAvL3ByZXZlbnQgcmlnaHQtY2xpY2sgY29udGV4dCBtZW51XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbn0sIGZhbHNlKTsiLCJkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUub3ZlcmZsb3cgPSAnaGlkZGVuJzsgIC8vIGZpcmVmb3gsIGNocm9tZVxyXG5kb2N1bWVudC5ib2R5LnNjcm9sbCA9IFwibm9cIjtcclxuXHJcbnZhciBQbGF5ZXJOYW1lclVJID0gcmVxdWlyZSgnLi9QbGF5ZXJOYW1lclVJJyk7XHJcbnZhciBHYW1lVUkgPSByZXF1aXJlKCcuL2dhbWUvR2FtZVVJJyk7XHJcblxyXG5mdW5jdGlvbiBNYWluVUkoY2xpZW50LCBzb2NrZXQpIHtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcblxyXG4gICAgdGhpcy5nYW1lVUkgPSBuZXcgR2FtZVVJKHRoaXMuY2xpZW50LCB0aGlzLnNvY2tldCwgdGhpcyk7XHJcblxyXG4gICAgdGhpcy5wbGF5ZXJOYW1lclVJID0gbmV3IFBsYXllck5hbWVyVUkodGhpcy5jbGllbnQsIHRoaXMuc29ja2V0KTtcclxufVxyXG5cclxuTWFpblVJLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKGluZm8pIHtcclxuICAgIHZhciBhY3Rpb24gPSBpbmZvLmFjdGlvbjtcclxuICAgIHZhciBob21lO1xyXG4gICAgaWYgKGFjdGlvbiA9PT0gXCJnYW1lTXNnUHJvbXB0XCIpIHtcclxuICAgICAgICB0aGlzLmdhbWVVSS5nYW1lTXNnUHJvbXB0Lm9wZW4oaW5mby5tZXNzYWdlKTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5NYWluVUkucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKGFjdGlvbikge1xyXG4gICAgaWYgKGFjdGlvbiA9PT0gXCJnYW1lTXNnUHJvbXB0XCIpIHtcclxuICAgICAgICB0aGlzLmdhbWVVSS5nYW1lTXNnUHJvbXB0LmNsb3NlKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuTWFpblVJLnByb3RvdHlwZS51cGRhdGVMZWFkZXJCb2FyZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBsZWFkZXJib2FyZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibGVhZGVyYm9hcmRcIik7XHJcbiAgICB2YXIgUExBWUVSX0FSUkFZID0gdGhpcy5jbGllbnQuUExBWUVSX0FSUkFZO1xyXG5cclxuXHJcbiAgICB2YXIgcGxheWVyU29ydCA9IGZ1bmN0aW9uIChhLCBiKSB7XHJcbiAgICAgICAgdmFyIHBsYXllckEgPSB0aGlzLmNsaWVudC5QTEFZRVJfTElTVFthXTtcclxuICAgICAgICB2YXIgcGxheWVyQiA9IHRoaXMuY2xpZW50LlBMQVlFUl9MSVNUW2JdO1xyXG4gICAgICAgIHJldHVybiBwbGF5ZXJBLnJhZGl1cyAtIHBsYXllckIucmFkaXVzO1xyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG5cclxuICAgIFBMQVlFUl9BUlJBWS5zb3J0KHBsYXllclNvcnQpO1xyXG5cclxuXHJcbiAgICBsZWFkZXJib2FyZC5pbm5lckhUTUwgPSBcIlwiO1xyXG4gICAgZm9yICh2YXIgaSA9IFBMQVlFUl9BUlJBWS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgICAgIHZhciBwbGF5ZXIgPSB0aGlzLmNsaWVudC5QTEFZRVJfTElTVFtQTEFZRVJfQVJSQVlbaV1dO1xyXG5cclxuICAgICAgICBpZiAocGxheWVyKSB7XHJcbiAgICAgICAgICAgIHZhciBlbnRyeSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XHJcbiAgICAgICAgICAgIGVudHJ5LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHBsYXllci5uYW1lICsgXCIgLSBcIiArIE1hdGguZmxvb3IocGxheWVyLnJhZGl1cykpKTtcclxuICAgICAgICAgICAgbGVhZGVyYm9hcmQuYXBwZW5kQ2hpbGQoZW50cnkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE1haW5VSTsiLCJmdW5jdGlvbiBQbGF5ZXJOYW1lclVJIChjbGllbnQsIHNvY2tldCkge1xyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbiAgICB0aGlzLnNvY2tldCA9IHNvY2tldDtcclxuXHJcbiAgICB0aGlzLmxlYWRlcmJvYXJkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsZWFkZXJib2FyZF9jb250YWluZXJcIik7XHJcbiAgICB0aGlzLm5hbWVCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm5hbWVTdWJtaXRcIik7XHJcbiAgICB0aGlzLnBsYXllck5hbWVJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGxheWVyTmFtZUlucHV0XCIpO1xyXG4gICAgdGhpcy5wbGF5ZXJOYW1lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGxheWVyX25hbWVyXCIpO1xyXG59XHJcblxyXG5QbGF5ZXJOYW1lclVJLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5wbGF5ZXJOYW1lSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDEzKSB7XHJcbiAgICAgICAgICAgIHRoaXMubmFtZUJ0bi5jbGljaygpO1xyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgdGhpcy5uYW1lQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5jbGllbnQubWFpbkNhbnZhcy5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgdGhpcy5sZWFkZXJib2FyZC5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcIm5ld1BsYXllclwiLFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiB0aGlzLnBsYXllck5hbWVJbnB1dC52YWx1ZSxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5wbGF5ZXJOYW1lci5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICB0aGlzLnBsYXllck5hbWVyLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgIHRoaXMucGxheWVyTmFtZUlucHV0LmZvY3VzKCk7XHJcbiAgICB0aGlzLmxlYWRlcmJvYXJkLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQbGF5ZXJOYW1lclVJOyIsImZ1bmN0aW9uIENoYXRVSShwYXJlbnQpIHtcclxuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xyXG4gICAgdGhpcy50ZW1wbGF0ZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY2hhdF9jb250YWluZXJcIik7XHJcbiAgICB0aGlzLnRleHRJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjaGF0X2lucHV0Jyk7XHJcbiAgICB0aGlzLmNoYXRMaXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NoYXRfbGlzdCcpO1xyXG5cclxuXHJcbiAgICB0aGlzLnRleHRJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnRleHRJbnB1dC5mb2N1cygpO1xyXG5cclxuICAgICAgICB0aGlzLnBhcmVudC5jbGllbnQuQ0hBVF9PUEVOID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLmNoYXRMaXN0LnN0eWxlLmhlaWdodCA9IFwiODAlXCI7XHJcbiAgICAgICAgdGhpcy5jaGF0TGlzdC5zdHlsZS5vdmVyZmxvd1kgPSBcImF1dG9cIjtcclxuXHJcbiAgICAgICAgdGhpcy50ZXh0SW5wdXQuc3R5bGUuYmFja2dyb3VuZCA9IFwicmdiYSgzNCwgNDgsIDcxLCAxKVwiO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuICAgIHRoaXMudGV4dElucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIGlmIChlLmtleUNvZGUgPT09IDEzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2VuZE1lc3NhZ2UoKTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuXHJcbiAgICB0aGlzLnRlbXBsYXRlLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNld2hlZWwnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5wYXJlbnQuY2xpZW50LkNIQVRfU0NST0xMID0gdHJ1ZTtcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgdGhpcy50ZW1wbGF0ZS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5wYXJlbnQuY2xpZW50LkNIQVRfQ0xJQ0sgPSB0cnVlO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxufVxyXG5cclxuQ2hhdFVJLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKG1lc3NhZ2UpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcclxuICAgIHRoaXMuY2xvc2UoKTtcclxufTtcclxuXHJcblxyXG5DaGF0VUkucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy50ZXh0SW5wdXQuYmx1cigpO1xyXG4gICAgdGhpcy5wYXJlbnQuY2xpZW50LkNIQVRfT1BFTiA9IGZhbHNlO1xyXG4gICAgdGhpcy5jaGF0TGlzdC5zdHlsZS5oZWlnaHQgPSBcIjMwJVwiO1xyXG4gICAgdGhpcy5jaGF0TGlzdC5zdHlsZS5iYWNrZ3JvdW5kID0gXCJyZ2JhKDE4MiwgMTkzLCAyMTEsIDAuMDIpXCI7XHJcbiAgICB0aGlzLnRleHRJbnB1dC5zdHlsZS5iYWNrZ3JvdW5kID0gXCJyZ2JhKDE4MiwgMTkzLCAyMTEsIDAuMSlcIjtcclxuICAgIHRoaXMucGFyZW50LmNsaWVudC5DSEFUX1NDUk9MTCA9IGZhbHNlO1xyXG4gICAgJCgnI2NoYXRfbGlzdCcpLmFuaW1hdGUoe3Njcm9sbFRvcDogJCgnI2NoYXRfbGlzdCcpLnByb3AoXCJzY3JvbGxIZWlnaHRcIil9LCAxMDApO1xyXG4gICAgdGhpcy5jaGF0TGlzdC5zdHlsZS5vdmVyZmxvd1kgPSBcIm5vbmVcIjtcclxufTtcclxuXHJcblxyXG5DaGF0VUkucHJvdG90eXBlLmFkZE1lc3NhZ2UgPSBmdW5jdGlvbiAocGFja2V0KSB7XHJcbiAgICB2YXIgZW50cnkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xyXG4gICAgZW50cnkuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUocGFja2V0Lm5hbWUgKyBcIiA6IFwiICsgcGFja2V0LmNoYXRNZXNzYWdlKSk7XHJcbiAgICB0aGlzLmNoYXRMaXN0LmFwcGVuZENoaWxkKGVudHJ5KTtcclxuXHJcbiAgICAkKCcjY2hhdF9saXN0JykuYW5pbWF0ZSh7c2Nyb2xsVG9wOiAkKCcjY2hhdF9saXN0JykucHJvcChcInNjcm9sbEhlaWdodFwiKX0sIDEwMCk7XHJcbn07XHJcblxyXG5cclxuQ2hhdFVJLnByb3RvdHlwZS5zZW5kTWVzc2FnZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBzb2NrZXQgPSB0aGlzLnBhcmVudC5zb2NrZXQ7XHJcblxyXG5cclxuICAgIGlmICh0aGlzLnRleHRJbnB1dC52YWx1ZSAmJiB0aGlzLnRleHRJbnB1dC52YWx1ZSAhPT0gXCJcIikge1xyXG4gICAgICAgIHNvY2tldC5lbWl0KCdjaGF0TWVzc2FnZScsIHtcclxuICAgICAgICAgICAgaWQ6IHRoaXMucGFyZW50LmNsaWVudC5TRUxGX0lELFxyXG4gICAgICAgICAgICBtZXNzYWdlOiB0aGlzLnRleHRJbnB1dC52YWx1ZVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMudGV4dElucHV0LnZhbHVlID0gXCJcIjtcclxuICAgIH1cclxuICAgIHRoaXMuY2xvc2UoKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ2hhdFVJO1xyXG5cclxuXHJcbiIsImZ1bmN0aW9uIEdhbWVNc2dQcm9tcHQocGFyZW50KSB7XHJcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcclxuICAgIHRoaXMudGVtcGxhdGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInByb21wdF9jb250YWluZXJcIik7XHJcbiAgICB0aGlzLm1lc3NhZ2UgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2FtZV9tc2dfcHJvbXB0Jyk7XHJcbn1cclxuXHJcbkdhbWVNc2dQcm9tcHQucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAobWVzc2FnZSkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xyXG4gICAgdGhpcy5tZXNzYWdlLmlubmVySFRNTCA9IG1lc3NhZ2U7XHJcbn07XHJcblxyXG5HYW1lTXNnUHJvbXB0LnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBHYW1lTXNnUHJvbXB0O1xyXG5cclxuXHJcbiIsInZhciBHYW1lTXNnUHJvbXB0ID0gcmVxdWlyZSgnLi9HYW1lTXNnUHJvbXB0Jyk7XHJcbnZhciBDaGF0VUkgPSByZXF1aXJlKCcuL0NoYXRVSScpO1xyXG5cclxuZnVuY3Rpb24gR2FtZVVJKGNsaWVudCwgc29ja2V0LCBwYXJlbnQpIHtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcclxuICAgIHRoaXMuZ2FtZU1zZ1Byb21wdCA9IG5ldyBHYW1lTXNnUHJvbXB0KHRoaXMpO1xyXG4gICAgdGhpcy5jaGF0VUkgPSBuZXcgQ2hhdFVJKHRoaXMpO1xyXG59XHJcblxyXG5HYW1lVUkucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBjb25zb2xlLmxvZyhcIk9QRU5JTkcgR0FNRSBVSVwiKTtcclxuICAgIHRoaXMuY2hhdFVJLm9wZW4oKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gIEdhbWVVSTsiXX0=
