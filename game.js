// Game state
const gameState = {
    isRunning: false,
    isPaused: false,
    score: 0,
    health: 150, // Increased from 100
    selectedCharacter: 'tahu',
    player: null,
    enemies: [],
    projectiles: [],
    particles: [],
    boss: null, // For boss battles
    isBossRound: false,
    currentRound: 1,
    maxRounds: 5,
    enemiesKilledThisRound: 0,
    enemiesToKillPerRound: 10, // Enemies to kill to advance to next round
    gameCompleted: false,
    keys: {},
    mouseControls: {
        up: false,
        down: false,
        left: false,
        right: false,
        attack: false,
        special: false
    },
    lastTime: 0
};

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game objects
class Player {
    constructor(character) {
        this.character = character;
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.width = 40;
        this.height = 40;
        this.speed = 5;
        this.health = 150; // Increased from 100
        this.color = this.getCharacterColor(character);
        this.lastAttack = 0;
        this.attackCooldown = 300; // milliseconds
        this.lastSpecial = 0;
        this.specialCooldown = 5000; // 5 seconds
        this.weapons = this.getCharacterWeapons(character);
    }
    
    getCharacterColor(character) {
        const colors = {
            'tahu': '#ff4500',      // Fire red
            'kopaka': '#00bfff',    // Ice blue
            'lewa': '#32cd32',      // Air green
            'pohatu': '#daa520',    // Earth/Stone gold
            'gali': '#0080ff',      // Water blue
            'onua': '#2f4f2f'       // Earth dark green
        };
        return colors[character] || '#ff4500';
    }
    
    getCharacterWeapons(character) {
        switch (character) {
            case 'kopaka':
                return {
                    primary: 'spear',
                    secondary: 'shield',
                    spearRange: 80,
                    shieldActive: false,
                    shieldCooldown: 3000,
                    lastShieldUse: 0
                };
            case 'tahu':
                return {
                    primary: 'dual_swords',
                    secondary: 'fire_dash',
                    lastDashUse: 0,
                    dashCooldown: 4000,
                    swordCombo: 0,
                    lastComboTime: 0
                };
            case 'gali':
                return {
                    primary: 'water_spear',
                    secondary: 'tidal_wave',
                    spearRange: 85, // Slightly longer than Kopaka's spear
                    lastTidalWave: 0,
                    tidalWaveCooldown: 3500
                };
            case 'pohatu':
                return {
                    primary: 'dual_blades',
                    secondary: 'stone_dash',
                    lastDashUse: 0,
                    dashCooldown: 4000,
                    bladeCombo: 0,
                    lastComboTime: 0
                };
            case 'lewa':
                return {
                    primary: 'axe_blaster',
                    secondary: 'wind_boost',
                    lastWindBoost: 0,
                    windBoostCooldown: 3000,
                    attackMode: 'axe', // 'axe' or 'blaster'
                    lastModeSwitch: 0
                };
            case 'onua':
                return {
                    primary: 'claws_blasters',
                    secondary: 'earth_tremor',
                    lastTremor: 0,
                    tremorCooldown: 3500,
                    attackMode: 'claws', // 'claws' or 'blasters'
                    lastModeSwitch: 0,
                    clawCombo: 0,
                    ultraAbility: 'earth_devastation',
                    lastUltraAbility: 0,
                    ultraCooldown: 15000 // 15 second cooldown for ultra ability
                };
            default:
                return {
                    primary: 'standard',
                    secondary: 'none'
                };
        }
    }
    
    update() {
        // Movement - check both keyboard and mouse controls
        const upPressed = gameState.keys['w'] || gameState.keys['W'] || gameState.mouseControls.up;
        const downPressed = gameState.keys['s'] || gameState.keys['S'] || gameState.mouseControls.down;
        const leftPressed = gameState.keys['a'] || gameState.keys['A'] || gameState.mouseControls.left;
        const rightPressed = gameState.keys['d'] || gameState.keys['D'] || gameState.mouseControls.right;
        const attackPressed = gameState.keys[' '] || gameState.mouseControls.attack;
        const specialPressed = gameState.keys['Shift'] || gameState.mouseControls.special;
        const shieldPressed = gameState.keys['q'] || gameState.keys['Q']; // Q key for shield
        const fireDashPressed = gameState.keys['e'] || gameState.keys['E']; // E key for fire dash
        const waterWavePressed = gameState.keys['r'] || gameState.keys['R']; // R key for water wave
        const stoneDashPressed = gameState.keys['f'] || gameState.keys['F']; // F key for stone dash
        const windBoostPressed = gameState.keys['t'] || gameState.keys['T']; // T key for wind boost
        const earthTremorPressed = gameState.keys['g'] || gameState.keys['G']; // G key for earth tremor
        const ultraAbilityPressed = (gameState.keys['Shift'] && gameState.keys['g']) || (gameState.keys['Shift'] && gameState.keys['G']); // Shift+G for ultra ability
        
        // Character-specific speed boost for Onua
        const currentSpeed = this.character === 'onua' ? this.speed * 1.5 : this.speed; // Onua gets 50% speed boost (reduced from 70%)
        
        if (upPressed) this.y = Math.max(0, this.y - currentSpeed);
        if (downPressed) this.y = Math.min(canvas.height - this.height, this.y + currentSpeed);
        if (leftPressed) this.x = Math.max(0, this.x - currentSpeed);
        if (rightPressed) this.x = Math.min(canvas.width - this.width, this.x + currentSpeed);        // Attack
        if (attackPressed && Date.now() - this.lastAttack > this.attackCooldown) {
            this.attack();
            this.lastAttack = Date.now();
        }
        
        // Special Move
        if (specialPressed && Date.now() - this.lastSpecial > this.specialCooldown) {
            this.useSpecialMove();
            this.lastSpecial = Date.now();
        }
        
        // Shield (Kopaka only)
        if (this.character === 'kopaka' && shieldPressed) {
            this.activateShield();
        }
        
        // Fire Dash (Tahu only)
        if (this.character === 'tahu' && fireDashPressed) {
            this.fireDash();
        }
        
        // Water Wave (Gali only)
        if (this.character === 'gali' && waterWavePressed) {
            this.waterWave();
        }
        
        // Stone Dash (Pohatu only)
        if (this.character === 'pohatu' && stoneDashPressed) {
            this.stoneDash();
        }
        
        // Wind Boost (Lewa only)
        if (this.character === 'lewa' && windBoostPressed) {
            this.windBoost();
        }
        
        // Earth Tremor (Onua only)
        if (this.character === 'onua' && earthTremorPressed) {
            this.earthTremor();
        }
        
        // Ultra Ability - Earth Devastation (Onua only)
        if (this.character === 'onua' && ultraAbilityPressed) {
            this.earthDevastation();
        }
        
        // Reset attack and special state for mouse controls
        if (gameState.mouseControls.attack) {
            gameState.mouseControls.attack = false;
        }
        if (gameState.mouseControls.special) {
            gameState.mouseControls.special = false;
        }
        
        // Update special button state
        this.updateSpecialButton();
        
        // Update shield state for Kopaka
        if (this.character === 'kopaka') {
            this.updateShield();
        }
        
        // Update weapon combos for Tahu
        if (this.character === 'tahu') {
            this.updateSwordCombo();
        }
    }
    
    attack() {
        if (this.character === 'kopaka') {
            this.spearAttack();
        } else if (this.character === 'tahu') {
            this.dualSwordAttack();
        } else if (this.character === 'gali') {
            this.waterSpearAttack();
        } else if (this.character === 'pohatu') {
            this.dualBladeAttack();
        } else if (this.character === 'lewa') {
            this.axeBlasterAttack();
        } else if (this.character === 'onua') {
            this.clawsBlastersAttack();
        } else {
            this.standardAttack();
        }
    }
    
    standardAttack() {
        // Create projectile
        const projectile = new Projectile(
            this.x + this.width / 2,
            this.y,
            0, -8, // velocity
            this.color,
            40, // Increased from 10 to 40 (+30 damage)
            'player'
        );
        gameState.projectiles.push(projectile);
        
        // Create attack particles
        for (let i = 0; i < 5; i++) {
            const particle = new Particle(
                this.x + this.width / 2,
                this.y + this.height / 2,
                (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 4,
                this.color,
                1000
            );
            gameState.particles.push(particle);
        }
    }
    
    spearAttack() {
        console.log('Kopaka spear attack!'); // Debug log
        
        // Kopaka's spear creates a longer, more powerful projectile
        const projectile = new Projectile(
            this.x + this.width / 2,
            this.y,
            0, -10, // faster velocity
            this.color,
            45, // Increased from 15 to 45 (+30 damage)
            'player'
        );
        projectile.isSpear = true;
        projectile.radius = 6; // larger projectile
        gameState.projectiles.push(projectile);
        
        // Ice spear particles
        for (let i = 0; i < 8; i++) {
            const particle = new Particle(
                this.x + this.width / 2 + (Math.random() - 0.5) * 20,
                this.y + (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 6,
                (Math.random() - 0.5) * 6,
                '#87ceeb', // Light blue ice color
                1200
            );
            gameState.particles.push(particle);
        }
    }
    
    dualSwordAttack() {
        console.log('Tahu dual sword attack!'); // Debug log
        
        // Increment combo counter
        this.weapons.swordCombo++;
        this.weapons.lastComboTime = Date.now();
        
        // Reset combo after 2 seconds of no attacks
        if (Date.now() - this.weapons.lastComboTime > 2000) {
            this.weapons.swordCombo = 0;
        }
        
        // Create two flame projectiles (one for each sword)
        for (let i = 0; i < 2; i++) {
            const angle = (i - 0.5) * 0.4; // Spread pattern
            const projectile = new Projectile(
                this.x + this.width / 2 + (i === 0 ? -8 : 8),
                this.y,
                Math.sin(angle) * 8,
                -Math.cos(angle) * 8,
                '#ff4500',
                42, // Increased from 12 to 42 (+30 damage)
                'player'
            );
            projectile.isSword = true;
            projectile.radius = 5;
            gameState.projectiles.push(projectile);
        }
        
        // Combo bonus: every 3rd hit creates extra projectiles
        if (this.weapons.swordCombo % 3 === 0) {
            console.log('Sword combo bonus!');
            for (let i = 0; i < 3; i++) {
                const angle = (i - 1) * 0.6;
                const projectile = new Projectile(
                    this.x + this.width / 2,
                    this.y,
                    Math.sin(angle) * 10,
                    -Math.cos(angle) * 10,
                    '#ff6500',
                    45, // Increased from 15 to 45 (+30 damage)
                    'player'
                );
                projectile.isSword = true;
                projectile.radius = 6;
                gameState.projectiles.push(projectile);
            }
        }
        
        // Fire sword particles
        for (let i = 0; i < 12; i++) {
            const particle = new Particle(
                this.x + this.width / 2 + (Math.random() - 0.5) * 30,
                this.y + (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8,
                i % 2 === 0 ? '#ff4500' : '#ff6500', // Alternating fire colors
                1000
            );
            gameState.particles.push(particle);
        }
    }
    
    waterSpearAttack() {
        console.log('Gali water spear attack!'); // Debug log
        
        if (!this.weapons || !this.weapons.primary) {
            console.log('Gali weapons not properly initialized!');
            return;
        }
        
        // Create a water spear projectile - longer range and water-themed
        const projectile = new Projectile(
            this.x + this.width / 2,
            this.y,
            0, -10, // Faster than standard attack
            '#0080ff', // Water blue color
            50, // Strong water spear damage (45 base + 5 bonus for water element)
            'player'
        );
        projectile.isSpear = true;
        projectile.radius = 6; // Slightly larger than ice spear
        gameState.projectiles.push(projectile);
        
        // Create water splash effect at launch point
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const particle = new Particle(
                this.x + this.width / 2 + Math.cos(angle) * 10,
                this.y + Math.sin(angle) * 10,
                Math.cos(angle) * 3,
                Math.sin(angle) * 3,
                '#00bfff', // Light blue water color
                1000
            );
            gameState.particles.push(particle);
        }
        
        // Create water trail particles
        for (let i = 0; i < 5; i++) {
            const particle = new Particle(
                this.x + this.width / 2 + (Math.random() - 0.5) * 10,
                this.y + (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 4,
                -Math.random() * 3,
                '#87ceeb', // Light blue water color
                1200
            );
            gameState.particles.push(particle);
        }
    }
    
    dualBladeAttack() {
        console.log('Pohatu dual blade attack!'); // Debug log
        
        if (!this.weapons || !this.weapons.primary) {
            console.log('Pohatu weapons not properly initialized!');
            return;
        }
        
        // Increment combo counter
        this.weapons.bladeCombo++;
        this.weapons.lastComboTime = Date.now();
        
        // Reset combo after 2 seconds of no attacks
        if (Date.now() - this.weapons.lastComboTime > 2000) {
            this.weapons.bladeCombo = 0;
        }
        
        // Create two stone blade projectiles (one for each blade)
        for (let i = 0; i < 2; i++) {
            const angle = (i - 0.5) * 0.5; // Slightly wider spread than Tahu's swords
            const projectile = new Projectile(
                this.x + this.width / 2 + (i === 0 ? -10 : 10),
                this.y,
                Math.sin(angle) * 7,
                -Math.cos(angle) * 7,
                '#daa520', // Golden brown stone color
                45, // Strong stone blade damage (42 base + 3 bonus for earth element)
                'player'
            );
            projectile.isBlade = true;
            projectile.radius = 6; // Slightly larger than swords
            gameState.projectiles.push(projectile);
        }
        
        // Combo bonus: every 3rd hit creates extra rock projectiles
        if (this.weapons.bladeCombo % 3 === 0) {
            console.log('Stone blade combo bonus!');
            for (let i = 0; i < 3; i++) {
                const angle = (i - 1) * 0.7;
                const projectile = new Projectile(
                    this.x + this.width / 2,
                    this.y,
                    Math.sin(angle) * 9,
                    -Math.cos(angle) * 9,
                    '#8b4513', // Darker brown for combo rocks
                    48, // Increased from 45 to 48 (+3 combo bonus)
                    'player'
                );
                projectile.isBlade = true;
                projectile.radius = 7;
                gameState.projectiles.push(projectile);
            }
        }
        
        // Create stone dust particles
        for (let i = 0; i < 10; i++) {
            const particle = new Particle(
                this.x + this.width / 2 + (Math.random() - 0.5) * 20,
                this.y + (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 6,
                -Math.random() * 4,
                Math.random() > 0.5 ? '#daa520' : '#cd853f',
                1300
            );
            gameState.particles.push(particle);
        }
    }
    
    axeBlasterAttack() {
        console.log('Lewa axe/blaster attack!'); // Debug log
        
        if (!this.weapons || !this.weapons.primary) {
            console.log('Lewa weapons not properly initialized!');
            return;
        }
        
        // Switch between axe and blaster modes
        if (this.weapons.attackMode === 'axe') {
            this.axeAttack();
        } else {
            this.blasterAttack();
        }
        
        // Auto-switch mode every 3 attacks or after 2 seconds
        this.weapons.attackCount = (this.weapons.attackCount || 0) + 1;
        if (this.weapons.attackCount >= 3 || Date.now() - this.weapons.lastModeSwitch > 2000) {
            this.switchWeaponMode();
        }
    }
    
    axeAttack() {
        // Create a powerful wind axe projectile
        const projectile = new Projectile(
            this.x + this.width / 2,
            this.y,
            0, -9, // Fast axe throw
            '#32cd32', // Lime green wind color
            55, // High axe damage (45 base + 10 for melee weapon)
            'player'
        );
        projectile.isAxe = true;
        projectile.radius = 8; // Large axe projectile
        gameState.projectiles.push(projectile);
        
        // Create wind slash effect
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const particle = new Particle(
                this.x + this.width / 2 + Math.cos(angle) * 15,
                this.y + Math.sin(angle) * 15,
                Math.cos(angle) * 4,
                Math.sin(angle) * 4,
                '#90ee90', // Light green
                1100
            );
            gameState.particles.push(particle);
        }
    }
    
    blasterAttack() {
        // Create rapid-fire wind blaster shots
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const spread = (i - 1) * 0.2; // Small spread for rapid fire
                const projectile = new Projectile(
                    this.x + this.width / 2,
                    this.y,
                    Math.sin(spread) * 8,
                    -Math.cos(spread) * 8,
                    '#00ff7f', // Spring green blaster color
                    35, // Lower blaster damage but rapid fire
                    'player'
                );
                projectile.isBlaster = true;
                projectile.radius = 5;
                gameState.projectiles.push(projectile);
                
                // Create blaster flash effect
                for (let j = 0; j < 5; j++) {
                    const particle = new Particle(
                        this.x + this.width / 2 + (Math.random() - 0.5) * 10,
                        this.y + (Math.random() - 0.5) * 10,
                        (Math.random() - 0.5) * 6,
                        -Math.random() * 4,
                        '#7fff00', // Chartreuse
                        800
                    );
                    gameState.particles.push(particle);
                }
            }, i * 100); // 100ms delay between shots
        }
    }
    
    switchWeaponMode() {
        this.weapons.attackMode = this.weapons.attackMode === 'axe' ? 'blaster' : 'axe';
        this.weapons.lastModeSwitch = Date.now();
        this.weapons.attackCount = 0;
        
        console.log(`Lewa switched to ${this.weapons.attackMode} mode!`);
        
        // Create mode switch particles
        for (let i = 0; i < 8; i++) {
            const particle = new Particle(
                this.x + this.width / 2,
                this.y + this.height / 2,
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8,
                this.weapons.attackMode === 'axe' ? '#228b22' : '#adff2f',
                1500
            );
            gameState.particles.push(particle);
        }
    }
    
    clawsBlastersAttack() {
        console.log('Onua claws/blasters attack!'); // Debug log
        
        if (!this.weapons || !this.weapons.primary) {
            console.log('Onua weapons not properly initialized!');
            return;
        }
        
        // Switch between claws and blasters modes
        if (this.weapons.attackMode === 'claws') {
            this.clawAttack();
        } else {
            this.sixBlasterAttack();
        }
        
        // Auto-switch mode every 4 attacks or after 3 seconds
        this.weapons.attackCount = (this.weapons.attackCount || 0) + 1;
        if (this.weapons.attackCount >= 4 || Date.now() - this.weapons.lastModeSwitch > 3000) {
            this.switchOnuaWeaponMode();
        }
    }
    
    clawAttack() {
        // Increment claw combo
        this.weapons.clawCombo++;
        
        // Create powerful earth claw projectiles
        for (let i = 0; i < 2; i++) {
            const angle = (i - 0.5) * 0.4; // Spread pattern like dual weapons
            const projectile = new Projectile(
                this.x + this.width / 2 + (i === 0 ? -8 : 8),
                this.y,
                Math.sin(angle) * 7,
                -Math.cos(angle) * 7,
                '#8b4513', // Saddle brown earth color
                75, // Reduced from 85 to 75 (+50% damage instead of +70%)
                'player'
            );
            projectile.isClaws = true;
            projectile.radius = 7; // Large claw projectiles
            gameState.projectiles.push(projectile);
        }
        
        // Combo bonus: every 3rd claw attack creates earth spikes
        if (this.weapons.clawCombo % 3 === 0) {
            console.log('Earth claw combo bonus!');
            for (let i = 0; i < 5; i++) {
                const angle = (i - 2) * 0.4;
                const projectile = new Projectile(
                    this.x + this.width / 2,
                    this.y,
                    Math.sin(angle) * 8,
                    -Math.cos(angle) * 8,
                    '#a0522d', // Darker earth color
                    90, // Reduced from 102 to 90 (+50% bonus spike damage)
                    'player'
                );
                projectile.isEarthSpike = true;
                projectile.radius = 8;
                gameState.projectiles.push(projectile);
            }
        }
        
        // Create earth dust particles
        for (let i = 0; i < 15; i++) {
            const particle = new Particle(
                this.x + this.width / 2 + (Math.random() - 0.5) * 30,
                this.y + (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 8,
                -Math.random() * 5,
                Math.random() > 0.5 ? '#8b4513' : '#daa520',
                1400
            );
            gameState.particles.push(particle);
        }
    }
    
    sixBlasterAttack() {
        // Create 6 earth blaster shots in a spread pattern
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                const spread = (i - 2.5) * 0.25; // Wide spread for 6 shots
                const projectile = new Projectile(
                    this.x + this.width / 2,
                    this.y,
                    Math.sin(spread) * 8,
                    -Math.cos(spread) * 8,
                    '#cd853f', // Peru earth color
                    57, // Reduced from 65 to 57 (+50% blaster damage instead of +70%)
                    'player'
                );
                projectile.isEarthBlaster = true;
                projectile.radius = 6;
                gameState.projectiles.push(projectile);
                
                // Create earth blaster flash effect
                for (let j = 0; j < 4; j++) {
                    const particle = new Particle(
                        this.x + this.width / 2 + (Math.random() - 0.5) * 15,
                        this.y + (Math.random() - 0.5) * 15,
                        (Math.random() - 0.5) * 6,
                        -Math.random() * 4,
                        '#daa520', // Goldenrod
                        900
                    );
                    gameState.particles.push(particle);
                }
            }, i * 80); // 80ms delay between shots
        }
    }
    
    switchOnuaWeaponMode() {
        this.weapons.attackMode = this.weapons.attackMode === 'claws' ? 'blasters' : 'claws';
        this.weapons.lastModeSwitch = Date.now();
        this.weapons.attackCount = 0;
        
        // Reset claw combo when switching modes
        if (this.weapons.attackMode === 'claws') {
            this.weapons.clawCombo = 0;
        }
        
        console.log(`Onua switched to ${this.weapons.attackMode} mode!`);
        
        // Create mode switch particles
        for (let i = 0; i < 10; i++) {
            const particle = new Particle(
                this.x + this.width / 2,
                this.y + this.height / 2,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                this.weapons.attackMode === 'claws' ? '#8b4513' : '#cd853f',
                1800
            );
            gameState.particles.push(particle);
        }
    }

    useSpecialMove() {
        switch (this.character) {
            case 'tahu':
                this.fireNova();
                break;
            case 'kopaka':
                this.iceShield();
                break;
            case 'lewa':
                this.windStorm();
                break;
            case 'pohatu':
                this.stoneBarrage();
                break;
            case 'gali':
                this.tidalWave();
                break;
            case 'onua':
                this.earthquake();
                break;
        }
    }
    
    fireNova() {
        // Tahu: Create a ring of fire projectiles
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const projectile = new Projectile(
                this.x + this.width / 2,
                this.y + this.height / 2,
                Math.cos(angle) * 6,
                Math.sin(angle) * 6,
                '#ff4500',
                45, // Increased from 15 to 45 (+30 damage)
                'player'
            );
            gameState.projectiles.push(projectile);
        }
        this.createSpecialParticles('#ff4500', 20);
    }
    
    iceShield() {
        // Kopaka: Temporary invincibility and freeze nearby enemies
        this.invulnerable = true;
        setTimeout(() => { this.invulnerable = false; }, 3000);
        
        // Freeze nearby enemies
        gameState.enemies.forEach(enemy => {
            const distance = Math.sqrt(
                Math.pow(enemy.x - this.x, 2) + Math.pow(enemy.y - this.y, 2)
            );
            if (distance < 150) {
                enemy.frozen = true;
                enemy.originalSpeed = enemy.speed;
                enemy.speed = 0;
                setTimeout(() => {
                    enemy.frozen = false;
                    enemy.speed = enemy.originalSpeed;
                }, 2000);
            }
        });
        this.createSpecialParticles('#00bfff', 15);
    }
    
    windStorm() {
        // Lewa: Push all enemies away and increase movement speed temporarily
        this.originalSpeed = this.speed;
        this.speed = 8;
        setTimeout(() => { this.speed = this.originalSpeed; }, 3000);
        
        // Push enemies away
        gameState.enemies.forEach(enemy => {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 200) {
                const pushForce = 100;
                enemy.x += (dx / distance) * pushForce;
                enemy.y += (dy / distance) * pushForce;
            }
        });
        this.createSpecialParticles('#32cd32', 25);
    }
    
    stoneBarrage() {
        // Pohatu: Launch multiple stone projectiles in a spread
        for (let i = -2; i <= 2; i++) {
            const angle = i * 0.3;
            const projectile = new Projectile(
                this.x + this.width / 2,
                this.y,
                Math.sin(angle) * 7,
                -Math.cos(angle) * 7,
                '#daa520',
                55, // Increased from 25 to 55 (+30 damage)
                'player'
            );
            gameState.projectiles.push(projectile);
        }
        this.createSpecialParticles('#daa520', 15);
    }
    
    tidalWave() {
        // Gali: Heal and create a wave of water projectiles
        this.health = Math.min(150, this.health + 30); // Updated max health to 150
        gameState.health = this.health;
        updateUI();
        
        // Create horizontal wave of projectiles
        for (let i = 0; i < 6; i++) {
            const projectile = new Projectile(
                this.x + this.width / 2 + (i - 2.5) * 30,
                this.y,
                0,
                -8,
                '#0080ff',
                50, // Increased from 20 to 50 (+30 damage)
                'player'
            );
            gameState.projectiles.push(projectile);
        }
        this.createSpecialParticles('#0080ff', 20);
    }
    
    earthquake() {
        // Onua: Damage all enemies on screen and create earth spikes
        gameState.enemies.forEach(enemy => {
            enemy.takeDamage(70); // Increased from 40 to 70 (+30 damage) - Massive damage to all enemies
            
            // Stun effect
            enemy.stunned = true;
            enemy.originalSpeed = enemy.speed;
            enemy.speed = 0;
            setTimeout(() => {
                if (enemy.stunned) {
                    enemy.stunned = false;
                    enemy.speed = enemy.originalSpeed;
                }
            }, 1500);
        });
        
        // Create earth spikes (visual projectiles that don't move)
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const distance = 80 + Math.random() * 60;
            const spikeX = this.x + this.width/2 + Math.cos(angle) * distance;
            const spikeY = this.y + this.height/2 + Math.sin(angle) * distance;
            
            const spike = new Projectile(
                spikeX, spikeY, 0, 0, '#2f4f2f', 0, 'decoration'
            );
            spike.lifespan = 2000; // Spikes last 2 seconds
            spike.createdAt = Date.now();
            gameState.projectiles.push(spike);
        }
        
        this.createSpecialParticles('#2f4f2f', 30);
    }
    
    activateShield() {
        // Check if Kopaka has weapons initialized
        if (!this.weapons || this.character !== 'kopaka') {
            return;
        }
        
        if (Date.now() - this.weapons.lastShieldUse > this.weapons.shieldCooldown) {
            this.weapons.shieldActive = true;
            this.weapons.lastShieldUse = Date.now();
            
            console.log('Shield activated!'); // Debug log
            
            // Shield lasts for 2 seconds
            setTimeout(() => {
                if (this.weapons) {
                    this.weapons.shieldActive = false;
                    console.log('Shield deactivated!'); // Debug log
                }
            }, 2000);
            
            // Shield particles
            for (let i = 0; i < 10; i++) {
                const angle = (i / 10) * Math.PI * 2;
                const particle = new Particle(
                    this.x + this.width / 2 + Math.cos(angle) * 30,
                    this.y + this.height / 2 + Math.sin(angle) * 30,
                    Math.cos(angle) * 2,
                    Math.sin(angle) * 2,
                    '#b0e0e6', // Powder blue
                    1000
                );
                gameState.particles.push(particle);
            }
        }
    }
    
    updateShield() {
        // Check if Kopaka has weapons initialized and shield is active
        if (!this.weapons || this.character !== 'kopaka' || !this.weapons.shieldActive) {
            return;
        }
        
        // Shield deflects projectiles
        gameState.projectiles.forEach((projectile, index) => {
            if (projectile.owner === 'enemy') {
                const distance = Math.sqrt(
                    Math.pow(projectile.x - (this.x + this.width/2), 2) + 
                    Math.pow(projectile.y - (this.y + this.height/2), 2)
                );
                
                if (distance < 40) { // Shield radius
                    console.log('Projectile deflected!'); // Debug log
                    
                    // Deflect projectile back at enemies
                    projectile.vx *= -1.5;
                    projectile.vy *= -1.5;
                    projectile.owner = 'player';
                    projectile.color = '#87ceeb';
                    
                    // Create deflection particles
                    for (let i = 0; i < 3; i++) {
                        const particle = new Particle(
                            projectile.x,
                            projectile.y,
                            (Math.random() - 0.5) * 6,
                            (Math.random() - 0.5) * 6,
                            '#b0e0e6',
                            500
                        );
                        gameState.particles.push(particle);
                    }
                }
            }
        });
    }
    
    fireDash() {
        if (!this.weapons || this.character !== 'tahu') {
            return;
        }
        
        if (Date.now() - this.weapons.lastDashUse > this.weapons.dashCooldown) {
            this.weapons.lastDashUse = Date.now();
            console.log('Fire dash activated!'); // Debug log
            
            // Dash in the direction player is moving, or forward if stationary
            let dashX = 0;
            let dashY = -60; // Default dash forward
            
            if (gameState.keys['w'] || gameState.keys['W'] || gameState.mouseControls.up) dashY = -60;
            if (gameState.keys['s'] || gameState.keys['S'] || gameState.mouseControls.down) dashY = 60;
            if (gameState.keys['a'] || gameState.keys['A'] || gameState.mouseControls.left) dashX = -60;
            if (gameState.keys['d'] || gameState.keys['D'] || gameState.mouseControls.right) dashX = 60;
            
            // Perform the dash
            this.x = Math.max(0, Math.min(canvas.width - this.width, this.x + dashX));
            this.y = Math.max(0, Math.min(canvas.height - this.height, this.y + dashY));
            
            // Create fire trail
            for (let i = 0; i < 15; i++) {
                const particle = new Particle(
                    this.x + this.width / 2 + (Math.random() - 0.5) * 40,
                    this.y + this.height / 2 + (Math.random() - 0.5) * 40,
                    (Math.random() - 0.5) * 10,
                    (Math.random() - 0.5) * 10,
                    Math.random() > 0.5 ? '#ff4500' : '#ff6500',
                    1500
                );
                gameState.particles.push(particle);
            }
            
            // Damage enemies in dash path
            gameState.enemies.forEach(enemy => {
                const distance = Math.sqrt(
                    Math.pow(enemy.x - this.x, 2) + Math.pow(enemy.y - this.y, 2)
                );
                if (distance < 50) {
                    enemy.takeDamage(25);
                }
            });
        }
    }
    
    waterWave() {
        if (!this.weapons || this.character !== 'gali') {
            return;
        }
        
        if (Date.now() - this.weapons.lastTidalWave > this.weapons.tidalWaveCooldown) {
            this.weapons.lastTidalWave = Date.now();
            console.log('Water wave activated!'); // Debug log
            
            // Create a circular wave of water projectiles
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2;
                const projectile = new Projectile(
                    this.x + this.width / 2,
                    this.y + this.height / 2,
                    Math.cos(angle) * 6,
                    Math.sin(angle) * 6,
                    '#0080ff',
                    30, // Water wave damage
                    'player'
                );
                projectile.isWaterWave = true;
                projectile.radius = 5;
                gameState.projectiles.push(projectile);
            }
            
            // Create water splash particles
            for (let i = 0; i < 25; i++) {
                const particle = new Particle(
                    this.x + this.width / 2 + (Math.random() - 0.5) * 60,
                    this.y + this.height / 2 + (Math.random() - 0.5) * 60,
                    (Math.random() - 0.5) * 12,
                    (Math.random() - 0.5) * 12,
                    Math.random() > 0.5 ? '#00bfff' : '#87ceeb',
                    1800
                );
                gameState.particles.push(particle);
            }
            
            // Heal Gali slightly with water magic
            this.health = Math.min(150, this.health + 15);
            gameState.health = this.health;
            updateUI();
        }
    }
    
    stoneDash() {
        if (!this.weapons || this.character !== 'pohatu') {
            return;
        }
        
        if (Date.now() - this.weapons.lastDashUse > this.weapons.dashCooldown) {
            this.weapons.lastDashUse = Date.now();
            console.log('Stone dash activated!'); // Debug log
            
            // Dash in the direction player is moving, or forward if stationary
            let dashX = 0;
            let dashY = -70; // Default dash forward (slightly further than fire dash)
            
            if (gameState.keys['w'] || gameState.keys['W'] || gameState.mouseControls.up) dashY = -70;
            if (gameState.keys['s'] || gameState.keys['S'] || gameState.mouseControls.down) dashY = 70;
            if (gameState.keys['a'] || gameState.keys['A'] || gameState.mouseControls.left) dashX = -70;
            if (gameState.keys['d'] || gameState.keys['D'] || gameState.mouseControls.right) dashX = 70;
            
            // Perform the dash
            this.x = Math.max(0, Math.min(canvas.width - this.width, this.x + dashX));
            this.y = Math.max(0, Math.min(canvas.height - this.height, this.y + dashY));
            
            // Create stone dust trail
            for (let i = 0; i < 20; i++) {
                const particle = new Particle(
                    this.x + this.width / 2 + (Math.random() - 0.5) * 50,
                    this.y + this.height / 2 + (Math.random() - 0.5) * 50,
                    (Math.random() - 0.5) * 12,
                    (Math.random() - 0.5) * 12,
                    Math.random() > 0.5 ? '#daa520' : '#8b4513',
                    1600
                );
                gameState.particles.push(particle);
            }
            
            // Damage enemies in dash path with stone impact
            gameState.enemies.forEach(enemy => {
                const distance = Math.sqrt(
                    Math.pow(enemy.x - this.x, 2) + Math.pow(enemy.y - this.y, 2)
                );
                if (distance < 55) { // Slightly larger impact area than fire dash
                    enemy.takeDamage(30); // Stronger than fire dash
                }
            });
            
            // Create stone shockwave at destination
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const projectile = new Projectile(
                    this.x + this.width / 2,
                    this.y + this.height / 2,
                    Math.cos(angle) * 4,
                    Math.sin(angle) * 4,
                    '#cd853f',
                    20, // Shockwave damage
                    'player'
                );
                projectile.isShockwave = true;
                projectile.radius = 4;
                gameState.projectiles.push(projectile);
            }
        }
    }
    
    windBoost() {
        if (!this.weapons || this.character !== 'lewa') {
            return;
        }
        
        if (Date.now() - this.weapons.lastWindBoost > this.weapons.windBoostCooldown) {
            this.weapons.lastWindBoost = Date.now();
            console.log('Wind boost activated!'); // Debug log
            
            // Temporary speed boost
            this.originalSpeed = this.speed;
            this.speed = 8; // Significantly faster
            
            // Reset speed after 2.5 seconds
            setTimeout(() => {
                this.speed = this.originalSpeed;
            }, 2500);
            
            // Create wind tornado effect around player
            for (let i = 0; i < 30; i++) {
                const angle = (i / 30) * Math.PI * 2;
                const radius = 30 + Math.random() * 20;
                const particle = new Particle(
                    this.x + this.width / 2 + Math.cos(angle) * radius,
                    this.y + this.height / 2 + Math.sin(angle) * radius,
                    Math.cos(angle + Math.PI/2) * 6, // Circular motion
                    Math.sin(angle + Math.PI/2) * 6,
                    '#32cd32',
                    2500
                );
                gameState.particles.push(particle);
            }
            
            // Push enemies away with wind force
            gameState.enemies.forEach(enemy => {
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 150) {
                    const pushForce = 120;
                    enemy.x += (dx / distance) * pushForce;
                    enemy.y += (dy / distance) * pushForce;
                    
                    // Keep enemies on screen
                    enemy.x = Math.max(0, Math.min(canvas.width - enemy.width, enemy.x));
                    enemy.y = Math.max(0, Math.min(canvas.height - enemy.height, enemy.y));
                }
            });
            
            // Also push away boss if present
            if (gameState.boss) {
                const dx = gameState.boss.x - this.x;
                const dy = gameState.boss.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 150) {
                    const pushForce = 80; // Less push force on boss
                    gameState.boss.x += (dx / distance) * pushForce;
                    gameState.boss.y += (dy / distance) * pushForce;
                    
                    // Keep boss on screen
                    gameState.boss.x = Math.max(0, Math.min(canvas.width - gameState.boss.width, gameState.boss.x));
                    gameState.boss.y = Math.max(0, Math.min(canvas.height - gameState.boss.height, gameState.boss.y));
                }
            }
        }
    }
    
    earthTremor() {
        if (!this.weapons || this.character !== 'onua') {
            return;
        }
        
        if (Date.now() - this.weapons.lastTremor > this.weapons.tremorCooldown) {
            this.weapons.lastTremor = Date.now();
            console.log('Earth tremor activated!'); // Debug log
            
            // Create massive earth shockwave
            for (let ring = 1; ring <= 3; ring++) {
                setTimeout(() => {
                    for (let i = 0; i < 12; i++) {
                        const angle = (i / 12) * Math.PI * 2;
                        const radius = ring * 40;
                        const projectile = new Projectile(
                            this.x + this.width / 2 + Math.cos(angle) * radius,
                            this.y + this.height / 2 + Math.sin(angle) * radius,
                            Math.cos(angle) * 5,
                            Math.sin(angle) * 5,
                            '#8b4513',
                            38, // Reduced from 43 to 38 (+50% tremor damage instead of +70%)
                            'player'
                        );
                        projectile.isTremor = true;
                        projectile.radius = 7;
                        gameState.projectiles.push(projectile);
                    }
                }, ring * 200); // Expanding rings
            }
            
            // Create earthquake particles across the screen
            for (let i = 0; i < 50; i++) {
                const particle = new Particle(
                    Math.random() * canvas.width,
                    canvas.height - Math.random() * 100, // Near bottom of screen
                    (Math.random() - 0.5) * 8,
                    -Math.random() * 10,
                    Math.random() > 0.5 ? '#8b4513' : '#a0522d',
                    3000
                );
                gameState.particles.push(particle);
            }
            
            // Stun all enemies briefly
            gameState.enemies.forEach(enemy => {
                enemy.stunned = true;
                enemy.originalSpeed = enemy.speed;
                enemy.speed = 0;
                setTimeout(() => {
                    enemy.stunned = false;
                    enemy.speed = enemy.originalSpeed;
                }, 1500); // 1.5 second stun
            });
            
            // Slow down boss if present
            if (gameState.boss) {
                gameState.boss.stunned = true;
                gameState.boss.originalSpeed = gameState.boss.speed;
                gameState.boss.speed *= 0.3; // Significantly slow boss
                setTimeout(() => {
                    gameState.boss.stunned = false;
                    gameState.boss.speed = gameState.boss.originalSpeed;
                }, 1000); // 1 second slow for boss
            }
            
            // Damage all enemies on screen
            gameState.enemies.forEach(enemy => {
                enemy.takeDamage(20); // Area tremor damage
            });
            
            if (gameState.boss) {
                gameState.boss.takeDamage(15); // Reduced boss damage
            }
        }
    }
    
    updateSwordCombo() {
        // Reset combo after 2 seconds of inactivity
        if (this.weapons && Date.now() - this.weapons.lastComboTime > 2000) {
            this.weapons.swordCombo = 0;
        }
    }
    
    earthDevastation() {
        if (!this.weapons || this.character !== 'onua') {
            return;
        }
        
        if (Date.now() - this.weapons.lastUltraAbility > this.weapons.ultraCooldown) {
            this.weapons.lastUltraAbility = Date.now();
            console.log('🌍💥🔥 EARTH DEVASTATION 10,000,000X POWER ACTIVATED - OMNIVERSAL TRANSCENDENCE! 🔥💥🌍'); // Debug log
            
            // PHASE 1: MASSIVE SCREEN-WIDE EARTHQUAKE
            // Damage ALL enemies on screen with MASSIVE damage
            gameState.enemies.forEach(enemy => {
                enemy.takeDamage(1500000000); // 10,000,000x stronger: 150 * 10,000,000 = 1,500,000,000 damage - MULTIVERSE OBLITERATION!
                
                // Mega stun effect - longer than regular earthquake
                enemy.stunned = true;
                enemy.originalSpeed = enemy.speed;
                enemy.speed = 0;
                setTimeout(() => {
                    if (enemy.stunned) {
                        enemy.stunned = false;
                        enemy.speed = enemy.originalSpeed;
                    }
                }, 3000); // 3 second stun!
            });
            
            // Damage boss too if present
            if (gameState.boss) {
                gameState.boss.takeDamage(1000000000); // 10,000,000x stronger: 100 * 10,000,000 = 1,000,000,000 boss damage - OMNIVERSAL ANNIHILATION!
            }
            
            // PHASE 2: METEORIC EARTH SPIKE BARRAGE
            for (let wave = 0; wave < 5; wave++) {
                setTimeout(() => {
                    for (let i = 0; i < 20; i++) {
                        const angle = (i / 20) * Math.PI * 2;
                        const distance = 60 + wave * 30;
                        const spikeX = this.x + this.width/2 + Math.cos(angle) * distance;
                        const spikeY = this.y + this.height/2 + Math.sin(angle) * distance;
                        
                        const spike = new Projectile(
                            spikeX, spikeY, 0, 0, 
                            wave % 2 === 0 ? '#8B4513' : '#A0522D', // Alternating earth colors
                            12000000000, // 10,000,000x stronger: 120 * 10,000,000 = 12,000,000,000 OMNIPOTENT spike damage
                            'player'
                        );
                        spike.lifespan = 4000; // Long lasting spikes
                        spike.createdAt = Date.now();
                        spike.isUltraSpike = true;
                        spike.radius = 12; // HUGE spikes
                        gameState.projectiles.push(spike);
                    }
                }, wave * 200); // Sequential waves
            }
            
            // PHASE 3: PLANETARY EARTH NOVA
            setTimeout(() => {
                for (let i = 0; i < 12; i++) {
                    const angle = (i / 12) * Math.PI * 2;
                    const projectile = new Projectile(
                        this.x + this.width / 2,
                        this.y + this.height / 2,
                        Math.cos(angle) * 12, // Very fast
                        Math.sin(angle) * 12,
                        '#CD853F', // Peru earth color
                        20000000000, // 10,000,000x stronger: 200 * 10,000,000 = 20,000,000,000 TRANSCENDENT REALITY-BREAKING damage!
                        'player'
                    );
                    projectile.isUltraNova = true;
                    projectile.radius = 15; // MASSIVE projectiles
                    gameState.projectiles.push(projectile);
                }
            }, 1000);
            
            // PHASE 4: EARTH DEVASTATION PARTICLE STORM
            for (let i = 0; i < 200; i++) {
                const particle = new Particle(
                    this.x + this.width / 2 + (Math.random() - 0.5) * 300,
                    this.y + this.height / 2 + (Math.random() - 0.5) * 300,
                    (Math.random() - 0.5) * 20,
                    (Math.random() - 0.5) * 20,
                    ['#8B4513', '#A0522D', '#CD853F', '#DAA520', '#FFD700'][Math.floor(Math.random() * 5)],
                    4000 // Long lasting devastation
                );
                particle.size = Math.random() * 10 + 5; // HUGE particles
                gameState.particles.push(particle);
            }
            
            // Screen shake effect simulation with rapid particles
            for (let shake = 0; shake < 20; shake++) {
                setTimeout(() => {
                    for (let i = 0; i < 10; i++) {
                        const particle = new Particle(
                            Math.random() * canvas.width,
                            Math.random() * canvas.height,
                            (Math.random() - 0.5) * 15,
                            (Math.random() - 0.5) * 15,
                            '#A0522D',
                            500
                        );
                        particle.size = Math.random() * 8 + 3;
                        gameState.particles.push(particle);
                    }
                }, shake * 50);
            }
        } else {
            // Show cooldown message
            const timeLeft = Math.ceil((this.weapons.ultraCooldown - (Date.now() - this.weapons.lastUltraAbility)) / 1000);
            console.log(`🌍 Earth Devastation cooldown: ${timeLeft} seconds remaining`);
        }
    }
    
    createSpecialParticles(color, count) {
        for (let i = 0; i < count; i++) {
            const particle = new Particle(
                this.x + this.width / 2 + (Math.random() - 0.5) * 60,
                this.y + this.height / 2 + (Math.random() - 0.5) * 60,
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8,
                color,
                1500
            );
            gameState.particles.push(particle);
        }
    }
    
    updateSpecialButton() {
        const specialBtn = document.getElementById('specialBtn');
        const timeLeft = this.specialCooldown - (Date.now() - this.lastSpecial);
        
        if (timeLeft > 0) {
            specialBtn.classList.add('cooldown');
            specialBtn.disabled = true;
            specialBtn.textContent = Math.ceil(timeLeft / 1000);
        } else {
            specialBtn.classList.remove('cooldown');
            specialBtn.disabled = false;
            specialBtn.textContent = '✨';
        }
    }
    
    takeDamage(damage) {
        if (this.invulnerable) return; // Kopaka's ice shield protection
        
        this.health -= damage;
        gameState.health = Math.max(0, this.health);
        updateUI();
        
        if (this.health <= 0) {
            gameOver();
        }
    }
    
    draw() {
        // Draw special effects
        if (this.invulnerable) {
            // Ice shield effect for Kopaka
            ctx.strokeStyle = '#00bfff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width + 10, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Draw Kopaka's shield when active
        if (this.character === 'kopaka' && this.weapons && this.weapons.shieldActive) {
            ctx.strokeStyle = '#87ceeb';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, 35, 0, Math.PI * 2);
            ctx.stroke();
            
            // Shield center
            ctx.fillStyle = 'rgba(135, 206, 235, 0.3)';
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, 35, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw player as a simple colored rectangle (placeholder for Bionicle sprite)
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw Tahu's dual swords
        if (this.character === 'tahu') {
            // Left sword
            ctx.strokeStyle = '#ff4500';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x + this.width/4, this.y - 12);
            ctx.lineTo(this.x + this.width/4, this.y - 2);
            ctx.stroke();
            
            // Right sword
            ctx.beginPath();
            ctx.moveTo(this.x + 3*this.width/4, this.y - 12);
            ctx.lineTo(this.x + 3*this.width/4, this.y - 2);
            ctx.stroke();
            
            // Sword hilts
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(this.x + this.width/4 - 2, this.y - 5, 4, 8);
            ctx.fillRect(this.x + 3*this.width/4 - 2, this.y - 5, 4, 8);
            
            // Sword blades (fire effect)
            ctx.fillStyle = '#ff6500';
            ctx.fillRect(this.x + this.width/4 - 1, this.y - 15, 2, 10);
            ctx.fillRect(this.x + 3*this.width/4 - 1, this.y - 15, 2, 10);
        }
        
        // Draw Kopaka's spear
        if (this.character === 'kopaka') {
            ctx.strokeStyle = '#4682b4';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.x + this.width/2, this.y - 15);
            ctx.lineTo(this.x + this.width/2, this.y - 5);
            ctx.stroke();
            
            // Spear tip
            ctx.fillStyle = '#b0c4de';
            ctx.beginPath();
            ctx.moveTo(this.x + this.width/2, this.y - 20);
            ctx.lineTo(this.x + this.width/2 - 3, this.y - 10);
            ctx.lineTo(this.x + this.width/2 + 3, this.y - 10);
            ctx.closePath();
            ctx.fill();
        }
        
        // Draw character indicator
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.character.toUpperCase(), this.x + this.width / 2, this.y - 25);
        
        // Draw health bar
        const barWidth = this.width;
        const barHeight = 4;
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x, this.y - 15, barWidth, barHeight);
        ctx.fillStyle = this.health > 75 ? '#0f0' : this.health > 37 ? '#ff0' : '#f00';
        ctx.fillRect(this.x, this.y - 15, (barWidth * this.health) / 150, barHeight);
    }
}

class Enemy {
    constructor(x, y, type = null) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        
        // Randomly assign enemy type if not specified
        this.type = type || this.getRandomType();
        this.setTypeProperties();
        
        this.maxHealth = this.health;
        this.lastAttack = 0;
        this.name = null; // For special named enemies
        this.isSpecial = false;
    }
    
    getRandomType() {
        const types = ['shadow', 'ice', 'fire', 'earth', 'air'];
        return types[Math.floor(Math.random() * types.length)];
    }
    
    setTypeProperties() {
        switch (this.type) {
            case 'shadow':
                this.color = '#4B0082'; // Dark purple
                this.speed = 0.6; // Further reduced from 1.0
                this.health = 10; // Further reduced from 15
                this.attackCooldown = 3500; // Increased from 2500
                this.projectileSpeed = 1.5; // Reduced from 2
                this.weapon = 'shadow_blade';
                break;
            case 'ice':
                this.color = '#00CED1'; // Dark turquoise
                this.speed = 0.4; // Further reduced from 0.7
                this.health = 20; // Further reduced from 30
                this.attackCooldown = 4500; // Increased from 3500
                this.projectileSpeed = 1; // Reduced from 1.5
                this.weapon = 'ice_spear';
                break;
            case 'fire':
                this.color = '#DC143C'; // Crimson
                this.speed = 0.8; // Further reduced from 1.2
                this.health = 12; // Further reduced from 20
                this.attackCooldown = 3000; // Increased from 2000
                this.projectileSpeed = 2; // Reduced from 2.5
                this.weapon = 'flame_sword';
                break;
            case 'earth':
                this.color = '#8B4513'; // Saddle brown
                this.speed = 0.3; // Further reduced from 0.5
                this.health = 25; // Further reduced from 35
                this.attackCooldown = 5000; // Increased from 4000
                this.projectileSpeed = 0.8; // Reduced from 1
                this.weapon = 'rock_hammer';
                break;
            case 'air':
                this.color = '#32CD32'; // Lime green
                this.speed = 1.2; // Further reduced from 1.8
                this.health = 8; // Further reduced from 12
                this.attackCooldown = 2500; // Increased from 1800
                this.projectileSpeed = 2.2; // Reduced from 3
                this.weapon = 'wind_staff';
                break;
            default:
                this.color = '#800080';
                this.speed = 0.6; // Further reduced from 1.0
                this.health = 12; // Further reduced from 20
                this.attackCooldown = 3000;
                this.projectileSpeed = 1.5;
                this.weapon = 'basic_staff';
                this.attackCooldown = 2500; // Increased from 2000
                this.projectileSpeed = 2; // Reduced from 3
        }
    }
    
    update() {
        // Simple AI: move towards player
        const player = gameState.player;
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
        
        // Attack if close to player
        if (distance < 100 && Date.now() - this.lastAttack > this.attackCooldown) {
            this.attack();
            this.lastAttack = Date.now();
        }
    }
    
    attack() {
        const player = gameState.player;
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Weapon-specific attacks
        this.weaponAttack(dx, dy, distance);
    }

    weaponAttack(dx, dy, distance) {
        const player = gameState.player;
        let projectileColor = this.color;
        let projectileDamage = 5; // Further reduced from 10
        let projectileCount = 1;
        let spread = 0;

        switch (this.weapon) {
            case 'shadow_blade':
                projectileColor = '#2F2F2F';
                projectileDamage = 4;
                // Shadow blade creates a dark projectile
                break;
            case 'ice_spear':
                projectileColor = '#87CEEB';
                projectileDamage = 6;
                // Ice spear is slower but slightly stronger
                this.projectileSpeed *= 0.8;
                break;
            case 'flame_sword':
                projectileColor = '#FF6347';
                projectileDamage = 5;
                projectileCount = 2; // Fire sword shoots two projectiles
                spread = 0.3;
                break;
            case 'rock_hammer':
                projectileColor = '#A0522D';
                projectileDamage = 7;
                // Rock hammer is slow but strong
                this.projectileSpeed *= 0.6;
                break;
            case 'wind_staff':
                projectileColor = '#90EE90';
                projectileDamage = 3;
                projectileCount = 3; // Wind staff shoots multiple weak projectiles
                spread = 0.5;
                break;
            case 'basic_staff':
                projectileColor = '#9370DB';
                projectileDamage = 4;
                break;
        }

        // Create projectiles based on weapon
        for (let i = 0; i < projectileCount; i++) {
            const angle = Math.atan2(dy, dx) + (i - (projectileCount - 1) / 2) * spread;
            const projectile = new Projectile(
                this.x + this.width / 2,
                this.y + this.height / 2,
                Math.cos(angle) * this.projectileSpeed,
                Math.sin(angle) * this.projectileSpeed,
                projectileColor,
                projectileDamage,
                'enemy'
            );
            projectile.weapon = this.weapon; // Tag projectile with weapon type
            gameState.projectiles.push(projectile);
        }

        // Reset projectile speed if modified
        this.resetProjectileSpeed();
    }

    resetProjectileSpeed() {
        // Reset projectile speed to original value after attack
        switch (this.type) {
            case 'shadow': this.projectileSpeed = 1.5; break;
            case 'ice': this.projectileSpeed = 1; break;
            case 'fire': this.projectileSpeed = 2; break;
            case 'earth': this.projectileSpeed = 0.8; break;
            case 'air': this.projectileSpeed = 2.2; break;
            default: this.projectileSpeed = 1.5; break;
        }
    }
    
    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            // Enemy's last words before defeat!
            console.log(`💀 Enemy says: "OH NO!" before being defeated! 💀`);
            
            // Create explosion effect before enemy is destroyed
            this.createExplosion();
            
            // Different point values based on enemy type
            const pointValues = {
                'shadow': 150,
                'ice': 120,
                'fire': 100,
                'earth': 130,
                'air': 80
            };
            gameState.score += pointValues[this.type] || 100;
            
            // Track enemies killed this round
            gameState.enemiesKilledThisRound++;
            
            updateUI();
            
            // Check if round is complete
            const enemiesToKill = (gameState.currentRound === 4) ? 5 : gameState.enemiesToKillPerRound;
            if (gameState.enemiesKilledThisRound >= enemiesToKill) {
                advanceRound();
            } else {
                // Only spawn 1 new enemy to maintain 2 enemies total (except Round 4)
                if (gameState.currentRound !== 4) {
                    setTimeout(() => {
                        if (gameState.enemies.length < 2 && !gameState.gameCompleted) {
                            spawnEnemy(true); // With spawn effect
                            console.log('1 new enemy spawned to maintain 2 total enemies!'); // Debug log
                        }
                    }, 250); // Reduced delay from 500ms to 250ms
                }
                // Round 4 doesn't spawn new enemies - you must defeat the 5 special ones
            }
            
            return true; // Enemy destroyed
        }
        return false;
    }
    
    createExplosion() {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        // Create explosion particles based on enemy type/color
        const explosionColors = [this.color, this.getDarkerColor(), '#ffffff', '#ffff00'];
        
        // Create main explosion burst - lots of particles in all directions
        for (let i = 0; i < 25; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 12 + 3; // Random speed between 3-15
            const particle = new Particle(
                centerX + (Math.random() - 0.5) * 20, // Slight position variance
                centerY + (Math.random() - 0.5) * 20,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                explosionColors[Math.floor(Math.random() * explosionColors.length)],
                1500 + Math.random() * 1000 // Random lifetime 1.5-2.5 seconds
            );
            particle.size = Math.random() * 5 + 2; // Larger explosion particles
            gameState.particles.push(particle);
        }
        
        // Create secondary explosion ring
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const particle = new Particle(
                centerX,
                centerY,
                Math.cos(angle) * 8,
                Math.sin(angle) * 8,
                '#ff6600', // Orange explosion color
                1200
            );
            particle.size = Math.random() * 4 + 3;
            gameState.particles.push(particle);
        }
        
        // Create bright flash particles
        for (let i = 0; i < 8; i++) {
            const particle = new Particle(
                centerX + (Math.random() - 0.5) * 15,
                centerY + (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 6,
                (Math.random() - 0.5) * 6,
                '#ffffff',
                800
            );
            particle.size = Math.random() * 6 + 4;
            gameState.particles.push(particle);
        }
        
        // Special explosion effects for special enemies
        if (this.isSpecial && this.name) {
            for (let i = 0; i < 15; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 10 + 5;
                const particle = new Particle(
                    centerX,
                    centerY,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    '#FFD700', // Gold particles for special enemies
                    2000
                );
                particle.size = Math.random() * 7 + 3;
                gameState.particles.push(particle);
            }
        }
    }
    
    draw() {
        // Draw enemy with gradient effect
        const gradient = ctx.createRadialGradient(
            this.x + this.width/2, this.y + this.height/2, 0,
            this.x + this.width/2, this.y + this.width/2, this.width/2
        );
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, this.getDarkerColor());
        
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw weapon indicator
        this.drawWeapon();
        
        // Draw name for special enemies
        if (this.name) {
            ctx.fillStyle = '#FFD700'; // Gold color for special enemy names
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeText(this.name, this.x + this.width / 2, this.y - 25);
            ctx.fillText(this.name, this.x + this.width / 2, this.y - 25);
        }
        
        // Draw type indicator
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.type.charAt(0).toUpperCase(), this.x + this.width / 2, this.y - 5);
        
        // Draw health bar
        const barWidth = this.width;
        const barHeight = 3;
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x, this.y - 10, barWidth, barHeight);
        
        // Health bar color based on health percentage
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = healthPercent > 0.6 ? '#0f0' : healthPercent > 0.3 ? '#ff0' : '#f00';
        ctx.fillRect(this.x, this.y - 10, barWidth * healthPercent, barHeight);
    }

    drawWeapon() {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;

        switch (this.weapon) {
            case 'shadow_blade':
                // Draw a dark blade
                ctx.strokeStyle = '#2F2F2F';
                ctx.beginPath();
                ctx.moveTo(centerX - 3, centerY - 8);
                ctx.lineTo(centerX + 3, centerY + 8);
                ctx.stroke();
                break;
            case 'ice_spear':
                // Draw an ice spear
                ctx.strokeStyle = '#87CEEB';
                ctx.beginPath();
                ctx.moveTo(centerX, centerY - 10);
                ctx.lineTo(centerX, centerY + 10);
                ctx.moveTo(centerX - 2, centerY - 8);
                ctx.lineTo(centerX + 2, centerY - 8);
                ctx.stroke();
                break;
            case 'flame_sword':
                // Draw a flame sword
                ctx.strokeStyle = '#FF6347';
                ctx.beginPath();
                ctx.moveTo(centerX - 2, centerY - 8);
                ctx.lineTo(centerX + 2, centerY + 8);
                ctx.moveTo(centerX + 2, centerY - 8);
                ctx.lineTo(centerX - 2, centerY + 8);
                ctx.stroke();
                break;
            case 'rock_hammer':
                // Draw a rock hammer
                ctx.strokeStyle = '#A0522D';
                ctx.fillStyle = '#A0522D';
                ctx.beginPath();
                ctx.rect(centerX - 4, centerY - 6, 8, 4);
                ctx.fill();
                ctx.moveTo(centerX, centerY - 2);
                ctx.lineTo(centerX, centerY + 8);
                ctx.stroke();
                break;
            case 'wind_staff':
                // Draw a wind staff
                ctx.strokeStyle = '#90EE90';
                ctx.beginPath();
                ctx.moveTo(centerX, centerY - 8);
                ctx.lineTo(centerX, centerY + 8);
                ctx.arc(centerX, centerY - 8, 3, 0, Math.PI * 2);
                ctx.stroke();
                break;
            case 'basic_staff':
                // Draw a basic staff
                ctx.strokeStyle = '#9370DB';
                ctx.beginPath();
                ctx.moveTo(centerX, centerY - 8);
                ctx.lineTo(centerX, centerY + 8);
                ctx.stroke();
                break;
        }
    }
    
    getDarkerColor() {
        // Create a darker version of the enemy color for gradient effect
        switch (this.type) {
            case 'shadow': return '#2F0052';
            case 'ice': return '#006B7F';
            case 'fire': return '#8B0A1A';
            case 'earth': return '#5D2E0A';
            case 'air': return '#1F7F1F';
            default: return '#4A004A';
        }
    }
}

class Boss {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 80; // Much larger than regular enemies
        this.height = 80;
        this.name = 'Makuta';
        this.health = 90; // Reduced from 140 to 90 (-50 health) - Easier to defeat!
        this.maxHealth = 90;
        this.speed = 0.8; // Slower but menacing
        this.color = '#4B0082'; // Dark purple/shadow
        this.attackCooldown = 1500; // Faster attacks than normal enemies
        this.lastAttack = 0;
        this.phase = 1; // Boss has different phases
        this.specialAttackCooldown = 5000; // Special attacks every 5 seconds
        this.lastSpecialAttack = 0;
        this.isInvulnerable = false;
        this.invulnerabilityDuration = 0;
    }
    
    update() {
        if (this.isInvulnerable) {
            this.invulnerabilityDuration -= 16; // Roughly 60fps
            if (this.invulnerabilityDuration <= 0) {
                this.isInvulnerable = false;
            }
        }
        
        // Move towards player
        const player = gameState.player;
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 100) { // Don't get too close to player
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
        
        // Boundary checking
        this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
        this.y = Math.max(0, Math.min(canvas.height - this.height, this.y));
        
        // Attack logic
        if (Date.now() - this.lastAttack > this.attackCooldown) {
            this.attack();
            this.lastAttack = Date.now();
        }
        
        // Special attack logic
        if (Date.now() - this.lastSpecialAttack > this.specialAttackCooldown) {
            this.specialAttack();
            this.lastSpecialAttack = Date.now();
        }
        
        // Phase transitions
        this.updatePhase();
    }
    
    updatePhase() {
        const healthPercent = this.health / this.maxHealth;
        if (healthPercent <= 0.3 && this.phase < 3) {
            this.phase = 3; // Desperate phase
            this.speed = 1.2;
            this.attackCooldown = 1000;
            this.specialAttackCooldown = 3000;
        } else if (healthPercent <= 0.6 && this.phase < 2) {
            this.phase = 2; // Angry phase
            this.speed = 1.0;
            this.attackCooldown = 1200;
            this.specialAttackCooldown = 4000;
        }
    }
    
    attack() {
        const player = gameState.player;
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Dark staff attack - alternates between different staff attacks
        this.attackCounter = (this.attackCounter || 0) + 1;
        
        if (this.attackCounter % 3 === 0) {
            this.darkStaffBeam(dx, dy, distance);
        } else {
            this.darkStaffProjectiles(dx, dy, distance);
        }
    }
    
    darkStaffProjectiles(dx, dy, distance) {
        // Create multiple dark staff projectiles
        for (let i = 0; i < 3; i++) {
            const spread = (i - 1) * 0.3;
            const angle = Math.atan2(dy, dx) + spread;
            
            const projectile = new Projectile(
                this.x + this.width / 2,
                this.y + this.height / 2,
                Math.cos(angle) * 4,
                Math.sin(angle) * 4,
                '#2F0052', // Dark shadow color
                15, // Strong boss damage
                'enemy'
            );
            projectile.isBossProjectile = true;
            projectile.isDarkStaff = true;
            projectile.radius = 8; // Larger projectiles
            gameState.projectiles.push(projectile);
        }
        
        // Create dark staff energy particles
        for (let i = 0; i < 8; i++) {
            const particle = new Particle(
                this.x + this.width / 2,
                this.y + this.height / 2,
                (Math.random() - 0.5) * 6,
                (Math.random() - 0.5) * 6,
                '#4B0082',
                1500
            );
            gameState.particles.push(particle);
        }
    }
    
    darkStaffBeam(dx, dy, distance) {
        // Every 3rd attack: Dark staff energy beam
        const angle = Math.atan2(dy, dx);
        
        // Create a powerful beam of dark energy
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const projectile = new Projectile(
                    this.x + this.width / 2,
                    this.y + this.height / 2,
                    Math.cos(angle) * 8, // Faster beam
                    Math.sin(angle) * 8,
                    '#8B008B', // Dark magenta beam
                    25, // Higher beam damage
                    'enemy'
                );
                projectile.isBossProjectile = true;
                projectile.isDarkBeam = true;
                projectile.radius = 12; // Very large beam
                gameState.projectiles.push(projectile);
                
                // Beam charging particles
                for (let j = 0; j < 5; j++) {
                    const particle = new Particle(
                        this.x + this.width / 2 + (Math.random() - 0.5) * 20,
                        this.y + this.height / 2 + (Math.random() - 0.5) * 20,
                        (Math.random() - 0.5) * 8,
                        (Math.random() - 0.5) * 8,
                        '#9400D3',
                        1000
                    );
                    gameState.particles.push(particle);
                }
            }, i * 150); // Rapid beam sequence
        }
    }
    
    specialAttack() {
        switch (this.phase) {
            case 1:
                this.shadowWave();
                break;
            case 2:
                this.shadowBurst();
                break;
            case 3:
                this.shadowStorm();
                break;
        }
    }
    
    shadowWave() {
        // Create a wave of projectiles
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const projectile = new Projectile(
                this.x + this.width / 2,
                this.y + this.height / 2,
                Math.cos(angle) * 5,
                Math.sin(angle) * 5,
                '#8B008B', // Dark magenta
                20,
                'enemy'
            );
            projectile.isBossProjectile = true;
            projectile.radius = 6;
            gameState.projectiles.push(projectile);
        }
        
        // Create dark particles
        for (let i = 0; i < 20; i++) {
            const particle = new Particle(
                this.x + this.width / 2,
                this.y + this.height / 2,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                '#4B0082',
                2000
            );
            gameState.particles.push(particle);
        }
    }
    
    shadowBurst() {
        // Phase 2: Multiple bursts
        for (let burst = 0; burst < 3; burst++) {
            setTimeout(() => {
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2 + burst * 0.5;
                    const projectile = new Projectile(
                        this.x + this.width / 2,
                        this.y + this.height / 2,
                        Math.cos(angle) * 6,
                        Math.sin(angle) * 6,
                        '#9400D3', // Violet
                        18,
                        'enemy'
                    );
                    projectile.isBossProjectile = true;
                    projectile.radius = 7;
                    gameState.projectiles.push(projectile);
                }
            }, burst * 500);
        }
    }
    
    shadowStorm() {
        // Phase 3: Desperate all-out attack
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const projectile = new Projectile(
                this.x + this.width / 2,
                this.y + this.height / 2,
                Math.cos(angle) * 7,
                Math.sin(angle) * 7,
                '#FF00FF', // Bright magenta
                25, // Maximum damage
                'enemy'
            );
            projectile.isBossProjectile = true;
            projectile.radius = 10;
            gameState.projectiles.push(projectile);
        }
        
        // Screen shake effect with particles
        for (let i = 0; i < 50; i++) {
            const particle = new Particle(
                Math.random() * canvas.width,
                Math.random() * canvas.height,
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 15,
                '#8B008B',
                3000
            );
            gameState.particles.push(particle);
        }
    }
    
    takeDamage(damage) {
        if (this.isInvulnerable) {
            return false;
        }
        
        this.health -= damage;
        
        // Brief invulnerability after taking damage
        this.isInvulnerable = true;
        this.invulnerabilityDuration = 500; // 0.5 seconds
        
        if (this.health <= 0) {
            // Makuta's dramatic final words!
            console.log(`👑💀 MAKUTA CRIES: "OH NO! I HAVE BEEN DEFEATED!" 💀👑`);
            
            // Boss defeated! Create massive explosion effect
            this.createBossExplosion();
            
            // Award massive points
            gameState.score += 1000;
            updateUI();
            
            return true; // Boss destroyed
        }
        return false;
    }
    
    createBossExplosion() {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        // Massive boss explosion - much bigger than regular enemies
        
        // Main explosion blast - lots of particles
        for (let i = 0; i < 80; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 20 + 5; // Very fast particles
            const particle = new Particle(
                centerX + (Math.random() - 0.5) * 40,
                centerY + (Math.random() - 0.5) * 40,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                ['#8B008B', '#9400D3', '#4B0082', '#ffffff', '#FFD700'][Math.floor(Math.random() * 5)],
                3000 + Math.random() * 2000 // Long lasting explosion
            );
            particle.size = Math.random() * 8 + 4; // Very large particles
            gameState.particles.push(particle);
        }
        
        // Secondary explosion rings
        for (let ring = 1; ring <= 4; ring++) {
            setTimeout(() => {
                for (let i = 0; i < 16; i++) {
                    const angle = (i / 16) * Math.PI * 2;
                    const particle = new Particle(
                        centerX,
                        centerY,
                        Math.cos(angle) * (8 + ring * 2),
                        Math.sin(angle) * (8 + ring * 2),
                        ring % 2 === 0 ? '#ff6600' : '#ffffff', // Alternating colors
                        2000
                    );
                    particle.size = Math.random() * 6 + 3;
                    gameState.particles.push(particle);
                }
            }, ring * 150); // Delayed rings
        }
        
        // Victory particles (gold shower)
        for (let i = 0; i < 60; i++) {
            const particle = new Particle(
                centerX + (Math.random() - 0.5) * 100,
                centerY + (Math.random() - 0.5) * 100,
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 15,
                '#FFD700', // Gold victory particles
                4000
            );
            particle.size = Math.random() * 7 + 3;
            gameState.particles.push(particle);
        }
        
        // Dark energy dissipation
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 12 + 3;
            const particle = new Particle(
                centerX,
                centerY,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                '#2F0052', // Dark boss color
                2500
            );
            particle.size = Math.random() * 5 + 2;
            gameState.particles.push(particle);
        }
    }
    
    draw() {
        // Draw boss with special effects
        const gradient = ctx.createRadialGradient(
            this.x + this.width/2, this.y + this.height/2, 0,
            this.x + this.width/2, this.y + this.height/2, this.width/2
        );
        
        // Invulnerability flashing effect
        if (this.isInvulnerable && Math.floor(Date.now() / 100) % 2) {
            gradient.addColorStop(0, '#FFFFFF');
            gradient.addColorStop(1, this.color);
        } else {
            gradient.addColorStop(0, this.color);
            gradient.addColorStop(1, this.getDarkerColor());
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw boss name
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x + this.width / 2, this.y - 15);
        
        // Draw phase indicator
        ctx.font = '12px Arial';
        ctx.fillText(`Phase ${this.phase}`, this.x + this.width / 2, this.y - 35);
        
        // Draw boss health bar
        const barWidth = this.width;
        const barHeight = 8;
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x, this.y - 10, barWidth, barHeight);
        
        // Health bar with special colors
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = healthPercent > 0.6 ? '#ff0000' : healthPercent > 0.3 ? '#ff8800' : '#ffff00';
        ctx.fillRect(this.x, this.y - 10, barWidth * healthPercent, barHeight);
        
        // Draw boss eyes
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.x + 15, this.y + 20, 8, 8);
        ctx.fillRect(this.x + 57, this.y + 20, 8, 8);
        
        // Draw Dark Staff
        const staffLength = 60;
        const staffWidth = 4;
        const staffX = this.x + this.width + 10;
        const staffY = this.y + this.height/2 - staffLength/2;
        
        // Staff handle
        ctx.fillStyle = '#1A0033';
        ctx.fillRect(staffX, staffY, staffWidth, staffLength);
        
        // Staff orb at top
        ctx.fillStyle = '#8B008B';
        ctx.beginPath();
        ctx.arc(staffX + staffWidth/2, staffY, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Dark energy emanating from orb
        const time = Date.now() * 0.005;
        for (let i = 0; i < 3; i++) {
            const angle = time + (i * Math.PI * 2 / 3);
            const orbX = staffX + staffWidth/2 + Math.cos(angle) * 12;
            const orbY = staffY + Math.sin(angle) * 12;
            
            ctx.fillStyle = `rgba(139, 0, 139, ${0.3 + Math.sin(time * 2) * 0.2})`;
            ctx.beginPath();
            ctx.arc(orbX, orbY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Staff crystals along the handle
        for (let i = 1; i < 4; i++) {
            const crystalY = staffY + (staffLength / 4) * i;
            ctx.fillStyle = '#4B0082';
            ctx.fillRect(staffX - 2, crystalY, staffWidth + 4, 3);
        }
    }
    
    getDarkerColor() {
        return '#2F0052'; // Very dark purple
    }
}

class Projectile {
    constructor(x, y, vx, vy, color, damage, owner) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.damage = damage;
        this.owner = owner;
        this.radius = 4;
    }
    
    update() {
        // Handle decorative spikes from Onua's earthquake
        if (this.owner === 'decoration') {
            if (this.lifespan && Date.now() - this.createdAt > this.lifespan) {
                return true; // Remove spike
            }
            return false; // Keep spike but don't move
        }
        
        this.x += this.vx;
        this.y += this.vy;
        
        // Remove if off screen
        return this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height;
    }
    
    checkCollision(target) {
        return this.x < target.x + target.width &&
               this.x + this.radius > target.x &&
               this.y < target.y + target.height &&
               this.y + this.radius > target.y;
    }
    
    draw() {
        if (this.owner === 'decoration') {
            // Draw earth spikes as triangular shapes
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - 15);
            ctx.lineTo(this.x - 8, this.y + 10);
            ctx.lineTo(this.x + 8, this.y + 10);
            ctx.closePath();
            ctx.fill();
        } else if (this.isSword) {
            // Draw Tahu's sword projectiles as flame-shaped
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - this.radius);
            ctx.lineTo(this.x - this.radius/2, this.y + this.radius/2);
            ctx.lineTo(this.x + this.radius/2, this.y + this.radius/2);
            ctx.closePath();
            ctx.fill();
            
            // Flame effect
            ctx.fillStyle = '#ff6500';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius/2, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.isSpear) {
            // Draw Kopaka's spear projectiles as elongated shapes
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.ellipse(this.x, this.y, this.radius, this.radius * 2, Math.PI / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Spear tip
            ctx.fillStyle = '#b0c4de';
            ctx.beginPath();
            ctx.ellipse(this.x, this.y - this.radius, this.radius / 2, this.radius, Math.PI / 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.isDarkStaff) {
            // Draw Makuta's dark staff projectiles with energy aura
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Dark energy aura
            ctx.fillStyle = 'rgba(139, 0, 139, 0.3)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Pulsing core
            const pulseSize = Math.sin(Date.now() * 0.01) * 2 + this.radius * 0.5;
            ctx.fillStyle = '#9400D3';
            ctx.beginPath();
            ctx.arc(this.x, this.y, pulseSize, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.isDarkBeam) {
            // Draw Makuta's dark beam projectiles as elongated energy
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.ellipse(this.x, this.y, this.radius * 2, this.radius, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Beam energy trail
            ctx.fillStyle = 'rgba(148, 0, 211, 0.5)';
            ctx.beginPath();
            ctx.ellipse(this.x, this.y, this.radius * 3, this.radius * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.isUltraSpike) {
            // Draw Onua's ultra earth spikes as massive triangular spikes
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - 25); // Much larger spike
            ctx.lineTo(this.x - 15, this.y + 15);
            ctx.lineTo(this.x + 15, this.y + 15);
            ctx.closePath();
            ctx.fill();
            
            // Ultra spike glow effect
            ctx.fillStyle = 'rgba(218, 165, 32, 0.4)'; // Gold glow
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - 30);
            ctx.lineTo(this.x - 20, this.y + 20);
            ctx.lineTo(this.x + 20, this.y + 20);
            ctx.closePath();
            ctx.fill();
        } else if (this.isUltraNova) {
            // Draw Onua's ultra nova projectiles with massive energy effects
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Massive energy aura
            ctx.fillStyle = 'rgba(205, 133, 63, 0.4)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Outer energy ring
            ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Pulsing core
            const pulseSize = Math.sin(Date.now() * 0.02) * 3 + this.radius * 0.8;
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(this.x, this.y, pulseSize, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Regular projectiles
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

class Particle {
    constructor(x, y, vx, vy, color, life) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.size = Math.random() * 3 + 1;
    }
    
    update(deltaTime) {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= deltaTime;
        
        // Fade out
        this.vy += 0.1; // gravity
        this.vx *= 0.99; // air resistance
        
        return this.life <= 0;
    }
    
    draw() {
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// Game functions
function initGame() {
    gameState.player = new Player(gameState.selectedCharacter);
    gameState.enemies = [];
    gameState.projectiles = [];
    gameState.particles = [];
    gameState.score = 0;
    gameState.health = gameState.selectedCharacter === 'onua' ? 225 : 150; // Onua gets 50% more health (reduced from 70%)
    gameState.currentRound = 1;
    gameState.enemiesKilledThisRound = 0;
    gameState.gameCompleted = false;
    gameState.showingRoundTransition = false;
    gameState.boss = null;
    gameState.isBossRound = false;
    
    // Set player health to match game state
    gameState.player.health = gameState.health;
    
    // Ensure weapons are properly initialized for Kopaka and Gali
    if (gameState.player.character === 'kopaka' && !gameState.player.weapons.primary) {
        gameState.player.weapons = gameState.player.getCharacterWeapons('kopaka');
    }
    if (gameState.player.character === 'gali' && !gameState.player.weapons.primary) {
        gameState.player.weapons = gameState.player.getCharacterWeapons('gali');
    }
    if (gameState.player.character === 'pohatu' && !gameState.player.weapons.primary) {
        gameState.player.weapons = gameState.player.getCharacterWeapons('pohatu');
    }
    if (gameState.player.character === 'lewa' && !gameState.player.weapons.primary) {
        gameState.player.weapons = gameState.player.getCharacterWeapons('lewa');
    }
    if (gameState.player.character === 'onua' && !gameState.player.weapons.primary) {
        gameState.player.weapons = gameState.player.getCharacterWeapons('onua');
    }
    
    // Start with 2 enemies to maintain a simple battlefield
    for (let i = 0; i < 2; i++) {
        spawnEnemy();
    }
    
    updateUI();
}

function spawnEnemy(spawnEffect = false) {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    switch (side) {
        case 0: // top
            x = Math.random() * canvas.width;
            y = -30;
            break;
        case 1: // right
            x = canvas.width + 30;
            y = Math.random() * canvas.height;
            break;
        case 2: // bottom
            x = Math.random() * canvas.width;
            y = canvas.height + 30;
            break;
        case 3: // left
            x = -30;
            y = Math.random() * canvas.height;
            break;
    }
    
    const newEnemy = new Enemy(x, y);
    
    // Scale enemy stats based on current round
    const roundMultiplier = 1 + (gameState.currentRound - 1) * 0.3; // 30% increase per round
    newEnemy.health = Math.floor(newEnemy.health * roundMultiplier);
    newEnemy.maxHealth = newEnemy.health;
    newEnemy.speed = Math.min(newEnemy.speed * (1 + (gameState.currentRound - 1) * 0.2), newEnemy.speed * 2); // Speed increases but caps at 2x
    newEnemy.projectileSpeed = Math.min(newEnemy.projectileSpeed * (1 + (gameState.currentRound - 1) * 0.15), newEnemy.projectileSpeed * 1.75); // Projectile speed increases
    
    gameState.enemies.push(newEnemy);
    
    // Create spawn effect if this enemy was spawned from a defeat
    if (spawnEffect) {
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const particle = new Particle(
                x + 15, // Center of enemy
                y + 15,
                Math.cos(angle) * 4,
                Math.sin(angle) * 4,
                newEnemy.color,
                1000
            );
            gameState.particles.push(particle);
        }
    }
}

function spawnSpecialEnemy(name, spawnEffect = false) {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    switch (side) {
        case 0: // top
            x = Math.random() * canvas.width;
            y = -30;
            break;
        case 1: // right
            x = canvas.width + 30;
            y = Math.random() * canvas.height;
            break;
        case 2: // bottom
            x = Math.random() * canvas.width;
            y = canvas.height + 30;
            break;
        case 3: // left
            x = -30;
            y = Math.random() * canvas.height;
            break;
    }
    
    const newEnemy = new Enemy(x, y);
    
    // Set special enemy properties based on name
    switch (name) {
        case 'HAKKAN':
            newEnemy.name = 'HAKKAN';
            newEnemy.color = '#8B0000'; // Dark red
            newEnemy.health = 120;
            newEnemy.maxHealth = 120;
            newEnemy.speed = 1.8;
            newEnemy.weaponType = 'hammer';
            newEnemy.weaponName = 'Mental Blast Hammer';
            break;
        case 'THOK':
            newEnemy.name = 'THOK';
            newEnemy.color = '#FFFFFF'; // White
            newEnemy.health = 100;
            newEnemy.maxHealth = 100;
            newEnemy.speed = 2.2;
            newEnemy.weaponType = 'spear';
            newEnemy.weaponName = 'Ice Gun';
            break;
        case 'REIDAK':
            newEnemy.name = 'REIDAK';
            newEnemy.color = '#8B4513'; // Brown
            newEnemy.health = 90; // Reduced from 140 to 90 (-50 health) to match boss nerf
            newEnemy.maxHealth = 90;
            newEnemy.speed = 1.5;
            newEnemy.weaponType = 'claws';
            newEnemy.weaponName = 'Buzz Saw';
            break;
        case 'ZAKTAN':
            newEnemy.name = 'ZAKTAN';
            newEnemy.color = '#228B22'; // Forest green
            newEnemy.health = 110;
            newEnemy.maxHealth = 110;
            newEnemy.speed = 2.0;
            newEnemy.weaponType = 'staff';
            newEnemy.weaponName = 'Tri-Blade';
            break;
    }
    
    // Mark as special enemy
    newEnemy.isSpecial = true;
    
    gameState.enemies.push(newEnemy);
    
    // Create special spawn effect
    if (spawnEffect) {
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const particle = new Particle(
                x + 15, // Center of enemy
                y + 15,
                Math.cos(angle) * 6,
                Math.sin(angle) * 6,
                newEnemy.color,
                1500
            );
            gameState.particles.push(particle);
        }
    }
}

function advanceRound() {
    if (gameState.currentRound < gameState.maxRounds) {
        gameState.currentRound++;
        gameState.enemiesKilledThisRound = 0;
        
        // Clear all enemies for round transition
        gameState.enemies = [];
        
        // Show round transition message
        showRoundTransition();
        
        // Check if this is the boss round
        if (gameState.currentRound === 5) {
            gameState.isBossRound = true;
            // Spawn Makuta boss after delay
            setTimeout(() => {
                spawnBoss();
            }, 2000);
        } else if (gameState.currentRound === 4) {
            // Special Round 4: Spawn 4 named enemies + 1 regular enemy (5 total)
            gameState.isBossRound = false;
            setTimeout(() => {
                // Spawn the 4 special enemies
                spawnSpecialEnemy('HAKKAN', true);
                setTimeout(() => spawnSpecialEnemy('THOK', true), 500);
                setTimeout(() => spawnSpecialEnemy('REIDAK', true), 1000);
                setTimeout(() => spawnSpecialEnemy('ZAKTAN', true), 1500);
                // Spawn 1 regular enemy
                setTimeout(() => spawnEnemy(true), 2000);
            }, 2000);
        } else {
            gameState.isBossRound = false;
            // Spawn new enemies for the next round after a delay
            setTimeout(() => {
                for (let i = 0; i < 2; i++) {
                    spawnEnemy(true);
                }
            }, 2000);
        }
        
        console.log(`Advanced to Round ${gameState.currentRound}!`);
    } else {
        // Game completed!
        gameState.gameCompleted = true;
        gameState.isRunning = false;
        showGameCompletedMessage();
    }
    updateUI();
}

function spawnBoss() {
    // Spawn Makuta in the center-top of the screen
    const bossX = canvas.width / 2 - 40; // Center horizontally
    const bossY = 50; // Near the top
    
    gameState.boss = new Boss(bossX, bossY);
    
    console.log('Makuta has entered the arena!');
    
    // Create dramatic entrance particles
    for (let i = 0; i < 50; i++) {
        const particle = new Particle(
            bossX + 40,
            bossY + 40,
            (Math.random() - 0.5) * 15,
            (Math.random() - 0.5) * 15,
            '#4B0082',
            3000
        );
        gameState.particles.push(particle);
    }
}

function showRoundTransition() {
    // Create special transition particles
    for (let i = 0; i < 50; i++) {
        const particle = new Particle(
            Math.random() * canvas.width,
            Math.random() * canvas.height,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
            '#FFD700', // Gold color for round completion
            2000
        );
        gameState.particles.push(particle);
    }
    
    // Show round transition overlay for 2 seconds
    gameState.showingRoundTransition = true;
    setTimeout(() => {
        gameState.showingRoundTransition = false;
    }, 2000);
}

function showGameCompletedMessage() {
    // Clear the screen and show victory message
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('VICTORY!', canvas.width / 2, canvas.height / 2 - 50);
    
    ctx.fillStyle = '#FFF';
    ctx.font = '24px Arial';
    ctx.fillText('All 5 Rounds Completed!', canvas.width / 2, canvas.height / 2);
    ctx.fillText(`Final Score: ${gameState.score}`, canvas.width / 2, canvas.height / 2 + 40);
    ctx.fillText('Click Restart to play again', canvas.width / 2, canvas.height / 2 + 80);
}

function updateGame(deltaTime) {
    if (!gameState.isRunning || gameState.isPaused) return;
    
    // Update player
    gameState.player.update();
    
    // Update enemies
    gameState.enemies.forEach(enemy => enemy.update());
    
    // Update boss if present
    if (gameState.boss) {
        gameState.boss.update();
    }
    
    // Update projectiles
    gameState.projectiles = gameState.projectiles.filter(projectile => {
        const offScreen = projectile.update();
        
        // Check collisions
        if (projectile.owner === 'player') {
            // Check collision with regular enemies
            for (let i = gameState.enemies.length - 1; i >= 0; i--) {
                if (projectile.checkCollision(gameState.enemies[i])) {
                    if (gameState.enemies[i].takeDamage(projectile.damage)) {
                        gameState.enemies.splice(i, 1);
                    }
                    return false; // Remove projectile
                }
            }
            
            // Check collision with boss
            if (gameState.boss && projectile.checkCollision(gameState.boss)) {
                if (gameState.boss.takeDamage(projectile.damage)) {
                    // Boss defeated!
                    gameState.boss = null;
                    gameState.isBossRound = false;
                    
                    // Complete the game since boss is defeated
                    gameState.gameCompleted = true;
                    gameState.isRunning = false;
                    showGameCompletedMessage();
                }
                return false; // Remove projectile
            }
        } else if (projectile.owner === 'enemy') {
            if (projectile.checkCollision(gameState.player)) {
                gameState.player.takeDamage(projectile.damage);
                return false; // Remove projectile
            }
        }
        
        return !offScreen;
    });
    
    // Update particles
    gameState.particles = gameState.particles.filter(particle => !particle.update(deltaTime));
    
    // Spawn enemies periodically (very low rate since enemies spawn on defeat)
    if (Math.random() < 0.002) { // Reduced from 0.005 to 0.002 (0.2%)
        spawnEnemy();
    }
}

function drawGame() {
    // Clear canvas
    ctx.fillStyle = '#001122';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw game objects
    gameState.player.draw();
    gameState.enemies.forEach(enemy => enemy.draw());
    
    // Draw boss if present
    if (gameState.boss) {
        gameState.boss.draw();
    }
    
    gameState.projectiles.forEach(projectile => projectile.draw());
    gameState.particles.forEach(particle => particle.draw());
    
    // Draw round info overlay
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Round ${gameState.currentRound}/5`, 10, 30);
    
    // Show different info for boss round
    if (gameState.isBossRound && gameState.boss) {
        ctx.fillText(`Boss: ${gameState.boss.name} (${gameState.boss.health}/${gameState.boss.maxHealth} HP)`, 10, 55);
    } else {
        const enemiesToKill = (gameState.currentRound === 4) ? 5 : gameState.enemiesToKillPerRound;
        const enemiesLeft = enemiesToKill - gameState.enemiesKilledThisRound;
        
        if (gameState.currentRound === 4) {
            ctx.fillText(`Special Enemies Left: ${Math.max(0, enemiesLeft)}`, 10, 55);
        } else {
            ctx.fillText(`Enemies Left: ${Math.max(0, enemiesLeft)}`, 10, 55);
        }
    }
    
    // Draw game completion screen
    if (gameState.gameCompleted) {
        showGameCompletedMessage();
    }
    
    // Draw round transition overlay
    if (gameState.showingRoundTransition) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        
        if (gameState.currentRound === 5) {
            ctx.fillText('FINAL ROUND', canvas.width / 2, canvas.height / 2 - 40);
            ctx.fillStyle = '#FF0000';
            ctx.font = 'bold 36px Arial';
            ctx.fillText('MAKUTA APPROACHES!', canvas.width / 2, canvas.height / 2 + 10);
        } else {
            ctx.fillText(`ROUND ${gameState.currentRound}`, canvas.width / 2, canvas.height / 2 - 20);
        }
        
        ctx.fillStyle = '#FFF';
        ctx.font = '24px Arial';
        ctx.fillText('Get Ready!', canvas.width / 2, canvas.height / 2 + 40);
    }
    
    // Draw game info overlay
    if (gameState.isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    }
}

function gameLoop(timestamp) {
    const deltaTime = timestamp - gameState.lastTime;
    gameState.lastTime = timestamp;
    
    updateGame(deltaTime);
    drawGame();
    
    requestAnimationFrame(gameLoop);
}

function startGame() {
    if (!gameState.isRunning) {
        initGame();
        gameState.isRunning = true;
        gameState.isPaused = false;
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        requestAnimationFrame(gameLoop);
    }
}

function pauseGame() {
    gameState.isPaused = !gameState.isPaused;
    const pauseBtn = document.getElementById('pauseBtn');
    pauseBtn.textContent = gameState.isPaused ? 'Resume' : 'Pause';
}

function restartGame() {
    gameState.isRunning = false;
    gameState.isPaused = false;
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('pauseBtn').textContent = 'Pause';
    
    // Clear canvas
    ctx.fillStyle = '#001122';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Reset UI
    gameState.score = 0;
    gameState.health = gameState.selectedCharacter === 'onua' ? 225 : 150; // Onua gets 50% more health (reduced from 70%)
    updateUI();
}

function gameOver() {
    gameState.isRunning = false;
    gameState.isPaused = false;
    
    // Game over screen
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ff4444';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.fillText(`Final Score: ${gameState.score}`, canvas.width / 2, canvas.height / 2 + 20);
    
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('pauseBtn').textContent = 'Pause';
}

function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('health').textContent = gameState.health;
    document.getElementById('round').textContent = gameState.currentRound;
    
    if (gameState.isBossRound && gameState.boss) {
        document.getElementById('enemiesLeft').textContent = `Boss: ${gameState.boss.health}/${gameState.boss.maxHealth}`;
    } else {
        const enemiesToKill = (gameState.currentRound === 4) ? 5 : gameState.enemiesToKillPerRound;
        const enemiesLeft = enemiesToKill - gameState.enemiesKilledThisRound;
        document.getElementById('enemiesLeft').textContent = Math.max(0, enemiesLeft);
    }
}

// Event listeners
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('pauseBtn').addEventListener('click', pauseGame);
document.getElementById('restartBtn').addEventListener('click', restartGame);

// Character selection
document.querySelectorAll('.character-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.character-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameState.selectedCharacter = btn.dataset.character;
        
        // Update player if game is running
        if (gameState.player) {
            gameState.player.character = gameState.selectedCharacter;
            gameState.player.color = gameState.player.getCharacterColor(gameState.selectedCharacter);
            
            // Set character-specific health boost for Onua
            if (gameState.selectedCharacter === 'onua') {
                gameState.player.health = 225; // 50% more than base 150 health (reduced from 255)
                gameState.health = gameState.player.health;
            } else {
                gameState.player.health = 150;
                gameState.health = 150;
            }
            
            // Reinitialize weapons for the new character
            gameState.player.weapons = gameState.player.getCharacterWeapons(gameState.selectedCharacter);
            console.log('Character changed to:', gameState.selectedCharacter, 'Weapons:', gameState.player.weapons);
        }
    });
});

// Keyboard controls
document.addEventListener('keydown', (e) => {
    gameState.keys[e.key] = true;
    
    // Debug Q key for shield
    if (e.key === 'q' || e.key === 'Q') {
        console.log('Q key pressed! Player character:', gameState.player?.character);
        if (gameState.player && gameState.player.character === 'kopaka') {
            console.log('Kopaka weapons:', gameState.player.weapons);
        }
    }
    
    e.preventDefault();
});

document.addEventListener('keyup', (e) => {
    gameState.keys[e.key] = false;
    e.preventDefault();
});

// Arrow button controls
document.getElementById('upBtn').addEventListener('mousedown', () => {
    gameState.mouseControls.up = true;
});
document.getElementById('upBtn').addEventListener('mouseup', () => {
    gameState.mouseControls.up = false;
});
document.getElementById('upBtn').addEventListener('mouseleave', () => {
    gameState.mouseControls.up = false;
});

document.getElementById('downBtn').addEventListener('mousedown', () => {
    gameState.mouseControls.down = true;
});
document.getElementById('downBtn').addEventListener('mouseup', () => {
    gameState.mouseControls.down = false;
});
document.getElementById('downBtn').addEventListener('mouseleave', () => {
    gameState.mouseControls.down = false;
});

document.getElementById('leftBtn').addEventListener('mousedown', () => {
    gameState.mouseControls.left = true;
});
document.getElementById('leftBtn').addEventListener('mouseup', () => {
    gameState.mouseControls.left = false;
});
document.getElementById('leftBtn').addEventListener('mouseleave', () => {
    gameState.mouseControls.left = false;
});

document.getElementById('rightBtn').addEventListener('mousedown', () => {
    gameState.mouseControls.right = true;
});
document.getElementById('rightBtn').addEventListener('mouseup', () => {
    gameState.mouseControls.right = false;
});
document.getElementById('rightBtn').addEventListener('mouseleave', () => {
    gameState.mouseControls.right = false;
});

document.getElementById('attackBtn').addEventListener('click', () => {
    gameState.mouseControls.attack = true;
});

document.getElementById('specialBtn').addEventListener('click', () => {
    gameState.mouseControls.special = true;
});

// Touch support for mobile devices
document.getElementById('upBtn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    gameState.mouseControls.up = true;
});
document.getElementById('upBtn').addEventListener('touchend', (e) => {
    e.preventDefault();
    gameState.mouseControls.up = false;
});

document.getElementById('downBtn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    gameState.mouseControls.down = true;
});
document.getElementById('downBtn').addEventListener('touchend', (e) => {
    e.preventDefault();
    gameState.mouseControls.down = false;
});

document.getElementById('leftBtn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    gameState.mouseControls.left = true;
});
document.getElementById('leftBtn').addEventListener('touchend', (e) => {
    e.preventDefault();
    gameState.mouseControls.left = false;
});

document.getElementById('rightBtn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    gameState.mouseControls.right = true;
});
document.getElementById('rightBtn').addEventListener('touchend', (e) => {
    e.preventDefault();
    gameState.mouseControls.right = false;
});

document.getElementById('attackBtn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    gameState.mouseControls.attack = true;
});

document.getElementById('specialBtn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    gameState.mouseControls.special = true;
});

// Initialize
updateUI();

// Draw initial state
ctx.fillStyle = '#001122';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = '#fff';
ctx.font = '24px Arial';
ctx.textAlign = 'center';
ctx.fillText('Welcome to Bionicle Arena!', canvas.width / 2, canvas.height / 2 - 20);
ctx.font = '16px Arial';
ctx.fillText('Select a character and click Start Game', canvas.width / 2, canvas.height / 2 + 20);