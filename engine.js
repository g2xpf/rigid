//------------------------------------------------------------------------------
/// @file
/// @author g2 
///
/// @attention 改変及び再配布を禁じます。
////----------------------------------------------------------------------------

const PI = 3.14159265358979323;
const HALF_PI = 0.5 * PI;
const TWO_PI = 2 * PI;
const degToRad = function(deg){ return deg * PI / 180; }
const radToDeg = function(rad){ return rad * 180 * PI; }

function cos(x){ return Math.cos(x); };
function sin(x){ return Math.sin(x); };
function abs(x){ return x < 0 ? -x : x; };
function sqrt(x){ return Math.sqrt(x); };
function max(x, y){ return x > y ? x : y };
function min(x, y){ return x < y ? x : y };
function rand(){ return Math.random(); };
function linear(a, b, x){ return a + b * x; };

let ary = {
    map : function(self, func, array){
        const index = array.length;
        if(index == 0) return;
        for(let i = 0; i < index; ++i){
            func.call(self, array[i]);
        }
    },
    
    add : function(obj, array){
        array.push(obj);
    },
};

let shapeIs = {
    circle : 0,
    cuboid : 1,
};

class CollisionInfo {
    constructor(){
        // 1度目の呼び出しで使用
        this.normalX;
        this.normalY;
        this.overlap = 1000;// max(canvas.height, canvas.width);
        
        // 2度目の呼び出しで使用
        this.overlap1;
        this.overlap2;
        this.contactPointsX = [];
        this.contactPointsY = [];
        this.depths;
        this.v1RefX;
        this.v1RefY;
        this.v2RefX;
        this.v2RefY;
        this.v1IncX;
        this.v1IncY;
        this.v2IncX;
        this.v2IncY;
        this.nRefX;
        this.nRefY;
        this.nIncX;
        this.nIncY;
    }

    solve( v1RefX, v1RefY, nRefX, nRefY, refX, refY,
           v1IncX, v1IncY, nIncX, nIncY, incX, incY, flip){
        this.v2RefX = v1RefX + refX;
        this.v2RefY = v1RefY + refY;
        this.v2IncX = v1IncX + incX;
        this.v2IncY = v1IncY + incY;
        this.contactPointsX = [v1IncX, this.v2IncX];
        this.contactPointsY = [v1IncY, this.v2IncY];
        this.depths = [null, null];
        let which = 0;

        let o1 = nRefX * v1RefX + nRefY * v1RefY;
        let o2 = -(nRefX * this.v2RefX + nRefY * this.v2RefY); // 単位ベクトルを反転
        let d11 = nRefX * v1IncX + nRefY * v1IncY - o1;
        let d12 = nRefX * this.v2IncX + nRefY * this.v2IncY - o1;
        let d21 = -nRefX * v1IncX - nRefY * v1IncY - o2;
        let d22 = -nRefX * this.v2IncX - nRefY * this.v2IncY - o2;

        if(d12 < 0.0){
            let newCPX = v1IncX + incX * d11 / (d11 - d12);
            let newCPY = v1IncY + incY * d11 / (d11 - d12);
            this.contactPointsX[1] = newCPX;
            this.contactPointsY[1] = newCPY;
        }

        if(d21 < 0.0){
            let newCPX = this.v2IncX - incX * d22 / (d22 - d21);
            let newCPY = this.v2IncY - incY * d22 / (d22 - d21);
            this.contactPointsX[0] = newCPX;
            this.contactPointsY[0] = newCPY;
        }

        let point1X = this.contactPointsX[0] - v1RefX;
        let point1Y = this.contactPointsY[0] - v1RefY;
        let point2X = this.contactPointsX[1] - v1RefX;
        let point2Y = this.contactPointsY[1] - v1RefY;
        let cross1 = nRefX * point1Y - nRefY * point1X;
        let cross2 = nRefX * point2Y - nRefY * point2X;
        
        if(cross1 < 0.0){
            this.contactPointsX[0] = null;
            this.contactPointsY[0] = null;
        }else{
            this.depths[0] = cross1;
        }


        if(cross2 < 0.0){
            this.contactPointsX[1] = null;
            this.contactPointsY[1] = null;
        }else{
            this.depths[1] = cross2;
        }
    }
}

class World {
    constructor(){
        this.objects = [];          
        this.constraints = [];     
        this.area = [];
        this.gravityX = 0;//9.80665;
        this.gravityY = 9.80665;
        this.elecFieldX = 0;
        this.elecFieldY = 0;

        this.elecPointX = null;
        this.elecPointY = null;
 
        this.B = -0.1;

        this.magnPointX = null;
        this.magnPointY = null;

        this.refX = 0;
        this.refY = 0;
        this.incX = 0;
        this.incY = 0;
        this.begin1X = 0;
        this.begin1Y = 0;
        this.begin2X = 0;
        this.begin2Y = 0;
        this.isCollide = false;
        this.flip = false;
        this.cp1x;
        this.cp1y;
        this.cp2x;
        this.cp2y;

        this.Q = -0.000000000000048;
    }

// public functions ---------------------------------------------
    addObject(obj){
        console.log("Added an object at (" + obj.x + ", " + obj.y + ")");
        ary.add(obj, this.objects);
    }

    step(dt){
        ary.map(this, function(obj){
            if(obj.isStatic){
                obj.vx += this.gravityX * dt;
                obj.vy += this.gravityY * dt;
                if(!obj.isStatic()){
                    obj.vx += obj.q * this.elecFieldX * dt / obj.mass;
                    obj.vy += obj.q * this.elecFieldY * dt / obj.mass;
                }
            }
        }, this.objects);

        this.constraints = [];
        this._detectCollisions();
        this._solveConstraints(dt);

        ary.map(this, function (obj) {
			obj.integrate(dt);
		}, this.objects);
    }

// private functions --------------------------------------------
    _detectCollisions(){
        let objs = this.objects;
        for(let i = 1; i < objs.length; ++i){
            let obj1 = objs[i];
            for(let j = 0; j < i; ++j){
                let obj2 = objs[j];
                if(obj1.isStatic() && obj2.isStatic()) continue;
                this._solveIfNeeded(obj1, obj2);
            }
        }
    }

    _solveIfNeeded(obj1, obj2){
        const obj1Shape = obj1.shape.name;
        const obj2Shape = obj2.shape.name;
        let x1, y1, r1, x2, y2, r2, r12, dx, dy, dist, len, invLen, normalX, normalY, overlap, worldX, worldY;
        if(obj1Shape == shapeIs.circle && obj2Shape == shapeIs.circle){
            x1 = obj1.x;
            y1 = obj1.y;
            r1 = obj1.shape.radius;
            x2 = obj2.x;
            y2 = obj2.y;
            r2 = obj2.shape.radius;
            r12 = r1 + r2;
            dx = x1 - x2;
            dy = y1 - y2;
            dist = dx * dx + dy * dy;
            // 衝突条件
            if(dist > 0 && dist < r12 * r12){
                len = Math.sqrt(dist);
                invLen = 1 / len;
                normalX = dx * invLen;
                normalY = dy * invLen;
                overlap = r12 - len;
                worldX = x2 + normalX * r2;
                worldY = y2 + normalY * r2;
                this._addContact(new ContactConstraint(obj1, obj2, worldX, worldY, normalX, normalY, overlap));
            }
        }else if((obj1Shape == shapeIs.cuboid && obj2Shape == shapeIs.cuboid)){
            // 大まかな衝突判定 -> 矩形同士の衝突判定(分離軸)
            x1 = obj1.x;
            y1 = obj1.y;           
            x2 = obj2.x;
            y2 = obj2.y;
            dx = x1 - x2;
            dy = y1 - y2;
            r12 = sqrt(dx * dx + dy * dy);
            
            let a1 = obj1.a;
            let a2 = obj2.a;
            let w1 = obj1.shape.width;
            let w2 = obj2.shape.width;
            let h1 = obj1.shape.height;
            let h2 = obj2.shape.height;
            r1 = sqrt(w1 * w1 + h1 * h1);
            r2 = sqrt(w2 * w2 + h2 * h2);
            
            this.isCollide = false;
            // 大まかな衝突判定
            if(r1 + r2 >= r12){
                // 分離軸判定
                let ci = new CollisionInfo();
                if(this._checkCuboidCollisions(obj1, obj2, ci)){
                    this.isCollide = true;
                    
                    // clipping --------------------------------------------------
                    
                    let e1X, e1Y, e2X, e2Y, n1X, n1Y, n2X, n2Y, begin1X, begin1Y, begin2X, begin2Y;

                    if(ci.normalX * dx + ci.normalY * dy < 0){
                        ci.normalX *= -1;
                        ci.normalY *= -1;
                    }
                    
                    let cosA1 = cos(a1);
                    let sinA1 = sin(a1);
                    let cosA2 = cos(a2);
                    let sinA2 = sin(a2);
                    let normal1X = [cosA1, -sinA1, -cosA1, sinA1];
                    let normal1Y = [sinA1, cosA1, -sinA1, -cosA1];
                    let normal2X = [cosA2, -sinA2, -cosA2, sinA2];
                    let normal2Y = [sinA2, cosA2, -sinA2, -cosA2];
                    let coef1 = [h1, w1, h1, w1];
                    let coef2 = [h2, w2, h2, w2];
                    let maxDot1 = -1;
                    let maxDot2 = -1;

                    // 各辺の単位法線ベクトルと,衝突判定から求めた単位ベクトルとの
                    // 内積(cos(θ))を最大化するような辺を選ぶ
                    for(let i = 0; i < 4; ++i){
                        let tempDot2 = ci.normalX * normal2X[i] + ci.normalY * normal2Y[i];
                        // obj2 -> obj1 の方向を正としているため, 
                        // 衝突判定から求めた単位ベクトルは逆転させる
                        let tempDot1 = -(ci.normalX * normal1X[i] + ci.normalY * normal1Y[i]);
                        if(maxDot1 < tempDot1){
                            maxDot1 = tempDot1;
                            n1X = normal1X[(i+1)%4];
                            n1Y = normal1Y[(i+1)%4];
                            e1X = coef1[i] * n1X;
                            e1Y = coef1[i] * n1Y;
                            begin1X = x1 + (coef1[(i+1)%4] * normal1X[i] + coef1[i] * normal1X[(i+3)%4]) / 2.0;
                            begin1Y = y1 + (coef1[(i+1)%4] * normal1Y[i] + coef1[i] * normal1Y[(i+3)%4]) / 2.0;
                        }
                        if(maxDot2 < tempDot2){
                            maxDot2 = tempDot2;
                            n2X = normal2X[(i+1)%4];
                            n2Y = normal2Y[(i+1)%4];
                            e2X = coef2[i] * n2X;
                            e2Y = coef2[i] * n2Y;
                            begin2X = x2 + (coef2[(i+1)%4] * normal2X[i] + coef2[i] * normal2X[(i+3)%4]) / 2.0;
                            begin2Y = y2 + (coef2[(i+1)%4] * normal2Y[i] + coef2[i] * normal2Y[(i+3)%4]) / 2.0;
                        }
                    }

                    // reference edge, incident edgeの選択
                    let flip = false;
                    let edot1 = abs(e1X * ci.normalX + e1Y * ci.normalY);
                    let edot2 = abs(e2X * ci.normalX + e2Y * ci.normalY);
                    let refX, refY, incX, incY, nRefX, nRefY, nIncX, nIncY, v1X, v2X, v1RefX, v1RefY, v1IncX, v1IncY;
                    if(edot1 <= edot2){
                        refX = e1X;
                        refY = e1Y;
                        incX = e2X;
                        incY = e2Y;
                        nRefX = n1X;
                        nRefY = n1Y;
                        nIncX = n2X;
                        nIncY = n2Y;
                        v1RefX = begin1X;
                        v1RefY = begin1Y;
                        v1IncX = begin2X;
                        v1IncY = begin2Y;
                    }else{
                        refX = e2X;
                        refY = e2Y;
                        incX = e1X;
                        incY = e1Y;
                        nRefX = n2X;
                        nRefY = n2Y;
                        nIncX = n1X;
                        nIncY = n1Y;
                        v1RefX = begin2X;
                        v1RefY = begin2Y;
                        v1IncX = begin1X;
                        v1IncY = begin1Y;
                        flip = true;
                    }
                    
                    ci.solve(v1RefX, v1RefY, nRefX, nRefY, refX, refY,
                             v1IncX, v1IncY, nIncX, nIncY, incX, incY);
                    
                    this.refX = refX;
                    this.refY = refY;
                    this.incX = incX;
                    this.incY = incY;
                    this.begin1X = begin1X;
                    this.begin1Y = begin1Y;
                    this.begin2X = begin2X;
                    this.begin2Y = begin2Y;
                    this.flip = flip;
                    this.cp1x = ci.contactPointsX[0];
                    this.cp1y = ci.contactPointsY[0];
                    this.cp2x = ci.contactPointsX[1];
                    this.cp2y = ci.contactPointsY[1];
                    
                    if(ci.depths[0] != null){
                        worldX = ci.contactPointsX[0];
                        worldY = ci.contactPointsY[0];
                        normalX = ci.normalX;
                        normalY = ci.normalY;
                        overlap = ci.depths[0];
                        this._addContact(new ContactConstraint(obj1, obj2, worldX, worldY, normalX, normalY, overlap));
                    }
                    
                    if(ci.depths[1] != null){
                        worldX = ci.contactPointsX[1];
                        worldY = ci.contactPointsY[1];
                        normalX = ci.normalX;
                        normalY = ci.normalY;
                        overlap = ci.depths[1];
                        this._addContact(new ContactConstraint(obj1, obj2, worldX, worldY, normalX, normalY, overlap));
                    }
                }
            }
        }else if(obj1Shape != obj2Shape){
            if(obj1Shape == shapeIs.cuboid){
                let temp = obj1;
                obj1 = obj2;
                obj2 = temp;
            }
            dx = obj1.x - obj2.x;
            dy = obj1.y - obj2.y;
            r1 = obj1.shape.radius;
            let halfWidth = obj2.shape.width / 2;
            let halfHeight = obj2.shape.height / 2;
            r2 = sqrt(halfWidth * halfWidth + halfHeight * halfHeight);
            r12 = sqrt(dx * dx + dy * dy);
            if(r12 <= r1 + r2){
                let ci = new CollisionInfo();
                if(this._checkCircleCuboidColl2(obj1, obj2, ci)){
                    if(dx * ci.normalX + dy * ci.normalY < 0.0){
                        ci.normalX *= -1;
                        ci.normalY *= -1;
                    }
                    normalX = ci.normalX;
                    normalY = ci.normalY;
                    worldX = obj1.x - r1 * normalX;
                    worldY = obj1.y - r1 * normalY;
                    overlap = ci.overlap;

                    this._addContact(new ContactConstraint(obj1, obj2, worldX, worldY, normalX, normalY, overlap));
                }
            }
        }
    }

    _checkCircleCuboidColl(obj1, obj2, ci){
        let nx = cos(obj2.a);
        let ny = sin(obj2.a);
        let tx = -ny;
        let ty = nx;
        let dx = obj1.x - obj2.x;
        let dy = obj1.y - obj2.y;
        let r = obj1.shape.radius;
        let halfW = obj2.shape.width / 2.0;
        let halfH = obj2.shape.height / 2.0;

        let d1 = abs(nx * (obj2.x - obj1.x) + ny * (obj2.y - obj1.y));
        let d2 = abs(tx * (obj2.x - obj1.x) + ty * (obj2.y - obj1.y));
        let diff1 = r + halfW - d1;
        let diff2 = r + halfH - d2;

        if(diff1 < 0.0) return false;
        else{
            if(ci.overlap > diff1){
                ci.overlap = diff1;
                ci.normalX = nx;
                ci.normalY = ny;
            }
        }
        
        if(diff2 < 0.0) return false;
        else{
            if(ci.overlap > diff2){
                ci.overlap = diff2;
                ci.normalX = tx;
                ci.normalY = ty;
            }
        }

        if(nx * dx + ny * dy < 0.0){
            nx *= -1;
            ny *= -1;
        }
        if(tx * dx + ty * dy < 0.0){
            tx *= -1;
            ty *= -1;
        }
        
        let toVertexX = nx * halfW + tx * halfH;
        let toVertexY = ny * halfW + ty * halfH;
        let vertexX = obj2.x + toVertexX;
        let vertexY = obj2.y + toVertexY;
        dx = obj1.x - vertexX;
        dy = obj1.y - vertexY;

        if(nx * dx + ny * dy >= 0.0 && tx * dx + ty * dy >= 0.0){
            let len = sqrt(dx * dx + dy * dy);
            ci.overlap = r - len;
            ci.normalX = dx / len;
            ci.normalY = dy / len;
        }
        
        return true;
    }

    _checkCircleCuboidColl2(obj1, obj2, ci){
        var theta = obj2.a;
        var halfW = obj2.shape.width / 2;
        var halfH = obj2.shape.height / 2;
        // direction vector ( normalized )
        var nx = cos(theta);
        var ny = sin(theta);

        // normal vector ( normalized )
        var tx = -ny;
        var ty = nx;
        
        // vector directed from cuboid to circle
        var rx = obj1.x - obj2.x;
        var ry = obj1.y - obj2.y;

        // local vector of rx, ry
        var lx = rx * nx + ry * ny;
        var ly = rx * tx + ry * ty;
        
        // reset both vectors
        if(lx < 0){
            nx *= -1;
            ny *= -1;
        }

        if(ly < 0){
            tx *= -1;
            ty *= -1;
        }
        
        // crumped vector directed from cuboid to collision point 
        var crumpedX = (lx < 0 ? -1 : 1) * min(halfW, abs(lx));
        var crumpedY = (ly < 0 ? -1 : 1) * min(halfH, abs(ly));

        // restore vector from local to global
        var mx = crumpedX * cos(theta) - crumpedY * sin(theta);
        var my = crumpedX * sin(theta) + crumpedY * cos(theta);

        // vector directed from circle to collision point
        var x = rx - mx;
        var y = ry - my;
        
        var r = sqrt(x * x + y * y);
        var overlap = obj1.shape.radius - r;

        if(overlap <= 0 || r == 0) return false;
        
        ci.overlap = overlap;
        ci.normalX = x / r;
        ci.normalY = y / r;
        return true;
    }

    _checkCuboidCollisions(obj1, obj2, ci){
        let dx = obj1.x - obj2.x;
        let dy = obj1.y - obj2.y;
        let theta1 = obj1.a;
        let theta2 = obj2.a;
        let w1 = obj1.shape.width/2;
        let h1 = obj1.shape.height/2;
        let w2 = obj2.shape.width/2;
        let h2 = obj2.shape.height/2;

        // 各ベクトルの定義
        // obj1のx方向のベクトル
        let nx1 = cos(theta1);
        let ny1 = sin(theta1);
        // obj1のy方向のベクトル
        let tx1 = -sin(theta1);
        let ty1 = cos(theta1);
        // obj2のx方向のベクトル
        let nx2 = cos(theta2);
        let ny2 = sin(theta2);
        // obj2のy方向のベクトル
        let tx2 = -sin(theta2);
        let ty2 = cos(theta2);

        let x1 = w1*nx1;
        let y1 = h1*ny1;
        let x2 = w2*nx2;
        let y2 = h2*ny2;
        
        let rX, rY, r12;
        

        // obj1のx方向
        rX = w1;
        rY =  w2 * abs(nx2 * nx1 + ny2 * ny1) + h2 * abs(tx2 * nx1 + ty2 * ny1);
        r12 = abs(dx * nx1 + dy * ny1);
        if(r12 > rX + rY) return false;
        else{
            const tempOverlap = rX + rY - r12;
            if(ci.overlap > tempOverlap){
                ci.overlap = tempOverlap;
                ci.normalX = nx1;
                ci.normalY = ny1;
            }
        }

        // obj1のy方向
        rX = h1;
        rY =  w2 * abs(nx2 * tx1 + ny2 * ty1) + h2 * abs(tx2 * tx1 + ty2 * ty1);
        r12 = abs(dx * tx1 + dy * ty1);
        if(r12 > rX + rY) return false;
        else{
            const tempOverlap = rX + rY - r12;
            if(ci.overlap > tempOverlap){
                ci.overlap = tempOverlap;
                ci.normalX = tx1;
                ci.normalY = ty1;
            }
        }
        // obj2のx方向
        rX = w1 * abs(nx1 * nx2 + ny1 * ny2) + h1 * abs(tx1 * nx2 + ty1 * ny2);
        rY = w2;
        r12 = abs(dx * nx2 + dy * ny2);
        if(r12 > rX + rY) return false;
        else{
            const tempOverlap = rX + rY - r12;
            if(ci.overlap > tempOverlap){
                ci.overlap = tempOverlap;
                ci.normalX = nx2;
                ci.normalY = ny2;
            }
        }
        // obj2のy方向
        rX = w1 * abs(nx1 * tx2 + ny1 * ty2) + h1 * abs(tx1 * tx2 + ty1 * ty2);
        rY = h2;
        r12 = abs(dx * tx2 + dy * ty2);
        if(r12 > rX + rY) return false;
        else{
            const tempOverlap = rX + rY - r12;
            if(ci.overlap > tempOverlap){
                ci.overlap = tempOverlap;
                ci.normalX = tx2;
                ci.normalY = ty2;
            }
        }

        return true;
    }

    _addContact(contact){
        this.constraints.push(contact);
    }

    _solveConstraints(dt) {
		ary.map(this, function (c) {
			c.init(dt);
		}, this.constraints);
		ary.map(this, function (c) {
			c.solve();
		}, this.constraints);
	}
}

class ContactConstraint {
    constructor(obj1, obj2, x, y, nx, ny, overlap){
        this.obj1 = obj1;
        this.obj2 = obj2;
        this.x = x;
        this.y = y;
        this.nx = nx; // normalized vector
        this.ny = ny;
        this.overlap = overlap;
        this.tx = -ny; // normalized normal vector of (nx, ny)
        this.ty = nx;
        this.r1x = x - obj1.x;
        this.r1y = y - obj1.y;
        this.r2x = x - obj2.x;
        this.r2y = y - obj2.y;

        this.massN = 0; // effective mass (vertical direction)
        this.massT = 0; // effective mass (normal direction)

        this.targetRelvN = 0; // target relative velocity (normal direction)
    }

    init (dt) {
        const cross1N = this.r1x * this.ny - this.r1y * this.nx;
	    const cross2N = this.r2x * this.ny - this.r2y * this.nx;
		const cross1T = this.r1x * this.ty - this.r1y * this.tx;
		const cross2T = this.r2x * this.ty - this.r2y * this.tx;
        
        this.massN = 1 / (this.obj1.inverseMass + this.obj2.inverseMass + cross1N * cross1N * this.obj1.inverseInertia + cross2N * cross2N * this.obj2.inverseInertia);
		this.massT = 1 / (this.obj1.inverseMass + this.obj2.inverseMass + cross1T * cross1T * this.obj1.inverseInertia + cross2T * cross2T * this.obj2.inverseInertia);
		
		// measure relative velocity
		const relvx = (this.obj1.vx - this.r1y * this.obj1.av) - (this.obj2.vx - this.r2y * this.obj2.av);
		const relvy = (this.obj1.vy + this.r1x * this.obj1.av) - (this.obj2.vy + this.r2x * this.obj2.av);
		const relvN = relvx * this.nx + relvy * this.ny;
		let e = 0.4; // restitution
		
		if (relvN > -1.0){//-0.5) {
			e = 0; // bodies are just "touching"
		}
		
		this.targetRelvN = -e * relvN;
		if (this.targetRelvN < 0) {
			this.targetRelvN = 0;
		}
		
		if (this.overlap > 0.05) {
			const separationVelocity = (this.overlap - 0.05) * 1.0 / dt;
			if (this.targetRelvN < separationVelocity) {
				this.targetRelvN = separationVelocity;
			}
		}
    }

    solve () {
        // measure relative velocity
		let relvx = (this.obj1.vx - this.r1y * this.obj1.av) - (this.obj2.vx - this.r2y * this.obj2.av);
		let relvy = (this.obj1.vy + this.r1x * this.obj1.av) - (this.obj2.vy + this.r2x * this.obj2.av);
		const relvN = relvx * this.nx + relvy * this.ny;
		
		// compute normal impulse
		let impN = (this.targetRelvN - relvN) * this.massN;
		if (impN < 0) {
			impN = 0;
		}
		
		// apply normal impulse
		this.obj1.vx += impN * this.nx * this.obj1.inverseMass;
		this.obj1.vy += impN * this.ny * this.obj1.inverseMass;
		this.obj1.av += impN * (this.r1x * this.ny - this.r1y * this.nx) * this.obj1.inverseInertia;
		this.obj2.vx -= impN * this.nx * this.obj2.inverseMass;
		this.obj2.vy -= impN * this.ny * this.obj2.inverseMass;
		this.obj2.av -= impN * (this.r2x * this.ny - this.r2y * this.nx) * this.obj2.inverseInertia;
		
		// measure relative velocity again
		relvx = (this.obj1.vx - this.r1y * this.obj1.av) - (this.obj2.vx - this.r2y * this.obj2.av);
		relvy = (this.obj1.vy + this.r1x * this.obj1.av) - (this.obj2.vy + this.r2x * this.obj2.av);
		const relvT = relvx * this.tx + relvy * this.ty;
		
		// compute tangent impulse
		let impT = (0 - relvT) * this.massT;
		
		// limit tangent impulse
		const mu = 0.43; // friction
		const maxTangentImpulse = impN * mu;
		if (impT > maxTangentImpulse) impT = maxTangentImpulse;
		else if (impT < -maxTangentImpulse) impT = -maxTangentImpulse;
		
		// apply tangent impulse
		this.obj1.vx += impT * this.tx * this.obj1.inverseMass;
		this.obj1.vy += impT * this.ty * this.obj1.inverseMass;
		this.obj1.av += impT * (this.r1x * this.ty - this.r1y * this.tx) * this.obj1.inverseInertia;
		this.obj2.vx -= impT * this.tx * this.obj2.inverseMass;
		this.obj2.vy -= impT * this.ty * this.obj2.inverseMass;
		this.obj2.av -= impT * (this.r2x * this.ty - this.r2y * this.tx) * this.obj2.inverseInertia;
    }
}

class Objects {
    constructor (x, y, shape, mass) {
        this.x = x;
        this.y = y;
        this.a = 0;//2*PI*rand();//0;
        this.vx = 0;
	    this.vy = 0;//10.0*(rand()-0.5);
	    this.av = 0; // angular velocity
	    this.shape = shape;
	    this.mass = mass;
        this.q = 1.0;//2 * rand() - 1;
	    this.inverseMass = mass == 0 ? 0 : 1 / mass;
	    this.inertia = shape.baseInertia * mass;
	    this.inverseInertia = this.inertia == 0 ? 0 : 1 / this.inertia;

        // color
        this.stroke = colorGen('green');
        this.fill = colorGen('blue');
    }
    isStatic () {
        return this.inverseMass == 0;
    }

    integrate (dt) {
        if(this.isStatic()){
            this.vx = 0;
            this.vy = 0;
            this.av = 0;
        } else {
            this.x += this.vx * dt;
            this.y += this.vy * dt;
			this.a += this.av * dt;
        }
    }
}

let Shape = function(shape, num1, num2){
    switch (shape){
        case "circle" :
            this.radius = num1;
            this.baseInertia = 1 / 2 * num1 * num1;
            this.name = shapeIs.circle;
            break;
        case "cuboid" :
            this.width = num1;
            this.height = num2;
            this.baseInertia = 1 / 3 * (num1*num1 + num2*num2);
            this.name = shapeIs.cuboid;
            break;
        default :
            break;
    }
}

