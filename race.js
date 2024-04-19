const rightPanelWidth = 300;

document.body.style.flexDirection = "column";

const carCanvas = document.getElementById("carCanvas");
carCanvas.width = window.innerWidth;
carCanvas.height = window.innerHeight/2;

const cameraCanvas = document.getElementById("cameraCanvas");
cameraCanvas.width = window.innerWidth;
cameraCanvas.height = window.innerHeight/2;

const miniMapCanvas = document.getElementById("miniMapCanvas");
miniMapCanvas.width = rightPanelWidth;
miniMapCanvas.height = rightPanelWidth;

statistics.style.width = rightPanelWidth + "px";
statistics.style.height = window.innerHeight - rightPanelWidth + "px";

const carCtx = carCanvas.getContext("2d");
const cameraCtx = cameraCanvas.getContext("2d");

// const worldString = localStorage.getItem("world");
// const worldInfo = worldString?JSON.parse(worldString):null;
// const world = worldInfo
//     ? World.load(worldInfo)
//     : new World(new Graph());

const viewport = new Viewport(carCanvas, world.zoom, world.offset);
const miniMap = new MiniMap(miniMapCanvas, world.graph, rightPanelWidth);
    
const N = 100;
const cars = generateCars(1, "KEYS").concat(generateCars(N, "AI"));
    
const myCar = cars[0];
const camera = new Camera(myCar);

if(localStorage.getItem("bestBrain"))
{
    for(let i=2;i<cars.length;i++)
    {
        cars[i].brain = JSON.parse(
            localStorage.getItem("bestBrain")
            );
        if(i != 0)
        {
            NeuralNetwork.mutate(cars[i].brain, 0.17);
        }
    }
}

for(let i = 0;i < cars.length; i++)
{
    const div = document.createElement("div");
    div.id = "stat_" + i;
    div.innerText = i;
    div.style.color = cars[i].color;
    div.classList.add("stat");
    statistics.appendChild(div);
}

let roadBorders = [];
// const roadBorders = world.buildings.map((b) => b.base.segments).flat().map((s) => [s.p1, s.p2]);
const target = world.markings.find((m) => m instanceof Target);
if(target)
{
    world.generateCorridor(myCar, target.center);
    roadBorders = world.corridor.borders.map((s) => [s.p1, s.p2]);
}
else
{
    roadBorders = world.roadBorders.map((s) => [s.p1, s.p2]);
}

let frameCount = 0;
let started = false;

startCounter();

animate();

function save()
{
    this.discard();
    localStorage.setItem("bestBrain",
        JSON.stringify(myCar.brain));
}

function discard()
{
    localStorage.removeItem("bestBrain");
}

function generateCars(N, type)
{
    const startPoints = world.markings.filter((m) => m instanceof Start);
    const startPoint = startPoints.length > 0 ? startPoints[0].center : new Point(100, 100);
    const dir = startPoints.length > 0 ? startPoints[0].dirVector : new Point(0, -1);
    const startAngle = - angle(dir) + Math.PI/2;
    const cars = [];
    for(let i=0;i<N;i++)
    {
        const color = type == "AI" ? getRandomColor() : "blue";
        const car = new Car(startPoint.x, startPoint.y, 30, 50, type, startAngle, 8, color);
        if(car.name == "AI")
        {
            car.name += i;
        }
        // car.load(carInfo);
        cars.push(car);
    }
    return cars;
}

function updateCarProgress(car)
{
    if(!car.finishTime)
    {
        car.progress = 0;

        const carSeg = getNearestSegment(car, world.corridor.skeleton);
        for(let i = 0; i < world.corridor.skeleton.length; i++)
        {
            const s = world.corridor.skeleton[i];
            if(s.equals(carSeg))
            {
                const proj = s.projectPoint(car);
                const firstPartOfSegment = new Segment(s.p1, proj.point);
                car.progress += firstPartOfSegment.length();
                break;
            }
            else
            {
                car.progress += s.length();
            }
        }
        const totalDistance = world.corridor.skeleton.reduce(
            (acc, s) => acc + s.length(), 0
        );
        car.progress /= totalDistance;
        if(car.progress >= 1)
        {
            car.progress = 1;
            car.finishTime = frameCount;
        }
    }
}

function startCounter()
{
    counter.innerText = "3";
    beep(200);
    setTimeout(() => {
        counter.innerText = "2";
        beep(200);
        setTimeout(() => {
            counter.innerText = "1";
            beep(200);
            setTimeout(() => {
                counter.innerText = "GO!";
                beep(300);
                setTimeout(() => {
                    counter.innerText = "";
                    started = true;
                    frameCount = 0;
                    myCar.engine = new Engine();
                }, 1000);
            }, 1000);
        }, 1000);
    }, 1000);
}

function animate()
{
    if(started)
    {
        for(let i=0;i<cars.length;i++)
        {
            cars[i].update(roadBorders, []);
        }
    }

    world.cars = cars;
    world.bestCar = myCar;

    viewport.offset.x = -myCar.x;
    viewport.offset.y = -myCar.y;

    viewport.reset();
    const viewPoint = scale(viewport.getOffset(), -1);
    world.draw(carCtx, viewPoint, false);
    miniMap.update(viewPoint);

    for(let i = 0; i < cars.length; i++)
    {
        updateCarProgress(cars[i]);
    }

    cars.sort((a, b) => b.progress - a.progress);
        
    for(let i = 0; i < cars.length; i++)
    {
        const stat = document.getElementById("stat_" + i);
        stat.style.color = cars[i].color;
        stat.innerText = (i + 1) + ": " + cars[i].name + (cars[i].damaged ? "☠" : "");
        stat.style.backgroundColor = cars[i].useBrain ? "black" : "white";
        if(cars[i].finishTime)
        {
            stat.innerHTML += "<span style='float:right;'>" +
            (cars[i].finishTime/60).toFixed(1) + "s </span>";
        }
    }

    camera.move(myCar);
    camera.draw(carCtx);
    camera.render(cameraCtx, world);

    frameCount++;
    requestAnimationFrame(animate);
}