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
    this.updates = [];
    this.updateTimer = 20;
    this.client = client;
}


Rock.prototype.update = function (reader) {
    this.owner = reader.readUInt32();

    var x = this.x;
    var y = this.y;

    this.x = reader.readUInt32() / 100;
    this.y = reader.readUInt32() / 100;

    if (this.x !== x && this.y !== y) {
        this.updateTimer = 20;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2xpZW50L2pzL0JpbmFyeVJlYWRlci5qcyIsInNyYy9jbGllbnQvanMvQ2xpZW50LmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvQW5pbWF0aW9uLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvTWluaU1hcC5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L1BsYXllci5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L1JvY2suanMiLCJzcmMvY2xpZW50L2pzL2VudGl0eS9UaWxlLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvaW5kZXguanMiLCJzcmMvY2xpZW50L2pzL2luZGV4LmpzIiwic3JjL2NsaWVudC9qcy91aS9NYWluVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL1BsYXllck5hbWVyVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL2dhbWUvQ2hhdFVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9nYW1lL0dhbWVNc2dQcm9tcHQuanMiLCJzcmMvY2xpZW50L2pzL3VpL2dhbWUvR2FtZVVJLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbmZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJmdW5jdGlvbiBCaW5hcnlSZWFkZXIoZGF0YSkge1xyXG4gICAgdGhpcy5fb2Zmc2V0ID0gMDtcclxuICAgIHRoaXMuX2J1ZmZlciA9IG5ldyBEYXRhVmlldyhkYXRhKTtcclxuICAgIC8vY29uc29sZS5sb2coZGF0YS5ieXRlTGVuZ3RoKTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBCaW5hcnlSZWFkZXI7XHJcblxyXG5cclxuQmluYXJ5UmVhZGVyLnByb3RvdHlwZS5yZWFkSW50OCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciB2YWx1ZSA9IHRoaXMuX2J1ZmZlci5nZXRJbnQ4KHRoaXMuX29mZnNldCk7XHJcbiAgICB0aGlzLl9vZmZzZXQgKz0gMTtcclxuICAgIHJldHVybiB2YWx1ZTtcclxufTtcclxuXHJcbkJpbmFyeVJlYWRlci5wcm90b3R5cGUucmVhZFVJbnQ4ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHZhbHVlID0gdGhpcy5fYnVmZmVyLmdldFVpbnQ4KHRoaXMuX29mZnNldCk7XHJcbiAgICB0aGlzLl9vZmZzZXQgKz0gMTtcclxuICAgIHJldHVybiB2YWx1ZTtcclxufTtcclxuXHJcblxyXG5CaW5hcnlSZWFkZXIucHJvdG90eXBlLnJlYWRJbnQxNiA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciB2YWx1ZSA9IHRoaXMuX2J1ZmZlci5nZXRJbnQxNih0aGlzLl9vZmZzZXQpO1xyXG4gICAgdGhpcy5fb2Zmc2V0ICs9IDI7XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbn07XHJcblxyXG5CaW5hcnlSZWFkZXIucHJvdG90eXBlLnJlYWRVSW50MTYgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9idWZmZXIuZ2V0VWludDE2KHRoaXMuX29mZnNldCk7XHJcbiAgICB0aGlzLl9vZmZzZXQgKz0gMjtcclxuICAgIHJldHVybiB2YWx1ZTtcclxufTtcclxuXHJcblxyXG5cclxuQmluYXJ5UmVhZGVyLnByb3RvdHlwZS5yZWFkSW50MzIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9idWZmZXIuZ2V0SW50MzIodGhpcy5fb2Zmc2V0KTtcclxuICAgIHRoaXMuX29mZnNldCArPSA0O1xyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG59O1xyXG5cclxuXHJcbkJpbmFyeVJlYWRlci5wcm90b3R5cGUucmVhZFVJbnQzMiA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciB2YWx1ZSA9IHRoaXMuX2J1ZmZlci5nZXRVaW50MzIodGhpcy5fb2Zmc2V0KTtcclxuICAgIHRoaXMuX29mZnNldCArPSA0O1xyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG59O1xyXG5cclxuQmluYXJ5UmVhZGVyLnByb3RvdHlwZS5za2lwQnl0ZXMgPSBmdW5jdGlvbiAobGVuZ3RoKSB7XHJcbiAgICB0aGlzLl9vZmZzZXQgKz0gbGVuZ3RoO1xyXG59O1xyXG5cclxuQmluYXJ5UmVhZGVyLnByb3RvdHlwZS5sZW5ndGggPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fYnVmZmVyLmJ5dGVMZW5ndGg7XHJcbn07XHJcblxyXG4iLCJ2YXIgRW50aXR5ID0gcmVxdWlyZSgnLi9lbnRpdHknKTtcclxudmFyIE1haW5VSSA9IHJlcXVpcmUoJy4vdWkvTWFpblVJJyk7XHJcbnZhciBCaW5hcnlSZWFkZXIgPSByZXF1aXJlKCcuL0JpbmFyeVJlYWRlcicpO1xyXG5cclxuZnVuY3Rpb24gQ2xpZW50KCkge1xyXG4gICAgdGhpcy5TRUxGX0lEID0gbnVsbDtcclxuICAgIHRoaXMuU0VMRl9QTEFZRVIgPSBudWxsO1xyXG4gICAgdGhpcy5UUkFJTCA9IG51bGw7XHJcbiAgICB0aGlzLnVwZGF0ZXMgPSBbXTtcclxuXHJcbiAgICB0aGlzLmN1cnJQaW5nID0gMDtcclxuXHJcbiAgICB0aGlzLmluaXQoKTtcclxufVxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5pbml0U29ja2V0KCk7XHJcbiAgICB0aGlzLmluaXRDYW52YXNlcygpO1xyXG4gICAgdGhpcy5pbml0TGlzdHMoKTtcclxuICAgIHRoaXMuaW5pdFZpZXdlcnMoKTtcclxufTtcclxuQ2xpZW50LnByb3RvdHlwZS5pbml0U29ja2V0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5zb2NrZXQgPSBpbygpO1xyXG4gICAgdGhpcy5zb2NrZXQudmVyaWZpZWQgPSBmYWxzZTtcclxuXHJcbiAgICB0aGlzLnNvY2tldC5vbignaW5pdFZlcmlmaWNhdGlvbicsIHRoaXMudmVyaWZ5LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMuc29ja2V0Lm9uKCd1cGRhdGVFbnRpdGllcycsIHRoaXMuaGFuZGxlUGFja2V0LmJpbmQodGhpcykpO1xyXG4gICAgdGhpcy5zb2NrZXQub24oJ3VwZGF0ZUJpbmFyeScsIHRoaXMuaGFuZGxlQmluYXJ5LmJpbmQodGhpcykpO1xyXG5cclxuXHJcbiAgICB0aGlzLnNvY2tldC5vbignY2hhdE1lc3NhZ2UnLCB0aGlzLm1haW5VSSk7XHJcbiAgICB0aGlzLnNvY2tldC5vbigncGluZycsIHRoaXMuc2VuZFBvbmcuYmluZCh0aGlzKSk7XHJcbiAgICB0aGlzLnNvY2tldC5vbignZmluYWxQaW5nJywgZnVuY3Rpb24gKG1lc3NhZ2UpIHtcclxuICAgICAgICAvL2NvbnNvbGUubG9nKFwiUElORzogXCIgKyBtZXNzYWdlKTtcclxuICAgICAgICB0aGlzLmN1cnJQaW5nID0gbWVzc2FnZTtcclxuICAgICAgICBpZiAodGhpcy5jdXJyUGluZyA+IDkwMDAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY3VyclBpbmcgPSAxMDtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcblxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5zZW5kUG9uZyA9IGZ1bmN0aW9uIChtZXNzYWdlKSB7XHJcbiAgICB0aGlzLnNvY2tldC5lbWl0KFwicG9uZzEyM1wiLCBtZXNzYWdlKTtcclxufTtcclxuXHJcblxyXG5DbGllbnQucHJvdG90eXBlLmluaXRDYW52YXNlcyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMubWFpbkNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibWFpbl9jYW52YXNcIik7XHJcbiAgICB0aGlzLm1haW5DYW52YXMuc3R5bGUuYm9yZGVyID0gJzFweCBzb2xpZCAjMDAwMDAwJztcclxuICAgIHRoaXMubWFpbkNhbnZhcy5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgIHRoaXMubWFpbkN0eCA9IHRoaXMubWFpbkNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XHJcblxyXG5cclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLlNFTEZfSUQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgeCA9ICgoZXZlbnQueCAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRXaWR0aCAqIDEwMDApIC0gdGhpcy5tYWluQ2FudmFzLndpZHRoIC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yO1xyXG4gICAgICAgIHZhciB5ID0gKChldmVudC55IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldEhlaWdodCAqIDUwMCkgLSB0aGlzLm1haW5DYW52YXMuaGVpZ2h0IC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yO1xyXG5cclxuXHJcbiAgICAgICAgaWYgKE1hdGguYWJzKHgpICsgTWF0aC5hYnMoeSkgPCAyMDApIHtcclxuICAgICAgICAgICAgdGhpcy5wbGF5ZXJDbGlja2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5jaXJjbGVDb25zdHJ1Y3QgPSBbXTtcclxuICAgICAgICAgICAgdGhpcy5jaXJjbGVTdGFnZUNvdW50ID0gMDtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuY2xpY2tUZW1wID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5jbGlja1RpbWVyID0gMDtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIiwgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLlNFTEZfSUQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgeCA9ICgoZXZlbnQueCAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRXaWR0aCAqIDEwMDApIC0gdGhpcy5tYWluQ2FudmFzLndpZHRoIC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yO1xyXG4gICAgICAgIHZhciB5ID0gKChldmVudC55IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldEhlaWdodCAqIDUwMCkgLSB0aGlzLm1haW5DYW52YXMuaGVpZ2h0IC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yO1xyXG5cclxuICAgICAgICB0aGlzLnNvY2tldC5lbWl0KFwic2hvb3RTZWxmXCIsIHtcclxuICAgICAgICAgICAgaWQ6IHRoaXMuU0VMRl9JRCxcclxuICAgICAgICAgICAgeDogeCxcclxuICAgICAgICAgICAgeTogeVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLmNsaWNrVGVtcCA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuY2xpY2tUaW1lciA9IDA7XHJcblxyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcblxyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBpZiAoIXRoaXMuU0VMRl9QTEFZRVIpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIHggPSAoKGV2ZW50LnggLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0V2lkdGggKiAxMDAwKSAtXHJcbiAgICAgICAgICAgIHRoaXMubWFpbkNhbnZhcy53aWR0aCAvIDIpIC8gdGhpcy5zY2FsZUZhY3RvcjtcclxuICAgICAgICB2YXIgeSA9ICgoZXZlbnQueSAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRIZWlnaHQgKiA1MDApIC1cclxuICAgICAgICAgICAgdGhpcy5tYWluQ2FudmFzLmhlaWdodCAvIDIpIC8gdGhpcy5zY2FsZUZhY3RvcjtcclxuXHJcbiAgICAgICAgaWYgKHNxdWFyZSh4KSArIHNxdWFyZSh5KSA+IHNxdWFyZSh0aGlzLlNFTEZfUExBWUVSLnJhbmdlKSkgeyAvL2lmIG5vdCBpbiByYW5nZVxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXRoaXMucHJlKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHJlID0ge3g6IHgsIHk6IHl9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKHNxdWFyZSh0aGlzLnByZS54IC0geCkgKyBzcXVhcmUodGhpcy5wcmUueSAtIHkpID4gODApIHtcclxuICAgICAgICAgICAgdGhpcy5wcmUgPSB7eDogeCwgeTogeX07XHJcblxyXG4gICAgICAgICAgICBpZiAoTWF0aC5hYnMoeCkgPCA1MCAmJiBNYXRoLmFicyh5KSA8IDUwKSB7XHJcbiAgICAgICAgICAgICAgICB4ID0gMDtcclxuICAgICAgICAgICAgICAgIHkgPSAwO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNvY2tldC5lbWl0KCdtb3ZlJywge1xyXG4gICAgICAgICAgICAgICAgaWQ6IHRoaXMuU0VMRl9JRCxcclxuICAgICAgICAgICAgICAgIHg6IHgsXHJcbiAgICAgICAgICAgICAgICB5OiB5XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5TRUxGX1BMQVlFUi5zZXRNb3ZlKHgsIHkpO1xyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKSk7XHJcbn07XHJcblxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5zZW5kQ2lyY2xlID0gZnVuY3Rpb24gKGNvbnN0cnVjdCkge1xyXG5cclxuICAgIHZhciByYWRpaU5vcm1hbCA9IGZ1bmN0aW9uICh2ZWN0b3IpIHtcclxuICAgICAgICBpZiAoIXZlY3Rvcikge1xyXG4gICAgICAgICAgICByZXR1cm4gMDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuICh2ZWN0b3IueCAqIHZlY3Rvci54ICsgdmVjdG9yLnkgKiB2ZWN0b3IueSk7XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBtYXhSYWRpdXMgPSBNYXRoLnNxcnQoTWF0aC5tYXgoXHJcbiAgICAgICAgcmFkaWlOb3JtYWwoY29uc3RydWN0WzBdKSxcclxuICAgICAgICByYWRpaU5vcm1hbChjb25zdHJ1Y3RbMV0pLFxyXG4gICAgICAgIHJhZGlpTm9ybWFsKGNvbnN0cnVjdFsyXSksXHJcbiAgICAgICAgcmFkaWlOb3JtYWwoY29uc3RydWN0WzNdKSkpO1xyXG5cclxuICAgIGlmIChtYXhSYWRpdXMpIHtcclxuICAgICAgICB0aGlzLnNvY2tldC5lbWl0KFwiY3JlYXRlQ2lyY2xlXCIsIHtcclxuICAgICAgICAgICAgaWQ6IHRoaXMuU0VMRl9JRCxcclxuICAgICAgICAgICAgcmFkaXVzOiBtYXhSYWRpdXNcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdExpc3RzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5QTEFZRVJfTElTVCA9IHt9O1xyXG4gICAgdGhpcy5USUxFX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuUk9DS19MSVNUID0ge307XHJcbiAgICB0aGlzLkFTVEVST0lEX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuQU5JTUFUSU9OX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuUExBWUVSX0FSUkFZID0gW107XHJcbn07XHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdFZpZXdlcnMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmtleXMgPSBbXTtcclxuICAgIHRoaXMuc2NhbGVGYWN0b3IgPSAxO1xyXG4gICAgdGhpcy5tYWluU2NhbGVGYWN0b3IgPSAwLjU7XHJcbiAgICB0aGlzLm1haW5VSSA9IG5ldyBNYWluVUkodGhpcywgdGhpcy5zb2NrZXQpO1xyXG4gICAgdGhpcy5tYWluVUkucGxheWVyTmFtZXJVSS5vcGVuKCk7XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLnZlcmlmeSA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICBpZiAoIXRoaXMuc29ja2V0LnZlcmlmaWVkKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJWRVJJRklFRCBDTElFTlRcIik7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcInZlcmlmeVwiLCB7fSk7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQudmVyaWZpZWQgPSB0cnVlO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuYXBwbHlVcGRhdGUgPSBmdW5jdGlvbiAocmVhZGVyKSB7XHJcbiAgICB2YXIgaTtcclxuXHJcbiAgICB2YXIgcm9ja0xlbmd0aCA9IHJlYWRlci5yZWFkVUludDE2KCk7IC8vYWRkIHJvY2tzXHJcbiAgICBmb3IgKGkgPSAwOyBpIDwgcm9ja0xlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgcm9jayA9IG5ldyBFbnRpdHkuUm9jayhyZWFkZXIsIHRoaXMpO1xyXG4gICAgICAgIHRoaXMuUk9DS19MSVNUW3JvY2suaWRdID0gcm9jaztcclxuICAgIH1cclxuXHJcbiAgICB2YXIgcGxheWVyTGVuZ3RoID0gcmVhZGVyLnJlYWRVSW50OCgpOyAvL2FkZCBwbGF5ZXJzXHJcbiAgICBpZiAocGxheWVyTGVuZ3RoID4gMCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQVRURU1QVElORyBBREQgTkVXIFBMQVlFUlwiKTtcclxuICAgIH1cclxuICAgIGZvciAoaSA9IDA7IGkgPCBwbGF5ZXJMZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHBsYXllciA9IG5ldyBFbnRpdHkuUGxheWVyKHJlYWRlciwgdGhpcyk7XHJcbiAgICAgICAgaWYgKHBsYXllci5pZCA9PT0gdGhpcy5TRUxGX0lEKSB7XHJcbiAgICAgICAgICAgIHRoaXMuU0VMRl9QTEFZRVIgPSBwbGF5ZXI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuUExBWUVSX0xJU1RbcGxheWVyLmlkXSA9IHBsYXllcjtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuUExBWUVSX0FSUkFZLmluZGV4T2YocGxheWVyLmlkKSA9PT0gLTEpIHtcclxuICAgICAgICAgICAgdGhpcy5QTEFZRVJfQVJSQVkucHVzaChwbGF5ZXIuaWQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB2YXIgcm9jazJMZW5ndGggPSByZWFkZXIucmVhZFVJbnQxNigpOyAvL3VwZGF0ZSByb2Nrc1xyXG4gICAgZm9yIChpID0gMDsgaSA8IHJvY2syTGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgaWQgPSByZWFkZXIucmVhZFVJbnQzMigpO1xyXG4gICAgICAgIHJvY2sgPSB0aGlzLlJPQ0tfTElTVFtpZF07XHJcbiAgICAgICAgaWYgKHJvY2spIHtcclxuICAgICAgICAgICAgcm9jay51cGRhdGUocmVhZGVyKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTUFLSU5HIE5FVyBGQUtFIFJPQ0sgXCIgKyBpZCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgZmFrZVJvY2sgPSBuZXcgRW50aXR5LlJvY2sobnVsbCwgdGhpcyk7XHJcbiAgICAgICAgICAgIGZha2VSb2NrLnVwZGF0ZShyZWFkZXIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5ST0NLX0xJU1RbaWRdID0gZmFrZVJvY2s7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNvY2tldC5lbWl0KFwiZ2V0Um9ja1wiLCB7XHJcbiAgICAgICAgICAgICAgICBpZDogaWRcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICB2YXIgcGxheWVyMkxlbmd0aCA9IHJlYWRlci5yZWFkVUludDgoKTtcclxuICAgIC8vY29uc29sZS5sb2coXCJQTEFZRVIgVVBEQVRFIExFTkdUSDogXCIgKyBwbGF5ZXIyTGVuZ3RoKTtcclxuICAgIGZvciAoaSA9IDA7IGkgPCBwbGF5ZXIyTGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBpZCA9IHJlYWRlci5yZWFkVUludDMyKCk7XHJcbiAgICAgICAgdmFyIHBsYXllciA9IHRoaXMuUExBWUVSX0xJU1RbaWRdO1xyXG4gICAgICAgIGlmIChwbGF5ZXIpIHtcclxuICAgICAgICAgICAgcGxheWVyLnVwZGF0ZShyZWFkZXIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIk5PIFBMQVlFUiBBRERFRDogXCIgKyBpZCk7XHJcbiAgICAgICAgICAgIHZhciBmYWtlUGxheWVyID0gbmV3IEVudGl0eS5QbGF5ZXIobnVsbCwgdGhpcyk7XHJcbiAgICAgICAgICAgIGZha2VQbGF5ZXIudXBkYXRlKHJlYWRlcik7XHJcblxyXG4gICAgICAgICAgICB0aGlzLlBMQVlFUl9MSVNUW2lkXSA9IGZha2VQbGF5ZXI7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNvY2tldC5lbWl0KFwiZ2V0UGxheWVyXCIsIHtcclxuICAgICAgICAgICAgICAgIGlkOiBpZFxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRU1JVFRJTkcgR0VUUExBWUVSXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB2YXIgcm9jazNMZW5ndGggPSByZWFkZXIucmVhZFVJbnQxNigpOyAvL2RlbGV0ZSByb2Nrc1xyXG4gICAgZm9yIChpID0gMDsgaSA8IHJvY2szTGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBpZCA9IHJlYWRlci5yZWFkVUludDMyKCk7XHJcbiAgICAgICAgZGVsZXRlIHRoaXMuUk9DS19MSVNUW2lkXTtcclxuXHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIkRFTEVURUQgUk9DSyBOT1JNQUxMWTogXCIgKyBpZCk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHBsYXllcjNMZW5ndGggPSByZWFkZXIucmVhZFVJbnQ4KCk7XHJcbiAgICBmb3IgKGkgPSAwOyBpIDwgcGxheWVyM0xlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgaWQgPSByZWFkZXIucmVhZFVJbnQzMigpO1xyXG5cclxuICAgICAgICBjb25zb2xlLmxvZyhcIkRFTEVUSU5HIFBMQVlFUjogXCIgKyBpZCk7XHJcblxyXG4gICAgICAgIGRlbGV0ZSB0aGlzLlBMQVlFUl9MSVNUW2lkXTtcclxuICAgICAgICB2YXIgaW5kZXggPSB0aGlzLlBMQVlFUl9BUlJBWS5pbmRleE9mKGlkKTtcclxuICAgICAgICB0aGlzLlBMQVlFUl9BUlJBWS5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaGFuZGxlQmluYXJ5ID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgIHZhciByZWFkZXIgPSBuZXcgQmluYXJ5UmVhZGVyKGRhdGEpO1xyXG4gICAgaWYgKHJlYWRlci5sZW5ndGgoKSA8IDEpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB2YXIgc3RlcCA9IHJlYWRlci5yZWFkVUludDMyKCk7XHJcblxyXG4gICAgaWYgKCF0aGlzLmluaXRpYWxTdGVwKSB7XHJcbiAgICAgICAgdGhpcy5pbml0aWFsU3RlcCA9IHN0ZXA7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmICh0aGlzLmluaXRpYWxTdGVwID09PSBzdGVwKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5sYXN0U3RlcCA9IHN0ZXA7XHJcblxyXG4gICAgLy9jb25zb2xlLmxvZyhcIkxBU1QgU1RFUDogXCIgKyBzdGVwKTtcclxuXHJcbiAgICBpZiAoIXRoaXMuY3VyclN0ZXApIHtcclxuICAgICAgICB0aGlzLmN1cnJTdGVwID0gc3RlcCAtIDM7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIHRoaXMudXBkYXRlcy5wdXNoKHtcclxuICAgICAgICBzdGVwOiBzdGVwLFxyXG4gICAgICAgIHJlYWRlcjogcmVhZGVyXHJcbiAgICB9KTtcclxufTtcclxuXHJcblxyXG5DbGllbnQucHJvdG90eXBlLmhhbmRsZVBhY2tldCA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICB2YXIgcGFja2V0LCBpO1xyXG4gICAgZm9yIChpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBwYWNrZXQgPSBkYXRhW2ldO1xyXG4gICAgICAgIHN3aXRjaCAocGFja2V0Lm1hc3Rlcikge1xyXG4gICAgICAgICAgICBjYXNlIFwiYWRkXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFkZEVudGl0aWVzKHBhY2tldCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5hZGRFbnRpdGllcyA9IGZ1bmN0aW9uIChwYWNrZXQpIHtcclxuICAgIHZhciBhZGRFbnRpdHkgPSBmdW5jdGlvbiAocGFja2V0LCBsaXN0LCBlbnRpdHksIGFycmF5KSB7XHJcbiAgICAgICAgaWYgKCFwYWNrZXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsaXN0W3BhY2tldC5pZF0gPSBuZXcgZW50aXR5KHBhY2tldCwgdGhpcyk7XHJcbiAgICAgICAgaWYgKGFycmF5ICYmIGFycmF5LmluZGV4T2YocGFja2V0LmlkKSA9PT0gLTEpIHtcclxuICAgICAgICAgICAgYXJyYXkucHVzaChwYWNrZXQuaWQpO1xyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKTtcclxuXHJcbiAgICBzd2l0Y2ggKHBhY2tldC5jbGFzcykge1xyXG4gICAgICAgIGNhc2UgXCJ0aWxlSW5mb1wiOlxyXG4gICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLlRJTEVfTElTVCwgRW50aXR5LlRpbGUpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkFEREVEIFRJTEVcIik7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJzZWxmSWRcIjpcclxuICAgICAgICAgICAgaWYgKCF0aGlzLlNFTEZfSUQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuU0VMRl9JRCA9IHBhY2tldC5zZWxmSWQ7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW5VSS5nYW1lVUkub3BlbigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJjaGF0SW5mb1wiOlxyXG4gICAgICAgICAgICB0aGlzLm1haW5VSS5nYW1lVUkuY2hhdFVJLmFkZE1lc3NhZ2UocGFja2V0KTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5kcmF3U2NlbmUgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgdGhpcy5tYWluVUkudXBkYXRlTGVhZGVyQm9hcmQoKTtcclxuXHJcbiAgICB2YXIgaWQ7XHJcbiAgICB2YXIgZW50aXR5TGlzdCA9IFtcclxuICAgICAgICB0aGlzLlRJTEVfTElTVCxcclxuICAgICAgICB0aGlzLlBMQVlFUl9MSVNULFxyXG4gICAgICAgIHRoaXMuQVNURVJPSURfTElTVCxcclxuICAgICAgICB0aGlzLkFOSU1BVElPTl9MSVNULFxyXG4gICAgICAgIHRoaXMuUk9DS19MSVNUXHJcbiAgICBdO1xyXG5cclxuICAgIHZhciBpbkJvdW5kcyA9IGZ1bmN0aW9uIChwbGF5ZXIsIHgsIHkpIHtcclxuICAgICAgICB2YXIgcmFuZ2UgPSB0aGlzLm1haW5DYW52YXMud2lkdGggLyAoMC43ICogdGhpcy5zY2FsZUZhY3Rvcik7XHJcbiAgICAgICAgcmV0dXJuIHggPCAocGxheWVyLnggKyByYW5nZSkgJiYgeCA+IChwbGF5ZXIueCAtIHJhbmdlKVxyXG4gICAgICAgICAgICAmJiB5IDwgKHBsYXllci55ICsgcmFuZ2UpICYmIHkgPiAocGxheWVyLnkgLSByYW5nZSk7XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcblxyXG4gICAgdmFyIHRyYW5zbGF0ZVNjZW5lID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMubWFpbkN0eC5zZXRUcmFuc2Zvcm0oMSwgMCwgMCwgMSwgMCwgMCk7XHJcbiAgICAgICAgdGhpcy5zY2FsZUZhY3RvciA9IGxlcnAodGhpcy5zY2FsZUZhY3RvciwgdGhpcy5tYWluU2NhbGVGYWN0b3IsIDAuMyk7XHJcbiAgICAgICAgdGhpcy5tYWluQ3R4LnRyYW5zbGF0ZSh0aGlzLm1haW5DYW52YXMud2lkdGggLyAyLCB0aGlzLm1haW5DYW52YXMuaGVpZ2h0IC8gMik7XHJcbiAgICAgICAgdGhpcy5tYWluQ3R4LnNjYWxlKHRoaXMuc2NhbGVGYWN0b3IsIHRoaXMuc2NhbGVGYWN0b3IpO1xyXG4gICAgICAgIHRoaXMubWFpbkN0eC50cmFuc2xhdGUoLXRoaXMuU0VMRl9QTEFZRVIueCwgLXRoaXMuU0VMRl9QTEFZRVIueSk7XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcblxyXG5cclxuXHJcbiAgICB0aGlzLlNFTEZfUExBWUVSLnRpY2soKTtcclxuXHJcblxyXG4gICAgdHJhbnNsYXRlU2NlbmUoKTtcclxuICAgIHRoaXMubWFpbkN0eC5jbGVhclJlY3QoMCwgMCwgNTAwMDAsIDUwMDAwKTtcclxuXHJcbiAgICB0aGlzLm1haW5DdHguZmlsbFN0eWxlID0gXCIjMWQxZjIxXCI7XHJcbiAgICB0aGlzLm1haW5DdHguZmlsbFJlY3QoMCwgMCwgNTAwMDAsIDUwMDAwKTtcclxuXHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbnRpdHlMaXN0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIGxpc3QgPSBlbnRpdHlMaXN0W2ldO1xyXG4gICAgICAgIGZvciAoaWQgaW4gbGlzdCkge1xyXG4gICAgICAgICAgICB2YXIgZW50aXR5ID0gbGlzdFtpZF07XHJcbiAgICAgICAgICAgIGlmIChpbkJvdW5kcyh0aGlzLlNFTEZfUExBWUVSLCBlbnRpdHkueCwgZW50aXR5LnkpKSB7XHJcbiAgICAgICAgICAgICAgICBlbnRpdHkuc2hvdygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuVFJBSUwgJiYgIXRoaXMuYWN0aXZlKSB7XHJcbiAgICAgICAgdGhpcy5UUkFJTC5zaG93KCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLmNsaWVudFVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudXBkYXRlU3RlcCgpO1xyXG5cclxuXHJcbiAgICBpZiAoIXRoaXMuU0VMRl9QTEFZRVIpIHtcclxuICAgICAgICBpZiAodGhpcy5TRUxGX0lEKSB7XHJcbiAgICAgICAgICAgIHRoaXMuU0VMRl9QTEFZRVIgPSB0aGlzLlBMQVlFUl9MSVNUW3RoaXMuU0VMRl9JRF07XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICB0aGlzLmRyYXdTY2VuZSgpO1xyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS51cGRhdGVTdGVwID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHN0ZXBSYW5nZSA9IHRoaXMubGFzdFN0ZXAgLSB0aGlzLmN1cnJTdGVwO1xyXG4gICAgdmFyIHVwZGF0ZTtcclxuXHJcbiAgICBpZiAoIXN0ZXBSYW5nZSkge1xyXG4gICAgICAgIC8vY29uc29sZS5sb2coXCJTVEVQIFJBTkdFIFRPTyBTTUFMTDogU0VSVkVSIFRPTyBTTE9XXCIpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy5jdXJyU3RlcCA8IHRoaXMuaW5pdGlhbFN0ZXApIHtcclxuICAgICAgICB0aGlzLmN1cnJTdGVwICs9IDE7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuY3VyclN0ZXAgPiB0aGlzLmxhc3RTdGVwKSB7XHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIlNURVAgUkFOR0UgVE9PIFNNQUxMOiBTRVJWRVIgVE9PIFNMT1dcIik7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHdoaWxlICh0aGlzLmxhc3RTdGVwIC0gdGhpcy5jdXJyU3RlcCA+IDUgKyB0aGlzLmN1cnJQaW5nIC8gNTApIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlNURVAgUkFOR0UgVE9PIExBUkdFOiBDTElFTlQgSVMgVE9PIFNMT1cgRk9SIFNURVA6IFwiICsgdGhpcy5jdXJyU3RlcCk7XHJcbiAgICAgICAgdXBkYXRlID0gdGhpcy5maW5kVXBkYXRlUGFja2V0KHRoaXMuY3VyclN0ZXApO1xyXG4gICAgICAgIGlmICghdXBkYXRlKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVVBEQVRFIE5PVCBGT1VORCEhISFcIik7XHJcbiAgICAgICAgICAgIHRoaXMuY3VyclN0ZXAgKz0gMTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodXBkYXRlLnJlYWRlci5fb2Zmc2V0ID4gMTApIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJPRkZTRVQgSVMgVE9PIExBUkdFXCIpO1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJTdGVwICs9IDE7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuYXBwbHlVcGRhdGUodXBkYXRlLnJlYWRlcik7XHJcbiAgICAgICAgdGhpcy5jdXJyU3RlcCArPSAxO1xyXG4gICAgfSAvL3RvbyBzbG93XHJcblxyXG4gICAgdXBkYXRlID0gdGhpcy5maW5kVXBkYXRlUGFja2V0KHRoaXMuY3VyclN0ZXApO1xyXG4gICAgaWYgKCF1cGRhdGUpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIkNBTk5PVCBGSU5EIFVQREFURSBGT1IgU1RFUDogXCIgKyB0aGlzLmN1cnJTdGVwKTtcclxuICAgICAgICB0aGlzLmN1cnJTdGVwICs9IDE7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgaWYgKHVwZGF0ZS5yZWFkZXIuX29mZnNldCA+IDEwKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJPRkZTRVQgSVMgVE9PIExBUkdFIEZPUiBTVEVQOiBcIiArIHRoaXMuY3VyclN0ZXApO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKHRoaXMudXBkYXRlc1swXSk7XHJcbiAgICAgICAgdGhpcy5jdXJyU3RlcCArPSAxO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHRoaXMuYXBwbHlVcGRhdGUodXBkYXRlLnJlYWRlcik7XHJcbiAgICB0aGlzLmN1cnJTdGVwICs9IDE7XHJcbn07XHJcblxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5maW5kVXBkYXRlUGFja2V0ID0gZnVuY3Rpb24gKHN0ZXApIHtcclxuICAgIHZhciBsZW5ndGggPSB0aGlzLnVwZGF0ZXMubGVuZ3RoO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSBsZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgICAgIHZhciB1cGRhdGUgPSB0aGlzLnVwZGF0ZXNbaV07XHJcblxyXG4gICAgICAgIGlmICh1cGRhdGUuc3RlcCA9PT0gc3RlcCkge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZXMuc3BsaWNlKDAsIGkpO1xyXG4gICAgICAgICAgICByZXR1cm4gdXBkYXRlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGNvbnNvbGUubG9nKCdDT1VMRCBOT1QgRklORCBQQUNLRVQgRk9SIFNURVA6ICcgKyBzdGVwKTtcclxuICAgIGNvbnNvbGUubG9nKHRoaXMudXBkYXRlc1swXSk7XHJcbiAgICBjb25zb2xlLmxvZyh0aGlzLnVwZGF0ZXNbMV0pO1xyXG4gICAgY29uc29sZS5sb2codGhpcy51cGRhdGVzWzJdKTtcclxuXHJcblxyXG4gICAgcmV0dXJuIG51bGw7XHJcbn07XHJcblxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHNldEludGVydmFsKHRoaXMuY2xpZW50VXBkYXRlLmJpbmQodGhpcyksIDEwMDAgLyAyOCk7XHJcbn07XHJcblxyXG5mdW5jdGlvbiBsZXJwKGEsIGIsIHJhdGlvKSB7XHJcbiAgICByZXR1cm4gYSArIHJhdGlvICogKGIgLSBhKTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIHNxdWFyZShhKSB7XHJcbiAgICByZXR1cm4gYSAqIGE7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHZlY3Rvck5vcm1hbChhKSB7XHJcbiAgICByZXR1cm4gYS54ICogYS54ICsgYS55ICogYS55O1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENsaWVudDsiLCJmdW5jdGlvbiBBbmltYXRpb24oYW5pbWF0aW9uSW5mbywgY2xpZW50KSB7XHJcblxyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbiAgICB0aGlzLnR5cGUgPSBhbmltYXRpb25JbmZvLnR5cGU7XHJcbiAgICB0aGlzLmlkID0gYW5pbWF0aW9uSW5mby5pZDtcclxuICAgIHRoaXMueCA9IGFuaW1hdGlvbkluZm8ueDtcclxuICAgIHRoaXMueSA9IGFuaW1hdGlvbkluZm8ueTtcclxuICAgIC8vdGhpcy50aGV0YSA9IDE1O1xyXG4gICAgdGhpcy50aW1lciA9IGdldFJhbmRvbSgxMCwgMTQpO1xyXG5cclxuICAgIGlmICh0aGlzLnR5cGUgPT09IFwic2xhc2hcIikge1xyXG4gICAgICAgIHRoaXMuc2xhc2hJZCA9IGFuaW1hdGlvbkluZm8uc2xhc2hJZDtcclxuICAgICAgICB2YXIgc2xhc2ggPSB0aGlzLmNsaWVudC5maW5kU2xhc2godGhpcy5zbGFzaElkKTtcclxuICAgICAgICB0aGlzLnByZSA9IHNsYXNoWzBdO1xyXG4gICAgICAgIHRoaXMucG9zdCA9IHNsYXNoWzFdO1xyXG4gICAgfVxyXG59XHJcblxyXG5cclxuQW5pbWF0aW9uLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50Lm1haW5DdHg7XHJcbiAgICB2YXIgcGxheWVyID0gdGhpcy5jbGllbnQuU0VMRl9QTEFZRVI7XHJcblxyXG4gICAgaWYgKHRoaXMudHlwZSA9PT0gXCJzbGFzaFwiICYmIHBsYXllcikge1xyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuXHJcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJyZ2JhKDI0MiwgMzEsIDY2LCAwLjYpXCI7XHJcbiAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDE1O1xyXG5cclxuICAgICAgICBjdHgubW92ZVRvKHBsYXllci54ICsgdGhpcy5wcmUueCwgcGxheWVyLnkgKyB0aGlzLnByZS55KTtcclxuICAgICAgICBjdHgubGluZVRvKHBsYXllci54ICsgdGhpcy5wb3N0LngsIHBsYXllci55ICsgdGhpcy5wb3N0LnkpO1xyXG5cclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfVxyXG4gICAgXHJcblxyXG4gICAgaWYgKHRoaXMudHlwZSA9PT0gXCJzaGFyZERlYXRoXCIpIHsgLy9kZXByZWNhdGVkIGJ1dCBjb3VsZCBwdWxsIHNvbWUgZ29vZCBjb2RlIGZyb20gaGVyZVxyXG4gICAgICAgIGN0eC5mb250ID0gNjAgLSB0aGlzLnRpbWVyICsgXCJweCBBcmlhbFwiO1xyXG4gICAgICAgIGN0eC5zYXZlKCk7XHJcbiAgICAgICAgY3R4LnRyYW5zbGF0ZSh0aGlzLngsIHRoaXMueSk7XHJcbiAgICAgICAgY3R4LnJvdGF0ZSgtTWF0aC5QSSAvIDUwICogdGhpcy50aGV0YSk7XHJcbiAgICAgICAgY3R4LnRleHRBbGlnbiA9IFwiY2VudGVyXCI7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwicmdiYSgyNTUsIDE2OCwgODYsIFwiICsgdGhpcy50aW1lciAqIDEwIC8gMTAwICsgXCIpXCI7XHJcbiAgICAgICAgY3R4LmZpbGxUZXh0KHRoaXMubmFtZSwgMCwgMTUpO1xyXG4gICAgICAgIGN0eC5yZXN0b3JlKCk7XHJcblxyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcIiMwMDAwMDBcIjtcclxuICAgICAgICB0aGlzLnRoZXRhID0gbGVycCh0aGlzLnRoZXRhLCAwLCAwLjA4KTtcclxuICAgICAgICB0aGlzLnggPSBsZXJwKHRoaXMueCwgdGhpcy5lbmRYLCAwLjEpO1xyXG4gICAgICAgIHRoaXMueSA9IGxlcnAodGhpcy55LCB0aGlzLmVuZFksIDAuMSk7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIHRoaXMudGltZXItLTtcclxuICAgIGlmICh0aGlzLnRpbWVyIDw9IDApIHtcclxuICAgICAgICBkZWxldGUgdGhpcy5jbGllbnQuQU5JTUFUSU9OX0xJU1RbdGhpcy5pZF07XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0UmFuZG9tKG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluO1xyXG59XHJcblxyXG5mdW5jdGlvbiBsZXJwKGEsIGIsIHJhdGlvKSB7XHJcbiAgICByZXR1cm4gYSArIHJhdGlvICogKGIgLSBhKTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBbmltYXRpb247XHJcblxyXG5cclxuIiwiZnVuY3Rpb24gTWluaU1hcCgpIHsgLy9kZXByZWNhdGVkLCBwbGVhc2UgdXBkYXRlXHJcbn1cclxuXHJcbk1pbmlNYXAucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBpZiAobWFwVGltZXIgPD0gMCB8fCBzZXJ2ZXJNYXAgPT09IG51bGwpIHtcclxuICAgICAgICB2YXIgdGlsZUxlbmd0aCA9IE1hdGguc3FydChPYmplY3Quc2l6ZShUSUxFX0xJU1QpKTtcclxuICAgICAgICBpZiAodGlsZUxlbmd0aCA9PT0gMCB8fCAhc2VsZlBsYXllcikge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBpbWdEYXRhID0gbWFpbkN0eC5jcmVhdGVJbWFnZURhdGEodGlsZUxlbmd0aCwgdGlsZUxlbmd0aCk7XHJcbiAgICAgICAgdmFyIHRpbGU7XHJcbiAgICAgICAgdmFyIHRpbGVSR0I7XHJcbiAgICAgICAgdmFyIGkgPSAwO1xyXG5cclxuXHJcbiAgICAgICAgZm9yICh2YXIgaWQgaW4gVElMRV9MSVNUKSB7XHJcbiAgICAgICAgICAgIHRpbGVSR0IgPSB7fTtcclxuICAgICAgICAgICAgdGlsZSA9IFRJTEVfTElTVFtpZF07XHJcbiAgICAgICAgICAgIGlmICh0aWxlLmNvbG9yICYmIHRpbGUuYWxlcnQgfHwgaW5Cb3VuZHMoc2VsZlBsYXllciwgdGlsZS54LCB0aWxlLnkpKSB7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLnIgPSB0aWxlLmNvbG9yLnI7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLmcgPSB0aWxlLmNvbG9yLmc7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLmIgPSB0aWxlLmNvbG9yLmI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLnIgPSAwO1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5nID0gMDtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuYiA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGltZ0RhdGEuZGF0YVtpXSA9IHRpbGVSR0IucjtcclxuICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2kgKyAxXSA9IHRpbGVSR0IuZztcclxuICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2kgKyAyXSA9IHRpbGVSR0IuYjtcclxuICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2kgKyAzXSA9IDI1NTtcclxuICAgICAgICAgICAgaSArPSA0O1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zb2xlLmxvZyg0MDAgLyBPYmplY3Quc2l6ZShUSUxFX0xJU1QpKTtcclxuICAgICAgICBpbWdEYXRhID0gc2NhbGVJbWFnZURhdGEoaW1nRGF0YSwgTWF0aC5mbG9vcig0MDAgLyBPYmplY3Quc2l6ZShUSUxFX0xJU1QpKSwgbWFpbkN0eCk7XHJcblxyXG4gICAgICAgIG1NYXBDdHgucHV0SW1hZ2VEYXRhKGltZ0RhdGEsIDAsIDApO1xyXG5cclxuICAgICAgICBtTWFwQ3R4Um90LnJvdGF0ZSg5MCAqIE1hdGguUEkgLyAxODApO1xyXG4gICAgICAgIG1NYXBDdHhSb3Quc2NhbGUoMSwgLTEpO1xyXG4gICAgICAgIG1NYXBDdHhSb3QuZHJhd0ltYWdlKG1NYXAsIDAsIDApO1xyXG4gICAgICAgIG1NYXBDdHhSb3Quc2NhbGUoMSwgLTEpO1xyXG4gICAgICAgIG1NYXBDdHhSb3Qucm90YXRlKDI3MCAqIE1hdGguUEkgLyAxODApO1xyXG5cclxuICAgICAgICBzZXJ2ZXJNYXAgPSBtTWFwUm90O1xyXG4gICAgICAgIG1hcFRpbWVyID0gMjU7XHJcbiAgICB9XHJcblxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgbWFwVGltZXIgLT0gMTtcclxuICAgIH1cclxuXHJcbiAgICBtYWluQ3R4LmRyYXdJbWFnZShzZXJ2ZXJNYXAsIDgwMCwgNDAwKTtcclxufTsgLy9kZXByZWNhdGVkXHJcblxyXG5NaW5pTWFwLnByb3RvdHlwZS5zY2FsZUltYWdlRGF0YSA9IGZ1bmN0aW9uIChpbWFnZURhdGEsIHNjYWxlLCBtYWluQ3R4KSB7XHJcbiAgICB2YXIgc2NhbGVkID0gbWFpbkN0eC5jcmVhdGVJbWFnZURhdGEoaW1hZ2VEYXRhLndpZHRoICogc2NhbGUsIGltYWdlRGF0YS5oZWlnaHQgKiBzY2FsZSk7XHJcbiAgICB2YXIgc3ViTGluZSA9IG1haW5DdHguY3JlYXRlSW1hZ2VEYXRhKHNjYWxlLCAxKS5kYXRhO1xyXG4gICAgZm9yICh2YXIgcm93ID0gMDsgcm93IDwgaW1hZ2VEYXRhLmhlaWdodDsgcm93KyspIHtcclxuICAgICAgICBmb3IgKHZhciBjb2wgPSAwOyBjb2wgPCBpbWFnZURhdGEud2lkdGg7IGNvbCsrKSB7XHJcbiAgICAgICAgICAgIHZhciBzb3VyY2VQaXhlbCA9IGltYWdlRGF0YS5kYXRhLnN1YmFycmF5KFxyXG4gICAgICAgICAgICAgICAgKHJvdyAqIGltYWdlRGF0YS53aWR0aCArIGNvbCkgKiA0LFxyXG4gICAgICAgICAgICAgICAgKHJvdyAqIGltYWdlRGF0YS53aWR0aCArIGNvbCkgKiA0ICsgNFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICBmb3IgKHZhciB4ID0gMDsgeCA8IHNjYWxlOyB4KyspIHN1YkxpbmUuc2V0KHNvdXJjZVBpeGVsLCB4ICogNClcclxuICAgICAgICAgICAgZm9yICh2YXIgeSA9IDA7IHkgPCBzY2FsZTsgeSsrKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGVzdFJvdyA9IHJvdyAqIHNjYWxlICsgeTtcclxuICAgICAgICAgICAgICAgIHZhciBkZXN0Q29sID0gY29sICogc2NhbGU7XHJcbiAgICAgICAgICAgICAgICBzY2FsZWQuZGF0YS5zZXQoc3ViTGluZSwgKGRlc3RSb3cgKiBzY2FsZWQud2lkdGggKyBkZXN0Q29sKSAqIDQpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHNjYWxlZDtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTWluaU1hcDsiLCJmdW5jdGlvbiBQbGF5ZXIocmVhZGVyLCBjbGllbnQpIHtcclxuICAgIGlmICghcmVhZGVyKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJNQUtJTkcgTkVXIEZBS0UgUExBWUVSXCIpO1xyXG4gICAgICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgICAgIHJldHVybjsgLy9mb3IgZmFrZSByb2NrIHB1cnBvc2VzXHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5pZCA9IHJlYWRlci5yZWFkVUludDMyKCk7IC8vcGxheWVyIGlkXHJcbiAgICB0aGlzLnggPSByZWFkZXIucmVhZFVJbnQzMigpIC8gMTAwOyAvL3JlYWwgeFxyXG4gICAgdGhpcy55ID0gcmVhZGVyLnJlYWRVSW50MzIoKSAvIDEwMDsgLy9yZWFsIHlcclxuXHJcbiAgICB0aGlzLnJhZGl1cyA9IHJlYWRlci5yZWFkVUludDE2KCk7IC8vcmFkaXVzXHJcblxyXG4gICAgdmFyIG5hbWVMZW5ndGggPSByZWFkZXIucmVhZFVJbnQ4KCk7XHJcbiAgICB2YXIgbmFtZSA9IFwiXCI7XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuYW1lTGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgY2hhciA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmVhZGVyLnJlYWRVSW50OCgpKTtcclxuICAgICAgICBuYW1lICs9IGNoYXI7XHJcbiAgICB9XHJcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xyXG5cclxuICAgIHRoaXMudmVydGljZXMgPSBbXTsgICAgICAgICAgICAvL3ZlcnRpY2VzXHJcbiAgICB2YXIgY291bnQgPSByZWFkZXIucmVhZFVJbnQ4KCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcclxuICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0gW107XHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXVswXSA9IHJlYWRlci5yZWFkSW50MTYoKSAvIDEwMDA7XHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXVsxXSA9IHJlYWRlci5yZWFkSW50MTYoKSAvIDEwMDA7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5oZWFsdGggPSByZWFkZXIucmVhZFVJbnQxNigpOyAvL2hlYWx0aFxyXG4gICAgdGhpcy5tYXhIZWFsdGggPSByZWFkZXIucmVhZFVJbnQxNigpOyAvL21heEhlYWx0aFxyXG5cclxuICAgIHRoaXMudGhldGEgPSByZWFkZXIucmVhZEludDE2KCkgLyAxMDA7IC8vdGhldGFcclxuICAgIHRoaXMubGV2ZWwgPSByZWFkZXIucmVhZFVJbnQ4KCk7IC8vbGV2ZWxcclxuXHJcbiAgICBzd2l0Y2ggKHJlYWRlci5yZWFkVUludDgoKSkgeyAgICAvL2ZsYWdzXHJcbiAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICB0aGlzLnZ1bG5lcmFibGUgPSB0cnVlO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDE2OlxyXG4gICAgICAgICAgICB0aGlzLnNob290aW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAxNzpcclxuICAgICAgICAgICAgdGhpcy52dWxuZXJhYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5zaG9vdGluZyA9IHRydWU7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG5cclxuICAgIGlmICghdGhpcy5jbGllbnQuU0VMRl9QTEFZRVIgJiYgdGhpcy5pZCA9PT0gdGhpcy5jbGllbnQuU0VMRl9JRCkge1xyXG4gICAgICAgIHRoaXMuY2xpZW50LlNFTEZfUExBWUVSID0gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLm1vdmVyID0ge1xyXG4gICAgICAgIHg6IDAsXHJcbiAgICAgICAgeTogMFxyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLnJlYWxNb3ZlciA9IHtcclxuICAgICAgICB4OiAwLFxyXG4gICAgICAgIHk6IDBcclxuICAgIH07XHJcbn1cclxuXHJcblxyXG5QbGF5ZXIucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIChyZWFkZXIpIHtcclxuICAgIHRoaXMudXBkYXRlVGltZXIgPSA1MDtcclxuICAgIHRoaXMueCA9IHJlYWRlci5yZWFkVUludDMyKCkgLyAxMDA7IC8vcmVhbCB4XHJcbiAgICB0aGlzLnkgPSByZWFkZXIucmVhZFVJbnQzMigpIC8gMTAwOyAvL3JlYWwgeVxyXG5cclxuICAgIHRoaXMucmVhbFJhZGl1cyA9IHJlYWRlci5yZWFkVUludDE2KCk7IC8vcmFkaXVzXHJcblxyXG4gICAgaWYgKHRoaXMuaWQgPT09IHRoaXMuY2xpZW50LlNFTEZfSUQpIHtcclxuICAgICAgICAvL3RoaXMuY2xpZW50Lm1haW5TY2FsZUZhY3RvciA9IDUwIC8gdGhpcy5yZWFsUmFkaXVzO1xyXG4gICAgfVxyXG4gICAgdGhpcy5oZWFsdGggPSByZWFkZXIucmVhZFVJbnQxNigpOyAvL2hlYWx0aFxyXG4gICAgdGhpcy5tYXhIZWFsdGggPSByZWFkZXIucmVhZFVJbnQxNigpOyAvL21heEhlYWx0aFxyXG5cclxuICAgIHRoaXMudGhldGEgPSByZWFkZXIucmVhZEludDE2KCkgLyAxMDA7IC8vdGhldGFcclxuICAgIHRoaXMubGV2ZWwgPSByZWFkZXIucmVhZFVJbnQ4KCk7IC8vbGV2ZWxcclxuXHJcbiAgICB2YXIgZmxhZ3MgPSByZWFkZXIucmVhZFVJbnQxNigpO1xyXG5cclxuICAgIHRoaXMuc2hvb3RpbmcgPSBOdW1iZXIoU3RyaW5nKGZsYWdzKS5jaGFyQXQoMCkpID09PSAxO1xyXG4gICAgdGhpcy52dWxuZXJhYmxlID0gTnVtYmVyKFN0cmluZyhmbGFncykuY2hhckF0KDEpKSA9PT0gMTtcclxuICAgIHRoaXMuY29sbGlkaW5nID0gTnVtYmVyKFN0cmluZyhmbGFncykuY2hhckF0KDIpKSA9PT0gMTtcclxuXHJcbn07XHJcblxyXG5cclxuUGxheWVyLnByb3RvdHlwZS50aWNrID0gZnVuY3Rpb24gKCkge1xyXG4gICAgaWYgKHRoaXMucmVhbE1vdmVyKSB7XHJcbiAgICAgICAgdGhpcy5tb3Zlci54ID0gbGVycCh0aGlzLm1vdmVyLngsIHRoaXMucmVhbE1vdmVyLngsIDAuMTUpO1xyXG4gICAgICAgIHRoaXMubW92ZXIueSA9IGxlcnAodGhpcy5tb3Zlci55LCB0aGlzLnJlYWxNb3Zlci55LCAwLjE1KTtcclxuICAgIH1cclxuICAgIC8vdGhpcy5tb3ZlKHRoaXMubW92ZXIueCwgdGhpcy5tb3Zlci55KTtcclxufTtcclxuXHJcblxyXG5QbGF5ZXIucHJvdG90eXBlLnNldE1vdmUgPSBmdW5jdGlvbiAoeCwgeSkge1xyXG4gICAgdGhpcy5yZWFsTW92ZXIgPSB7XHJcbiAgICAgICAgeDogeCxcclxuICAgICAgICB5OiB5XHJcbiAgICB9O1xyXG59O1xyXG5cclxuXHJcblBsYXllci5wcm90b3R5cGUuZ2V0VGhldGEgPSBmdW5jdGlvbiAodGFyZ2V0LCBvcmlnaW4pIHtcclxuICAgIHRoaXMudGhldGEgPSBNYXRoLmF0YW4yKHRhcmdldC55IC0gb3JpZ2luLnksIHRhcmdldC54IC0gb3JpZ2luLngpICUgKDIgKiBNYXRoLlBJKTtcclxufTtcclxuXHJcblBsYXllci5wcm90b3R5cGUubW92ZSA9IGZ1bmN0aW9uICh4LCB5KSB7XHJcbiAgICB2YXIgdGFyZ2V0ID0ge1xyXG4gICAgICAgIHg6IHRoaXMueCArIHgsXHJcbiAgICAgICAgeTogdGhpcy55ICsgeVxyXG4gICAgfTtcclxuICAgIHZhciBvcmlnaW4gPSB7XHJcbiAgICAgICAgeDogdGhpcy54LFxyXG4gICAgICAgIHk6IHRoaXMueVxyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLmdldFRoZXRhKHRhcmdldCwgb3JpZ2luKTtcclxuXHJcblxyXG4gICAgdmFyIG5vcm1hbFZlbCA9IG5vcm1hbCh4LCB5KTtcclxuICAgIGlmIChub3JtYWxWZWwgPCAxKSB7XHJcbiAgICAgICAgbm9ybWFsVmVsID0gMTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgdmVsQnVmZmVyID0gMzsgLy9jaGFuZ2Ugc29vblxyXG5cclxuICAgIHRoaXMueCArPSAxMDAgKiB4IC8gbm9ybWFsVmVsIC8gdmVsQnVmZmVyO1xyXG4gICAgdGhpcy55ICs9IDEwMCAqIHkgLyBub3JtYWxWZWwgLyB2ZWxCdWZmZXI7XHJcblxyXG59O1xyXG5cclxuXHJcblBsYXllci5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmICghdGhpcy5yYWRpdXMpIHtcclxuICAgICAgICB0aGlzLnJhZGl1cyA9IDE7XHJcbiAgICB9XHJcbiAgICB0aGlzLnJhZGl1cyA9IGxlcnAodGhpcy5yYWRpdXMsIHRoaXMucmVhbFJhZGl1cywgMC4yKTtcclxuICAgIHRoaXMudXBkYXRlVGltZXIgLT0gMTtcclxuICAgIGlmICh0aGlzLnVwZGF0ZVRpbWVyIDw9IDApIHtcclxuICAgICAgICBkZWxldGUgdGhpcy5jbGllbnQuUExBWUVSX0xJU1RbdGhpcy5pZF07XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50Lm1haW5DdHg7XHJcbiAgICB2YXIgZmlsbEFscGhhO1xyXG4gICAgdmFyIHN0cm9rZUFscGhhO1xyXG4gICAgdmFyIGk7XHJcblxyXG5cclxuICAgIGZpbGxBbHBoYSA9IHRoaXMuaGVhbHRoIC8gKDQgKiB0aGlzLm1heEhlYWx0aCk7XHJcbiAgICBzdHJva2VBbHBoYSA9IDE7XHJcblxyXG4gICAgY3R4LmZvbnQgPSBcIjIwcHggQXJpYWxcIjtcclxuXHJcblxyXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gXCJyZ2JhKDI1MiwgMTAyLCAzNyxcIiArIHN0cm9rZUFscGhhICsgXCIpXCI7XHJcbiAgICBpZiAodGhpcy5zaG9vdGluZykge1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcImdyZWVuXCI7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmICh0aGlzLnZ1bG5lcmFibGUpIHtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJyZWRcIjtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcInJnYmEoMTIzLDAsMCxcIiArIGZpbGxBbHBoYSArIFwiKVwiO1xyXG4gICAgfVxyXG4gICAgY3R4LmxpbmVXaWR0aCA9IDEwO1xyXG5cclxuXHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcblxyXG4gICAgY3R4LnRyYW5zbGF0ZSh0aGlzLngsIHRoaXMueSk7XHJcbiAgICBjdHgucm90YXRlKHRoaXMudGhldGEpO1xyXG5cclxuICAgIGlmICh0aGlzLnZlcnRpY2VzKSB7XHJcbiAgICAgICAgdmFyIHYgPSB0aGlzLnZlcnRpY2VzO1xyXG4gICAgICAgIGN0eC5tb3ZlVG8odlswXVswXSAqIHRoaXMucmFkaXVzLCB2WzBdWzFdICogdGhpcy5yYWRpdXMpO1xyXG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCB2Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGN0eC5saW5lVG8odltpXVswXSAqIHRoaXMucmFkaXVzLCB2W2ldWzFdICogdGhpcy5yYWRpdXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjdHgubGluZVRvKHZbMF1bMF0gKiB0aGlzLnJhZGl1cywgdlswXVsxXSAqIHRoaXMucmFkaXVzKTtcclxuICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCAzMCwgMzApO1xyXG4gICAgfVxyXG4gICAgY3R4LmZpbGwoKTtcclxuICAgIGN0eC5zdHJva2UoKTtcclxuXHJcbiAgICBjdHgucm90YXRlKDIgKiBNYXRoLlBJIC0gdGhpcy50aGV0YSk7XHJcblxyXG5cclxuICAgIGlmICghdGhpcy52dWxuZXJhYmxlKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuaGVhbHRoID4gdGhpcy5tYXhIZWFsdGggLyAyKSB7XHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBcInJnYmEoMCwgMjU1LCAwLCAwLjMpXCI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDI1NSwgMCwgMCwgMC4zKVwiO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY3R4LmFyYygwLCAwLCB0aGlzLnJhZGl1cyAqIDIsIDAsIDIgKiBNYXRoLlBJKTtcclxuICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGN0eC50cmFuc2xhdGUoLXRoaXMueCwgLXRoaXMueSk7XHJcblxyXG5cclxuICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuXHJcblxyXG4gICAgY3R4LmZpbGxTdHlsZSA9IFwiI2ZmOWQ2MFwiO1xyXG4gICAgY3R4LmZpbGxUZXh0KHRoaXMubmFtZSwgdGhpcy54LCB0aGlzLnkgKyA3MCk7XHJcblxyXG5cclxuICAgIGlmICh0aGlzLmhlYWx0aCAmJiB0aGlzLm1heEhlYWx0aCAmJiB0aGlzLmhlYWx0aCA+IDApIHsgLy9oZWFsdGggYmFyXHJcbiAgICAgICAgaWYgKHRoaXMuaGVhbHRoID4gdGhpcy5tYXhIZWFsdGgpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJQTEFZRVIgSEFTIFRPTyBNVUNIIEhFQUxUSDogXCIgKyB0aGlzLmhlYWx0aCwgdGhpcy5tYXhIZWFsdGgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjdHgubGluZVdpZHRoID0gMTA7XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiYmxhY2tcIjtcclxuICAgICAgICBjdHgucmVjdCh0aGlzLnggLSA0MDAsIHRoaXMueSArIDIwMCwgODAwLCAxMDApO1xyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcblxyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJncmVlblwiO1xyXG4gICAgICAgIGN0eC5yZWN0KHRoaXMueCAtIDQwMCwgdGhpcy55ICsgMjAwLCA4MDAgKiB0aGlzLmhlYWx0aCAvIHRoaXMubWF4SGVhbHRoLCAxMDApO1xyXG4gICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfSAvL2Rpc3BsYXkgaGVhbHRoIGJhclxyXG5cclxuXHJcbiAgICBjdHguY2xvc2VQYXRoKCk7XHJcbn07XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0UmFuZG9tKG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gbm9ybWFsKHgsIHkpIHtcclxuICAgIHJldHVybiBNYXRoLnNxcnQoeCAqIHggKyB5ICogeSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxlcnAoYSwgYiwgcmF0aW8pIHtcclxuICAgIHJldHVybiBhICsgcmF0aW8gKiAoYiAtIGEpO1xyXG59XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQbGF5ZXI7IiwiZnVuY3Rpb24gUm9jayhyZWFkZXIsIGNsaWVudCkge1xyXG4gICAgaWYgKCFyZWFkZXIpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIk1BS0lORyBORVcgRkFLRSBST0NLXCIpO1xyXG4gICAgICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgICAgIHJldHVybjsgLy9mb3IgZmFrZSByb2NrIHB1cnBvc2VzXHJcbiAgICB9XHJcbiAgICB2YXIgcHJldiA9IHJlYWRlci5fb2Zmc2V0O1xyXG5cclxuXHJcbiAgICB0aGlzLmlkID0gcmVhZGVyLnJlYWRVSW50MzIoKTtcclxuICAgIC8vY29uc29sZS5sb2coXCJORVcgUk9DSzogXCIgKyB0aGlzLmlkKTtcclxuXHJcbiAgICB0aGlzLm93bmVyID0gcmVhZGVyLnJlYWRVSW50MzIoKTtcclxuICAgIHRoaXMueCA9IHJlYWRlci5yZWFkVUludDMyKCkgLyAxMDA7XHJcbiAgICB0aGlzLnkgPSByZWFkZXIucmVhZFVJbnQzMigpIC8gMTAwO1xyXG5cclxuICAgIHRoaXMudmVydGljZXMgPSBbXTtcclxuICAgIHZhciBjb3VudCA9IHJlYWRlci5yZWFkVUludDE2KCk7XHJcbiAgICAvL2NvbnNvbGUubG9nKFwiQ09VTlQ6IFwiICsgY291bnQpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IFtdO1xyXG4gICAgICAgIHRoaXMudmVydGljZXNbaV1bMF0gPSByZWFkZXIucmVhZEludDE2KCkgLyAxMDAwO1xyXG4gICAgICAgIHRoaXMudmVydGljZXNbaV1bMV0gPSByZWFkZXIucmVhZEludDE2KCkgLyAxMDAwO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuaGVhbHRoID0gcmVhZGVyLnJlYWRJbnQxNigpO1xyXG4gICAgdGhpcy5tYXhIZWFsdGggPSByZWFkZXIucmVhZEludDE2KCk7XHJcblxyXG4gICAgdGhpcy50aGV0YSA9IHJlYWRlci5yZWFkSW50MTYoKSAvIDEwMDtcclxuICAgIHRoaXMudGV4dHVyZSA9IHJlYWRlci5yZWFkVUludDgoKTtcclxuXHJcbiAgICBzd2l0Y2ggKHJlYWRlci5yZWFkVUludDgoKSkge1xyXG4gICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgdGhpcy5uZXV0cmFsID0gdHJ1ZTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAxNjpcclxuICAgICAgICAgICAgdGhpcy5mYXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAxNzpcclxuICAgICAgICAgICAgdGhpcy5uZXV0cmFsID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5mYXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgICB2YXIgZGVsdGEgPSByZWFkZXIuX29mZnNldCAtIHByZXY7XHJcbiAgICB0aGlzLnVwZGF0ZXMgPSBbXTtcclxuICAgIHRoaXMudXBkYXRlVGltZXIgPSAyMDtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5cclxuUm9jay5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKHJlYWRlcikge1xyXG4gICAgdGhpcy5vd25lciA9IHJlYWRlci5yZWFkVUludDMyKCk7XHJcblxyXG4gICAgdmFyIHggPSB0aGlzLng7XHJcbiAgICB2YXIgeSA9IHRoaXMueTtcclxuXHJcbiAgICB0aGlzLnggPSByZWFkZXIucmVhZFVJbnQzMigpIC8gMTAwO1xyXG4gICAgdGhpcy55ID0gcmVhZGVyLnJlYWRVSW50MzIoKSAvIDEwMDtcclxuXHJcbiAgICBpZiAodGhpcy54ICE9PSB4ICYmIHRoaXMueSAhPT0geSkge1xyXG4gICAgICAgIHRoaXMudXBkYXRlVGltZXIgPSAyMDtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmhlYWx0aCA9IHJlYWRlci5yZWFkSW50MTYoKTtcclxuICAgIHRoaXMubWF4SGVhbHRoID0gcmVhZGVyLnJlYWRJbnQxNigpO1xyXG5cclxuICAgIHRoaXMudGhldGEgPSByZWFkZXIucmVhZEludDE2KCkgLyAxMDA7XHJcblxyXG4gICAgdGhpcy5uZXV0cmFsID0gZmFsc2U7XHJcbiAgICB0aGlzLmZhc3QgPSBmYWxzZTtcclxuICAgIHN3aXRjaCAocmVhZGVyLnJlYWRVSW50OCgpKSB7IC8vZmxhZ3NcclxuICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgIHRoaXMubmV1dHJhbCA9IHRydWU7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMTY6XHJcbiAgICAgICAgICAgIHRoaXMuZmFzdCA9IHRydWU7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMTc6XHJcbiAgICAgICAgICAgIHRoaXMubmV1dHJhbCA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuZmFzdCA9IHRydWU7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcblJvY2sucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnVwZGF0ZVRpbWVyIC09IDE7XHJcbiAgICBpZiAodGhpcy51cGRhdGVUaW1lciA8PSAwKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJERUxFVElORyBST0NLIFZJQSBUSU1FT1VUOiBcIiArIHRoaXMuaWQpO1xyXG4gICAgICAgIGRlbGV0ZSB0aGlzLmNsaWVudC5ST0NLX0xJU1RbdGhpcy5pZF07XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5tYWluQ3R4O1xyXG4gICAgdmFyIFNDQUxFID0gMTAwO1xyXG5cclxuXHJcbiAgICBjdHguZmlsbFN0eWxlID0gXCJwaW5rXCI7IC8vZGVmYXVsdCBjb2xvclxyXG4gICAgc3dpdGNoICh0aGlzLnRleHR1cmUpIHtcclxuICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBcImJyb3duXCI7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiZ3JleVwiO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDM6XHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBcInllbGxvd1wiO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDQ6XHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBcImdyZWVuXCI7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSAhdGhpcy5vd25lciA/IFwiYmx1ZVwiIDogXCJncmVlblwiO1xyXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gdGhpcy5mYXN0ID8gXCJyZWRcIiA6IGN0eC5zdHJva2VTdHlsZTtcclxuXHJcblxyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG5cclxuICAgIGN0eC50cmFuc2xhdGUodGhpcy54LCB0aGlzLnkpO1xyXG4gICAgY3R4LnJvdGF0ZSh0aGlzLnRoZXRhKTtcclxuXHJcbiAgICBpZiAodGhpcy52ZXJ0aWNlcykge1xyXG4gICAgICAgIHZhciB2ID0gdGhpcy52ZXJ0aWNlcztcclxuICAgICAgICBjdHgubW92ZVRvKHZbMF1bMF0gKiBTQ0FMRSwgdlswXVsxXSAqIFNDQUxFKTtcclxuXHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCB2Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGN0eC5saW5lVG8odltpXVswXSAqIFNDQUxFLCB2W2ldWzFdICogU0NBTEUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjdHgubGluZVRvKHZbMF1bMF0gKiBTQ0FMRSwgdlswXVsxXSAqIFNDQUxFKTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCAzMCwgMzApO1xyXG4gICAgfVxyXG5cclxuICAgIGN0eC5maWxsKCk7XHJcbiAgICBjdHguc3Ryb2tlKCk7XHJcblxyXG4gICAgY3R4LnJvdGF0ZSgyICogTWF0aC5QSSAtIHRoaXMudGhldGEpO1xyXG4gICAgY3R4LnRyYW5zbGF0ZSgtdGhpcy54LCAtdGhpcy55KTtcclxuXHJcbiAgICBjdHguY2xvc2VQYXRoKCk7XHJcblxyXG4gICAgaWYgKDEgPT09IDIgJiYgdGhpcy5oZWFsdGggJiYgdGhpcy5tYXhIZWFsdGggJiYgdGhpcy5oZWFsdGggPiAwKSB7IC8vaGVhbHRoIGJhclxyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAxMDtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJibGFja1wiO1xyXG4gICAgICAgIGN0eC5yZWN0KHRoaXMueCwgdGhpcy55LCAxMDAsIDIwKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG5cclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiZ3JlZW5cIjtcclxuICAgICAgICBjdHgucmVjdCh0aGlzLngsIHRoaXMueSwgMTAwICogdGhpcy5oZWFsdGggLyB0aGlzLm1heEhlYWx0aCwgMjApO1xyXG4gICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfSAvL2Rpc3BsYXkgaGVhbHRoIGJhclxyXG59O1xyXG5cclxuXHJcbmZ1bmN0aW9uIGdldFJhbmRvbShtaW4sIG1heCkge1xyXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pbjtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSb2NrOyIsImZ1bmN0aW9uIFRpbGUodGhpc0luZm8sIGNsaWVudCkge1xyXG4gICAgdGhpcy5pZCA9IHRoaXNJbmZvLmlkO1xyXG4gICAgdGhpcy54ID0gdGhpc0luZm8ueDtcclxuICAgIHRoaXMueSA9IHRoaXNJbmZvLnk7XHJcbiAgICB0aGlzLmxlbmd0aCA9IHRoaXNJbmZvLmxlbmd0aDtcclxuICAgIHRoaXMuY29sb3IgPSB0aGlzSW5mby5jb2xvcjtcclxuICAgIHRoaXMudG9wQ29sb3IgPSB7XHJcbiAgICAgICAgcjogdGhpcy5jb2xvci5yICsgMTAsXHJcbiAgICAgICAgZzogdGhpcy5jb2xvci5nICsgMTAsXHJcbiAgICAgICAgYjogdGhpcy5jb2xvci5iICsgMTBcclxuICAgIH07XHJcbiAgICB0aGlzLmJvcmRlckNvbG9yID0ge1xyXG4gICAgICAgIHI6IHRoaXMuY29sb3IuciAtIDEwLFxyXG4gICAgICAgIGc6IHRoaXMuY29sb3IuZyAtIDEwLFxyXG4gICAgICAgIGI6IHRoaXMuY29sb3IuYiAtIDEwXHJcbiAgICB9O1xyXG4gICAgdGhpcy5hbGVydCA9IHRoaXNJbmZvLmFsZXJ0O1xyXG4gICAgdGhpcy5yYW5kb20gPSBNYXRoLmZsb29yKGdldFJhbmRvbSgwLCAzKSk7XHJcblxyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbn1cclxuXHJcblRpbGUucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICh0aGlzSW5mbykge1xyXG4gICAgdGhpcy5jb2xvciA9IHRoaXNJbmZvLmNvbG9yO1xyXG4gICAgdGhpcy50b3BDb2xvciA9IHtcclxuICAgICAgICByOiB0aGlzLmNvbG9yLnIgKyAxMDAsXHJcbiAgICAgICAgZzogdGhpcy5jb2xvci5nICsgMTAwLFxyXG4gICAgICAgIGI6IHRoaXMuY29sb3IuYiArIDEwMFxyXG4gICAgfTtcclxuICAgIHRoaXMuYm9yZGVyQ29sb3IgPSB7XHJcbiAgICAgICAgcjogdGhpcy5jb2xvci5yIC0gMTAsXHJcbiAgICAgICAgZzogdGhpcy5jb2xvci5nIC0gMTAsXHJcbiAgICAgICAgYjogdGhpcy5jb2xvci5iIC0gMTBcclxuICAgIH07XHJcbiAgICB0aGlzLmFsZXJ0ID0gdGhpc0luZm8uYWxlcnQ7XHJcbn07XHJcblxyXG5UaWxlLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50Lm1haW5DdHg7XHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcblxyXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gXCJyZ2IoXCIgKyB0aGlzLmJvcmRlckNvbG9yLnIgKyBcIixcIiArIHRoaXMuYm9yZGVyQ29sb3IuZyArIFwiLFwiICsgdGhpcy5ib3JkZXJDb2xvci5iICsgXCIpXCI7XHJcbiAgICBjdHgubGluZVdpZHRoID0gMjA7XHJcblxyXG5cclxuICAgIHZhciBncmQgPSBjdHguY3JlYXRlTGluZWFyR3JhZGllbnQodGhpcy54ICsgdGhpcy5sZW5ndGggKiAzLzQsIHRoaXMueSwgdGhpcy54ICsgdGhpcy5sZW5ndGgvNCwgdGhpcy55ICsgdGhpcy5sZW5ndGgpO1xyXG4gICAgZ3JkLmFkZENvbG9yU3RvcCgwLCBcInJnYihcIiArIHRoaXMudG9wQ29sb3IuciArIFwiLFwiICsgdGhpcy50b3BDb2xvci5nICsgXCIsXCIgKyB0aGlzLnRvcENvbG9yLmIgKyBcIilcIik7XHJcbiAgICBncmQuYWRkQ29sb3JTdG9wKDEsIFwicmdiKFwiICsgdGhpcy5jb2xvci5yICsgXCIsXCIgKyB0aGlzLmNvbG9yLmcgKyBcIixcIiArIHRoaXMuY29sb3IuYiArIFwiKVwiKTtcclxuICAgIGN0eC5maWxsU3R5bGUgPSBncmQ7XHJcblxyXG5cclxuICAgIGN0eC5yZWN0KHRoaXMueCArIDMwLCB0aGlzLnkgKyAzMCwgdGhpcy5sZW5ndGggLSAzMCwgdGhpcy5sZW5ndGggLSAzMCk7XHJcblxyXG4gICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgY3R4LmZpbGwoKTtcclxuXHJcblxyXG59O1xyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVGlsZTtcclxuXHJcblxyXG5mdW5jdGlvbiBnZXRSYW5kb20obWluLCBtYXgpIHtcclxuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikgKyBtaW47XHJcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIEFuaW1hdGlvbjogcmVxdWlyZSgnLi9BbmltYXRpb24nKSxcclxuICAgIFBsYXllcjogcmVxdWlyZSgnLi9QbGF5ZXInKSxcclxuICAgIE1pbmlNYXA6IHJlcXVpcmUoJy4vTWluaU1hcCcpLFxyXG4gICAgVGlsZTogcmVxdWlyZSgnLi9UaWxlJyksXHJcbiAgICBSb2NrOiByZXF1aXJlKCcuL1JvY2snKVxyXG59OyIsInZhciBDbGllbnQgPSByZXF1aXJlKCcuL0NsaWVudC5qcycpO1xyXG52YXIgTWFpblVJID0gcmVxdWlyZSgnLi91aS9NYWluVUknKTtcclxuXHJcbnZhciBjbGllbnQgPSBuZXcgQ2xpZW50KCk7XHJcbmNsaWVudC5zdGFydCgpO1xyXG5cclxuXHJcblxyXG5kb2N1bWVudC5vbmtleWRvd24gPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGNsaWVudC5rZXlzW2V2ZW50LmtleUNvZGVdID0gdHJ1ZTtcclxuXHJcbiAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMzIpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlNQQUNFXCIpO1xyXG4gICAgICAgIGNsaWVudC5zb2NrZXQuZW1pdChcInNob290U2VsZlwiLCB7XHJcbiAgICAgICAgICAgIGlkOiBjbGllbnQuU0VMRl9JRFxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59LmJpbmQodGhpcyk7XHJcblxyXG5kb2N1bWVudC5vbmtleXVwID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gODQpIHtcclxuICAgICAgICBjbGllbnQubWFpblVJLmdhbWVVSS5jaGF0VUkudGV4dElucHV0LmNsaWNrKCk7XHJcbiAgICB9XHJcbiAgICBjbGllbnQua2V5c1tldmVudC5rZXlDb2RlXSA9IGZhbHNlO1xyXG4gICAgY2xpZW50LnNvY2tldC5lbWl0KCdrZXlFdmVudCcsIHtpZDogZXZlbnQua2V5Q29kZSwgc3RhdGU6IGZhbHNlfSk7XHJcbn07XHJcblxyXG5cclxuJCh3aW5kb3cpLmJpbmQoJ21vdXNld2hlZWwgRE9NTW91c2VTY3JvbGwnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGlmIChldmVudC5jdHJsS2V5ID09PSB0cnVlKSB7XHJcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgIH1cclxuICAgIGlmIChjbGllbnQuQ0hBVF9TQ1JPTEwpIHtcclxuICAgICAgICBjbGllbnQuQ0hBVF9TQ1JPTEwgPSBmYWxzZTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgaWYoZXZlbnQub3JpZ2luYWxFdmVudC53aGVlbERlbHRhIC8xMjAgPiAwICYmIGNsaWVudC5tYWluU2NhbGVGYWN0b3IgPCAyKSB7XHJcbiAgICAgICAgY2xpZW50Lm1haW5TY2FsZUZhY3RvciArPSAwLjA1O1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoY2xpZW50Lm1haW5TY2FsZUZhY3RvciA+IDAuMjUpIHtcclxuICAgICAgICBjbGllbnQubWFpblNjYWxlRmFjdG9yIC09IDAuMDU7XHJcbiAgICB9XHJcbn0pO1xyXG5cclxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY29udGV4dG1lbnUnLCBmdW5jdGlvbiAoZSkgeyAvL3ByZXZlbnQgcmlnaHQtY2xpY2sgY29udGV4dCBtZW51XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbn0sIGZhbHNlKTsiLCJkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUub3ZlcmZsb3cgPSAnaGlkZGVuJzsgIC8vIGZpcmVmb3gsIGNocm9tZVxyXG5kb2N1bWVudC5ib2R5LnNjcm9sbCA9IFwibm9cIjtcclxuXHJcbnZhciBQbGF5ZXJOYW1lclVJID0gcmVxdWlyZSgnLi9QbGF5ZXJOYW1lclVJJyk7XHJcbnZhciBHYW1lVUkgPSByZXF1aXJlKCcuL2dhbWUvR2FtZVVJJyk7XHJcblxyXG5mdW5jdGlvbiBNYWluVUkoY2xpZW50LCBzb2NrZXQpIHtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcblxyXG4gICAgdGhpcy5nYW1lVUkgPSBuZXcgR2FtZVVJKHRoaXMuY2xpZW50LCB0aGlzLnNvY2tldCwgdGhpcyk7XHJcblxyXG4gICAgdGhpcy5wbGF5ZXJOYW1lclVJID0gbmV3IFBsYXllck5hbWVyVUkodGhpcy5jbGllbnQsIHRoaXMuc29ja2V0KTtcclxufVxyXG5cclxuTWFpblVJLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKGluZm8pIHtcclxuICAgIHZhciBhY3Rpb24gPSBpbmZvLmFjdGlvbjtcclxuICAgIHZhciBob21lO1xyXG4gICAgaWYgKGFjdGlvbiA9PT0gXCJnYW1lTXNnUHJvbXB0XCIpIHtcclxuICAgICAgICB0aGlzLmdhbWVVSS5nYW1lTXNnUHJvbXB0Lm9wZW4oaW5mby5tZXNzYWdlKTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5NYWluVUkucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKGFjdGlvbikge1xyXG4gICAgaWYgKGFjdGlvbiA9PT0gXCJnYW1lTXNnUHJvbXB0XCIpIHtcclxuICAgICAgICB0aGlzLmdhbWVVSS5nYW1lTXNnUHJvbXB0LmNsb3NlKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuTWFpblVJLnByb3RvdHlwZS51cGRhdGVMZWFkZXJCb2FyZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBsZWFkZXJib2FyZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibGVhZGVyYm9hcmRcIik7XHJcbiAgICB2YXIgUExBWUVSX0FSUkFZID0gdGhpcy5jbGllbnQuUExBWUVSX0FSUkFZO1xyXG5cclxuXHJcbiAgICB2YXIgcGxheWVyU29ydCA9IGZ1bmN0aW9uIChhLCBiKSB7XHJcbiAgICAgICAgdmFyIHBsYXllckEgPSB0aGlzLmNsaWVudC5QTEFZRVJfTElTVFthXTtcclxuICAgICAgICB2YXIgcGxheWVyQiA9IHRoaXMuY2xpZW50LlBMQVlFUl9MSVNUW2JdO1xyXG4gICAgICAgIHJldHVybiBwbGF5ZXJBLnJhZGl1cyAtIHBsYXllckIucmFkaXVzO1xyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG5cclxuICAgIFBMQVlFUl9BUlJBWS5zb3J0KHBsYXllclNvcnQpO1xyXG5cclxuXHJcbiAgICBsZWFkZXJib2FyZC5pbm5lckhUTUwgPSBcIlwiO1xyXG4gICAgZm9yICh2YXIgaSA9IFBMQVlFUl9BUlJBWS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgICAgIHZhciBwbGF5ZXIgPSB0aGlzLmNsaWVudC5QTEFZRVJfTElTVFtQTEFZRVJfQVJSQVlbaV1dO1xyXG5cclxuICAgICAgICBpZiAocGxheWVyKSB7XHJcbiAgICAgICAgICAgIHZhciBlbnRyeSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XHJcbiAgICAgICAgICAgIGVudHJ5LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHBsYXllci5uYW1lICsgXCIgLSBcIiArIE1hdGguZmxvb3IocGxheWVyLnJhZGl1cykpKTtcclxuICAgICAgICAgICAgbGVhZGVyYm9hcmQuYXBwZW5kQ2hpbGQoZW50cnkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE1haW5VSTsiLCJmdW5jdGlvbiBQbGF5ZXJOYW1lclVJIChjbGllbnQsIHNvY2tldCkge1xyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbiAgICB0aGlzLnNvY2tldCA9IHNvY2tldDtcclxuXHJcbiAgICB0aGlzLmxlYWRlcmJvYXJkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsZWFkZXJib2FyZF9jb250YWluZXJcIik7XHJcbiAgICB0aGlzLm5hbWVCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm5hbWVTdWJtaXRcIik7XHJcbiAgICB0aGlzLnBsYXllck5hbWVJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGxheWVyTmFtZUlucHV0XCIpO1xyXG4gICAgdGhpcy5wbGF5ZXJOYW1lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGxheWVyX25hbWVyXCIpO1xyXG59XHJcblxyXG5QbGF5ZXJOYW1lclVJLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5wbGF5ZXJOYW1lSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDEzKSB7XHJcbiAgICAgICAgICAgIHRoaXMubmFtZUJ0bi5jbGljaygpO1xyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgdGhpcy5uYW1lQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5jbGllbnQubWFpbkNhbnZhcy5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgdGhpcy5sZWFkZXJib2FyZC5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcIm5ld1BsYXllclwiLFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiB0aGlzLnBsYXllck5hbWVJbnB1dC52YWx1ZSxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5wbGF5ZXJOYW1lci5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICB0aGlzLnBsYXllck5hbWVyLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgIHRoaXMucGxheWVyTmFtZUlucHV0LmZvY3VzKCk7XHJcbiAgICB0aGlzLmxlYWRlcmJvYXJkLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQbGF5ZXJOYW1lclVJOyIsImZ1bmN0aW9uIENoYXRVSShwYXJlbnQpIHtcclxuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xyXG4gICAgdGhpcy50ZW1wbGF0ZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY2hhdF9jb250YWluZXJcIik7XHJcbiAgICB0aGlzLnRleHRJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjaGF0X2lucHV0Jyk7XHJcbiAgICB0aGlzLmNoYXRMaXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NoYXRfbGlzdCcpO1xyXG5cclxuXHJcbiAgICB0aGlzLnRleHRJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnRleHRJbnB1dC5mb2N1cygpO1xyXG5cclxuICAgICAgICB0aGlzLnBhcmVudC5jbGllbnQuQ0hBVF9PUEVOID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLmNoYXRMaXN0LnN0eWxlLmhlaWdodCA9IFwiODAlXCI7XHJcbiAgICAgICAgdGhpcy5jaGF0TGlzdC5zdHlsZS5vdmVyZmxvd1kgPSBcImF1dG9cIjtcclxuXHJcbiAgICAgICAgdGhpcy50ZXh0SW5wdXQuc3R5bGUuYmFja2dyb3VuZCA9IFwicmdiYSgzNCwgNDgsIDcxLCAxKVwiO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuICAgIHRoaXMudGV4dElucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIGlmIChlLmtleUNvZGUgPT09IDEzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2VuZE1lc3NhZ2UoKTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuXHJcbiAgICB0aGlzLnRlbXBsYXRlLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNld2hlZWwnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5wYXJlbnQuY2xpZW50LkNIQVRfU0NST0xMID0gdHJ1ZTtcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgdGhpcy50ZW1wbGF0ZS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5wYXJlbnQuY2xpZW50LkNIQVRfQ0xJQ0sgPSB0cnVlO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxufVxyXG5cclxuQ2hhdFVJLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKG1lc3NhZ2UpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcclxuICAgIHRoaXMuY2xvc2UoKTtcclxufTtcclxuXHJcblxyXG5DaGF0VUkucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy50ZXh0SW5wdXQuYmx1cigpO1xyXG4gICAgdGhpcy5wYXJlbnQuY2xpZW50LkNIQVRfT1BFTiA9IGZhbHNlO1xyXG4gICAgdGhpcy5jaGF0TGlzdC5zdHlsZS5oZWlnaHQgPSBcIjMwJVwiO1xyXG4gICAgdGhpcy5jaGF0TGlzdC5zdHlsZS5iYWNrZ3JvdW5kID0gXCJyZ2JhKDE4MiwgMTkzLCAyMTEsIDAuMDIpXCI7XHJcbiAgICB0aGlzLnRleHRJbnB1dC5zdHlsZS5iYWNrZ3JvdW5kID0gXCJyZ2JhKDE4MiwgMTkzLCAyMTEsIDAuMSlcIjtcclxuICAgIHRoaXMucGFyZW50LmNsaWVudC5DSEFUX1NDUk9MTCA9IGZhbHNlO1xyXG4gICAgJCgnI2NoYXRfbGlzdCcpLmFuaW1hdGUoe3Njcm9sbFRvcDogJCgnI2NoYXRfbGlzdCcpLnByb3AoXCJzY3JvbGxIZWlnaHRcIil9LCAxMDApO1xyXG4gICAgdGhpcy5jaGF0TGlzdC5zdHlsZS5vdmVyZmxvd1kgPSBcIm5vbmVcIjtcclxufTtcclxuXHJcblxyXG5DaGF0VUkucHJvdG90eXBlLmFkZE1lc3NhZ2UgPSBmdW5jdGlvbiAocGFja2V0KSB7XHJcbiAgICB2YXIgZW50cnkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xyXG4gICAgZW50cnkuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUocGFja2V0Lm5hbWUgKyBcIiA6IFwiICsgcGFja2V0LmNoYXRNZXNzYWdlKSk7XHJcbiAgICB0aGlzLmNoYXRMaXN0LmFwcGVuZENoaWxkKGVudHJ5KTtcclxuXHJcbiAgICAkKCcjY2hhdF9saXN0JykuYW5pbWF0ZSh7c2Nyb2xsVG9wOiAkKCcjY2hhdF9saXN0JykucHJvcChcInNjcm9sbEhlaWdodFwiKX0sIDEwMCk7XHJcbn07XHJcblxyXG5cclxuQ2hhdFVJLnByb3RvdHlwZS5zZW5kTWVzc2FnZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBzb2NrZXQgPSB0aGlzLnBhcmVudC5zb2NrZXQ7XHJcblxyXG5cclxuICAgIGlmICh0aGlzLnRleHRJbnB1dC52YWx1ZSAmJiB0aGlzLnRleHRJbnB1dC52YWx1ZSAhPT0gXCJcIikge1xyXG4gICAgICAgIHNvY2tldC5lbWl0KCdjaGF0TWVzc2FnZScsIHtcclxuICAgICAgICAgICAgaWQ6IHRoaXMucGFyZW50LmNsaWVudC5TRUxGX0lELFxyXG4gICAgICAgICAgICBtZXNzYWdlOiB0aGlzLnRleHRJbnB1dC52YWx1ZVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMudGV4dElucHV0LnZhbHVlID0gXCJcIjtcclxuICAgIH1cclxuICAgIHRoaXMuY2xvc2UoKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ2hhdFVJO1xyXG5cclxuXHJcbiIsImZ1bmN0aW9uIEdhbWVNc2dQcm9tcHQocGFyZW50KSB7XHJcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcclxuICAgIHRoaXMudGVtcGxhdGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInByb21wdF9jb250YWluZXJcIik7XHJcbiAgICB0aGlzLm1lc3NhZ2UgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2FtZV9tc2dfcHJvbXB0Jyk7XHJcbn1cclxuXHJcbkdhbWVNc2dQcm9tcHQucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAobWVzc2FnZSkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xyXG4gICAgdGhpcy5tZXNzYWdlLmlubmVySFRNTCA9IG1lc3NhZ2U7XHJcbn07XHJcblxyXG5HYW1lTXNnUHJvbXB0LnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBHYW1lTXNnUHJvbXB0O1xyXG5cclxuXHJcbiIsInZhciBHYW1lTXNnUHJvbXB0ID0gcmVxdWlyZSgnLi9HYW1lTXNnUHJvbXB0Jyk7XHJcbnZhciBDaGF0VUkgPSByZXF1aXJlKCcuL0NoYXRVSScpO1xyXG5cclxuZnVuY3Rpb24gR2FtZVVJKGNsaWVudCwgc29ja2V0LCBwYXJlbnQpIHtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcclxuICAgIHRoaXMuZ2FtZU1zZ1Byb21wdCA9IG5ldyBHYW1lTXNnUHJvbXB0KHRoaXMpO1xyXG4gICAgdGhpcy5jaGF0VUkgPSBuZXcgQ2hhdFVJKHRoaXMpO1xyXG59XHJcblxyXG5HYW1lVUkucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBjb25zb2xlLmxvZyhcIk9QRU5JTkcgR0FNRSBVSVwiKTtcclxuICAgIHRoaXMuY2hhdFVJLm9wZW4oKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gIEdhbWVVSTsiXX0=
