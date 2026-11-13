import { createRoot } from 'react-dom/client';
import '../../../src/game/game.css';
import { watchPointerType } from '../../../src/shared/device';
import { ResultadosProto } from './ResultadosProto';
watchPointerType();
const st = document.createElement('style');
st.textContent = '@keyframes lootShine{0%{box-shadow:0 0 0 0 #e8b33a00}40%{box-shadow:0 0 18px 4px #e8b33acc}100%{box-shadow:0 0 6px 1px #e8b33a55}} .loot-shine{animation:lootShine 1.2s ease-out both}';
document.head.appendChild(st);
createRoot(document.getElementById('root')!).render(<ResultadosProto />);
