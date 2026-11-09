import { Shell } from './components/Shell';
import { route } from './router';
import { Compare } from './views/Compare';
import { Discover } from './views/Discover';
import { Explore } from './views/Explore';

const VIEWS = { explore: Explore, discover: Discover, compare: Compare };

export function App() {
  const View = VIEWS[route.value.view];
  return (
    <Shell>
      <View />
    </Shell>
  );
}
