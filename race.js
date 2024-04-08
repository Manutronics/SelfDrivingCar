const carCanvas = document.getElementById("carCanvas");
carCanvas.width = window.innerWidth;
carCanvas.height = window.innerHeight;

const miniMapCanvas = document.getElementById("miniMapCanvas");
miniMapCanvas.width = 300;
miniMapCanvas.height = 300;

const carCtx = carCanvas.getContext("2d");

// const worldString = localStorage.getItem("world");
// const worldInfo = worldString?JSON.parse(worldString):null;
// const world = worldInfo
//     ? World.load(worldInfo)
//     : new World(new Graph());

const viewport = new Viewport(carCanvas, world.zoom, world.offset);
const miniMap = new MiniMap(miniMapCanvas, world.graph, miniMapCanvas.width);
    
const N = 100;
const cars = generateCars(1, "KEYS").concat(generateCars(N, "AI"));
    
const myCar = cars[0];

if(localStorage.getItem("bestBrain"))
{
    for(let i=1;i<cars.length;i++)
    {
        cars[i].brain = JSON.parse(
            localStorage.getItem("bestBrain")
            );
        if(i != 0)
        {
            NeuralNetwork.mutate(cars[i].brain, 0.17);
        }
    }
    console.log("reloaded");
}

let roadBorders;
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
        // car.load(carInfo);
        cars.push(car);
    }
    return cars;
}

function animate()
{
    for(let i=0;i<cars.length;i++)
    {
        cars[i].update(roadBorders, []);
    }

    world.cars = cars;
    world.bestCar = myCar;

    viewport.offset.x = -myCar.x;
    viewport.offset.y = -myCar.y;

    viewport.reset();
    const viewPoint = scale(viewport.getOffset(), -1);
    world.draw(carCtx, viewPoint, false);
    miniMap.update(viewPoint);

    const carSeg = getNearestSegment(myCar, world.corridor.skeleton);
    for(let i = 0; i < world.corridor.skeleton.length; i++)
    {
        const s = world.corridor.skeleton[i];
        s.draw(carCtx, { color: "red", width: 5 });
        if(s.equals(carSeg))
        {
            break;
        }
    }

    requestAnimationFrame(animate);
}