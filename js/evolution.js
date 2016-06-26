var evolutionSystem = function (mutationRate, crossOverRate) {
    this.mutationRate = mutationRate;
    this.crossOverRate = crossOverRate;
    this.wheelPosition = 0;
};

evolutionSystem.prototype.evolve = function (initialPopulation, iterations, fitnessFunction) {

    var population = initialPopulation;

    var populationSize = initialPopulation.length;

    for (var i = 0; i < iterations; i++) {

        console.log('Running iteration: ' + i);

        //fitness list
        var fitnessList = [];
        var totalFitness = 0;

        //evaluate fitness
        for(var j = 0; j < population.length; j++) {

            console.log(population[j]);

            var fitness = fitnessFunction(population[j]);

            if (fitness > 0) {
                fitnessList.push({
                    fitness: fitness,
                    genome: population[j]
                });

                totalFitness += fitness;
            }
        }

        //sort the population
        fitnessList = fitnessList.sort(function(a, b) {
            return a.fitness < b.fitness;
        });

        //generate next population
        var newPopulation = [];

        for(var j = 0; j < populationSize; j++) {
            var matingPair = selection.call(this, fitnessList, totalFitness);

            var selected = matingPair[0];

            if (this.mutationRate > Math.random()) {
                selected = mutate.call(this, selected);
            } else if (this.crossOverRate > Math.random()) {
                selected = crossOver.call(this, matingPair[0], matingPair[1]);
            }

            newPopulation.push(selected.genome);
        }

        populationSize--;

        population = newPopulation;
    }

};


/*
 Selects the next individuals for mating or cross over. This presumes that the individuals have been sorted from most fit, to least fit
 and uses a roulette wheel style of selection.
 */
function selection(individuals, totalFitness) {

    var matingPair = [];

    //spin the wheel
    spinWheel.call(this, totalFitness);

    //grab the individual
    var mate1Index = findOnWheel.call(this, individuals);
    matingPair.push(individuals[mate1Index]);

    //spin the wheel again
    spinWheel.call(this, totalFitness);

    //grab the individual
    var mate2Index = findOnWheel.call(this, individuals);
    matingPair.push(individuals[mate2Index]);

    //return the pair
    return matingPair;
}

function spinWheel(totalFitness) {
    this.wheelPosition += Math.random() * 5 * totalFitness;
    this.wheelPosition = this.wheelPosition % totalFitness;
}

function findOnWheel(individuals) {

    var index = 0;
    var wheel = 0;
    while (wheel < this.wheelPosition) {
        wheel += individuals[index].fitness;
        if (wheel > this.wheelPosition) return index;
        index++;
    }

    return index;
}

function crossOver(individualA, individualB) {

    var index = Math.floor(Math.random() * individualA.genome.length);

    var child = {
        fitness: individualA.fitness,
        genome: []
    };

    for (var i = 0; i < individualA.genome.length; i++) {

        if (i < index) {
            child.genome.push(individualA.genome[i]);
        } else {
            child.genome.push(individualB.genome[i]);
        }

    }

    return child;

}

function mutate(individual) {

    for(var i = 0; i < individual.genome.length; i++) {

        if (this.mutationRate > Math.random()) {
            var multiplier = 1;
            if (Math.random() > Math.random()) multiplier *= -1;
            individual.genome[i] += multiplier * Math.random();
        }
    }

    return individual;
}