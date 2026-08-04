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
    // Length now depends on how many extra shots the job has — each adds 1.8s
    // before the sell card — so it can't be a constant.
    durationInFrames={beforeAfterDuration()}
    calculateMetadata={({props}) => ({
      durationInFrames: beforeAfterDuration(props.extraUrls?.length ?? 0),
    })}
    fps={30}
    width={1080}
    height={1920}
    schema={beforeAfterSchema}
    defaultProps={beforeAfterDefaults}
  />
);

registerRoot(Root);
