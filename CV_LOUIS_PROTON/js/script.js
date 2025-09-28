document.addEventListener('DOMContentLoaded', () => {
    // --- DOM refs
    const terminalBody = document.querySelector('.terminal-body');
    const popupTutorial = document.querySelector('.popup-tutorial');
    const closeButton = document.querySelector('.close-btn');
    const audio = document.getElementById('bg-music');

    // === MATRIX-LIKE RAIN ===============================================
(function MatrixRain(){
  const canvas = document.getElementById('bg-rain');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });

  let running = true;
  let speed = 1;
  let raf = null;

  const glyphs = '0123456789';
  let fontSize = 16;
  let cols = 0;
  let drops = [];

  function resize(){
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);

    fontSize = Math.max(14, Math.floor(window.innerWidth / 90));
    ctx.font = `${fontSize}px Consolas, Menlo, monospace`;
    cols = Math.ceil(window.innerWidth / fontSize);
    drops = new Array(cols).fill(0).map(() => Math.floor(Math.random()*-50));
  }

  function draw(){
    // voile sombre pour les traînées
    ctx.fillStyle = 'rgba(0,10,16,0.08)';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // lueur cyan/néon
    ctx.shadowColor = 'rgba(0,255,220,0.6)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#4FFFE0';

    for (let i=0;i<cols;i++){
      const ch = glyphs[(Math.random()*glyphs.length)|0];
      const x = i * fontSize;
      const y = drops[i] * fontSize;

      ctx.fillText(ch, x, y);

      if (y > window.innerHeight && Math.random() > 0.975){
        drops[i] = Math.floor(-Math.random()*40);
      }
      drops[i] += speed;
    }
  }

  function loop(){
    if (!running) return;
    draw();
    raf = requestAnimationFrame(loop);
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    speed = 0.5;
  }

  document.addEventListener('visibilitychange', ()=>{
    if (document.hidden){ running = false; cancelAnimationFrame(raf); }
    else { running = true; raf = requestAnimationFrame(loop); }
  });
  window.addEventListener('resize', resize);

  resize();
  raf = requestAnimationFrame(loop);

  // expose quelques contrôles si tu veux via terminal (optionnel)
  window.__MR__ = {
    on(){ if (!running){ running = true; raf = requestAnimationFrame(loop);} },
    off(){ running = false; cancelAnimationFrame(raf); },
    speed(n){ if (Number.isFinite(n) && n>0){ speed = n; } },
    color(hex){
      if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return false;
      ctx.shadowColor = hex + '99';
      ctx.fillStyle = hex;
      return true;
    }
  };
})();

  
    // --- Shell state
    const fs = {
      'profile.txt': 'Name: Louis Proton\nRole: Pentester, offensive cybersecurity and Full-stack Dev ',
      skills: {
        'skills.txt':
    `- Security: Nmap, masscan, Metasploit, Hydra, John/Hashcat, smbclient/smbmap/enum4linux, SQLi, XSS, Nessus,
     Burp Suite, PrivEsc (linpeas/winpeas), OSINT
    - Tools: Git & GitHub, Linux (Bash, system administration), Docker, VirtualBox, Kali Linux, VS Code
    - Frontend: HTML5, CSS3 (Flexbox/Grid), JavaScript (ES6+), React.js, Responsive Design
    - Backend: Node.js (Express), PHP (Laravel), REST APIs, MySQL/PostgreSQL, Authentication & Sessions`
      },
      experience: {
        'experience.txt': 'Seadoo Proshop – Full-stack Dev\n+ freelance / labs security'
      },
      projects: {
        'projects.txt': ' louisproton.com '
      },
      education: { 'education.txt': 'Epitech MSc Pro Cybersecurity (ongoing)' },
      contact: { 'contact.txt': 'Email: contact@louisproton.com \nLinkedIn: https://www.linkedin.com/in/louis-proton/ \nGitHub: https://github.com/Kherops' },
      flags: { // mini-CTF
        '.hint.txt': 'Try `cat profile.txt` then find a base64 in comments…',
        'flag1.txt': 'flag{terminal-navigation-ok}',
        'flag2.txt': 'flag{read-files-with-cat}',
        'flag3.txt': 'flag:base64{QlJBVk8gISB2b3VzIGF2ZXogdHJvdXbDqSB0b3VzIGxlcyBmbGFncyBkZSBjZSBDViAhIA==}'
      }
    };
  
    let cwd = []; // array of path segments, root = []
    let history = [];
    let histIdx = -1;
    const foundFlags = new Set();
  
    // --- Helpers
    const isDir = (node) => node && typeof node === 'object' && !Array.isArray(node);
    const joinPath = (arr) => '/' + arr.join('/');
    const pathSegments = (p) => p.split('/').filter(Boolean);
  
    function getNode(pathArr) {
      let node = fs;
      for (const seg of pathArr) {
        if (!isDir(node) || !(seg in node)) return null;
        node = node[seg];
      }
      return node;
    }
  
    function resolvePath(input) {
      if (!input || input === '.') return [...cwd];
      let base = input.startsWith('/') ? [] : [...cwd];
      for (const seg of pathSegments(input)) {
        if (seg === '.') continue;
        if (seg === '..') { base.pop(); continue; }
        base.push(seg);
      }
      return base;
    }
  
    function listDir(node) {
      return Object.keys(node).map(k => isDir(node[k]) ? k + '/' : k).sort();
    }
  
    function print(line = '') {
      const el = document.createElement('div');
      el.className = 'output-line';
      el.textContent = line;
      terminalBody.insertBefore(el, inputLine);
      terminalBody.scrollTop = terminalBody.scrollHeight;
    }
  
    function printBlock(text) {
      const pre = document.createElement('pre');
      pre.className = 'output-block';
      pre.textContent = text;
      terminalBody.insertBefore(pre, inputLine);
      terminalBody.scrollTop = terminalBody.scrollHeight;
    }
  
    function promptStr() {
      return `~${joinPath(cwd)}$`;
    }
  
    function showPrompt() {
      promptSpan.textContent = promptStr();
      commandInput.value = '';
      commandInput.focus();
    }
  
    // --- Input line
    const inputLine = document.createElement('div');
    inputLine.className = 'input-line';
    inputLine.innerHTML = `<span class="prompt"></span> <input type="text" class="command-input" autocomplete="off" spellcheck="false">`;
    terminalBody.appendChild(inputLine);
    const promptSpan = inputLine.querySelector('.prompt');
    const commandInput = inputLine.querySelector('.command-input');
    showPrompt();
  
    // --- Commands
    const commands = {
      help() {
        printBlock(
  `Available commands:
    help            Show this help
    pwd             Print working directory
    ls [path]       List directory
    ls -h           List files (use -h to show hidden ones)
    cd <path>       Change directory (supports .. and /)
    cat <file>      Print file content
    contact         Show contact info
    flags           Show discovered flags progress
    play | mute     Control background music
    clear           Clear screen
    exit            SEE YOU LATER.. `
        );
      },
      pwd() {
        print(joinPath(cwd) || '/');
      },
      ls(args) {
        const target = args[0] ? resolvePath(args[0].replace(/\/+$/,'')) : [...cwd];
        const node = getNode(target);
        if (!node) return print(`ls: no such file or directory: ${args[0] || '.'}`);
        if (!isDir(node)) return print(args[0] || '.') , print(node);
        print(listDir(node).join('  '));
      },
      cd(args) {
        const path = (args[0] || '').replace(/\/+$/,'');
        if (!path) { cwd = []; return; }
        const target = resolvePath(path);
        const node = getNode(target);
        if (!node || !isDir(node)) return print(`cd: not a directory: ${path || '/'}`);
        cwd = target;
      },
      cat(args) {
        if (!args[0]) return print('cat: missing file operand');
        const clean = args[0].replace(/\/+$/,'');
        const target = resolvePath(clean);
        const parent = getNode(target.slice(0, -1));
        const leaf = target[target.length - 1];
        if (!parent || !(leaf in parent) || isDir(parent[leaf])) {
          return print(`cat: ${args[0]}: No such file`);
        }
        const content = String(parent[leaf]);
        printBlock(content);
  
        // flag detection
        const m = content.match(/flag\{[^\}]+\}/gi);
        if (m) m.forEach(f => foundFlags.add(f));
      },
      contact() {
        const node = getNode(['contact','contact.txt']);
        if (!node) return print('No contact info.');
        printBlock(node + '\nTip: use `open github` / `open linkedin` (optional)');
      },
      flags() {
        const total = 3;
        print(`Flags found: ${foundFlags.size}/${total}`);
        if (foundFlags.size) printBlock([...foundFlags].join('\n'));
      },
      play() {
        audio.muted = false;
        audio.play().catch(()=>{ /* ignore autoplay block until user gesture */ });
        print('Audio: unmuted');
      },
      mute() {
        audio.muted = true;
        print('Audio: muted');
      },
      clear() {
        [...terminalBody.querySelectorAll('.output-line, .output-block')].forEach(n => n.remove());
      },
      exit() {
        print('Goodbye. I know you will come back soon, see you later...');
      
        const url = "assets/CV%20LOUIS%20PROTON%2019.09.2025.pdf"; // encode spaces or rename file
      
        for (let i = 10; i >= 0; i--) {
          setTimeout(() => {
            if (i > 0) {
              print(i.toString());
            } else {
              print("Opening CV now...");
      
              // tentative auto-ouverture
              const win = window.open(url, "_blank");
      
              // fallback si popup bloquée
              if (!win) {
                const link = document.createElement("a");
                link.href = url;
                link.target = "_blank";
                link.rel = "noopener";
                link.textContent = "[ Curriclum Vitae Louis Proton ]";
                terminalBody.insertBefore(link, inputLine);
                link.focus();
              }
            }
          }, (10 - i) * 1000);
        }
      }
      
      
    };
  
    // Optional: open <slug> to map external links (fill as needed)
    commands.open = function(args){
      const slug = (args[0]||'').toLowerCase();
      const map = {
        github: 'https://github.com/Kherops',
        linkedin: 'https://www.linkedin.com/in/louis-proton/',
        portfolio: 'https://louisproton.com'
      };
      if (!map[slug]) return print(`open: unknown target "${slug}"`);
      window.open(map[slug], '_blank', 'noopener');
      print(`Opening ${slug}…`);
    };
  
    // --- Parser
    function parse(line) {
      // split on spaces preserving quoted strings "like this"
      const tokens = [];
      line = line.trim();
      let buf = '', inQ = false;
      for (let i=0;i<line.length;i++){
        const c = line[i];
        if (c === '"') { inQ = !inQ; continue; }
        if (!inQ && /\s/.test(c)) { if (buf) { tokens.push(buf); buf=''; } continue; }
        buf += c;
      }
      if (buf) tokens.push(buf);
      return tokens;
    }
  
    function run(line) {
      if (!line.trim()) return;
      // echo the command
      print(`${promptStr()} ${line}`);
      const [cmd, ...args] = parse(line);
      const fn = commands[cmd];
      if (fn) fn(args);
      else print(`command not found: ${cmd}. Try "help".`);
      showPrompt();
    }
  
    // --- Key handling
    commandInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const line = commandInput.value;
        history.push(line);
        histIdx = history.length;
        run(line);
      } else if (e.key === 'ArrowUp') {
        if (histIdx > 0) { histIdx--; commandInput.value = history[histIdx] || ''; }
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        if (histIdx < history.length) { histIdx++; commandInput.value = history[histIdx] || ''; }
        e.preventDefault();
      }
    });
  
    // autofocusing when you click terminal
    terminalBody.addEventListener('mousedown', () => commandInput.focus());
  
    // --- Popup close + audio gesture
    function closePopup() {
      if (popupTutorial) popupTutorial.style.display = 'none';
      // User gesture: try to unmute only if user later types `play` (safe)
      // Or keep muted by default; recruiter can toggle
      commandInput.focus();
    }
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        closePopup();
      });
    }
    document.addEventListener('keydown', (e)=> {
      if (e.key === 'Escape' && popupTutorial && popupTutorial.style.display !== 'none') {
        closePopup();
      }
    });
  
    // --- Init: show welcome & help
    print('Welcome to the Neo-Futuristic CV Terminal. Type "help" to begin. Good Luck !');
    showPrompt();
  });
  