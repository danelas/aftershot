import {Composition, registerRoot} from 'remotion';
import {
  BeforeAfter,
  beforeAfterSchema,
  beforeAfterDefaults,
  beforeAfterDuration,
} from './BeforeAfter';

const Root: React.FC = () => (
  <Composition
    id="BeforeAfter"
    component={BeforeAfter}
    durationInFrames={beforeAfterDuration()}
    fps={30}
    width={1080}
    height={1920}
    schema={beforeAfterSchema}
    defaultProps={beforeAfterDefaults}
  />
);

registerRoot(Root);
