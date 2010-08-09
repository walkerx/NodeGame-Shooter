/*
  
  NodeGame: Shooter
  Copyright (c) 2010 Ivo Wetzel.
  
  All rights reserved.
  
  NodeGame: Shooter is free software: you can redistribute it and/or
  modify it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  NodeGame: Shooter is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License along with
  NodeGame: Shooter. If not, see <http://www.gnu.org/licenses/>.
  
*/

var CLIENT = new Client(30);


// Game ------------------------------------------------------------------------
// -----------------------------------------------------------------------------
Game.prototype.onConnect = function(success) {
    var that = this;
    this.canvas = document.getElementById('bg');
    if (!success) {
        document.getElementById('error').style.display = 'block';
        this.canvas.style.display = 'none';
        return;
    }
    this.canvas.style.display = 'block';
    document.getElementById('size').style.display = 'block';
    
    document.getElementById('login').onkeypress = function(e) {
        that.onLogin(e);
    };
    
    window.onbeforeunload = function() {
        localStorage.setItem('small', that.small);
        localStorage.setItem('extreme', that.extreeeeeeme);
    };
    
    // Canvas
    this.fillColor = '';
    this.strokeColor = '';
    this.lineWidth = 0;
    this.particles = [];
    this.small = localStorage.getItem('small') == 'true' || false;
    this.scale = this.small ? 0.5 : 1;
    this.extreeeeeeme = !(localStorage.getItem('extreme') == 'true' || false);
    this.onExtreme();
    
    // Stuff
    this.playerNames = {};
    this.playerScores = {};
    this.playerColors = {};
    
    this.colorCodes      = ['#f00000', '#0080ff', '#f0f000', '#00f000', '#9000ff', '#f0f0f0'];
    this.colorCodesFaded = ['#700000', '#004080', '#707000', '#007000', '#500080', '#707070'];
    
    // Rounds
    this.roundTime = 0;
    this.roundStart = 0;
    this.roundID = 0;
    this.roundStats = {};
    this.roundGO = null;
    this.playing = false;
    
    // Power UPs
    this.powerUpColors = {
        'shield':  '#0060cf', // blue
        'laser':   '#d00000', // red
        'life':    '#00b000', // green
        'boost':   '#f0c000', // yellow
        'defense': '#9c008c', // purple
        'bomb':    '#d0d0d0', // light gray
        'camu':    '#808080'  // camu
    };
    
    // Input
    this.keys = {};
    window.onkeydown = window.onkeyup = function(e, key) {
        (key = e.keyCode) != 116 ? (e.type == "keydown" ? 
                                    (!that.keys[key] ? that.keys[key] = 1 : 0) 
                                    : delete that.keys[key]) : 0;
    };
};


Game.prototype.onInit = function(data) {
    this.width = data.s[0];
    this.height = data.s[1];
    this.playerNames = data.p;
    this.playerScores = data.c;
    this.playerColors = data.o;
    this.checkRound(data);
    this.checkPlayers(data);
    
    this.initCanvas();
    
    // Login box
    document.getElementById('box').style.display = 'block';
    document.getElementById('login').focus();
};

Game.prototype.onUpdate = function(data) {
    this.playerNames = data.p;
    this.playerScores = data.c;
    this.playerColors = data.o;
    this.checkRound(data);
    this.checkPlayers(data);
};

Game.prototype.onControl = function(data) {
    return {'keys': [this.keys[87] || this.keys[38],
                     this.keys[68] || this.keys[39],
                     this.keys[13] || this.keys[77],
                     this.keys[65] || this.keys[37],
                     this.keys[32]]
    };
};

Game.prototype.onWebSocketError = function() {
    document.getElementById('bg').style.display = 'none';
    document.getElementById('fail').style.display = 'block';
};


Game.prototype.onQuit = function(clean) {
    document.location.href = document.location.href.split('#')[0].split('?')[0];
};


// Renderimg -------------------------------------------------------------------
Game.prototype.onRender = function() {
    
    // Clear
    this.fill('#000000');
    this.bg.globalCompositeOperation = 'source-over';
    this.bg.fillRect(0, 0, this.width, this.height);
    this.bg.globalCompositeOperation = 'lighter';
    
    // Effects
    this.renderParticles();
    
    // Info
    this.renderRound();
};

Game.prototype.renderRound = function() {
    this.fill('#ffffff');
    
    var t = Math.round((this.roundTime + (this.roundStart - this.getTime())) / 1000);
    var m = Math.floor(t / 60);
    var s = t % 60;
    if (s < 10) {
        s = '0' + s;
    }
    
    if (!this.roundGO) {
        this.text(this.width - 4, 1, 'Next in ' + m + ':' + s + ' | Round #'
                  + this.roundID + ' finished', 'right', 'top');
        
        // Scores
        this.font((this.scale == 1 ? 15 : 17.5));
        var ypos = 60;
        var xpos = 130;
        this.text(xpos, ypos, 'Name', 'right', 'top');
        this.text(xpos + 75, ypos, 'Score', 'right', 'top');
        this.text(xpos + 145, ypos, 'Kills', 'right', 'top');
        this.text(xpos + 260, ypos, 'SelfDest', 'right', 'top');
        
        ypos += 22;
        for(var i = this.roundStats.length - 1; i >= 0; i--) {
            var p = this.roundStats[i];
            this.fill(this.colorCodes[p[4]]);
            this.text(xpos, ypos, p[2], 'right', 'top');
            this.text(xpos + 75, ypos, p[0], 'right', 'top');
            this.text(xpos + 145, ypos, p[1], 'right', 'top');
            this.text(xpos + 260, ypos, p[3], 'right', 'top');
            ypos += 18;
        }
        this.font((this.scale == 1 ? 12 : 17));
    
    } else {
        this.text(this.width - 4, 1, m + ':' + s + ' left | Round #' + this.roundID, 'right', 'top');
    }
};

Game.prototype.renderParticles = function() {
    this.line(2);
    
    var remove = [];
    for(var i = 0, l = this.particles.length; i < l; i++) {
        var p = this.particles[i];
        
        // Normal particles
        if (!p.size) {
            p.x += Math.sin(p.r) * p.speed;
            p.y += Math.cos(p.r) * p.speed;
            if (p.x < -16) {
                p.x = this.width + 16;
            
            } else if (p.x > this.width + 16) {
                p.x = -16;
            }
            
            if (p.y < -16) {
                p.y = this.height + 16;
            
            } else if (p.y > this.height + 16) {
                p.y = -16;
            }
        }
        
        // Kill
        if (this.getTime() > p.time) {
            remove.push(i);
        
        } else {
            this.fill(p.col || '#ffffff');
            var scale = this.timeScale(p.time, p.d);
            if (!p.size) {
                this.bg.globalAlpha = (0 - scale) * p.a;
                this.bg.fillRect(p.x - 2, p.y - 2, 4, 4);
                
            } else {
                this.bg.globalAlpha = ((0 - scale) * 0.5);
                this.bg.beginPath();
                this.bg.arc(p.x, p.y, p.size, 0, Math.PI * 2, true);
                this.bg.closePath();
                this.bg.fill();
            }
        }
    }
    
    for(var i = 0, l = remove.length; i < l; i++) {
        this.particles.splice(remove[i] - i, 1);
    }
    this.bg.globalAlpha = 1.0;
};



// Interface -------------------------------------------------------------------
Game.prototype.onResize = function(data) {
    this.small = !this.small;
    this.scale = this.small ? 0.5 : 1;
    this.initCanvas();
};

Game.prototype.onExtreme = function(data) {
    this.extreeeeeeme = !this.extreeeeeeme;
    document.getElementById('extreme').innerHTML = (this.extreeeeeeme ? 'DEACTIVATE' : 'ACTIVATE') + ' EXTREEEEME';
};

Game.prototype.onLogin = function(e) {
    e = e || window.event;
    if (e.keyCode == 13) {
        var playerName = document.getElementById('login').value;
        playerName = playerName.replace(/^\s+|\s+$/g, '').replace(/\s+/g, '_');
        if (playerName.length >= 2 && playerName.length <= 12) {
            document.getElementById('box').style.display = 'none';
            e.preventDefault();
            this.send({'join': playerName});
            this.playing = true;
        }
        return false;
    }
};


// Rounds & Players ------------------------------------------------------------
Game.prototype.checkRound = function(data) {
    if (this.roundGO != !!data.rg) {
        this.roundStart = this.getTime();
        this.roundID = data.ri;
        this.roundTime = data.rt;
        this.roundStats = data.rs;
    }
    this.roundGO = !!data.rg;
};

Game.prototype.checkPlayers = function(data) {
    var count = 0;
    for(var i in data.players) {
        count++;
    }
    
    if (!this.playing && this.roundGO) {
        var box = document.getElementById('box');
        if (count < data.max) {
            box.style.display = 'block';
        
        } else {
            box.style.display = 'none';
        }
    }
};


// Effects ---------------------------------------------------------------------
Game.prototype.effectArea = function(x, y, size, d, col) {
    d = d * 1000;
    d = this.extreeeeeeme ? d * 2 : d;
    this.particles.push({
        'x': x, 'y': y,
        'size': size,
        'time': this.getTime() + d,
        'd': d,
        'col': col
    });
};

Game.prototype.effectParticle = function(x, y, r, speed, d, col, a) {
    d = this.extreeeeeeme ? d * 2 : d;
    this.particles.push({
        'x': x, 'y': y,
        'r': this.wrapAngle(r), 'speed': speed,
        'time': this.getTime() + d * 1000,
        'd': d * 1000,
        'col': col,
        'a': a
    });
    if (this.extreeeeeeme) {
        this.particles.push({
            'x': x + Math.random(), 'y': y + Math.random(),
            'r': this.wrapAngle(r), 'speed': speed,
            'time': this.getTime() + d * 1000,
            'd': d * 1000,
            'col': col,
            'a': a
        });  
    }
};

Game.prototype.effectExplosion = function(x, y, count, d, speed, col) {
    count = this.extreeeeeeme ? count * 2 : count;
    var r = (Math.PI * 2 * Math.random());
    var rs = Math.PI * 2 / count;
    for(var i = 0; i < count; i++) {
        this.effectParticle(x, y, (r + rs * i) - Math.PI,
                            0.35 + Math.random() * speed,
                            (1 * d) + Math.random() * (0.5 * d), col, 1);
    }
};

Game.prototype.effectRing = function(x, y, size, count, d, speed, col, a) {
    for(var i = 0; i < count; i++) {
        var r = (Math.PI * 2 / count * i) - Math.PI;
        
        var e = Math.random() / 2 + 0.5;
        var ox = x + Math.sin(r) * size;
        var oy = y + Math.cos(r) * size;
        this.effectParticle(ox, oy, r + e / 2, speed * 0.5 * e, d, col, a);
        this.effectParticle(ox, oy, r - e, speed * e, d * 2, col, a);
    }
};


// Helpers ---------------------------------------------------------------------
Game.prototype.initCanvas = function() {
    this.canvas.width = this.width * this.scale;
    this.canvas.height = this.height * this.scale;
    this.bg = this.canvas.getContext('2d');
    this.bg.scale(this.scale, this.scale);
    this.font((this.scale == 1 ? 11 : 17));
};

Game.prototype.font = function(size) {
    this.bg.font = 'bold ' + size + 'px Monaco, "DejaVu Sans Mono", "Bitstream Vera Sans Mono"';
};

Game.prototype.line = function(width) {
    if (this.lineWidth != width) {
        this.bg.lineWidth = width;
        this.lineWidth = width;
    }
};

Game.prototype.text = function(x, y, text, align, baseline) {
    this.bg.textAlign = align;
    this.bg.textBaseline = baseline;
    this.bg.fillText(text, x, y);   
};

Game.prototype.fill = function(color) {
    if (this.fillColor != color) {
        this.bg.fillStyle = color;
        this.fillColor = color;
    }   
};

Game.prototype.stroke = function(color) {
    if (this.strokeColor != color) {
        this.bg.strokeStyle = color;
        this.strokeColor = color;
    }
};

Game.prototype.timeScale = function(time, scale) {
    var diff = this.getTime() - time;
    return diff < scale ? d = 1 / scale * diff : 1;         
};

Game.prototype.wrapAngle = function(r) {
    if (r > Math.PI) {
        r -= Math.PI * 2;
    }
    if (r < 0 - Math.PI) {
        r += Math.PI * 2;
    }
    return r;
};


// Actors ----------------------------------------------------------------------
// -----------------------------------------------------------------------------
var ActorPlayer = CLIENT.createActorType('player');
ActorPlayer.create = function(data) {
    this.r = data[0];
    this.mr = data[1]; 
    this.defense = data[2];
    this.thrust = data[3];
    this.boost = data[4];
    this.shield = data[5];
    this.fade = data[6];
    
    this.id = data[7];
};

ActorPlayer.update = function(data) {
    this.r = data[0];
    this.mr = data[1]; 
    this.defense = data[2];
    this.thrust = data[3];
    this.boost = data[4];
    
    this.fade = data[6];
    
    // Shield
    if (this.shield && !data[5]) {
        var col = this.$g.colorCodes[this.$g.playerColors[this.id]];
        this.$g.effectRing(this.x, this.y, 20, 30, 0.5, 3.0, col, 1);
    
    } else if (!this.shield && data.s) {
        var col = this.$g.colorCodes[this.$g.playerColors[this.id]];
        this.$g.effectRing(this.x, this.y, 30, 30, 0.20, -3.0, col, 1);
    }
    this.shield = data[5];
};

ActorPlayer.interleave = function() {
    this.r = this.$g.wrapAngle(this.r + this.mr / (this.$.intervalSteps * 2.5));
};

ActorPlayer.destroy = function() {
    var col = this.$g.colorCodes[this.$g.playerColors[this.id]];
    this.$g.effectExplosion(this.x, this.y, 20, 1.5, 1.5, col);
    this.$g.effectArea(this.x, this.y, 20, 0.5, col);
    
    if (this.shield) {
        this.$g.effectRing(this.x, this.y, 20, 42, 0.6, 4.0, col, 1);
    }
};

ActorPlayer.render = function() {
    // Color
    this.$g.line(3);
    if (this.defense) {
        this.$g.stroke(this.$g.colorCodesFaded[this.$g.playerColors[this.id]]);
    
    } else {
        this.$g.stroke(this.$g.colorCodes[this.$g.playerColors[this.id]]);
    }
    
    // Draw Ship base
    var alpha = 1.0;
    if (this.fade != -1) {
        if (this.id == this.$.id) {
            alpha = 0.20 + (this.fade / 100 * 0.8);
        
        } else {
            alpha = this.fade / 100;
        }
        this.$g.bg.globalAlpha = alpha;
    }
    
    
    if (this.fade > 0 || this.fade == -1 || this.id == this.$.id) {
        this.$g.bg.save();
        this.$g.bg.translate(this.x, this.y);
        this.$g.bg.rotate(Math.PI - this.r);
        
        this.$g.bg.beginPath();
        this.$g.bg.moveTo(0, -12);
        this.$g.bg.lineTo(10 , 12);
        this.$g.bg.lineTo(-10, 12);
        this.$g.bg.lineTo(0, -12);
        this.$g.bg.closePath();
        this.$g.bg.stroke();
        
        if (this.shield) {
            this.$g.line(3);
            this.$g.bg.beginPath();
            this.$g.stroke(this.$g.colorCodesFaded[this.$g.playerColors[this.id]]);
            this.$g.bg.arc(0, 0, 20, 0, Math.PI * 2, true);
            this.$g.bg.closePath();
            this.$g.bg.stroke();
        }
        this.$g.bg.restore();
    
        // Effects
        var col = this.$g.colorCodes[this.$g.playerColors[this.id]];
        if (this.thrust) {
            var r = this.$g.wrapAngle(this.r - Math.PI);
            var ox = this.x + Math.sin(r) * 12;
            var oy = this.y + Math.cos(r) * 12;
            this.$g.effectParticle(ox, oy, this.$g.wrapAngle(r - 0.8 + Math.random() * 1.60),
                                   2, 0.2 + (this.boost ? 0.1 : 0), col, alpha);
            
            if (this.boost) {
                this.$g.effectParticle(ox, oy, this.$g.wrapAngle(r - 0.8 + Math.random() * 1.60),
                                       2, 0.2 + (this.boost ? 0.1 : 0), col, alpha);
            }
        }
        
        if (this.mr != 0) {
            var d = (this.mr * 10);
            var r = this.$g.wrapAngle(this.r - Math.PI);
            var ox = this.x + Math.sin(this.$g.wrapAngle(r - Math.PI * 2.22 * d)) * 14;
            var oy = this.y + Math.cos(this.$g.wrapAngle(r - Math.PI * 2.22 * d)) * 14;
            this.$g.effectParticle(ox, oy, this.$g.wrapAngle(r - Math.PI * 2.47 * d - 0.4 + Math.random() * 0.80), 2, 0.13, col, alpha);
        }
        
        if (this.shield) {
            this.$g.effectRing(this.x, this.y, 20, 24,
                               this.$g.extreeeeeeme ? 0.025 : 0.05, 0.25, col, alpha);
        }
    
    } else {
        this.shield = false;
    }
    
    // Name
    if (this.fade == -1 || this.id == this.$.id) {
        this.$g.fill(this.$g.colorCodesFaded[this.$g.playerColors[this.id]]);
        this.$g.text(this.x, this.y - 22, this.$g.playerNames[this.id] + '(' + this.$g.playerScores[this.id] + ')', 'center', 'middle'); 
    }
    this.$g.bg.globalAlpha = 1.0;
};


// Bullet ----------------------------------------------------------------------
var ActorBullet = CLIENT.createActorType('bullet');
ActorBullet.create = function(data) {
    this.id = data[0];
};

ActorBullet.destroy = function() {
    var col = this.$g.colorCodes[this.$g.playerColors[this.id]];
    this.$g.effectExplosion(this.x, this.y, 4, 0.35, 1, col);
    this.$g.effectArea(this.x, this.y, 3.5, 0.35, col);  
};

ActorBullet.render = function() {
    this.$g.line(3);
    this.$g.bg.beginPath();
    this.$g.bg.arc(this.x, this.y, 1.25, 0, Math.PI * 2, true);
    this.$g.bg.closePath();
    this.$g.stroke(this.$g.colorCodes[this.$g.playerColors[this.id]]);
    this.$g.bg.stroke();
};


// Bomb ------------------------------------------------------------------------
var ActorBomb = CLIENT.createActorType('bomb');
ActorBomb.create = function(data) {
    this.id = data[0];
    this.radius = data[1];
};

ActorBomb.destroy = function() {
    var col = this.$g.colorCodes[this.$g.playerColors[this.id]];
    this.$g.effectArea(this.x, this.y, this.radius, 1.0, col);
    this.$g.effectRing(this.x, this.y, this.radius / 2 * 0.975, 100, 1, 1.25, col, 1);
    this.$g.effectArea(this.x, this.y, this.radius / 2, 1.5, col);
    this.$g.effectRing(this.x, this.y, this.radius * 0.975, 150, 1, 1.25, col, 1);
};

ActorBomb.render = function() {
    this.$g.fill(this.$g.colorCodes[this.$g.playerColors[this.id]]);
    this.$g.line(1);
    this.$g.bg.beginPath();
    this.$g.bg.arc(this.x, this.y, 2.5, 0, Math.PI * 2, true);
    this.$g.bg.closePath();
    this.$g.bg.fill();

    this.$g.line(2);
    this.$g.stroke(this.$g.colorCodes[this.$g.playerColors[this.id]]);
    this.$g.bg.beginPath();
    this.$g.bg.arc(this.x, this.y, 6.0, 0, Math.PI * 2, true);
    this.$g.bg.closePath();
    this.$g.bg.stroke();
    
    var col = this.$g.colorCodes[this.$g.playerColors[this.id]];
    var r = Math.atan2(this.mx, this.my);
    var ox = this.x - Math.sin(r) * 2;
    var oy = this.y - Math.cos(r) * 2;
    this.$g.effectParticle(ox, oy, this.$g.wrapAngle(r - 0.8 + Math.random() * 1.60),
                           1, 0.5, col, 1);
    
    this.$g.effectParticle(ox, oy, this.$g.wrapAngle(r - 1.6 + Math.random() * 3.20),
                           0.5, 0.8, col, 1);          
};

// PowerUP ---------------------------------------------------------------------
var ActorPowerUp = CLIENT.createActorType('powerup');
ActorPowerUp.create = function(data) {
    this.type = data[0];
    this.createTime = this.$g.getTime();
    
    var col = this.$g.powerUpColors[this.type];
    this.$g.effectExplosion(this.x, this.y, 8, 1, 0.5, col);
};

ActorPowerUp.destroy = function() {
    var col = this.$g.powerUpColors[this.type];
    this.$g.effectExplosion(this.x, this.y, 8, 1, 0.5, col);
    this.$g.effectArea(this.x, this.y, 8, 0.3, col);
};

ActorPowerUp.render = function() {
    this.$g.line(1);
    this.$g.fill(this.$g.powerUpColors[this.type]);
    this.$g.stroke(this.$g.powerUpColors[this.type]);
    this.$g.bg.save();
    this.$g.bg.translate(this.x, this.y);
    
    // Scale
    var scale = this.$g.timeScale(this.createTime, 1000);
    if (scale != 1) {
        this.$g.bg.scale(scale, scale);
    }
    
    // Draw
    if (this.type != 'camu') {
        
        this.$g.bg.beginPath();
        this.$g.bg.arc(0, 0, 5.5, 0, Math.PI * 2, true);
        this.$g.bg.closePath();
        this.$g.bg.fill();
        
    } else {
        this.$g.line(2);
    }
    
    this.$g.bg.beginPath();
    this.$g.bg.arc(0, 0, 8, 0, Math.PI * 2, true);
    this.$g.bg.closePath();
    this.$g.bg.stroke();
    this.$g.bg.restore();
};


// Player Defender -------------------------------------------------------------
var ActorPlayerDef = CLIENT.createActorType('player_def');
ActorPlayerDef.create = function(data) {
    this.dx = this.x;
    this.dy = this.y;
    this.id = data[0];
    this.r = data[1];
    this.x = data[2];
    this.y = data[3];
    
    var col = this.$g.colorCodes[this.$g.playerColors[this.id]];
    this.$g.effectExplosion(this.x, this.y, 4, 0.25, 1, col);
};

ActorPlayerDef.destroy = function() {
    this.r = this.$g.wrapAngle(this.r + 0.20 / this.$.intervalSteps);
    this.dx = this.x + Math.sin(this.r) * 35;
    this.dy = this.y + Math.cos(this.r) * 35;
    
    var col = this.$g.colorCodes[this.$g.playerColors[this.id]];
    this.$g.effectExplosion(this.dx, this.dy, 6, 0.5, 1, col);
};

ActorPlayerDef.render = function() {
    this.$g.line(3);
    this.$g.stroke(this.$g.colorCodes[this.$g.playerColors[this.id]]);
    this.$g.bg.beginPath();
    this.$g.bg.arc(this.dx, this.dy, 1.5, 0, Math.PI * 2, true);
    this.$g.bg.arc(this.dx, this.dy, 3.5, 0, Math.PI * 2, true);
    this.$g.bg.closePath();
    this.$g.bg.stroke();
};

ActorPlayerDef.update = function(data) {
    this.r = data[0];
    this.x = data[1];
    this.y = data[2];
};

ActorPlayerDef.interleave = function() {
    this.r = this.$g.wrapAngle(this.r + 0.20 / this.$.intervalSteps);
    this.dx = this.x + Math.sin(this.r) * 35;
    this.dy = this.y + Math.cos(this.r) * 35;
};

window.onload = function() {
    CLIENT.connect(HOST, PORT);
};

