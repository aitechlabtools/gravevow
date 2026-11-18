import { createRoot } from 'react-dom/client';
import '../../../src/game/game.css';
import './proto.css';
import { watchPointerType } from '../../../src/shared/device';
import { Proto } from './Proto';
watchPointerType();
createRoot(document.getElementById('root')!).render(<Proto />);
