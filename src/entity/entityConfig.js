var CHUNKS = 0;
var WIDTH = 0;
var TILES_INPUT = 0;
var ROCKS = 0;
var BORDER_WIDTH = 0;


var small = function () {
    CHUNKS = 121;
    WIDTH = 200;
    TILES_INPUT = 70;
    ROCKS = 200;
    BORDER_WIDTH = 30;
};


var medium = function () {
    CHUNKS = 4;
    WIDTH = 500;
    TILES_INPUT = 100;
    ROCKS = 400;
    BORDER_WIDTH = 100;
};


var large = function () {
    CHUNKS = 9;
    WIDTH = 10000;
    TILES_INPUT = 2000;
    ROCKS = 200;
    BORDER_WIDTH = 1000;
};


var superLarge = function () {
    CHUNKS = 2500;
    WIDTH = 400000;
    TILES_INPUT = 1000000;
    ROCKS = 100000;
    BORDER_WIDTH = 50000;
};


small();


var tileRoot = Math.floor(Math.sqrt(TILES_INPUT));
var TILES = tileRoot * tileRoot;
var SHARD_WIDTH = 10;

module.exports = {
    CHUNKS: CHUNKS,
    WIDTH: WIDTH,
    TILES: TILES,
    ROCKS: ROCKS,
    SHARD_WIDTH: SHARD_WIDTH,
    BORDER_WIDTH: BORDER_WIDTH
};