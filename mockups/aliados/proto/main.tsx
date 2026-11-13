import { createRoot } from 'react-dom/client';
import '../../../src/game/game.css';
import { watchPointerType } from '../../../src/shared/device';
import { AliadosProto } from './AliadosProto';
watchPointerType();
createRoot(document.getElementById('root')!).render(<AliadosProto />);
