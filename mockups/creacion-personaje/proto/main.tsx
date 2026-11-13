import { createRoot } from 'react-dom/client';
import '../../../src/game/game.css';
import { watchPointerType } from '../../../src/shared/device';
import { CrearProto } from './CrearProto';
watchPointerType();
createRoot(document.getElementById('root')!).render(<CrearProto />);
