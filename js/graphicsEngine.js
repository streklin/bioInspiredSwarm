var graphicsEngine = function(target, height, width) {
    var canvas = document.getElementById(target);
    canvas.setAttribute('height', height);
    canvas.setAttribute('width', width);

    this.canvas = canvas;
    this.canvasCTX = canvas.getContext('2d');

    canvas.addEventListener('mousedown', function(evt) {
        PubSub.publish(CANVAS_MOUSE_DOWN, {x: evt.layerX, y:evt.layerY});
    }, false);
};


graphicsEngine.prototype.render = function(objectList) {

    this.canvasCTX.clearRect(0, 0, this.canvas.width, this.canvas.height);

    var self = this;

    _.each(objectList, function(element) {

        switch(element.geometry) {
            case GEO_CIRCLE: drawCircle.call(self,element); break;
            case GEO_TRIANGLE: drawTriangle.call(self,element); break;
            case GEO_SQUARE: drawSquare.call(self,element); break;
        }
    });
};

function drawCircle(object) {
    this.canvasCTX.beginPath();
    this.canvasCTX.arc(object.x, object.y, object.radius, 0, 2 * Math.PI, false);
    this.canvasCTX.fillStyle = object.fillColour;
    this.canvasCTX.fill();
    this.canvasCTX.lineWidth = 1;
    this.canvasCTX.strokeStyle = object.strokeColour;
    this.canvasCTX.stroke();
    this.canvasCTX.fillStyle = '#000';
}

function drawTriangle(object) {
    var x = object.x;
    var y = object.y;
    var angle = object.orientation;
    var radius = object.radius;

    this.canvasCTX.save();

    //Set the origin to the center of the image
    this.canvasCTX.translate(x, y);
    this.canvasCTX.rotate(angle);

    var path = new Path2D();

    path.moveTo(0, 0);
    path.lineTo(radius, radius / 2);
    path.lineTo(0, radius);

    this.canvasCTX.fillStyle = object.fillColour;
    this.canvasCTX.fill(path);

    this.canvasCTX.restore();
}

function drawSquare(object) {
    var x = object.x;
    var y = object.y;
    var radius = object.radius;

    this.canvasCTX.save();

    //Set the origin to the center of the image
    this.canvasCTX.translate(x, y);

    var path = new Path2D();

    path.moveTo(0, 0);
    this.canvasCTX.fillStyle = object.fillColour;
    this.canvasCTX.fillRect(0,0,radius,radius);
    this.canvasCTX.fillStyle = '#000';

    this.canvasCTX.restore();
}