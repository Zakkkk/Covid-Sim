// Zak Venter 03/05/23
const prompt = require('prompt-sync')()
var fs = require('fs');

const inputPopulation = parseInt(prompt("population: "))
const inputSocialDistancing = prompt("social distancing (y/n): ") == "y" ? true : false
const inputTimesToRun = parseInt(prompt("times to run: "))


// Utils
let randomChance = (chance, functionToRun) => {
    let percent = Math.floor(Math.random() * (100 + 1))
    if (percent <= chance)
    functionToRun()
}

//------//
let totalImmunity = 0
let totalInfections = 0
let totalDeaths = 0
let peakInfected = 0

let currentInfections = 0

let socialDistancing = false

let peopleCollection = []
let peopleToBeInfected = []

function Person () {
    this.id = 0
    this.previouslyInfected = false
    this.daysSinceInfection = 0

    this.isVulnerable = (percent => {
        if (percent <= 10) // 10% chance of being vulnerable to severe illness
            return true
        else return false
    })(Math.floor(Math.random() * (100 + 1)))

    this.removeSelfFromInfectable = () => {
        peopleToBeInfected = peopleToBeInfected.filter(person => person.id !== this.id)
    }

    this.isAlive = true
    this.kill = () => {
        this.isAlive = false
        totalDeaths++
        currentInfections--
        this.removeSelfFromInfectable()
    }

    this.isInfected = false
    this.infect = () => {
        this.previouslyInfected = true
        this.isInfected = true
        currentInfections++
        totalInfections++
        this.removeSelfFromInfectable()
    }

    this.recover = () => {
        this.isInfected = false
        currentInfections--
        totalImmunity++
        this.removeSelfFromInfectable()
    }

    this.infectOthers = (amount) => {
        // Will infect other people
        if (peopleToBeInfected.length <= amount) return;

        for (let i = 0; i < amount; i++)
            peopleToBeInfected[i].infect()
    }

    this.dayPass = () => {
        if (!this.isInfected)
            return
        if (!this.isAlive)
            return

        if (this.isVulnerable)
            randomChance(2, this.kill)
        if ((socialDistancing && this.daysSinceInfection < 2) || !socialDistancing) {
            randomChance(25, ()=>this.infectOthers(1))
        } else if (socialDistancing) {
            if (this.daysSinceInfection >= 2) { // are social distancing
                randomChance(15, ()=>this.infectOthers(1))
            }
        }

        if (this.daysSinceInfection >= 5) this.recover()
        this.daysSinceInfection++
    }
}

const createCollection = (population) => {
    peopleCollection = []
    peopleToBeInfected = []

    for (let i = 0; i < population; i++) {
        let person = new Person()
        person.id = i
        peopleCollection.push(person)
        peopleToBeInfected.push(person)
    }

    // console.log(`Created an array of ${peopleCollection.length} people.`)
}

const begin = (population, isSocialDistancing) => {
    totalImmunity = 0
    totalInfections = 0
    totalDeaths = 0
    peakInfected = 0
    
    currentInfections = 0

    let weeklyInfo = []
    let dailyInfection = []

    createCollection(population)
    
    // Will start with 10 people initially infected
    for (let i = 0; i < 10; i++)
         peopleCollection[i].infect()

    let weeklyNewCases = 0
    let daysPassed = 0

    socialDistancing = isSocialDistancing

    while (((totalDeaths + totalImmunity) != population) || currentInfections == 0) {
        // Each time this loop is run, a new day will pass
        let infectedSum = 0

        for (let i = 0; i < peopleCollection.length; i++) {
            peopleCollection[i].dayPass()
            if (peopleCollection[i].isInfected) infectedSum++
        }

        if (infectedSum > peakInfected) peakInfected = infectedSum
        dailyInfection.push(infectedSum)

        daysPassed++
        
        if (daysPassed %7 == 0) {
            // 1 week has passed
            // console.log(`${daysPassed/7} weeks have passed`)
            // console.log(`${totalDeaths} = totalDeaths`)
            // console.log(`${totalInfections} = totalInfections`)
            // console.log(`${currentInfections} = currentInfections`)
            // console.log(`${totalImmunity} = totalImmunity`)
            // weeklyNewCases = 
            console.log(`${daysPassed/7} weeks past. ${100 - 100*(peopleToBeInfected.length/peopleCollection.length)}% affected`)
            weeklyInfo.push(Math.round(((100 - 100*(peopleToBeInfected.length/peopleCollection.length)) * 100) / 100))
        }

        if (currentInfections<0) break;
    }

    let percentInfected = 0
    for (let i = 0; i < peopleCollection.length; i++)
        if (peopleCollection[i].previouslyInfected)
            percentInfected++

    percentInfected /= population

    // console.log(`
    //     days passed = ${daysPassed}
    //     deaths: ${totalDeaths}
    //     peak infections: ${peakInfected}
    //     % infected: ${percentInfected * 100}
    // `)

    return {daysPassed, totalDeaths, peakInfected, percentInfected, weeklyInfo, dailyInfection}
}

const findAverages = (population, social, timesToRun) => {
    let daysPassed = 0
    let totalDeaths = 0
    let peakInfected = 0
    let percentInfected = 0
    let vars = {}

    let weeklyCollections = []
    let exportData = {
        entries: []
    }

    for (let i = 0; i < timesToRun; i++) {
        vars = begin(population, social)

        daysPassed += vars.daysPassed
        totalDeaths += vars.totalDeaths
        peakInfected += vars.peakInfected
        percentInfected += vars.percentInfected

        weeklyCollections.push(vars.weeklyInfo)
        exportData.entries.push({
            title: `Simulation #${i+1}`,
            weeklyAffected: vars.weeklyInfo,
            dailyInfected: vars.dailyInfection
        })

        console.log(`${i+1}/${timesToRun} Simulations completed`)
    }

    daysPassed /= timesToRun
    totalDeaths /= timesToRun
    peakInfected /= timesToRun
    percentInfected /= timesToRun

    fs.writeFile(`${population}_${social}_${timesToRun}_${new Date().getTime()}.json`, JSON.stringify(exportData), function (err) {
        if (err) throw err
        console.log('File created')
    })

    return {daysPassed, totalDeaths, peakInfected, percentInfected}
}

console.log(findAverages(inputPopulation, inputSocialDistancing, inputTimesToRun))
