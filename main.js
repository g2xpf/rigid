//------------------------------------------------------------------------------
/// @file
/// @author g2 
///
/// @attention 改変及び再配布を禁じます。
////----------------------------------------------------------------------------

// ワールドの作成
let world = new World;

// pixelとmの比
const pixelsPerMeter = 50;

// Canvasの定義
let canvas = document.getElementById("newCanvas");
const BORDER_WIDTH = 2;
const W = window.innerWidth, H = window.innerHeight;
canvas.width = W - 2*BORDER_WIDTH;
canvas.height = H - 2*BORDER_WIDTH;
canvas.style.position = "absolute";
canvas.style.top = "0px";
canvas.style.left = "0px";
canvas.style.border = BORDER_WIDTH + "px solid #000";

let ctx = canvas.getContext('2d');
ctx.fillStyle = "black";

// カラーボックスの定義
let strokeBox = [];
let fillBox = [];

//キー入力に関する関数やフラグの定義---------------------------------
document.addEventListener("keydown", keyDownFunc);
document.addEventListener("keyup", keyUpFunc);

let leftFlg, upFlg, downFlg, rightFlg, shiftFlg, upFlg2, downFlg2, leftFlg2, rightFlg2, resetFlg;

leftFlg = upFlg = downFlg = rightFlg = shiftFlg = upFlg2 = downFlg2 = leftFlg2 = rightFlg2 = resetFlg = false;
    
function keyDownFunc(e){
    if (e.keyCode == 37) leftFlg  = true;
    if (e.keyCode == 38) upFlg    = true;
    if (e.keyCode == 40) downFlg  = true;
    if (e.keyCode == 39) rightFlg = true;
    if (e.keyCode == 16) shiftFlg = true;
    if (e.keyCode == 90) shootFlg = true;
    if (e.keyCode == 87) upFlg2 = true;
    if (e.keyCode == 83) downFlg2 = true;
    if (e.keyCode == 65) leftFlg2 = true;
    if (e.keyCode == 68) rightFlg2 = true;
    if (e.keyCode == 82) resetFlg = true;
};

function keyUpFunc(e){
    if (e.keyCode == 37) leftFlg  = false;
    if (e.keyCode == 38) upFlg    = false;
    if (e.keyCode == 40) downFlg  = false;
    if (e.keyCode == 39) rightFlg = false;
    if (e.keyCode == 16) shiftFlg = false;
    if (e.keyCode == 90) shootFlg = false;
    if (e.keyCode == 87) upFlg2 = false;
    if (e.keyCode == 83) downFlg2 = false;
    if (e.keyCode == 65) leftFlg2 = false;
    if (e.keyCode == 68) rightFlg2 = false;
    if (e.keyCode == 82) resetFlg = false;   
};

function update() {
    makeElecField();
    world.step(1 / 60);
    world.objects[0].a -= 0.01;
    
    // クランプ
    ary.map(this, function (obj) {
        if (!obj.isStatic() && obj.y > 0.8 * H / pixelsPerMeter) {
			obj.x = (Math.random() - 0.5) * W / pixelsPerMeter;
			obj.y = (-0.5-rand()) * H / pixelsPerMeter; // bring the body to the top of the screen
			obj.vx = 0;
			obj.vy = 0;
		}
	}, world.objects);
};

function drawLine(){
    let dx1 = (world.flip ? world.incX : world.refX) * pixelsPerMeter; // + W * 0.5;
    let dy1 = (world.flip ? world.incY : world.refY) * pixelsPerMeter; // + H * 0.5;
    let dx2 = (world.flip ? world.refX : world.incX) * pixelsPerMeter; // + W * 0.5;
    let dy2 = (world.flip ? world.refY : world.incY) * pixelsPerMeter; // + H * 0.5;
    let x1 = world.begin1X * pixelsPerMeter + W * 0.5;;
    let y1 = world.begin1Y * pixelsPerMeter + H * 0.5;
    let x2 = world.begin2X * pixelsPerMeter + W * 0.5;;
    let y2 = world.begin2Y * pixelsPerMeter + H * 0.5;
    
    if(world.isCollide){
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1+dx1, y1+dy1);
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 + dx2, y2 + dy2);
        ctx.stroke();
    
        if(world.cp1x != null){
            ctx.beginPath();
            ctx.fillStyle = 'rgba(155, 120, 45, 0.7)';
            ctx.arc(W * 0.5 + world.cp1x * pixelsPerMeter, H * 0.5 + world.cp1y * pixelsPerMeter, 3, 0, 2 * Math.PI, true);
            ctx.fill();
            ctx.stroke();
        }

        if(world.cp2x != null){
            ctx.beginPath();
            ctx.arc(W * 0.5 + world.cp2x * pixelsPerMeter, H * 0.5 + world.cp2y * pixelsPerMeter, 3, 0, 2 * Math.PI, true);
            ctx.fill();
            ctx.stroke();    
        }
    }
}

function makeElecField(){
    const moveE = true;
    if(moveE){
    const E = 20;
    world.elecFieldX = (rightFlg - leftFlg)*E;
    world.elecFieldY = (downFlg - upFlg)*E;
    const COEF = 0.1;
    }else if(world.elecPointX != null){
        world.elecPointX += (rightFlg - leftFlg)*COEF;
        world.elecPointY += (downFlg - upFlg)*COEF;
    }
}

function draw(){
    fillBackground();
    const index = world.objects.length;
    for(let i = 0; i < index; ++i){
        setColor(i);
        drawObjects(world.objects[i]);
    }

    ary.map(this, drawConstraints, world.constraints);
    //ary.map(this, drawObjects, world.objects);
    //drawLine();
}

function drawConstraints(c){
    ctx.strokeStyle = "red";
    ctx.beginPath();
    ctx.arc(W / 2 + pixelsPerMeter * c.x, H / 2 + pixelsPerMeter * c.y, 3, 0, 2 * TWO_PI, true);
    ctx.stroke();
};

function setColor(index){
    ctx.fillStyle = 'rgba('+fillBox[index].red+', '+fillBox[index].green+', '+fillBox[index].blue+', 0.7)';
    ctx.strokeStyle = 'rgba('+strokeBox[index].red+', '+strokeBox[index].green+', '+strokeBox[index].blue+', 0.3)';
};


function drawObjects(obj) {
	let x = obj.x * pixelsPerMeter + W * 0.5;
	let y = obj.y * pixelsPerMeter + H * 0.5;
	let r1 = obj.shape.name == shapeIs.circle ? ((obj.shape.radius - 0.03) * pixelsPerMeter) : (obj.shape.width * pixelsPerMeter);
    let r2 = obj.shape.name == shapeIs.circle ? ((obj.shape.radius - 0.03) * pixelsPerMeter) : (obj.shape.height * pixelsPerMeter);
    
    const omega = obj.a;

    ctx.translate(x, y);
    ctx.rotate(omega);
    switch(obj.shape.name){
        case shapeIs.circle:
            if(obj.isStatic()){
                ctx.beginPath();
                ctx.arc(0, 0, r1, 0, TWO_PI, !1);
                ctx.fill();
                ctx.stroke(); 
            }else{
                ctx.beginPath();
                ctx.arc(0, 0, r1, 0, TWO_PI, !1);
                ctx.fill();
                ctx.moveTo(0, 0);
                ctx.lineTo(r1, 0);
                ctx.stroke();
            }
            break;
        case shapeIs.cuboid:
            ctx.beginPath();
            ctx.fillRect(-r1/2, -r2/2, r1, r2);
            ctx.stroke();
            break;
        default:
            break;
    }
    ctx.rotate(-omega);
    ctx.translate(-x, -y);
}

function main() {
    update();
    draw();
}

function fillBackground(){
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, W, H);
}

let Color = function(r1, r2, g1, g2, b1, b2, a1, a2){
    this.red            = Math.floor(linear(r1, r2, rand()));
    this.green          = Math.floor(linear(g1, g2, rand()));
    this.blue           = Math.floor(linear(b1, b2, rand()));
    this.transparency   = linear(a1, a2, rand());
};

function colorGen(color){
    switch(color){
        case 'blue' : 
            return new Color(0, 20, 0, 20, 0, 255, 0, 4.0);
            break;
        case 'green' :
            return new Color(0, 0, 155, 100, 0, 0, 0, 4.0);
            break;
        case 'red' :
            return new Color(0, 255, 0, 20, 0, 20, 0, 4.0);
            break;
        case 'emerald' :
            return new Color(0, 20, 150, 103, 150, 103, 0, 4.0);
            break;
        case 'rand' :
            return new Color(0, 255, 0, 255, 0, 255, 0, 4.0);
            break;
        default :
            return new Color(0, 0, 0, 0, 0, 0, 0, 1.0);
            break;
    }
};

function makeColorBox(){
    for(let i = 0, len = world.objects.length; i < len; ++i){
        ary.add(colorGen('blue'), strokeBox);
        ary.add(colorGen('emerald'), fillBox);
    }
};

function init(){
    ctx.lineWidth = 0.4;

    const OBJECT_DIST = 1.5;

    world.addObject(new Objects(0.0, 6.0, new Shape("cuboid", 8.0, 8.0), 0));

    for(let y = -20; y < -5; y += OBJECT_DIST){
        for(let x = -5; x < 5; x += OBJECT_DIST){
            let w = 0.5 + 0.3 * rand();
            let h = 0.5 + 0.3 * rand();
            world.addObject(new Objects(x, y, new Shape("cuboid", w, h), w * h));
        }
    }

    for(let y = -35; y < -20; y += OBJECT_DIST){
        for(let x = -5; x < 5; x += OBJECT_DIST){
            let r = 0.4 + 0.1 * rand();
            world.addObject(new Objects(x, y, new Shape("circle", r, r), r*r*PI));
        }
    }

    makeColorBox();
}

init();

setInterval(main, 16);
