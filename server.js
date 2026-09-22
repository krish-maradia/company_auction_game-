const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, "public")));

/* ============================================================
   COMPANY DATABASE (96 companies)
   All opening bids fixed at ₹50 lakh
   ============================================================ */
const COMPANIES_RAW = [
["Apple","Technology",5.0],["Google","Technology",5.0],["Microsoft","Technology",5.0],
["Amazon","Technology/Retail",4.5],["NVIDIA","Technology/AI",4.5],["Samsung","Technology",4.5],
["Meta","Technology/Social",4.0],["Netflix","Technology/Media",3.0],["Sony","Technology/Entertainment",3.5],
["Nintendo","Technology/Gaming",2.5],["Dell Technologies","Technology",2.5],["Lenovo","Technology",2.5],
["Xiaomi","Technology",3.0],["Huawei","Technology",3.0],["Intel","Technology/Semiconductors",3.0],
["AMD","Technology/Semiconductors",3.5],["Adobe","Technology/Software",3.0],["Oracle","Technology/Software",3.5],
["Salesforce","Technology/Software",3.0],["SAP","Technology/Software",3.0],
["Tesla","Automotive",4.5],["Toyota","Automotive",5.0],["Mercedes-Benz","Automotive/Luxury",3.5],
["BMW","Automotive/Luxury",3.5],["Volkswagen","Automotive",3.5],["Ferrari","Automotive/Luxury",2.5],
["Porsche","Automotive/Luxury",3.0],["Ford","Automotive",3.0],["General Motors","Automotive",3.0],
["Honda","Automotive",3.5],["Hyundai","Automotive",3.5],["Tata Motors","Automotive",3.5],
["Mahindra & Mahindra","Automotive",3.0],["Maruti Suzuki","Automotive",3.5],["BYD","Automotive/EV",3.5],
["Volvo Cars","Automotive",2.0],
["Nike","Fashion/Sportswear",4.5],["Zara (Inditex)","Fashion",4.5],["Adidas","Fashion/Sportswear",4.0],
["Uniqlo (Fast Retailing)","Fashion",3.5],["H&M","Fashion",3.0],["Lululemon","Fashion/Sportswear",2.5],
["Puma","Fashion/Sportswear",2.5],["Levi Strauss","Fashion",2.0],["Ralph Lauren","Fashion/Luxury",2.0],
["Under Armour","Fashion/Sportswear",1.5],["ANTA Sports","Fashion/Sportswear",1.5],["Gap","Fashion",1.5],
["Louis Vuitton (LVMH)","Luxury Fashion",4.5],["Hermès","Luxury Fashion",4.0],["Chanel","Luxury Fashion",4.0],
["Gucci (Kering)","Luxury Fashion",3.5],["Cartier (Richemont)","Luxury",3.0],["Rolex","Luxury/Watches",3.0],
["Burberry","Luxury Fashion",2.0],["Prada","Luxury Fashion",2.5],["Ray-Ban (EssilorLuxottica)","Fashion/Eyewear",2.5],
["Skechers","Fashion/Footwear",2.0],["ASICS","Fashion/Sportswear",2.0],["New Balance","Fashion/Sportswear",2.0],
["Coca-Cola","Food & Beverage",4.5],["PepsiCo","Food & Beverage",4.0],["McDonald's","Food & Beverage",4.0],
["Starbucks","Food & Beverage",3.5],["Nestlé","Food & Beverage",4.0],["Unilever","FMCG",4.0],
["Procter & Gamble","FMCG",3.5],["L'Oréal","Beauty/FMCG",3.5],["Colgate-Palmolive","FMCG",2.5],
["Mondelez","Food & Beverage",2.5],["Ferrero","Food & Beverage",2.0],["Red Bull","Food & Beverage",2.5],
["IKEA","Retail/Home",3.5],["Walmart","Retail",4.5],["Costco","Retail",3.5],
["Target","Retail",2.5],["Alibaba","Technology/Retail",4.0],["Tencent","Technology",4.0],
["Jio","Telecom/Technology",3.5],["Bharti Airtel","Telecom",3.0],["Reliance Industries","Diversified",4.5],
["Adani Enterprises","Diversified",2.5],["Larsen & Toubro","Engineering",2.5],["Siemens","Engineering/Technology",3.0],
["Bosch","Engineering/Technology",2.5],["Philips","Technology/Healthcare",2.5],["LG","Technology/Consumer",3.0],
["Panasonic","Technology/Consumer",2.5],["Airbus","Aerospace",3.0],["Boeing","Aerospace",3.0],
["Uber","Technology/Transport",2.5],["Airbnb","Technology/Travel",2.5],["Spotify","Technology/Media",2.5],
["YouTube","Technology/Media",4.0],["WhatsApp","Technology/Social",3.5],["TikTok (ByteDance)","Technology/Media",4.0]
];

const FIXED_OPENING_BID = 0.5;
const DEFAULT_MIN_RAISE = 0.1;

const COMPANIES = COMPANIES_RAW.map((c,i)=>({
  id: i, name: c[0], category: c[1], pct: c[2], openBid: FIXED_OPENING_BID
}));

const PLAYER_COLORS = ["#f5c542","#4a9eff","#2ecc71","#e74c3c","#a855f7","#ec4899","#14b8a6","#f97316"];

/* ============================================================
   BONUS LOGIC
   ============================================================ */
function normalizeCat(cat) { return cat.toLowerCase().split(/[\/&]/).map(s=>s.trim()); }
function countCategory(player, keyword) {
  return player.companies.filter(cid => {
    const co = COMPANIES[cid];
    return normalizeCat(co.category).some(t => t.includes(keyword.toLowerCase()));
  }).length;
}
function companyById(id){ return COMPANIES[id]; }

function computeBonuses(player, room) {
  let base = 0;
  player.companies.forEach(cid => base += COMPANIES[cid].pct);
  base = Math.round(base*10)/10;
  let bonus = 0;
  const unlocked = [];
  const pending = [];

  if (player.companies.includes(4)) {
    if (countCategory(player,"technology") >= 3) { bonus += 1.0; unlocked.push({key:"NVIDIA",label:"NVIDIA Bonus",reward:1.0}); }
    else pending.push({key:"NVIDIA",label:"NVIDIA",desc:`Need 3 Technology companies (${countCategory(player,"technology")}/3)`});
  }
  if (player.companies.includes(20)) {
    if (countCategory(player,"automotive") >= 3) { bonus += 1.0; unlocked.push({key:"Tesla",label:"Tesla Bonus",reward:1.0}); }
    else pending.push({key:"Tesla",label:"Tesla",desc:`Need 3 Automotive companies (${countCategory(player,"automotive")}/3)`});
  }
  if (player.companies.includes(36)) {
    const nikeIdx = room.saleHistory.findIndex(s=>s.companyId===36 && s.playerId===player.id);
    const laterFashion = room.saleHistory.some((s,i)=> i>nikeIdx && s.playerId===player.id && normalizeCat(COMPANIES[s.companyId].category).some(t=>t.includes("fashion")||t.includes("sportswear")));
    if (laterFashion) { bonus += 0.5; unlocked.push({key:"Nike",label:"Nike Bonus",reward:0.5}); }
    else pending.push({key:"Nike",label:"Nike",desc:"Win another Fashion/Sportswear company after Nike"});
  }
  if (player.companies.includes(25)) {
    const fIdx = room.saleHistory.findIndex(s=>s.companyId===25 && s.playerId===player.id);
    const laterLux = room.saleHistory.some((s,i)=> i>fIdx && s.playerId===player.id && normalizeCat(COMPANIES[s.companyId].category).some(t=>t.includes("luxury")));
    if (laterLux) { bonus += 0.5; unlocked.push({key:"Ferrari",label:"Ferrari Bonus",reward:0.5}); }
    else pending.push({key:"Ferrari",label:"Ferrari",desc:"Win another Luxury company after Ferrari"});
  }
  if (player.companies.includes(37)) {
    const cnt = player.companies.filter(cid=>{
      const cat = COMPANIES[cid].category.toLowerCase();
      return cat.includes("fashion")||cat.includes("luxury");
    }).length;
    if (cnt >= 3) { bonus += 1.0; unlocked.push({key:"Zara",label:"Zara Bonus",reward:1.0}); }
    else pending.push({key:"Zara",label:"Zara",desc:`Need 3 Fashion/Luxury companies (${cnt}/3)`});
  }
  if (player.companies.includes(60)) {
    const cnt = player.companies.filter(cid=>{
      const cat = COMPANIES[cid].category.toLowerCase();
      return cat.includes("food")||cat.includes("fmcg")||cat.includes("beverage");
    }).length;
    if (cnt >= 3) { bonus += 1.0; unlocked.push({key:"Coca-Cola",label:"Coca-Cola Bonus",reward:1.0}); }
    else pending.push({key:"Coca-Cola",label:"Coca-Cola",desc:`Need 3 Food/FMCG companies (${cnt}/3)`});
  }
  if (player.companies.includes(3)) {
    const cnt = player.companies.filter(cid => COMPANIES[cid].category.toLowerCase().includes("retail")).length;
    if (cnt >= 3) { bonus += 1.0; unlocked.push({key:"Amazon",label:"Amazon Bonus",reward:1.0}); }
    else pending.push({key:"Amazon",label:"Amazon",desc:`Need 3 Retail companies (${cnt}/3)`});
  }
  if (player.companies.includes(80)) {
    const cats = new Set();
    player.companies.forEach(cid => normalizeCat(COMPANIES[cid].category).forEach(t=>cats.add(t)));
    if (cats.size >= 5) { bonus += 1.0; unlocked.push({key:"Reliance",label:"Reliance Bonus",reward:1.0}); }
    else pending.push({key:"Reliance",label:"Reliance",desc:`Need 5+ different categories (${cats.size}/5)`});
  }
  bonus = Math.round(bonus*10)/10;
  const final = Math.round((base+bonus)*10)/10;
  return { base, bonus, final, unlocked, pending };
}

/* ============================================================
   ROOM STATE
   ============================================================ */
const rooms = {}; // code -> room

function genCode() {
  let code;
  do {
    code = Math.random().toString(36).substring(2, 6).toUpperCase();
  } while (rooms[code]);
  return code;
}

function createRoom(hostName) {
  const code = genCode();
  const room = {
    code,
    hostId: null,       // socket id
    players: [],        // { id: socketId, name, color, budget, companies, usedAbilities, pendingStableBudget, rolexOwned, rolexLuxuryUsed, joined }
    order: COMPANIES.map(c=>c.id),
    currentIdx: 0,
    phase: "lobby",     // lobby | idle | bidding | sold | unsold | finished
    currentBid: null,
    passedPlayers: [],
    minRaise: DEFAULT_MIN_RAISE,
    auctionStartBid: null,
    saleHistory: [],
    unsoldCompanies: [],
    log: [],
    started: false,
    finished: false
  };
  rooms[code] = room;
  return room;
}

function findRoomBySocket(socketId) {
  for (const code in rooms) {
    const r = rooms[code];
    if (r.hostId === socketId) return r;
    if (r.players.some(p => p.id === socketId)) return r;
  }
  return null;
}

function publicState(room, socketId) {
  const isHost = room.hostId === socketId;
  const me = room.players.find(p => p.id === socketId);
  return {
    code: room.code,
    isHost,
    me: me ? serializePlayer(me, room) : null,
    phase: room.phase,
    started: room.started,
    finished: room.finished,
    currentIdx: room.currentIdx,
    totalCompanies: room.order.length,
    currentCompany: room.currentIdx < room.order.length
      ? COMPANIES[room.order[room.currentIdx]]
      : null,
    currentBid: room.currentBid,
    passedPlayers: room.passedPlayers,
    minRaise: room.minRaise,
    auctionStartBid: room.auctionStartBid,
    saleHistory: room.saleHistory,
    unsoldCompanies: room.unsoldCompanies,
    log: room.log.slice(0, 50),
    players: room.players.map(p => serializePlayer(p, room))
  };
}

function serializePlayer(p, room) {
  const b = computeBonuses(p, room);
  return {
    id: p.id,
    name: p.name,
    color: p.color,
    budget: p.budget,
    companies: p.companies,
    base: b.base,
    bonus: b.bonus,
    final: b.final,
    unlocked: b.unlocked,
    pending: b.pending,
    passed: room.passedPlayers.includes(p.id),
    pendingStableBudget: p.pendingStableBudget,
    rolexOwned: p.rolexOwned,
    usedAbilities: p.usedAbilities
  };
}

function broadcastRoom(room) {
  room.players.forEach(p => {
    io.to(p.id).emit("state", publicState(room, p.id));
  });
  if (room.hostId) {
    io.to(room.hostId).emit("state", publicState(room, room.hostId));
  }
}

function log(room, text, type="") {
  room.log.unshift({ text, type, time: Date.now() });
  if (room.log.length > 80) room.log = room.log.slice(0, 80);
}

/* ============================================================
   SOCKET HANDLERS
   ============================================================ */
io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  // --- HOST CREATES ROOM ---
  socket.on("createRoom", ({ hostName }, cb) => {
    const room = createRoom(hostName);
    room.hostId = socket.id;
    log(room, `Room ${room.code} created by ${hostName}`);
    socket.join(room.code);
    if (cb) cb({ ok: true, code: room.code });
    broadcastRoom(room);
  });

  // --- PLAYER JOINS ROOM ---
  socket.on("joinRoom", ({ code, name }, cb) => {
    code = (code || "").toUpperCase();
    const room = rooms[code];
    if (!room) return cb && cb({ ok: false, error: "Room not found" });
    if (room.started) return cb && cb({ ok: false, error: "Game already started" });
    if (room.players.length >= 8) return cb && cb({ ok: false, error: "Room is full" });
    if (room.players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      return cb && cb({ ok: false, error: "Name already taken" });
    }
    const usedColors = room.players.map(p=>p.color);
    const color = PLAYER_COLORS.find(c => !usedColors.includes(c)) || PLAYER_COLORS[0];
    const player = {
      id: socket.id,
      name: name.slice(0, 16),
      color,
      budget: 100,
      companies: [],
      usedAbilities: {},
      pendingStableBudget: false,
      rolexOwned: false,
      rolexLuxuryUsed: false
    };
    room.players.push(player);
    socket.join(room.code);
    log(room, `${name} joined`);
    if (cb) cb({ ok: true, code: room.code, playerId: socket.id });
    broadcastRoom(room);
  });

  // --- HOST STARTS GAME ---
  socket.on("startGame", ({ randomize }, cb) => {
    const room = findRoomBySocket(socket.id);
    if (!room || room.hostId !== socket.id) return cb && cb({ ok: false, error: "Only host can start" });
    if (room.players.length < 2) return cb && cb({ ok: false, error: "Need at least 2 players" });
    room.started = true;
    room.phase = "idle";
    if (randomize) {
      for (let i=room.order.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [room.order[i],room.order[j]]=[room.order[j],room.order[i]]; }
    }
    log(room, `Game started with ${room.players.length} players`);
    if (cb) cb({ ok: true });
    broadcastRoom(room);
  });

  // --- PLAYER PLACES BID ---
  socket.on("placeBid", ({ amount }, cb) => {
    const room = findRoomBySocket(socket.id);
    if (!room) return cb && cb({ ok: false, error: "No room" });
    if (!room.started || room.finished) return cb && cb({ ok: false, error: "Not active" });
    if (room.phase === "sold" || room.phase === "unsold") return cb && cb({ ok: false, error: "Auction closed" });
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return cb && cb({ ok: false, error: "Not a player" });
    const c = COMPANIES[room.order[room.currentIdx]];
    const cur = room.currentBid;
    const minNeeded = cur ? cur.amount + room.minRaise : (room.auctionStartBid ?? c.openBid);
    if (amount < minNeeded - 0.0001) return cb && cb({ ok: false, error: `Minimum is ₹${minNeeded} Cr` });
    if (amount > player.budget + 0.0001) return cb && cb({ ok: false, error: `You only have ₹${player.budget} Cr` });
    if (room.passedPlayers.includes(player.id)) return cb && cb({ ok: false, error: "You passed" });
    if (cur && cur.playerId === player.id) return cb && cb({ ok: false, error: "You're already highest" });

    room.currentBid = { playerId: player.id, amount };
    room.phase = "bidding";
    log(room, `${player.name} bids ₹${amount} Cr for ${c.name}`, "sale");
    if (cb) cb({ ok: true });
    broadcastRoom(room);
  });

  // --- PLAYER PASSES ---
  socket.on("pass", (cb) => {
    const room = findRoomBySocket(socket.id);
    if (!room) return cb && cb({ ok: false });
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return cb && cb({ ok: false });
    if (room.currentBid && room.currentBid.playerId === player.id) return cb && cb({ ok: false, error: "You're highest" });
    if (room.passedPlayers.includes(player.id)) return cb && cb({ ok: false });
    room.passedPlayers.push(player.id);
    log(room, `${player.name} passed`);
    // If no bids and everyone passed -> unsold
    const active = room.players.filter(p => !room.passedPlayers.includes(p.id));
    if (!room.currentBid && active.length === 0) {
      room.unsoldCompanies.push(room.order[room.currentIdx]);
      room.phase = "unsold";
      log(room, `${COMPANIES[room.order[room.currentIdx]].name} went UNSOLD`, "unsold");
    }
    if (cb) cb({ ok: true });
    broadcastRoom(room);
  });

  // --- HOST: CONFIRM SALE ---
  socket.on("sell", (cb) => {
    const room = findRoomBySocket(socket.id);
    if (!room || room.hostId !== socket.id) return cb && cb({ ok: false, error: "Only host" });
    if (!room.currentBid) return cb && cb({ ok: false, error: "No bid" });
    const c = COMPANIES[room.order[room.currentIdx]];
    if (room.saleHistory.some(s => s.companyId === c.id)) return cb && cb({ ok: false });

    const player = room.players.find(p => p.id === room.currentBid.playerId);
    let amount = room.currentBid.amount;
    let discount = 0;
    if (player.pendingStableBudget && !player.usedAbilities.stableBudget) {
      discount = 1;
      player.pendingStableBudget = false;
      player.usedAbilities.stableBudget = true;
      log(room, `${player.name}'s Toyota stable budget applied (-₹1 Cr)`);
    }
    const paid = Math.max(0, Math.round((amount - discount)*100)/100);
    if (paid > player.budget + 0.0001) return cb && cb({ ok: false, error: "Insufficient budget" });

    player.budget = Math.round((player.budget - paid)*100)/100;
    player.companies.push(c.id);
    room.saleHistory.push({
      companyId: c.id, playerId: player.id,
      amount: paid, originalAmount: amount, pct: c.pct, timestamp: Date.now()
    });
    if (c.name === "Rolex") player.rolexOwned = true;
    if (c.name === "Toyota" && !player.usedAbilities.stableBudgetArmed) {
      player.pendingStableBudget = true;
      player.usedAbilities.stableBudgetArmed = true;
    }
    room.phase = "sold";
    log(room, `✅ ${player.name} won ${c.name} for ₹${paid} Cr`, "sale");
    if (cb) cb({ ok: true });
    broadcastRoom(room);
  });

  // --- HOST: NEXT ---
  socket.on("next", (cb) => {
    const room = findRoomBySocket(socket.id);
    if (!room || room.hostId !== socket.id) return cb && cb({ ok: false });
    if (room.phase !== "sold" && room.phase !== "unsold") return cb && cb({ ok: false, error: "Finish current" });
    room.currentIdx++;
    room.currentBid = null;
    room.passedPlayers = [];
    room.phase = "idle";
    room.auctionStartBid = null;
    if (room.currentIdx >= room.order.length) {
      room.finished = true;
      room.phase = "finished";
      log(room, "🏁 Game finished");
    } else {
      log(room, `Next: ${COMPANIES[room.order[room.currentIdx]].name}`);
    }
    if (cb) cb({ ok: true });
    broadcastRoom(room);
  });

  // --- HOST: MARK UNSOLD ---
  socket.on("markUnsold", (cb) => {
    const room = findRoomBySocket(socket.id);
    if (!room || room.hostId !== socket.id) return cb && cb({ ok: false });
    const c = COMPANIES[room.order[room.currentIdx]];
    if (room.saleHistory.some(s => s.companyId === c.id)) return cb && cb({ ok: false });
    if (!room.unsoldCompanies.includes(c.id)) room.unsoldCompanies.push(c.id);
    room.phase = "unsold";
    log(room, `❌ ${c.name} went UNSOLD`, "unsold");
    if (cb) cb({ ok: true });
    broadcastRoom(room);
  });

  // --- HOST: UNDO LAST SALE ---
  socket.on("undo", (cb) => {
    const room = findRoomBySocket(socket.id);
    if (!room || room.hostId !== socket.id) return cb && cb({ ok: false });
    if (room.saleHistory.length === 0) return cb && cb({ ok: false, error: "Nothing to undo" });
    const last = room.saleHistory.pop();
    const player = room.players.find(p => p.id === last.playerId);
    if (player) {
      player.budget = Math.round((player.budget + last.amount)*100)/100;
      player.companies = player.companies.filter(id => id !== last.companyId);
    }
    const c = COMPANIES[last.companyId];
    if (c.name === "Toyota" && player) { player.pendingStableBudget = false; delete player.usedAbilities.stableBudgetArmed; }
    if (c.name === "Rolex" && player) player.rolexOwned = false;
    room.phase = "idle";
    room.currentBid = null;
    log(room, `↩️ Undo sale of ${c.name}`, "unsold");
    if (cb) cb({ ok: true });
    broadcastRoom(room);
  });

  // --- HOST: RESET GAME ---
  socket.on("reset", (cb) => {
    const room = findRoomBySocket(socket.id);
    if (!room || room.hostId !== socket.id) return cb && cb({ ok: false });
    room.started = false;
    room.finished = false;
    room.phase = "lobby";
    room.order = COMPANIES.map(c=>c.id);
    room.currentIdx = 0;
    room.currentBid = null;
    room.passedPlayers = [];
    room.saleHistory = [];
    room.unsoldCompanies = [];
    room.log = [];
    room.players.forEach(p => {
      p.budget = 100;
      p.companies = [];
      p.usedAbilities = {};
      p.pendingStableBudget = false;
      p.rolexOwned = false;
      p.rolexLuxuryUsed = false;
    });
    log(room, "Game reset");
    if (cb) cb({ ok: true });
    broadcastRoom(room);
  });

  // --- DISCONNECT ---
  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
    for (const code in rooms) {
      const room = rooms[code];
      const pIdx = room.players.findIndex(p => p.id === socket.id);
      if (pIdx !== -1) {
        if (room.started) {
          log(room, `${room.players[pIdx].name} disconnected`);
          room.players[pIdx].disconnected = true;
        } else {
          log(room, `${room.players[pIdx].name} left`);
          room.players.splice(pIdx, 1);
        }
        broadcastRoom(room);
        // Clean empty rooms
        if (room.players.length === 0 && !room.hostId) delete rooms[code];
      }
      if (room.hostId === socket.id) {
        // Host disconnected — keep room alive but no host
        room.hostId = null;
        log(room, "Host disconnected");
        broadcastRoom(room);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎮 Company Auction server running on port ${PORT}`);
});