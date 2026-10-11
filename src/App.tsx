import { StoreProvider } from './data/store';
import { AppShell } from './ui/AppShell';
import './styles/app.css';

function App() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
}

export default App;
