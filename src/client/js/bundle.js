(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
function BinaryReader(data) {
    this._offset = 0;
    this._buffer = new DataView(data);
}

module.exports = BinaryReader;


BinaryReader.prototype.readInt8 = function () {
    var value = this._buffer.getInt8(this._offset);
    this._offset += 1;
    return value;
};

BinaryReader.prototype.readInt16 = function () {
    var value = this._buffer.getInt16(this._offset);
    this._offset += 2;
    return value;
};



BinaryReader.prototype.readInt32 = function () {
    var value = this._buffer.getInt32(this._offset);
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

    this.SLASH = [];
    this.SLASH_ARRAY = [];
    this.mouseMoveTimer = 0;
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
    this.socket.on('chatMessage', this.mainUI);
    this.socket.on('updateLOL', this.handleLOL.bind(this));
    this.socket.on('ping', this.sendPong.bind(this));
    this.socket.on('finalPing', function (message) {
        console.log("PING: " + message);
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

        if (this.clickTemp) { //see if shooting or mining
            this.clickTimer += 1;
            if (this.clickTimer > 3) {
                this.clickTimer = 0;
                this.clickTemp = false;
                this.mining = true;
            }
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



Client.prototype.handleLOL = function (data) {
    var reader = new BinaryReader(data);

    if (reader.length() > 20) {
        //console.log(reader.readInt8());

        //console.log(reader.readInt32()); //asteroid id
        //console.log(reader.readInt32()); //owner id

        //console.log(reader.readInt32()); //real x
        //console.log(reader.readInt32()); //real y
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
        case "rockInfo":
            addEntity(packet, this.ROCK_LIST, Entity.Rock);
            break;
        case "tileInfo":
            addEntity(packet, this.TILE_LIST, Entity.Tile);
            break;
        case "playerInfo":
            addEntity(packet, this.PLAYER_LIST, Entity.Player, this.PLAYER_ARRAY);
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
            updateEntity(packet, this.PLAYER_LIST);
            break;
        case "tileInfo":
            updateEntity(packet, this.TILE_LIST);
            break;
        case "rockInfo":
            updateEntity(packet, this.ROCK_LIST);
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
            deleteEntity(packet, this.PLAYER_LIST, this.PLAYER_ARRAY);
            break;
        case "asteroidInfo":
            deleteEntity(packet, this.ASTEROID_LIST);
            break;
        case "rockInfo":
            deleteEntity(packet, this.ROCK_LIST);
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


    if (!this.SELF_PLAYER) {
        return;
    }

    translateScene();
    this.mainCtx.clearRect(0, 0, 11000, 11000);

    this.mainCtx.fillStyle = "#1d1f21";
    this.mainCtx.fillRect(0, 0, 20000, 20000);


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


Client.prototype.start = function () {
    setInterval(this.drawScene.bind(this), 1000 / 25);
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
function Player(playerInfo, client) {
    this.id = playerInfo.id;
    this.name = playerInfo.name;
    this.x = playerInfo.x;
    this.y = playerInfo.y;
    this.health = playerInfo.health;
    this.maxHealth = playerInfo.maxHealth;
    this.theta = playerInfo.theta;
    this.level = playerInfo.level; //need to implement again
    this.radius = playerInfo.radius;
    this.vertices = playerInfo.vertices;
    this.client = client;

    if (!this.SELF_PLAYER && this.id === this.client.SELF_ID) {
        this.client.active = this.active; //probably should change this
        this.client.SELF_PLAYER = this;
    }
}

Player.prototype.update = function (playerInfo) {
    this.x = playerInfo.x;
    this.y = playerInfo.y;
    this.health = playerInfo.health;
    this.maxHealth = playerInfo.maxHealth;
    this.theta = playerInfo.theta;
    this.level = playerInfo.level;
    this.shooting = playerInfo.shooting;
    this.radius = playerInfo.radius;
    this.vulnerable = playerInfo.vulnerable;
    this.vertices = playerInfo.vertices;
};

Player.prototype.show = function () {
    var ctx = this.client.mainCtx;
    var selfId = this.client.SELF_ID;
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


    if (1 === 3) {
        var radius = this.radius;
        ctx.beginPath();
        ctx.moveTo(this.x + radius, this.y);
        var theta, x, y;
        for (i = Math.PI / 4; i <= 2 * Math.PI - Math.PI / 4; i += Math.PI / 4) {
            theta = i;
            x = radius * Math.cos(theta);
            y = radius * Math.sin(theta);
            ctx.lineTo(this.x + x, this.y + y);
        }
        ctx.lineTo(this.x + radius, this.y + 3);
        ctx.stroke();
        ctx.fill();
    }


    ctx.fillStyle = "#ff9d60";
    ctx.fillText(this.name, this.x, this.y + 70);


    if (this.health && this.maxHealth && this.health > 0) { //health bar
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

module.exports = Player;
},{}],6:[function(require,module,exports){
function Rock(rockInfo, client) {
    this.x = rockInfo.x;
    this.y = rockInfo.y;
    this.vertices = rockInfo.vertices;
    this.theta = rockInfo.theta;
    this.texture = rockInfo.texture;
    this.neutral = rockInfo.neutral;
    this.client = client;
}

Rock.prototype.update = function (rockInfo) {
    this.x = rockInfo.x;
    this.y = rockInfo.y;
    this.theta = rockInfo.theta;
    this.owner = rockInfo.owner;
    this.neutral = rockInfo.neutral;
    this.health = rockInfo.health;
    this.maxHealth = rockInfo.maxHealth;
    this.fast = rockInfo.fast;
};


Rock.prototype.show = function () {
    var ctx = this.client.mainCtx;
    var SCALE = 100;


    ctx.fillStyle = "pink"; //default color
    switch (this.texture) {
        case "bronze":
            ctx.fillStyle = "brown";
            break;
        case "silver":
            ctx.fillStyle = "grey";
            break;
        case "gold":
            ctx.fillStyle = "yellow";
            break;
        case "emerald":
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


    if (this.health && this.maxHealth && this.health > 0) { //health bar
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2xpZW50L2pzL0JpbmFyeVJlYWRlci5qcyIsInNyYy9jbGllbnQvanMvQ2xpZW50LmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvQW5pbWF0aW9uLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvTWluaU1hcC5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L1BsYXllci5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L1JvY2suanMiLCJzcmMvY2xpZW50L2pzL2VudGl0eS9UaWxlLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvaW5kZXguanMiLCJzcmMvY2xpZW50L2pzL2luZGV4LmpzIiwic3JjL2NsaWVudC9qcy91aS9NYWluVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL1BsYXllck5hbWVyVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL2dhbWUvQ2hhdFVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9nYW1lL0dhbWVNc2dQcm9tcHQuanMiLCJzcmMvY2xpZW50L2pzL3VpL2dhbWUvR2FtZVVJLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImZ1bmN0aW9uIEJpbmFyeVJlYWRlcihkYXRhKSB7XHJcbiAgICB0aGlzLl9vZmZzZXQgPSAwO1xyXG4gICAgdGhpcy5fYnVmZmVyID0gbmV3IERhdGFWaWV3KGRhdGEpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEJpbmFyeVJlYWRlcjtcclxuXHJcblxyXG5CaW5hcnlSZWFkZXIucHJvdG90eXBlLnJlYWRJbnQ4ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHZhbHVlID0gdGhpcy5fYnVmZmVyLmdldEludDgodGhpcy5fb2Zmc2V0KTtcclxuICAgIHRoaXMuX29mZnNldCArPSAxO1xyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG59O1xyXG5cclxuQmluYXJ5UmVhZGVyLnByb3RvdHlwZS5yZWFkSW50MTYgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9idWZmZXIuZ2V0SW50MTYodGhpcy5fb2Zmc2V0KTtcclxuICAgIHRoaXMuX29mZnNldCArPSAyO1xyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG59O1xyXG5cclxuXHJcblxyXG5CaW5hcnlSZWFkZXIucHJvdG90eXBlLnJlYWRJbnQzMiA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciB2YWx1ZSA9IHRoaXMuX2J1ZmZlci5nZXRJbnQzMih0aGlzLl9vZmZzZXQpO1xyXG4gICAgdGhpcy5fb2Zmc2V0ICs9IDQ7XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcblxyXG59O1xyXG5cclxuQmluYXJ5UmVhZGVyLnByb3RvdHlwZS5za2lwQnl0ZXMgPSBmdW5jdGlvbiAobGVuZ3RoKSB7XHJcbiAgICB0aGlzLl9vZmZzZXQgKz0gbGVuZ3RoO1xyXG59O1xyXG5cclxuQmluYXJ5UmVhZGVyLnByb3RvdHlwZS5sZW5ndGggPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fYnVmZmVyLmJ5dGVMZW5ndGg7XHJcbn07XHJcblxyXG4iLCJ2YXIgRW50aXR5ID0gcmVxdWlyZSgnLi9lbnRpdHknKTtcclxudmFyIE1haW5VSSA9IHJlcXVpcmUoJy4vdWkvTWFpblVJJyk7XHJcbnZhciBCaW5hcnlSZWFkZXIgPSByZXF1aXJlKCcuL0JpbmFyeVJlYWRlcicpO1xyXG5cclxuZnVuY3Rpb24gQ2xpZW50KCkge1xyXG4gICAgdGhpcy5TRUxGX0lEID0gbnVsbDtcclxuICAgIHRoaXMuU0VMRl9QTEFZRVIgPSBudWxsO1xyXG4gICAgdGhpcy5UUkFJTCA9IG51bGw7XHJcblxyXG4gICAgdGhpcy5TTEFTSCA9IFtdO1xyXG4gICAgdGhpcy5TTEFTSF9BUlJBWSA9IFtdO1xyXG4gICAgdGhpcy5tb3VzZU1vdmVUaW1lciA9IDA7XHJcbiAgICB0aGlzLmluaXQoKTtcclxufVxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5pbml0U29ja2V0KCk7XHJcbiAgICB0aGlzLmluaXRDYW52YXNlcygpO1xyXG4gICAgdGhpcy5pbml0TGlzdHMoKTtcclxuICAgIHRoaXMuaW5pdFZpZXdlcnMoKTtcclxufTtcclxuQ2xpZW50LnByb3RvdHlwZS5pbml0U29ja2V0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5zb2NrZXQgPSBpbygpO1xyXG4gICAgdGhpcy5zb2NrZXQudmVyaWZpZWQgPSBmYWxzZTtcclxuXHJcbiAgICB0aGlzLnNvY2tldC5vbignaW5pdFZlcmlmaWNhdGlvbicsIHRoaXMudmVyaWZ5LmJpbmQodGhpcykpO1xyXG4gICAgdGhpcy5zb2NrZXQub24oJ3VwZGF0ZUVudGl0aWVzJywgdGhpcy5oYW5kbGVQYWNrZXQuYmluZCh0aGlzKSk7XHJcbiAgICB0aGlzLnNvY2tldC5vbignY2hhdE1lc3NhZ2UnLCB0aGlzLm1haW5VSSk7XHJcbiAgICB0aGlzLnNvY2tldC5vbigndXBkYXRlTE9MJywgdGhpcy5oYW5kbGVMT0wuYmluZCh0aGlzKSk7XHJcbiAgICB0aGlzLnNvY2tldC5vbigncGluZycsIHRoaXMuc2VuZFBvbmcuYmluZCh0aGlzKSk7XHJcbiAgICB0aGlzLnNvY2tldC5vbignZmluYWxQaW5nJywgZnVuY3Rpb24gKG1lc3NhZ2UpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlBJTkc6IFwiICsgbWVzc2FnZSk7XHJcbiAgICB9KTtcclxuXHJcblxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5zZW5kUG9uZyA9IGZ1bmN0aW9uIChtZXNzYWdlKSB7XHJcbiAgICB0aGlzLnNvY2tldC5lbWl0KFwicG9uZzEyM1wiLCBtZXNzYWdlKTtcclxufTtcclxuXHJcblxyXG5DbGllbnQucHJvdG90eXBlLmluaXRDYW52YXNlcyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMubWFpbkNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibWFpbl9jYW52YXNcIik7XHJcbiAgICB0aGlzLm1haW5DYW52YXMuc3R5bGUuYm9yZGVyID0gJzFweCBzb2xpZCAjMDAwMDAwJztcclxuICAgIHRoaXMubWFpbkNhbnZhcy5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgIHRoaXMubWFpbkN0eCA9IHRoaXMubWFpbkNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XHJcblxyXG5cclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLlNFTEZfSUQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgeCA9ICgoZXZlbnQueCAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRXaWR0aCAqIDEwMDApIC0gdGhpcy5tYWluQ2FudmFzLndpZHRoIC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yO1xyXG4gICAgICAgIHZhciB5ID0gKChldmVudC55IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldEhlaWdodCAqIDUwMCkgLSB0aGlzLm1haW5DYW52YXMuaGVpZ2h0IC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yO1xyXG5cclxuXHJcbiAgICAgICAgaWYgKE1hdGguYWJzKHgpICsgTWF0aC5hYnMoeSkgPCAyMDApIHtcclxuICAgICAgICAgICAgdGhpcy5wbGF5ZXJDbGlja2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5jaXJjbGVDb25zdHJ1Y3QgPSBbXTtcclxuICAgICAgICAgICAgdGhpcy5jaXJjbGVTdGFnZUNvdW50ID0gMDtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuY2xpY2tUZW1wID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5jbGlja1RpbWVyID0gMDtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIiwgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLlNFTEZfSUQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgeCA9ICgoZXZlbnQueCAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRXaWR0aCAqIDEwMDApIC0gdGhpcy5tYWluQ2FudmFzLndpZHRoIC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yO1xyXG4gICAgICAgIHZhciB5ID0gKChldmVudC55IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldEhlaWdodCAqIDUwMCkgLSB0aGlzLm1haW5DYW52YXMuaGVpZ2h0IC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yO1xyXG5cclxuICAgICAgICB0aGlzLnNvY2tldC5lbWl0KFwic2hvb3RTZWxmXCIsIHtcclxuICAgICAgICAgICAgaWQ6IHRoaXMuU0VMRl9JRCxcclxuICAgICAgICAgICAgeDogeCxcclxuICAgICAgICAgICAgeTogeVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLmNsaWNrVGVtcCA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuY2xpY2tUaW1lciA9IDA7XHJcblxyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcblxyXG5cclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLlNFTEZfUExBWUVSKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciB4ID0gKChldmVudC54IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldFdpZHRoICogMTAwMCkgLVxyXG4gICAgICAgICAgICB0aGlzLm1haW5DYW52YXMud2lkdGggLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3I7XHJcbiAgICAgICAgdmFyIHkgPSAoKGV2ZW50LnkgLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0SGVpZ2h0ICogNTAwKSAtXHJcbiAgICAgICAgICAgIHRoaXMubWFpbkNhbnZhcy5oZWlnaHQgLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3I7XHJcblxyXG4gICAgICAgIGlmIChzcXVhcmUoeCkgKyBzcXVhcmUoeSkgPiBzcXVhcmUodGhpcy5TRUxGX1BMQVlFUi5yYW5nZSkpIHsgLy9pZiBub3QgaW4gcmFuZ2VcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuY2xpY2tUZW1wKSB7IC8vc2VlIGlmIHNob290aW5nIG9yIG1pbmluZ1xyXG4gICAgICAgICAgICB0aGlzLmNsaWNrVGltZXIgKz0gMTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY2xpY2tUaW1lciA+IDMpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2xpY2tUaW1lciA9IDA7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNsaWNrVGVtcCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5taW5pbmcgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXRoaXMucHJlKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHJlID0ge3g6IHgsIHk6IHl9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKHNxdWFyZSh0aGlzLnByZS54IC0geCkgKyBzcXVhcmUodGhpcy5wcmUueSAtIHkpID4gODApIHtcclxuICAgICAgICAgICAgdGhpcy5wcmUgPSB7eDogeCwgeTogeX07XHJcblxyXG4gICAgICAgICAgICBpZiAoTWF0aC5hYnMoeCkgPCA1MCAmJiBNYXRoLmFicyh5KSA8IDUwKSB7XHJcbiAgICAgICAgICAgICAgICB4ID0gMDtcclxuICAgICAgICAgICAgICAgIHkgPSAwO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuc29ja2V0LmVtaXQoJ21vdmUnLCB7XHJcbiAgICAgICAgICAgICAgICBpZDogdGhpcy5TRUxGX0lELFxyXG4gICAgICAgICAgICAgICAgeDogeCxcclxuICAgICAgICAgICAgICAgIHk6IHlcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxufTtcclxuXHJcblxyXG5DbGllbnQucHJvdG90eXBlLnNlbmRDaXJjbGUgPSBmdW5jdGlvbiAoY29uc3RydWN0KSB7XHJcblxyXG4gICAgdmFyIHJhZGlpTm9ybWFsID0gZnVuY3Rpb24gKHZlY3Rvcikge1xyXG4gICAgICAgIGlmICghdmVjdG9yKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAwO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gKHZlY3Rvci54ICogdmVjdG9yLnggKyB2ZWN0b3IueSAqIHZlY3Rvci55KTtcclxuICAgIH07XHJcblxyXG4gICAgdmFyIG1heFJhZGl1cyA9IE1hdGguc3FydChNYXRoLm1heChcclxuICAgICAgICByYWRpaU5vcm1hbChjb25zdHJ1Y3RbMF0pLFxyXG4gICAgICAgIHJhZGlpTm9ybWFsKGNvbnN0cnVjdFsxXSksXHJcbiAgICAgICAgcmFkaWlOb3JtYWwoY29uc3RydWN0WzJdKSxcclxuICAgICAgICByYWRpaU5vcm1hbChjb25zdHJ1Y3RbM10pKSk7XHJcblxyXG4gICAgaWYgKG1heFJhZGl1cykge1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJjcmVhdGVDaXJjbGVcIiwge1xyXG4gICAgICAgICAgICBpZDogdGhpcy5TRUxGX0lELFxyXG4gICAgICAgICAgICByYWRpdXM6IG1heFJhZGl1c1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5pbml0TGlzdHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLlBMQVlFUl9MSVNUID0ge307XHJcbiAgICB0aGlzLlRJTEVfTElTVCA9IHt9O1xyXG4gICAgdGhpcy5ST0NLX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuQVNURVJPSURfTElTVCA9IHt9O1xyXG4gICAgdGhpcy5BTklNQVRJT05fTElTVCA9IHt9O1xyXG5cclxuICAgIHRoaXMuUExBWUVSX0FSUkFZID0gW107XHJcbn07XHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdFZpZXdlcnMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmtleXMgPSBbXTtcclxuICAgIHRoaXMuc2NhbGVGYWN0b3IgPSAxO1xyXG4gICAgdGhpcy5tYWluU2NhbGVGYWN0b3IgPSAwLjU7XHJcbiAgICB0aGlzLm1haW5VSSA9IG5ldyBNYWluVUkodGhpcywgdGhpcy5zb2NrZXQpO1xyXG4gICAgdGhpcy5tYWluVUkucGxheWVyTmFtZXJVSS5vcGVuKCk7XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLnZlcmlmeSA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICBpZiAoIXRoaXMuc29ja2V0LnZlcmlmaWVkKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJWRVJJRklFRCBDTElFTlRcIik7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcInZlcmlmeVwiLCB7fSk7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQudmVyaWZpZWQgPSB0cnVlO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcblxyXG5DbGllbnQucHJvdG90eXBlLmhhbmRsZUxPTCA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICB2YXIgcmVhZGVyID0gbmV3IEJpbmFyeVJlYWRlcihkYXRhKTtcclxuXHJcbiAgICBpZiAocmVhZGVyLmxlbmd0aCgpID4gMjApIHtcclxuICAgICAgICAvL2NvbnNvbGUubG9nKHJlYWRlci5yZWFkSW50OCgpKTtcclxuXHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyhyZWFkZXIucmVhZEludDMyKCkpOyAvL2FzdGVyb2lkIGlkXHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyhyZWFkZXIucmVhZEludDMyKCkpOyAvL293bmVyIGlkXHJcblxyXG4gICAgICAgIC8vY29uc29sZS5sb2cocmVhZGVyLnJlYWRJbnQzMigpKTsgLy9yZWFsIHhcclxuICAgICAgICAvL2NvbnNvbGUubG9nKHJlYWRlci5yZWFkSW50MzIoKSk7IC8vcmVhbCB5XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5oYW5kbGVQYWNrZXQgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgdmFyIHBhY2tldCwgaTtcclxuICAgIGZvciAoaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgcGFja2V0ID0gZGF0YVtpXTtcclxuICAgICAgICBzd2l0Y2ggKHBhY2tldC5tYXN0ZXIpIHtcclxuICAgICAgICAgICAgY2FzZSBcImFkZFwiOlxyXG4gICAgICAgICAgICAgICAgdGhpcy5hZGRFbnRpdGllcyhwYWNrZXQpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJkZWxldGVcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMuZGVsZXRlRW50aXRpZXMocGFja2V0KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwidXBkYXRlXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUVudGl0aWVzKHBhY2tldCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5hZGRFbnRpdGllcyA9IGZ1bmN0aW9uIChwYWNrZXQpIHtcclxuICAgIHZhciBhZGRFbnRpdHkgPSBmdW5jdGlvbiAocGFja2V0LCBsaXN0LCBlbnRpdHksIGFycmF5KSB7XHJcbiAgICAgICAgaWYgKCFwYWNrZXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsaXN0W3BhY2tldC5pZF0gPSBuZXcgZW50aXR5KHBhY2tldCwgdGhpcyk7XHJcbiAgICAgICAgaWYgKGFycmF5ICYmIGFycmF5LmluZGV4T2YocGFja2V0LmlkKSA9PT0gLTEpIHtcclxuICAgICAgICAgICAgYXJyYXkucHVzaChwYWNrZXQuaWQpO1xyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKTtcclxuXHJcbiAgICBzd2l0Y2ggKHBhY2tldC5jbGFzcykge1xyXG4gICAgICAgIGNhc2UgXCJyb2NrSW5mb1wiOlxyXG4gICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLlJPQ0tfTElTVCwgRW50aXR5LlJvY2spO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwidGlsZUluZm9cIjpcclxuICAgICAgICAgICAgYWRkRW50aXR5KHBhY2tldCwgdGhpcy5USUxFX0xJU1QsIEVudGl0eS5UaWxlKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcInBsYXllckluZm9cIjpcclxuICAgICAgICAgICAgYWRkRW50aXR5KHBhY2tldCwgdGhpcy5QTEFZRVJfTElTVCwgRW50aXR5LlBsYXllciwgdGhpcy5QTEFZRVJfQVJSQVkpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiYW5pbWF0aW9uSW5mb1wiOlxyXG4gICAgICAgICAgICBpZiAocGFja2V0LmlkID09PSB0aGlzLlNFTEZfSUQpIHtcclxuICAgICAgICAgICAgICAgIGFkZEVudGl0eShwYWNrZXQsIHRoaXMuQU5JTUFUSU9OX0xJU1QsIEVudGl0eS5BbmltYXRpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJVSUluZm9cIjpcclxuICAgICAgICAgICAgaWYgKHRoaXMuU0VMRl9JRCA9PT0gcGFja2V0LnBsYXllcklkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW5VSS5vcGVuKHBhY2tldCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcInNlbGZJZFwiOlxyXG4gICAgICAgICAgICBpZiAoIXRoaXMuU0VMRl9JRCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5TRUxGX0lEID0gcGFja2V0LnNlbGZJZDtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFpblVJLmdhbWVVSS5vcGVuKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImNoYXRJbmZvXCI6XHJcbiAgICAgICAgICAgIHRoaXMubWFpblVJLmdhbWVVSS5jaGF0VUkuYWRkTWVzc2FnZShwYWNrZXQpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgIH1cclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUudXBkYXRlRW50aXRpZXMgPSBmdW5jdGlvbiAocGFja2V0KSB7XHJcbiAgICBmdW5jdGlvbiB1cGRhdGVFbnRpdHkocGFja2V0LCBsaXN0KSB7XHJcbiAgICAgICAgaWYgKCFwYWNrZXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgZW50aXR5ID0gbGlzdFtwYWNrZXQuaWRdO1xyXG4gICAgICAgIGlmICghZW50aXR5KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgZW50aXR5LnVwZGF0ZShwYWNrZXQpO1xyXG4gICAgfVxyXG5cclxuICAgIHN3aXRjaCAocGFja2V0LmNsYXNzKSB7XHJcbiAgICAgICAgY2FzZSBcInBsYXllckluZm9cIjpcclxuICAgICAgICAgICAgdXBkYXRlRW50aXR5KHBhY2tldCwgdGhpcy5QTEFZRVJfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJ0aWxlSW5mb1wiOlxyXG4gICAgICAgICAgICB1cGRhdGVFbnRpdHkocGFja2V0LCB0aGlzLlRJTEVfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJyb2NrSW5mb1wiOlxyXG4gICAgICAgICAgICB1cGRhdGVFbnRpdHkocGFja2V0LCB0aGlzLlJPQ0tfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJVSUluZm9cIjpcclxuICAgICAgICAgICAgaWYgKHRoaXMuU0VMRl9JRCA9PT0gcGFja2V0LnBsYXllcklkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW5VSS51cGRhdGUocGFja2V0KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgIH1cclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUuZGVsZXRlRW50aXRpZXMgPSBmdW5jdGlvbiAocGFja2V0KSB7XHJcbiAgICB2YXIgZGVsZXRlRW50aXR5ID0gZnVuY3Rpb24gKHBhY2tldCwgbGlzdCwgYXJyYXkpIHtcclxuICAgICAgICBpZiAoIXBhY2tldCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChhcnJheSkge1xyXG4gICAgICAgICAgICB2YXIgaW5kZXggPSBhcnJheS5pbmRleE9mKHBhY2tldC5pZCk7XHJcbiAgICAgICAgICAgIGFycmF5LnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGRlbGV0ZSBsaXN0W3BhY2tldC5pZF07XHJcbiAgICB9O1xyXG5cclxuICAgIHN3aXRjaCAocGFja2V0LmNsYXNzKSB7XHJcbiAgICAgICAgY2FzZSBcInRpbGVJbmZvXCI6XHJcbiAgICAgICAgICAgIGRlbGV0ZUVudGl0eShwYWNrZXQsIHRoaXMuVElMRV9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcInBsYXllckluZm9cIjpcclxuICAgICAgICAgICAgZGVsZXRlRW50aXR5KHBhY2tldCwgdGhpcy5QTEFZRVJfTElTVCwgdGhpcy5QTEFZRVJfQVJSQVkpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiYXN0ZXJvaWRJbmZvXCI6XHJcbiAgICAgICAgICAgIGRlbGV0ZUVudGl0eShwYWNrZXQsIHRoaXMuQVNURVJPSURfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJyb2NrSW5mb1wiOlxyXG4gICAgICAgICAgICBkZWxldGVFbnRpdHkocGFja2V0LCB0aGlzLlJPQ0tfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJhbmltYXRpb25JbmZvXCI6XHJcbiAgICAgICAgICAgIGRlbGV0ZUVudGl0eShwYWNrZXQsIHRoaXMuQU5JTUFUSU9OX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiVUlJbmZvXCI6XHJcbiAgICAgICAgICAgIGlmICh0aGlzLlNFTEZfSUQgPT09IHBhY2tldC5pZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tYWluVUkuY2xvc2UocGFja2V0LmFjdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLmRyYXdTY2VuZSA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICB0aGlzLm1haW5VSS51cGRhdGVMZWFkZXJCb2FyZCgpO1xyXG5cclxuICAgIHZhciBpZDtcclxuICAgIHZhciBlbnRpdHlMaXN0ID0gW1xyXG4gICAgICAgIHRoaXMuVElMRV9MSVNULFxyXG4gICAgICAgIHRoaXMuUExBWUVSX0xJU1QsXHJcbiAgICAgICAgdGhpcy5BU1RFUk9JRF9MSVNULFxyXG4gICAgICAgIHRoaXMuQU5JTUFUSU9OX0xJU1QsXHJcbiAgICAgICAgdGhpcy5ST0NLX0xJU1RcclxuICAgIF07XHJcblxyXG4gICAgdmFyIGluQm91bmRzID0gZnVuY3Rpb24gKHBsYXllciwgeCwgeSkge1xyXG4gICAgICAgIHZhciByYW5nZSA9IHRoaXMubWFpbkNhbnZhcy53aWR0aCAvICgwLjcgKiB0aGlzLnNjYWxlRmFjdG9yKTtcclxuICAgICAgICByZXR1cm4geCA8IChwbGF5ZXIueCArIHJhbmdlKSAmJiB4ID4gKHBsYXllci54IC0gcmFuZ2UpXHJcbiAgICAgICAgICAgICYmIHkgPCAocGxheWVyLnkgKyByYW5nZSkgJiYgeSA+IChwbGF5ZXIueSAtIHJhbmdlKTtcclxuICAgIH0uYmluZCh0aGlzKTtcclxuICAgIHZhciB0cmFuc2xhdGVTY2VuZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLm1haW5DdHguc2V0VHJhbnNmb3JtKDEsIDAsIDAsIDEsIDAsIDApO1xyXG4gICAgICAgIHRoaXMuc2NhbGVGYWN0b3IgPSBsZXJwKHRoaXMuc2NhbGVGYWN0b3IsIHRoaXMubWFpblNjYWxlRmFjdG9yLCAwLjMpO1xyXG4gICAgICAgIHRoaXMubWFpbkN0eC50cmFuc2xhdGUodGhpcy5tYWluQ2FudmFzLndpZHRoIC8gMiwgdGhpcy5tYWluQ2FudmFzLmhlaWdodCAvIDIpO1xyXG4gICAgICAgIHRoaXMubWFpbkN0eC5zY2FsZSh0aGlzLnNjYWxlRmFjdG9yLCB0aGlzLnNjYWxlRmFjdG9yKTtcclxuICAgICAgICB0aGlzLm1haW5DdHgudHJhbnNsYXRlKC10aGlzLlNFTEZfUExBWUVSLngsIC10aGlzLlNFTEZfUExBWUVSLnkpO1xyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG5cclxuXHJcbiAgICBpZiAoIXRoaXMuU0VMRl9QTEFZRVIpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdHJhbnNsYXRlU2NlbmUoKTtcclxuICAgIHRoaXMubWFpbkN0eC5jbGVhclJlY3QoMCwgMCwgMTEwMDAsIDExMDAwKTtcclxuXHJcbiAgICB0aGlzLm1haW5DdHguZmlsbFN0eWxlID0gXCIjMWQxZjIxXCI7XHJcbiAgICB0aGlzLm1haW5DdHguZmlsbFJlY3QoMCwgMCwgMjAwMDAsIDIwMDAwKTtcclxuXHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbnRpdHlMaXN0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIGxpc3QgPSBlbnRpdHlMaXN0W2ldO1xyXG4gICAgICAgIGZvciAoaWQgaW4gbGlzdCkge1xyXG4gICAgICAgICAgICB2YXIgZW50aXR5ID0gbGlzdFtpZF07XHJcbiAgICAgICAgICAgIGlmIChpbkJvdW5kcyh0aGlzLlNFTEZfUExBWUVSLCBlbnRpdHkueCwgZW50aXR5LnkpKSB7XHJcbiAgICAgICAgICAgICAgICBlbnRpdHkuc2hvdygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuVFJBSUwgJiYgIXRoaXMuYWN0aXZlKSB7XHJcbiAgICAgICAgdGhpcy5UUkFJTC5zaG93KCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHNldEludGVydmFsKHRoaXMuZHJhd1NjZW5lLmJpbmQodGhpcyksIDEwMDAgLyAyNSk7XHJcbn07XHJcblxyXG5mdW5jdGlvbiBsZXJwKGEsIGIsIHJhdGlvKSB7XHJcbiAgICByZXR1cm4gYSArIHJhdGlvICogKGIgLSBhKTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIHNxdWFyZShhKSB7XHJcbiAgICByZXR1cm4gYSAqIGE7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHZlY3Rvck5vcm1hbChhKSB7XHJcbiAgICByZXR1cm4gYS54ICogYS54ICsgYS55ICogYS55O1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENsaWVudDsiLCJmdW5jdGlvbiBBbmltYXRpb24oYW5pbWF0aW9uSW5mbywgY2xpZW50KSB7XHJcblxyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbiAgICB0aGlzLnR5cGUgPSBhbmltYXRpb25JbmZvLnR5cGU7XHJcbiAgICB0aGlzLmlkID0gYW5pbWF0aW9uSW5mby5pZDtcclxuICAgIHRoaXMueCA9IGFuaW1hdGlvbkluZm8ueDtcclxuICAgIHRoaXMueSA9IGFuaW1hdGlvbkluZm8ueTtcclxuICAgIC8vdGhpcy50aGV0YSA9IDE1O1xyXG4gICAgdGhpcy50aW1lciA9IGdldFJhbmRvbSgxMCwgMTQpO1xyXG5cclxuICAgIGlmICh0aGlzLnR5cGUgPT09IFwic2xhc2hcIikge1xyXG4gICAgICAgIHRoaXMuc2xhc2hJZCA9IGFuaW1hdGlvbkluZm8uc2xhc2hJZDtcclxuICAgICAgICB2YXIgc2xhc2ggPSB0aGlzLmNsaWVudC5maW5kU2xhc2godGhpcy5zbGFzaElkKTtcclxuICAgICAgICB0aGlzLnByZSA9IHNsYXNoWzBdO1xyXG4gICAgICAgIHRoaXMucG9zdCA9IHNsYXNoWzFdO1xyXG4gICAgfVxyXG59XHJcblxyXG5cclxuQW5pbWF0aW9uLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50Lm1haW5DdHg7XHJcbiAgICB2YXIgcGxheWVyID0gdGhpcy5jbGllbnQuU0VMRl9QTEFZRVI7XHJcblxyXG4gICAgaWYgKHRoaXMudHlwZSA9PT0gXCJzbGFzaFwiICYmIHBsYXllcikge1xyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuXHJcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJyZ2JhKDI0MiwgMzEsIDY2LCAwLjYpXCI7XHJcbiAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDE1O1xyXG5cclxuICAgICAgICBjdHgubW92ZVRvKHBsYXllci54ICsgdGhpcy5wcmUueCwgcGxheWVyLnkgKyB0aGlzLnByZS55KTtcclxuICAgICAgICBjdHgubGluZVRvKHBsYXllci54ICsgdGhpcy5wb3N0LngsIHBsYXllci55ICsgdGhpcy5wb3N0LnkpO1xyXG5cclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfVxyXG4gICAgXHJcblxyXG4gICAgaWYgKHRoaXMudHlwZSA9PT0gXCJzaGFyZERlYXRoXCIpIHsgLy9kZXByZWNhdGVkIGJ1dCBjb3VsZCBwdWxsIHNvbWUgZ29vZCBjb2RlIGZyb20gaGVyZVxyXG4gICAgICAgIGN0eC5mb250ID0gNjAgLSB0aGlzLnRpbWVyICsgXCJweCBBcmlhbFwiO1xyXG4gICAgICAgIGN0eC5zYXZlKCk7XHJcbiAgICAgICAgY3R4LnRyYW5zbGF0ZSh0aGlzLngsIHRoaXMueSk7XHJcbiAgICAgICAgY3R4LnJvdGF0ZSgtTWF0aC5QSSAvIDUwICogdGhpcy50aGV0YSk7XHJcbiAgICAgICAgY3R4LnRleHRBbGlnbiA9IFwiY2VudGVyXCI7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwicmdiYSgyNTUsIDE2OCwgODYsIFwiICsgdGhpcy50aW1lciAqIDEwIC8gMTAwICsgXCIpXCI7XHJcbiAgICAgICAgY3R4LmZpbGxUZXh0KHRoaXMubmFtZSwgMCwgMTUpO1xyXG4gICAgICAgIGN0eC5yZXN0b3JlKCk7XHJcblxyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcIiMwMDAwMDBcIjtcclxuICAgICAgICB0aGlzLnRoZXRhID0gbGVycCh0aGlzLnRoZXRhLCAwLCAwLjA4KTtcclxuICAgICAgICB0aGlzLnggPSBsZXJwKHRoaXMueCwgdGhpcy5lbmRYLCAwLjEpO1xyXG4gICAgICAgIHRoaXMueSA9IGxlcnAodGhpcy55LCB0aGlzLmVuZFksIDAuMSk7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIHRoaXMudGltZXItLTtcclxuICAgIGlmICh0aGlzLnRpbWVyIDw9IDApIHtcclxuICAgICAgICBkZWxldGUgdGhpcy5jbGllbnQuQU5JTUFUSU9OX0xJU1RbdGhpcy5pZF07XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0UmFuZG9tKG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluO1xyXG59XHJcblxyXG5mdW5jdGlvbiBsZXJwKGEsIGIsIHJhdGlvKSB7XHJcbiAgICByZXR1cm4gYSArIHJhdGlvICogKGIgLSBhKTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBbmltYXRpb247XHJcblxyXG5cclxuIiwiZnVuY3Rpb24gTWluaU1hcCgpIHsgLy9kZXByZWNhdGVkLCBwbGVhc2UgdXBkYXRlXHJcbn1cclxuXHJcbk1pbmlNYXAucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBpZiAobWFwVGltZXIgPD0gMCB8fCBzZXJ2ZXJNYXAgPT09IG51bGwpIHtcclxuICAgICAgICB2YXIgdGlsZUxlbmd0aCA9IE1hdGguc3FydChPYmplY3Quc2l6ZShUSUxFX0xJU1QpKTtcclxuICAgICAgICBpZiAodGlsZUxlbmd0aCA9PT0gMCB8fCAhc2VsZlBsYXllcikge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBpbWdEYXRhID0gbWFpbkN0eC5jcmVhdGVJbWFnZURhdGEodGlsZUxlbmd0aCwgdGlsZUxlbmd0aCk7XHJcbiAgICAgICAgdmFyIHRpbGU7XHJcbiAgICAgICAgdmFyIHRpbGVSR0I7XHJcbiAgICAgICAgdmFyIGkgPSAwO1xyXG5cclxuXHJcbiAgICAgICAgZm9yICh2YXIgaWQgaW4gVElMRV9MSVNUKSB7XHJcbiAgICAgICAgICAgIHRpbGVSR0IgPSB7fTtcclxuICAgICAgICAgICAgdGlsZSA9IFRJTEVfTElTVFtpZF07XHJcbiAgICAgICAgICAgIGlmICh0aWxlLmNvbG9yICYmIHRpbGUuYWxlcnQgfHwgaW5Cb3VuZHMoc2VsZlBsYXllciwgdGlsZS54LCB0aWxlLnkpKSB7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLnIgPSB0aWxlLmNvbG9yLnI7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLmcgPSB0aWxlLmNvbG9yLmc7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLmIgPSB0aWxlLmNvbG9yLmI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLnIgPSAwO1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5nID0gMDtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuYiA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGltZ0RhdGEuZGF0YVtpXSA9IHRpbGVSR0IucjtcclxuICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2kgKyAxXSA9IHRpbGVSR0IuZztcclxuICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2kgKyAyXSA9IHRpbGVSR0IuYjtcclxuICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2kgKyAzXSA9IDI1NTtcclxuICAgICAgICAgICAgaSArPSA0O1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zb2xlLmxvZyg0MDAgLyBPYmplY3Quc2l6ZShUSUxFX0xJU1QpKTtcclxuICAgICAgICBpbWdEYXRhID0gc2NhbGVJbWFnZURhdGEoaW1nRGF0YSwgTWF0aC5mbG9vcig0MDAgLyBPYmplY3Quc2l6ZShUSUxFX0xJU1QpKSwgbWFpbkN0eCk7XHJcblxyXG4gICAgICAgIG1NYXBDdHgucHV0SW1hZ2VEYXRhKGltZ0RhdGEsIDAsIDApO1xyXG5cclxuICAgICAgICBtTWFwQ3R4Um90LnJvdGF0ZSg5MCAqIE1hdGguUEkgLyAxODApO1xyXG4gICAgICAgIG1NYXBDdHhSb3Quc2NhbGUoMSwgLTEpO1xyXG4gICAgICAgIG1NYXBDdHhSb3QuZHJhd0ltYWdlKG1NYXAsIDAsIDApO1xyXG4gICAgICAgIG1NYXBDdHhSb3Quc2NhbGUoMSwgLTEpO1xyXG4gICAgICAgIG1NYXBDdHhSb3Qucm90YXRlKDI3MCAqIE1hdGguUEkgLyAxODApO1xyXG5cclxuICAgICAgICBzZXJ2ZXJNYXAgPSBtTWFwUm90O1xyXG4gICAgICAgIG1hcFRpbWVyID0gMjU7XHJcbiAgICB9XHJcblxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgbWFwVGltZXIgLT0gMTtcclxuICAgIH1cclxuXHJcbiAgICBtYWluQ3R4LmRyYXdJbWFnZShzZXJ2ZXJNYXAsIDgwMCwgNDAwKTtcclxufTsgLy9kZXByZWNhdGVkXHJcblxyXG5NaW5pTWFwLnByb3RvdHlwZS5zY2FsZUltYWdlRGF0YSA9IGZ1bmN0aW9uIChpbWFnZURhdGEsIHNjYWxlLCBtYWluQ3R4KSB7XHJcbiAgICB2YXIgc2NhbGVkID0gbWFpbkN0eC5jcmVhdGVJbWFnZURhdGEoaW1hZ2VEYXRhLndpZHRoICogc2NhbGUsIGltYWdlRGF0YS5oZWlnaHQgKiBzY2FsZSk7XHJcbiAgICB2YXIgc3ViTGluZSA9IG1haW5DdHguY3JlYXRlSW1hZ2VEYXRhKHNjYWxlLCAxKS5kYXRhO1xyXG4gICAgZm9yICh2YXIgcm93ID0gMDsgcm93IDwgaW1hZ2VEYXRhLmhlaWdodDsgcm93KyspIHtcclxuICAgICAgICBmb3IgKHZhciBjb2wgPSAwOyBjb2wgPCBpbWFnZURhdGEud2lkdGg7IGNvbCsrKSB7XHJcbiAgICAgICAgICAgIHZhciBzb3VyY2VQaXhlbCA9IGltYWdlRGF0YS5kYXRhLnN1YmFycmF5KFxyXG4gICAgICAgICAgICAgICAgKHJvdyAqIGltYWdlRGF0YS53aWR0aCArIGNvbCkgKiA0LFxyXG4gICAgICAgICAgICAgICAgKHJvdyAqIGltYWdlRGF0YS53aWR0aCArIGNvbCkgKiA0ICsgNFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICBmb3IgKHZhciB4ID0gMDsgeCA8IHNjYWxlOyB4KyspIHN1YkxpbmUuc2V0KHNvdXJjZVBpeGVsLCB4ICogNClcclxuICAgICAgICAgICAgZm9yICh2YXIgeSA9IDA7IHkgPCBzY2FsZTsgeSsrKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGVzdFJvdyA9IHJvdyAqIHNjYWxlICsgeTtcclxuICAgICAgICAgICAgICAgIHZhciBkZXN0Q29sID0gY29sICogc2NhbGU7XHJcbiAgICAgICAgICAgICAgICBzY2FsZWQuZGF0YS5zZXQoc3ViTGluZSwgKGRlc3RSb3cgKiBzY2FsZWQud2lkdGggKyBkZXN0Q29sKSAqIDQpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHNjYWxlZDtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTWluaU1hcDsiLCJmdW5jdGlvbiBQbGF5ZXIocGxheWVySW5mbywgY2xpZW50KSB7XHJcbiAgICB0aGlzLmlkID0gcGxheWVySW5mby5pZDtcclxuICAgIHRoaXMubmFtZSA9IHBsYXllckluZm8ubmFtZTtcclxuICAgIHRoaXMueCA9IHBsYXllckluZm8ueDtcclxuICAgIHRoaXMueSA9IHBsYXllckluZm8ueTtcclxuICAgIHRoaXMuaGVhbHRoID0gcGxheWVySW5mby5oZWFsdGg7XHJcbiAgICB0aGlzLm1heEhlYWx0aCA9IHBsYXllckluZm8ubWF4SGVhbHRoO1xyXG4gICAgdGhpcy50aGV0YSA9IHBsYXllckluZm8udGhldGE7XHJcbiAgICB0aGlzLmxldmVsID0gcGxheWVySW5mby5sZXZlbDsgLy9uZWVkIHRvIGltcGxlbWVudCBhZ2FpblxyXG4gICAgdGhpcy5yYWRpdXMgPSBwbGF5ZXJJbmZvLnJhZGl1cztcclxuICAgIHRoaXMudmVydGljZXMgPSBwbGF5ZXJJbmZvLnZlcnRpY2VzO1xyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcblxyXG4gICAgaWYgKCF0aGlzLlNFTEZfUExBWUVSICYmIHRoaXMuaWQgPT09IHRoaXMuY2xpZW50LlNFTEZfSUQpIHtcclxuICAgICAgICB0aGlzLmNsaWVudC5hY3RpdmUgPSB0aGlzLmFjdGl2ZTsgLy9wcm9iYWJseSBzaG91bGQgY2hhbmdlIHRoaXNcclxuICAgICAgICB0aGlzLmNsaWVudC5TRUxGX1BMQVlFUiA9IHRoaXM7XHJcbiAgICB9XHJcbn1cclxuXHJcblBsYXllci5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKHBsYXllckluZm8pIHtcclxuICAgIHRoaXMueCA9IHBsYXllckluZm8ueDtcclxuICAgIHRoaXMueSA9IHBsYXllckluZm8ueTtcclxuICAgIHRoaXMuaGVhbHRoID0gcGxheWVySW5mby5oZWFsdGg7XHJcbiAgICB0aGlzLm1heEhlYWx0aCA9IHBsYXllckluZm8ubWF4SGVhbHRoO1xyXG4gICAgdGhpcy50aGV0YSA9IHBsYXllckluZm8udGhldGE7XHJcbiAgICB0aGlzLmxldmVsID0gcGxheWVySW5mby5sZXZlbDtcclxuICAgIHRoaXMuc2hvb3RpbmcgPSBwbGF5ZXJJbmZvLnNob290aW5nO1xyXG4gICAgdGhpcy5yYWRpdXMgPSBwbGF5ZXJJbmZvLnJhZGl1cztcclxuICAgIHRoaXMudnVsbmVyYWJsZSA9IHBsYXllckluZm8udnVsbmVyYWJsZTtcclxuICAgIHRoaXMudmVydGljZXMgPSBwbGF5ZXJJbmZvLnZlcnRpY2VzO1xyXG59O1xyXG5cclxuUGxheWVyLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50Lm1haW5DdHg7XHJcbiAgICB2YXIgc2VsZklkID0gdGhpcy5jbGllbnQuU0VMRl9JRDtcclxuICAgIHZhciBmaWxsQWxwaGE7XHJcbiAgICB2YXIgc3Ryb2tlQWxwaGE7XHJcbiAgICB2YXIgaTtcclxuXHJcblxyXG4gICAgZmlsbEFscGhhID0gdGhpcy5oZWFsdGggLyAoNCAqIHRoaXMubWF4SGVhbHRoKTtcclxuICAgIHN0cm9rZUFscGhhID0gMTtcclxuXHJcbiAgICBjdHguZm9udCA9IFwiMjBweCBBcmlhbFwiO1xyXG5cclxuXHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoMjUyLCAxMDIsIDM3LFwiICsgc3Ryb2tlQWxwaGEgKyBcIilcIjtcclxuICAgIGlmICh0aGlzLnNob290aW5nKSB7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiZ3JlZW5cIjtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHRoaXMudnVsbmVyYWJsZSkge1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcInJlZFwiO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwicmdiYSgxMjMsMCwwLFwiICsgZmlsbEFscGhhICsgXCIpXCI7XHJcbiAgICB9XHJcbiAgICBjdHgubGluZVdpZHRoID0gMTA7XHJcblxyXG5cclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuXHJcbiAgICBjdHgudHJhbnNsYXRlKHRoaXMueCwgdGhpcy55KTtcclxuICAgIGN0eC5yb3RhdGUodGhpcy50aGV0YSk7XHJcblxyXG4gICAgaWYgKHRoaXMudmVydGljZXMpIHtcclxuICAgICAgICB2YXIgdiA9IHRoaXMudmVydGljZXM7XHJcbiAgICAgICAgY3R4Lm1vdmVUbyh2WzBdWzBdICogdGhpcy5yYWRpdXMsIHZbMF1bMV0gKiB0aGlzLnJhZGl1cyk7XHJcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IHYubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgY3R4LmxpbmVUbyh2W2ldWzBdICogdGhpcy5yYWRpdXMsIHZbaV1bMV0gKiB0aGlzLnJhZGl1cyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGN0eC5saW5lVG8odlswXVswXSAqIHRoaXMucmFkaXVzLCB2WzBdWzFdICogdGhpcy5yYWRpdXMpO1xyXG4gICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgfVxyXG4gICAgY3R4LmZpbGwoKTtcclxuICAgIGN0eC5zdHJva2UoKTtcclxuXHJcbiAgICBjdHgucm90YXRlKDIgKiBNYXRoLlBJIC0gdGhpcy50aGV0YSk7XHJcblxyXG5cclxuICAgIGlmICghdGhpcy52dWxuZXJhYmxlKSB7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwicmdiYSgwLCAyNTUsIDAsIDAuMylcIjtcclxuICAgICAgICBjdHguYXJjKDAsIDAsIHRoaXMucmFkaXVzICogMiwgMCwgMiAqIE1hdGguUEkpO1xyXG4gICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICB9XHJcblxyXG4gICAgY3R4LnRyYW5zbGF0ZSgtdGhpcy54LCAtdGhpcy55KTtcclxuXHJcblxyXG4gICAgY3R4LmNsb3NlUGF0aCgpO1xyXG5cclxuXHJcbiAgICBpZiAoMSA9PT0gMykge1xyXG4gICAgICAgIHZhciByYWRpdXMgPSB0aGlzLnJhZGl1cztcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4Lm1vdmVUbyh0aGlzLnggKyByYWRpdXMsIHRoaXMueSk7XHJcbiAgICAgICAgdmFyIHRoZXRhLCB4LCB5O1xyXG4gICAgICAgIGZvciAoaSA9IE1hdGguUEkgLyA0OyBpIDw9IDIgKiBNYXRoLlBJIC0gTWF0aC5QSSAvIDQ7IGkgKz0gTWF0aC5QSSAvIDQpIHtcclxuICAgICAgICAgICAgdGhldGEgPSBpO1xyXG4gICAgICAgICAgICB4ID0gcmFkaXVzICogTWF0aC5jb3ModGhldGEpO1xyXG4gICAgICAgICAgICB5ID0gcmFkaXVzICogTWF0aC5zaW4odGhldGEpO1xyXG4gICAgICAgICAgICBjdHgubGluZVRvKHRoaXMueCArIHgsIHRoaXMueSArIHkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjdHgubGluZVRvKHRoaXMueCArIHJhZGl1cywgdGhpcy55ICsgMyk7XHJcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGN0eC5maWxsU3R5bGUgPSBcIiNmZjlkNjBcIjtcclxuICAgIGN0eC5maWxsVGV4dCh0aGlzLm5hbWUsIHRoaXMueCwgdGhpcy55ICsgNzApO1xyXG5cclxuXHJcbiAgICBpZiAodGhpcy5oZWFsdGggJiYgdGhpcy5tYXhIZWFsdGggJiYgdGhpcy5oZWFsdGggPiAwKSB7IC8vaGVhbHRoIGJhclxyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAxMDtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJibGFja1wiO1xyXG4gICAgICAgIGN0eC5yZWN0KHRoaXMueCwgdGhpcy55LCAxMDAsIDIwKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG5cclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiZ3JlZW5cIjtcclxuICAgICAgICBjdHgucmVjdCh0aGlzLngsIHRoaXMueSwgMTAwICogdGhpcy5oZWFsdGggLyB0aGlzLm1heEhlYWx0aCwgMjApO1xyXG4gICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfSAvL2Rpc3BsYXkgaGVhbHRoIGJhclxyXG5cclxuXHJcbiAgICBjdHguY2xvc2VQYXRoKCk7XHJcbn07XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0UmFuZG9tKG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFBsYXllcjsiLCJmdW5jdGlvbiBSb2NrKHJvY2tJbmZvLCBjbGllbnQpIHtcclxuICAgIHRoaXMueCA9IHJvY2tJbmZvLng7XHJcbiAgICB0aGlzLnkgPSByb2NrSW5mby55O1xyXG4gICAgdGhpcy52ZXJ0aWNlcyA9IHJvY2tJbmZvLnZlcnRpY2VzO1xyXG4gICAgdGhpcy50aGV0YSA9IHJvY2tJbmZvLnRoZXRhO1xyXG4gICAgdGhpcy50ZXh0dXJlID0gcm9ja0luZm8udGV4dHVyZTtcclxuICAgIHRoaXMubmV1dHJhbCA9IHJvY2tJbmZvLm5ldXRyYWw7XHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxufVxyXG5cclxuUm9jay5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKHJvY2tJbmZvKSB7XHJcbiAgICB0aGlzLnggPSByb2NrSW5mby54O1xyXG4gICAgdGhpcy55ID0gcm9ja0luZm8ueTtcclxuICAgIHRoaXMudGhldGEgPSByb2NrSW5mby50aGV0YTtcclxuICAgIHRoaXMub3duZXIgPSByb2NrSW5mby5vd25lcjtcclxuICAgIHRoaXMubmV1dHJhbCA9IHJvY2tJbmZvLm5ldXRyYWw7XHJcbiAgICB0aGlzLmhlYWx0aCA9IHJvY2tJbmZvLmhlYWx0aDtcclxuICAgIHRoaXMubWF4SGVhbHRoID0gcm9ja0luZm8ubWF4SGVhbHRoO1xyXG4gICAgdGhpcy5mYXN0ID0gcm9ja0luZm8uZmFzdDtcclxufTtcclxuXHJcblxyXG5Sb2NrLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50Lm1haW5DdHg7XHJcbiAgICB2YXIgU0NBTEUgPSAxMDA7XHJcblxyXG5cclxuICAgIGN0eC5maWxsU3R5bGUgPSBcInBpbmtcIjsgLy9kZWZhdWx0IGNvbG9yXHJcbiAgICBzd2l0Y2ggKHRoaXMudGV4dHVyZSkge1xyXG4gICAgICAgIGNhc2UgXCJicm9uemVcIjpcclxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiYnJvd25cIjtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcInNpbHZlclwiOlxyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJncmV5XCI7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJnb2xkXCI6XHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBcInllbGxvd1wiO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiZW1lcmFsZFwiOlxyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJncmVlblwiO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgIH1cclxuXHJcblxyXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gIXRoaXMub3duZXIgPyBcImJsdWVcIiA6IFwiZ3JlZW5cIjtcclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IHRoaXMuZmFzdCA/IFwicmVkXCIgOiBjdHguc3Ryb2tlU3R5bGU7XHJcblxyXG5cclxuXHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcblxyXG4gICAgY3R4LnRyYW5zbGF0ZSh0aGlzLngsIHRoaXMueSk7XHJcbiAgICBjdHgucm90YXRlKHRoaXMudGhldGEpO1xyXG5cclxuICAgIGlmICh0aGlzLnZlcnRpY2VzKSB7XHJcbiAgICAgICAgdmFyIHYgPSB0aGlzLnZlcnRpY2VzO1xyXG4gICAgICAgIGN0eC5tb3ZlVG8odlswXVswXSAqIFNDQUxFLCB2WzBdWzFdICogU0NBTEUpO1xyXG5cclxuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IHYubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgY3R4LmxpbmVUbyh2W2ldWzBdICogU0NBTEUsIHZbaV1bMV0gKiBTQ0FMRSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGN0eC5saW5lVG8odlswXVswXSAqIFNDQUxFLCB2WzBdWzFdICogU0NBTEUpO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgY3R4LmZpbGxSZWN0KDAsIDAsIDMwLCAzMCk7XHJcbiAgICB9XHJcblxyXG4gICAgY3R4LmZpbGwoKTtcclxuICAgIGN0eC5zdHJva2UoKTtcclxuXHJcbiAgICBjdHgucm90YXRlKDIgKiBNYXRoLlBJIC0gdGhpcy50aGV0YSk7XHJcbiAgICBjdHgudHJhbnNsYXRlKC10aGlzLngsIC10aGlzLnkpO1xyXG5cclxuICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuXHJcblxyXG4gICAgaWYgKHRoaXMuaGVhbHRoICYmIHRoaXMubWF4SGVhbHRoICYmIHRoaXMuaGVhbHRoID4gMCkgeyAvL2hlYWx0aCBiYXJcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gMTA7XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiYmxhY2tcIjtcclxuICAgICAgICBjdHgucmVjdCh0aGlzLngsIHRoaXMueSwgMTAwLCAyMCk7XHJcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuXHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcImdyZWVuXCI7XHJcbiAgICAgICAgY3R4LnJlY3QodGhpcy54LCB0aGlzLnksIDEwMCAqIHRoaXMuaGVhbHRoIC8gdGhpcy5tYXhIZWFsdGgsIDIwKTtcclxuICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuICAgIH0gLy9kaXNwbGF5IGhlYWx0aCBiYXJcclxufTtcclxuXHJcblxyXG5mdW5jdGlvbiBnZXRSYW5kb20obWluLCBtYXgpIHtcclxuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikgKyBtaW47XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUm9jazsiLCJmdW5jdGlvbiBUaWxlKHRoaXNJbmZvLCBjbGllbnQpIHtcclxuICAgIHRoaXMuaWQgPSB0aGlzSW5mby5pZDtcclxuICAgIHRoaXMueCA9IHRoaXNJbmZvLng7XHJcbiAgICB0aGlzLnkgPSB0aGlzSW5mby55O1xyXG4gICAgdGhpcy5sZW5ndGggPSB0aGlzSW5mby5sZW5ndGg7XHJcbiAgICB0aGlzLmNvbG9yID0gdGhpc0luZm8uY29sb3I7XHJcbiAgICB0aGlzLnRvcENvbG9yID0ge1xyXG4gICAgICAgIHI6IHRoaXMuY29sb3IuciArIDEwLFxyXG4gICAgICAgIGc6IHRoaXMuY29sb3IuZyArIDEwLFxyXG4gICAgICAgIGI6IHRoaXMuY29sb3IuYiArIDEwXHJcbiAgICB9O1xyXG4gICAgdGhpcy5ib3JkZXJDb2xvciA9IHtcclxuICAgICAgICByOiB0aGlzLmNvbG9yLnIgLSAxMCxcclxuICAgICAgICBnOiB0aGlzLmNvbG9yLmcgLSAxMCxcclxuICAgICAgICBiOiB0aGlzLmNvbG9yLmIgLSAxMFxyXG4gICAgfTtcclxuICAgIHRoaXMuYWxlcnQgPSB0aGlzSW5mby5hbGVydDtcclxuICAgIHRoaXMucmFuZG9tID0gTWF0aC5mbG9vcihnZXRSYW5kb20oMCwgMykpO1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5UaWxlLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAodGhpc0luZm8pIHtcclxuICAgIHRoaXMuY29sb3IgPSB0aGlzSW5mby5jb2xvcjtcclxuICAgIHRoaXMudG9wQ29sb3IgPSB7XHJcbiAgICAgICAgcjogdGhpcy5jb2xvci5yICsgMTAwLFxyXG4gICAgICAgIGc6IHRoaXMuY29sb3IuZyArIDEwMCxcclxuICAgICAgICBiOiB0aGlzLmNvbG9yLmIgKyAxMDBcclxuICAgIH07XHJcbiAgICB0aGlzLmJvcmRlckNvbG9yID0ge1xyXG4gICAgICAgIHI6IHRoaXMuY29sb3IuciAtIDEwLFxyXG4gICAgICAgIGc6IHRoaXMuY29sb3IuZyAtIDEwLFxyXG4gICAgICAgIGI6IHRoaXMuY29sb3IuYiAtIDEwXHJcbiAgICB9O1xyXG4gICAgdGhpcy5hbGVydCA9IHRoaXNJbmZvLmFsZXJ0O1xyXG59O1xyXG5cclxuVGlsZS5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5tYWluQ3R4O1xyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG5cclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwicmdiKFwiICsgdGhpcy5ib3JkZXJDb2xvci5yICsgXCIsXCIgKyB0aGlzLmJvcmRlckNvbG9yLmcgKyBcIixcIiArIHRoaXMuYm9yZGVyQ29sb3IuYiArIFwiKVwiO1xyXG4gICAgY3R4LmxpbmVXaWR0aCA9IDIwO1xyXG5cclxuXHJcbiAgICB2YXIgZ3JkID0gY3R4LmNyZWF0ZUxpbmVhckdyYWRpZW50KHRoaXMueCArIHRoaXMubGVuZ3RoICogMy80LCB0aGlzLnksIHRoaXMueCArIHRoaXMubGVuZ3RoLzQsIHRoaXMueSArIHRoaXMubGVuZ3RoKTtcclxuICAgIGdyZC5hZGRDb2xvclN0b3AoMCwgXCJyZ2IoXCIgKyB0aGlzLnRvcENvbG9yLnIgKyBcIixcIiArIHRoaXMudG9wQ29sb3IuZyArIFwiLFwiICsgdGhpcy50b3BDb2xvci5iICsgXCIpXCIpO1xyXG4gICAgZ3JkLmFkZENvbG9yU3RvcCgxLCBcInJnYihcIiArIHRoaXMuY29sb3IuciArIFwiLFwiICsgdGhpcy5jb2xvci5nICsgXCIsXCIgKyB0aGlzLmNvbG9yLmIgKyBcIilcIik7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gZ3JkO1xyXG5cclxuXHJcbiAgICBjdHgucmVjdCh0aGlzLnggKyAzMCwgdGhpcy55ICsgMzAsIHRoaXMubGVuZ3RoIC0gMzAsIHRoaXMubGVuZ3RoIC0gMzApO1xyXG5cclxuICAgIGN0eC5zdHJva2UoKTtcclxuICAgIGN0eC5maWxsKCk7XHJcblxyXG5cclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFRpbGU7XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0UmFuZG9tKG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluO1xyXG59IiwibW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgICBBbmltYXRpb246IHJlcXVpcmUoJy4vQW5pbWF0aW9uJyksXHJcbiAgICBQbGF5ZXI6IHJlcXVpcmUoJy4vUGxheWVyJyksXHJcbiAgICBNaW5pTWFwOiByZXF1aXJlKCcuL01pbmlNYXAnKSxcclxuICAgIFRpbGU6IHJlcXVpcmUoJy4vVGlsZScpLFxyXG4gICAgUm9jazogcmVxdWlyZSgnLi9Sb2NrJylcclxufTsiLCJ2YXIgQ2xpZW50ID0gcmVxdWlyZSgnLi9DbGllbnQuanMnKTtcclxudmFyIE1haW5VSSA9IHJlcXVpcmUoJy4vdWkvTWFpblVJJyk7XHJcblxyXG52YXIgY2xpZW50ID0gbmV3IENsaWVudCgpO1xyXG5jbGllbnQuc3RhcnQoKTtcclxuXHJcblxyXG5cclxuZG9jdW1lbnQub25rZXlkb3duID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBjbGllbnQua2V5c1tldmVudC5rZXlDb2RlXSA9IHRydWU7XHJcblxyXG4gICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDMyKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJTUEFDRVwiKTtcclxuICAgICAgICBjbGllbnQuc29ja2V0LmVtaXQoXCJzaG9vdFNlbGZcIiwge1xyXG4gICAgICAgICAgICBpZDogY2xpZW50LlNFTEZfSURcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufS5iaW5kKHRoaXMpO1xyXG5cclxuZG9jdW1lbnQub25rZXl1cCA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDg0KSB7XHJcbiAgICAgICAgY2xpZW50Lm1haW5VSS5nYW1lVUkuY2hhdFVJLnRleHRJbnB1dC5jbGljaygpO1xyXG4gICAgfVxyXG4gICAgY2xpZW50LmtleXNbZXZlbnQua2V5Q29kZV0gPSBmYWxzZTtcclxuICAgIGNsaWVudC5zb2NrZXQuZW1pdCgna2V5RXZlbnQnLCB7aWQ6IGV2ZW50LmtleUNvZGUsIHN0YXRlOiBmYWxzZX0pO1xyXG59O1xyXG5cclxuXHJcbiQod2luZG93KS5iaW5kKCdtb3VzZXdoZWVsIERPTU1vdXNlU2Nyb2xsJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBpZiAoZXZlbnQuY3RybEtleSA9PT0gdHJ1ZSkge1xyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICB9XHJcbiAgICBpZiAoY2xpZW50LkNIQVRfU0NST0xMKSB7XHJcbiAgICAgICAgY2xpZW50LkNIQVRfU0NST0xMID0gZmFsc2U7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGlmKGV2ZW50Lm9yaWdpbmFsRXZlbnQud2hlZWxEZWx0YSAvMTIwID4gMCAmJiBjbGllbnQubWFpblNjYWxlRmFjdG9yIDwgMikge1xyXG4gICAgICAgIGNsaWVudC5tYWluU2NhbGVGYWN0b3IgKz0gMC4wNTtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKGNsaWVudC5tYWluU2NhbGVGYWN0b3IgPiAwLjI1KSB7XHJcbiAgICAgICAgY2xpZW50Lm1haW5TY2FsZUZhY3RvciAtPSAwLjA1O1xyXG4gICAgfVxyXG59KTtcclxuXHJcbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NvbnRleHRtZW51JywgZnVuY3Rpb24gKGUpIHsgLy9wcmV2ZW50IHJpZ2h0LWNsaWNrIGNvbnRleHQgbWVudVxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG59LCBmYWxzZSk7IiwiZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLm92ZXJmbG93ID0gJ2hpZGRlbic7ICAvLyBmaXJlZm94LCBjaHJvbWVcclxuZG9jdW1lbnQuYm9keS5zY3JvbGwgPSBcIm5vXCI7XHJcblxyXG52YXIgUGxheWVyTmFtZXJVSSA9IHJlcXVpcmUoJy4vUGxheWVyTmFtZXJVSScpO1xyXG52YXIgR2FtZVVJID0gcmVxdWlyZSgnLi9nYW1lL0dhbWVVSScpO1xyXG5cclxuZnVuY3Rpb24gTWFpblVJKGNsaWVudCwgc29ja2V0KSB7XHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxuICAgIHRoaXMuc29ja2V0ID0gc29ja2V0O1xyXG5cclxuICAgIHRoaXMuZ2FtZVVJID0gbmV3IEdhbWVVSSh0aGlzLmNsaWVudCwgdGhpcy5zb2NrZXQsIHRoaXMpO1xyXG5cclxuICAgIHRoaXMucGxheWVyTmFtZXJVSSA9IG5ldyBQbGF5ZXJOYW1lclVJKHRoaXMuY2xpZW50LCB0aGlzLnNvY2tldCk7XHJcbn1cclxuXHJcbk1haW5VSS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uIChpbmZvKSB7XHJcbiAgICB2YXIgYWN0aW9uID0gaW5mby5hY3Rpb247XHJcbiAgICB2YXIgaG9tZTtcclxuICAgIGlmIChhY3Rpb24gPT09IFwiZ2FtZU1zZ1Byb21wdFwiKSB7XHJcbiAgICAgICAgdGhpcy5nYW1lVUkuZ2FtZU1zZ1Byb21wdC5vcGVuKGluZm8ubWVzc2FnZSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuTWFpblVJLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uIChhY3Rpb24pIHtcclxuICAgIGlmIChhY3Rpb24gPT09IFwiZ2FtZU1zZ1Byb21wdFwiKSB7XHJcbiAgICAgICAgdGhpcy5nYW1lVUkuZ2FtZU1zZ1Byb21wdC5jbG9zZSgpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbk1haW5VSS5wcm90b3R5cGUudXBkYXRlTGVhZGVyQm9hcmQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgbGVhZGVyYm9hcmQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxlYWRlcmJvYXJkXCIpO1xyXG4gICAgdmFyIFBMQVlFUl9BUlJBWSA9IHRoaXMuY2xpZW50LlBMQVlFUl9BUlJBWTtcclxuXHJcblxyXG4gICAgdmFyIHBsYXllclNvcnQgPSBmdW5jdGlvbiAoYSwgYikge1xyXG4gICAgICAgIHZhciBwbGF5ZXJBID0gdGhpcy5jbGllbnQuUExBWUVSX0xJU1RbYV07XHJcbiAgICAgICAgdmFyIHBsYXllckIgPSB0aGlzLmNsaWVudC5QTEFZRVJfTElTVFtiXTtcclxuICAgICAgICByZXR1cm4gcGxheWVyQS5yYWRpdXMgLSBwbGF5ZXJCLnJhZGl1cztcclxuICAgIH0uYmluZCh0aGlzKTtcclxuXHJcbiAgICBQTEFZRVJfQVJSQVkuc29ydChwbGF5ZXJTb3J0KTtcclxuXHJcblxyXG4gICAgbGVhZGVyYm9hcmQuaW5uZXJIVE1MID0gXCJcIjtcclxuICAgIGZvciAodmFyIGkgPSBQTEFZRVJfQVJSQVkubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuICAgICAgICB2YXIgcGxheWVyID0gdGhpcy5jbGllbnQuUExBWUVSX0xJU1RbUExBWUVSX0FSUkFZW2ldXTtcclxuICAgICAgICB2YXIgZW50cnkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xyXG4gICAgICAgIGVudHJ5LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHBsYXllci5uYW1lICsgXCIgLSBcIiArIHBsYXllci5yYWRpdXMpKTtcclxuICAgICAgICBsZWFkZXJib2FyZC5hcHBlbmRDaGlsZChlbnRyeSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTWFpblVJOyIsImZ1bmN0aW9uIFBsYXllck5hbWVyVUkgKGNsaWVudCwgc29ja2V0KSB7XHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxuICAgIHRoaXMuc29ja2V0ID0gc29ja2V0O1xyXG5cclxuICAgIHRoaXMubGVhZGVyYm9hcmQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxlYWRlcmJvYXJkX2NvbnRhaW5lclwiKTtcclxuICAgIHRoaXMubmFtZUJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibmFtZVN1Ym1pdFwiKTtcclxuICAgIHRoaXMucGxheWVyTmFtZUlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbGF5ZXJOYW1lSW5wdXRcIik7XHJcbiAgICB0aGlzLnBsYXllck5hbWVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbGF5ZXJfbmFtZXJcIik7XHJcbn1cclxuXHJcblBsYXllck5hbWVyVUkucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnBsYXllck5hbWVJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIiwgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcclxuICAgICAgICAgICAgdGhpcy5uYW1lQnRuLmNsaWNrKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICB0aGlzLm5hbWVCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLmNsaWVudC5tYWluQ2FudmFzLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICB0aGlzLmxlYWRlcmJvYXJkLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICB0aGlzLnNvY2tldC5lbWl0KFwibmV3UGxheWVyXCIsXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IHRoaXMucGxheWVyTmFtZUlucHV0LnZhbHVlLFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLnBsYXllck5hbWVyLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMucGxheWVyTmFtZXIuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgdGhpcy5wbGF5ZXJOYW1lSW5wdXQuZm9jdXMoKTtcclxuICAgIHRoaXMubGVhZGVyYm9hcmQuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFBsYXllck5hbWVyVUk7IiwiZnVuY3Rpb24gQ2hhdFVJKHBhcmVudCkge1xyXG4gICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XHJcbiAgICB0aGlzLnRlbXBsYXRlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjaGF0X2NvbnRhaW5lclwiKTtcclxuICAgIHRoaXMudGV4dElucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NoYXRfaW5wdXQnKTtcclxuICAgIHRoaXMuY2hhdExpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2hhdF9saXN0Jyk7XHJcblxyXG5cclxuICAgIHRoaXMudGV4dElucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMudGV4dElucHV0LmZvY3VzKCk7XHJcblxyXG4gICAgICAgIHRoaXMucGFyZW50LmNsaWVudC5DSEFUX09QRU4gPSB0cnVlO1xyXG4gICAgICAgIHRoaXMuY2hhdExpc3Quc3R5bGUuaGVpZ2h0ID0gXCI4MCVcIjtcclxuICAgICAgICB0aGlzLmNoYXRMaXN0LnN0eWxlLm92ZXJmbG93WSA9IFwiYXV0b1wiO1xyXG5cclxuICAgICAgICB0aGlzLnRleHRJbnB1dC5zdHlsZS5iYWNrZ3JvdW5kID0gXCJyZ2JhKDM0LCA0OCwgNzEsIDEpXCI7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG4gICAgdGhpcy50ZXh0SW5wdXQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgaWYgKGUua2V5Q29kZSA9PT0gMTMpIHtcclxuICAgICAgICAgICAgdGhpcy5zZW5kTWVzc2FnZSgpO1xyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG5cclxuICAgIHRoaXMudGVtcGxhdGUuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V3aGVlbCcsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnBhcmVudC5jbGllbnQuQ0hBVF9TQ1JPTEwgPSB0cnVlO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICB0aGlzLnRlbXBsYXRlLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnBhcmVudC5jbGllbnQuQ0hBVF9DTElDSyA9IHRydWU7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG59XHJcblxyXG5DaGF0VUkucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAobWVzc2FnZSkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xyXG4gICAgdGhpcy5jbG9zZSgpO1xyXG59O1xyXG5cclxuXHJcbkNoYXRVSS5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnRleHRJbnB1dC5ibHVyKCk7XHJcbiAgICB0aGlzLnBhcmVudC5jbGllbnQuQ0hBVF9PUEVOID0gZmFsc2U7XHJcbiAgICB0aGlzLmNoYXRMaXN0LnN0eWxlLmhlaWdodCA9IFwiMzAlXCI7XHJcbiAgICB0aGlzLmNoYXRMaXN0LnN0eWxlLmJhY2tncm91bmQgPSBcInJnYmEoMTgyLCAxOTMsIDIxMSwgMC4wMilcIjtcclxuICAgIHRoaXMudGV4dElucHV0LnN0eWxlLmJhY2tncm91bmQgPSBcInJnYmEoMTgyLCAxOTMsIDIxMSwgMC4xKVwiO1xyXG4gICAgdGhpcy5wYXJlbnQuY2xpZW50LkNIQVRfU0NST0xMID0gZmFsc2U7XHJcbiAgICAkKCcjY2hhdF9saXN0JykuYW5pbWF0ZSh7c2Nyb2xsVG9wOiAkKCcjY2hhdF9saXN0JykucHJvcChcInNjcm9sbEhlaWdodFwiKX0sIDEwMCk7XHJcbiAgICB0aGlzLmNoYXRMaXN0LnN0eWxlLm92ZXJmbG93WSA9IFwibm9uZVwiO1xyXG59O1xyXG5cclxuXHJcbkNoYXRVSS5wcm90b3R5cGUuYWRkTWVzc2FnZSA9IGZ1bmN0aW9uIChwYWNrZXQpIHtcclxuICAgIHZhciBlbnRyeSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XHJcbiAgICBlbnRyeS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShwYWNrZXQubmFtZSArIFwiIDogXCIgKyBwYWNrZXQuY2hhdE1lc3NhZ2UpKTtcclxuICAgIHRoaXMuY2hhdExpc3QuYXBwZW5kQ2hpbGQoZW50cnkpO1xyXG5cclxuICAgICQoJyNjaGF0X2xpc3QnKS5hbmltYXRlKHtzY3JvbGxUb3A6ICQoJyNjaGF0X2xpc3QnKS5wcm9wKFwic2Nyb2xsSGVpZ2h0XCIpfSwgMTAwKTtcclxufTtcclxuXHJcblxyXG5DaGF0VUkucHJvdG90eXBlLnNlbmRNZXNzYWdlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHNvY2tldCA9IHRoaXMucGFyZW50LnNvY2tldDtcclxuXHJcblxyXG4gICAgaWYgKHRoaXMudGV4dElucHV0LnZhbHVlICYmIHRoaXMudGV4dElucHV0LnZhbHVlICE9PSBcIlwiKSB7XHJcbiAgICAgICAgc29ja2V0LmVtaXQoJ2NoYXRNZXNzYWdlJywge1xyXG4gICAgICAgICAgICBpZDogdGhpcy5wYXJlbnQuY2xpZW50LlNFTEZfSUQsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6IHRoaXMudGV4dElucHV0LnZhbHVlXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy50ZXh0SW5wdXQudmFsdWUgPSBcIlwiO1xyXG4gICAgfVxyXG4gICAgdGhpcy5jbG9zZSgpO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDaGF0VUk7XHJcblxyXG5cclxuIiwiZnVuY3Rpb24gR2FtZU1zZ1Byb21wdChwYXJlbnQpIHtcclxuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xyXG4gICAgdGhpcy50ZW1wbGF0ZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicHJvbXB0X2NvbnRhaW5lclwiKTtcclxuICAgIHRoaXMubWVzc2FnZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdnYW1lX21zZ19wcm9tcHQnKTtcclxufVxyXG5cclxuR2FtZU1zZ1Byb21wdC5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uIChtZXNzYWdlKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcbiAgICB0aGlzLm1lc3NhZ2UuaW5uZXJIVE1MID0gbWVzc2FnZTtcclxufTtcclxuXHJcbkdhbWVNc2dQcm9tcHQucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEdhbWVNc2dQcm9tcHQ7XHJcblxyXG5cclxuIiwidmFyIEdhbWVNc2dQcm9tcHQgPSByZXF1aXJlKCcuL0dhbWVNc2dQcm9tcHQnKTtcclxudmFyIENoYXRVSSA9IHJlcXVpcmUoJy4vQ2hhdFVJJyk7XHJcblxyXG5mdW5jdGlvbiBHYW1lVUkoY2xpZW50LCBzb2NrZXQsIHBhcmVudCkge1xyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbiAgICB0aGlzLnNvY2tldCA9IHNvY2tldDtcclxuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xyXG4gICAgdGhpcy5nYW1lTXNnUHJvbXB0ID0gbmV3IEdhbWVNc2dQcm9tcHQodGhpcyk7XHJcbiAgICB0aGlzLmNoYXRVSSA9IG5ldyBDaGF0VUkodGhpcyk7XHJcbn1cclxuXHJcbkdhbWVVSS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGNvbnNvbGUubG9nKFwiT1BFTklORyBHQU1FIFVJXCIpO1xyXG4gICAgdGhpcy5jaGF0VUkub3BlbigpO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSAgR2FtZVVJOyJdfQ==
