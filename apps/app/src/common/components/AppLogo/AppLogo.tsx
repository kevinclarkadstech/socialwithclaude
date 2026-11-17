import { appName } from '../../brand';
import './AppLogo.css';

/** The app's mark and name, for the global header. A placeholder until there's a real logo (see brand.ts). */
export function AppLogo() {
  return (
    <span className="app-logo">
      <img src="/favicon.png" alt="" width={28} height={28} className="app-logo__mark" />
      <span className="app-logo__name">{appName}</span>
    </span>
  );
}
