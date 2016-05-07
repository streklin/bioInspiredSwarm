
var sensorReading = function(r, theta) {
    sensorReading.r = r;
    sensorReading.theta = theta;
};

var genomeTemplate = {
    speedDelta: 1,
    orientationDelta: 0.3,
    collisionThreshold: 5,
    wanderSpeedProb: 0.1,
    wanderOrientationProb: 0.30
};

var actionTemplate = {
    actionType: '',
    data: {}
};

var drone = function(x,y, theta, speed, genome, radio) {
    this.id = 0;
    this.x = x;
    this.y = y;
    this.theta = theta;
    this.speed = speed;
    this.grapple = false;
    this.genome = genome;
    this.radio = radio;
    this.backupCounter = 0;

    this.hasGoal = false;
    this.goal = null;
};

drone.prototype.update = function(sensoryInput) {

    var actions = wander.call(this, sensoryInput, []);
    actions = backup.call(this, sensoryInput, actions);
    actions = detectGoal.call(this, sensoryInput, actions);
    actions = signalSend.call(this, sensoryInput, actions);
    actions = processSignalsNoGoal.call(this, sensoryInput, actions);
    actions = processSignalsWithGoal.call(this, sensoryInput, actions);
    actions = approachGoal.call(this, sensoryInput, actions);
    actions = avoid.call(this, sensoryInput, actions);

    executeActions.call(this, actions);
};


function wander(sensoryInput, actions) {

    var actions = [];

    //change direction?
    if (Math.random() <= this.genome.wanderOrientationProb) {
        var angleDelta = Math.random() * this.genome.orientationDelta * 2;
        angleDelta -= this.genome.orientationDelta;
        actions.push({
            actionType: ACTION_ROTATE,
            data: angleDelta
        });
    }

    //change speed?
    if (Math.random() <= this.genome.wanderSpeedProb) {

        var speedDelta = Math.random() * this.genome.speedDelta * 2;
        speedDelta -= this.genome.speedDelta;

        if (this.speed < 0 && speedDelta < 0) speedDelta *= -1;

        actions.push({
            actionType: ACTION_SPEED,
            data: speedDelta
        });
    }

    return actions;
}

function avoid(sensoryInput, actions) {
    if (this.hasGoal) return actions;

    if (sensoryInput.length == 0) return actions;

    //find minimum distance
    var closestInput = null;

    for(var i = 0; i < sensoryInput.length; i++) {
        if (sensoryInput[i].isGoal) continue; //ignore goals

        if (_.isNull(closestInput)) {
            closestInput = sensoryInput[i];
            continue;
        }

        if (sensoryInput[i].distance < closestInput.distance) closestInput = sensoryInput[i];
    }

    //is this an obstacle?
    var distance = closestInput.distance;

    var theta1 = this.theta;
    var theta2 = closestInput.angle;


    var angleDiff = Math.atan2(Math.sin(theta1-theta2), Math.cos(theta1-theta2));

    if (Math.abs(angleDiff) > THRESHOLD_ANGLE) return actions;

    if (distance < THRESHOLD_DISTANCE && distance > THRESHOLD_EMERGENCY_STOP) {
        var da = 0.2;

        if (this.speed < 0) da *= -1;

        if (angleDiff < 0) da *=-1;

        var newAction = {
            actionType: ACTION_ROTATE,
            data: da
        };

        actions = subsume(newAction, actions);

    } else if (distance < THRESHOLD_EMERGENCY_STOP) {

        newAction = {
            actionType: ACTION_SPEED,
            data: -this.speed
        };

        actions = subsume(newAction, actions);
    }

    return actions;
}

function backup(sensoryInput, actions) {
    if (this.hasGoal) return actions;

    if(this.speed != 0) {
        this.backupCounter = 0;
        return actions;
    }

    this.backupCounter++;

    if(this.backupCounter > BACKWARDS_WAIT) {
        var newAction = {
            actionType: ACTION_SPEED,
            data: -2 * (MAXIMUM_SPEED)
        };

        actions = subsume(newAction, actions);
    }

    return actions;
}

function approachGoal(sensoryInput, actions) {

    if(!this.hasGoal) return actions;

    var self = this;

    //check that the goal still exists
    var result = _.find(sensoryInput, function(element) {
        if (!element.isGoal) return false;

        return element.id == self.goal.id;
    });

    if (_.isUndefined(result)) {
        this.hasGoal = false;
        this.goal = null;
        return actions;
    }

    var theta1 = this.theta;
    var theta2 = result.angle;


    var angleDiff = Math.atan2(Math.sin(theta1-theta2), Math.cos(theta1-theta2));

    var da = -0.2;

    if (this.speed < 0) da *= -1;

    if (angleDiff < 0) da *=-1;

    var rotateAction = {
        actionType: ACTION_ROTATE,
        data: da
    };

    actions = subsume(rotateAction, actions);

    if(result.distance < THRESHOLD_EMERGENCY_STOP) {
        var newAction = {
            actionType: ACTION_SPEED,
            data: -1 * this.speed
        };

        actions = subsume(newAction, actions);
    } else {
        if (this.speed < 0) {
            var motorAction = {
                actionType: ACTION_SPEED,
                data: MAXIMUM_SPEED * (result.distance / RADIO_THRESHOLD)
            };

            actions = subsume(motorAction, actions);
        }
    }

    return actions;
}

function detectGoal(sensoryInput, actions) {

    if (this.hasGoal) return actions;

    var goals = _.filter(sensoryInput, function(element) {return element.isGoal; });

    if (goals.length == 0) return actions;

    var winningGoal = null;

    for(var i = 0; i < goals.length; i++) {
        if (_.isNull(winningGoal)) {
            winningGoal = goals[i];
            continue;
        }

        if (goals[i].distance < winningGoal.distance) {
            winningGoal = goals[i];
        }
    }

    this.hasGoal = true;
    this.goal = winningGoal;

    return actions;

}

function signalSend(sensoryInput, actions) {

    //do drone have goal?
    if (!this.hasGoal) return actions;

    var self = this;

    var result = _.find(sensoryInput, function(element) {
        if (!element.isGoal) return false;

        return element.id == self.goal.id;
    });

    if (_.isUndefined(result)) return actions;

    var signalAction = {
        actionType: ACTION_SIGNAL,
        data: {
            id: result.id,
            distance: result.distance
        }
    };

    actions = subsume(signalAction, actions);
    return actions;

};

function processSignalsNoGoal(sensoryInput, actions) {

    if (this.hasGoal) return actions;

    var signals = this.radio.getSignals(this.x, this.y, RADIO_THRESHOLD);

    if (signals.length == 0) return actions;

    //check signals against sensory input
    var winningSignal = null;
    for(var i = 0; i < signals.length; i++) {
        var current = signals[i];

        if (current.id == this.id) continue; //filter out self signals

        //find the corresponding goal
        var result = _.find(sensoryInput, function(element) {
            if(!element.isGoal) return false;

            if (element.id == current.data.id) return true;
        });

        if (_.isUndefined(result)) continue;

        if (result.distance < current.data.distance ) {

            if(_.isNull(winningSignal)) winningSignal = current;

            if (current.data.distance < winningSignal.data.distance) winningSignal = current;

        }
    }

    if (!_.isNull(winningSignal)) {
        this.hasGoal = true;
        this.goal = winningSignal;
    }

    return actions;
}

function processSignalsWithGoal(sensoryInput, actions) {
    if (!this.hasGoal) return actions;

    var self = this;

    //check that the goal is active
    var result = _.find(sensoryInput, function(element) {
        if (!element.isGoal) return false;
        return self.goal.id == element.id;
    });

    if (_.isUndefined(result)) return actions; //goal is no longer active

    var signals = this.radio.getSignals(this.x, this.y, RADIO_THRESHOLD);

    if (signals.length == 0) return actions;

    //make sure we are still the best individual for the job.
    for(var i = 0; i < signals.length; i++) {
        if (signals[i].id == this.id) continue;

        var current = signals[i];

        if (current.data.id != result.id) continue; //don't care about other goals

        if (current.data.distance < result.distance) {
            this.goal = null;
            this.hasGoal = false;
            break;
        }
    }

    return actions;

}

function subsume(newAction, actionList) {
    //get rid of any other actions of this type
    actionList = _.reject(actionList, function(element) { element.actionType == newAction.actionType; });
    actionList.push(newAction);

    return actionList;
}

function executeActions(actions) {

    var self = this;

    this.radio.clearDroneSignals(this.id);


    _.each(actions, function(element) {
        switch(element.actionType) {
            case ACTION_ROTATE:
                self.theta += element.data;
                break;
            case ACTION_SPEED:
                self.speed += element.data;
                break;
            case ACTION_SIGNAL:
                self.radio.addSignal(self.id, self.x, self.y, element.data);
                break;
            case ACTION_STOP:
                self.speed = 0;
                break;
        }
    });

    //lock values within constraints
    if (self.theta < 0) self.theta += 2*Math.PI;
    if (self.theta > 2*Math.PI) self.theta -= 2*Math.PI;

    if (self.speed < -MAXIMUM_SPEED) self.speed = -MAXIMUM_SPEED;
    if (self.speed > MAXIMUM_SPEED) self.speed = MAXIMUM_SPEED;
}

