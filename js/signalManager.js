var signalManager = function() {
    this.signalsToDeliver = [];
};

signalManager.prototype.clearSignals = function() {
    this.signalsToDeliver = [];
};


signalManager.prototype.clearDroneSignals = function(id) {
    this.signalsToDeliver = _.reject(this.signalsToDeliver, function(element) { element.id == id; });
};

signalManager.prototype.addSignal = function(id, x,y,data) {

    this.signalsToDeliver.push({
        id: id,
        x: x,
        y: y,
        data: data
    });
};

signalManager.prototype.getSignals = function(x,y, threshold) {

    var results = [];

    _.each(this.signalsToDeliver, function(element) {
        var distance = distanceMetric(element, {x:x, y:y});
        if (distance < threshold) results.push(element);
    });

    return results;
};