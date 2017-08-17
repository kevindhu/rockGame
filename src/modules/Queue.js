function Queue(){
    var a=[],b=0;

    this.isEmpty=function(){
        return 0==a.length
    };

    this.enqueue=function(b){
        a.push(b)
    };

    this.dequeue=function(){
        var c = a[0];
        a.splice(0, 1);
        return c;
    };

    this.peek = function (i) {
        return a[i];
    };

    this.length = function () {
        return a.length;
    }
};

module.exports = Queue;