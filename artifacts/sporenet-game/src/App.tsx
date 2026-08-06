import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { CSSProperties, useEffect, useMemo, useState } from 'react';
import {
  BookOpen, ChevronRight, Compass, Crosshair, Gem, HeartPulse, Leaf,
  Map, Mountain, Package, Pickaxe, ScrollText, Shield, Sparkles, Swords,
  Timer, Trophy, UserRound, Wind, X, Zap
} from 'lucide-react';

type FarmEvent = {
  name: string; type: 'gain' | 'loss'; min: number; max: number; weight: number; description: string;
};
type Monster = {
  name: string; winChance: number; winMin: number; winMax: number; loseMin: number; loseMax: number; weight: number; color: string;
};

const farmEvents: FarmEvent[] = [
  { name: 'เห็ดฟางธรรมดา', type: 'gain', min: 10, max: 15, weight: 45, description: 'พบเห็ดฟางธรรมดาข้างท่อนไม้ผุ มันยังสดและพร้อมเก็บเกี่ยว' },
  { name: 'เห็ดเรืองแสงเวทมนตร์', type: 'gain', min: 25, max: 40, weight: 30, description: 'ในถ้ำลึกมีแสงสีฟ้าพร่างพราย เห็ดเรืองแสงเวทมนตร์กำลังเบ่งบาน' },
  { name: 'เห็ดทองคำโบราณ', type: 'gain', min: 100, max: 150, weight: 5, description: 'เห็ดราชวงศ์หายากซ่อนอยู่ใต้รากไม้ เป็นโชคครั้งใหญ่ของนักสำรวจ' },
  { name: 'แมงมุมซุ่มโจมตี', type: 'loss', min: 15, max: 25, weight: 15, description: 'แมงมุมเห็ดป่าพลิกตะกร้าของคุณ สปอร์หล่นหายไปตามทาง' },
  { name: 'นกฮูกขโมยของ', type: 'loss', min: 10, max: 10, weight: 5, description: 'นกฮูกลึกลับโฉบลงมาขโมยตะกร้า มันเอาสปอร์ไป 10% ของที่มี' },
];

const monsters: Monster[] = [
  { name: 'หนอนเขียวป่า', winChance: 65, winMin: 20, winMax: 35, loseMin: 10, loseMax: 15, weight: 50, color: '#79c267' },
  { name: 'ค้างคาวเห็ดพิษ', winChance: 55, winMin: 40, winMax: 60, loseMin: 20, loseMax: 30, weight: 30, color: '#a97bd7' },
  { name: 'หมูป่าบ้าเลือด', winChance: 45, winMin: 70, winMax: 100, loseMin: 30, loseMax: 50, weight: 15, color: '#e57463' },
  { name: 'มังกรเห็ดโบราณ', winChance: 30, winMin: 150, winMax: 220, loseMin: 60, loseMax: 90, weight: 5, color: '#ef9b4e' },
];

const rareItems = [
  ['poison_blade', 'ใบมีดเห็ดพิษ', '+20% attack'], ['mushroom_potion', 'ขวดน้ำยาเห็ดเข้มข้น', '+15%'], ['thunder_hammer', 'ค้อนสายฟ้า', '+30%'],
  ['void_crystal', 'คริสตัลแห่งความว่างเปล่า', '+25%'], ['shadow_dagger', 'มีดสายลับเงา', '+35%'], ['dragon_scale_mail', 'เกราะเกล็ดมังกรราชา', '+45%'],
  ['magic_basket', 'ตะกร้าสปอร์มนตร์', '+25%'], ['spore_gauntlet', 'ถุงมือสปอร์', '+15%'], ['blood_ruby', 'อัญมณีเลือดมังกร', '+40%'],
  ['lava_boots', 'รองเท้าอัคคีภัย', '+20%'], ['golden_ring', 'แหวนเห็ดทอง', '+15 flat'], ['mystic_wand', 'ไม้กายสิทธิ์เห็ดลึกลับ', '+20 flat'],
  ['ancient_scroll', 'ม้วนคัมภีร์แห่งความมั่งคั่ง', '+50 flat'], ['mermaid_tear', 'น้ำตานางเงือก', '+80 flat'], ['ancient_coin', 'เหรียญทองพันปี', '+100 flat'],
  ['sage_tome', 'คัมภีร์ฉลามเห็ด', '+50% EXP'], ['fern_crown', 'มงกุฎใบเฟิร์นโบราณ', '+30%'], ['ghost_cloak', 'เสื้อคลุมวิญญาณนักปราชญ์', '+60%'],
  ['mushroom_crown', 'มงกุฎราชาเห็ด', '+80%'], ['star_fragment', 'เศษดาวตก', '+100%'],
];
const bosses = [
  ['เห็ดยักษ์ราชัน', '5,000 HP', '10,000 spores'], ['มังกรพิษ Vipora', '15,000 HP', '30,000 spores'],
  ['ราชันหมาป่า Fangrow', '30,000 HP', '60,000 spores'], ['เทพเจ้าพายุ Stormael', '60,000 HP', '120,000 spores'],
  ['มารมืดนิรันดร์ Abyssalor', '100,000 HP', '200,000 spores'],
];

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
function weighted<T extends { weight: number }>(items: T[]): T {
  const roll = Math.random() * items.reduce((sum, item) => sum + item.weight, 0);
  let cursor = 0;
  return items.find((item) => (cursor += item.weight) >= roll) ?? items[0];
}

function VoxelForest({ walking, color, pulse }: { walking: boolean; color: string; pulse: boolean }) {
  const trees = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    left: `${(i * 37 + 3) % 100}%`, top: `${25 + ((i * 23) % 48)}%`, scale: 0.65 + ((i * 17) % 40) / 100,
  })), []);
  return <div className={`forest ${walking ? 'is-walking' : ''} ${pulse ? 'forest-pulse' : ''}`} aria-label="ภาพป่าเห็ด voxel">
    <div className="sky-orb orb-one" /><div className="sky-orb orb-two" />
    <div className="mountains"><i /><i /><i /><i /></div>
    <div className="cloud cloud-a" /><div className="cloud cloud-b" /><div className="cloud cloud-c" />
    <div className="forest-floor"><span className="trail" /><span className="trail-shadow" /></div>
    {trees.map((tree, i) => <div key={i} className="voxel-tree" style={{ left: tree.left, top: tree.top, transform: `scale(${tree.scale})` }}><b /><em /><strong /></div>)}
    <div className="player-voxel" style={{ '--cap': color } as CSSProperties}><div className="player-shadow" /><div className="legs"><i /><i /></div><div className="body"><i /><i /></div><div className="cap"><i /><i /><i /></div><div className="face"><i /><i /></div></div>
    <div className="floating-spore spore-a" /><div className="floating-spore spore-b" /><div className="floating-spore spore-c" />
  </div>;
}

function Setup({ onStart }: { onStart: (name: string, color: string) => void }) {
  const [name, setName] = useState('เห็ดทะลวงฟัน');
  const [color, setColor] = useState('#e85a4f');
  return <main className="setup-screen">
    <div className="setup-art"><VoxelForest walking color={color} pulse={false} /><div className="setup-scrim" /></div>
    <section className="setup-card">
      <div className="brand-lockup"><span className="brand-mark"><MushroomIcon /></span><span><b>SporeNet</b><small>mushroom adventure</small></span></div>
      <p className="eyebrow"><Sparkles size={13} /> เขตป่ามรดกสปอร์</p>
      <h1>ก้าวเข้าไปใน<br /><em>ป่าเห็ดมีชีวิต</em></h1>
      <p className="setup-copy">ออกสำรวจ เก็บเกี่ยว และฝากร่องรอยของคุณไว้ในตำนานฟาร์มร่วมแห่ง SporeNet</p>
      <label className="field-label" htmlFor="hero-name">ชื่อผู้สำรวจ</label>
      <input id="hero-name" data-testid="input-hero-name" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
      <div className="picker-label">สีหมวกประจำตัว</div>
      <div className="color-picker">{['#e85a4f', '#4aa3df', '#f1c453', '#a875c8'].map((item) => <button type="button" data-testid={`button-color-${item.slice(1)}`} aria-label={`เลือกสี ${item}`} className={`color-dot ${color === item ? 'selected' : ''}`} style={{ background: item }} onClick={() => setColor(item)} key={item} />)}</div>
      <button className="primary-button start-button" data-testid="button-start-adventure" onClick={() => onStart(name.trim() || 'เห็ดทะลวงฟัน', color)}>เริ่มออกผจญภัย <ChevronRight size={19} /></button>
      <div className="setup-foot"><span><Shield size={14} /> เล่นแบบ local</span><span><UsersIcon /> ชุมชน SporeNet</span></div>
    </section>
  </main>;
}

function MushroomIcon() { return <span className="mushroom-icon"><i /><b /><em /></span>; }
function UsersIcon() { return <span className="mini-people">•••</span>; }

function AppGame({ name, color, onReset }: { name: string; color: string; onReset: () => void }) {
  const [spores, setSpores] = useState(0);
  const [hp, setHp] = useState(100);
  const [exp, setExp] = useState(0);
  const [farmLevel, setFarmLevel] = useState(1);
  const [cooldown, setCooldown] = useState(0);
  const [event, setEvent] = useState<FarmEvent | null>(null);
  const [monster, setMonster] = useState<Monster | null>(null);
  const [catalog, setCatalog] = useState(false);
  const [log, setLog] = useState<string[]>(['พร้อมออกสำรวจ ป่ากำลังหายใจอยู่รอบตัวคุณ']);
  const [walking, setWalking] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const addLog = (message: string) => setLog((items) => [message, ...items].slice(0, 4));
  const beginExpedition = () => {
    if (cooldown || event || monster || walking) return;
    setWalking(true); setPulse(true);
    window.setTimeout(() => {
      setWalking(false); setPulse(false); setCooldown(6);
      setExp((current) => {
        const next = current + 5;
        if (next >= farmLevel * 100) setFarmLevel((level) => level + 1);
        return next >= farmLevel * 100 ? next - farmLevel * 100 : next;
      });
      const found = weighted(farmEvents);
      setEvent(found);
      addLog(`พบเหตุการณ์: ${found.name}`);
    }, 850);
  };
  const collectEvent = () => {
    if (!event) return;
    const amount = event.name === 'นกฮูกขโมยของ' ? Math.ceil(spores * 0.1) : rand(event.min, event.max);
    setSpores((current) => event.type === 'gain' ? current + amount + farmLevel * 2 : Math.max(0, current - amount));
    addLog(event.type === 'gain' ? `เก็บ ${event.name} ได้ +${amount + farmLevel * 2} สปอร์` : `${event.name} ทำให้เสียสปอร์ ${amount}`);
    setEvent(null);
    if (Math.random() < 0.25) setTimeout(() => setMonster(weighted(monsters)), 300);
  };
  const skipEvent = () => { setEvent(null); addLog('คุณเดินผ่านจุดค้นพบอย่างระมัดระวัง'); };
  const fight = () => {
    if (!monster) return;
    const win = Math.random() * 100 < monster.winChance;
    const amount = rand(win ? monster.winMin : monster.loseMin, win ? monster.winMax : monster.loseMax);
    if (win) { setSpores((value) => value + amount); addLog(`ชนะ ${monster.name} รับ +${amount} สปอร์`); setPulse(true); }
    else { setSpores((value) => value + 0); setHp((value) => Math.max(1, value - amount)); addLog(`พ่ายแพ้ ${monster.name} เสีย HP ${amount}`); }
    setMonster(null); window.setTimeout(() => setPulse(false), 450);
  };
  const flee = () => { setMonster(null); addLog('คุณถอยกลับเข้าพุ่มไม้ รอดจากการปะทะ'); };
  const hpPercent = Math.max(0, hp);
  const nextLevel = farmLevel * 100;
  return <main className="game-shell">
    <VoxelForest walking={walking} color={color} pulse={pulse} />
    <div className="game-noise" />
    <header className="topbar">
      <div className="brand-lockup compact"><span className="brand-mark"><MushroomIcon /></span><span><b>SporeNet</b><small>mushroom adventure</small></span></div>
      <div className="top-actions"><button className={`icon-button ${catalog ? 'active' : ''}`} data-testid="button-open-catalog" aria-label="เปิดสารานุกรม" onClick={() => setCatalog(true)}><BookOpen size={19} /><span>สารานุกรม</span></button><button className="icon-button" data-testid="button-reset-game" aria-label="เริ่มใหม่" onClick={onReset}><X size={18} /><span>เริ่มใหม่</span></button></div>
    </header>
    <section className="player-hud">
      <div className="player-id"><div className="avatar-cap" style={{ background: color }}><MushroomIcon /></div><div><strong data-testid="text-player-name">{name}</strong><span>นักสำรวจป่าเห็ด</span></div></div>
      <div className="stat-cluster">
        <div className="stat-item hp-stat"><span className="stat-icon"><HeartPulse size={16} /></span><div><small>HP</small><strong data-testid="text-hp">{hp}/100</strong><div className="meter"><i style={{ width: `${hpPercent}%` }} /></div></div></div>
        <div className="stat-item"><span className="stat-icon gold"><Gem size={16} /></span><div><small>สปอร์</small><strong data-testid="text-spores">{spores.toLocaleString()}</strong></div></div>
        <div className="stat-item"><span className="stat-icon teal"><Leaf size={16} /></span><div><small>ฟาร์มเลเวล</small><strong data-testid="text-farm-level">LV {farmLevel}</strong></div></div>
      </div>
    </section>
    <aside className="exp-card"><div className="exp-head"><span>มรดกฟาร์ม</span><b>{exp} / {nextLevel} EXP</b></div><div className="meter exp-meter"><i style={{ width: `${Math.min(100, (exp / nextLevel) * 100)}%` }} /></div><small>ทุกเลเวลช่วยเพิ่มสปอร์ที่เก็บได้ +2</small></aside>
    <section className="quest-rail"><div className="quest-dot active"><Compass size={16} /></div><div className="quest-line" /><div className="quest-dot"><Mountain size={16} /></div><div className="quest-line" /><div className="quest-dot"><Trophy size={16} /></div><span>เส้นทางนักสำรวจ</span></section>
    <section className="action-dock"><div className="dock-copy"><span className="eyebrow"><Wind size={13} /> ป่าตะวันออก · เขตที่ 01</span><h2>{walking ? 'กำลังเดินทาง...' : event || monster ? 'มีสิ่งรอให้ตัดสินใจ' : 'พร้อมสำรวจหรือยัง?'}</h2><p>{cooldown ? `พักหายใจอีก ${cooldown} วินาที ก่อนออกเดินทางครั้งถัดไป` : 'ทุกการเดินทางฝากรอยไว้ในฟาร์มร่วมของเรา'}</p></div><button className="primary-button walk-button" data-testid="button-go-explore" disabled={Boolean(cooldown || event || monster || walking)} onClick={beginExpedition}>{walking ? <Timer className="spin" size={19} /> : <Compass size={19} />} {walking ? 'กำลังสำรวจ' : cooldown ? `พร้อมใน ${cooldown} วิ` : 'ออกเดินทาง'}{!walking && !cooldown && <ChevronRight size={18} />}</button></section>
    <section className="event-log"><div className="log-title"><ScrollText size={15} /> บันทึกการสำรวจ</div>{log.map((line, index) => <div className={`log-line ${index === 0 ? 'latest' : ''}`} key={`${line}-${index}`}><span /><p>{line}</p></div>)}</section>
    {(event || monster) && <div className="modal-wrap"><div className="modal-card" data-testid={event ? 'panel-farm-event' : 'panel-monster-battle'}>{event && <><div className={`modal-symbol ${event.type === 'gain' ? 'gain' : 'loss'}`}>{event.type === 'gain' ? <Pickaxe size={30} /> : <Wind size={30} />}</div><span className="eyebrow">{event.type === 'gain' ? 'พบสิ่งของจากป่า' : 'อุปสรรคบนเส้นทาง'}</span><h2>{event.name}</h2><p>{event.description}</p><div className={`reward-range ${event.type}`}>{event.name === 'นกฮูกขโมยของ' ? '−10% สปอร์ปัจจุบัน' : `${event.type === 'gain' ? '+' : '−'}${event.min}–${event.max} สปอร์`}</div><div className="modal-actions"><button className="secondary-button" data-testid="button-skip-event" onClick={skipEvent}>เดินผ่าน</button><button className="primary-button" data-testid="button-collect-event" onClick={collectEvent}>{event.type === 'gain' ? 'เก็บเกี่ยว' : 'รับมือ'}</button></div></>}{monster && <><div className="monster-art" style={{ '--monster': monster.color } as CSSProperties}><span /><span /><span /></div><span className="eyebrow"><Swords size={13} /> การปะทะฉับพลัน · โอกาสชนะ {monster.winChance}%</span><h2>{monster.name}</h2><p>สัตว์ประหลาดประจำป่าขวางเส้นทางของคุณ เลือกการตัดสินใจเพียงครั้งเดียว</p><div className="battle-table"><div><small>ถ้าชนะ</small><strong>+{monster.winMin}–{monster.winMax} สปอร์</strong></div><div><small>ถ้าแพ้</small><strong>−{monster.loseMin}–{monster.loseMax} HP</strong></div></div><div className="modal-actions"><button className="secondary-button" data-testid="button-flee-monster" onClick={flee}>ถอยหนี</button><button className="danger-button" data-testid="button-fight-monster" onClick={fight}><Swords size={17} /> ต่อสู้</button></div></>}</div></div>}
    {catalog && <div className="catalog-overlay"><section className="catalog-panel"><div className="catalog-head"><div><span className="eyebrow"><BookOpen size={14} /> SporeNet archive</span><h2>สารานุกรมป่าเห็ด</h2><p>บันทึกสิ่งมีชีวิต ไอเทมหายาก และบอสแห่งโลกสปอร์</p></div><button className="close-button" data-testid="button-close-catalog" onClick={() => setCatalog(false)}><X size={20} /></button></div><div className="catalog-scroll"><h3><Leaf size={16} /> เหตุการณ์ฟาร์ม</h3><div className="catalog-grid">{farmEvents.map((item) => <article className="catalog-card" key={item.name}><span className={`catalog-mark ${item.type}`}><MushroomIcon /></span><div><strong>{item.name}</strong><small>{item.type === 'gain' ? `+${item.min}–${item.max} สปอร์` : item.name === 'นกฮูกขโมยของ' ? '−10% สปอร์ปัจจุบัน' : `−${item.min}–${item.max} สปอร์`} · weight {item.weight}</small></div></article>)}</div><h3><Swords size={16} /> มอนสเตอร์</h3><div className="catalog-grid">{monsters.map((item) => <article className="catalog-card" key={item.name}><span className="monster-dot" style={{ background: item.color }} /><div><strong>{item.name}</strong><small>ชนะ {item.winChance}% · +{item.winMin}–{item.winMax} / −{item.loseMin}–{item.loseMax}</small></div></article>)}</div><h3><Package size={16} /> ไอเทมหายาก <small>catalog only</small></h3><div className="rare-grid">{rareItems.map(([id, item, boost]) => <div className="rare-item" key={id}><Zap size={13} /><span><b>{item}</b><small>{id} · {boost}</small></span></div>)}</div><h3><Trophy size={16} /> World bosses <small>ยังไม่เปิดให้ต่อสู้</small></h3><div className="boss-list">{bosses.map(([boss, hpValue, reward]) => <div key={boss}><strong>{boss}</strong><span>{hpValue}</span><span>{reward}</span></div>)}</div></div></section></div>}
  </main>;
}

function Home() {
  const [started, setStarted] = useState(false);
  const [player, setPlayer] = useState({ name: '', color: '#e85a4f' });
  return started ? <AppGame name={player.name} color={player.color} onReset={() => setStarted(false)} /> : <Setup onStart={(name, color) => { setPlayer({ name, color }); setStarted(true); }} />;
}

function Router() { return <Switch><Route path="/" component={Home} /><Route><Home /></Route></Switch>; }
const queryClient = new QueryClient();
function App() { return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter></TooltipProvider></QueryClientProvider>; }
export default App;